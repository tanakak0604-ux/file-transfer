import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as tus from 'tus-js-client';
import JSZip from 'jszip';

const MAX_SIZE = 1 * 1024 * 1024 * 1024; // 1GB

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function UploadPage() {
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [expiryDays, setExpiryDays] = useState(7);
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  const handleFiles = (newFiles) => {
    if (!newFiles || newFiles.length === 0) return;
    const arr = Array.from(newFiles);
    const total = arr.reduce((sum, f) => sum + f.size, 0);
    if (total > MAX_SIZE) { setError('合計ファイルサイズは最大1GBまでです'); return; }
    setError('');
    setFiles(arr);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setProgress(0);
    setError('');

    try {
      let uploadFile;
      let fileName;

      if (files.length === 1) {
        uploadFile = files[0];
        fileName = files[0].name;
      } else {
        // 複数ファイルをZIP化
        setStatusText('ZIPにまとめています...');
        const zip = new JSZip();
        for (const f of files) {
          zip.file(f.name, f);
        }
        const zipBlob = await zip.generateAsync(
          { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
          (meta) => setProgress(Math.round(meta.percent / 2)) // 前半50%をZIP化に使う
        );
        fileName = 'files.zip';
        uploadFile = new File([zipBlob], fileName, { type: 'application/zip' });
      }

      setStatusText('アップロード中...');
      setProgress(files.length > 1 ? 50 : 0);

      const initRes = await axios.post('/api/upload/init', {
        fileName,
        fileSize: uploadFile.size,
        expiryDays,
      });
      const { fileId, uploadPath } = initRes.data;

      const progressOffset = files.length > 1 ? 50 : 0;
      const progressScale = files.length > 1 ? 0.5 : 1;

      await new Promise((resolve, reject) => {
        let lastLoaded = 0;
        let lastTime = Date.now();

        const upload = new tus.Upload(uploadFile, {
          endpoint: `${process.env.REACT_APP_SUPABASE_URL}/storage/v1/upload/resumable`,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            authorization: `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
            'x-upsert': 'false',
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: 'files',
            objectName: uploadPath,
            contentType: uploadFile.type || 'application/octet-stream',
            cacheControl: '3600',
          },
          chunkSize: 6 * 1024 * 1024,
          onError: reject,
          onProgress: (bytesUploaded, bytesTotal) => {
            const pct = Math.round(progressOffset + (bytesUploaded / bytesTotal) * 100 * progressScale);
            setProgress(pct);
            const now = Date.now();
            const elapsed = (now - lastTime) / 1000;
            if (elapsed > 0.5) {
              setSpeed((bytesUploaded - lastLoaded) / elapsed);
              lastTime = now;
              lastLoaded = bytesUploaded;
            }
          },
          onSuccess: resolve,
        });

        upload.findPreviousUploads().then((prev) => {
          if (prev.length) upload.resumeFromPreviousUpload(prev[0]);
          upload.start();
        });
      });

      const completeRes = await axios.post('/api/upload/complete', {
        fileId,
        password: usePassword && password ? password : null,
      });

      navigate(`/complete/${fileId}`, {
        state: {
          expiresAt: completeRes.data.expiresAt,
          password: usePassword && password ? password : null,
          fileName,
          fileCount: files.length,
        },
      });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'アップロードに失敗しました');
      setUploading(false);
      setStatusText('');
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #2d0a1a 0%, #5c1a3d 25%, #1a3d1a 65%, #0a2d0a 100%)' }}
    >
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-5xl font-bold mb-2 tracking-wide"
            style={{ color: '#d4af37', textShadow: '0 0 20px rgba(212,175,55,0.5), 0 2px 4px rgba(0,0,0,0.8)' }}
          >
            FileTransfer
          </h1>
          <p style={{ color: '#a8c5a0' }} className="text-sm">最大1GBのファイルを簡単に共有</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(10,10,10,0.85)',
            border: '1px solid rgba(212,175,55,0.4)',
            boxShadow: '0 0 40px rgba(212,175,55,0.15), 0 20px 60px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Drop zone */}
          <div
            onClick={() => !uploading && inputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            className={`rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${uploading ? 'cursor-not-allowed opacity-60' : ''}`}
            style={{
              border: `2px dashed ${dragging ? '#d4af37' : 'rgba(212,175,55,0.3)'}`,
              background: dragging ? 'rgba(212,175,55,0.05)' : 'transparent',
            }}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
              disabled={uploading}
            />
            {files.length === 0 ? (
              <div>
                <div className="text-5xl mb-4">✨</div>
                <p className="font-medium" style={{ color: '#e8d5a3' }}>ファイルをドロップ</p>
                <p className="text-sm mt-1" style={{ color: '#6b8f6b' }}>または クリックして選択（複数可）</p>
                <p className="text-xs mt-3" style={{ color: 'rgba(212,175,55,0.5)' }}>最大 1GB</p>
              </div>
            ) : (
              <div>
                <div className="text-3xl mb-2">{files.length > 1 ? '🗂️' : '📄'}</div>
                <p className="font-semibold" style={{ color: '#e8d5a3' }}>
                  {files.length === 1 ? files[0].name : `${files.length} ファイル選択中`}
                </p>
                <p className="text-sm mt-1" style={{ color: '#7a9e7a' }}>{formatBytes(totalSize)}</p>
                {!uploading && <p className="text-xs mt-2" style={{ color: '#d4af37' }}>クリックしてファイルを変更</p>}
              </div>
            )}
          </div>

          {/* File list */}
          {files.length > 1 && !uploading && (
            <div className="mt-3 space-y-1 max-h-36 overflow-y-auto">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg px-3 py-1.5"
                  style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}
                >
                  <span className="text-sm truncate flex-1" style={{ color: '#e8d5a3' }}>{f.name}</span>
                  <span className="text-xs ml-2 flex-shrink-0" style={{ color: '#7a9e7a' }}>{formatBytes(f.size)}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    className="ml-2 text-xs flex-shrink-0 hover:opacity-80"
                    style={{ color: '#e57373' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="mt-3 text-sm text-center" style={{ color: '#e57373' }}>{error}</p>}

          {/* Settings */}
          {!uploading && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium" style={{ color: '#a8c5a0' }}>有効期限</label>
                <select
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value))}
                  className="text-sm rounded-lg px-3 py-1.5 focus:outline-none"
                  style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: '#e8d5a3' }}
                >
                  {[1, 3, 7, 14, 30].map((d) => <option key={d} value={d} style={{ background: '#1a1a1a' }}>{d}日</option>)}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium" style={{ color: '#a8c5a0' }}>パスワード保護</label>
                  <button
                    onClick={() => setUsePassword(!usePassword)}
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200"
                    style={{ background: usePassword ? '#2d7a2d' : 'rgba(255,255,255,0.15)' }}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${usePassword ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                </div>
                {usePassword && (
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="パスワードを入力"
                    className="mt-2 w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                    style={{
                      background: 'rgba(212,175,55,0.08)',
                      border: '1px solid rgba(212,175,55,0.3)',
                      color: '#e8d5a3',
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Progress */}
          {uploading && (
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-1.5" style={{ color: '#a8c5a0' }}>
                <span>{statusText || 'アップロード中...'}</span>
                <span style={{ color: '#d4af37' }}>{progress}%</span>
              </div>
              <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #2d7a2d, #d4af37)' }}
                />
              </div>
              {speed > 0 && <p className="text-xs mt-1.5 text-right" style={{ color: '#6b8f6b' }}>{formatBytes(speed)}/s</p>}
            </div>
          )}

          {/* Button */}
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="mt-6 w-full py-3 rounded-xl font-bold text-base transition-all duration-200 active:scale-[0.98]"
            style={
              files.length > 0 && !uploading
                ? {
                    background: 'linear-gradient(135deg, #b8860b, #d4af37, #b8860b)',
                    color: '#1a1a1a',
                    boxShadow: '0 4px 20px rgba(212,175,55,0.4)',
                  }
                : { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', cursor: 'not-allowed' }
            }
          >
            {uploading ? (statusText || 'アップロード中...') : 'アップロード'}
          </button>
        </div>
      </div>
    </div>
  );
}
