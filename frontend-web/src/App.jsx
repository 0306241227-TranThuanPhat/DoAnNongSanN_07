import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import TracePage from './pages/TracePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/trace/:qrToken" element={<TracePage />} />
      </Routes>
    </BrowserRouter>
  );
}