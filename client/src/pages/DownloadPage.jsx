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
        const msg = err.response?.data?.error;
        if (err.response?.status === 410) {
          setError('このファイルは有効期限が切れています');
        } else if (err.response?.status === 404) {
          setError('ファイルが見つかりません');
        } else {
          setError(msg || 'ファイル情報の取得に失敗しました');
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

      // Trigger browser download
      const url = `/api/files/${fileId}/download?token=${token}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = fileInfo?.originalName || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDone(true);
    } catch (err) {
      const msg = err.response?.data?.error;
      if (err.response?.status === 401) {
        setError('パスワードが違います');
      } else {
        setError(msg || 'ダウンロードに失敗しました');
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white">FileTransfer</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {error && !fileInfo ? (
            // Fatal error (expired / not found)
            <div className="text-center">
              <div className="text-5xl mb-4">😔</div>
              <p className="text-gray-600 font-medium">{error}</p>
            </div>
          ) : !fileInfo ? (
            <div className="text-center text-gray-400 py-8">読み込み中...</div>
          ) : done ? (
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-bold text-gray-800 mb-1">ダウンロード開始！</p>
              <p className="text-gray-500 text-sm">ブラウザのダウンロードをご確認ください</p>
              <button
                onClick={() => { setDone(false); setPassword(''); }}
                className="mt-5 text-sm text-violet-600 hover:underline"
              >
                もう一度ダウンロード
              </button>
            </div>
          ) : (
            <>
              {/* File info */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">📄</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-lg break-all leading-tight">
                    {fileInfo.originalName}
                  </p>
                  <p className="text-gray-400 text-sm mt-0.5">{formatBytes(fileInfo.size)}</p>
                </div>
              </div>

              {/* Metadata */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">有効期限</span>
                  <span className="text-gray-700 font-medium">{formatDate(fileInfo.expiresAt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">ダウンロード数</span>
                  <span className="text-gray-700 font-medium">{fileInfo.downloadCount} 回</span>
                </div>
                {fileInfo.hasPassword && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">パスワード</span>
                    <span className="text-yellow-600 font-medium">🔒 保護あり</span>
                  </div>
                )}
              </div>

              {/* Password input */}
              {fileInfo.hasPassword && (
                <div className="mb-5">
                  <label className="text-sm text-gray-600 font-medium block mb-1.5">
                    パスワード
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDownload()}
                    placeholder="パスワードを入力"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
              )}

              {/* Error */}
              {error && (
                <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
              )}

              {/* Download button */}
              <button
                onClick={handleDownload}
                disabled={downloading || (fileInfo.hasPassword && !password)}
                className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-200
                  ${!downloading && (!fileInfo.hasPassword || password)
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg hover:shadow-xl active:scale-[0.98]'
                    : 'bg-gray-300 cursor-not-allowed'
                  }`}
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
