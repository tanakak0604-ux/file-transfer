import { useState } from 'react';
import { supabase } from '../lib/supabase';
import logo from '../logo.png';

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
    if (signInError) setError('メールアドレスまたはパスワードが違います');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#F5F2EC' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-block">
            <img src={logo} alt="and to" style={{ width: '120px', display: 'block' }} />
            <p className="text-xs uppercase text-center" style={{ color: '#8C8880', width: '120px', marginTop: '8px', letterSpacing: '0.45em' }}>
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
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest block mb-2" style={{ color: '#8C8880' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@andto.jp"
                required
                className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none"
                style={{
                  background: '#F5F2EC',
                  border: '1px solid #E2DDD4',
                  color: '#2D2A24',
                }}
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-widest block mb-2" style={{ color: '#8C8880' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none"
                style={{
                  background: '#F5F2EC',
                  border: '1px solid #E2DDD4',
                  color: '#2D2A24',
                }}
              />
            </div>

            {error && (
              <p className="text-xs text-center" style={{ color: '#C8694A' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200 active:scale-[0.98]"
              style={
                !loading
                  ? { background: '#2D2A24', color: '#F5F2EC' }
                  : { background: '#E2DDD4', color: '#8C8880', cursor: 'not-allowed' }
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
