import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, campaignApi, formatCurrency } from "../services/api";
import {
  errorMessage,
  listResult,
  payload,
  type RecordData,
} from "../services/platform";
import { useRemote } from "../hooks/useRemote";
import {
  Page,
  Empty,
  Field,
  Modal,
  Notice,
  Pager,
  RemoteState,
  Status,
} from "../components/ui/WorkspaceUI";
import AdminNav from "../components/AdminNav";
import toast from "react-hot-toast";
export default function AdminCampaignsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("PENDING_APPROVAL");
  const [selected, setSelected] = useState<RecordData | null>(null);
  const [action, setAction] = useState("ACTIVE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reconciliation, setReconciliation] = useState<RecordData | null>(null);
  const result = useRemote(
    () =>
      (status === "PENDING_APPROVAL"
        ? campaignApi.getPending({ page, limit: 10 })
        : campaignApi.getAll({ page, limit: 10, status })
      ).then(listResult),
    [page, status],
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected || busy) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      if (action === "CANCELLED")
        await api.post(`/donations/campaigns/${selected.id}/cancel`, {
          reason: String(f.get("reason")),
        });
      else
        await campaignApi.review(selected.id, {
          status: action as "ACTIVE" | "REJECTED",
          rejectionReason:
            action === "REJECTED" ? String(f.get("reason")) : undefined,
        });
      toast.success("Đã cập nhật chiến dịch.");
      setSelected(null);
      result.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function reconcile(id: string) {
    setBusy(true);
    setError("");
    try {
      setReconciliation(
        payload(await api.get(`/donations/campaigns/${id}/reconciliation`)),
      );
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title="Quản lý chiến dịch">
      <AdminNav />
      <div className="filters">
        <select
          aria-label="Trạng thái chiến dịch"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          {[
            ["PENDING_APPROVAL", "Chờ duyệt"],
            ["ACTIVE", "Đang hoạt động"],
            ["DRAFT", "Bản nháp"],
            ["COMPLETED", "Hoàn tất"],
            ["REJECTED", "Từ chối"],
            ["CANCELLED", "Đã hủy"],
          ].map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <button className="button secondary" onClick={result.reload}>
          Làm mới
        </button>
      </div>
      <RemoteState {...result} />
      {result.data && (
        <>
          {result.data.items.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Chiến dịch</th>
                    <th>Mục tiêu</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.items.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/campaigns/${c.id}`}>{c.title}</Link>
                        <small>{c.fundraiser?.fullName}</small>
                      </td>
                      <td>{formatCurrency(Number(c.targetAmount))}</td>
                      <td>
                        <Status value={c.status} />
                      </td>
                      <td>
                        <div className="actions">
                          {c.status === "PENDING_APPROVAL" &&
                            ["ACTIVE", "REJECTED"].map((a) => (
                              <button
                                className="button secondary"
                                key={a}
                                onClick={() => {
                                  setSelected(c);
                                  setAction(a);
                                  setError("");
                                }}
                              >
                                {a === "ACTIVE" ? "Duyệt" : "Từ chối"}
                              </button>
                            ))}
                          {c.status === "ACTIVE" && (
                            <button
                              className="button secondary"
                              onClick={() => {
                                setSelected(c);
                                setAction("CANCELLED");
                                setError("");
                              }}
                            >
                              Hủy chiến dịch
                            </button>
                          )}
                          <button
                            className="button secondary"
                            disabled={busy}
                            onClick={() => reconcile(c.id)}
                          >
                            Đối soát
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>Không có chiến dịch ở trạng thái này.</Empty>
          )}
          <Pager page={page} pages={result.data.pages} onChange={setPage} />
        </>
      )}
      {selected && (
        <Modal
          title={
            action === "ACTIVE"
              ? "Phê duyệt chiến dịch"
              : action === "REJECTED"
                ? "Từ chối chiến dịch"
                : "Hủy chiến dịch"
          }
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <form className="form-stack" onSubmit={submit}>
            <p>{selected.title}</p>
            {error && <Notice error>{error}</Notice>}
            {action === "ACTIVE" ? (
              <Notice>
                Chiến dịch sẽ được công khai và có thể nhận đóng góp sau khi
                được duyệt.
              </Notice>
            ) : (
              <Field label="Lý do">
                <textarea
                  name="reason"
                  required
                  minLength={5}
                  maxLength={action === "CANCELLED" ? 500 : 1000}
                />
              </Field>
            )}
            <button className="button" disabled={busy}>
              Xác nhận
            </button>
          </form>
        </Modal>
      )}
      {reconciliation && (
        <Modal title="Đối soát sổ cái" onClose={() => setReconciliation(null)}>
          <Notice error={!reconciliation.matches}>
            {reconciliation.matches
              ? "Số dư khớp với sổ cái."
              : "Số dư chưa khớp với sổ cái."}
          </Notice>
          <dl className="detail-list">
            {[
              ["received", "Đã nhận"],
              ["refunded", "Đã hoàn"],
              ["net", "Số dư sổ cái"],
              ["cachedAmount", "Số dư chiến dịch"],
            ].map(([k, label]) => (
              <div key={k}>
                <dt>{label}</dt>
                <dd>{formatCurrency(Number(reconciliation[k]))}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
    </Page>
  );
}
