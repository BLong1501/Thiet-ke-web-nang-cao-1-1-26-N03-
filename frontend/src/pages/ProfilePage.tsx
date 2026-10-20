import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { profileApi, uploadApi, verificationApi } from "../services/api";
import {
  errorMessage,
  normalizeUser,
  payload,
  safeUrl,
  type RecordData,
} from "../services/platform";
import { useAuthStore } from "../store/authStore";
import { useRemote } from "../hooks/useRemote";
import {
  Page,
  Field,
  Notice,
  RemoteState,
  Status,
} from "../components/ui/WorkspaceUI";
import FileUploadInput from "../components/ui/FileUploadInput";
import Tabs from "../components/ui/Tabs";
import DonationHistory from "../components/DonationHistory";
import toast from "react-hot-toast";
const PROFILE_TABS = [
  { id: "info", label: "Thông tin cá nhân" },
  { id: "kyc", label: "Xác minh danh tính" },
  { id: "history", label: "Lịch sử đóng góp" },
  { id: "security", label: "Mật khẩu" },
];
export default function ProfilePage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  // `?tab=` không hợp lệ rơi về tab đầu tiên thay vì hiển thị trang trống.
  const tab = PROFILE_TABS.some((t) => t.id === requested)
    ? (requested as string)
    : "info";
  const profile = useRemote(() =>
    profileApi.getMyProfile().then((r) => {
      const data = payload(r);
      useAuthStore.getState().updateUser(normalizeUser(data));
      return data;
    }),
  );
  return (
    <Page
      title="Hồ sơ của bạn"
      intro="Quản lý tài khoản, xác minh danh tính và theo dõi đóng góp."
    >
      <Tabs
        label="Mục hồ sơ"
        tabs={PROFILE_TABS}
        value={tab}
        onChange={(id) => setParams({ tab: id })}
      >
        {tab === "info" && (
          <>
            <RemoteState {...profile} />
            {profile.data && <ProfileForm data={profile.data} />}
          </>
        )}
        {tab === "kyc" && <KycForm />}
        {tab === "history" && <DonationHistory />}
        {tab === "security" && <PasswordForm />}
      </Tabs>
    </Page>
  );
}
function ProfileForm({ data }: { data: RecordData }) {
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string>(data.avatarUrl || "");
  const preview = safeUrl(avatarUrl);

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/jpg"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      toast.error("Chọn ảnh PNG/JPEG tối đa 5MB.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const res = await uploadApi.uploadPublicImage(file);
      if (!res.url) throw new Error("Máy chủ chưa trả về đường dẫn ảnh.");
      setAvatarUrl(res.url);
      toast.success("Đã tải ảnh đại diện lên.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const r = await profileApi.updateProfile({
        fullName: String(f.get("name")).trim(),
        phoneNumber: String(f.get("phone")).trim(),
        bio: String(f.get("bio")).trim(),
        avatarUrl: avatarUrl.trim(),
      });
      useAuthStore
        .getState()
        .updateUser(normalizeUser({ ...data, ...payload(r) }));
      toast.success("Đã lưu hồ sơ.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel form-stack narrow" onSubmit={submit}>
      {error && <Notice error>{error}</Notice>}
      <Field label="Họ và tên">
        <input
          name="name"
          required
          minLength={2}
          maxLength={150}
          defaultValue={data.fullName}
        />
      </Field>
      <Field label="Email">
        <input type="email" value={data.email} readOnly />
      </Field>
      <Field label="Số điện thoại">
        <input
          name="phone"
          type="tel"
          pattern="(0|\+84)[35789][0-9]{8}"
          defaultValue={data.phoneNumber || ""}
        />
      </Field>
      <Field
        label="Ảnh đại diện"
        hint="Tải PNG/JPEG từ máy tính (tối đa 5MB), hoặc dán URL ảnh công khai."
      >
        <div className="cover-upload profile-avatar-upload">
          <div className="cover-upload__actions">
            <label
              className={`button secondary cover-upload__file ${uploading || busy ? "is-disabled" : ""}`}
            >
              {uploading ? "Đang tải ảnh lên…" : "Chọn ảnh từ máy tính"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                disabled={uploading || busy}
                onChange={handleAvatarFile}
              />
            </label>
            {avatarUrl && (
              <button
                type="button"
                className="cover-upload__remove"
                disabled={uploading || busy}
                onClick={() => setAvatarUrl("")}
              >
                Xóa ảnh
              </button>
            )}
          </div>
          {preview && (
            <div className="cover-upload__preview profile-avatar-preview">
              <img src={preview} alt="Ảnh đại diện xem trước" />
            </div>
          )}
          <input
            name="avatar"
            type="url"
            pattern="https?://.*"
            maxLength={500}
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="Hoặc dán đường dẫn ảnh https://..."
          />
        </div>
      </Field>
      <Field label="Giới thiệu">
        <textarea
          name="bio"
          maxLength={500}
          rows={4}
          defaultValue={data.bio || ""}
        />
      </Field>
      <button className="button" disabled={busy || uploading}>
        {busy ? "Đang lưu…" : "Lưu thông tin"}
      </button>
    </form>
  );
}
function PasswordForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setError("");
    if (f.get("password") !== f.get("confirm")) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setBusy(true);
    try {
      await profileApi.changePassword({
        oldPassword: String(f.get("old")),
        newPassword: String(f.get("password")),
      });
      form.reset();
      toast.success("Đã đổi mật khẩu.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel form-stack narrow" onSubmit={submit}>
      {error && <Notice error>{error}</Notice>}
      <Field label="Mật khẩu hiện tại">
        <input name="old" type="password" autoComplete="current-password" />
      </Field>
      <Field label="Mật khẩu mới">
        <input
          name="password"
          type="password"
          required
          minLength={6}
          maxLength={100}
          autoComplete="new-password"
        />
      </Field>
      <Field label="Nhập lại mật khẩu mới">
        <input
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
        />
      </Field>
      <button className="button" disabled={busy}>
        Đổi mật khẩu
      </button>
    </form>
  );
}
function KycForm() {
  const status = useRemote(() => verificationApi.getMyStatus().then(payload));
  const [images, setImages] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (
      !images.frontCardImage ||
      !images.backCardImage ||
      !images.portraitImage
    ) {
      setError("Hãy tải đủ ba ảnh trước khi gửi hồ sơ.");
      return;
    }
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await verificationApi.submit({
        idCardNumber: String(f.get("id")).trim(),
        cardIssuedDate: String(f.get("date")) || undefined,
        cardIssuedPlace: String(f.get("place")),
        frontCardImage: images.frontCardImage,
        backCardImage: images.backCardImage,
        portraitImage: images.portraitImage,
      });
      toast.success("Hồ sơ đã gửi, đang chờ quản trị viên xét duyệt.");
      status.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <RemoteState {...status} />
      {status.data && (
        <div className="narrow">
          {status.data.status && (
            <div className="panel">
              <Status value={status.data.status} />
              {status.data.verification?.rejectionReason && (
                <p>{status.data.verification.rejectionReason}</p>
              )}
              {status.data.status === "APPROVED" && (
                <p>
                  Hồ sơ đã được duyệt.{" "}
                  <Link to="/campaigns/create">Bắt đầu gây quỹ</Link>. Nếu quyền
                  chưa cập nhật, hãy tải lại trang.
                </p>
              )}
              {status.data.status === "PENDING" && (
                <p>
                  Hồ sơ đang được xét duyệt. Bạn có thể kiểm tra lại trạng thái
                  sau.
                </p>
              )}
              <button className="button secondary" onClick={status.reload}>
                Cập nhật trạng thái
              </button>
            </div>
          )}
          {!["PENDING", "APPROVED"].includes(status.data.status) && (
            <form className="panel form-stack" onSubmit={submit}>
              {error && <Notice error>{error}</Notice>}
              <Field label="Số CCCD / CMND">
                <input
                  name="id"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{9,20}"
                  defaultValue={status.data.verification?.idCardNumber || ""}
                />
              </Field>
              <div className="form-grid">
                <Field label="Ngày cấp">
                  <input
                    name="date"
                    type="date"
                    max={new Date().toLocaleDateString("en-CA")}
                  />
                </Field>
                <Field label="Nơi cấp">
                  <input name="place" maxLength={200} />
                </Field>
              </div>
              {[
                ["frontCardImage", "Ảnh mặt trước CCCD"],
                ["backCardImage", "Ảnh mặt sau CCCD"],
                ["portraitImage", "Ảnh chân dung cầm CCCD"],
              ].map(([key, label]) => (
                <FileUploadInput
                  key={key}
                  label={label}
                  required
                  value={images[key]}
                  onChange={(url) => setImages((v) => ({ ...v, [key]: url }))}
                />
              ))}
              <label className="check">
                <input type="checkbox" required />
                Tôi xác nhận các thông tin và giấy tờ này là của tôi.
              </label>
              <button className="button" disabled={busy}>
                {busy ? "Đang gửi…" : "Gửi hồ sơ xét duyệt"}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
