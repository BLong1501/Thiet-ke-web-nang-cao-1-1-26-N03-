import { useState, type FormEvent } from "react";
import { api } from "../services/api";
import { errorMessage, payload, type RecordData } from "../services/platform";
import { useRemote } from "../hooks/useRemote";
import {
  Empty,
  Field,
  Modal,
  Notice,
  Page,
  RemoteState,
} from "../components/ui/WorkspaceUI";
import AdminNav from "../components/AdminNav";
import toast from "react-hot-toast";
export default function AdminCategoriesPage() {
  const result = useRemote(() =>
    api.get("/campaigns/categories", { params: { all: true } }).then(payload),
  );
  const [selected, setSelected] = useState<RecordData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      if (deleting) await api.delete(`/campaigns/categories/${selected.id}`);
      else {
        const body = {
          name: String(f.get("name")).trim(),
          description: String(f.get("description")).trim(),
          isActive: f.get("active") === "on",
        };
        if (selected.id)
          await api.put(`/campaigns/categories/${selected.id}`, body);
        else await api.post("/campaigns/categories", body);
      }
      toast.success("Đã cập nhật danh mục.");
      setSelected(null);
      result.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  function open(c: RecordData, remove = false) {
    setSelected(c);
    setDeleting(remove);
    setError("");
  }
  return (
    <Page title="Quản lý danh mục">
      <AdminNav />
      <div className="actions">
        <button className="button" onClick={() => open({})}>
          Thêm danh mục
        </button>
        <button className="button secondary" onClick={result.reload}>
          Làm mới
        </button>
      </div>
      <RemoteState {...result} />
      {result.data &&
        (result.data.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Danh mục</th>
                  <th>Mô tả</th>
                  <th>Hiển thị</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((c: RecordData) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.description || "—"}</td>
                    <td>{c.isActive ? "Công khai" : "Đang ẩn"}</td>
                    <td>
                      <div className="actions">
                        <button
                          className="button secondary"
                          onClick={() => open(c)}
                        >
                          Sửa
                        </button>
                        <button
                          className="button secondary"
                          onClick={() => open(c, true)}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>Chưa có danh mục.</Empty>
        ))}
      {selected && (
        <Modal
          title={
            deleting
              ? "Xóa danh mục"
              : selected.id
                ? "Chỉnh sửa danh mục"
                : "Thêm danh mục"
          }
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <form className="form-stack" onSubmit={submit}>
            {error && <Notice error>{error}</Notice>}
            {deleting ? (
              <p>
                Xác nhận xóa “{selected.name}”? Máy chủ sẽ kiểm tra các chiến
                dịch đang sử dụng danh mục này.
              </p>
            ) : (
              <>
                <Field label="Tên danh mục">
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={100}
                    defaultValue={selected.name}
                  />
                </Field>
                <Field label="Mô tả">
                  <textarea
                    name="description"
                    defaultValue={selected.description}
                  />
                </Field>
                <label className="check">
                  <input
                    name="active"
                    type="checkbox"
                    defaultChecked={selected.isActive !== false}
                  />
                  Hiển thị công khai
                </label>
              </>
            )}
            <button className="button" disabled={busy}>
              Xác nhận
            </button>
          </form>
        </Modal>
      )}
    </Page>
  );
}
