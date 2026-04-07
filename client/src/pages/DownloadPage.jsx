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
        if (err.response?.status === 410) setError('このファイルは有効期限が切れています');
        else if (err.response?.status === 404) setError('ファイルが見つかりません');
        else setError(err.response?.data?.error || 'ファイル情報の取得に失敗しました');
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
      const a = document.createElement('a');
      a.href = `/api/files/${fileId}/download?token=${token}`;
      a.download = fileInfo?.originalName || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDone(true);
    } catch (err) {
      if (err.response?.status === 401) setError('パスワードが違います');
      else setError(err.response?.data?.error || 'ダウンロードに失敗しました');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#F5F2EC' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-widest mb-1" style={{ color: '#2D2A24', letterSpacing: '0.15em' }}>
            and to
          </h1>
          <p className="text-xs tracking-widest uppercase" style={{ color: '#8C8880', letterSpacing: '0.2em' }}>
            File Transfer
          </p>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{
            background: '#FDFAF5',
            border: '1px solid #E2DDD4',
            boxShadow: '0 4px 24px rgba(45,42,36,0.07)',
          }}
        >
          {error && !fileInfo ? (
            <div className="text-center py-4">
              <p className="text-2xl mb-3">—</p>
              <p className="text-sm font-medium" style={{ color: '#2D2A24' }}>{error}</p>
            </div>
          ) : !fileInfo ? (
            <div className="text-center py-8 text-sm" style={{ color: '#8C8880' }}>読み込み中...</div>
          ) : done ? (
            <div className="text-center">
              <div className="flex items-center justify-center w-14 h-14 rounded-full mx-auto mb-4"
                style={{ background: '#E8F0E9', border: '1.5px solid #6B8F71' }}>
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#6B8F71' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-base font-bold mb-1" style={{ color: '#2D2A24' }}>ダウンロード開始</p>
              <p className="text-xs" style={{ color: '#8C8880' }}>ブラウザのダウンロードをご確認ください</p>
              <button
                onClick={() => { setDone(false); setPassword(''); }}
                className="mt-5 text-xs hover:underline"
                style={{ color: '#C8694A' }}
              >
                もう一度ダウンロード
              </button>
            </div>
          ) : (
            <>
              {/* File info */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: '#F5F2EC', border: '1px solid #E2DDD4' }}>
                  <span className="text-xl">📄</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm break-all leading-tight" style={{ color: '#2D2A24' }}>
                    {fileInfo.originalName}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#8C8880' }}>{formatBytes(fileInfo.size)}</p>
                </div>
              </div>

              {/* Metadata */}
              <div className="rounded-xl p-4 mb-6 space-y-2"
                style={{ background: '#F5F2EC', border: '1px solid #E2DDD4' }}>
                <div className="flex justify-between text-xs">
                  <span style={{ color: '#8C8880' }}>有効期限</span>
                  <span className="font-medium" style={{ color: '#2D2A24' }}>{formatDate(fileInfo.expiresAt)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: '#8C8880' }}>ダウンロード数</span>
                  <span className="font-medium" style={{ color: '#2D2A24' }}>{fileInfo.downloadCount} 回</span>
                </div>
                {fileInfo.hasPassword && (
                  <div className="flex justify-between text-xs">
                    <span style={{ color: '#8C8880' }}>パスワード</span>
                    <span className="font-medium" style={{ color: '#C8694A' }}>保護あり</span>
                  </div>
                )}
              </div>

              {/* Password input */}
              {fileInfo.hasPassword && (
                <div className="mb-5">
                  <label className="text-xs font-semibold uppercase tracking-widest block mb-2" style={{ color: '#8C8880' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDownload()}
                    placeholder="パスワードを入力"
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                    style={{ background: '#F5F2EC', border: '1px solid #E2DDD4', color: '#2D2A24' }}
                  />
                </div>
              )}

              {error && (
                <p className="text-xs mb-4 text-center" style={{ color: '#C8694A' }}>{error}</p>
              )}

              {downloading && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1.5" style={{ color: '#8C8880' }}>
                    <span>準備中...</span>
                  </div>
                  <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: '#E2DDD4' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        background: '#C8694A',
                        animation: 'indeterminate 1.4s ease-in-out infinite',
                        width: '40%',
                      }}
                    />
                  </div>
                  <style>{`
                    @keyframes indeterminate {
                      0% { transform: translateX(-100%) scaleX(1); }
                      50% { transform: translateX(100%) scaleX(1.5); }
                      100% { transform: translateX(250%) scaleX(1); }
                    }
                  `}</style>
                </div>
              )}

              <button
                onClick={handleDownload}
                disabled={downloading || (fileInfo.hasPassword && !password)}
                className="w-full py-3 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200 active:scale-[0.98]"
                style={
                  !downloading && (!fileInfo.hasPassword || password)
                    ? { background: '#2D2A24', color: '#F5F2EC' }
                    : { background: '#E2DDD4', color: '#8C8880', cursor: 'not-allowed' }
                }
              >
                {downloading ? '準備中...' : 'ダウンロード'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
