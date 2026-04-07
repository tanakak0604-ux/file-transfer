const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

function readDb() {
  if (!fs.existsSync(DB_PATH)) {
    return { files: {}, uploadSessions: {}, downloadTokens: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return { files: {}, uploadSessions: {}, downloadTokens: {} };
  }
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
  getFile: (fileId) => readDb().files[fileId],
  setFile: (fileId, data) => {
    const db = readDb();
    db.files[fileId] = data;
    writeDb(db);
  },
  deleteFile: (fileId) => {
    const db = readDb();
    delete db.files[fileId];
    writeDb(db);
  },
  getAllFiles: () => readDb().files,

  getUploadSession: (uploadId) => readDb().uploadSessions[uploadId],
  setUploadSession: (uploadId, data) => {
    const db = readDb();
    db.uploadSessions[uploadId] = data;
    writeDb(db);
  },
  deleteUploadSession: (uploadId) => {
    const db = readDb();
    delete db.uploadSessions[uploadId];
    writeDb(db);
  },

  setDownloadToken: (token, fileId) => {
    const db = readDb();
    if (!db.downloadTokens) db.downloadTokens = {};
    db.downloadTokens[token] = { fileId, createdAt: new Date().toISOString() };
    writeDb(db);
  },
  getDownloadToken: (token) => {
    const db = readDb();
    return db.downloadTokens?.[token] || null;
  },
  deleteDownloadToken: (token) => {
    const db = readDb();
    if (db.downloadTokens) delete db.downloadTokens[token];
    writeDb(db);
  },
};
