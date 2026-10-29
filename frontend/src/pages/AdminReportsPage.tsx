import { useState, type FormEvent } from "react";
import { api, formatDate, reportApi } from "../services/api";
import {
  errorMessage,
  listResult,
  type RecordData,
} from "../services/platform";
import { useRemote } from "../hooks/useRemote";
import {
  Empty,
  Field,
  Modal,
  Notice,
  Page,
  Pager,
  RemoteState,
} from "../components/ui/WorkspaceUI";
import Tabs from "../components/ui/Tabs";
import toast from "react-hot-toast";
import {
  useAdminPendingCounts,
  useInvalidatePendingCounts,
} from "../hooks/useAdminPendingCounts";
import { LuRotateCw } from "react-icons/lu";

export default function AdminReportsPage() {
  const { data: pendingCounts } = useAdminPendingCounts();
  const invalidatePendingCounts = useInvalidatePendingCounts();
  const [statusTab, setStatusTab] = useState<"PENDING" | "RESOLVED" | "REJECTED" | "ALL">("PENDING");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<RecordData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const result = useRemote(
    () =>
      api
        .get("/admin/reports", {
          params: {
            page,
            limit: 15,
            status: statusTab === "ALL" ? undefined : statusTab,
          },
        })
        .then(listResult),
    [page, statusTab],
    { keepPrevious: true }
  );

  async function resolve(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await reportApi.resolve(String(selected.id), {
        resolution: String(f.get("resolution")).trim(),
        status: "RESOLVED",
      });
      toast.success("Đã xử lý báo cáo.");
      setSelected(null);
      result.reload();
      invalidatePendingCounts();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page
      title="Báo cáo vi phạm"
      actions={
        <button
          className="button secondary"
          onClick={() => {
            result.reload();
            invalidatePendingCounts();
          }}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <LuRotateCw size={16} /> Làm mới
        </button>
      }
    >
      <Tabs
        label="Phân loại trạng thái báo cáo"
        tabs={[
          {
            id: "PENDING",
            label: "Chờ xử lý",
            badge: pendingCounts?.reports,
          },
          { id: "RESOLVED", label: "Đã giải quyết" },
          { id: "REJECTED", label: "Bị từ chối" },
          { id: "ALL", label: "Tất cả báo cáo" },
        ]}
        value={statusTab}
        onChange={(tabId) => {
          setStatusTab(tabId as any);
          setPage(1);
        }}
      >
        {result.error ? (
          <Notice>
            Dịch vụ xử lý báo cáo hiện chưa khả dụng trên máy chủ.
            <button
              className="button secondary"
              onClick={() => {
                result.reload();
                invalidatePendingCounts();
              }}
            >
              Thử lại
            </button>
          </Notice>
        ) : (
          <RemoteState {...result} />
        )}

        {result.data && (
          <>
            {result.data.items.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Lý do</th>
                      <th>Đối tượng</th>
                      <th>Ngày gửi</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.items.map((r) => (
                      <tr key={r.id}>
                        <td>{r.reason}</td>
                        <td>
                          {r.targetType} / {r.targetId}
                        </td>
                        <td>{formatDate(r.createdAt)}</td>
                        <td>
                          <span
                            className={
                              r.status === "PENDING"
                                ? "status-badge status-badge--warning"
                                : r.status === "RESOLVED"
                                ? "status-badge status-badge--success"
                                : "status-badge"
                            }
                          >
                            {r.status === "PENDING"
                              ? "Chờ xử lý"
                              : r.status === "RESOLVED"
                              ? "Đã giải quyết"
                              : r.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="button secondary sm"
                            onClick={() => {
                              setSelected(r);
                              setError("");
                            }}
                          >
                            Xem báo cáo
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>Không có báo cáo nào ở mục này.</Empty>
            )}
            <Pager page={page} pages={result.data.pages} onChange={setPage} />
          </>
        )}
      </Tabs>

      {selected && (
        <Modal
          title="Xử lý báo cáo"
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <p>
            <strong>Lý do:</strong> {selected.reason}
          </p>
          <p className="prose">{selected.description}</p>
          <form className="form-stack" onSubmit={resolve}>
            {error && <Notice error>{error}</Notice>}
            <Field label="Kết quả xử lý">
              <textarea
                name="resolution"
                required
                minLength={5}
                maxLength={2000}
                defaultValue={selected.resolution || ""}
              />
            </Field>
            <button
              className="button"
              disabled={busy || selected.status === "RESOLVED"}
            >
              Hoàn tất xử lý
            </button>
          </form>
        </Modal>
      )}
    </Page>
  );
}
