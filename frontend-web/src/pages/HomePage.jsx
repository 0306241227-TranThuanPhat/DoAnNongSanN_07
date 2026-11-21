import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  ShoppingBag, Search, QrCode, ShieldCheck, Plus, Minus, X,
  CheckCircle2, User, LayoutDashboard, LogOut, Copy, Sparkles
} from 'lucide-react';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [certFilter, setCertFilter] = useState('ALL');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));

  // Form đặt hàng trong giỏ hàng
  const [checkoutForm, setCheckoutForm] = useState({
    ten_nguoi_nhan: user?.ho_ten || '',
    so_dien_thoai_nhan: user?.so_dien_thoai || '',
    dia_chi_giao: '',
  });
  const [orderMessage, setOrderMessage] = useState('');

  const fetchProducts = () => {
    axios.get('http://127.0.0.1:8000/api/products')
      .then(res => setProducts(res.data))
      .catch(err => console.error('Lỗi tải sản phẩm:', err));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const addToCart = (product) => {
    setCart(prev => {
      const exist = prev.find(i => i.id === product.id);
      if (exist) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev
      .map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
      .filter(i => i.quantity > 0)
    );
  };

  const subTotal = cart.reduce((sum, i) => sum + Number(i.gia_hien_tai) * i.quantity, 0);
  const shipFee = subTotal >= 500000 || subTotal === 0 ? 0 : 25000;
  const totalAmount = subTotal + shipFee;

  const handleCheckout = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/orders/checkout', {
        user_id: user?.id || null,
        ten_nguoi_nhan: checkoutForm.ten_nguoi_nhan,
        so_dien_thoai_nhan: checkoutForm.so_dien_thoai_nhan,
        dia_chi_giao: checkoutForm.dia_chi_giao,
        tong_tien_hang: subTotal,
        phi_van_chuyen: shipFee,
        tong_thanh_toan: totalAmount,
        items: cart,
      });
      setOrderMessage(res.data.message);
      setCart([]);
      fetchProducts(); // Cập nhật lại tồn kho sau khi trừ FEFO
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi khi đặt hàng!');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchName = p.ten_san_pham.toLowerCase().includes(search.toLowerCase());
    const matchCert = certFilter === 'ALL' || (p.chung_nhan && p.chung_nhan.includes(certFilter));
    return matchName && matchCert;
  });

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      {/* Topbar */}
      <div className="bg-emerald-900 text-emerald-50 text-xs py-2 text-center font-medium tracking-wide px-4">
        VẬN CHUYỂN HỎA TỐC 0Đ VỚI ĐƠN TỪ 500K • TRUY XUẤT NGUỒN GỐC QR TỪNG LÔ THU HOẠCH
      </div>

      {/* Navbar */}
      <header className="bg-white sticky top-0 z-30 border-b border-stone-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="text-xl font-extrabold text-emerald-800 tracking-tight">
            NÔNG SẢN SẠCH FARM
          </Link>

          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm rau sạch, hạt macca, cà chua..."
              className="w-full pl-4 pr-10 py-2 rounded-full border border-stone-300 text-sm focus:outline-none focus:border-emerald-600"
            />
            <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-2.5" />
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/trace/lot-rau-2026"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100"
            >
              <QrCode className="w-4 h-4" /> Thử Quét QR Lô Hàng
            </Link>

            {user ? (
              <div className="flex items-center gap-2">
                {user.ma_vai_tro !== 'customer' && (
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600"
                  >
                    <LayoutDashboard className="w-4 h-4" /> Quản trị ({user.ma_vai_tro})
                  </Link>
                )}
                <span className="text-xs font-semibold text-stone-700 hidden md:inline">{user.ho_ten}</span>
                <button onClick={handleLogout} title="Đăng xuất" className="p-2 text-stone-500 hover:text-red-600">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-semibold hover:bg-stone-100"
              >
                <User className="w-4 h-4" /> Đăng nhập
              </Link>
            )}

            <button
              onClick={() => { setIsCartOpen(true); setOrderMessage(''); }}
              className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs"
            >
              <ShoppingBag className="w-4 h-4" /> Giỏ hàng ({cart.reduce((s, i) => s + i.quantity, 0)})
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-800 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <span className="inline-block bg-amber-400 text-emerald-950 text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
            Mô hình nông trại khép kín • Thu hoạch trong ngày
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold mt-4 max-w-2xl leading-tight">
            Từ Nông Trại Sạch Đến Bàn Ăn Gia Đình Bạn
          </h1>
          <p className="text-emerald-100 mt-3 max-w-xl text-sm sm:text-base">
            Minh bạch 100% nhật ký gieo trồng, kiểm soát hạn sử dụng theo từng lô FEFO và giao hỏa tốc giữ trọn độ tươi ngon.
          </p>

          {/* Voucher Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            {[
              { title: 'Miễn phí vận chuyển', desc: 'Cho đơn hàng từ 500.000đ', code: 'FREESHIP500' },
              { title: 'Giảm ngay 5%', desc: 'Cho hóa đơn từ 1.000.000đ', code: 'NONGTRAI5' },
              { title: 'Giảm 10% Gói Tuần', desc: 'Khi đăng ký gói rau định kỳ', code: 'COMBO10' },
            ].map(v => (
              <div key={v.code} className="bg-white text-stone-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div>
                  <div className="font-bold text-sm">{v.title}</div>
                  <div className="text-xs text-stone-500">{v.desc}</div>
                  <span className="inline-block mt-1.5 text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                    {v.code}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(v.code)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl"
                >
                  <Copy className="w-3.5 h-3.5" /> {copiedCode === v.code ? 'Đã chép' : 'Sao chép mã'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Grid */}
      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-extrabold text-stone-800">Nông Sản & Đặc Sản Nổi Bật</h2>
          <div className="flex gap-2">
            {[
              { label: 'Tất cả chứng nhận', val: 'ALL' },
              { label: 'VietGAP', val: 'VietGAP' },
              { label: 'USDA Organic', val: 'USDA' },
            ].map(tab => (
              <button
                key={tab.val}
                onClick={() => setCertFilter(tab.val)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                  certFilter === tab.val ? 'bg-emerald-700 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(p => {
            const isFlashSale = Number(p.gia_hien_tai) < Number(p.gia_ban_co_ban);
            return (
              <div key={p.id} className="bg-white rounded-2xl overflow-hidden border border-stone-200/80 shadow-xs hover:shadow-md transition flex flex-col">
                <div className="relative h-52 bg-stone-100">
                  <img src={p.hinh_anh_dai_dien} alt={p.ten_san_pham} className="w-full h-full object-cover" />
                  {isFlashSale && (
                    <span className="absolute top-3 left-3 bg-red-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
                      <Sparkles className="w-3 h-3" /> Xả hàng cận hạn
                    </span>
                  )}
                  {p.chung_nhan && (
                    <span className="absolute top-3 right-3 bg-white/95 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> {p.chung_nhan}
                    </span>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-stone-400 font-mono">{p.ma_sku} • Còn {Number(p.ton_kho_kha_dung)} {p.don_vi_tinh}</div>
                    <h3 className="font-bold text-base text-stone-800 mt-1">{p.ten_san_pham}</h3>
                    <p className="text-xs text-stone-500 mt-1 line-clamp-2">{p.mo_ta}</p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between">
                    <div>
                      <span className="text-lg font-extrabold text-emerald-700">
                        {Number(p.gia_hien_tai).toLocaleString('vi-VN')}đ
                      </span>
                      <span className="text-xs text-stone-400"> / {p.don_vi_tinh}</span>
                      {isFlashSale && (
                        <div className="text-xs text-stone-400 line-through">
                          {Number(p.gia_ban_co_ban).toLocaleString('vi-VN')}đ
                        </div>
                      )}
                    </div>

                    <button
                      disabled={Number(p.ton_kho_kha_dung) <= 0}
                      onClick={() => addToCart(p)}
                      className="bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-300 text-white px-4 py-2 rounded-xl text-xs font-bold transition"
                    >
                      {Number(p.ton_kho_kha_dung) > 0 ? '+ Thêm giỏ' : 'Hết hàng'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Slide-over Cart & Checkout */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col justify-between p-5 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b">
                <h3 className="font-extrabold text-lg">Giỏ hàng & Thanh toán FEFO</h3>
                <button onClick={() => setIsCartOpen(false)} className="p-1.5 rounded-lg hover:bg-stone-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {orderMessage ? (
                <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Đặt hàng thành công!
                  </div>
                  <p className="text-xs leading-relaxed">{orderMessage}</p>
                </div>
              ) : cart.length === 0 ? (
                <p className="text-center text-stone-400 text-sm py-12">Giỏ hàng của bạn đang trống.</p>
              ) : (
                <>
                  <div className="divide-y my-3">
                    {cart.map(item => (
                      <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="font-bold text-sm">{item.ten_san_pham}</div>
                          <div className="text-xs text-emerald-700 font-semibold">
                            {Number(item.gia_hien_tai).toLocaleString('vi-VN')}đ x {item.quantity}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(item.id, -1)} className="p-1 border rounded-lg"><Minus className="w-3 h-3" /></button>
                          <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="p-1 border rounded-lg"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Form giao hàng */}
                  {!user ? (
                    <div className="mt-4 pt-4 border-t">
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
                        <p className="text-xs text-amber-900 font-medium leading-relaxed">
                          Khách vãng lai chỉ được thêm sản phẩm vào giỏ hàng. Vui lòng đăng nhập để hoàn tất thanh toán và tích điểm.
                        </p>
                        <Link
                          to="/login"
                          className="block w-full bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-xl font-bold text-xs"
                        >
                          Đăng nhập ngay để đặt hàng
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleCheckout} className="mt-4 pt-4 border-t space-y-3">
                      <div className="text-xs font-bold uppercase text-stone-500">Thông tin nhận hàng hỏa tốc</div>
                      <input
                        required
                        placeholder="Họ tên người nhận"
                        value={checkoutForm.ten_nguoi_nhan}
                        onChange={e => setCheckoutForm({ ...checkoutForm, ten_nguoi_nhan: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl text-sm"
                      />
                      <input
                        required
                        placeholder="Số điện thoại nhận hàng"
                        value={checkoutForm.so_dien_thoai_nhan}
                        onChange={e => setCheckoutForm({ ...checkoutForm, so_dien_thoai_nhan: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl text-sm"
                      />
                      <input
                        required
                        placeholder="Địa chỉ giao hàng chi tiết"
                        value={checkoutForm.dia_chi_giao}
                        onChange={e => setCheckoutForm({ ...checkoutForm, dia_chi_giao: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl text-sm"
                      />

                      <div className="bg-stone-50 p-3 rounded-xl space-y-1 text-xs">
                        <div className="flex justify-between"><span>Tạm tính:</span><span>{subTotal.toLocaleString('vi-VN')}đ</span></div>
                        <div className="flex justify-between"><span>Phí ship hỏa tốc:</span><span>{shipFee === 0 ? 'Miễn phí' : `${shipFee.toLocaleString('vi-VN')}đ`}</span></div>
                        <div className="flex justify-between font-extrabold text-sm text-emerald-800 pt-1 border-t">
                          <span>Tổng thanh toán:</span><span>{totalAmount.toLocaleString('vi-VN')}đ</span>
                        </div>
                      </div>

                      <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 rounded-xl font-bold text-sm">
                        Xác nhận đặt hàng (Tự động trừ kho FEFO)
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
    </div>
    
  );
  
}