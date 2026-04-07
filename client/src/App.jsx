import { BrowserRouter, Routes, Route } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import CompletePage from './pages/CompletePage';
import DownloadPage from './pages/DownloadPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/complete/:fileId" element={<CompletePage />} />
        <Route path="/download/:fileId" element={<DownloadPage />} />
      </Routes>
    </BrowserRouter>
  );
}
