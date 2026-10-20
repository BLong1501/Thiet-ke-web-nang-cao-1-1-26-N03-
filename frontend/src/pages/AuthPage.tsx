import { useState, type FormEvent } from "react";
import {
  Link,
  Navigate,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { authApi } from "../services/api";
import { errorMessage, normalizeUser, payload } from "../services/platform";
import { useAuthStore } from "../store/authStore";
import { Field, Notice, Page } from "../components/ui/WorkspaceUI";
type Mode = "login" | "register" | "verify" | "forgot" | "reset";
const titles: Record<Mode, string> = {
  login: "Chào mừng bạn trở lại",
  register: "Bắt đầu hành trình sẻ chia",
  verify: "Xác minh email",
  forgot: "Quên mật khẩu",
  reset: "Đặt lại mật khẩu",
};

/** Admin → Tổng quan; mọi tài khoản khác → trang chủ. */
function postLoginPath(role: string | undefined): string {
  return String(role || "").toUpperCase() === "ADMIN" ? "/admin" : "/";
}

export default function AuthPage({ mode }: { mode: Mode }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(params.get("email") || "");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otp, setOtp] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { isAuthenticated, setUser, user } = useAuthStore();
  const destination = postLoginPath(user?.role);
  if (isAuthenticated && ["login", "register", "verify"].includes(mode))
    return <Navigate to={destination} replace />;
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setMessage("");
    if (["register", "reset"].includes(mode) && password !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setBusy(true);
    try {
      const cleanEmail = email.trim();
      if (mode === "login" || mode === "verify") {
        const r =
          mode === "login"
            ? await authApi.login({ email: cleanEmail, password })
            : await authApi.verifyEmail({ email: cleanEmail, otp });
        const data = payload(r);
        if (!data?.accessToken || !data?.user)
          throw new Error("Phản hồi đăng nhập không hợp lệ.");
        const nextUser = normalizeUser(data.user);
        setUser(nextUser, data.accessToken);
        navigate(postLoginPath(nextUser.role), { replace: true });
      } else if (mode === "register") {
        await authApi.register({
          fullName: name.trim(),
          email: cleanEmail,
          password,
        });
        navigate(`/verify-email?email=${encodeURIComponent(cleanEmail)}`);
      } else if (mode === "forgot") {
        await authApi.forgotPassword(cleanEmail);
        navigate(`/reset-password?email=${encodeURIComponent(cleanEmail)}`);
      } else {
        await authApi.resetPassword({
          email: cleanEmail,
          otp,
          newPassword: password,
        });
        setPassword("");
        setConfirm("");
        setMessage("Mật khẩu đã được cập nhật. Bạn có thể đăng nhập.");
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    if (!email || busy) return;
    setBusy(true);
    setError("");
    try {
      await authApi.resendOtp(email.trim());
      setMessage("Đã gửi lại mã xác minh. Vui lòng kiểm tra email.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title={titles[mode]}>
      <div className="auth-layout">
        <aside className="auth-story">
          <span className="eyebrow">MỖI ĐÓNG GÓP ĐỀU CÓ Ý NGHĨA</span>
          <h2>
            Một cộng đồng.
            <br />
            Nhiều điều tốt đẹp.
          </h2>
          <p>
            Theo dõi những chiến dịch bạn quan tâm, đóng góp và nhìn thấy sự
            thay đổi từ lòng tốt của mình.
          </p>
          <Link to="/campaigns">Khám phá các chiến dịch →</Link>
        </aside>
        <form className="panel form-stack" onSubmit={submit}>
          {error && <Notice error>{error}</Notice>}
          {message && <Notice>{message}</Notice>}
          {mode === "register" && (
            <Field label="Họ và tên">
              <input
                required
                minLength={2}
                maxLength={150}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
          )}
          <Field label="Email">
            <input
              required
              type="email"
              maxLength={255}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          {["verify", "reset"].includes(mode) && (
            <Field
              label="Mã OTP trong email"
              hint="Nhập 6 chữ số được gửi đến email của bạn."
            >
              <input
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </Field>
          )}
          {["login", "register", "reset"].includes(mode) && (
            <>
              <Field label={mode === "reset" ? "Mật khẩu mới" : "Mật khẩu"}>
                <div className="password-field">
                  <input
                    required
                    type={visible ? "text" : "password"}
                    aria-label={mode === "reset" ? "Mật khẩu mới" : "Mật khẩu"}
                    minLength={mode === "login" ? 1 : 6}
                    maxLength={100}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {visible ? "Ẩn" : "Hiện"}
                  </button>
                </div>
              </Field>
              {mode !== "login" && (
                <Field label="Nhập lại mật khẩu">
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </Field>
              )}
            </>
          )}
          {mode === "register" && (
            <label className="check">
              <input type="checkbox" required /> Tôi đồng ý với{" "}
              <Link to="/terms">điều khoản</Link> và{" "}
              <Link to="/privacy">chính sách riêng tư</Link>.
            </label>
          )}
          <button className="button" disabled={busy}>
            {busy
              ? "Đang xử lý…"
              : {
                  login: "Đăng nhập",
                  register: "Tạo tài khoản",
                  verify: "Xác minh",
                  forgot: "Gửi mã khôi phục",
                  reset: "Cập nhật mật khẩu",
                }[mode]}
          </button>
          {mode === "login" && (
            <>
              <Link to="/forgot-password">Quên mật khẩu?</Link>
              <Link to={`/verify-email?email=${encodeURIComponent(email)}`}>
                Xác minh tài khoản chưa kích hoạt
              </Link>
              <p>
                Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
              </p>
            </>
          )}
          {mode === "verify" && (
            <button
              className="button secondary"
              type="button"
              disabled={busy || !email}
              onClick={resend}
            >
              Gửi lại mã OTP
            </button>
          )}
          {mode !== "login" && <Link to="/login">Trở về đăng nhập</Link>}
        </form>
      </div>
    </Page>
  );
}
