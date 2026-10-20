import { useState } from "react";
import { activityLogApi } from "../services/api";
import { downloadCsv, listResult, payload } from "../services/platform";
import { useRemote } from "../hooks/useRemote";
import {
  Empty,
  Modal,
  Page,
  Pager,
  RemoteState,
} from "../components/ui/WorkspaceUI";

const time = (value: string) =>
  new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

function LogDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const result = useRemote(
    () => activityLogApi.getLogById(id).then(payload),
    [id],
  );
  const log = result.data;
  return (
    <Modal title="Chi tiết nhật kí hoạt động" onClose={onClose}>
      <RemoteState {...result} />
      {log && !result.error && (
        <dl className="detail-list">
          <dt>Mã bản ghi</dt>
          <dd>{log.id}</dd>
          <dt>Thời gian (Việt Nam)</dt>
          <dd>{time(log.createdAt)}</dd>
          <dt>Người thực hiện</dt>
          <dd>
            {log.user?.fullName ||
              (log.userId
                ? "Tài khoản không còn khả dụng"
                : "Hệ thống / khách")}
            <small>{log.user?.email}</small>
          </dd>
          <dt>ID người thực hiện</dt>
          <dd>{log.userId || "—"}</dd>
          <dt>Hành động</dt>
          <dd>{log.action}</dd>
          <dt>Đối tượng</dt>
          <dd>
            {log.entityName} / {log.entityId}
          </dd>
          <dt>Mô tả</dt>
          <dd>{log.description}</dd>
        </dl>
      )}
    </Modal>
  );
}

export default function AdminActivityLogsPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const result = useRemote(
    () =>
      activityLogApi.getLogs({ ...filters, page, limit: 20 }).then(listResult),
    [filters, page],
  );
  return (
    <Page
      title="Nhật kí hoạt động"
      intro="Hoạt động toàn hệ thống, chỉ dành cho quản trị viên. Thời gian hiển thị theo múi giờ Việt Nam (UTC+7)."
    >
      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          const values = Object.fromEntries(
            [...new FormData(e.currentTarget).entries()]
              .map(([key, value]) => [key, String(value).trim()])
              .filter(([, value]) => value),
          );
          if (values.from && values.to && values.from > values.to) {
            setFormError("Từ ngày phải trước hoặc bằng đến ngày.");
            return;
          }
          setFormError("");
          setFilters(values);
          setPage(1);
        }}
      >
        <input
          name="search"
          type="search"
          maxLength={200}
          aria-label="Tìm nhật kí"
          placeholder="Tìm tên, email, mô tả, đối tượng…"
        />
        <input
          name="userId"
          aria-label="ID người thực hiện"
          placeholder="ID người thực hiện (UUID)"
          pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
        />
        <input
          name="action"
          maxLength={100}
          aria-label="Mã hành động"
          placeholder="Mã hành động, ví dụ CREATE_CAMPAIGN"
        />
        <label>
          Từ ngày <input name="from" type="date" aria-label="Từ ngày" />
        </label>
        <label>
          Đến ngày <input name="to" type="date" aria-label="Đến ngày" />
        </label>
        <button className="button" disabled={result.fetching}>
          Lọc nhật kí
        </button>
        <button
          type="reset"
          className="button secondary"
          onClick={() => {
            setFilters({});
            setPage(1);
            setFormError("");
          }}
        >
          Xóa bộ lọc
        </button>
      </form>
      {formError && <p role="alert">{formError}</p>}
      <div className="actions">
        <button
          className="button secondary"
          onClick={result.reload}
          disabled={result.fetching}
        >
          Làm mới
        </button>
        <button
          className="button secondary"
          disabled={
            !result.data?.items.length || !!result.error || result.fetching
          }
          onClick={() =>
            downloadCsv(
              "nhat-ki.csv",
              [
                "Thời gian Việt Nam",
                "Người thực hiện",
                "Hành động",
                "Đối tượng",
                "ID đối tượng",
                "Mô tả",
              ],
              result.data!.items.map((l) => [
                time(l.createdAt),
                l.user?.email,
                l.action,
                l.entityName,
                l.entityId,
                l.description,
              ]),
            )
          }
        >
          Xuất CSV trang hiện tại
        </button>
      </div>
      <RemoteState {...result} />
      {result.fetching && !result.loading && (
        <p role="status">Đang cập nhật nhật kí…</p>
      )}
      {result.data && !result.error && (
        <>
          <p aria-live="polite">{result.data.total} bản ghi</p>
          {result.data.items.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Người thực hiện</th>
                    <th>Hành động</th>
                    <th>Đối tượng</th>
                    <th>Mô tả</th>
                    <th>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.items.map((l) => (
                    <tr key={l.id}>
                      <td>{time(l.createdAt)}</td>
                      <td>
                        {l.user?.fullName ||
                          (l.userId
                            ? "Tài khoản không còn khả dụng"
                            : "Hệ thống / khách")}
                        <small>{l.user?.email}</small>
                      </td>
                      <td>{l.action}</td>
                      <td>
                        {l.entityName}
                        <small>{l.entityId}</small>
                      </td>
                      <td>{l.description}</td>
                      <td>
                        <button
                          className="button secondary"
                          aria-label={`Xem nhật kí ${l.id}`}
                          onClick={() => setSelected(l.id)}
                        >
                          Xem
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>Không có nhật kí phù hợp.</Empty>
          )}
          <Pager page={page} pages={result.data.pages} onChange={setPage} />
        </>
      )}
      {selected && (
        <LogDetail id={selected} onClose={() => setSelected(null)} />
      )}
    </Page>
  );
}
