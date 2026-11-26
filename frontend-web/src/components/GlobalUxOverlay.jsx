import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, LockKeyhole, X } from 'lucide-react';

export function showToast(message, type = 'success') {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type } }));
}

export default function GlobalUxOverlay() {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [sessionError, setSessionError] = useState(null);

  useEffect(() => {
    const onToast = (e) => {
      setToast(e.detail);
      setTimeout(() => setToast(null), 3200);
    };

    const onSessionExpired = (e) => {
      setSessionError(e.detail);
    };

    window.addEventListener('app-toast', onToast);
    window.addEventListener('session-expired', onSessionExpired);
    return () => {
      window.removeEventListener('app-toast', onToast);
      window.removeEventListener('session-expired', onSessionExpired);
    };
  }, []);

  const handleRelogin = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    setSessionError(null);
    navigate('/login');
  };

  return (
    <>
      {/* Toast Notification góc trên bên phải */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold transition-all ${
            toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-900 border-emerald-700 text-white'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Popup xử lý lỗi 419 / 401 Session Timeout */}
      {sessionError && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <LockKeyhole className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-stone-900">
              Phiên Làm Việc Đã Hết Hạn (Mã {sessionError.code})
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">{sessionError.message}</p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setSessionError(null)}
                className="flex-1 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold"
              >
                Đóng
              </button>
              <button
                onClick={handleRelogin}
                className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
              >
                Đăng nhập lại ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}