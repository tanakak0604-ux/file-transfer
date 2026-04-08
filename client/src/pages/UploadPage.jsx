import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import JSZip from 'jszip';
import { supabase } from '../lib/supabase';

const MAX_SIZE = 5 * 1024 * 1024 * 1024;
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

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
    if (total > MAX_SIZE) { setError('合計ファイルサイズは最大5GBまでです'); return; }
    setError('');
    setFiles(arr);
  };

  const removeFile = (index) => setFiles((prev) => prev.filter((_, i) => i !== index));

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
        setStatusText('ZIPにまとめています...');
        const zip = new JSZip();
        for (const f of files) zip.file(f.name, f);
        const zipBlob = await zip.generateAsync(
          { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
          (meta) => setProgress(Math.round(meta.percent / 2))
        );
        fileName = 'files.zip';
        uploadFile = new File([zipBlob], fileName, { type: 'application/zip' });
      }

      setStatusText('アップロード中...');
      setProgress(files.length > 1 ? 50 : 0);

      // アップロード初期化
      const initRes = await axios.post('/api/upload/init.php', {
        fileName,
        fileSize: uploadFile.size,
        expiryDays,
      });
      const { fileId } = initRes.data;

      // チャンクアップロード
      const totalChunks = Math.ceil(uploadFile.size / CHUNK_SIZE);
      const progressOffset = files.length > 1 ? 50 : 0;
      const progressScale  = files.length > 1 ? 0.5 : 1;
      let lastLoaded = 0;
      let lastTime = Date.now();

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end   = Math.min(start + CHUNK_SIZE, uploadFile.size);
        const chunk = uploadFile.slice(start, end);

        const formData = new FormData();
        formData.append('fileId', fileId);
        formData.append('chunkIndex', i);
        formData.append('chunk', chunk);

        await axios.post('/api/upload/chunk.php', formData, {
          onUploadProgress: (e) => {
            const loaded = i * CHUNK_SIZE + e.loaded;
            const pct = Math.round(progressOffset + (loaded / uploadFile.size) * 100 * progressScale);
            setProgress(pct);
            const now = Date.now();
            const elapsed = (now - lastTime) / 1000;
            if (elapsed > 0.5) {
              setSpeed((loaded - lastLoaded) / elapsed);
              lastTime = now;
              lastLoaded = loaded;
            }
          },
        });
      }

      // アップロード完了
      const completeRes = await axios.post('/api/upload/complete.php', {
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#F5F2EC' }}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-widest mb-1" style={{ color: '#2D2A24', letterSpacing: '0.15em' }}>
            and to
          </h1>
          <p className="text-xs tracking-widest uppercase" style={{ color: '#8C8880', letterSpacing: '0.2em' }}>
            File Transfer
          </p>
        </div>

        <div className="flex justify-end mb-3">
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs px-3 py-1.5 rounded-lg transition-all duration-200"
            style={{ color: '#8C8880', border: '1px solid #E2DDD4', background: 'transparent' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#EDEBE4'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            ログアウト
          </button>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ background: '#FDFAF5', border: '1px solid #E2DDD4', boxShadow: '0 4px 24px rgba(45,42,36,0.07)' }}
        >
          {/* Drop zone */}
          <div
            onClick={() => !uploading && inputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            className={`rounded-xl p-10 text-center cursor-pointer transition-all duration-300 ${uploading ? 'cursor-not-allowed opacity-60' : ''}`}
            style={{
              border: `2px dashed ${dragging ? '#C8694A' : '#E2DDD4'}`,
              background: dragging ? '#F5E6E0' : '#F5F2EC',
            }}
          >
            <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} disabled={uploading} />
            {files.length === 0 ? (
              <div>
                <div className="text-4xl mb-3">↑</div>
                <p className="font-medium text-sm" style={{ color: '#2D2A24' }}>ファイルをドロップ</p>
                <p className="text-xs mt-1" style={{ color: '#8C8880' }}>または クリックして選択（複数可）</p>
                <p className="text-xs mt-3" style={{ color: '#B0AA9E' }}>最大 5GB</p>
              </div>
            ) : (
              <div>
                <div className="text-3xl mb-2">{files.length > 1 ? '🗂' : '📄'}</div>
                <p className="font-semibold text-sm break-all" style={{ color: '#2D2A24' }}>
                  {files.length === 1 ? files[0].name : `${files.length} ファイル選択中`}
                </p>
                <p className="text-xs mt-1" style={{ color: '#8C8880' }}>{formatBytes(totalSize)}</p>
                {!uploading && <p className="text-xs mt-2" style={{ color: '#C8694A' }}>クリックしてファイルを変更</p>}
              </div>
            )}
          </div>

          {/* File list */}
          {files.length > 1 && !uploading && (
            <div className="mt-3 space-y-1 max-h-36 overflow-y-auto">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg px-3 py-1.5"
                  style={{ background: '#F5F2EC', border: '1px solid #E2DDD4' }}>
                  <span className="text-xs truncate flex-1" style={{ color: '#2D2A24' }}>{f.name}</span>
                  <span className="text-xs ml-2 flex-shrink-0" style={{ color: '#8C8880' }}>{formatBytes(f.size)}</span>
                  <button onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    className="ml-2 text-xs flex-shrink-0" style={{ color: '#C8694A' }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="mt-3 text-xs text-center" style={{ color: '#C8694A' }}>{error}</p>}

          {/* Settings */}
          {!uploading && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8C8880' }}>有効期限</label>
                <select value={expiryDays} onChange={(e) => setExpiryDays(Number(e.target.value))}
                  className="text-sm rounded-lg px-3 py-1.5 focus:outline-none"
                  style={{ background: '#F5F2EC', border: '1px solid #E2DDD4', color: '#2D2A24' }}>
                  {[1, 3, 7, 14, 30].map((d) => <option key={d} value={d}>{d}日</option>)}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8C8880' }}>パスワード保護</label>
                  <button onClick={() => setUsePassword(!usePassword)}
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200"
                    style={{ background: usePassword ? '#6B8F71' : '#E2DDD4' }}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${usePassword ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                {usePassword && (
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="パスワードを入力" className="mt-2 w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                    style={{ background: '#F5F2EC', border: '1px solid #E2DDD4', color: '#2D2A24' }} />
                )}
              </div>
            </div>
          )}

          {/* Progress */}
          {uploading && (
            <div className="mt-6">
              <div className="flex justify-between text-xs mb-1.5" style={{ color: '#8C8880' }}>
                <span>{statusText || 'アップロード中...'}</span>
                <span style={{ color: '#C8694A' }}>{progress}%</span>
              </div>
              <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: '#E2DDD4' }}>
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, background: '#C8694A' }} />
              </div>
              {speed > 0 && <p className="text-xs mt-1.5 text-right" style={{ color: '#8C8880' }}>{formatBytes(speed)}/s</p>}
            </div>
          )}

          <button onClick={handleUpload} disabled={files.length === 0 || uploading}
            className="mt-6 w-full py-3 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200 active:scale-[0.98]"
            style={files.length > 0 && !uploading
              ? { background: '#2D2A24', color: '#F5F2EC' }
              : { background: '#E2DDD4', color: '#8C8880', cursor: 'not-allowed' }}>
            {uploading ? (statusText || 'アップロード中...') : 'アップロード'}
          </button>
        </div>
      </div>
    </div>
  );
}
