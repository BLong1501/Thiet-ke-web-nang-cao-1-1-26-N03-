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
import { useInvalidatePendingCounts } from "../../hooks/useAdminPendingCounts";

export default function AdminRefundRequestsTab() {
  const invalidatePendingCounts = useInvalidatePendingCounts();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [receiptDonation, setReceiptDonation] = useState<RecordData | null>(null);
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
      invalidatePendingCounts();
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
                            <button
                              type="button"
                              className="button secondary sm"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                              title="Xem biên lai hoàn tiền & hồ sơ đối soát"
                              onClick={() => setReceiptDonation(donation)}
                            >
                              <LuEye size={14} /> Chi tiết
                            </button>

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

      {receiptDonation && (
        <Modal
          title={`Biên lai Hoàn tiền & Hồ sơ Đối soát #${receiptDonation.transactionCode || receiptDonation.id}`}
          onClose={() => setReceiptDonation(null)}
        >
          <div className="form-stack" style={{ fontSize: "0.95rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--color-surface, #f8fafc)",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid var(--color-border, #e2e8f0)",
              }}
            >
              <div>
                <div style={{ fontSize: "0.85rem", color: "var(--color-muted, #64748b)" }}>Số tiền yêu cầu hoàn</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#dc2626" }}>
                  {formatCurrency(Number(receiptDonation.amount))}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.85rem", color: "var(--color-muted, #64748b)" }}>Trạng thái</div>
                <div>
                  {receiptDonation.refundStatus === "PENDING" && (
                    <span style={{ backgroundColor: "#fef3c7", color: "#92400e", padding: "4px 10px", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600 }}>
                      Chờ duyệt
                    </span>
                  )}
                  {receiptDonation.refundStatus === "APPROVED" && (
                    <span style={{ backgroundColor: "#dcfce7", color: "#166534", padding: "4px 10px", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600 }}>
                      Đã hoàn tiền
                    </span>
                  )}
                  {receiptDonation.refundStatus === "REJECTED" && (
                    <span style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "4px 10px", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600 }}>
                      Đã từ chối
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ border: "1px solid var(--color-border, #e2e8f0)", borderRadius: "8px", padding: "14px" }}>
              <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem", color: "var(--color-primary, #2563eb)", borderBottom: "1px solid var(--color-border, #e2e8f0)", paddingBottom: "6px" }}>
                1. Thông tin Chiến dịch & Giao dịch gốc
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.9rem" }}>
                <div><strong>Mã giao dịch:</strong> {receiptDonation.transactionCode || receiptDonation.id}</div>
                <div><strong>Ngày ủng hộ:</strong> {formatDate(receiptDonation.createdAt)}</div>
                <div style={{ gridColumn: "1 / -1" }}><strong>Chiến dịch:</strong> {receiptDonation.campaign?.title || "N/A"}</div>
              </div>
            </div>

            <div style={{ border: "1px solid var(--color-border, #e2e8f0)", borderRadius: "8px", padding: "14px" }}>
              <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem", color: "var(--color-primary, #2563eb)", borderBottom: "1px solid var(--color-border, #e2e8f0)", paddingBottom: "6px" }}>
                2. Hồ sơ Định danh & Người yêu cầu
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.9rem" }}>
                <div><strong>Họ tên:</strong> {receiptDonation.idCardName || receiptDonation.donorName || receiptDonation.donor?.fullName || "Ẩn danh"}</div>
                <div><strong>Số CCCD:</strong> <span style={{ fontWeight: 700, color: "#1e40af" }}>{receiptDonation.idCardNumber || (receiptDonation.paymentGatewayResponse as any)?.donorIdCard || "Chưa cung cấp"}</span></div>
                <div><strong>Email:</strong> {receiptDonation.donorEmail || receiptDonation.donor?.email || "N/A"}</div>
                <div><strong>Số điện thoại:</strong> {receiptDonation.donorPhone || receiptDonation.donor?.phoneNumber || "N/A"}</div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <strong>Phân loại:</strong> {receiptDonation.donor ? "Thành viên đã có tài khoản" : "Khách vãng lai (Guest - Đã nhập CCCD)"}
                </div>
              </div>
            </div>

            <div style={{ border: "1px solid var(--color-border, #e2e8f0)", borderRadius: "8px", padding: "14px", background: "#f0fdf4" }}>
              <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem", color: "#166534", borderBottom: "1px solid #bbf7d0", paddingBottom: "6px" }}>
                3. Tài khoản Ngân hàng nhận tiền hoàn
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.9rem", color: "#14532d" }}>
                <div><strong>Ngân hàng thụ hưởng:</strong> {receiptDonation.bankName || "Chưa cung cấp"}</div>
                <div><strong>Số tài khoản:</strong> <span style={{ fontWeight: 700, fontSize: "1rem" }}>{receiptDonation.bankAccountNumber || "Chưa cung cấp"}</span></div>
                <div style={{ gridColumn: "1 / -1" }}><strong>Tên chủ tài khoản:</strong> <span style={{ textTransform: "uppercase", fontWeight: 700 }}>{receiptDonation.bankAccountName || "Chưa cung cấp"}</span></div>
              </div>
            </div>

            <div style={{ border: "1px solid var(--color-border, #e2e8f0)", borderRadius: "8px", padding: "14px" }}>
              <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem", color: "var(--color-primary, #2563eb)", borderBottom: "1px solid var(--color-border, #e2e8f0)", paddingBottom: "6px" }}>
                4. Lý do & Nhật ký xét duyệt
              </h4>
              <div style={{ fontSize: "0.9rem" }}>
                <p style={{ margin: "0 0 8px" }}>
                  <strong>Lý do từ người yêu cầu:</strong>{" "}
                  <em>"{receiptDonation.reason || receiptDonation.refundRequest?.reason || "Yêu cầu hoàn trả"}"</em>
                </p>
                <div><strong>Thời gian gửi đơn:</strong> {formatDate(receiptDonation.requestedAt || receiptDonation.createdAt)}</div>
                {receiptDonation.reviewedAt && (
                  <div style={{ marginTop: 4 }}><strong>Thời gian duyệt:</strong> {formatDate(receiptDonation.reviewedAt)}</div>
                )}
                {receiptDonation.rejectionReason && (
                  <div style={{ marginTop: 4, color: "#dc2626" }}>
                    <strong>Lý do từ chối:</strong> {receiptDonation.rejectionReason}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: "1rem" }}>
              <button type="button" className="button secondary" onClick={() => setReceiptDonation(null)}>
                Đóng
              </button>
              {receiptDonation.refundStatus === "PENDING" && (
                <>
                  <button
                    type="button"
                    className="button"
                    style={{ backgroundColor: "#16a34a", borderColor: "#16a34a", color: "#fff" }}
                    onClick={() => {
                      const d = receiptDonation;
                      setReceiptDonation(null);
                      setReviewing({ donation: d, decision: "APPROVE" });
                      setError("");
                    }}
                  >
                    <LuCheck size={16} /> Xác nhận đã hoàn tiền
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    style={{ color: "#dc2626", borderColor: "#fca5a5" }}
                    onClick={() => {
                      const d = receiptDonation;
                      setReceiptDonation(null);
                      setReviewing({ donation: d, decision: "REJECT" });
                      setRejectionReason("");
                      setError("");
                    }}
                  >
                    <LuX size={16} /> Từ chối hoàn
                  </button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
