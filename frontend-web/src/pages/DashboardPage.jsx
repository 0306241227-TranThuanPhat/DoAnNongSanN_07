import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  QrCode, AlertTriangle, Trash2, PlusCircle, PackageCheck,
  BarChart3, ArrowLeft, Sprout, Tag
} from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState(
    user?.ma_vai_tro === 'farm_staff' ? 'farm' : user?.ma_vai_tro === 'sales' ? 'sales' : 'admin'
  );

  // Form Farm Staff: Tạo lô mới
  const [batchForm, setBatchForm] = useState({
    product_id: 1,
    ngay_gieo_hat: '2026-10-25',
    ngay_thu_hoach: '2026-11-21',
    ngay_het_han: '2026-11-26',
    so_luong_nhap: 40,
  });

  // Form Farm Staff: Thêm nhật ký canh tác
  const [logForm, setLogForm] = useState({
    batch_id: 1,
    hanh_dong: 'Tưới nước & kiểm tra sâu bệnh',
    ghi_chu: '',
  });

  // Form Farm Staff: Xuất hủy / hao hụt (UC-05)
  const [wasteForm, setWasteForm] = useState({
    batch_id: 1,
    so_luong: 1,
    ly_do: 'Dập nát trong quá trình phân loại',
  });

  const loadAll = () => {
    axios.get('http://127.0.0.1:8000/api/dashboard/overview').then(res => setData(res.data));
    axios.get('http://127.0.0.1:8000/api/products').then(res => setProducts(res.data));
  };

  useEffect(() => {
    if (!user || user.ma_vai_tro === 'customer') {
      navigate('/login');
      return;
    }
    loadAll();
  }, []);

  if (!data) return <div className="p-8 text-center text-emerald-700 font-semibold">Đang tải dữ liệu vận hành...</div>;

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    const res = await axios.post('http://127.0.0.1:8000/api/farm/batches', {
      ...batchForm,
      farm_staff_id: user.id,
    });
    alert(res.data.message);
    loadAll();
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    const res = await axios.post('http://127.0.0.1:8000/api/farm/farming-logs', {
      ...logForm,
      farm_staff_id: user.id,
    });
    alert(res.data.message);
    setLogForm({ ...logForm, ghi_chu: '' });
  };

  const handleCreateWaste = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/farm/waste-records', {
        ...wasteForm,
        nguoi_lap_id: user.id,
      });
      alert(res.data.message);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi lập phiếu xuất hủy!');
    }
  };

  const handleApplyFlashSale = async (batchId, giaGoc) => {
    const giaGiam = Math.round(Number(giaGoc) * 0.7); // Giảm 30% xả hàng cận hạn
    const res = await axios.post(`http://127.0.0.1:8000/api/sales/flash-sale/${batchId}`, {
      gia_xa_hang: giaGiam,
    });
    alert(res.data.message);
    loadAll();
  };

  // Lọc lô cận hạn (còn <= 2 ngày) theo UC-06
  const nearExpiryBatches = data.batches.filter(b => {
    const diffDays = Math.ceil((new Date(b.ngay_het_han) - new Date()) / (1000 * 60 * 60 * 24));
    return Number(b.so_luong_ton) > 0 && diffDays <= 2;
  });

  return (
    <div className="min-h-screen bg-stone-100 text-stone-800 pb-12">
      {/* Header */}
      <header className="bg-emerald-900 text-white px-4 py-4 shadow">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 bg-emerald-800 rounded-xl hover:bg-emerald-700">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-extrabold text-base sm:text-lg">HỆ THỐNG QUẢN TRỊ NÔNG TRẠI (SINGLE FARM)</h1>
              <p className="text-xs text-emerald-200">Tài khoản: {user.ho_ten} • Vai trò: {user.ten_vai_tro}</p>
            </div>
          </div>

          {/* Chuyển phân hệ theo quyền hạn (NFR07) */}
          <div className="flex gap-2">
            {(user.ma_vai_tro === 'admin' || user.ma_vai_tro === 'farm_staff') && (
              <button
                onClick={() => setActiveTab('farm')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold ${activeTab === 'farm' ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-800 text-white'}`}
              >
                Farm Staff (Lô & QR)
              </button>
            )}
            {(user.ma_vai_tro === 'admin' || user.ma_vai_tro === 'sales') && (
              <button
                onClick={() => setActiveTab('sales')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold ${activeTab === 'sales' ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-800 text-white'}`}
              >
                Sales (FEFO & Xả hàng)
              </button>
            )}
            {user.ma_vai_tro === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold ${activeTab === 'admin' ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-800 text-white'}`}
              >
                Admin (Thống kê)
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-6 space-y-6">
        {/* ================= PHÂN HỆ 1: FARM STAFF (UC-04 & UC-05) ================= */}
        {activeTab === 'farm' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form 1: Tạo lô thu hoạch & Sinh QR */}
              <form onSubmit={handleCreateBatch} className="bg-white p-5 rounded-2xl shadow-xs border space-y-3">
                <h2 className="font-bold text-sm flex items-center gap-2 text-emerald-800">
                  <PlusCircle className="w-4 h-4" /> Tạo Lô Thu Hoạch & Sinh QR (UC-04)
                </h2>
                <select
                  value={batchForm.product_id}
                  onChange={e => setBatchForm({ ...batchForm, product_id: e.target.value })}
                  className="w-full p-2 border rounded-xl text-xs"
                >
                  {products.map(p => <option key={p.id} value={p.id}>{p.ten_san_pham}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-stone-500">Ngày thu hoạch</label>
                    <input type="date" value={batchForm.ngay_thu_hoach} onChange={e => setBatchForm({ ...batchForm, ngay_thu_hoach: e.target.value })} className="w-full p-2 border rounded-xl mt-1" />
                  </div>
                  <div>
                    <label className="text-stone-500">Hạn sử dụng</label>
                    <input type="date" value={batchForm.ngay_het_han} onChange={e => setBatchForm({ ...batchForm, ngay_het_han: e.target.value })} className="w-full p-2 border rounded-xl mt-1" />
                  </div>
                </div>
                <input
                  type="number"
                  placeholder="Số lượng nhập kho"
                  value={batchForm.so_luong_nhap}
                  onChange={e => setBatchForm({ ...batchForm, so_luong_nhap: e.target.value })}
                  className="w-full p-2 border rounded-xl text-xs"
                />
                <button type="submit" className="w-full bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold">
                  Lưu lô & Sinh mã QR
                </button>
              </form>

              {/* Form 2: Cập nhật nhật ký canh tác */}
              <form onSubmit={handleAddLog} className="bg-white p-5 rounded-2xl shadow-xs border space-y-3">
                <h2 className="font-bold text-sm flex items-center gap-2 text-emerald-800">
                  <Sprout className="w-4 h-4" /> Cập Nhật Nhật Ký Canh Tác
                </h2>
                <select
                  value={logForm.batch_id}
                  onChange={e => setLogForm({ ...logForm, batch_id: e.target.value })}
                  className="w-full p-2 border rounded-xl text-xs"
                >
                  {data.batches.map(b => <option key={b.id} value={b.id}>{b.ma_lo} - {b.ten_san_pham}</option>)}
                </select>
                <input
                  required
                  placeholder="Hoạt động (VD: Bón phân hữu cơ, Thu hoạch)"
                  value={logForm.hanh_dong}
                  onChange={e => setLogForm({ ...logForm, hanh_dong: e.target.value })}
                  className="w-full p-2 border rounded-xl text-xs"
                />
                <textarea
                  required
                  rows="2"
                  placeholder="Ghi chú chi tiết quá trình chăm sóc..."
                  value={logForm.ghi_chu}
                  onChange={e => setLogForm({ ...logForm, ghi_chu: e.target.value })}
                  className="w-full p-2 border rounded-xl text-xs"
                />
                <button type="submit" className="w-full bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold">
                  Công bố lên Timeline QR
                </button>
              </form>

              {/* Form 3: Ghi nhận xuất hủy / hao hụt (UC-05) */}
              <form onSubmit={handleCreateWaste} className="bg-white p-5 rounded-2xl shadow-xs border space-y-3">
                <h2 className="font-bold text-sm flex items-center gap-2 text-red-700">
                  <Trash2 className="w-4 h-4" /> Ghi Nhận Xuất Hủy / Hao Hụt (UC-05)
                </h2>
                <select
                  value={wasteForm.batch_id}
                  onChange={e => setWasteForm({ ...wasteForm, batch_id: e.target.value })}
                  className="w-full p-2 border rounded-xl text-xs"
                >
                  {data.batches.map(b => (
                    <option key={b.id} value={b.id}>{b.ma_lo} - {b.ten_san_pham} (Tồn: {b.so_luong_ton})</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="Số lượng xuất hủy"
                  value={wasteForm.so_luong}
                  onChange={e => setWasteForm({ ...wasteForm, so_luong: e.target.value })}
                  className="w-full p-2 border rounded-xl text-xs"
                />
                <input
                  required
                  placeholder="Lý do xuất hủy (Bắt buộc)"
                  value={wasteForm.ly_do}
                  onChange={e => setWasteForm({ ...wasteForm, ly_do: e.target.value })}
                  className="w-full p-2 border rounded-xl text-xs"
                />
                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold">
                  Lập phiếu xuất hủy & Trừ tồn lô
                </button>
              </form>
            </div>

            {/* Bảng danh sách Lô hàng & Link QR */}
            <div className="bg-white p-5 rounded-2xl shadow-xs border overflow-x-auto">
              <h3 className="font-bold text-sm mb-3">Danh Sách Lô Nông Sản & Tem Truy Xuất QR</h3>
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 text-stone-500 uppercase">
                  <tr>
                    <th className="p-3">Mã lô</th>
                    <th className="p-3">Sản phẩm</th>
                    <th className="p-3">Thu hoạch</th>
                    <th className="p-3">Hạn sử dụng</th>
                    <th className="p-3">Tồn / Nhập</th>
                    <th className="p-3">Hao hụt</th>
                    <th className="p-3">Truy xuất QR</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.batches.map(b => (
                    <tr key={b.id}>
                      <td className="p-3 font-mono font-bold text-emerald-800">{b.ma_lo}</td>
                      <td className="p-3 font-semibold">{b.ten_san_pham}</td>
                      <td className="p-3">{b.ngay_thu_hoach}</td>
                      <td className="p-3 font-semibold text-amber-700">{b.ngay_het_han}</td>
                      <td className="p-3 font-bold">{b.so_luong_ton} / {b.so_luong_nhap}</td>
                      <td className="p-3 text-red-600">{b.so_luong_hao_hut}</td>
                      <td className="p-3">
                        <Link to={`/trace/${b.qr_code}`} target="_blank" className="inline-flex items-center gap-1 text-emerald-700 font-bold underline">
                          <QrCode className="w-3.5 h-3.5" /> Mở trang QR
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= PHÂN HỆ 2: SALES (UC-01 FEFO & UC-06 FLASH SALE) ================= */}
        {activeTab === 'sales' && (
          <div className="space-y-6">
            {/* Cảnh báo lô cận hạn (UC-06) */}
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <h2 className="font-extrabold text-red-800 text-sm flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" /> Cảnh Báo Lô Cận Hạn (≤ 2 Ngày) — Cần Xả Hàng (UC-06)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                {nearExpiryBatches.map(b => (
                  <div key={b.id} className="bg-white p-4 rounded-xl border border-red-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm">{b.ten_san_pham} ({b.ma_lo})</div>
                      <div className="text-xs text-red-600 font-semibold mt-0.5">
                        HSD: {b.ngay_het_han} • Tồn kho: {b.so_luong_ton}
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        Giá hiện tại: {Number(b.gia_xa_hang || b.gia_ban_co_ban).toLocaleString('vi-VN')}đ
                      </div>
                    </div>
                    <button
                      onClick={() => handleApplyFlashSale(b.id, b.gia_ban_co_ban)}
                      className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl text-xs font-bold"
                    >
                      <Tag className="w-3.5 h-3.5" /> Giảm 30% Flash Sale
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Danh sách Đơn hàng & Truy vết Lô xuất FEFO (UC-01) */}
            <div className="bg-white p-5 rounded-2xl shadow-xs border">
              <h2 className="font-bold text-sm flex items-center gap-2 mb-4">
                <PackageCheck className="w-5 h-5 text-emerald-700" /> Đơn Hàng & Chi Tiết Phân Bổ Lô Xuất Kho FEFO (UC-01)
              </h2>
              <div className="space-y-4">
                {data.orders.length === 0 ? (
                  <p className="text-xs text-stone-400">Chưa có đơn hàng nào. Hãy thử đặt hàng ở Trang chủ để kiểm tra thuật toán FEFO!</p>
                ) : data.orders.map(order => (
                  <div key={order.id} className="border rounded-xl p-4 bg-stone-50/50">
                    <div className="flex flex-wrap justify-between gap-2 pb-2 border-b">
                      <div>
                        <span className="font-mono font-bold text-emerald-800 text-sm">{order.ma_don_hang}</span>
                        <span className="text-xs text-stone-500 ml-2">• Khách: {order.ten_nguoi_nhan} ({order.so_dien_thoai_nhan})</span>
                      </div>
                      <div className="text-xs font-bold text-emerald-700">
                        {Number(order.tong_thanh_toan).toLocaleString('vi-VN')}đ • {order.trang_thai}
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      {order.chi_tiet.map(ct => (
                        <div key={ct.id} className="text-xs flex justify-between bg-white px-3 py-1.5 rounded-lg border">
                          <span>{ct.ten_san_pham} (SL: <b>{ct.so_luong}</b>)</span>
                          <span className="font-mono text-amber-800 font-semibold">
                            Xuất từ lô: {ct.ma_lo} (HSD: {ct.ngay_het_han})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= PHÂN HỆ 3: ADMIN (BÁO CÁO & TỶ LỆ HAO HỤT < 5%) ================= */}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border">
                <div className="text-xs text-stone-400">Tổng doanh thu</div>
                <div className="text-xl font-extrabold text-emerald-700 mt-1">
                  {Number(data.stats.tong_doanh_thu).toLocaleString('vi-VN')}đ
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border">
                <div className="text-xs text-stone-400">Tổng đơn hàng</div>
                <div className="text-xl font-extrabold text-stone-800 mt-1">{data.stats.tong_don_hang} đơn</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border">
                <div className="text-xs text-stone-400">Tồn kho khả dụng</div>
                <div className="text-xl font-extrabold text-stone-800 mt-1">{data.stats.tong_ton_kho} đơn vị</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border">
                <div className="text-xs text-stone-400">Tỷ lệ hao hụt (Mục tiêu &lt; 5%)</div>
                <div className={`text-xl font-extrabold mt-1 ${data.stats.ty_le_hao_hut < 5 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {data.stats.ty_le_hao_hut}%
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border">
              <h2 className="font-bold text-sm flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-emerald-700" /> Nhật Ký Phiếu Xuất Hủy / Hao Hụt Toàn Hệ Thống
              </h2>
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 text-stone-500 uppercase">
                  <tr>
                    <th className="p-3">Mã lô</th>
                    <th className="p-3">Sản phẩm</th>
                    <th className="p-3">Số lượng hủy</th>
                    <th className="p-3">Lý do</th>
                    <th className="p-3">Người lập</th>
                    <th className="p-3">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.waste_records.map(w => (
                    <tr key={w.id}>
                      <td className="p-3 font-mono font-bold">{w.ma_lo}</td>
                      <td className="p-3">{w.ten_san_pham}</td>
                      <td className="p-3 text-red-600 font-bold">-{w.so_luong}</td>
                      <td className="p-3">{w.ly_do}</td>
                      <td className="p-3">{w.nguoi_lap}</td>
                      <td className="p-3 text-stone-400">{w.ngay_tao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}