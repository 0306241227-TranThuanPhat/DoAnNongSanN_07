import { BrowserRouter, Routes, Route } from 'react-router-dom';
import GlobalUxOverlay from './components/GlobalUxOverlay';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import CustomerPortalPage from './pages/CustomerPortalPage';
import DashboardPage from './pages/DashboardPage';
import TracePage from './pages/TracePage';

export default function App() {
  return (
    <BrowserRouter>
      {/* Lớp phủ toàn cục hiển thị Toast & Popup hết phiên 419/401 */}
      <GlobalUxOverlay />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/my-account" element={<CustomerPortalPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
       <Route path="/trace/:qrToken?" element={<TracePage />} />
      </Routes>
    </BrowserRouter>
  );
}