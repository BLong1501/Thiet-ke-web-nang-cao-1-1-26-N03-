import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { api, donationApi, formatCurrency, formatDate } from "../services/api";
import { campaignPath, errorMessage, payload } from "../services/platform";
import { useRemote } from "../hooks/useRemote";
import { useAuthStore } from "../store/authStore";
import {
  Field,
  Notice,
  Page,
  RemoteState,
  Status,
} from "../components/ui/WorkspaceUI";
import toast from "react-hot-toast";
import {
  RiBankCardLine,
  RiWallet3Line,
  RiTimeLine,
  RiLockLine,
  RiRefreshLine,
} from "react-icons/ri";
import {
  FiZap,
  FiLoader,
  FiSmartphone,
} from "react-icons/fi";
import { HiBolt } from "react-icons/hi2";
import { buildVietQrUrl } from "../utils/bankHelper";
export default function DonationDetailPage() {
  const { id } = useParams();
  const user = useAuthStore((s) => s.user);
  const result = useRemote(() => donationApi.getById(id!).then(payload), [id]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"VIETQR" | "MOMO">("VIETQR");
  const [timeLeft, setTimeLeft] = useState<number>(600);

  const d = result.data;

  // Bộ đếm ngược 10 phút
  useEffect(() => {
    if (!d || d.paymentStatus !== "PENDING") return;
    const calcRemaining = () => {
      const createdTime = d.createdAt ? new Date(d.createdAt).getTime() : Date.now();
      const expiresTime = createdTime + 10 * 60 * 1000;
      return Math.max(0, Math.floor((expiresTime - Date.now()) / 1000));
    };

    const initial = calcRemaining();
    setTimeLeft(initial);
    if (initial <= 0) {
      result.reload();
      return;
    }

    const timer = setInterval(() => {
      const rem = calcRemaining();
      setTimeLeft(rem);
      if (rem <= 0) {
        clearInterval(timer);
        result.reload();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [d?.id, d?.createdAt, d?.paymentStatus]);

  const isExpired = d?.paymentStatus === "FAILED" || (d?.paymentStatus === "PENDING" && timeLeft <= 0);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Tự động Polling cập nhật trạng thái khi PENDING và còn hạn
  useEffect(() => {
    if (!d || d.paymentStatus !== "PENDING" || isExpired) return;
    const interval = setInterval(() => {
      result.reload();
    }, 3000);
    return () => clearInterval(interval);
  }, [d?.paymentStatus, isExpired]);
  async function act(path: string, body: object) {
    setBusy(true);
    setError("");
    try {
      await api.post(path, body);
      toast.success("Máy chủ đã cập nhật giao dịch.");
      result.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const admin = user?.role?.toUpperCase() === "ADMIN";
  const owner = !!user && d?.donorId === user.id;
  const denied =
    result.status === 401 || result.status === 403 || result.status === 404
      ? result.status
      : null;
  return (
    <Page
      title="Chi tiết giao dịch"
      actions={
        !denied && (
          <button className="button secondary" onClick={result.reload}>
            Cập nhật trạng thái
          </button>
        )
      }
    >
      {denied === 401 && (
        <Notice>
          Cần đăng nhập để xem giao dịch này. Chi tiết giao dịch chỉ hiển thị
          cho tài khoản đã thực hiện đóng góp, người gây quỹ của chiến dịch hoặc
          quản trị viên. Khoản đóng góp tạo khi chưa đăng nhập hiện chưa thể tra
          cứu trực tuyến; vui lòng giữ lại mã giao dịch để đối chiếu.{" "}
          <Link to="/login" state={{ from: `/donations/${id}` }}>
            Đăng nhập
          </Link>
        </Notice>
      )}
      {denied === 403 && (
        <Notice>
          Tài khoản của bạn không có quyền xem giao dịch này. Khoản đóng góp tạo
          khi chưa đăng nhập không gắn với tài khoản nào.{" "}
          <Link to="/dashboard">Xem đóng góp của tôi</Link>
        </Notice>
      )}
      {denied === 404 && (
        <Notice>
          Không tìm thấy giao dịch. Vui lòng kiểm tra lại đường dẫn.{" "}
          <Link to="/campaigns">Khám phá chiến dịch</Link>
        </Notice>
      )}
      {!denied && <RemoteState {...result} />}
      {error && <Notice error>{error}</Notice>}
      {d && (
        <div className="panel narrow receipt">
          <div className="section-heading">
            <h2>{d.transactionCode}</h2>
            <Status value={d.paymentStatus} />
          </div>
          <h3>{formatCurrency(Number(d.amount))}</h3>
          <p>
            <Link
              to={campaignPath({ id: d.campaignId, slug: d.campaign?.slug })}
            >
              {d.campaign?.title || "Xem chiến dịch"}
            </Link>
          </p>
          <dl className="detail-list">
            <dt>Người đóng góp</dt>
            <dd>
              {d.isAnonymous && !owner && !admin
                ? "Nhà hảo tâm ẩn danh"
                : d.donorName}
            </dd>
            <dt>Ngày tạo</dt>
            <dd>{formatDate(d.createdAt)}</dd>
            <dt>Ngày xác nhận</dt>
            <dd>{d.paidAt ? formatDate(d.paidAt) : "Chưa xác nhận"}</dd>
            <dt>Phương thức</dt>
            <dd>
              {d.paymentMethod === "BANK_TRANSFER"
                ? "Chuyển khoản ngân hàng"
                : d.paymentMethod}
            </dd>
            <dt>Lời nhắn</dt>
            <dd>{d.message || "—"}</dd>
          </dl>
          {/* TRƯỜNG HỢP GIAO DỊCH HẾT HẠN / THẤT BẠI */}
          {isExpired ? (
            <div
              style={{
                marginTop: "1.25rem",
                padding: "16px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "12px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  color: "#b91c1c",
                  fontWeight: 700,
                  fontSize: "1rem",
                }}
              >
                <RiLockLine size={22} /> Giao dịch đã hết hạn & bị khóa (Quá 10 phút)
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.88rem",
                  color: "#991b1b",
                  lineHeight: 1.5,
                }}
              >
                Phiên giao dịch từ thiện này chưa hoàn tất trong 10 phút và đã được hệ thống tự động khóa và đánh dấu hết hiệu lực trong cơ sở dữ liệu. Mã QR và thông tin chuyển khoản phiên này không còn giá trị tiếp nhận.
              </p>
              <div style={{ display: "flex", justifyContent: "center", marginTop: "4px" }}>
                <Link
                  to={campaignPath({ id: d.campaignId, slug: d.campaign?.slug })}
                  className="button"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <RiRefreshLine size={16} /> Ủng hộ lại chiến dịch này
                </Link>
              </div>
            </div>
          ) : d.paymentStatus === "PENDING" && (() => {
            let legalMeta: any = null;
            if (d.campaign?.beneficiaryInfo) {
              try {
                legalMeta = JSON.parse(d.campaign.beneficiaryInfo);
              } catch {
                legalMeta = null;
              }
            }
            const momoPhone = legalMeta?.momoPhone || "0987654321";
            const momoName = legalMeta?.momoAccountName || d.campaign?.bankAccountName || "CHỦ CHIẾN DỊCH";
            const momoQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=2|99|${momoPhone}|${encodeURIComponent(momoName)}||0|0|${d.amount}|${encodeURIComponent(d.transactionCode)}|transfer_p2p`;
            const momoDeepLink = "momo://?action=payWithApp&isScanQR=true";

            const vietQrUrl = buildVietQrUrl({
              bankName: d.campaign?.bankName || "Vietcombank",
              accountNumber: d.campaign?.bankAccountNumber || "123456789",
              accountName: d.campaign?.bankAccountName || "CHỦ CHIẾN DỊCH",
              amount: Number(d.amount),
              transactionCode: d.transactionCode,
            });

            return (
              <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {/* ĐỒNG HỒ ĐẾM NGƯỢC 10 PHÚT */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 14px",
                    background: timeLeft <= 120 ? "#fff1f2" : "#f0fdf4",
                    border: `1px solid ${timeLeft <= 120 ? "#fecdd3" : "#bbf7d0"}`,
                    borderRadius: "10px",
                    fontSize: "0.85rem",
                    color: timeLeft <= 120 ? "#be123c" : "#166534",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <RiTimeLine size={17} />
                    <span>Phiên thanh toán hết hạn sau:</span>
                  </div>
                  <strong style={{ fontFamily: "monospace", fontSize: "1.05rem" }}>
                    {formatCountdown(timeLeft)}
                  </strong>
                </div>

                {/* TAB SWITCHER */}
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
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                    onClick={() => setActiveTab("VIETQR")}
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
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                    onClick={() => setActiveTab("MOMO")}
                  >
                    <RiWallet3Line size={18} /> Ví điện tử MoMo
                  </button>
                </div>

                {/* TAB 1: VIETQR */}
                {activeTab === "VIETQR" && (
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
                      <HiBolt size={16} color="#2563eb" /> VietQR Napas 247 - Quét thanh toán tự động
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
                      }}
                    >
                      <img
                        src={vietQrUrl}
                        alt="VietQR Napas 247"
                        style={{ width: "100%", height: "auto", display: "block", borderRadius: "8px" }}
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: MOMO */}
                {activeTab === "MOMO" && (
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
                      <img
                        src={momoQrUrl}
                        alt="QR Ví MoMo"
                        style={{ width: "100%", height: "auto", display: "block", borderRadius: "8px" }}
                      />
                    </div>

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
                )}

                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#15803d",
                    fontWeight: 500,
                    textAlign: "center",
                    padding: "8px 12px",
                    background: "#f0fdf4",
                    borderRadius: "8px",
                    border: "1px solid #bbf7d0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <FiLoader className="spin" size={15} color="#22c55e" />
                  <span>Hệ thống đang tự động nhận diện giao dịch (Polling 3s)...</span>
                </div>

                <Notice>
                  {activeTab === "VIETQR"
                    ? "Quét mã VietQR trên bằng app ngân hàng của bạn. Sau khi chuyển tiền thành công, hệ thống sẽ tự động cập nhật trạng thái."
                    : `Mở app MoMo quét mã QR trên hoặc chuyển đến SĐT ${momoPhone} với lời nhắn ${d.transactionCode}.`}
                </Notice>
                <button
                  type="button"
                  className="button secondary"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  disabled={busy}
                  onClick={async () => {
                    try {
                      await donationApi.simulateSuccess(d.id);
                      toast.success("Mô phỏng thanh toán thành công!");
                      result.reload();
                    } catch (err) {
                      toast.error(errorMessage(err) || "Không thể mô phỏng");
                    }
                  }}
                >
                  <FiZap size={15} color="#eab308" /> Test: Mô phỏng đã nhận tiền
                </button>
              </div>
            );
          })()}
          {d.paymentStatus === "SUCCESS" && (
            <button
              className="button secondary no-print"
              onClick={() => window.print()}
            >
              In / Lưu PDF xác nhận
            </button>
          )}
          {admin &&
            d.paymentStatus === "PENDING" &&
            !import.meta.env.PROD &&
            import.meta.env.VITE_ENABLE_PAYMENT_DEMO === "true" && (
              <div className="no-print">
                <Notice>
                  Chức năng kiểm thử: xác nhận thanh toán mô phỏng, không phải
                  giao dịch ngân hàng thật.
                </Notice>
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => act(`/donations/${id}/confirm-demo`, {})}
                >
                  Xác nhận mô phỏng (Admin)
                </button>
              </div>
            )}
          {!user && d?.paymentStatus === "SUCCESS" && (
            <div className="no-print" style={{ marginTop: "24px", padding: "18px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "10px" }}>
              <h4 style={{ margin: "0 0 8px", color: "#1e293b", fontSize: "1.05rem" }}>
                🔒 Bạn muốn yêu cầu hoàn tiền cho khoản ủng hộ này?
              </h4>
              <p style={{ margin: "0 0 14px", fontSize: "14px", color: "#475569", lineHeight: 1.5 }}>
                Theo quy định minh bạch tài chính, khách vãng lai cần <strong>Đăng nhập</strong> hoặc <strong>Tạo tài khoản</strong> với số Căn cước công dân (CCCD) đã nhập khi quyên góp. Hệ thống sẽ tự động quét, liên kết khoản đóng góp này vào tài khoản của bạn để bạn có thể gửi yêu cầu hoàn tiền và theo dõi tiến độ duyệt trực tiếp.
              </p>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Link to={`/login?redirect=/donations/${id}`} className="button sm">
                  Đăng nhập ngay
                </Link>
                <Link to={`/register?redirect=/donations/${id}`} className="button secondary sm">
                  Tạo tài khoản mới
                </Link>
              </div>
            </div>
          )}

          {owner && (() => {
            const refundReq = d.paymentGatewayResponse?.refundRequest;
            const isPending = refundReq?.status === "PENDING";
            const isApproved = d.paymentStatus === "REFUNDED" || refundReq?.status === "APPROVED";
            const isRejected = refundReq?.status === "REJECTED";

            if (isPending) {
              return (
                <div className="no-print" style={{ marginTop: "24px", padding: "18px", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "10px" }}>
                  <h4 style={{ margin: "0 0 8px", color: "#92400e" }}>🕒 Đơn yêu cầu hoàn tiền đang chờ Ban Quản trị duyệt</h4>
                  <p style={{ margin: "0 0 12px", fontSize: "14px", color: "#78350f" }}>
                    Bạn đã gửi hồ sơ yêu cầu hoàn trả khoản đóng góp này. Ban Quản trị đang tiến hành xem xét và đối soát sổ cái.
                  </p>
                  <div style={{ background: "rgba(255,255,255,0.7)", padding: "12px", borderRadius: "8px", fontSize: "13px", lineHeight: 1.6, color: "#451a03" }}>
                    <div><strong>Họ tên & CCCD:</strong> {refundReq.idCardName || user?.name || "N/A"} - CCCD: {refundReq.idCardNumber || "N/A"}</div>
                    <div><strong>Tài khoản nhận hoàn:</strong> {refundReq.bankName} - STK: {refundReq.bankAccountNumber} ({refundReq.bankAccountName})</div>
                    <div><strong>Lý do xin hoàn:</strong> <em>"{refundReq.reason}"</em></div>
                  </div>
                </div>
              );
            }

            if (isApproved) {
              return (
                <div className="no-print" style={{ marginTop: "24px", padding: "18px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px" }}>
                  <h4 style={{ margin: "0 0 8px", color: "#166534" }}>✅ Đã hoàn tiền thành công</h4>
                  <p style={{ margin: "0 0 12px", fontSize: "14px", color: "#14532d" }}>
                    Khoản đóng góp này đã được Ban Quản trị phê duyệt hoàn trả vào tài khoản ngân hàng của bạn.
                  </p>
                  <div style={{ background: "rgba(255,255,255,0.7)", padding: "12px", borderRadius: "8px", fontSize: "13px", lineHeight: 1.6, color: "#14532d" }}>
                    <div><strong>Tài khoản nhận:</strong> {refundReq?.bankName} - STK: {refundReq?.bankAccountNumber} ({refundReq?.bankAccountName})</div>
                    <div><strong>Lý do hoàn:</strong> {refundReq?.reason}</div>
                  </div>
                </div>
              );
            }

            return (
              <form
                className="form-stack no-print"
                style={{ marginTop: "28px", padding: "20px", background: "var(--color-surface, #fff)", border: "1px solid var(--color-border, #e2e8f0)", borderRadius: "12px" }}
                onSubmit={(e: FormEvent<HTMLFormElement>) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  act(`/donations/${id}/request-refund`, {
                    reason: f.get("reason"),
                    idCardNumber: f.get("idCardNumber"),
                    idCardName: f.get("idCardName"),
                    bankName: f.get("bankName"),
                    bankAccountNumber: f.get("bankAccountNumber"),
                    bankAccountName: f.get("bankAccountName"),
                  });
                }}
              >
                <div style={{ borderBottom: "1px solid var(--color-border, #e2e8f0)", paddingBottom: "10px", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "1.15rem" }}>Hồ sơ Yêu cầu hoàn tiền</h3>
                  <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--color-muted, #64748b)" }}>
                    Cung cấp số CCCD và thông tin tài khoản ngân hàng chính chủ để Admin đối soát và hoàn tiền trực tiếp cho bạn.
                  </p>
                </div>

                {isRejected && (
                  <Notice error>
                    <strong>Yêu cầu trước đó bị từ chối:</strong> {refundReq.rejectionReason || "Không đủ điều kiện"}. Bạn có thể cập nhật thông tin và gửi lại đơn yêu cầu.
                  </Notice>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <Field label="Họ và tên trên CCCD">
                    <input
                      required
                      name="idCardName"
                      minLength={2}
                      maxLength={100}
                      defaultValue={user?.name || d.donorName || ""}
                      placeholder="NGUYEN VAN A"
                    />
                  </Field>
                  <Field label="Số Căn cước công dân (12 số)">
                    <input
                      required
                      name="idCardNumber"
                      pattern="[0-9]{9,12}"
                      maxLength={12}
                      defaultValue={(d.paymentGatewayResponse as any)?.donorIdCard || ""}
                      placeholder="001201012345"
                    />
                  </Field>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  <Field label="Tên ngân hàng thụ hưởng">
                    <input
                      required
                      name="bankName"
                      placeholder="MB Bank / Vietcombank / ..."
                    />
                  </Field>
                  <Field label="Số tài khoản ngân hàng">
                    <input
                      required
                      name="bankAccountNumber"
                      placeholder="Số tài khoản nhận tiền"
                    />
                  </Field>
                  <Field label="Tên chủ tài khoản">
                    <input
                      required
                      name="bankAccountName"
                      style={{ textTransform: "uppercase" }}
                      defaultValue={user?.name || d.donorName || ""}
                      placeholder="NGUYEN VAN A"
                    />
                  </Field>
                </div>

                <Field label="Lý do yêu cầu hoàn tiền">
                  <textarea
                    required
                    name="reason"
                    minLength={3}
                    maxLength={500}
                    rows={3}
                    placeholder="Nhập lý do chi tiết bạn mong muốn hoàn trả khoản đóng góp này..."
                  />
                </Field>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="button" disabled={busy}>
                    {busy ? "Đang gửi hồ sơ..." : "Gửi yêu cầu hoàn tiền"}
                  </button>
                </div>
              </form>
            );
          })()}
        </div>
      )}
    </Page>
  );
}
