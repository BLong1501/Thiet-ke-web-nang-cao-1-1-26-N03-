import { useState } from "react";
import { LuDownload, LuHistory, LuRefreshCw, LuSearch } from "react-icons/lu";
import { activityLogApi } from "../services/api";
import { downloadCsv, listResult, payload } from "../services/platform";
import { useRemote } from "../hooks/useRemote";
import {
  Empty,
  Modal,
  Notice,
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
    <Modal title="Chi tiết nhật ký hoạt động" onClose={onClose}>
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

  function applyFilters(form: HTMLFormElement) {
    const values = Object.fromEntries(
      [...new FormData(form).entries()]
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
  }

  return (
    <Page
      title="Nhật ký hoạt động"
      intro="Hoạt động toàn hệ thống, chỉ dành cho quản trị viên. Thời gian hiển thị theo múi giờ Việt Nam (UTC+7)."
    >
      <section className="logs-shell">
        <header className="logs-hero">
          <div className="logs-hero__icon" aria-hidden="true">
            <LuHistory size={22} />
          </div>
          <div>
            <p className="logs-hero__eyebrow">Audit trail</p>
            <h2 className="logs-hero__title">Bộ lọc nhật ký</h2>
            <p className="logs-hero__intro">
              Tìm theo người dùng, mã hành động hoặc khoảng ngày rồi xuất CSV
              trang hiện tại.
            </p>
          </div>
        </header>

        <form
          className="logs-toolbar panel"
          onSubmit={(e) => {
            e.preventDefault();
            applyFilters(e.currentTarget);
          }}
        >
          <div className="logs-toolbar__grid">
            <label className="logs-field logs-field--grow">
              <span>Tìm kiếm</span>
              <span className="logs-field__control">
                <LuSearch size={16} aria-hidden="true" />
                <input
                  name="search"
                  type="search"
                  maxLength={200}
                  aria-label="Tìm nhật ký"
                  placeholder="Tên, email, mô tả, đối tượng…"
                />
              </span>
            </label>
            <label className="logs-field">
              <span>ID người thực hiện</span>
              <input
                name="userId"
                aria-label="ID người thực hiện"
                placeholder="UUID người dùng"
                pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
              />
            </label>
            <label className="logs-field">
              <span>Mã hành động</span>
              <input
                name="action"
                maxLength={100}
                aria-label="Mã hành động"
                placeholder="VD: CREATE_CAMPAIGN"
              />
            </label>
            <label className="logs-field">
              <span>Từ ngày</span>
              <input name="from" type="date" aria-label="Từ ngày" />
            </label>
            <label className="logs-field">
              <span>Đến ngày</span>
              <input name="to" type="date" aria-label="Đến ngày" />
            </label>
          </div>

          <div className="logs-toolbar__actions">
            <button className="button" disabled={result.fetching}>
              Lọc nhật ký
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
            <button
              type="button"
              className="button secondary"
              onClick={result.reload}
              disabled={result.fetching}
            >
              <LuRefreshCw size={15} aria-hidden="true" />
              Làm mới
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={
                !result.data?.items.length || !!result.error || result.fetching
              }
              onClick={() =>
                downloadCsv(
                  "nhat-ky.csv",
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
              <LuDownload size={15} aria-hidden="true" />
              Xuất CSV
            </button>
          </div>
        </form>

        {formError && <Notice error>{formError}</Notice>}

        <RemoteState {...result} />
        {result.fetching && !result.loading && (
          <p className="logs-status" role="status">
            Đang cập nhật nhật ký…
          </p>
        )}

        {result.data && !result.error && (
          <>
            <div className="logs-meta">
              <strong>{result.data.total.toLocaleString("vi-VN")}</strong>
              <span>bản ghi phù hợp</span>
            </div>
            {result.data.items.length ? (
              <div className="table-wrap logs-table">
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
                        <td>
                          <time dateTime={l.createdAt}>{time(l.createdAt)}</time>
                        </td>
                        <td>
                          {l.user?.fullName ||
                            (l.userId
                              ? "Tài khoản không còn khả dụng"
                              : "Hệ thống / khách")}
                          <small>{l.user?.email}</small>
                        </td>
                        <td>
                          <code className="logs-action">{l.action}</code>
                        </td>
                        <td>
                          {l.entityName}
                          <small>{l.entityId}</small>
                        </td>
                        <td>{l.description}</td>
                        <td>
                          <button
                            className="button secondary"
                            aria-label={`Xem nhật ký ${l.id}`}
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
              <Empty>Không có nhật ký phù hợp.</Empty>
            )}
            <Pager page={page} pages={result.data.pages} onChange={setPage} />
          </>
        )}
      </section>

      {selected && (
        <LogDetail id={selected} onClose={() => setSelected(null)} />
      )}
    </Page>
  );
}
