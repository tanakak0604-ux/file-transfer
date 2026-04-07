import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';

function formatBytes(bytes) {
  if (!bytes) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function DownloadPage() {
  const { fileId } = useParams();
  const [fileInfo, setFileInfo] = useState(null);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    axios.get(`/api/files/${fileId}/info`)
      .then((res) => setFileInfo(res.data))
      .catch((err) => {
        if (err.response?.status === 410) {
          setError('このファイルは有効期限が切れています');
        } else if (err.response?.status === 404) {
          setError('ファイルが見つかりません');
        } else {
          setError(err.response?.data?.error || 'ファイル情報の取得に失敗しました');
        }
      });
  }, [fileId]);

  const handleDownload = async () => {
    setDownloading(true);
    setError('');
    try {
      const verifyRes = await axios.post(`/api/files/${fileId}/verify`, {
        password: fileInfo?.hasPassword ? password : undefined,
      });
      const { token } = verifyRes.data;

      const url = `/api/files/${fileId}/download?token=${token}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = fileInfo?.originalName || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDone(true);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('パスワードが違います');
      } else {
        setError(err.response?.data?.error || 'ダウンロードに失敗しました');
      }
    } finally {
      setDownloading(false);
    }
  };

  const cardStyle = {
    background: 'rgba(10,10,10,0.85)',
    border: '1px solid rgba(212,175,55,0.4)',
    boxShadow: '0 0 40px rgba(212,175,55,0.15), 0 20px 60px rgba(0,0,0,0.6)',
    backdropFilter: 'blur(10px)',
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #2d0a1a 0%, #5c1a3d 25%, #1a3d1a 65%, #0a2d0a 100%)' }}
    >
      <div className="w-full max-w-md">
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

        <div className="rounded-2xl p-8" style={cardStyle}>
          {error && !fileInfo ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">😔</div>
              <p className="font-medium" style={{ color: '#e8d5a3' }}>{error}</p>
            </div>
          ) : !fileInfo ? (
            <div className="text-center py-8" style={{ color: '#6b8f6b' }}>読み込み中...</div>
          ) : done ? (
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4"
                style={{ background: 'rgba(45,122,45,0.2)', border: '2px solid rgba(45,122,45,0.5)' }}>
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#4ade80' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-bold mb-1" style={{ color: '#e8d5a3' }}>ダウンロード開始！</p>
              <p className="text-sm" style={{ color: '#7a9e7a' }}>ブラウザのダウンロードをご確認ください</p>
              <button
                onClick={() => { setDone(false); setPassword(''); }}
                className="mt-5 text-sm hover:underline"
                style={{ color: '#d4af37' }}
              >
                もう一度ダウンロード
              </button>
            </div>
          ) : (
            <>
              {/* File info */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)' }}>
                  <span className="text-2xl">📄</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-lg break-all leading-tight" style={{ color: '#e8d5a3' }}>
                    {fileInfo.originalName}
                  </p>
                  <p className="text-sm mt-0.5" style={{ color: '#7a9e7a' }}>{formatBytes(fileInfo.size)}</p>
                </div>
              </div>

              {/* Metadata */}
              <div className="rounded-xl p-4 mb-6 space-y-2"
                style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#6b8f6b' }}>有効期限</span>
                  <span className="font-medium" style={{ color: '#a8c5a0' }}>{formatDate(fileInfo.expiresAt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#6b8f6b' }}>ダウンロード数</span>
                  <span className="font-medium" style={{ color: '#a8c5a0' }}>{fileInfo.downloadCount} 回</span>
                </div>
                {fileInfo.hasPassword && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#6b8f6b' }}>パスワード</span>
                    <span className="font-medium" style={{ color: '#d4af37' }}>🔒 保護あり</span>
                  </div>
                )}
              </div>

              {/* Password input */}
              {fileInfo.hasPassword && (
                <div className="mb-5">
                  <label className="text-sm font-medium block mb-1.5" style={{ color: '#a8c5a0' }}>
                    パスワード
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDownload()}
                    placeholder="パスワードを入力"
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                    style={{
                      background: 'rgba(212,175,55,0.08)',
                      border: '1px solid rgba(212,175,55,0.3)',
                      color: '#e8d5a3',
                    }}
                  />
                </div>
              )}

              {/* Error */}
              {error && (
                <p className="text-sm mb-4 text-center" style={{ color: '#e57373' }}>{error}</p>
              )}

              {/* Download button */}
              <button
                onClick={handleDownload}
                disabled={downloading || (fileInfo.hasPassword && !password)}
                className="w-full py-3 rounded-xl font-bold text-base transition-all duration-200 active:scale-[0.98]"
                style={
                  !downloading && (!fileInfo.hasPassword || password)
                    ? {
                        background: 'linear-gradient(135deg, #b8860b, #d4af37, #b8860b)',
                        color: '#1a1a1a',
                        boxShadow: '0 4px 20px rgba(212,175,55,0.4)',
                      }
                    : { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', cursor: 'not-allowed' }
                }
              >
                {downloading ? 'ダウンロード準備中...' : 'ダウンロード'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
