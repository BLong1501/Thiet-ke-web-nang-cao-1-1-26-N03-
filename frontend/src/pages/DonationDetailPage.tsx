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
export default function DonationDetailPage() {
  const { id } = useParams();
  const user = useAuthStore((s) => s.user);
  const result = useRemote(() => donationApi.getById(id!).then(payload), [id]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const d = result.data;

  // Tự động Polling cập nhật trạng thái khi PENDING
  useEffect(() => {
    if (!d || d.paymentStatus !== "PENDING") return;
    const interval = setInterval(() => {
      result.reload();
    }, 3000);
    return () => clearInterval(interval);
  }, [d?.paymentStatus]);
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
          {d.paymentStatus === "PENDING" && (
            <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
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
                    maxWidth: "240px",
                    width: "100%",
                  }}
                >
                  <img
                    src={`https://img.vietqr.io/image/${encodeURIComponent(d.campaign?.bankName || "Vietcombank")}-${encodeURIComponent(d.campaign?.bankAccountNumber || "123456789")}-compact2.png?amount=${d.amount}&addInfo=${encodeURIComponent(d.transactionCode)}&accountName=${encodeURIComponent(d.campaign?.bankAccountName || "CHỦ CHIẾN DỊCH")}`}
                    alt="VietQR Napas 247"
                    style={{ width: "100%", height: "auto", display: "block", borderRadius: "8px" }}
                  />
                </div>

                <div style={{ fontSize: "0.85rem", color: "#2563eb", fontWeight: 500 }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#22c55e",
                      marginRight: "6px",
                    }}
                  />
                  Hệ thống đang tự động nhận diện giao dịch chuyển khoản (Polling 3s)...
                </div>
              </div>

              <Notice>
                Quét mã VietQR trên bằng app ngân hàng của bạn. Sau khi chuyển tiền thành công,
                hệ thống sẽ tự động cập nhật trạng thái đơn đóng góp này.
              </Notice>

              <button
                type="button"
                className="button secondary"
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
                ⚡ Test: Mô phỏng đã nhận tiền
              </button>
            </div>
          )}
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
          {owner && d.paymentStatus === "SUCCESS" && (
            <form
              className="form-stack no-print"
              onSubmit={(e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                act(`/donations/${id}/refund`, { reason: f.get("reason") });
              }}
            >
              <h3>Yêu cầu hoàn tiền</h3>
              <p>
                Máy chủ chỉ chấp nhận khi chiến dịch đáp ứng điều kiện hoàn
                tiền. Quy trình hiện tại là mô phỏng.
              </p>
              <Field label="Lý do">
                <textarea
                  required
                  name="reason"
                  minLength={3}
                  maxLength={500}
                />
              </Field>
              <button className="button secondary" disabled={busy}>
                Gửi yêu cầu hoàn tiền
              </button>
            </form>
          )}
        </div>
      )}
    </Page>
  );
}
