const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const db = require('../db');

const UPLOADS_DIR = path.join(__dirname, '../uploads');
const upload = multer({ storage: multer.memoryStorage() });

// Initialize upload session
router.post('/init', async (req, res) => {
  try {
    const { fileName, fileSize, totalChunks, expiryDays, password } = req.body;

    if (!fileName || !fileSize || !totalChunks) {
      return res.status(400).json({ error: 'fileName, fileSize, totalChunks are required' });
    }

    const uploadId = uuidv4();
    const fileId = uuidv4();

    const tempDir = path.join(UPLOADS_DIR, 'temp', uploadId);
    fs.mkdirSync(tempDir, { recursive: true });

    db.setUploadSession(uploadId, {
      uploadId,
      fileId,
      fileName,
      fileSize: parseInt(fileSize),
      totalChunks: parseInt(totalChunks),
      receivedChunks: [],
      expiryDays: parseInt(expiryDays) || 7,
      password: password || null,
    });

    res.json({ uploadId, fileId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to initialize upload' });
  }
});

// Receive a chunk
router.post('/chunk', upload.single('chunk'), (req, res) => {
  try {
    const { uploadId, chunkIndex } = req.body;

    const session = db.getUploadSession(uploadId);
    if (!session) return res.status(404).json({ error: 'Upload session not found' });

    const idx = parseInt(chunkIndex);
    const chunkPath = path.join(UPLOADS_DIR, 'temp', uploadId, `chunk_${idx}`);
    fs.writeFileSync(chunkPath, req.file.buffer);

    if (!session.receivedChunks.includes(idx)) {
      session.receivedChunks.push(idx);
    }
    db.setUploadSession(uploadId, session);

    res.json({ received: session.receivedChunks.length, total: session.totalChunks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to receive chunk' });
  }
});

// Complete upload: assemble chunks
router.post('/complete', async (req, res) => {
  try {
    const { uploadId } = req.body;

    const session = db.getUploadSession(uploadId);
    if (!session) return res.status(404).json({ error: 'Upload session not found' });

    if (session.receivedChunks.length !== session.totalChunks) {
      return res.status(400).json({
        error: `Missing chunks: received ${session.receivedChunks.length}/${session.totalChunks}`,
      });
    }

    // Assemble chunks with streaming (memory efficient for large files)
    const finalDir = path.join(UPLOADS_DIR, session.fileId);
    fs.mkdirSync(finalDir, { recursive: true });
    const finalPath = path.join(finalDir, session.fileName);
    const writeStream = fs.createWriteStream(finalPath);

    for (let i = 0; i < session.totalChunks; i++) {
      const chunkPath = path.join(UPLOADS_DIR, 'temp', uploadId, `chunk_${i}`);
      await new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(chunkPath);
        readStream.on('error', reject);
        readStream.on('end', resolve);
        readStream.pipe(writeStream, { end: false });
      });
    }

    await new Promise((resolve) => writeStream.end(resolve));

    // Clean up temp chunks
    const tempDir = path.join(UPLOADS_DIR, 'temp', uploadId);
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Hash password if provided
    let passwordHash = null;
    if (session.password) {
      passwordHash = await bcrypt.hash(session.password, 10);
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + session.expiryDays);

    db.setFile(session.fileId, {
      id: session.fileId,
      originalName: session.fileName,
      size: session.fileSize,
      uploadedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      hasPassword: !!passwordHash,
      passwordHash,
      downloadCount: 0,
    });

    db.deleteUploadSession(uploadId);

    res.json({ fileId: session.fileId, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to complete upload' });
  }
});

module.exports = router;
