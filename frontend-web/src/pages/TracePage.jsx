import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, Calendar, UserCheck, FileText, ArrowLeft, Sprout } from 'lucide-react';

export default function TracePage() {
  const { qrToken } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`http://127.0.0.1:8000/api/trace/${qrToken}`)
      .then(res => setData(res.data))
      .catch(() => setError('Mã QR không hợp lệ hoặc lô hàng chưa được công bố.'));
  }, [qrToken]);

  if (error) return <div className="p-8 text-center text-red-600 font-semibold">{error}</div>;
  if (!data) return <div className="p-8 text-center text-emerald-700">Đang tải hồ sơ truy xuất nguồn gốc...</div>;

  const { batch, farming_logs, documents } = data;

  return (
    <div className="min-h-screen bg-stone-50 pb-12">
      <div className="bg-emerald-800 text-white p-4 sticky top-0 z-10 shadow">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1 text-sm hover:underline">
            <ArrowLeft className="w-4 h-4" /> Cửa hàng
          </Link>
          <span className="font-bold tracking-wide text-sm">TRUY XUẤT NGUỒN GỐC QR</span>
          <span className="text-xs bg-emerald-600 px-2 py-1 rounded">{batch.ma_lo}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Thông tin chung của lô */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100">
          <div className="flex gap-4 items-center">
            <img src={batch.hinh_anh_dai_dien} alt={batch.ten_san_pham} className="w-20 h-20 rounded-xl object-cover" />
            <div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" /> Xác thực Single Farm
              </span>
              <h1 className="text-lg font-bold text-stone-800 mt-1">{batch.ten_san_pham}</h1>
              <p className="text-xs text-stone-500 flex items-center gap-1 mt-1">
                <UserCheck className="w-3.5 h-3.5" /> Phụ trách: {batch.nguoi_phu_trach}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t text-center text-xs">
            <div className="bg-stone-50 p-2 rounded-lg">
              <div className="text-stone-400">Gieo hạt</div>
              <div className="font-semibold text-stone-700 mt-0.5">{batch.ngay_gieo_hat}</div>
            </div>
            <div className="bg-emerald-50 p-2 rounded-lg">
              <div className="text-emerald-600">Thu hoạch</div>
              <div className="font-semibold text-emerald-800 mt-0.5">{batch.ngay_thu_hoach}</div>
            </div>
            <div className="bg-amber-50 p-2 rounded-lg">
              <div className="text-amber-600">Hạn sử dụng</div>
              <div className="font-semibold text-amber-800 mt-0.5">{batch.ngay_het_han}</div>
            </div>
          </div>
        </div>

        {/* Giấy tờ kiểm định của lô (Bảng batch_documents) */}
        {documents.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
            <h2 className="font-bold text-stone-800 flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-emerald-600" /> Hồ sơ kiểm định chất lượng
            </h2>
            {documents.map(doc => (
              <a key={doc.id} href={doc.file_url} target="_blank" rel="noreferrer"
                 className="flex items-center justify-between p-3 bg-emerald-50/60 rounded-xl hover:bg-emerald-100 transition">
                <div>
                  <div className="font-semibold text-sm text-emerald-900">{doc.ten_giay_to}</div>
                  <div className="text-xs text-stone-500">Số hiệu: {doc.so_giay_to} • Ngày cấp: {doc.ngay_cap}</div>
                </div>
                <span className="text-xs font-bold text-emerald-700 underline">Xem bản scan</span>
              </a>
            ))}
          </div>
        )}

        {/* Dòng thời gian nhật ký canh tác (Bảng farming_logs) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
          <h2 className="font-bold text-stone-800 flex items-center gap-2 mb-4">
            <Sprout className="w-5 h-5 text-emerald-600" /> Nhật ký canh tác minh bạch
          </h2>
          <div className="space-y-5 border-l-2 border-emerald-200 ml-2 pl-4">
            {farming_logs.map(log => (
              <div key={log.id} className="relative">
                <div className="w-3 h-3 bg-emerald-600 rounded-full absolute -left-[23px] top-1.5 ring-4 ring-white" />
                <div className="text-xs text-stone-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {log.thoi_gian}
                </div>
                <div className="font-bold text-stone-800 text-sm mt-0.5">{log.hanh_dong}</div>
                <p className="text-xs text-stone-600 mt-1">{log.ghi_chu}</p>
                {log.hinh_anh_minh_chung && (
                  <img src={log.hinh_anh_minh_chung} alt={log.hanh_dong} className="mt-2 rounded-xl w-full h-44 object-cover" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}