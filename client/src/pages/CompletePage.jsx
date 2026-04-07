import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';

function formatDate(iso) {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function CompletePage() {
  const { fileId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [copiedPw, setCopiedPw] = useState(false);

  const downloadUrl = `${window.location.origin}/download/${fileId}`;

  const copy = async (text, setter) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {/* Success icon */}
          <div className="flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mx-auto mb-4">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-1">アップロード完了！</h2>
          {state?.fileName && (
            <p className="text-gray-500 text-sm mb-6 break-all">{state.fileName}</p>
          )}

          {/* Download URL */}
          <div className="text-left mb-4">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
              ダウンロードURL
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={downloadUrl}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50 focus:outline-none"
              />
              <button
                onClick={() => copy(downloadUrl, setCopied)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${copied ? 'bg-green-500 text-white' : 'bg-violet-600 text-white hover:bg-violet-700'}`}
              >
                {copied ? 'コピー済' : 'コピー'}
              </button>
            </div>
          </div>

          {/* Password */}
          {state?.password && (
            <div className="text-left mb-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                パスワード（必ずメモしてください）
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={state.password}
                  type="text"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-yellow-50 font-mono focus:outline-none"
                />
                <button
                  onClick={() => copy(state.password, setCopiedPw)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${copiedPw ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white hover:bg-yellow-600'}`}
                >
                  {copiedPw ? 'コピー済' : 'コピー'}
                </button>
              </div>
            </div>
          )}

          {/* Expiry */}
          {state?.expiresAt && (
            <p className="text-sm text-gray-400 mt-2">
              有効期限: <span className="text-gray-600 font-medium">{formatDate(state.expiresAt)}</span>
            </p>
          )}

          {/* New upload */}
          <button
            onClick={() => navigate('/')}
            className="mt-6 w-full py-3 rounded-xl font-semibold text-violet-600 border-2 border-violet-200 hover:bg-violet-50 transition-colors duration-200"
          >
            新しいファイルを送る
          </button>
        </div>
      </div>
    </div>
  );
}
