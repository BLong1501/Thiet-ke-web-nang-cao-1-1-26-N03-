import { useState, type FormEvent } from "react";
import { verificationApi, formatDate } from "../services/api";
import { errorMessage, listResult, payload } from "../services/platform";
import { useRemote } from "../hooks/useRemote";
import {
  Page,
  Empty,
  Field,
  Modal,
  Notice,
  Pager,
  RemoteState,
  SecureImage,
} from "../components/ui/WorkspaceUI";
import AdminNav from "../components/AdminNav";
import toast from "react-hot-toast";
export default function AdminVerificationsPage() {
  const [page, setPage] = useState(1);
  const [id, setId] = useState("");
  const result = useRemote(
    () => verificationApi.getPending({ page, limit: 10 }).then(listResult),
    [page],
    { keepPrevious: true },
  );
  return (
    <Page title="Xét duyệt danh tính">
      <AdminNav />
      <button className="button secondary" onClick={result.reload}>
        Làm mới danh sách
      </button>
      <RemoteState {...result} />
      {result.data && (
        <>
          {result.data.items.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Người đăng ký</th>
                    <th>Email</th>
                    <th>Ngày nộp</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.items.map((v) => (
                    <tr key={v.id}>
                      <td>{v.user?.fullName}</td>
                      <td>{v.user?.email}</td>
                      <td>{formatDate(v.createdAt)}</td>
                      <td>
                        <button
                          className="button secondary"
                          onClick={() => setId(v.id)}
                        >
                          Xem hồ sơ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>Không có hồ sơ đang chờ duyệt.</Empty>
          )}
          <Pager page={page} pages={result.data.pages} onChange={setPage} />
        </>
      )}
      {id && (
        <VerificationReview
          id={id}
          close={() => setId("")}
          updated={() => {
            setId("");
            result.reload();
          }}
        />
      )}
    </Page>
  );
}
function VerificationReview({
  id,
  close,
  updated,
}: {
  id: string;
  close: () => void;
  updated: () => void;
}) {
  const result = useRemote(
    () => verificationApi.getById(id).then(payload),
    [id],
  );
  const [decision, setDecision] = useState("APPROVED");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await verificationApi.review(id, {
        status: decision as "APPROVED" | "REJECTED",
        rejectionReason:
          decision === "REJECTED" ? String(f.get("reason")) : undefined,
      });
      toast.success("Đã lưu kết quả xét duyệt.");
      updated();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const v = result.data;
  return (
    <Modal
      title="Hồ sơ xác minh"
      onClose={() => {
        if (!busy) close();
      }}
    >
      <RemoteState {...result} />
      {v && (
        <>
          <h3>{v.user?.fullName}</h3>
          <p>
            {v.user?.email} · CCCD: {v.idCardNumber}
          </p>
          <p>
            Ngày cấp:{" "}
            {v.cardIssuedDate ? formatDate(v.cardIssuedDate) : "Chưa cung cấp"}{" "}
            · {v.cardIssuedPlace}
          </p>
          <div className="media-grid">
            {[
              ["frontCardImage", "Mặt trước CCCD"],
              ["backCardImage", "Mặt sau CCCD"],
              ["portraitImage", "Ảnh chân dung"],
            ].map(([key, label]) => (
              <figure key={key}>
                <SecureImage src={v[key]} alt={label} />
                <figcaption>{label}</figcaption>
              </figure>
            ))}
          </div>
          <form className="form-stack" onSubmit={submit}>
            {error && <Notice error>{error}</Notice>}
            <Field label="Quyết định">
              <select
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
              >
                <option value="APPROVED">Duyệt và cấp quyền gây quỹ</option>
                <option value="REJECTED">Từ chối, yêu cầu nộp lại</option>
              </select>
            </Field>
            {decision === "REJECTED" && (
              <Field label="Lý do từ chối">
                <textarea
                  name="reason"
                  required
                  minLength={5}
                  maxLength={1000}
                />
              </Field>
            )}
            <button
              className="button"
              disabled={busy || v.status !== "PENDING"}
            >
              Xác nhận xét duyệt
            </button>
          </form>
        </>
      )}
    </Modal>
  );
}
