const express = require('express');
const router = express.Router();
const sftpManager = require('../sftpManager');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
const downloadDir = path.join(__dirname, '..', '..', 'downloads');

if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

router.post('/connect', async (req, res) => {
  try {
    const { host, port, username, password, privateKey } = req.body;
    if (!host || !username) {
      return res.status(400).json({ error: 'Host and username are required' });
    }
    if (!password && !privateKey) {
      return res.status(400).json({ error: 'Password or private key is required' });
    }
    const result = await sftpManager.createConnection({ host, port, username, password, privateKey });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/disconnect', (req, res) => {
  const { id } = req.body;
  const result = sftpManager.disconnect(id);
  res.json({ success: result });
});

router.get('/connections', (req, res) => {
  const connections = sftpManager.getActiveConnections();
  res.json(connections);
});

router.get('/list', async (req, res) => {
  try {
    const { id, path: remotePath } = req.query;
    if (!id) return res.status(400).json({ error: 'Connection ID is required' });
    const items = await sftpManager.listDirectory(id, remotePath || '/');
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/mkdir', async (req, res) => {
  try {
    const { id, path: remotePath } = req.body;
    if (!id || !remotePath) return res.status(400).json({ error: 'Connection ID and path are required' });
    const result = await sftpManager.createDirectory(id, remotePath);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/delete', async (req, res) => {
  try {
    const { id, path: remotePath, isDirectory } = req.body;
    if (!id || !remotePath) return res.status(400).json({ error: 'Connection ID and path are required' });
    let result;
    if (isDirectory) {
      result = await sftpManager.deleteDirectory(id, remotePath);
    } else {
      result = await sftpManager.deleteFile(id, remotePath);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/rename', async (req, res) => {
  try {
    const { id, oldPath, newPath } = req.body;
    if (!id || !oldPath || !newPath) return res.status(400).json({ error: 'Connection ID, old and new path are required' });
    const result = await sftpManager.rename(id, oldPath, newPath);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { id, remotePath } = req.body;
    if (!id || !remotePath || !req.file) {
      return res.status(400).json({ error: 'Connection ID, remote path, and file are required' });
    }
    const localFilePath = req.file.path;
    const result = await sftpManager.uploadFile(id, localFilePath, remotePath);
    fs.unlink(localFilePath, () => {});
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/download', async (req, res) => {
  try {
    const { id, path: remotePath } = req.query;
    if (!id || !remotePath) return res.status(400).json({ error: 'Connection ID and path are required' });
    const fileName = path.basename(remotePath);
    const localPath = path.join(downloadDir, `${uuidv4()}_${fileName}`);
    await sftpManager.downloadFile(id, remotePath, localPath);
    res.download(localPath, fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      fs.unlink(localPath, () => {});
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/read', async (req, res) => {
  try {
    const { id, path: remotePath } = req.query;
    if (!id || !remotePath) return res.status(400).json({ error: 'Connection ID and path are required' });
    const content = await sftpManager.readFile(id, remotePath);
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/write', async (req, res) => {
  try {
    const { id, path: remotePath, content } = req.body;
    if (!id || !remotePath || content === undefined) {
      return res.status(400).json({ error: 'Connection ID, remote path, and content are required' });
    }
    await sftpManager.writeFile(id, remotePath, content);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/upload-by-path', async (req, res) => {
  try {
    const { id, remotePath, localPath } = req.body;
    if (!id || !remotePath || !localPath) {
      return res.status(400).json({ error: 'Connection ID, remote path, and local path are required' });
    }
    if (!fs.existsSync(localPath)) {
      return res.status(404).json({ error: 'Local file or directory not found' });
    }
    const stat = fs.statSync(localPath);
    if (stat.isDirectory()) {
      await uploadDirectory(id, localPath, remotePath);
    } else {
      await sftpManager.uploadFile(id, localPath, remotePath);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/download-to-path', async (req, res) => {
  try {
    const { id, remotePath, localPath } = req.body;
    if (!id || !remotePath || !localPath) {
      return res.status(400).json({ error: 'Connection ID, remote path, and local path are required' });
    }
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await sftpManager.downloadFile(id, remotePath, localPath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/upload-folder', async (req, res) => {
  try {
    const { id, remotePath, localPath } = req.body;
    if (!id || !remotePath || !localPath) {
      return res.status(400).json({ error: 'Connection ID, remote path, and local path are required' });
    }
    await uploadDirectory(id, localPath, remotePath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function uploadDirectory(id, localPath, remotePath) {
  const items = fs.readdirSync(localPath, { withFileTypes: true });
  try {
    await sftpManager.createDirectory(id, remotePath);
  } catch (e) {
    if (!e.message.includes('already exists')) throw e;
  }
  for (const item of items) {
    const localItemPath = path.join(localPath, item.name);
    const remoteItemPath = path.posix.join(remotePath, item.name).replace(/\\/g, '/');
    if (item.isDirectory()) {
      await uploadDirectory(id, localItemPath, remoteItemPath);
    } else {
      await sftpManager.uploadFile(id, localItemPath, remoteItemPath);
    }
  }
}

router.post('/download-folder', async (req, res) => {
  try {
    const { id, remotePath, localPath } = req.body;
    if (!id || !remotePath || !localPath) {
      return res.status(400).json({ error: 'Connection ID, remote path, and local path are required' });
    }
    if (!fs.existsSync(localPath)) {
      fs.mkdirSync(localPath, { recursive: true });
    }
    await downloadDirectory(id, remotePath, localPath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function downloadDirectory(id, remotePath, localPath) {
  const items = await sftpManager.listDirectory(id, remotePath);
  for (const item of items) {
    const localItemPath = path.join(localPath, item.name);
    if (item.isDirectory) {
      if (!fs.existsSync(localItemPath)) {
        fs.mkdirSync(localItemPath, { recursive: true });
      }
      await downloadDirectory(id, item.path, localItemPath);
    } else {
      await sftpManager.downloadFile(id, item.path, localItemPath);
    }
  }
}

module.exports = router;