import { useState, type FormEvent } from "react";
import { userApi, formatDate } from "../services/api";
import { errorMessage, listResult, payload } from "../services/platform";
import { useRemote } from "../hooks/useRemote";
import { useAuthStore } from "../store/authStore";
import {
  Empty,
  Field,
  Modal,
  Notice,
  Page,
  Pager,
  RemoteState,
  Status,
} from "../components/ui/WorkspaceUI";
import toast from "react-hot-toast";
export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [id, setId] = useState("");
  const result = useRemote(
    () =>
      userApi
        .getUsers({
          page,
          limit: 10,
          search: search || undefined,
          role: role || undefined,
        })
        .then(listResult),
    [page, search, role],
    { keepPrevious: true },
  );
  return (
    <Page title="Quản lý người dùng">
      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(
            String(new FormData(e.currentTarget).get("search") || "").trim(),
          );
          setPage(1);
        }}
      >
        <input
          name="search"
          aria-label="Tìm người dùng"
          placeholder="Tên hoặc email"
          type="search"
        />
        <button className="button">Tìm kiếm</button>
        <select
          aria-label="Vai trò"
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả vai trò</option>
          <option value="USER">Người đóng góp</option>
          <option value="FUNDRAISER">Người gây quỹ</option>
          <option value="ADMIN">Quản trị viên</option>
        </select>
      </form>
      <RemoteState {...result} />
      {result.data && (
        <>
          {result.data.items.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.items.map((u) => (
                    <tr key={u.id}>
                      <td>
                        {u.fullName}
                        <small>{u.email}</small>
                      </td>
                      <td>{u.role}</td>
                      <td>
                        <Status value={u.status} />
                      </td>
                      <td>
                        <button
                          className="button secondary"
                          onClick={() => setId(u.id)}
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>Không tìm thấy người dùng phù hợp.</Empty>
          )}
          <Pager page={page} pages={result.data.pages} onChange={setPage} />
        </>
      )}
      {id && (
        <UserDetail
          id={id}
          close={() => setId("")}
          saved={() => {
            setId("");
            result.reload();
          }}
        />
      )}
    </Page>
  );
}
function UserDetail({
  id,
  close,
  saved,
}: {
  id: string;
  close: () => void;
  saved: () => void;
}) {
  const result = useRemote(() => userApi.getUserDetail(id).then(payload), [id]);
  const self = useAuthStore((s) => s.user?.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await userApi.updateUserStatus(id, {
        status: String(f.get("status")) as "ACTIVE" | "SUSPENDED" | "BANNED",
        reason: String(f.get("reason")),
      });
      toast.success("Đã cập nhật trạng thái.");
      saved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const u = result.data;
  return (
    <Modal
      title="Thông tin người dùng"
      onClose={() => {
        if (!busy) close();
      }}
    >
      <RemoteState {...result} />
      {u && (
        <>
          <h3>{u.fullName}</h3>
          <p>
            {u.email} · {u.phoneNumber || "Chưa có số điện thoại"}
          </p>
          <p>
            Tham gia: {formatDate(u.createdAt)} · {u.role}
          </p>
          <p>{u.bio}</p>
          <form className="form-stack" onSubmit={submit}>
            {error && <Notice error>{error}</Notice>}
            <Field label="Trạng thái tài khoản">
              <select
                name="status"
                defaultValue={u.status}
                disabled={self === id}
              >
                <option value="ACTIVE">Hoạt động</option>
                <option value="SUSPENDED">Tạm khóa</option>
                <option value="BANNED">Khóa tài khoản</option>
              </select>
            </Field>
            <Field label="Lý do thay đổi">
              <textarea name="reason" required minLength={3} maxLength={255} />
            </Field>
            <button className="button" disabled={busy || self === id}>
              Lưu trạng thái
            </button>
            {self === id && (
              <Notice>
                Bạn không thể thay đổi trạng thái tài khoản đang sử dụng.
              </Notice>
            )}
          </form>
        </>
      )}
    </Modal>
  );
}
