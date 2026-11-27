import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag, Search, QrCode, ShieldCheck, Plus, Minus, X,
  CheckCircle2, User, LayoutDashboard, LogOut, Copy, Sparkles, Loader2
} from 'lucide-react';
import PaymentGatewayModal from '../components/PaymentGatewayModal';
import apiClient from '../utils/apiClient';
import { showToast } from '../components/GlobalUxOverlay';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [certFilter, setCertFilter] = useState('ALL');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));

  // State UX Tuần 06: Spinner kiểm kho, Tính phí ship động & Phương thức thanh toán
  const [loadingProductId, setLoadingProductId] = useState(null);
  const [shippingFee, setShippingFee] = useState(0);
  const [shippingFormula, setShippingFormula] = useState('Nhập địa chỉ để tính phí (5.000đ/km)');
  const [isCalculatingShip, setIsCalculatingShip] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('VNPAY');

  // Form đặt hàng trong giỏ hàng
  const [checkoutForm, setCheckoutForm] = useState({
    ten_nguoi_nhan: user?.ho_ten || '',
    so_dien_thoai_nhan: user?.so_dien_thoai || '',
    dia_chi_giao: '',
  });
  const [orderMessage, setOrderMessage] = useState('');
  const [paymentSession, setPaymentSession] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailQty, setDetailQty] = useState(1);
  const [purchaseMode, setPurchaseMode] = useState('once');

  // Tự động gọi API tính phí vận chuyển theo khoảng cách khi nhập địa chỉ giao hàng
  useEffect(() => {
    const timer = setTimeout(async () => {
      const addr = checkoutForm.dia_chi_giao?.trim();
      if (!addr) {
        setShippingFee(0);
        setShippingFormula('Nhập địa chỉ để tính phí (5.000đ/km)');
        return;
      }
      try {
        setIsCalculatingShip(true);
        const res = await apiClient.post('/shipping/calculate', { dia_chi: addr });
        setShippingFee(res.data.shipping_fee);
        setShippingFormula(res.data.formula);
      } catch (err) {
        console.error('Lỗi tính phí ship:', err);
      } finally {
        setIsCalculatingShip(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [checkoutForm.dia_chi_giao]);

  const fetchProducts = () => {
    apiClient.get('/products')
      .then(res => setProducts(res.data))
      .catch(err => console.error('Lỗi tải sản phẩm:', err));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    setUser(null);
    showToast('Đã đăng xuất khỏi hệ thống!');
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Đã sao chép mã ưu đãi ${code}`);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  // Thêm vào giỏ hàng kèm kiểm tra tồn kho AJAX + Loading Spinner + Toast
  const addToCart = async (product, qtyToAdd = 1) => {
    const exist = cart.find(i => i.id === product.id);
    const nextQty = (exist ? exist.quantity : 0) + qtyToAdd;

    try {
      setLoadingProductId(product.id);
      await apiClient.post('/cart/check-stock', {
        product_id: product.id,
        quantity: nextQty,
      });

      setCart(prev => {
        if (exist) {
          return prev.map(i => i.id === product.id ? { ...i, quantity: nextQty } : i);
        }
        return [...prev, { ...product, quantity: qtyToAdd }];
      });
      showToast(`Đã thêm "${product.ten_san_pham}" vào giỏ hàng!`);
      setIsCartOpen(true);
    } catch (err) {
      showToast(err.response?.data?.message || 'Không đủ tồn kho khả dụng!', 'error');
    } finally {
      setLoadingProductId(null);
    }
  };

  const handleAddFromDetail = async (product, qty) => {
    await addToCart(product, qty);
    setSelectedProduct(null);
  };

  const updateQty = async (id, delta) => {
    const target = cart.find(i => i.id === id);
    if (!target) return;
    const nextQty = target.quantity + delta;

    if (nextQty <= 0) {
      setCart(prev => prev.filter(i => i.id !== id));
      return;
    }

    if (delta > 0) {
      try {
        setLoadingProductId(id);
        await apiClient.post('/cart/check-stock', {
          product_id: id,
          quantity: nextQty,
        });
      } catch (err) {
        showToast(err.response?.data?.message || 'Đã đạt giới hạn tồn kho lô!', 'error');
        return;
      } finally {
        setLoadingProductId(null);
      }
    }

    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: nextQty } : i));
  };

  const subTotal = cart.reduce((sum, i) => sum + Number(i.gia_hien_tai) * i.quantity, 0);
  const finalShipFee = subTotal >= 500000 || subTotal === 0 ? 0 : shippingFee;
  const totalAmount = subTotal + finalShipFee;

  const handleCheckout = (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (paymentMethod === 'COD') {
      handlePaymentSuccess({
        phuong_thuc: 'COD',
        ma_giao_dich_cong: `COD-${Date.now()}`,
      });
      return;
    }

    setPaymentSession({
      type: 'ORDER',
      amount: totalAmount,
      description: `Thanh toán đơn hàng Single Farm (${cart.length} sản phẩm)`,
    });
  };

  const handlePaymentSuccess = async ({ phuong_thuc, ma_giao_dich_cong }) => {
    try {
      const res = await apiClient.post('/orders/checkout', {
        user_id: user?.id || null,
        ten_nguoi_nhan: checkoutForm.ten_nguoi_nhan,
        so_dien_thoai_nhan: checkoutForm.so_dien_thoai_nhan,
        dia_chi_giao: checkoutForm.dia_chi_giao,
        tong_tien_hang: subTotal,
        phi_van_chuyen: finalShipFee,
        tong_thanh_toan: totalAmount,
        phuong_thuc,
        ma_giao_dich_cong,
        items: cart,
      });
      setPaymentSession(null);
      setOrderMessage(`${res.data.message} (Mã GD ${phuong_thuc}: ${ma_giao_dich_cong})`);
      showToast('Đặt hàng & trừ kho FEFO thành công!');
      setCart([]);
      fetchProducts();
    } catch (err) {
      showToast(err.response?.data?.message || 'Có lỗi khi đặt hàng!', 'error');
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
              to="/trace/LO-CBX-01"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100"
            >
              <QrCode className="w-4 h-4" /> Thử Quét QR Lô Hàng
            </Link>

       {user ? (
              <div className="flex items-center gap-2">
                {user.ma_vai_tro === 'customer' ? (
                  <Link
                    to="/my-account"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600"
                  >
                    Đơn hàng & Gói định kỳ
                  </Link>
                ) : (
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
               <div
                  onClick={() => {
                  setSelectedProduct(p);
                  setDetailQty(1);
                  }}
                  title="Bấm để xem chi tiết & truy xuất nguồn gốc"
                  className="relative h-52 bg-stone-100 cursor-pointer group"
                    >
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
  disabled={Number(p.ton_kho_kha_dung) <= 0 || loadingProductId === p.id}
  onClick={() => addToCart(p)}
  className="bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-300 text-white px-4 py-2 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5"
>
  {loadingProductId === p.id ? (
    <>
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang kiểm...
    </>
  ) : Number(p.ton_kho_kha_dung) > 0 ? (
    '+ Thêm giỏ'
  ) : (
    'Hết hàng'
  )}
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

                      {/* Chọn phương thức thanh toán */}
<div className="space-y-1.5">
  <div className="text-[11px] font-bold uppercase text-stone-500">Phương thức thanh toán</div>
  <div className="grid grid-cols-2 gap-2">
    <button
      type="button"
      onClick={() => setPaymentMethod('VNPAY')}
      className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
        paymentMethod === 'VNPAY'
          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
          : 'border-stone-200 text-stone-600'
      }`}
    >
      💳 VNPay / Online
    </button>
    <button
      type="button"
      onClick={() => setPaymentMethod('COD')}
      className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
        paymentMethod === 'COD'
          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
          : 'border-stone-200 text-stone-600'
      }`}
    >
      💵 Tiền mặt (COD)
    </button>
  </div>
</div>

{/* Tổng tiền & Phí vận chuyển động theo km */}
<div className="bg-stone-50 p-3 rounded-xl space-y-1.5 text-xs">
  <div className="flex justify-between">
    <span>Tạm tính:</span>
    <span className="font-semibold">{subTotal.toLocaleString('vi-VN')}đ</span>
  </div>
  <div className="flex justify-between items-center gap-2">
    <span>
      Phí ship{' '}
      <span className="text-[11px] text-emerald-700 font-semibold">
        ({isCalculatingShip ? 'Đang tính km...' : shippingFormula})
      </span>
      :
    </span>
    <span className="font-semibold shrink-0">
      {subTotal >= 500000 ? 'Miễn phí' : `${finalShipFee.toLocaleString('vi-VN')}đ`}
    </span>
  </div>
  <div className="flex justify-between font-extrabold text-sm text-emerald-800 pt-1.5 border-t">
    <span>Tổng thanh toán:</span>
    <span>{totalAmount.toLocaleString('vi-VN')}đ</span>
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
      {/* Modal Xem Chi Tiết Sản Phẩm chuẩn giao diện Single Farm */}
{selectedProduct && (() => {
  const basePrice = Number(selectedProduct.gia_hien_tai || selectedProduct.gia_ban_co_ban || 0);
  const activePrice = purchaseMode === 'sub' ? Math.round(basePrice * 0.88) : basePrice;
  const batch = selectedProduct.lo_uu_tien;
  const daysLeft = batch?.ngay_het_han
    ? Math.max(1, Math.ceil((new Date(batch.ngay_het_han) - new Date()) / (1000 * 60 * 60 * 24)))
    : 4;

  const formatDateVN = (dateStr, fallback) => {
    if (!dateStr) return fallback;
    const parts = String(dateStr).split(' ')[0].split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto"
      onClick={() => setSelectedProduct(null)}
    >
      <div
        className="relative bg-[#F7F8F3] rounded-3xl max-w-5xl w-full p-4 md:p-6 shadow-2xl border border-stone-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng góc phải */}
        <button
          type="button"
          onClick={() => setSelectedProduct(null)}
          title="Đóng"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white hover:bg-stone-100 border border-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center text-sm font-bold shadow-xs cursor-pointer"
        >
          ✕
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* CỘT TRÁI (5/12): Ảnh + Mô tả & Bảng so sánh Siêu thị */}
          <div className="lg:col-span-5 space-y-4">
            {/* Thẻ ảnh & mô tả nền kem */}
            <div className="bg-[#EEF2E6] rounded-2xl overflow-hidden border border-stone-200/80 shadow-xs">
              <div className="relative h-64 bg-stone-200">
                <img
                  src={selectedProduct.hinh_anh_dai_dien}
                  alt={selectedProduct.ten_san_pham}
                  className="w-full h-full object-cover"
                />
                {selectedProduct.chung_nhan && (
                  <span className="absolute top-3 left-3 bg-[#1E5631] text-white text-xs font-bold px-3 py-1 rounded-full shadow flex items-center gap-1">
                    ✓ {selectedProduct.chung_nhan}
                  </span>
                )}
                {batch && (
                  <span className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs text-stone-800 text-[11px] font-bold px-3 py-1 rounded-full shadow border border-stone-200">
                    FEFO Ưu tiên xuất • Lô #{batch.ma_lo}
                  </span>
                )}
              </div>
              <div className="p-4 text-xs text-stone-600 leading-relaxed">
                {selectedProduct.mo_ta ||
                  'Nông sản hữu cơ trồng hoàn toàn trên giá thể sạch tại nhà màng, tưới nước lọc nhỏ giọt. Thu hoạch lúc bình minh và làm mát chân không ngay tại vườn.'}
              </div>
            </div>

            {/* Thẻ Khác biệt Nông Trại Xanh vs Siêu thị */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-4 space-y-2.5 shadow-xs">
              <div className="text-xs font-extrabold text-[#1E5631] flex items-center gap-1.5">
                <span>✨</span> Khác biệt Nông Trại Xanh vs Siêu thị
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="grid grid-cols-12 items-center bg-[#F6F8F2] rounded-xl px-3 py-2 gap-1">
                  <span className="col-span-4 font-semibold text-stone-600">Độ tươi thu hoạch</span>
                  <span className="col-span-4 font-bold text-[#1E5631]">🕒 Thu sáng 05:30</span>
                  <span className="col-span-4 text-right text-stone-400 line-through">Lưu kho 3–5 ngày</span>
                </div>

                <div className="grid grid-cols-12 items-center bg-[#F6F8F2] rounded-xl px-3 py-2 gap-1">
                  <span className="col-span-4 font-semibold text-stone-600">Minh bạch nguồn gốc</span>
                  <span className="col-span-4 font-bold text-[#1E5631]">🔍 Nhật ký QR từng ngày</span>
                  <span className="col-span-4 text-right text-stone-400 line-through">Không rõ vườn trồng</span>
                </div>

                <div className="grid grid-cols-12 items-center bg-[#F6F8F2] rounded-xl px-3 py-2 gap-1">
                  <span className="col-span-4 font-semibold text-stone-600">Quản lý hạn dùng</span>
                  <span className="col-span-4 font-bold text-[#1E5631]">🛡️ FEFO công khai lô</span>
                  <span className="col-span-4 text-right text-stone-400 line-through">Xếp lẫn lô cũ mới</span>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (7/12): Thông tin sản phẩm, Lô FEFO & Mua hàng */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200/80 p-5 md:p-6 space-y-4 shadow-xs">
            {/* Dòng danh mục & đánh giá */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-extrabold uppercase tracking-wider text-[#2E7D32]">
                {selectedProduct.danh_muc || selectedProduct.ma_sku || 'RAU ĂN LÁ'}
              </span>
              <div className="text-stone-500 flex items-center gap-1.5">
                <span className="font-bold text-amber-500">★ 4.9</span>
                <span>• Đã bán 428</span>
                <span>
                  • Tồn lô:{' '}
                  <strong className="text-stone-700">
                    {selectedProduct.ton_kho_kha_dung} {selectedProduct.don_vi_tinh}
                  </strong>
                </span>
              </div>
            </div>

            {/* Tên sản phẩm */}
            <h2 className="text-xl md:text-2xl font-extrabold text-stone-900 leading-tight">
              {selectedProduct.ten_san_pham}
            </h2>

            {/* Giá bán */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-extrabold text-[#1E5631]">
                {activePrice.toLocaleString('vi-VN')}đ
              </span>
              <span className="text-xs text-stone-500">/ {selectedProduct.don_vi_tinh}</span>
              {(purchaseMode === 'sub' || basePrice < Number(selectedProduct.gia_ban_co_ban)) && (
                <span className="text-xs line-through text-stone-400">
                  {Number(selectedProduct.gia_ban_co_ban).toLocaleString('vi-VN')}đ
                </span>
              )}
            </div>

            {/* Khung THÔNG TIN LÔ HÀNG ĐANG BÁN (FEFO) */}
            <div className="bg-[#F1F7F1] border border-emerald-200/90 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-extrabold text-[#1E5631] uppercase tracking-wide flex items-center gap-1.5">
                  <span>🛡️</span> THÔNG TIN LÔ HÀNG ĐANG BÁN (FEFO)
                </div>
                <span className="bg-[#DCEFD8] text-[#1E5631] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                  Tươi mới • Còn {daysLeft} ngày
                </span>
              </div>

              {batch ? (
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-stretch">
                  {/* 4 ô thông số lô */}
                  <div className="sm:col-span-8 grid grid-cols-2 gap-2.5">
                    <div className="bg-white rounded-xl p-2.5 border border-emerald-100">
                      <div className="text-[11px] text-stone-400">Mã lô đang xuất</div>
                      <div className="text-xs font-extrabold text-stone-800 mt-0.5">
                        {batch.ma_lo}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-2.5 border border-emerald-100">
                      <div className="text-[11px] text-stone-400">Ngày & giờ thu hoạch</div>
                      <div className="text-xs font-extrabold text-stone-800 mt-0.5">
                        {formatDateVN(batch.ngay_thu_hoach, '20/11/2026')} • 05:30
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-2.5 border border-emerald-100">
                      <div className="text-[11px] text-stone-400">Hạn sử dụng chuẩn</div>
                      <div className="text-xs font-extrabold text-red-600 mt-0.5">
                        {formatDateVN(batch.ngay_het_han, '24/11/2026')} (4°C - 6°C)
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-2.5 border border-emerald-100">
                      <div className="text-[11px] text-stone-400">Khu vực canh tác</div>
                      <div className="text-xs font-extrabold text-stone-800 mt-0.5">
                        {batch.khu_vuc || 'Nhà màng A2 — Lạc Dương, Đà Lạt'}
                      </div>
                    </div>
                  </div>

                  {/* Khung mã QR & nút Xem phiếu QR */}
                  <div className="sm:col-span-4 bg-white rounded-xl p-2.5 border border-emerald-100 flex flex-col items-center justify-between text-center">
                    <div className="p-1.5 border border-stone-200 rounded-lg bg-white">
                      {/* Biểu tượng QR sắc nét */}
                      <svg viewBox="0 0 36 36" className="w-14 h-14 text-stone-800 fill-current">
                        <path d="M2 2h10v10H2V2zm2 2v6h6V4H4zm2 2h2v2H6V6zm18-4h10v10H24V2zm2 2v6h6V4h-6zm2 2h2v2h-2V6zM2 24h10v10H2V24zm2 2v6h6v-6H4zm2 2h2v2H6v-2zm10-24h2v4h-2V4zm4 2h2v4h-2V6zm-4 6h4v2h-4v-2zm-2 4h6v2h-6v-2zm8 0h2v4h-2v-4zm4 2h4v2h-4v-2zm-12 4h4v2h-4v-2zm6 2h4v4h-4v-4zm6 0h4v2h-4v-2zm-12 4h2v6h-2v-6zm4 2h4v4h-4v-4zm6 2h6v2h-6v-2z" />
                      </svg>
                    </div>
                    <div className="text-[10px] text-stone-500 mt-1">Mã QR Truy Xuất</div>
                    <a
                      href={`/trace/${batch.qr_code}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 w-full py-1.5 px-2 bg-[#1E5631] hover:bg-[#164225] text-white rounded-lg text-[11px] font-bold transition"
                    >
                      Xem phiếu QR
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-stone-500 bg-white rounded-xl p-3 border">
                  Hiện chưa có lô hàng khả dụng cho sản phẩm này.
                </div>
              )}

              {/* Thanh độ tươi 98% */}
              <div className="pt-1 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#1E5631] font-semibold">
                    ✓ 0% dư lượng thuốc BVTV • Đạt chuẩn Vi sinh
                  </span>
                  <span className="font-extrabold text-[#1E5631]">Độ tươi: 98%</span>
                </div>
                <div className="w-full h-1.5 bg-emerald-200/70 rounded-full overflow-hidden">
                  <div className="h-full bg-[#2E7D32] rounded-full w-[98%]" />
                </div>
              </div>
            </div>

            {/* Tab chuyển đổi Mua lẻ 1 lần / Gói định kỳ (-12%) */}
            <div className="grid grid-cols-2 bg-stone-100 p-1 rounded-xl border border-stone-200/80 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPurchaseMode('once')}
                className={`py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  purchaseMode === 'once'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <span>🛒</span> Mua lẻ 1 lần
              </button>
              <button
                type="button"
                onClick={() => setPurchaseMode('sub')}
                className={`py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  purchaseMode === 'sub'
                    ? 'bg-white text-[#1E5631] shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <span>🔄</span> Gói định kỳ (-12%)
              </button>
            </div>

            {/* Hàng chọn số lượng + Thêm vào giỏ + Mua ngay */}
            {Number(selectedProduct.ton_kho_kha_dung) > 0 ? (
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 pt-1">
                {/* Bộ tăng giảm số lượng */}
                <div className="flex items-center border border-stone-200 rounded-xl bg-white overflow-hidden shrink-0">
                  <button
                    type="button"
                    onClick={() => setDetailQty((q) => Math.max(1, q - 1))}
                    className="w-9 h-10 hover:bg-stone-100 font-bold text-stone-600 cursor-pointer"
                  >
                    −
                  </button>
                  <span className="w-9 text-center text-xs font-extrabold text-stone-900">
                    {detailQty}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setDetailQty((q) =>
                        Math.min(Number(selectedProduct.ton_kho_kha_dung), q + 1)
                      )
                    }
                    className="w-9 h-10 hover:bg-stone-100 font-bold text-stone-600 cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {/* Nút Thêm vào giỏ */}
                <button
                  type="button"
                  onClick={() =>
                    handleAddFromDetail(
                      { ...selectedProduct, gia_hien_tai: activePrice },
                      detailQty
                    )
                  }
                  className="flex-1 h-10 px-4 bg-[#76A32E] hover:bg-[#648c25] text-white rounded-xl text-xs font-extrabold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>🛒</span>
                  <span>
                    Thêm vào giỏ • {(activePrice * detailQty).toLocaleString('vi-VN')}đ
                  </span>
                </button>

                {/* Nút Mua ngay */}
                <button
                  type="button"
                  onClick={() => {
                    const instantCart = [
                      { ...selectedProduct, gia_hien_tai: activePrice, quantity: detailQty },
                    ];
                    setCart(instantCart);
                    setSelectedProduct(null);
                    setPaymentSession({
                      type: 'ORDER',
                      amount: activePrice * detailQty,
                      description: `Mua ngay ${selectedProduct.ten_san_pham} (x${detailQty})`,
                    });
                  }}
                  className="h-10 px-5 bg-[#1E5631] hover:bg-[#164225] text-white rounded-xl text-xs font-extrabold shadow-xs transition shrink-0 cursor-pointer"
                >
                  Mua ngay
                </button>
              </div>
            ) : (
              <div className="text-center py-2.5 bg-stone-100 text-stone-500 rounded-xl text-xs font-bold">
                Sản phẩm tạm hết hàng
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
})()}
      <PaymentGatewayModal
  isOpen={!!paymentSession}
  amount={paymentSession?.amount || 0}
  description={paymentSession?.description}
  onSuccess={handlePaymentSuccess}
  onClose={() => {
    alert('Giao dịch đã bị hủy. Đơn hàng chưa được tạo và kho chưa bị trừ.');
    setPaymentSession(null);
  }}
/>
      
    </div>
    
  );
  
  
}