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
    return <div style={{ minHeight: '100vh', background: '#F5F2EC' }} />;
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
