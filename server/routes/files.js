const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const db = require('../db');

const UPLOADS_DIR = path.join(__dirname, '../uploads');
const TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getFileOrError(fileId, res) {
  const file = db.getFile(fileId);
  if (!file) { res.status(404).json({ error: 'File not found' }); return null; }
  if (new Date() > new Date(file.expiresAt)) {
    res.status(410).json({ error: 'File has expired' }); return null;
  }
  return file;
}

// Get file info (public metadata)
router.get('/:fileId/info', (req, res) => {
  const file = getFileOrError(req.params.fileId, res);
  if (!file) return;
  res.json({
    id: file.id,
    originalName: file.originalName,
    size: file.size,
    uploadedAt: file.uploadedAt,
    expiresAt: file.expiresAt,
    hasPassword: file.hasPassword,
    downloadCount: file.downloadCount,
  });
});

// Verify password → return download token
router.post('/:fileId/verify', async (req, res) => {
  const file = getFileOrError(req.params.fileId, res);
  if (!file) return;

  if (!file.hasPassword) {
    // No password needed — issue token directly
    const token = uuidv4();
    db.setDownloadToken(token, file.id);
    return res.json({ token });
  }

  const { password } = req.body;
  if (!password) return res.status(401).json({ error: 'Password required' });

  const valid = await bcrypt.compare(password, file.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid password' });

  const token = uuidv4();
  db.setDownloadToken(token, file.id);
  res.json({ token });
});

// Download file via token
router.get('/:fileId/download', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(401).json({ error: 'Token required' });

  const tokenData = db.getDownloadToken(token);
  if (!tokenData) return res.status(401).json({ error: 'Invalid or expired token' });
  if (tokenData.fileId !== req.params.fileId) return res.status(401).json({ error: 'Token mismatch' });

  // Token expires after TTL
  if (new Date() - new Date(tokenData.createdAt) > TOKEN_TTL_MS) {
    db.deleteDownloadToken(token);
    return res.status(401).json({ error: 'Token expired' });
  }

  const file = getFileOrError(req.params.fileId, res);
  if (!file) return;

  const filePath = path.join(UPLOADS_DIR, file.id, file.originalName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });

  db.deleteDownloadToken(token);

  file.downloadCount++;
  db.setFile(file.id, file);

  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', fs.statSync(filePath).size);

  fs.createReadStream(filePath).pipe(res);
});

module.exports = router;
