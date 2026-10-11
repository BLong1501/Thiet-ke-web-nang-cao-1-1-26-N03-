import { useState } from "react";
import { Link } from "react-router-dom";
import { activityLogApi, formatDate } from "../services/api";
import { downloadCsv, listResult } from "../services/platform";
import { useRemote } from "../hooks/useRemote";
import { useAuthStore } from "../store/authStore";
import {
  Empty,
  Notice,
  Page,
  Pager,
  RemoteState,
} from "../components/ui/WorkspaceUI";

const actionNames: Record<string, string> = {
  LOGIN_SUCCESS: "Đăng nhập thành công",
  LOGOUT: "Đăng xuất",
  UPDATE_PROFILE: "Cập nhật hồ sơ",
  CHANGE_PASSWORD: "Đổi mật khẩu",
  SUBMIT_KYC: "Gửi hồ sơ xác minh",
  CREATE_CAMPAIGN: "Tạo chiến dịch",
  UPDATE_CAMPAIGN: "Cập nhật chiến dịch",
  CREATE_DONATION: "Tạo khoản đóng góp",
  UNAUTHORIZED_ACCESS_ATTEMPT: "Truy cập khu vực không có quyền",
};
export default function UserActivityLogsPage() {
  const userId = useAuthStore((s) => s.user?.id);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const result = useRemote(
    () =>
      activityLogApi
        .getMyLogs({ ...filters, page, limit: 15 })
        .then(listResult),
    [userId, filters, page],
  );
  return (
    <Page
      title="Nhật ký của tôi"
      intro="Lịch sử hoạt động của tài khoản bạn đang đăng nhập."
      actions={<Link to="/dashboard">Về bảng điều khiển</Link>}
    >
      <Notice>
        Chỉ hiển thị hoạt động của bạn được hệ thống ghi nhận. Nhật ký quản trị
        và hoạt động của tài khoản khác không nằm trong danh sách này.
      </Notice>
      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const from = String(f.get("from") || "");
          const to = String(f.get("to") || "");
          if (from && to && from > to) {
            e.currentTarget
              .querySelector<HTMLInputElement>("[name=to]")
              ?.setCustomValidity(
                "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.",
              );
            e.currentTarget.reportValidity();
            return;
          }
          const values: Record<string, string> = {};
          const search = String(f.get("search") || "").trim();
          const action = String(f.get("action") || "");
          if (search) values.search = search;
          if (action) values.action = action;
          if (from) values.from = new Date(`${from}T00:00:00`).toISOString();
          if (to) values.to = new Date(`${to}T23:59:59.999`).toISOString();
          setFilters(values);
          setPage(1);
        }}
      >
        <input
          name="search"
          type="search"
          aria-label="Tìm hoạt động của tôi"
          placeholder="Tìm hành động, đối tượng…"
        />
        <select name="action" aria-label="Loại hoạt động">
          <option value="">Tất cả hoạt động</option>
          {Object.entries(actionNames).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          name="from"
          type="date"
          aria-label="Từ ngày"
          onChange={(e) =>
            e.currentTarget.form
              ?.querySelector<HTMLInputElement>("[name=to]")
              ?.setCustomValidity("")
          }
        />
        <input
          name="to"
          type="date"
          aria-label="Đến ngày"
          onChange={(e) => e.currentTarget.setCustomValidity("")}
        />
        <button className="button">Lọc hoạt động</button>
        <button
          type="reset"
          className="button secondary"
          onClick={(e) => {
            e.currentTarget.form
              ?.querySelector<HTMLInputElement>("[name=to]")
              ?.setCustomValidity("");
            setFilters({});
            setPage(1);
          }}
        >
          Xóa bộ lọc
        </button>
      </form>
      <div className="actions">
        <button className="button secondary" onClick={result.reload}>
          Làm mới
        </button>
        <button
          className="button secondary"
          disabled={!result.data?.items.length}
          onClick={() =>
            downloadCsv(
              "nhat-ky-cua-toi.csv",
              ["Thời gian", "Hoạt động", "Đối tượng", "Mã đối tượng"],
              result.data!.items.map((l) => [
                l.createdAt,
                actionNames[l.action] || l.action,
                l.entityName,
                l.entityId,
              ]),
            )
          }
        >
          Xuất CSV trang hiện tại
        </button>
      </div>
      <RemoteState {...result} />
      {result.data && (
        <>
          <p>{result.data.total} hoạt động được ghi nhận.</p>
          {result.data.items.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Hoạt động</th>
                    <th>Đối tượng</th>
                    <th>Mã đối tượng</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.items.map((l) => (
                    <tr key={l.id}>
                      <td>
                        {formatDate(l.createdAt)}
                        <small>
                          {new Date(l.createdAt).toLocaleTimeString("vi-VN")}
                        </small>
                      </td>
                      <td>{actionNames[l.action] || l.action}</td>
                      <td>{l.entityName}</td>
                      <td>{l.entityId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>
              Chưa có hoạt động phù hợp được ghi nhận cho tài khoản của bạn.
            </Empty>
          )}
          <Pager page={page} pages={result.data.pages} onChange={setPage} />
        </>
      )}
    </Page>
  );
}
