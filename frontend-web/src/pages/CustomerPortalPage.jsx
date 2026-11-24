import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Package, CalendarClock, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';

export default function CustomerPortalPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const [tab, setTab] = useState('orders'); // 'orders' | 'subscriptions'
  const [myData, setMyData] = useState({ orders: [], subscriptions: [] });
  const [plans, setPlans] = useState([]);

  // Modal khiếu nại 24h (UC-03)
  const [complaintOrder, setComplaintOrder] = useState(null);
  const [complaintForm, setComplaintForm] = useState({
    ly_do: 'Rau củ bị dập nát khi vận chuyển',
    mo_ta: '',
    file_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600',
  });

  // Form đăng ký gói định kỳ (UC-02)
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [subForm, setSubForm] = useState({
    ten_nguoi_nhan: user?.ho_ten || '',
    so_dien_thoai: user?.so_dien_thoai || '',
    dia_chi_chi_tiet: '123 Lê Lợi, Phường Bến Nghé',
    quan_huyen: 'Quận 1',
    khung_gio_nhan: '08:00 - 10:00',
    days_of_week: [2, 5], // Thứ 3 & Thứ 6
  });

  const loadData = () => {
    if (!user) return;
    axios.get(`http://127.0.0.1:8000/api/my-orders/${user.id}`).then(res => setMyData(res.data));
    axios.get('http://127.0.0.1:8000/api/subscription-plans').then(res => {
      setPlans(res.data);
      if (res.data.length > 0 && !selectedPlan) setSelectedPlan(res.data[0]);
    });
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadData();
  }, []);

  const handleMarkDelivered = async (orderId) => {
    const res = await axios.post(`http://127.0.0.1:8000/api/orders/${orderId}/mark-delivered`);
    alert(res.data.message);
    loadData();
  };

  const handleSendComplaint = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/complaints', {
        order_id: complaintOrder.id,
        ...complaintForm,
      });
      alert(res.data.message);
      setComplaintOrder(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể gửi khiếu nại!');
    }
  };

  const toggleDay = (day) => {
    setSubForm(prev => {
      const exists = prev.days_of_week.includes(day);
      const next = exists ? prev.days_of_week.filter(d => d !== day) : [...prev.days_of_week, day];
      return { ...prev, days_of_week: next.length > 0 ? next : [day] };
    });
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/subscriptions', {
        user_id: user.id,
        plan_id: selectedPlan.id,
        ...subForm,
      });
      alert(res.data.message);
      loadData();
      setTab('orders');
    } catch (err) {
      alert(err.response?.data?.message || 'Đăng ký gói thất bại!');
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-12">
      <header className="bg-emerald-900 text-white px-4 py-4 shadow">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 bg-emerald-800 rounded-xl hover:bg-emerald-700">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-extrabold text-base">TÀI KHOẢN KHÁCH HÀNG: {user?.ho_ten}</h1>
              <p className="text-xs text-emerald-200">Điểm tích lũy Loyalty: {user?.diem_tich_luy} điểm</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setTab('orders')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                tab === 'orders' ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-800 text-white'
              }`}
            >
              <Package className="w-4 h-4" /> Đơn hàng & Khiếu nại 24h
            </button>
            <button
              onClick={() => setTab('subscriptions')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                tab === 'subscriptions' ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-800 text-white'
              }`}
            >
              <CalendarClock className="w-4 h-4" /> Gói Rau Định Kỳ 
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-6">
        {/* ================= TAB 1: LỊCH SỬ ĐƠN HÀNG & KHIẾU NẠI 24H (UC-03) ================= */}
        {tab === 'orders' && (
          <div className="space-y-4">
            <h2 className="font-extrabold text-lg text-stone-800">Danh Sách Đơn Hàng (Thường, Đơn Con & Đơn Bù)</h2>

            {myData.orders.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border text-center text-sm text-stone-500">
                Bạn chưa có đơn hàng nào. Hãy đặt hàng ở Trang chủ hoặc đăng ký Gói rau định kỳ!
              </div>
            ) : myData.orders.map(order => (
              <div key={order.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-emerald-800">{order.ma_don_hang}</span>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
                      Loại: {order.loai_don}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      order.trang_thai === 'Đã giao' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {order.trang_thai}
                    </span>
                  </div>
                  <div className="font-extrabold text-sm text-emerald-700">
                    {Number(order.tong_thanh_toan).toLocaleString('vi-VN')}đ
                  </div>
                </div>

                <div className="space-y-1.5">
                  {order.chi_tiet.map(ct => (
                    <div key={ct.id} className="text-xs flex justify-between text-stone-600 bg-stone-50 px-3 py-2 rounded-lg">
                      <span>{ct.ten_san_pham} x <b>{ct.so_luong}</b></span>
                      <span className="font-mono text-stone-400">{ct.ma_lo ? `Lô: ${ct.ma_lo}` : 'Chờ xuất FEFO'}</span>
                    </div>
                  ))}
                </div>

                {/* Hành động: Giả lập nhận hàng / Gửi khiếu nại 24h */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-stone-400">Địa chỉ: {order.dia_chi_giao}</div>

                  <div className="flex items-center gap-2">
                    {order.trang_thai !== 'Đã giao' && (
                      <button
                        onClick={() => handleMarkDelivered(order.id)}
                        className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold"
                      >
                        ✓ Xác nhận đã nhận hàng
                      </button>
                    )}

                    {order.trang_thai === 'Đã giao' && !order.khieu_nai && (
                      <button
                        onClick={() => setComplaintOrder(order)}
                        className="px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1"
                      >
                        <AlertCircle className="w-3.5 h-3.5" /> Khiếu nại / Đổi trả (Trong 24h)
                      </button>
                    )}

                    {order.khieu_nai && (
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                        Trạng thái khiếu nại: {order.khieu_nai.trang_thai}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ================= TAB 2: ĐĂNG KÝ GÓI RAU CỦ ĐỊNH KỲ (UC-02) ================= */}
        {tab === 'subscriptions' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Danh sách gói */}
            <div className="space-y-4">
              <h2 className="font-extrabold text-lg text-stone-800">1. Chọn Gói Rau Củ Định Kỳ</h2>
              {plans.map(plan => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className={`bg-white p-4 rounded-2xl border-2 cursor-pointer transition ${
                    selectedPlan?.id === plan.id ? 'border-emerald-600 shadow-sm' : 'border-stone-200'
                  }`}
                >
                  <div className="flex gap-4">
                    <img src={plan.hinh_anh} alt={plan.ten_goi} className="w-24 h-24 rounded-xl object-cover" />
                    <div className="flex-1">
                      <div className="font-bold text-sm text-stone-800">{plan.ten_goi}</div>
                      <p className="text-xs text-stone-500 mt-1">{plan.mo_ta}</p>
                      <div className="text-sm font-extrabold text-emerald-700 mt-2">
                        {Number(plan.gia_moi_lan_giao).toLocaleString('vi-VN')}đ / mỗi lần giao
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t flex flex-wrap gap-1.5">
                    {plan.san_pham.map(sp => (
                      <span key={sp.id} className="text-[11px] bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full font-medium">
                        {sp.ten_san_pham} ({Number(sp.so_luong)} {sp.don_vi_tinh})
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Form cấu hình lịch giao 30 ngày */}
            {selectedPlan && (
              <form onSubmit={handleSubscribe} className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4 h-fit">
                <h2 className="font-extrabold text-lg text-stone-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" /> 2. Lịch Giao & Thanh Toán Trọn Gói 1 Tháng
                </h2>

                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1.5">Chọn ngày giao cố định trong tuần:</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Thứ 2', val: 1 },
                      { label: 'Thứ 3', val: 2 },
                      { label: 'Thứ 5', val: 4 },
                      { label: 'Thứ 6', val: 5 },
                      { label: 'Thứ 7', val: 6 },
                    ].map(d => (
                      <button
                        type="button"
                        key={d.val}
                        onClick={() => toggleDay(d.val)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                          subForm.days_of_week.includes(d.val)
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : 'bg-stone-50 text-stone-700'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-1">Người nhận</label>
                    <input required value={subForm.ten_nguoi_nhan} onChange={e => setSubForm({ ...subForm, ten_nguoi_nhan: e.target.value })} className="w-full p-2.5 border rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-1">Số điện thoại</label>
                    <input required value={subForm.so_dien_thoai} onChange={e => setSubForm({ ...subForm, so_dien_thoai: e.target.value })} className="w-full p-2.5 border rounded-xl text-xs" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">Địa chỉ giao cố định (Mỗi gói 1 địa chỉ)</label>
                  <input required value={subForm.dia_chi_chi_tiet} onChange={e => setSubForm({ ...subForm, dia_chi_chi_tiet: e.target.value })} className="w-full p-2.5 border rounded-xl text-xs" />
                </div>

                <div className="bg-emerald-50 p-3.5 rounded-xl text-xs text-emerald-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Tự động sinh lịch giao 30 ngày
                  </div>
                  <p>Hệ thống sẽ tự động tạo sẵn các đơn hàng con và chốt kho FEFO lúc 18:00 trước mỗi ngày giao.</p>
                </div>

                <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 rounded-xl font-bold text-sm">
                  Thanh toán trước & Kích hoạt gói định kỳ
                </button>
              </form>
            )}
          </div>
        )}
      </main>

      {/* Modal Gửi Khiếu Nại 24h (UC-03) */}
      {complaintOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={handleSendComplaint} className="bg-white max-w-md w-full rounded-2xl p-6 space-y-4">
            <h3 className="font-extrabold text-base text-red-700">
              Khiếu Nại Đơn Hàng {complaintOrder.ma_don_hang}
            </h3>
            <div>
              <label className="block text-xs font-bold mb-1">Lý do khiếu nại</label>
              <select
                value={complaintForm.ly_do}
                onChange={e => setComplaintForm({ ...complaintForm, ly_do: e.target.value })}
                className="w-full p-2.5 border rounded-xl text-xs"
              >
                <option>Rau củ bị dập nát khi vận chuyển</option>
                <option>Sản phẩm hư hỏng / héo úa</option>
                <option>Giao thiếu số lượng so với đơn đặt</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Mô tả chi tiết tình trạng</label>
              <textarea
                required
                rows="2"
                placeholder="Mô tả sản phẩm bị lỗi..."
                value={complaintForm.mo_ta}
                onChange={e => setComplaintForm({ ...complaintForm, mo_ta: e.target.value })}
                className="w-full p-2.5 border rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Đường dẫn ảnh/video minh chứng (Bắt buộc)</label>
              <input
                required
                value={complaintForm.file_url}
                onChange={e => setComplaintForm({ ...complaintForm, file_url: e.target.value })}
                className="w-full p-2.5 border rounded-xl text-xs"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setComplaintOrder(null)} className="flex-1 py-2.5 border rounded-xl text-xs font-bold">
                Hủy
              </button>
              <button type="submit" className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold">
                Gửi yêu cầu khiếu nại
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}