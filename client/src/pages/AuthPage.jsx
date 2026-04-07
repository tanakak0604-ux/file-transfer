import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError('メールアドレスまたはパスワードが違います');
    }

    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #2d0a1a 0%, #5c1a3d 25%, #1a3d1a 65%, #0a2d0a 100%)' }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1
            className="text-5xl font-bold mb-2 tracking-wide"
            style={{ color: '#d4af37', textShadow: '0 0 20px rgba(212,175,55,0.5), 0 2px 4px rgba(0,0,0,0.8)' }}
          >
            FileTransfer
          </h1>
          <p style={{ color: '#a8c5a0' }} className="text-sm">ログインしてください</p>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(10,10,10,0.85)',
            border: '1px solid rgba(212,175,55,0.4)',
            boxShadow: '0 0 40px rgba(212,175,55,0.15), 0 20px 60px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: '#a8c5a0' }}>
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@andto.jp"
                required
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{
                  background: 'rgba(212,175,55,0.08)',
                  border: '1px solid rgba(212,175,55,0.3)',
                  color: '#e8d5a3',
                }}
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: '#a8c5a0' }}>
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード"
                required
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{
                  background: 'rgba(212,175,55,0.08)',
                  border: '1px solid rgba(212,175,55,0.3)',
                  color: '#e8d5a3',
                }}
              />
            </div>

            {error && (
              <p className="text-sm text-center" style={{ color: '#e57373' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-base transition-all duration-200 active:scale-[0.98]"
              style={
                !loading
                  ? {
                      background: 'linear-gradient(135deg, #b8860b, #d4af37, #b8860b)',
                      color: '#1a1a1a',
                      boxShadow: '0 4px 20px rgba(212,175,55,0.4)',
                    }
                  : { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', cursor: 'not-allowed' }
              }
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
