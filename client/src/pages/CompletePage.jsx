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
          {/* Success icon */}
          <div className="flex items-center justify-center w-20 h-20 rounded-full mx-auto mb-4"
            style={{ background: 'rgba(45,122,45,0.2)', border: '2px solid rgba(45,122,45,0.5)' }}>
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#4ade80' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-center mb-1" style={{ color: '#e8d5a3' }}>アップロード完了！</h2>
          {state?.fileName && (
            <p className="text-sm text-center mb-6 break-all" style={{ color: '#7a9e7a' }}>{state.fileName}</p>
          )}

          {/* Download URL */}
          <div className="mb-4">
            <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#a8c5a0' }}>
              ダウンロードURL
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={downloadUrl}
                className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{
                  background: 'rgba(212,175,55,0.08)',
                  border: '1px solid rgba(212,175,55,0.3)',
                  color: '#e8d5a3',
                }}
              />
              <button
                onClick={() => copy(downloadUrl, setCopied)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={copied
                  ? { background: 'rgba(45,122,45,0.6)', color: '#4ade80', border: '1px solid rgba(45,122,45,0.5)' }
                  : { background: 'linear-gradient(135deg, #b8860b, #d4af37)', color: '#1a1a1a' }
                }
              >
                {copied ? 'コピー済' : 'コピー'}
              </button>
            </div>
          </div>

          {/* Password */}
          {state?.password && (
            <div className="mb-4">
              <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#a8c5a0' }}>
                パスワード（必ずメモしてください）
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={state.password}
                  type="text"
                  className="flex-1 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none"
                  style={{
                    background: 'rgba(212,175,55,0.12)',
                    border: '1px solid rgba(212,175,55,0.4)',
                    color: '#d4af37',
                  }}
                />
                <button
                  onClick={() => copy(state.password, setCopiedPw)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                  style={copiedPw
                    ? { background: 'rgba(45,122,45,0.6)', color: '#4ade80', border: '1px solid rgba(45,122,45,0.5)' }
                    : { background: 'rgba(212,175,55,0.2)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.4)' }
                  }
                >
                  {copiedPw ? 'コピー済' : 'コピー'}
                </button>
              </div>
            </div>
          )}

          {/* Expiry */}
          {state?.expiresAt && (
            <p className="text-sm mt-2 text-center" style={{ color: '#6b8f6b' }}>
              有効期限: <span style={{ color: '#a8c5a0' }} className="font-medium">{formatDate(state.expiresAt)}</span>
            </p>
          )}

          {/* New upload */}
          <button
            onClick={() => navigate('/')}
            className="mt-6 w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200"
            style={{
              background: 'transparent',
              border: '1px solid rgba(212,175,55,0.4)',
              color: '#d4af37',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212,175,55,0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            新しいファイルを送る
          </button>
        </div>
      </div>
    </div>
  );
}
