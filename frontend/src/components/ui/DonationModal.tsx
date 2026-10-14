import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { Campaign } from "../../types";
import { donationApi, formatCurrency } from "../../services/api";
import {
  errorMessage,
  payload,
  type RecordData,
} from "../../services/platform";
import { useAuthStore } from "../../store/authStore";
import { Field, Modal, Notice, Status } from "./WorkspaceUI";
import toast from "react-hot-toast";

export default function DonationModal({
  campaign,
  onClose,
  onSuccess,
}: {
  campaign: Campaign;
  onClose: () => void;
  onSuccess?: (amount: number) => void;
}) {
  const user = useAuthStore((s) => s.user);
  const [amount, setAmount] = useState(100000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [donation, setDonation] = useState<RecordData | null>(null);
  const [instructions, setInstructions] = useState<RecordData | null>(null);
  const [simulating, setSimulating] = useState(false);
  const request = useRef<{ signature: string; key: string } | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const body = {
      campaignId: campaign.id,
      amount,
      donorName: String(f.get("name") || "").trim() || undefined,
      donorEmail: String(f.get("email") || "").trim() || undefined,
      message: String(f.get("message") || "").trim(),
      isAnonymous: f.get("anonymous") === "on",
      paymentMethod: "BANK_TRANSFER",
    };
    const signature = JSON.stringify(body);
    if (request.current?.signature !== signature)
      request.current = { signature, key: crypto.randomUUID() };
    try {
      const r = await donationApi.create({
        ...body,
        requestKey: request.current.key,
      });
      const data = payload(r);
      const actualDonation = data?.donation || data;
      const actualInstructions = data?.paymentInstructions || null;
      setDonation(actualDonation);
      setInstructions(actualInstructions);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  // Tự động Polling kiểm tra trạng thái thanh toán từ Ngân hàng mỗi 2.5 giây
  useEffect(() => {
    if (!donation || donation.paymentStatus !== "PENDING") return;
    const interval = setInterval(async () => {
      try {
        const res = await donationApi.getStatus(donation.id);
        const data = payload(res);
        if (data && data.paymentStatus === "SUCCESS") {
          setDonation((prev) => ({ ...prev, ...data, paymentStatus: "SUCCESS" }));
          onSuccess?.(Number(data.amount));
          toast.success("Thanh toán thành công! Hệ thống đã ghi nhận khoản đóng góp.");
        } else if (data && data.paymentStatus === "FAILED") {
          setDonation((prev) => ({ ...prev, ...data, paymentStatus: "FAILED" }));
        }
      } catch {
        // bỏ qua lỗi gián đoạn mạng khi polling
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [donation?.id, donation?.paymentStatus, onSuccess]);

  function copyText(text: string, label: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}!`);
  }

  async function handleSimulate() {
    if (!donation || simulating) return;
    setSimulating(true);
    try {
      const res = await donationApi.simulateSuccess(donation.id);
      const data = payload(res);
      setDonation((prev) => ({ ...prev, ...data, paymentStatus: "SUCCESS" }));
      onSuccess?.(Number(donation.amount));
      toast.success("Mô phỏng thanh toán thành công!");
    } catch (err) {
      toast.error(errorMessage(err) || "Không thể mô phỏng xác nhận");
    } finally {
      setSimulating(false);
    }
  }

  // Lấy dữ liệu VietQR từ instructions hoặc từ thông tin chiến dịch
  const bank = instructions?.bankTransfer?.bankName || campaign.bankName || "Vietcombank";
  const accNumber = instructions?.bankTransfer?.accountNumber || campaign.bankAccountNumber || "123456789";
  const accName = instructions?.bankTransfer?.accountName || campaign.bankAccountName || "CHỦ CHIẾN DỊCH";
  const transferCode = donation?.transactionCode || "";
  const transferAmount = Number(donation?.amount || amount);

  const vietQrUrl =
    instructions?.bankTransfer?.qrCodeUrl ||
    `https://img.vietqr.io/image/${encodeURIComponent(bank)}-${encodeURIComponent(accNumber)}-compact2.png?amount=${transferAmount}&addInfo=${encodeURIComponent(transferCode)}&accountName=${encodeURIComponent(accName)}`;

  return (
    <Modal
      title="Gửi một phần sẻ chia"
      onClose={() => {
        if (!busy && !simulating) onClose();
      }}
    >
      <p className="donation-campaign">{campaign.title}</p>
      {error && <Notice error>{error}</Notice>}
      {!donation ? (
        <form className="form-stack" onSubmit={submit}>
          <div className="amount-options">
            {[50000, 100000, 200000, 500000].map((n) => (
              <button
                key={n}
                type="button"
                className={amount === n ? "button" : "button secondary"}
                aria-pressed={amount === n}
                onClick={() => setAmount(n)}
              >
                {formatCurrency(n)}
              </button>
            ))}
          </div>
          <Field label="Số tiền đóng góp (VND)">
            <input
              type="number"
              required
              min={10000}
              max={1000000000}
              step={1}
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </Field>
          <Field label="Họ tên (không bắt buộc)">
            <input
              name="name"
              minLength={2}
              maxLength={150}
              defaultValue={user?.name || ""}
            />
          </Field>
          <Field label="Email (không bắt buộc)">
            <input name="email" type="email" defaultValue={user?.email || ""} />
          </Field>
          <Field label="Lời nhắn">
            <textarea name="message" rows={3} maxLength={500} />
          </Field>
          <label className="check">
            <input type="checkbox" name="anonymous" />
            Ẩn tên trên danh sách đóng góp công khai
          </label>
          {!user && (
            <Notice>
              Bạn đang đóng góp dưới tư cách Khách vãng lai. Hệ thống vẫn tự động
              ghi nhận mã QR và cập nhật số tiền ngay khi chuyển khoản thành công.
            </Notice>
          )}
          <button className="button" disabled={busy}>
            {busy ? "Đang tạo giao dịch…" : "Tiếp tục quét mã VietQR"}
          </button>
        </form>
      ) : (
        <div className="form-stack donation-result">
          {donation.paymentStatus === "SUCCESS" ? (
            <div
              style={{
                textAlign: "center",
                padding: "1.5rem",
                background: "#ecfdf5",
                borderRadius: "12px",
                border: "1px solid #a7f3d0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span style={{ fontSize: "3rem" }}>🎉</span>
              <h3 style={{ color: "#065f46", margin: 0, fontSize: "1.35rem" }}>
                Thanh toán thành công!
              </h3>
              <p style={{ color: "#047857", margin: 0 }}>
                Hệ thống đã nhận được <strong>{formatCurrency(transferAmount)}</strong>{" "}
                đóng góp vào chiến dịch.
              </p>
              <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                Mã giao dịch: <strong>{donation.transactionCode}</strong>
              </p>
              <button
                type="button"
                className="button"
                style={{ marginTop: "0.75rem" }}
                onClick={onClose}
              >
                Hoàn tất & Đóng
              </button>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Status value={donation.paymentStatus} />
                <h3 className="num" style={{ margin: 0 }}>
                  {formatCurrency(transferAmount)}
                </h3>
              </div>

              {/* KHUNG MÃ VIETQR CHUẨN NAPAS 247 */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "2px dashed #cbd5e1",
                  borderRadius: "16px",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.75rem",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    padding: "4px 12px",
                    borderRadius: "999px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                >
                  ⚡ VietQR Napas 247 - Quét thanh toán tự động
                </div>

                <div
                  style={{
                    background: "#ffffff",
                    padding: "8px",
                    borderRadius: "12px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    maxWidth: "260px",
                    width: "100%",
                  }}
                >
                  <img
                    src={vietQrUrl}
                    alt="VietQR Napas 247"
                    style={{
                      width: "100%",
                      height: "auto",
                      display: "block",
                      borderRadius: "8px",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "0.85rem",
                    color: "#2563eb",
                    fontWeight: 500,
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      background: "#22c55e",
                      boxShadow: "0 0 0 3px rgba(34, 197, 94, 0.2)",
                    }}
                  />
                  Hệ thống đang tự động nhận diện chuyển khoản (Polling 2.5s)...
                </div>
              </div>

              {/* BẢNG CHI TIẾT THÔNG TIN CHUYỂN KHOẢN KÈM NÚT COPY */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "1rem",
                  fontSize: "0.9rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b" }}>Ngân hàng thụ hưởng:</span>
                  <strong style={{ color: "#0f172a" }}>{bank}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b" }}>Số tài khoản:</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <strong style={{ fontFamily: "monospace", fontSize: "1rem" }}>{accNumber}</strong>
                    <button
                      type="button"
                      className="button secondary"
                      style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                      onClick={() => copyText(accNumber, "Số tài khoản")}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b" }}>Tên chủ tài khoản:</span>
                  <strong style={{ color: "#0f172a" }}>{accName}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b" }}>Số tiền:</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <strong style={{ color: "#16a34a", fontSize: "1rem" }}>{formatCurrency(transferAmount)}</strong>
                    <button
                      type="button"
                      className="button secondary"
                      style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                      onClick={() => copyText(String(transferAmount), "Số tiền")}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "#fef3c7",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    border: "1px solid #fde68a",
                  }}
                >
                  <span style={{ color: "#92400e", fontWeight: 600 }}>Nội dung chuyển:</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <strong style={{ color: "#b45309", fontFamily: "monospace", fontSize: "1rem" }}>
                      {transferCode}
                    </strong>
                    <button
                      type="button"
                      className="button"
                      style={{ padding: "2px 8px", fontSize: "0.75rem", background: "#d97706" }}
                      onClick={() => copyText(transferCode, "Nội dung chuyển khoản")}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0, textAlign: "center" }}>
                💡 <em>Khi quét mã VietQR, app ngân hàng sẽ tự động điền toàn bộ thông tin trên.</em>
              </p>

              {/* NÚT MÔ PHỎNG KIỂM THỬ NHANH DÀNH CHO BẢO VỆ ĐỒ ÁN */}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  className="button secondary"
                  style={{ flex: 1, fontSize: "0.85rem" }}
                  disabled={simulating}
                  onClick={handleSimulate}
                >
                  {simulating ? "Đang xác nhận..." : "⚡ Test: Mô phỏng đã nhận tiền"}
                </button>
                <Link
                  className="button secondary"
                  to={`/donations/${donation.id}`}
                  onClick={onClose}
                  style={{ fontSize: "0.85rem" }}
                >
                  Chi tiết đơn
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
