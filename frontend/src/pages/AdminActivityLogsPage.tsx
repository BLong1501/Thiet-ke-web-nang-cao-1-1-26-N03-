import { useState } from "react";
import { activityLogApi, formatDate } from "../services/api";
import { downloadCsv, listResult, type RecordData } from "../services/platform";
import { useRemote } from "../hooks/useRemote";
import {
  Empty,
  Modal,
  Page,
  Pager,
  RemoteState,
} from "../components/ui/WorkspaceUI";
export default function AdminActivityLogsPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<RecordData | null>(null);
  const result = useRemote(
    () =>
      activityLogApi.getLogs({ ...filters, page, limit: 20 }).then(listResult),
    [filters, page],
    { keepPrevious: true },
  );
  return (
    <Page
      title="Nhật ký hệ thống — Admin"
      intro="Theo dõi hoạt động toàn hệ thống. Khu vực này chỉ dành cho quản trị viên."
    >
      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setFilters(
            Object.fromEntries(
              [...f.entries()]
                .map(([k, v]) => [k, String(v).trim()])
                .filter(([, v]) => v),
            ),
          );
          setPage(1);
        }}
      >
        <input
          name="search"
          type="search"
          aria-label="Tìm nhật ký"
          placeholder="Tìm hành động, người dùng…"
        />
        <input
          name="action"
          aria-label="Mã hành động"
          placeholder="Mã hành động"
        />
        <input name="from" type="date" aria-label="Từ ngày" />
        <input name="to" type="date" aria-label="Đến ngày" />
        <button className="button">Lọc nhật ký</button>
        <button
          type="reset"
          className="button secondary"
          onClick={() => {
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
              "nhat-ky.csv",
              [
                "Thời gian",
                "Người dùng",
                "Hành động",
                "Đối tượng",
                "Mã đối tượng",
              ],
              result.data!.items.map((l) => [
                l.createdAt,
                l.user?.email,
                l.action,
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
          {result.data.items.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Người dùng</th>
                    <th>Hành động</th>
                    <th>Đối tượng</th>
                    <th>Chi tiết</th>
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
                      <td>
                        {l.user?.fullName || "Hệ thống"}
                        <small>{l.user?.email}</small>
                      </td>
                      <td>{l.action}</td>
                      <td>{l.entityName}</td>
                      <td>
                        <button
                          className="button secondary"
                          onClick={() => setSelected(l)}
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
      {selected && (
        <Modal title="Chi tiết nhật ký" onClose={() => setSelected(null)}>
          <dl className="detail-list">
            <dt>Hành động</dt>
            <dd>{selected.action}</dd>
            <dt>Đối tượng</dt>
            <dd>
              {selected.entityName} / {selected.entityId}
            </dd>
            <dt>Địa chỉ IP</dt>
            <dd>{selected.ipAddress || "—"}</dd>
          </dl>
          <pre className="json-detail">
            {JSON.stringify(selected.details, null, 2)}
          </pre>
        </Modal>
      )}
    </Page>
  );
}
