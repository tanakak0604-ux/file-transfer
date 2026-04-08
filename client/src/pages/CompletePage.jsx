import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import logo from '../logo.png';

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
    } catch {}
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#F5F2EC' }}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-block">
            <img src={logo} alt="and to" style={{ width: '120px', display: 'block' }} />
            <p className="text-xs uppercase" style={{ color: '#8C8880', width: '120px', marginTop: '8px', textAlign: 'justify', textAlignLast: 'justify' }}>
              FILE TRANSFER
            </p>
          </div>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{
            background: '#FDFAF5',
            border: '1px solid #E2DDD4',
            boxShadow: '0 4px 24px rgba(45,42,36,0.07)',
          }}
        >
          {/* Success */}
          <div className="flex items-center justify-center w-14 h-14 rounded-full mx-auto mb-4"
            style={{ background: '#E8F0E9', border: '1.5px solid #6B8F71' }}>
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#6B8F71' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-lg font-bold text-center mb-1" style={{ color: '#2D2A24' }}>アップロード完了</h2>
          {state?.fileName && (
            <p className="text-xs text-center mb-6 break-all" style={{ color: '#8C8880' }}>{state.fileName}</p>
          )}

          {/* Download URL */}
          <div className="mb-4">
            <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: '#8C8880' }}>
              Download URL
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={downloadUrl}
                className="flex-1 rounded-lg px-3 py-2 text-xs focus:outline-none"
                style={{ background: '#F5F2EC', border: '1px solid #E2DDD4', color: '#2D2A24' }}
              />
              <button
                onClick={() => copy(downloadUrl, setCopied)}
                className="px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                style={copied
                  ? { background: '#E8F0E9', color: '#6B8F71', border: '1px solid #6B8F71' }
                  : { background: '#2D2A24', color: '#F5F2EC' }
                }
              >
                {copied ? 'コピー済' : 'コピー'}
              </button>
            </div>
          </div>

          {/* Password */}
          {state?.password && (
            <div className="mb-4">
              <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: '#8C8880' }}>
                Password
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={state.password}
                  type="text"
                  className="flex-1 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none"
                  style={{ background: '#F5E6E0', border: '1px solid #E8C9BC', color: '#C8694A' }}
                />
                <button
                  onClick={() => copy(state.password, setCopiedPw)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                  style={copiedPw
                    ? { background: '#E8F0E9', color: '#6B8F71', border: '1px solid #6B8F71' }
                    : { background: '#F5E6E0', color: '#C8694A', border: '1px solid #E8C9BC' }
                  }
                >
                  {copiedPw ? 'コピー済' : 'コピー'}
                </button>
              </div>
              <p className="text-xs mt-1" style={{ color: '#B0AA9E' }}>必ずメモしてください</p>
            </div>
          )}

          {/* Expiry */}
          {state?.expiresAt && (
            <p className="text-xs mt-3 text-center" style={{ color: '#8C8880' }}>
              有効期限：<span style={{ color: '#2D2A24' }} className="font-medium">{formatDate(state.expiresAt)}</span>
            </p>
          )}

          <button
            onClick={() => navigate('/')}
            className="mt-6 w-full py-3 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200"
            style={{ background: 'transparent', border: '1px solid #E2DDD4', color: '#8C8880' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#EDEBE4'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            新しいファイルを送る
          </button>
        </div>
      </div>
    </div>
  );
}
