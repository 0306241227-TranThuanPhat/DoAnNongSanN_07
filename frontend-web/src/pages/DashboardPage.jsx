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
  const [complaints, setComplaints] = useState([]);
  const [activeTab, setActiveTab] = useState(
    user?.ma_vai_tro === 'farm_staff' ? 'farm' : user?.ma_vai_tro === 'sales' ? 'sales' : 'admin'
  );
  const [orderFilter, setOrderFilter] = useState('ALL');
  const [selectedQrBatch, setSelectedQrBatch] = useState(null);
const [docBatchId, setDocBatchId] = useState('');
const [docTitle, setDocTitle] = useState('');
const [docFile, setDocFile] = useState(null);
const [uploadingDoc, setUploadingDoc] = useState(false);

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
    axios.get('http://127.0.0.1:8000/api/sales/complaints').then(res => setComplaints(res.data));
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
  const handleUploadDocument = async (e) => {
  e.preventDefault();
  if (!docBatchId || !docFile) {
    alert('Vui lòng chọn lô thu hoạch và tệp giấy kiểm định (PDF/Ảnh)!');
    return;
  }

  const formData = new FormData();
  formData.append('ten_tai_lieu', docTitle || docFile.name);
  formData.append('file', docFile);

  setUploadingDoc(true);
  try {
    const res = await axios.post(
      `http://127.0.0.1:8000/api/farm/batches/${docBatchId}/documents`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    alert(res.data.message);
    setDocTitle('');
    setDocFile(null);
    e.target.reset();
    loadAll();
  } catch (err) {
    alert('Lỗi upload giấy kiểm định: ' + (err.response?.data?.message || err.message));
  } finally {
    setUploadingDoc(false);
  }
};

const handleDownloadQr = async (batch) => {
  const traceUrl = `${window.location.origin}/trace/${batch.qr_code}`;
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(traceUrl)}`;
  const response = await fetch(qrImgUrl);
  const blob = await response.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `QR-${batch.ma_lo}.png`;
  link.click();
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
    const giaGiam = Math.round(Number(giaGoc) * 0.7);
    const res = await axios.post(`http://127.0.0.1:8000/api/sales/flash-sale/${batchId}`, {
      gia_xa_hang: giaGiam,
    });
    alert(res.data.message);
    loadAll();
  };

  const handleResolveComplaint = async (id, action) => {
    try {
      const res = await axios.post(`http://127.0.0.1:8000/api/sales/complaints/${id}/resolve`, {
        action,
        sales_id: user.id,
      });
      alert(res.data.message);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi xử lý khiếu nại!');
    }
  };

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
            <button
  onClick={async () => {
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/scheduler/run-now');
      alert(res.data.message || 'Đã chạy Scheduler thành công!');
      loadAll();
    } catch (err) {
      alert('Lỗi chạy Scheduler: ' + (err.response?.data?.message || err.message));
    }
  }}
  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white"
>
  ▶ Chạy Scheduler 18:00
</button>
          </div>
        </div>
        
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-6 space-y-6">
        {/* ================= PHÂN HỆ 1: FARM STAFF (UC-04 & UC-05) ================= */}
        {activeTab === 'farm' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            {/* Form Upload giấy kiểm định chất lượng (batch_documents) */}
<form onSubmit={handleUploadDocument} className="bg-white p-5 rounded-2xl shadow-xs border space-y-3">
  <h2 className="font-bold text-sm text-emerald-800">
    📄 Đính Kèm Giấy Kiểm Định Chất Lượng Lô (UC-04)
  </h2>
  <select
    value={docBatchId}
    onChange={(e) => setDocBatchId(e.target.value)}
    className="w-full border rounded-xl px-3 py-2 text-xs"
    required
  >
    <option value="">-- Chọn lô thu hoạch --</option>
    {data.batches.map((b) => (
      <option key={b.id} value={b.id}>
        {b.ma_lo} — {b.ten_san_pham} (HSD: {b.ngay_het_han})
      </option>
    ))}
  </select>
  <input
    type="text"
    placeholder="Tên giấy kiểm định (VD: Phiếu xét nghiệm dư lượng VietGAP)"
    value={docTitle}
    onChange={(e) => setDocTitle(e.target.value)}
    className="w-full border rounded-xl px-3 py-2 text-xs"
    required
  />
  <input
    type="file"
    accept=".pdf,.jpg,.jpeg,.png"
    onChange={(e) => setDocFile(e.target.files[0])}
    className="w-full border rounded-xl px-3 py-2 text-xs bg-stone-50"
    required
  />
  <button
    type="submit"
    disabled={uploadingDoc}
    className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
  >
    {uploadingDoc ? 'Đang tải lên...' : 'Tải lên & Gắn vào mã QR'}
  </button>
</form>

{/* Danh sách Lô thu hoạch kèm nút mở ảnh mã QR thật & xem giấy kiểm định */}
<div className="bg-white p-5 rounded-2xl shadow-xs border space-y-3">
  <h2 className="font-bold text-sm text-emerald-800">
    🏷️ Danh Sách Lô Thu Hoạch, Mã QR In Tem & Giấy Kiểm Định
  </h2>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {data.batches.map((b) => (
      <div key={b.id} className="border rounded-xl p-3.5 bg-stone-50/60 flex justify-between items-start gap-3">
        <div className="space-y-1 text-xs">
          <div className="font-bold text-emerald-900">
            {b.ma_lo} • {b.ten_san_pham}
          </div>
          <div className="text-stone-500">
            Thu hoạch: {b.ngay_thu_hoach} | HSD: {b.ngay_het_han} | Tồn: <strong>{b.so_luong_ton}</strong>
          </div>
          {b.documents?.length > 0 && (
            <div className="pt-1 flex flex-wrap gap-1.5">
              {b.documents.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold hover:underline"
                >
                  📎 {doc.ten_tai_lieu || doc.tieu_de || 'Giấy kiểm định'}
                </a>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setSelectedQrBatch(b)}
          className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shrink-0 cursor-pointer"
        >
          Xem / In QR
        </button>
      </div>
    ))}
  </div>
</div>

{/* Popup hiển thị ảnh mã QR thật để tải về in tem */}
{selectedQrBatch && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-3 shadow-xl">
      <h3 className="font-bold text-emerald-900">Tem QR Truy Xuất Nguồn Gốc</h3>
      <p className="text-xs text-stone-600">
        Lô <strong>{selectedQrBatch.ma_lo}</strong> — {selectedQrBatch.ten_san_pham}
      </p>
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
          `${window.location.origin}/trace/${selectedQrBatch.qr_code}`
        )}`}
        alt="QR Code"
        className="mx-auto border p-2 rounded-xl"
      />
      <p className="text-[11px] font-mono text-stone-500 break-all">{selectedQrBatch.qr_code}</p>
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => handleDownloadQr(selectedQrBatch)}
          className="flex-1 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold cursor-pointer"
        >
          ⬇ Tải ảnh PNG in tem
        </button>
        <a
          href={`/trace/${selectedQrBatch.qr_code}`}
          target="_blank"
          rel="noreferrer"
          className="flex-1 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold"
        >
          Mở trang quét thử
        </a>
      </div>
      <button
        type="button"
        onClick={() => setSelectedQrBatch(null)}
        className="w-full py-1.5 text-xs text-stone-500 hover:underline cursor-pointer"
      >
        Đóng
      </button>
    </div>
  </div>
)}
          </div>
          
        )}

        {/* ================= PHÂN HỆ 2: SALES (UC-01 FEFO, UC-03 KHIẾU NẠI & UC-06 FLASH SALE) ================= */}
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

            {/* Danh sách Khiếu nại cần xử lý (UC-03) */}
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-amber-200">
              <h2 className="font-bold text-sm text-red-700 mb-3">Danh Sách Khiếu Nại Cần Xử Lý (UC-03)</h2>
              {complaints.length === 0 ? (
                <p className="text-xs text-stone-400">Chưa có yêu cầu khiếu nại nào.</p>
              ) : (
                <div className="space-y-3">
                  {complaints.map(c => (
                    <div key={c.id} className="p-4 border rounded-xl flex flex-wrap items-center justify-between gap-4 bg-stone-50">
                      <div>
                        <div className="font-bold text-xs">
                          Đơn {c.ma_don_hang} • Khách: {c.ten_khach} • <span className="text-amber-700">{c.trang_thai}</span>
                        </div>
                        <div className="text-xs text-red-700 font-semibold mt-0.5">Lý do: {c.ly_do}</div>
                        <p className="text-xs text-stone-600 mt-0.5">{c.mo_ta}</p>
                        {c.media?.[0] && (
                          <a href={c.media[0].file_url} target="_blank" rel="noreferrer" className="text-[11px] text-emerald-700 underline font-bold mt-1 inline-block">
                            Xem ảnh minh chứng
                          </a>
                        )}
                      </div>

                      {c.trang_thai === 'Chờ xử lý' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleResolveComplaint(c.id, 'Hoàn tiền')} className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold">
                            Duyệt Hoàn tiền
                          </button>
                          <button onClick={() => handleResolveComplaint(c.id, 'Giao bù')} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold">
                            Duyệt Giao bù (FEFO)
                          </button>
                          <button onClick={() => handleResolveComplaint(c.id, 'Từ chối')} className="px-3 py-1.5 bg-stone-300 hover:bg-stone-400 text-stone-800 rounded-xl text-xs font-bold">
                            Từ chối
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          {/* Danh sách Đơn hàng & Truy vết Lô xuất FEFO (UC-01 & UC-02) */}
<div className="bg-white p-5 rounded-2xl shadow-xs border">
  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
    <h2 className="font-bold text-sm flex items-center gap-2">
      <PackageCheck className="w-5 h-5 text-emerald-700" /> Đơn Hàng & Chi Tiết Phân Bổ Lô Xuất Kho FEFO (UC-01 & UC-02)
    </h2>
    <div className="flex flex-wrap gap-1.5 text-xs">
      {[
        { key: 'ALL', label: 'Tất cả' },
        { key: 'READY', label: 'Sẵn sàng giao / Đã xác nhận' },
        { key: 'PENDING', label: 'Chờ giao (Định kỳ)' },
        { key: 'DELIVERED', label: 'Đã giao' },
      ].map((tab) => (
        <button
          key={tab.key}
          onClick={() => setOrderFilter(tab.key)}
          className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
            orderFilter === tab.key
              ? 'bg-emerald-700 text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  </div>

  <div className="space-y-4">
    {data.orders.length === 0 ? (
      <p className="text-xs text-stone-400">Chưa có đơn hàng nào.</p>
    ) : (
      data.orders
        .filter((o) => {
          if (orderFilter === 'READY') return ['Sẵn sàng giao', 'Đã xác nhận'].includes(o.trang_thai);
          if (orderFilter === 'PENDING') return o.trang_thai === 'Chờ giao';
          if (orderFilter === 'DELIVERED') return o.trang_thai === 'Đã giao';
          return true;
        })
        .map((order) => (
          <div key={order.id} className="border rounded-xl p-4 bg-stone-50/50">
            <div className="flex flex-wrap justify-between gap-2 pb-2 border-b">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-bold text-emerald-800 text-sm">{order.ma_don_hang}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    order.loai_don === 'Con'
                      ? 'bg-teal-100 text-teal-800'
                      : order.loai_don === 'Bù'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {order.loai_don === 'Con'
                    ? 'Đơn định kỳ'
                    : order.loai_don === 'Bù'
                    ? 'Đơn giao bù'
                    : 'Đơn lẻ'}
                </span>
                <span className="text-xs text-stone-500">
                  • Khách: {order.ten_nguoi_nhan} ({order.so_dien_thoai_nhan})
                </span>
              </div>
              <div className="text-xs font-bold text-emerald-700">
                {Number(order.tong_thanh_toan).toLocaleString('vi-VN')}đ • {order.trang_thai}
              </div>
            </div>

            <div className="mt-2 space-y-1.5">
              {order.chi_tiet?.map((ct) => (
                <div
                  key={ct.id}
                  className="flex justify-between items-center text-xs bg-white px-3 py-2 rounded-lg border"
                >
                  <span>
                    {ct.ten_san_pham} (SL: <strong>{ct.so_luong}</strong>)
                  </span>
                  <span className="font-semibold text-amber-700">
                    {ct.ma_lo
                      ? `Xuất từ lô: ${ct.ma_lo} (HSD: ${ct.ngay_het_han})`
                      : 'Xuất từ lô: Chờ xuất FEFO'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))
    )}
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