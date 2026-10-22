import { useState } from "react";
import { Link } from "react-router-dom";
import { donationApi, formatCurrency, formatDate } from "../services/api";
import { listResult } from "../services/platform";
import { useRemote } from "../hooks/useRemote";
import { Empty, Pager, RemoteState } from "./ui/WorkspaceUI";
import { FiClock, FiCheckCircle, FiAlertCircle } from "react-icons/fi";

export default function MyRefundRequests() {
  const [page, setPage] = useState(1);
  const result = useRemote(
    () => donationApi.getMyRefundRequests({ page, limit: 10 }).then(listResult),
    [page],
    { keepPrevious: true }
  );

  return (
    <>
      <div className="actions" style={{ justifyContent: "space-between", marginBottom: "16px" }}>
        <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
          Theo dõi tiến độ xét duyệt các đơn đề nghị hoàn tiền cho các khoản quyên góp của bạn.
        </p>
        <button className="button secondary" onClick={result.reload} style={{ fontSize: "13px" }}>
          Làm mới danh sách
        </button>
      </div>

      <RemoteState {...result} />

      {result.data && (
        result.data.items.length ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Giao dịch / Chiến dịch</th>
                    <th>Số tiền</th>
                    <th>Lý do gửi</th>
                    <th>Trạng thái đơn</th>
                    <th>Thời gian</th>
                    <th>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.items.map((r: any) => {
                    const isPending = r.refundStatus === "PENDING";
                    const isApproved = r.refundStatus === "APPROVED";
                    const isRejected = r.refundStatus === "REJECTED";

                    return (
                      <tr key={r.id}>
                        <td>
                          <strong>{r.campaign?.title || "Chiến dịch"}</strong>
                          <small style={{ display: "block", color: "#64748b", fontFamily: "monospace" }}>
                            {r.transactionCode}
                          </small>
                        </td>
                        <td>
                          <strong style={{ color: "#0f766e" }}>{formatCurrency(Number(r.amount))}</strong>
                        </td>
                        <td style={{ maxWidth: "250px" }}>
                          <span style={{ fontSize: "13px", color: "#334155" }}>{r.reason}</span>
                          {isRejected && r.rejectionReason && (
                            <div style={{ marginTop: "4px", fontSize: "12px", color: "#b91c1c", background: "#fef2f2", padding: "4px 8px", borderRadius: "6px" }}>
                              <strong>Lý do từ chối:</strong> {r.rejectionReason}
                            </div>
                          )}
                        </td>
                        <td>
                          {isPending && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#fef3c7", color: "#92400e", padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600 }}>
                              <FiClock size={13} /> Đã gửi đơn (Chờ duyệt)
                            </span>
                          )}
                          {isApproved && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#dcfce7", color: "#166534", padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600 }}>
                              <FiCheckCircle size={13} /> Đã hoàn tiền thành công
                            </span>
                          )}
                          {isRejected && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#fee2e2", color: "#991b1b", padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600 }}>
                              <FiAlertCircle size={13} /> Thất bại (Từ chối)
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: "13px", color: "#64748b" }}>
                          <div>Gửi: {formatDate(r.requestedAt || r.createdAt)}</div>
                          {r.reviewedAt && (
                            <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                              Duyệt: {formatDate(r.reviewedAt)}
                            </div>
                          )}
                        </td>
                        <td>
                          <Link to={`/donations/${r.id}`} style={{ fontSize: "13px", fontWeight: 600 }}>
                            Xem biên lai →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager page={page} pages={result.data.pages} onChange={setPage} />
          </>
        ) : (
          <Empty>
            Bạn chưa gửi đơn yêu cầu hoàn tiền nào. Để yêu cầu hoàn tiền, hãy vào chi tiết khoản đóng góp của bạn.
          </Empty>
        )
      )}
    </>
  );
}
