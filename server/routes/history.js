const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '..', 'connection-history.json');

function readHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to read connection history:', e);
  }
  return [];
}

function writeHistory(entries) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(entries, null, 2), 'utf-8');
}

router.get('/', (req, res) => {
  try {
    const entries = readHistory();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { host, port, username, password, remotePath, name } = req.body;
    if (!host || !username) {
      return res.status(400).json({ error: 'Host and username are required' });
    }
    const entries = readHistory();
    const existing = entries.findIndex(
      (e) => e.host === host && e.port === port && e.username === username
    );
    const entry = {
      id: Date.now().toString(),
      host,
      port: port || '22',
      username,
      password: password || '',
      remotePath: remotePath || '/',
      name: name || `${username}@${host}:${port || 22}`,
      createdAt: new Date().toISOString(),
    };
    if (existing !== -1) {
      entries[existing] = { ...entries[existing], ...entry, id: entries[existing].id, createdAt: entries[existing].createdAt };
    } else {
      entries.push(entry);
    }
    writeHistory(entries);
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    let entries = readHistory();
    entries = entries.filter((e) => e.id !== id);
    writeHistory(entries);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;