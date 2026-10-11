import { useState, type FormEvent } from "react";
import { api, formatDate } from "../services/api";
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
import AdminNav from "../components/AdminNav";
import toast from "react-hot-toast";
export default function AdminReportsPage() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<RecordData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const result = useRemote(
    () =>
      api
        .get("/admin/reports", { params: { page, limit: 15 } })
        .then(listResult),
    [page],
  );
  async function resolve(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api.patch(`/admin/reports/${selected.id}/resolve`, {
        resolution: String(f.get("resolution")).trim(),
        status: "RESOLVED",
      });
      toast.success("Đã xử lý báo cáo.");
      setSelected(null);
      result.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title="Báo cáo vi phạm">
      <AdminNav />
      {result.error ? (
        <Notice>
          Dịch vụ xử lý báo cáo hiện chưa khả dụng trên máy chủ.
          <button className="button secondary" onClick={result.reload}>
            Thử lại
          </button>
        </Notice>
      ) : (
        <RemoteState {...result} />
      )}{" "}
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
                      <td>{r.status}</td>
                      <td>
                        <button
                          className="button secondary"
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
            <Empty>Không có báo cáo.</Empty>
          )}
          <Pager page={page} pages={result.data.pages} onChange={setPage} />
        </>
      )}
      {selected && (
        <Modal
          title="Xử lý báo cáo"
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <p>{selected.reason}</p>
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
