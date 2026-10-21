import { useEffect, useState, type FormEvent, type ChangeEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { communityApi, uploadApi } from "../services/api";
import {
  errorMessage,
  listResult,
  payload,
  safeUrl,
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
    () => communityApi.list({ page, limit: 12 }).then(listResult),
    [page],
    { keepPrevious: true },
  );
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const r = await communityApi.create({
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
    () => communityApi.listPosts(id, { page, limit: 10 }).then(listResult),
    [id, page],
    { keepPrevious: true },
  );
  const [groupData, setGroupData] = useState<RecordData | undefined>(group);
  const groupId: unknown = groupData?.id || group?.id;
  const groupJoined = !!(groupData?.isJoined ?? group?.isJoined);
  const [joined, setJoined] = useState(groupJoined);
  const [images, setImages] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const user = useAuthStore((s) => s.user);

  // Tải thông tin cộng đồng nếu người dùng truy cập trực tiếp qua đường dẫn
  useEffect(() => {
    if (id) {
      communityApi
        .get(id)
        .then((res) => {
          const d = payload(res);
          if (d) {
            setGroupData(d);
            if (typeof d.isJoined === "boolean") {
              setJoined(d.isJoined);
            }
          }
        })
        .catch(() => {});
    }
  }, [id]);

  useEffect(() => {
    if (groupId !== undefined) setJoined(groupJoined);
  }, [groupId, groupJoined]);

  async function join() {
    setBusy(true);
    setError("");
    try {
      const r = await communityApi.join(id);
      const data = payload(r);
      const isNowJoined =
        typeof data?.isJoined === "boolean" ? data.isJoined : !joined;
      setJoined(isNowJoined);
      if (isNowJoined) {
        toast.success(
          `🎉 Bạn đã tham gia cộng đồng ${groupData?.name || group?.name || ""}!`,
        );
        result.reload();
      } else {
        toast.success("Đã rời khỏi nhóm.");
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    setImagePreviews((prev) => [...prev, blobUrl]);
    setUploadingImage(true);
    try {
      const res = await uploadApi.uploadPublicImage(file);
      if (res?.url) {
        setImages((prev) => [...prev, res.url]);
        toast.success("Đã tải ảnh lên thành công");
      }
    } catch (err) {
      toast.error("Không thể tải ảnh: " + errorMessage(err));
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
    setImagePreviews((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function post(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const content = String(f.get("content")).trim();
    if (!content && images.length === 0) {
      setError("Vui lòng nhập nội dung bài viết hoặc đính kèm ảnh");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await communityApi.createPost(id, {
        content,
        mediaUrls: images.length ? images : undefined,
      });
      form.reset();
      setImages([]);
      setImagePreviews([]);
      result.reload();
      toast.success("Đã đăng bài viết mới!");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const groupName = groupData?.name || group?.name || "Cộng đồng chia sẻ";
  const groupDesc =
    groupData?.description ||
    group?.description ||
    "Tham gia nhóm cộng đồng để cùng thảo luận, chia sẻ hình ảnh và kết nối yêu thương.";
  const memberCount =
    groupData?.memberCount ??
    group?.memberCount ??
    group?._count?.members ??
    1;
  const isPrivate = !!(groupData?.isPrivate ?? group?.isPrivate);

  return (
    <section className="panel form-stack">
      <div className="section-heading">
        <div>
          <h2>{groupName}</h2>
          <small style={{ color: "#64748b" }}>
            {memberCount} thành viên · {isPrivate ? "🔒 Nhóm riêng tư" : "🌐 Nhóm công khai"}
          </small>
        </div>
        {user && (
          <button className="button secondary" disabled={busy} onClick={join}>
            {joined ? "Rời nhóm" : "Tham gia nhóm"}
          </button>
        )}
      </div>

      {error && <Notice error>{error}</Notice>}

      {/* Giao diện xem trước (Preview) khi người dùng mở liên kết mà chưa tham gia */}
      {!joined && (
        <div
          className="community-preview-card"
          style={{
            padding: "32px 24px",
            background: "linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            textAlign: "center",
            margin: "12px 0 20px",
            boxShadow: "0 4px 16px -2px rgba(0, 0, 0, 0.05)",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              background: "#eff6ff",
              color: "#2563eb",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
              fontSize: "26px",
            }}
          >
            👥
          </div>
          <h3
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: "#0f172a",
              marginBottom: "8px",
            }}
          >
            {groupName}
          </h3>
          <p
            style={{
              maxWidth: "540px",
              margin: "0 auto 20px",
              color: "#475569",
              fontSize: "15px",
              lineHeight: "1.6",
            }}
          >
            {groupDesc}
          </p>
          {user ? (
            <button
              className="button primary"
              style={{
                padding: "12px 32px",
                fontSize: "15px",
                fontWeight: "600",
                borderRadius: "10px",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
              }}
              disabled={busy}
              onClick={join}
            >
              🚀 Tham gia cộng đồng ngay
            </button>
          ) : (
            <Link
              to={`/login?redirect=${encodeURIComponent(`/community?group=${id}`)}`}
              className="button primary"
              style={{
                display: "inline-block",
                padding: "12px 32px",
                fontSize: "15px",
                fontWeight: "600",
                borderRadius: "10px",
                textDecoration: "none",
              }}
            >
              Đăng nhập để tham gia nhóm
            </Link>
          )}
        </div>
      )}

      {/* Form đăng bài (khi đã là thành viên) kèm chức năng đính kèm ảnh */}
      {joined && user && (
        <form className="form-stack" onSubmit={post}>
          <Field label="Chia sẻ với cộng đồng">
            <textarea
              name="content"
              placeholder="Bạn muốn chia sẻ điều gì cùng cộng đồng? Nhập nội dung hoặc đính kèm ảnh..."
              required={images.length === 0}
              minLength={1}
              maxLength={5000}
              rows={3}
            />
          </Field>

          {/* Danh sách ảnh đã đính kèm xem trước */}
          {images.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                marginBottom: "10px",
              }}
            >
              {images.map((imgUrl, idx) => (
                <div
                  key={idx}
                  style={{
                    position: "relative",
                    width: "88px",
                    height: "88px",
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                  }}
                >
                  <img
                    src={safeUrl(imagePreviews[idx] || imgUrl)}
                    alt="Đính kèm"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    style={{
                      position: "absolute",
                      top: "4px",
                      right: "4px",
                      background: "rgba(0,0,0,0.65)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "50%",
                      width: "20px",
                      height: "20px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      lineHeight: 1,
                    }}
                    title="Xóa ảnh"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                background: "#f1f5f9",
                borderRadius: "8px",
                cursor: uploadingImage ? "not-allowed" : "pointer",
                fontSize: "13px",
                color: "#334155",
                fontWeight: "500",
                border: "1px solid #e2e8f0",
              }}
            >
              <span>📷 {uploadingImage ? "Đang tải ảnh..." : "Đính kèm ảnh"}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                disabled={uploadingImage || busy}
                onChange={handleImageUpload}
                style={{ display: "none" }}
              />
            </label>

            <button
              className="button primary"
              disabled={busy || uploadingImage}
              style={{ padding: "8px 20px" }}
            >
              {busy ? "Đang đăng..." : "Đăng bài"}
            </button>
          </div>
        </form>
      )}

      {/* Danh sách bài viết */}
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

  // Trích xuất mediaUrls an toàn (mảng hoặc chuỗi JSON)
  let postImages: string[] = [];
  if (post.mediaUrls) {
    if (Array.isArray(post.mediaUrls)) {
      postImages = post.mediaUrls as string[];
    } else if (typeof post.mediaUrls === "string") {
      try {
        const parsed = JSON.parse(post.mediaUrls);
        if (Array.isArray(parsed)) postImages = parsed;
      } catch {}
    }
  }

  async function like() {
    setBusy(true);
    setError("");
    try {
      const data = payload(await communityApi.likePost(groupId, post.id));
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
      toast.success("Đã sao chép liên kết nhóm cộng đồng.");
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

      {/* Hiển thị ảnh đính kèm nếu có */}
      {postImages.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            margin: "12px 0",
          }}
        >
          {postImages.map((imgUrl, i) => (
            <a
              key={i}
              href={safeUrl(imgUrl)}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "block",
                borderRadius: "10px",
                overflow: "hidden",
                border: "1px solid #e2e8f0",
                maxHeight: "300px",
                backgroundColor: "#f8fafc",
              }}
            >
              <img
                src={safeUrl(imgUrl)}
                alt="Ảnh bài đăng"
                style={{
                  maxHeight: "300px",
                  maxWidth: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </a>
          ))}
        </div>
      )}

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
          Chia sẻ liên kết
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
  const result = useRemote(
    () =>
      communityApi
        .listComments(groupId, postId, { page, limit: 10 })
        .then(listResult),
    [groupId, postId, page],
    { keepPrevious: true },
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
      await communityApi.createComment(groupId, postId, {
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
