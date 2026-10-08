const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sftpRoutes = require('./routes/sftp');
const localRoutes = require('./routes/local');
const historyRoutes = require('./routes/history');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/sftp', sftpRoutes);
app.use('/api/local', localRoutes);
app.use('/api/history', historyRoutes);

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use('/uploads', express.static(uploadDir));

app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`SFTP ToolBox server running on http://localhost:${PORT}`);
});