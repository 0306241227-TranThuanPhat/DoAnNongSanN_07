import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Sprout, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@nongsansach.vn');
  const [matKhau, setMatKhau] = useState('123456');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/login', {
        email,
        mat_khau: matKhau,
      });
      localStorage.setItem('user', JSON.stringify(res.data.user));
      if (res.data.user.ma_vai_tro === 'customer') {
        navigate('/');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại!');
    }
  };

  const quickAccounts = [
    { label: 'Admin', email: 'admin@nongsansach.vn' },
    { label: 'Farm Staff', email: 'farm@nongsansach.vn' },
    { label: 'Sales', email: 'sales@nongsansach.vn' },
    { label: 'Customer', email: 'khach@gmail.com' },
  ];

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-sm border border-stone-200">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-emerald-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Quay lại cửa hàng
        </Link>

        <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xl">
          <Sprout className="w-6 h-6" /> Đăng Nhập Hệ Thống
        </div>
        <p className="text-xs text-stone-500 mt-1">Phân quyền tự động theo 4 vai trò (Admin, Farm Staff, Sales, Customer)</p>

        {/* Nút điền nhanh tài khoản mẫu */}
        <div className="mt-4">
          <div className="text-[11px] font-semibold text-stone-400 uppercase mb-1.5">Chọn nhanh tài khoản test (MK: 123456):</div>
          <div className="grid grid-cols-4 gap-1.5">
            {quickAccounts.map(acc => (
              <button
                key={acc.email}
                type="button"
                onClick={() => { setEmail(acc.email); setMatKhau('123456'); }}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold border ${
                  email === acc.email ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleLogin} className="mt-5 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl font-medium">{error}</div>}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 border rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Mật khẩu</label>
            <input
              type="password"
              required
              value={matKhau}
              onChange={e => setMatKhau(e.target.value)}
              className="w-full px-3.5 py-2.5 border rounded-xl text-sm"
            />
          </div>
          <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-xl font-bold text-sm">
            Đăng nhập
          </button>
        </form>
      </div>
    </div>
  );
}