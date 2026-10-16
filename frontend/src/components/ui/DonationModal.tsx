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
import {
  RiBankCardLine,
  RiWallet3Line,
  RiCheckDoubleLine,
  RiLightbulbLine,
} from "react-icons/ri";
import {
  FiCopy,
  FiCheck,
  FiZap,
  FiExternalLink,
  FiLoader,
  FiSmartphone,
} from "react-icons/fi";
import { HiBolt } from "react-icons/hi2";
import {
  buildVietQrUrl,
  buildFallbackQrUrl,
} from "../../utils/bankHelper";

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
  const [activeTab, setActiveTab] = useState<"VIETQR" | "MOMO">("VIETQR");
  const [simulating, setSimulating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [qrLoaded, setQrLoaded] = useState(false);
  const [qrHasError, setQrHasError] = useState(false);
  const request = useRef<{ signature: string; key: string } | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setQrLoaded(false);
    setQrHasError(false);
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

  function copyText(text: string, label: string, key: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Đã sao chép ${label}!`);
    setTimeout(() => {
      setCopiedKey((cur) => (cur === key ? null : cur));
    }, 2000);
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

  // Sinh URL VietQR chuẩn Napas 247
  const vietQrUrl =
    instructions?.bankTransfer?.qrCodeUrl ||
    buildVietQrUrl({
      bankName: bank,
      accountNumber: accNumber,
      accountName: accName,
      amount: transferAmount,
      transactionCode: transferCode,
    });

  const fallbackQrUrl = buildFallbackQrUrl({
    bankName: bank,
    accountNumber: accNumber,
    accountName: accName,
    amount: transferAmount,
    transactionCode: transferCode,
  });

  // Dữ liệu Ví điện tử MoMo
  let legalMeta: any = null;
  if (campaign.beneficiaryInfo) {
    try {
      legalMeta = JSON.parse(campaign.beneficiaryInfo);
    } catch {
      legalMeta = null;
    }
  }
  const momoPhone = instructions?.momo?.phoneNumber || legalMeta?.momoPhone || (campaign as any).fundraiser?.phoneNumber || "0987654321";
  const momoName = instructions?.momo?.accountName || legalMeta?.momoAccountName || accName;
  const momoQrUrl =
    instructions?.momo?.qrCodeUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=2|99|${momoPhone}|${encodeURIComponent(momoName)}||0|0|${transferAmount}|${encodeURIComponent(transferCode)}|transfer_p2p`;
  const momoDeepLink = instructions?.momo?.deepLink || "momo://?action=payWithApp&isScanQR=true";

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
          <button className="button" disabled={busy} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            {busy ? (
              <>
                <FiLoader className="spin" size={16} /> Đang tạo giao dịch…
              </>
            ) : (
              <>
                <RiBankCardLine size={18} /> Tiếp tục quét mã VietQR
              </>
            )}
          </button>
        </form>
      ) : (
        <div className="form-stack donation-result">
          {donation.paymentStatus === "SUCCESS" ? (
            <div
              style={{
                textAlign: "center",
                padding: "2rem 1.5rem",
                background: "#ecfdf5",
                borderRadius: "16px",
                border: "1px solid #a7f3d0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "#d1fae5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#059669",
                }}
              >
                <RiCheckDoubleLine size={38} />
              </div>
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
                style={{ marginTop: "0.5rem" }}
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

              {/* TAB CHUYỂN ĐỔI PHƯƠNG THỨC THANH TOÁN */}
              <div
                style={{
                  display: "flex",
                  borderRadius: "10px",
                  background: "#f1f5f9",
                  padding: "4px",
                  gap: "4px",
                }}
              >
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "none",
                    background: activeTab === "VIETQR" ? "#2563eb" : "transparent",
                    color: activeTab === "VIETQR" ? "#ffffff" : "#475569",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                  onClick={() => {
                    setActiveTab("VIETQR");
                    setQrLoaded(false);
                    setQrHasError(false);
                  }}
                >
                  <RiBankCardLine size={18} /> VietQR Napas 247
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "none",
                    background: activeTab === "MOMO" ? "#d82d8b" : "transparent",
                    color: activeTab === "MOMO" ? "#ffffff" : "#475569",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                  onClick={() => {
                    setActiveTab("MOMO");
                    setQrLoaded(false);
                    setQrHasError(false);
                  }}
                >
                  <RiWallet3Line size={18} /> Ví điện tử MoMo
                </button>
              </div>

              {/* NỘI DUNG TAB 1: VIETQR NAPAS 247 */}
              {activeTab === "VIETQR" && (
                <>
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
                        padding: "5px 14px",
                        borderRadius: "999px",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                      }}
                    >
                      <HiBolt size={16} color="#2563eb" /> VietQR Napas 247 - Mở app ngân hàng quét mã
                    </div>

                    <div
                      style={{
                        background: "#ffffff",
                        padding: "10px",
                        borderRadius: "14px",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                        maxWidth: "260px",
                        width: "100%",
                        minHeight: "260px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                      }}
                    >
                      {!qrLoaded && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                            color: "#64748b",
                            fontSize: "0.8rem",
                          }}
                        >
                          <FiLoader className="spin" size={24} color="#2563eb" />
                          <span>Đang tải mã VietQR...</span>
                        </div>
                      )}
                      <img
                        src={qrHasError ? fallbackQrUrl : vietQrUrl}
                        alt="VietQR Napas 247"
                        style={{
                          width: "100%",
                          height: "auto",
                          display: qrLoaded ? "block" : "none",
                          borderRadius: "8px",
                        }}
                        onLoad={() => setQrLoaded(true)}
                        onError={() => {
                          if (!qrHasError) {
                            setQrHasError(true);
                          } else {
                            setQrLoaded(true);
                          }
                        }}
                      />
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
                          style={{ padding: "4px 8px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          onClick={() => copyText(accNumber, "Số tài khoản", "accNumber")}
                        >
                          {copiedKey === "accNumber" ? <FiCheck size={14} color="#16a34a" /> : <FiCopy size={13} />}
                          <span>{copiedKey === "accNumber" ? "Đã chép" : "Copy"}</span>
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
                          style={{ padding: "4px 8px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          onClick={() => copyText(String(transferAmount), "Số tiền", "amount")}
                        >
                          {copiedKey === "amount" ? <FiCheck size={14} color="#16a34a" /> : <FiCopy size={13} />}
                          <span>{copiedKey === "amount" ? "Đã chép" : "Copy"}</span>
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "#fef3c7",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1px solid #fde68a",
                      }}
                    >
                      <span style={{ color: "#92400e", fontWeight: 600 }}>Nội dung chuyển:</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <strong style={{ color: "#b45309", fontFamily: "monospace", fontSize: "0.95rem" }}>
                          {transferCode}
                        </strong>
                        <button
                          type="button"
                          className="button"
                          style={{
                            padding: "4px 8px",
                            fontSize: "0.75rem",
                            background: "#d97706",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                          onClick={() => copyText(transferCode, "Nội dung chuyển khoản", "transferCode")}
                        >
                          {copiedKey === "transferCode" ? <FiCheck size={14} color="#ffffff" /> : <FiCopy size={13} />}
                          <span>{copiedKey === "transferCode" ? "Đã chép" : "Copy"}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      fontSize: "0.8rem",
                      color: "#64748b",
                    }}
                  >
                    <RiLightbulbLine size={16} color="#eab308" />
                    <span>Khi quét mã VietQR, app ngân hàng (VCB, MB, BIDV, Techcombank...) sẽ tự điền toàn bộ thông tin.</span>
                  </div>
                </>
              )}

              {/* NỘI DUNG TAB 2: VÍ ĐIỆN TỬ MOMO */}
              {activeTab === "MOMO" && (
                <>
                  <div
                    style={{
                      background: "#fdf2f8",
                      border: "2px dashed #f472b6",
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
                        background: "#fce7f3",
                        color: "#be185d",
                        padding: "5px 14px",
                        borderRadius: "999px",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                      }}
                    >
                      <RiWallet3Line size={16} color="#be185d" /> Ví MoMo - Quét mã hoặc bấm Mở App MoMo
                    </div>

                    <div
                      style={{
                        background: "#ffffff",
                        padding: "10px",
                        borderRadius: "14px",
                        boxShadow: "0 4px 12px rgba(216, 45, 139, 0.15)",
                        maxWidth: "260px",
                        width: "100%",
                        minHeight: "260px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {!qrLoaded && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                            color: "#64748b",
                            fontSize: "0.8rem",
                          }}
                        >
                          <FiLoader className="spin" size={24} color="#d82d8b" />
                          <span>Đang tải mã MoMo...</span>
                        </div>
                      )}
                      <img
                        src={momoQrUrl}
                        alt="QR Ví MoMo"
                        style={{
                          width: "100%",
                          height: "auto",
                          display: qrLoaded ? "block" : "none",
                          borderRadius: "8px",
                        }}
                        onLoad={() => setQrLoaded(true)}
                      />
                    </div>

                    {/* NÚT DEEP LINK CHO DI ĐỘNG */}
                    <a
                      href={momoDeepLink}
                      style={{
                        background: "#d82d8b",
                        color: "#ffffff",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        textDecoration: "none",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 2px 4px rgba(216, 45, 139, 0.3)",
                      }}
                    >
                      <FiSmartphone size={16} /> Mở ứng dụng MoMo (Trên điện thoại)
                    </a>
                  </div>

                  {/* BẢNG CHI TIẾT VÍ MOMO */}
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #fbcfe8",
                      borderRadius: "12px",
                      padding: "1rem",
                      fontSize: "0.9rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.6rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#64748b" }}>Số điện thoại MoMo:</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <strong style={{ fontFamily: "monospace", fontSize: "1rem", color: "#d82d8b" }}>
                          {momoPhone}
                        </strong>
                        <button
                          type="button"
                          className="button secondary"
                          style={{ padding: "4px 8px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          onClick={() => copyText(momoPhone, "Số điện thoại MoMo", "momoPhone")}
                        >
                          {copiedKey === "momoPhone" ? <FiCheck size={14} color="#16a34a" /> : <FiCopy size={13} />}
                          <span>{copiedKey === "momoPhone" ? "Đã chép" : "Copy"}</span>
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#64748b" }}>Tên người nhận ví MoMo:</span>
                      <strong style={{ color: "#0f172a" }}>{momoName}</strong>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#64748b" }}>Số tiền:</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <strong style={{ color: "#16a34a", fontSize: "1rem" }}>{formatCurrency(transferAmount)}</strong>
                        <button
                          type="button"
                          className="button secondary"
                          style={{ padding: "4px 8px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          onClick={() => copyText(String(transferAmount), "Số tiền", "momoAmount")}
                        >
                          {copiedKey === "momoAmount" ? <FiCheck size={14} color="#16a34a" /> : <FiCopy size={13} />}
                          <span>{copiedKey === "momoAmount" ? "Đã chép" : "Copy"}</span>
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "#fdf2f8",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1px solid #fbcfe8",
                      }}
                    >
                      <span style={{ color: "#9d174d", fontWeight: 600 }}>Lời nhắn MoMo:</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <strong style={{ color: "#be185d", fontFamily: "monospace", fontSize: "0.95rem" }}>
                          {transferCode}
                        </strong>
                        <button
                          type="button"
                          className="button"
                          style={{
                            padding: "4px 8px",
                            fontSize: "0.75rem",
                            background: "#d82d8b",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                          onClick={() => copyText(transferCode, "Lời nhắn MoMo", "momoCode")}
                        >
                          {copiedKey === "momoCode" ? <FiCheck size={14} color="#ffffff" /> : <FiCopy size={13} />}
                          <span>{copiedKey === "momoCode" ? "Đã chép" : "Copy"}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      fontSize: "0.8rem",
                      color: "#64748b",
                    }}
                  >
                    <RiLightbulbLine size={16} color="#eab308" />
                    <span>Mở MoMo quét mã QR sẽ tự động điền người nhận, số tiền và lời nhắn chuyển khoản.</span>
                  </div>
                </>
              )}

              {/* NÚT XÁC NHẬN HOÀN TẤT GIAO DỊCH */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  className="button"
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    background: "#16a34a",
                    borderColor: "#15803d",
                    color: "#ffffff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 2px 4px rgba(22, 163, 74, 0.25)",
                    cursor: "pointer",
                  }}
                  disabled={simulating}
                  onClick={handleSimulate}
                >
                  {simulating ? (
                    <>
                      <FiLoader className="spin" size={16} /> Đang xác nhận giao dịch...
                    </>
                  ) : (
                    <>
                      <FiZap size={16} /> Tôi đã chuyển tiền thành công - Hoàn tất giao dịch
                    </>
                  )}
                </button>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Link
                    to={`/donations/${donation.id}`}
                    onClick={onClose}
                    style={{
                      fontSize: "0.82rem",
                      color: "#64748b",
                      textDecoration: "underline",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <FiExternalLink size={13} /> Xem trang biên nhận đơn
                  </Link>
                </div>
              </div>

              {/* TỰ ĐỘNG NHẬN DIỆN TRẠNG THÁI (POLLING 2.5s) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontSize: "0.82rem",
                  color: "#15803d",
                  fontWeight: 500,
                  padding: "6px 12px",
                  background: "#f0fdf4",
                  borderRadius: "8px",
                  border: "1px solid #bbf7d0",
                }}
              >
                <FiLoader className="spin" size={14} color="#22c55e" />
                <span>Hệ thống đang tự động lắng nghe chuyển tiền (Polling 2.5s)...</span>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
