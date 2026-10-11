import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import {
  errorMessage,
  listResult,
  payload,
  type RecordData,
} from "../services/platform";
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
} from "../components/ui/WorkspaceUI";
import toast from "react-hot-toast";
export default function CommunityPage() {
  const [params, setParams] = useSearchParams();
  const id = params.get("group") || "";
  const user = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const groups = useRemote(
    () =>
      api.get("/communities", { params: { page, limit: 12 } }).then(listResult),
    [page],
  );
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const r = await api.post("/communities", {
        name: String(f.get("name")).trim(),
        description: String(f.get("description")).trim(),
      });
      setCreating(false);
      groups.reload();
      setParams({ group: payload(r).id });
      toast.success("Đã tạo nhóm.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page
      title="Cộng đồng sẻ chia"
      intro="Kết nối những người cùng quan tâm và theo dõi hoạt động trong nhóm."
      actions={
        user ? (
          <button
            className="button"
            disabled={!!groups.error}
            onClick={() => setCreating(true)}
          >
            Tạo cộng đồng
          </button>
        ) : (
          <Link className="button" to="/login">
            Đăng nhập để tham gia
          </Link>
        )
      }
    >
      {groups.error ? (
        <Notice>
          Không gian cộng đồng hiện chưa khả dụng trên máy chủ này. Bạn vẫn có
          thể <Link to="/campaigns">khám phá và đóng góp cho chiến dịch</Link>.
          <button className="button secondary" onClick={groups.reload}>
            Thử kết nối lại
          </button>
        </Notice>
      ) : (
        <RemoteState {...groups} />
      )}{" "}
      {groups.data && (
        <>
          {groups.data.items.length ? (
            <div className="community-grid">
              {groups.data.items.map((g) => (
                <button
                  className={`panel community-card ${id === g.id ? "selected" : ""}`}
                  key={g.id}
                  onClick={() => setParams({ group: g.id })}
                >
                  <h2>{g.name}</h2>
                  <p>{g.description}</p>
                  <small>
                    {g.memberCount ?? g._count?.members ?? 0} thành viên
                  </small>
                </button>
              ))}
            </div>
          ) : (
            <Empty>Chưa có cộng đồng nào.</Empty>
          )}
          <Pager page={page} pages={groups.data.pages} onChange={setPage} />
        </>
      )}
      {id && !groups.error && (
        <GroupFeed
          key={id}
          id={id}
          group={groups.data?.items.find((g) => g.id === id)}
        />
      )}{" "}
      {creating && (
        <Modal
          title="Tạo cộng đồng"
          onClose={() => {
            if (!busy) setCreating(false);
          }}
        >
          <form className="form-stack" onSubmit={create}>
            {error && <Notice error>{error}</Notice>}
            <Field label="Tên cộng đồng">
              <input name="name" required minLength={3} maxLength={150} />
            </Field>
            <Field label="Giới thiệu">
              <textarea
                name="description"
                required
                minLength={20}
                maxLength={2000}
              />
            </Field>
            <button className="button" disabled={busy}>
              Tạo nhóm
            </button>
          </form>
        </Modal>
      )}
    </Page>
  );
}
function GroupFeed({ id, group }: { id: string; group?: RecordData }) {
  const [page, setPage] = useState(1);
  const result = useRemote(
    () =>
      api
        .get(`/communities/${id}/posts`, { params: { page, limit: 10 } })
        .then(listResult),
    [id, page],
  );
  const [joined, setJoined] = useState(!!group?.isJoined);
  useEffect(() => {
    if (group) setJoined(!!group.isJoined);
  }, [group?.id, group?.isJoined]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const user = useAuthStore((s) => s.user);
  async function join() {
    setBusy(true);
    setError("");
    try {
      const r = await api.post(`/communities/${id}/join`);
      const data = payload(r);
      setJoined(typeof data?.isJoined === "boolean" ? data.isJoined : !joined);
      toast.success("Đã cập nhật tư cách thành viên.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function post(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    setError("");
    try {
      await api.post(`/communities/${id}/posts`, {
        content: String(f.get("content")).trim(),
      });
      form.reset();
      result.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel form-stack">
      <div className="section-heading">
        <h2>{group?.name || "Bài viết trong cộng đồng"}</h2>
        {user && (
          <button className="button secondary" disabled={busy} onClick={join}>
            {joined ? "Rời nhóm" : "Tham gia nhóm"}
          </button>
        )}
      </div>
      {error && <Notice error>{error}</Notice>}
      {joined && user && (
        <form className="form-stack" onSubmit={post}>
          <Field label="Chia sẻ với cộng đồng">
            <textarea
              name="content"
              required
              minLength={1}
              maxLength={5000}
              rows={4}
            />
          </Field>
          <button className="button" disabled={busy}>
            Đăng bài
          </button>
        </form>
      )}
      <RemoteState {...result} />
      {result.data && (
        <>
          {result.data.items.length ? (
            result.data.items.map((p) => (
              <CommunityPost key={p.id} post={p} groupId={id} />
            ))
          ) : (
            <Empty>Chưa có bài viết.</Empty>
          )}
          <Pager page={page} pages={result.data.pages} onChange={setPage} />
        </>
      )}
    </section>
  );
}

function CommunityPost({
  post,
  groupId,
}: {
  post: RecordData;
  groupId: string;
}) {
  const user = useAuthStore((s) => s.user);
  const [liked, setLiked] = useState(!!post.isLiked);
  const [likes, setLikes] = useState(Number(post.likeCount ?? post.likes ?? 0));
  const [showComments, setShowComments] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function like() {
    setBusy(true);
    setError("");
    try {
      const data = payload(
        await api.post(`/communities/${groupId}/posts/${post.id}/like`),
      );
      setLikes(Number(data.likeCount));
      setLiked(!!data.isLiked);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/community?group=${encodeURIComponent(groupId)}`,
      );
      toast.success("Đã sao chép liên kết nhóm.");
    } catch {
      toast.error("Không thể sao chép liên kết.");
    }
  }
  return (
    <article className="timeline-item">
      <strong>
        {post.author?.fullName || post.author?.name || post.user?.fullName}
      </strong>
      <p className="prose">{post.content}</p>
      <small>{new Date(post.createdAt).toLocaleString("vi-VN")}</small>
      {error && <Notice error>{error}</Notice>}
      <div className="actions">
        <button
          className="button secondary"
          aria-pressed={liked}
          disabled={!user || busy}
          onClick={like}
        >
          {liked ? "Đã thích" : "Thích"} · {likes}
        </button>
        <button
          className="button secondary"
          aria-expanded={showComments}
          onClick={() => setShowComments((v) => !v)}
        >
          Bình luận
        </button>
        <button className="button secondary" onClick={share}>
          Chia sẻ
        </button>
      </div>
      {showComments && <PostComments groupId={groupId} postId={post.id} />}
    </article>
  );
}
function PostComments({
  groupId,
  postId,
}: {
  groupId: string;
  postId: string;
}) {
  const [page, setPage] = useState(1);
  const path = `/communities/${groupId}/posts/${postId}/comments`;
  const result = useRemote(
    () => api.get(path, { params: { page, limit: 10 } }).then(listResult),
    [path, page],
  );
  const user = useAuthStore((s) => s.user);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    try {
      await api.post(path, {
        content: String(new FormData(form).get("content")).trim(),
      });
      form.reset();
      result.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <RemoteState {...result} />
      {result.data && (
        <>
          {result.data.items.length ? (
            result.data.items.map((c) => (
              <div className="timeline-item" key={c.id}>
                <strong>{c.author?.fullName || c.user?.fullName}</strong>
                <p>{c.content}</p>
              </div>
            ))
          ) : (
            <Empty>Chưa có bình luận.</Empty>
          )}
          <Pager page={page} pages={result.data.pages} onChange={setPage} />
        </>
      )}
      {user && (
        <form className="form-stack" onSubmit={submit}>
          {error && <Notice error>{error}</Notice>}
          <Field label="Bình luận của bạn">
            <textarea name="content" required maxLength={2000} />
          </Field>
          <button className="button" disabled={busy}>
            Gửi bình luận
          </button>
        </form>
      )}
    </section>
  );
}
