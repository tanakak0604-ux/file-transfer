import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as tus from 'tus-js-client';

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

  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [expiryDays, setExpiryDays] = useState(7);
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [error, setError] = useState('');

  const handleFile = (f) => {
    if (!f) return;
    if (f.size > MAX_SIZE) { setError('ファイルサイズは最大1GBまでです'); return; }
    setError('');
    setFile(f);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setError('');

    try {
      // 1. Init: create file record
      const initRes = await axios.post('/api/upload/init', {
        fileName: file.name,
        fileSize: file.size,
        expiryDays,
      });
      const { fileId, uploadPath } = initRes.data;

      // 2. Upload directly to Supabase via TUS resumable upload
      await new Promise((resolve, reject) => {
        let lastLoaded = 0;
        let lastTime = Date.now();

        const upload = new tus.Upload(file, {
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
            contentType: file.type || 'application/octet-stream',
            cacheControl: '3600',
          },
          chunkSize: 6 * 1024 * 1024, // 6MB chunks
          onError: reject,
          onProgress: (bytesUploaded, bytesTotal) => {
            const pct = Math.round((bytesUploaded / bytesTotal) * 100);
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

      // 3. Complete: hash password & activate record
      const completeRes = await axios.post('/api/upload/complete', {
        fileId,
        password: usePassword && password ? password : null,
      });

      navigate(`/complete/${fileId}`, {
        state: {
          expiresAt: completeRes.data.expiresAt,
          password: usePassword && password ? password : null,
          fileName: file.name,
        },
      });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'アップロードに失敗しました');
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">FileTransfer</h1>
          <p className="text-purple-200 text-sm">最大1GBのファイルを簡単に共有</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Drop zone */}
          <div
            onClick={() => !uploading && inputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200
              ${dragging ? 'border-violet-500 bg-violet-50 scale-[1.01]' : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'}
              ${uploading ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <input ref={inputRef} type="file" className="hidden" onChange={(e) => handleFile(e.target.files[0])} disabled={uploading} />
            {file ? (
              <div>
                <div className="text-4xl mb-3">📄</div>
                <p className="font-semibold text-gray-800 text-lg break-all">{file.name}</p>
                <p className="text-gray-500 text-sm mt-1">{formatBytes(file.size)}</p>
                {!uploading && <p className="text-violet-500 text-xs mt-2">クリックしてファイルを変更</p>}
              </div>
            ) : (
              <div>
                <div className="text-5xl mb-4">☁️</div>
                <p className="text-gray-600 font-medium">ファイルをドロップ</p>
                <p className="text-gray-400 text-sm mt-1">または クリックして選択</p>
                <p className="text-gray-300 text-xs mt-3">最大 1GB</p>
              </div>
            )}
          </div>

          {error && <p className="mt-3 text-red-500 text-sm text-center">{error}</p>}

          {/* Settings */}
          {!uploading && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600 font-medium">有効期限</label>
                <select
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  {[1, 3, 7, 14, 30].map((d) => <option key={d} value={d}>{d}日</option>)}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-600 font-medium">パスワード保護</label>
                  <button
                    onClick={() => setUsePassword(!usePassword)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${usePassword ? 'bg-violet-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${usePassword ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                {usePassword && (
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="パスワードを入力"
                    className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                )}
              </div>
            </div>
          )}

          {/* Progress */}
          {uploading && (
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-600 mb-1.5">
                <span>アップロード中...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {speed > 0 && <p className="text-xs text-gray-400 mt-1.5 text-right">{formatBytes(speed)}/s</p>}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className={`mt-6 w-full py-3 rounded-xl font-semibold text-white transition-all duration-200
              ${file && !uploading
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg hover:shadow-xl active:scale-[0.98]'
                : 'bg-gray-300 cursor-not-allowed'}`}
          >
            {uploading ? 'アップロード中...' : 'アップロード'}
          </button>
        </div>
      </div>
    </div>
  );
}
