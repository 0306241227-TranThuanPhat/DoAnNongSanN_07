import React, { useState } from 'react';
import { ShoppingBag, Search, Copy, Check, QrCode, X, Plus, Minus, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const VOUCHERS = [
  { code: 'FREESHIP500', title: 'Miễn phí vận chuyển', desc: 'Cho đơn hàng từ 500.000đ' },
  { code: 'NONGTRẠI5', title: 'Giảm ngay 5%', desc: 'Cho hóa đơn từ 1.000.000đ' },
  { code: 'COMBO10', title: 'Giảm 10% Gói Tuần', desc: 'Khi đăng ký gói rau định kỳ' },
];

const SAMPLE_PRODUCTS = [
  {
    id: 1,
    name: 'Cà Phê Robusta Rang Xay Nguyên Chất Đắk Lắk (500g)',
    category: 'Nông sản & Hạt',
    price: 225000,
    originalPrice: 250000,
    cert: 'VietGAP',
    qrToken: 'lot-robusta-2026',
    image: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 2,
    name: 'Hạt Macca Sấy Nứt Vỏ Đắk Lắk Loại 1 (500g)',
    category: 'Hạt dinh dưỡng',
    price: 194000,
    originalPrice: 220000,
    cert: 'USDA Organic',
    qrToken: 'lot-macca-2026',
    image: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 3,
    name: 'Combo Rau Ăn Lá Hữu Cơ Thu Hoạch Sáng Nay (3kg)',
    category: 'Rau củ tươi',
    price: 145000,
    originalPrice: 175000,
    cert: 'VietGAP',
    qrToken: 'lot-rau-2026',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 4,
    name: 'Bột Cacao Nguyên Chất Tây Nguyên Không Đường (250g)',
    category: 'Nông sản & Hạt',
    price: 109000,
    originalPrice: null,
    cert: 'VietGAP',
    qrToken: 'lot-cacao-2026',
    image: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=600&q=80',
  },
];

export default function HomePage() {
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');
  const [selectedCert, setSelectedCert] = useState('ALL');

  const handleCopyVoucher = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0)
    );
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const filteredProducts =
    selectedCert === 'ALL'
      ? SAMPLE_PRODUCTS
      : SAMPLE_PRODUCTS.filter((p) => p.cert === selectedCert);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      {/* 1. Top Bar Khuyến mãi giống nongsansachdaklak.com */}
      <div className="bg-emerald-800 text-white text-xs sm:text-sm py-2 px-4 text-center font-medium">
        VẬN CHUYỂN HỎA TỐC 0Đ VỚI ĐƠN TỪ 500K • TRUY XUẤT NGUỒN GỐC QR TỪNG LÔ THU HOẠCH
      </div>

      {/* 2. Header & Thanh điều hướng */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-700 tracking-tight">
              NÔNG SẢN SẠCH FARM
            </span>
          </div>

          <div className="hidden md:flex flex-1 max-w-md relative">
            <input
              type="text"
              placeholder="Tìm rau sạch, hạt macca, cà phê Đắk Lắk..."
              className="w-full border border-stone-300 rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-emerald-600"
            />
            <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-2.5" />
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/trace/lot-rau-2026"
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg hover:bg-emerald-100"
            >
              <QrCode className="w-4 h-4" />
              Thử Quét QR Lô Hàng
            </Link>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-800"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Giỏ hàng ({cart.reduce((s, i) => s + i.qty, 0)})</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. Hero Banner */}
      <section className="bg-gradient-to-r from-emerald-900 to-emerald-700 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="inline-block bg-amber-400 text-emerald-950 text-xs font-bold px-3 py-1 rounded-full mb-3">
              MÔ HÌNH NÔNG TRẠI KHÉP KÍN • THU HOẠCH TRONG NGÀY
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">
              Từ Nông Trại Sạch Đến Bàn Ăn Gia Đình Bạn
            </h1>
            <p className="text-emerald-100 text-sm sm:text-base mb-6">
              Minh bạch 100% nhật ký gieo trồng, kiểm soát hạn sử dụng theo từng lô FEFO và giao hỏa tốc giữ trọn độ tươi ngon.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Khối Ưu đãi của bạn (Sao chép mã giảm giá) */}
      <section className="max-w-7xl mx-auto px-4 -mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {VOUCHERS.map((v) => (
            <div
              key={v.code}
              className="bg-white border-l-4 border-amber-500 rounded-lg shadow-sm p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-bold text-stone-800 text-sm">{v.title}</p>
                <p className="text-xs text-stone-500 mt-0.5">{v.desc}</p>
                <span className="inline-block mt-2 text-xs font-mono bg-stone-100 px-2 py-0.5 rounded text-emerald-800 font-semibold">
                  {v.code}
                </span>
              </div>
              <button
                onClick={() => handleCopyVoucher(v.code)}
                className="flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-2 rounded-md hover:bg-emerald-100"
              >
                {copiedCode === v.code ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode === v.code ? 'Đã chép' : 'Sao chép mã'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Danh sách sản phẩm & Bộ lọc chứng nhận */}
      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-stone-800">Nông Sản & Đặc Sản Nổi Bật</h2>
          <div className="flex gap-2">
            {['ALL', 'VietGAP', 'USDA Organic'].map((cert) => (
              <button
                key={cert}
                onClick={() => setSelectedCert(cert)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  selectedCert === cert
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-stone-600 border-stone-300'
                }`}
              >
                {cert === 'ALL' ? 'Tất cả chứng nhận' : cert}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const discountPercent = product.originalPrice
              ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
              : 0;

            return (
              <div
                key={product.id}
                className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col"
              >
                <div className="relative h-52 bg-stone-100">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  {discountPercent > 0 && (
                    <span className="absolute top-2.5 left-2.5 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                      -{discountPercent}%
                    </span>
                  )}
                  <span className="absolute top-2.5 right-2.5 bg-white/95 text-emerald-800 text-xs font-semibold px-2 py-1 rounded flex items-center gap-1 shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {product.cert}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-stone-400 mb-1">{product.category}</p>
                    <h3 className="font-semibold text-stone-800 text-sm line-clamp-2 mb-2">
                      {product.name}
                    </h3>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-lg font-bold text-emerald-700">
                        {product.price.toLocaleString('vi-VN')}₫
                      </span>
                      {product.originalPrice && (
                        <span className="text-xs text-stone-400 line-through">
                          {product.originalPrice.toLocaleString('vi-VN')}₫
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => addToCart(product)}
                        className="flex-1 bg-emerald-700 text-white py-2 rounded-lg text-xs font-semibold hover:bg-emerald-800 transition"
                      >
                        Chọn mua
                      </button>
                      <Link
                        to={`/trace/${product.qrToken}`}
                        title="Xem nhật ký canh tác lô này"
                        className="px-3 py-2 border border-emerald-700 text-emerald-700 rounded-lg hover:bg-emerald-50 flex items-center justify-center"
                      >
                        <QrCode className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* 6. Ngăn kéo Giỏ hàng trượt (Cart Drawer) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-xl">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-lg">Giỏ hàng của bạn</h3>
              <button onClick={() => setIsCartOpen(false)} className="p-1 text-stone-500 hover:text-stone-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <p className="text-center text-stone-400 text-sm py-12">Hiện chưa có sản phẩm nào trong giỏ.</p>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex gap-3 border-b pb-3">
                    <img src={item.image} alt={item.name} className="w-16 h-16 rounded object-cover" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-stone-800 line-clamp-1">{item.name}</p>
                      <p className="text-sm font-bold text-emerald-700 mt-1">
                        {(item.price * item.qty).toLocaleString('vi-VN')}₫
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => updateQty(item.id, -1)} className="p-1 border rounded">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-semibold px-2">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="p-1 border rounded">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t bg-stone-50">
              <div className="flex justify-between font-bold text-base mb-4">
                <span>TỔNG TIỀN:</span>
                <span className="text-emerald-700">{totalAmount.toLocaleString('vi-VN')}₫</span>
              </div>
              <button
                disabled={cart.length === 0}
                onClick={() => alert('Chuyển sang trang thanh toán VNPay / MoMo / COD!')}
                className="w-full bg-emerald-700 text-white py-3 rounded-lg font-semibold text-sm hover:bg-emerald-800 disabled:opacity-50"
              >
                Tiến hành Thanh toán
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}