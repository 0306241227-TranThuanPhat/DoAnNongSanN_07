import { useState } from 'react';
import { ShieldCheck, QrCode, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function PaymentGatewayModal({
  isOpen,
  amount = 0,
  description = 'Thanh toán đơn hàng Single Farm',
  defaultMethod = 'VNPay',
  onSuccess,
  onClose,
}) {
  const [method, setMethod] = useState(defaultMethod);
  const [processing, setProcessing] = useState(false);

  if (!isOpen) return null;

  const txnRef = `${method === 'MoMo' ? 'MOMO' : 'VNP'}${Date.now().toString().slice(-8)}`;
  const qrPayload = `SINGLEFARM|${method}|${txnRef}|AMOUNT:${amount}|${description}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPayload)}`;

  const handleConfirmPay = () => {
    setProcessing(true);
    // Giả lập độ trễ xác thực 1.2 giây từ cổng thanh toán Sandbox
    setTimeout(() => {
      setProcessing(false);
      onSuccess({
        phuong_thuc: method,
        ma_giao_dich_cong: txnRef,
      });
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border">
        {/* Header theo thương hiệu cổng thanh toán */}
        <div
          className={`p-4 text-white flex items-center justify-between ${
            method === 'MoMo' ? 'bg-pink-700' : 'bg-blue-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-sm">
                Cổng Thanh Toán {method === 'MoMo' ? 'MoMo E-Wallet' : 'VNPAY-QR'} (Sandbox)
              </h3>
              <p className="text-[11px] opacity-85">Môi trường kiểm thử giao dịch trực tuyến</p>
            </div>
          </div>
          <span className="text-[11px] font-mono bg-white/20 px-2 py-0.5 rounded">
            #{txnRef}
          </span>
        </div>

        {/* Chọn phương thức VNPay / MoMo */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMethod('VNPay')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer transition ${
                method === 'VNPay'
                  ? 'border-blue-700 bg-blue-50 text-blue-800'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              🏦 VNPAY-QR / Thẻ ATM
            </button>
            <button
              type="button"
              onClick={() => setMethod('MoMo')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer transition ${
                method === 'MoMo'
                  ? 'border-pink-600 bg-pink-50 text-pink-700'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              📱 Ví điện tử MoMo
            </button>
          </div>

          {/* Thông tin số tiền & QR */}
          <div className="bg-stone-50 border rounded-xl p-4 text-center space-y-2">
            <p className="text-xs text-stone-500">{description}</p>
            <div className="text-2xl font-extrabold text-emerald-700">
              {Number(amount).toLocaleString('vi-VN')}đ
            </div>
            <div className="flex justify-center py-2">
              <div className="p-2 bg-white rounded-xl border shadow-xs">
                <img src={qrUrl} alt="Sandbox QR" className="w-40 h-40" />
              </div>
            </div>
            <p className="text-[11px] text-stone-500 flex items-center justify-center gap-1">
              <QrCode className="w-3.5 h-3.5" /> Quét mã hoặc bấm nút xác nhận bên dưới để giả lập kết quả
            </p>
          </div>

          {/* Nút giả lập kết quả giao dịch */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={processing}
              onClick={handleConfirmPay}
              className={`w-full py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
                method === 'MoMo'
                  ? 'bg-pink-600 hover:bg-pink-700'
                  : 'bg-blue-700 hover:bg-blue-800'
              } disabled:opacity-60`}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Đang xác thực giao dịch...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Xác nhận Thanh toán Thành công
                </>
              )}
            </button>

            <button
              type="button"
              disabled={processing}
              onClick={onClose}
              className="w-full py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5 text-red-500" /> Hủy giao dịch (Giả lập thất bại)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}