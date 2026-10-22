import { useState } from "react";
import { LuRotateCw, LuEye } from "react-icons/lu";
import { activityLogApi, formatDate } from "../../services/api";
import { listResult, type RecordData } from "../../services/platform";
import { useRemote } from "../../hooks/useRemote";
import { Empty, Modal, Pager, RemoteState } from "../ui/WorkspaceUI";

const REFUND_ACTION_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  REFUND_REQUESTED: {
    label: "Yêu cầu hoàn tiền",
    color: "#b45309",
    bg: "#fef3c7",
  },
  REFUND_APPROVED: {
    label: "Duyệt hoàn tiền thành công",
    color: "#166534",
    bg: "#dcfce7",
  },
  REFUND_REJECTED: {
    label: "Từ chối yêu cầu hoàn tiền",
    color: "#991b1b",
    bg: "#fee2e2",
  },
};

export default function AdminRefundLogsTab() {
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<RecordData | null>(null);

  const result = useRemote(
    () =>
      activityLogApi
        .getLogs({
          search: "REFUND",
          page,
          limit: 15,
        })
        .then(listResult),
    [page],
    { keepPrevious: true }
  );

  const logs = result.data?.items || [];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600 }}>
            Nhật ký giao dịch & Phê duyệt hoàn tiền
          </h3>
          <p
            style={{
              margin: "3px 0 0",
              fontSize: "0.85rem",
              color: "var(--color-muted)",
            }}
          >
            Lưu vết tự động toàn bộ hành vi gửi yêu cầu, phê duyệt hoàn tiền và từ chối hoàn tiền giữa Nhà hảo tâm & Ban quản trị.
          </p>
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
          {logs.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Hành vi nghiệp vụ</th>
                    <th>Người thực hiện</th>
                    <th>Đối tượng / Mã GD</th>
                    <th>Nội dung chi tiết</th>
                    <th style={{ textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const actionInfo = REFUND_ACTION_LABELS[log.action] || {
                      label: log.action,
                      color: "#374151",
                      bg: "#f3f4f6",
                    };

                    return (
                      <tr key={log.id}>
                        <td style={{ whiteSpace: "nowrap", fontSize: "0.85rem" }}>
                          {formatDate(log.createdAt)}
                        </td>
                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              color: actionInfo.color,
                              backgroundColor: actionInfo.bg,
                            }}
                          >
                            {actionInfo.label}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {log.user?.fullName || "Hệ thống"}
                          </div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--color-muted)",
                            }}
                          >
                            {log.user?.email || log.userId}
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: "0.85rem",
                            }}
                          >
                            {log.entityName}: {log.entityId?.slice(0, 8)}...
                          </span>
                        </td>
                        <td>
                          <div
                            style={{
                              maxWidth: 320,
                              fontSize: "0.85rem",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {log.description || "—"}
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="button secondary sm"
                            onClick={() => setSelectedLog(log)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <LuEye size={14} /> Xem
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>Chưa có bản ghi nhật ký hoàn tiền nào.</Empty>
          )}

          <Pager page={page} pages={result.data.pages} onChange={setPage} />
        </>
      )}

      {selectedLog && (
        <Modal
          title="Chi tiết vết kiểm toán hoàn tiền"
          onClose={() => setSelectedLog(null)}
        >
          <dl className="detail-list">
            <dt>Mã bản ghi Audit</dt>
            <dd><code>{selectedLog.id}</code></dd>

            <dt>Thời gian</dt>
            <dd>{formatDate(selectedLog.createdAt)}</dd>

            <dt>Hành vi</dt>
            <dd>
              <strong>{selectedLog.action}</strong>
            </dd>

            <dt>Người thực hiện</dt>
            <dd>
              {selectedLog.user?.fullName || "Hệ thống / Ẩn danh"} (
              {selectedLog.user?.email || selectedLog.userId})
            </dd>

            <dt>Đối tượng tác động</dt>
            <dd>
              {selectedLog.entityName} ID: <code>{selectedLog.entityId}</code>
            </dd>

            <dt>Mô tả chi tiết</dt>
            <dd>{selectedLog.description}</dd>

            {selectedLog.ipAddress && (
              <>
                <dt>Địa chỉ IP</dt>
                <dd>{selectedLog.ipAddress}</dd>
              </>
            )}
          </dl>
        </Modal>
      )}
    </div>
  );
}
