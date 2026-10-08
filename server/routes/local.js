const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

router.get('/list', (req, res) => {
  try {
    const dirPath = req.query.path || process.cwd();
    const fullPath = path.resolve(dirPath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Directory not found' });
    }

    const items = fs.readdirSync(fullPath, { withFileTypes: true }).map((item) => {
      let stats;
      try {
        stats = fs.statSync(path.join(fullPath, item.name));
      } catch {
        stats = { size: 0, mtimeMs: 0, mode: 0 };
      }
      return {
        name: item.name,
        path: path.join(fullPath, item.name),
        isDirectory: item.isDirectory(),
        isSymlink: item.isSymbolicLink(),
        size: stats.size,
        modifyTime: stats.mtimeMs,
      };
    });

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/drives', (req, res) => {
  const drives = [];
  for (let i = 65; i <= 90; i++) {
    const drive = String.fromCharCode(i) + ':\\';
    try {
      if (fs.existsSync(drive)) {
        drives.push({
          name: drive,
          path: drive,
          isDirectory: true,
        });
      }
    } catch {}
  }
  res.json(drives);
});

router.post('/mkdir', (req, res) => {
  try {
    const dirPath = req.body.path;
    if (!dirPath) return res.status(400).json({ error: 'Path is required' });
    fs.mkdirSync(dirPath, { recursive: true });
    res.json({ success: true, path: dirPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/delete', (req, res) => {
  try {
    const { path: itemPath, isDirectory } = req.body;
    if (!itemPath) return res.status(400).json({ error: 'Path is required' });
    if (isDirectory) {
      fs.rmdirSync(itemPath, { recursive: true });
    } else {
      fs.unlinkSync(itemPath);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/rename', (req, res) => {
  try {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) return res.status(400).json({ error: 'Old and new path are required' });
    fs.renameSync(oldPath, newPath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/read', (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: 'Path is required' });
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File not found' });
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) return res.status(400).json({ error: 'Cannot read a directory' });
    const content = fs.readFileSync(fullPath, 'utf-8');
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/write', (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    if (!filePath || content === undefined) return res.status(400).json({ error: 'Path and content are required' });
    const fullPath = path.resolve(filePath);
    fs.writeFileSync(fullPath, content, 'utf-8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;