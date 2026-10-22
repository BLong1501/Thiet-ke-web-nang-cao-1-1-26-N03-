import { useState } from "react";
import { Link } from "react-router-dom";
import { LuCheck, LuX, LuRotateCw, LuEye } from "react-icons/lu";
import { donationApi, formatCurrency, formatDate } from "../../services/api";
import { listResult, errorMessage, type RecordData } from "../../services/platform";
import { useRemote } from "../../hooks/useRemote";
import {
  Empty,
  Field,
  Modal,
  Notice,
  Pager,
  RemoteState,
} from "../ui/WorkspaceUI";
import toast from "react-hot-toast";

export default function AdminRefundRequestsTab() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [reviewing, setReviewing] = useState<{
    donation: RecordData;
    decision: "APPROVE" | "REJECT";
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const result = useRemote(
    () =>
      donationApi
        .getAdminRefundRequests({
          page,
          limit: 15,
          status: statusFilter === "ALL" ? undefined : statusFilter,
        })
        .then(listResult),
    [page, statusFilter],
    { keepPrevious: true }
  );

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewing || busy) return;

    if (reviewing.decision === "REJECT" && !rejectionReason.trim()) {
      setError("Vui lòng nhập lý do từ chối hoàn tiền.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await donationApi.reviewRefund(reviewing.donation.id, {
        decision: reviewing.decision,
        rejectionReason:
          reviewing.decision === "REJECT" ? rejectionReason.trim() : undefined,
      });

      toast.success(
        reviewing.decision === "APPROVE"
          ? "Đã xác nhận hoàn tiền thành công. Sổ cái kế toán và tài khoản người dùng đã được cập nhật."
          : "Đã từ chối đơn hoàn tiền kèm lý do."
      );
      setReviewing(null);
      setRejectionReason("");
      result.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const items = result.data?.items || [];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontSize: "0.9rem", fontWeight: 600 }}>
            Lọc trạng thái đơn:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{ padding: "6px 12px", borderRadius: "6px" }}
          >
            <option value="PENDING">Chờ duyệt (Đơn mới)</option>
            <option value="APPROVED">Đã hoàn tiền thành công</option>
            <option value="REJECTED">Đã từ chối hoàn tiền</option>
            <option value="ALL">Tất cả đơn hoàn tiền</option>
          </select>
        </div>

        <button
          className="button secondary sm"
          onClick={() => result.reload()}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <LuRotateCw size={15} /> Làm mới
        </button>
      </div>

      <RemoteState {...result} />

      {result.data && (
        <>
          {items.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Mã GD / Ngày gửi</th>
                    <th>Nhà hảo tâm</th>
                    <th>Chiến dịch</th>
                    <th>Số tiền hoàn</th>
                    <th>Lý do yêu cầu</th>
                    <th>Trạng thái đơn</th>
                    <th style={{ textAlign: "right" }}>Nghiệp vụ Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((donation) => {
                    const req = donation.refundRequest;
                    const reqStatus = req?.status || (donation.paymentStatus === "REFUNDED" ? "APPROVED" : "PENDING");

                    return (
                      <tr key={donation.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            <Link to={`/donations/${donation.id}`} target="_blank">
                              #{donation.transactionCode || donation.id.slice(0, 8)}
                            </Link>
                          </div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--color-muted)",
                              marginTop: 2,
                            }}
                          >
                            {formatDate(req?.requestedAt || donation.createdAt)}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {donation.donor?.fullName || "Ẩn danh"}
                          </div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--color-muted)",
                            }}
                          >
                            {donation.donor?.email}
                          </div>
                        </td>

                        <td>
                          <div style={{ maxWidth: 220, fontSize: "0.9rem" }}>
                            <Link
                              to={`/campaigns/${donation.campaign?.slug || donation.campaignId}`}
                              target="_blank"
                            >
                              {donation.campaign?.title || donation.campaignId}
                            </Link>
                          </div>
                        </td>

                        <td>
                          <strong style={{ color: "#b91c1c" }}>
                            {formatCurrency(Number(donation.amount))}
                          </strong>
                        </td>

                        <td>
                          <div
                            style={{
                              maxWidth: 240,
                              fontSize: "0.85rem",
                              whiteSpace: "pre-wrap",
                              backgroundColor: "var(--color-surface)",
                              padding: "6px 10px",
                              borderRadius: "6px",
                              border: "1px solid var(--color-border)",
                            }}
                          >
                            {req?.reason || "Nhà hảo tâm yêu cầu hoàn tiền"}
                          </div>
                          {req?.status === "REJECTED" && req?.rejectionReason && (
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: "0.8rem",
                                color: "#dc2626",
                              }}
                            >
                              <strong>Lý do từ chối:</strong> {req.rejectionReason}
                            </div>
                          )}
                        </td>

                        <td>
                          {reqStatus === "PENDING" && (
                            <span
                              style={{
                                display: "inline-block",
                                backgroundColor: "#fef3c7",
                                color: "#92400e",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontSize: "0.8rem",
                                fontWeight: 600,
                              }}
                            >
                              Chờ Admin duyệt
                            </span>
                          )}
                          {reqStatus === "APPROVED" && (
                            <span
                              style={{
                                display: "inline-block",
                                backgroundColor: "#dcfce7",
                                color: "#166534",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontSize: "0.8rem",
                                fontWeight: 600,
                              }}
                            >
                              Đã hoàn tiền
                            </span>
                          )}
                          {reqStatus === "REJECTED" && (
                            <span
                              style={{
                                display: "inline-block",
                                backgroundColor: "#fee2e2",
                                color: "#991b1b",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontSize: "0.8rem",
                                fontWeight: 600,
                              }}
                            >
                              Đã từ chối hoàn
                            </span>
                          )}
                        </td>

                        <td style={{ textAlign: "right" }}>
                          <div
                            style={{
                              display: "inline-flex",
                              gap: 6,
                              justifyContent: "flex-end",
                            }}
                          >
                            <Link
                              to={`/donations/${donation.id}`}
                              target="_blank"
                              className="button secondary sm"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                              title="Xem chi tiết giao dịch"
                            >
                              <LuEye size={14} /> Chi tiết
                            </Link>

                            {reqStatus === "PENDING" && (
                              <>
                                <button
                                  className="button sm"
                                  style={{
                                    backgroundColor: "#16a34a",
                                    borderColor: "#16a34a",
                                    color: "#fff",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    fontWeight: 600,
                                  }}
                                  onClick={() => {
                                    setReviewing({
                                      donation,
                                      decision: "APPROVE",
                                    });
                                    setError("");
                                  }}
                                >
                                  <LuCheck size={14} /> Đã hoàn
                                </button>
                                <button
                                  className="button secondary sm"
                                  style={{
                                    color: "#dc2626",
                                    borderColor: "#fca5a5",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    fontWeight: 600,
                                  }}
                                  onClick={() => {
                                    setReviewing({
                                      donation,
                                      decision: "REJECT",
                                    });
                                    setRejectionReason("");
                                    setError("");
                                  }}
                                >
                                  <LuX size={14} /> Từ chối hoàn
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>
              {statusFilter === "PENDING"
                ? "Không có đơn hoàn tiền nào đang chờ duyệt."
                : statusFilter === "APPROVED"
                ? "Chưa có đơn hoàn tiền thành công nào."
                : statusFilter === "REJECTED"
                ? "Không có đơn nào bị từ chối."
                : "Không có đơn yêu cầu hoàn tiền nào."}
            </Empty>
          )}

          <Pager page={page} pages={result.data.pages} onChange={setPage} />
        </>
      )}

      {reviewing && (
        <Modal
          title={
            reviewing.decision === "APPROVE"
              ? "Xác nhận duyệt hoàn tiền thành công"
              : "Từ chối yêu cầu hoàn tiền"
          }
          onClose={() => {
            if (!busy) setReviewing(null);
          }}
        >
          <form className="form-stack" onSubmit={handleReviewSubmit}>
            <div>
              <p>
                <strong>Mã giao dịch:</strong> #
                {reviewing.donation.transactionCode || reviewing.donation.id}
              </p>
              <p>
                <strong>Nhà hảo tâm:</strong>{" "}
                {reviewing.donation.donor?.fullName || "Ẩn danh"} (
                {reviewing.donation.donor?.email})
              </p>
              <p>
                <strong>Số tiền hoàn:</strong>{" "}
                <span style={{ color: "#dc2626", fontWeight: 700, fontSize: "1.1rem" }}>
                  {formatCurrency(Number(reviewing.donation.amount))}
                </span>
              </p>
              <p>
                <strong>Lý do từ người dùng:</strong>{" "}
                <em>{reviewing.donation.refundRequest?.reason || "Không ghi rõ"}</em>
              </p>
            </div>

            {error && <Notice error>{error}</Notice>}

            {reviewing.decision === "APPROVE" ? (
              <Notice>
                Khi xác nhận <strong>"Đã hoàn"</strong>, hệ thống sẽ tự động:
                <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
                  <li>Tạo bút toán sổ cái loại <code>REFUND</code> để đối soát kế toán.</li>
                  <li>Trừ tương ứng số tiền quỹ của chiến dịch.</li>
                  <li>Cập nhật trạng thái giao dịch sang <code>Đã hoàn tiền</code>.</li>
                  <li>Lưu vết vào Log giao dịch của cả Quản trị viên và Nhà hảo tâm.</li>
                </ul>
              </Notice>
            ) : (
              <Field label="Lý do từ chối hoàn tiền (Bắt buộc)">
                <textarea
                  required
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Nhập lý do chi tiết từ chối yêu cầu hoàn tiền để phản hồi tới nhà hảo tâm..."
                  minLength={5}
                  maxLength={500}
                />
              </Field>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: "1.25rem",
              }}
            >
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setReviewing(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="button"
                style={{
                  backgroundColor:
                    reviewing.decision === "APPROVE" ? "#16a34a" : "#dc2626",
                  borderColor:
                    reviewing.decision === "APPROVE" ? "#16a34a" : "#dc2626",
                  color: "#fff",
                }}
                disabled={busy}
              >
                {reviewing.decision === "APPROVE"
                  ? "Xác nhận đã hoàn tiền"
                  : "Xác nhận từ chối"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
