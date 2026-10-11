import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { profileApi, verificationApi } from "../services/api";
import {
  errorMessage,
  normalizeUser,
  payload,
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
import DonationHistory from "../components/DonationHistory";
import toast from "react-hot-toast";
export default function ProfilePage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "info";
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
      <nav className="tabs" aria-label="Mục hồ sơ">
        {[
          ["info", "Thông tin cá nhân"],
          ["kyc", "Xác minh danh tính"],
          ["history", "Lịch sử đóng góp"],
          ["security", "Mật khẩu"],
        ].map(([id, name]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setParams({ tab: id })}
          >
            {name}
          </button>
        ))}
      </nav>
      {tab === "info" && (
        <>
          <RemoteState {...profile} />
          {profile.data && <ProfileForm data={profile.data} />}
        </>
      )}
      {tab === "kyc" && <KycForm />}
      {tab === "history" && <DonationHistory />}
      {tab === "security" && <PasswordForm />}
    </Page>
  );
}
function ProfileForm({ data }: { data: RecordData }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
        avatarUrl: String(f.get("avatar")).trim(),
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
      <Field label="Ảnh đại diện (URL công khai)">
        <input
          name="avatar"
          type="url"
          pattern="https?://.*"
          maxLength={500}
          defaultValue={data.avatarUrl || ""}
        />
      </Field>
      <Field label="Giới thiệu">
        <textarea
          name="bio"
          maxLength={500}
          rows={4}
          defaultValue={data.bio || ""}
        />
      </Field>
      <button className="button" disabled={busy}>
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
