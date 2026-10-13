import { useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import type { Campaign } from "../../types";
import { donationApi, formatCurrency } from "../../services/api";
import {
  errorMessage,
  httpStatus,
  payload,
  type RecordData,
} from "../../services/platform";
import { useAuthStore } from "../../store/authStore";
import { Field, Modal, Notice, Status } from "./WorkspaceUI";
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
  const location = useLocation();
  const [amount, setAmount] = useState(100000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [donation, setDonation] = useState<RecordData | null>(null);
  /** Giao dịch được tạo khi chưa đăng nhập thì không gắn với tài khoản nào. */
  const [createdAsGuest, setCreatedAsGuest] = useState(false);
  const [lookupDenied, setLookupDenied] = useState<401 | 403 | null>(null);
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
      setDonation(payload(r));
      setCreatedAsGuest(!user);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function check() {
    if (!donation || busy) return;
    setBusy(true);
    setError("");
    setLookupDenied(null);
    try {
      const d = payload(await donationApi.getById(donation.id));
      setDonation(d);
      if (d.paymentStatus === "SUCCESS") onSuccess?.(Number(d.amount));
    } catch (e) {
      const status = httpStatus(e);
      if (status === 401 || status === 403) setLookupDenied(status);
      else setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Gửi một phần sẻ chia"
      onClose={() => {
        if (!busy) onClose();
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
              Bạn chưa đăng nhập. Yêu cầu đóng góp vẫn được tạo, nhưng hiện chỉ
              tài khoản đã đăng nhập mới tra cứu được trạng thái giao dịch của
              mình.{" "}
              <Link
                to="/login"
                state={{ from: location.pathname }}
                onClick={onClose}
              >
                Đăng nhập trước khi đóng góp
              </Link>{" "}
              nếu bạn muốn theo dõi giao dịch trong mục “Đóng góp của tôi”.
            </Notice>
          )}
          <button className="button" disabled={busy}>
            {busy ? "Đang tạo giao dịch…" : "Tạo yêu cầu đóng góp"}
          </button>
        </form>
      ) : (
        <div className="form-stack donation-result">
          <Status value={donation.paymentStatus} />
          <h3 className="num">{formatCurrency(Number(donation.amount))}</h3>
          <p>
            Mã giao dịch: <strong>{donation.transactionCode}</strong>
          </p>
          {donation.paymentStatus === "PENDING" && (
            <>
              <Notice>
                Yêu cầu đã được lưu. Khoản đóng góp chỉ được ghi nhận sau khi
                máy chủ xác nhận thanh toán.
              </Notice>
              <dl className="detail-list donation-transfer">
                <dt>Ngân hàng</dt>
                <dd>{campaign.bankName || "Chưa được cung cấp"}</dd>
                <dt>Số tài khoản</dt>
                <dd>{campaign.bankAccountNumber || "Chưa được cung cấp"}</dd>
                <dt>Chủ tài khoản</dt>
                <dd>{campaign.bankAccountName || "Chưa được cung cấp"}</dd>
                <dt>Nội dung</dt>
                <dd>{donation.transactionCode}</dd>
              </dl>
              <Notice>
                Phiên bản đồ án đang sử dụng quy trình thanh toán mô phỏng.
                Không chuyển tiền thật trong môi trường kiểm thử.
              </Notice>
              {createdAsGuest && (
                <Notice>
                  Hãy lưu lại mã giao dịch{" "}
                  <strong>{donation.transactionCode}</strong> để đối chiếu với
                  người gây quỹ hoặc quản trị viên. Đăng nhập sau khi đóng góp
                  không liên kết giao dịch này với tài khoản của bạn.
                </Notice>
              )}
              {lookupDenied === 401 && createdAsGuest && (
                <Notice>
                  Hệ thống hiện chưa hỗ trợ khách chưa đăng nhập tra cứu trạng
                  thái giao dịch. Trạng thái chỉ thay đổi khi máy chủ xác nhận
                  thanh toán.
                </Notice>
              )}
              {lookupDenied === 401 && !createdAsGuest && (
                <Notice>
                  Phiên đăng nhập đã hết hạn.{" "}
                  <Link
                    to="/login"
                    state={{ from: `/donations/${donation.id}` }}
                    onClick={onClose}
                  >
                    Đăng nhập lại
                  </Link>{" "}
                  để xem trạng thái giao dịch.
                </Notice>
              )}
              {lookupDenied === 403 && (
                <Notice>
                  Tài khoản hiện tại không có quyền xem giao dịch này. Giao dịch
                  tạo khi chưa đăng nhập không gắn với tài khoản nào.
                </Notice>
              )}
              <button className="button" disabled={busy} onClick={check}>
                Kiểm tra trạng thái thanh toán
              </button>
            </>
          )}
          {donation.paymentStatus === "SUCCESS" && (
            <Notice>Cảm ơn bạn. Máy chủ đã xác nhận khoản đóng góp.</Notice>
          )}
          {donation.paymentStatus === "FAILED" && (
            <Notice error>
              Máy chủ chưa ghi nhận thanh toán thành công. Bạn có thể kiểm tra
              lại hoặc liên hệ người gây quỹ với mã giao dịch.
            </Notice>
          )}
          {!lookupDenied && (
            <Link
              className="button secondary"
              to={`/donations/${donation.id}`}
              onClick={onClose}
            >
              Xem chi tiết giao dịch
            </Link>
          )}
        </div>
      )}
    </Modal>
  );
}
