const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use('/api/upload', require('./routes/upload'));
app.use('/api/files', require('./routes/files'));

// Cleanup expired files on startup (best-effort)
function cleanupExpiredFiles() {
  const db = require('./db');
  const files = db.getAllFiles();
  const now = new Date();
  Object.values(files).forEach((file) => {
    if (new Date(file.expiresAt) < now) {
      const fileDir = path.join(UPLOADS_DIR, file.id);
      if (fs.existsSync(fileDir)) fs.rmSync(fileDir, { recursive: true, force: true });
      db.deleteFile(file.id);
      console.log(`Cleaned up expired file: ${file.originalName}`);
    }
  });
}
cleanupExpiredFiles();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
