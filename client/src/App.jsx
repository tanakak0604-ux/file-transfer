import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import AuthPage from './pages/AuthPage';
import UploadPage from './pages/UploadPage';
import CompletePage from './pages/CompletePage';
import DownloadPage from './pages/DownloadPage';

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #2d0a1a 0%, #5c1a3d 25%, #1a3d1a 65%, #0a2d0a 100%)' }}
      >
        <p style={{ color: '#a8c5a0' }}>読み込み中...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={session ? <Navigate to="/" replace /> : <AuthPage />} />
        <Route path="/" element={session ? <UploadPage /> : <Navigate to="/auth" replace />} />
        <Route path="/complete/:fileId" element={session ? <CompletePage /> : <Navigate to="/auth" replace />} />
        <Route path="/download/:fileId" element={<DownloadPage />} />
      </Routes>
    </BrowserRouter>
  );
}
