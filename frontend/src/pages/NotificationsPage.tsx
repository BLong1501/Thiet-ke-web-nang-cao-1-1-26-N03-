import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDate, notificationApi } from "../services/api";
import { queryClient } from "../services/queryClient";
import { UNREAD_KEY } from "../hooks/useUnreadNotifications";
import { errorMessage, listResult } from "../services/platform";
import { useRemote } from "../hooks/useRemote";
import {
  Empty,
  Notice,
  Page,
  Pager,
  RemoteState,
} from "../components/ui/WorkspaceUI";
import toast from "react-hot-toast";
export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const result = useRemote(
    () => notificationApi.list({ page, limit: 15 }).then(listResult),
    [page],
    { keepPrevious: true },
  );
  async function read(id?: string) {
    setBusy(true);
    try {
      await (id ? notificationApi.markRead(id) : notificationApi.markAllRead());
      result.reload();
      void queryClient.invalidateQueries({ queryKey: UNREAD_KEY });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page
      title="Thông báo"
      actions={
        <button
          className="button secondary"
          disabled={busy || !result.data?.items.length}
          onClick={() => read()}
        >
          Đánh dấu tất cả đã đọc
        </button>
      }
    >
      {result.error ? (
        <Notice>
          Dịch vụ thông báo hiện chưa khả dụng. Bạn có thể kiểm tra trạng thái
          trong hồ sơ và bảng điều khiển.
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
            result.data.items.map((n) => (
              <article key={n.id} className="panel">
                <div className="section-heading">
                  <h2>{n.title}</h2>
                  <small>{formatDate(n.createdAt)}</small>
                </div>
                <p>{n.message || n.content}</p>
                <div className="actions">
                  {typeof n.link === "string" &&
                    n.link.startsWith("/") &&
                    !n.link.startsWith("//") && (
                      <Link to={n.link}>Xem chi tiết</Link>
                    )}
                  {!n.isRead && (
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => read(n.id)}
                    >
                      Đánh dấu đã đọc
                    </button>
                  )}
                </div>
              </article>
            ))
          ) : (
            <Empty>Bạn chưa có thông báo.</Empty>
          )}
          <Pager page={page} pages={result.data.pages} onChange={setPage} />
        </>
      )}
    </Page>
  );
}
