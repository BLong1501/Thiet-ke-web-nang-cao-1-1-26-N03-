import { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { authApi } from "../../services/api";
import { errorMessage } from "../../services/platform";
import toast from "react-hot-toast";
export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  async function signOut() {
    setBusy(true);
    try {
      await authApi.logout();
      logout();
      navigate("/");
      setOpen(false);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <header className="site-header">
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      <div className="container nav-inner">
        <Link className="brand" to="/" onClick={() => setOpen(false)}>
          <span className="brand-mark">F</span>FundTrust
        </Link>
        <button
          className="button secondary mobile-toggle"
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen(!open)}
        >
          Menu
        </button>
        <nav
          id="primary-nav"
          className={open ? "primary-nav open" : "primary-nav"}
          aria-label="Điều hướng chính"
        >
          <NavLink to="/campaigns" onClick={() => setOpen(false)}>
            Chiến dịch
          </NavLink>
          <NavLink to="/how-it-works" onClick={() => setOpen(false)}>
            Cách hoạt động
          </NavLink>
          <NavLink to="/community" onClick={() => setOpen(false)}>
            Cộng đồng
          </NavLink>
          {isAuthenticated ? (
            <>
              <NavLink to="/dashboard" onClick={() => setOpen(false)}>
                Bảng điều khiển
              </NavLink>
              {user?.role?.toUpperCase() === "ADMIN" && (
                <NavLink to="/admin" onClick={() => setOpen(false)}>
                  Quản trị
                </NavLink>
              )}
              <NavLink to="/profile" onClick={() => setOpen(false)}>
                Hồ sơ
              </NavLink>
              <NavLink to="/notifications" onClick={() => setOpen(false)}>
                Thông báo
              </NavLink>
              <NavLink
                to={
                  user?.role?.toUpperCase() === "ADMIN"
                    ? "/admin/activity-logs"
                    : "/activity-logs"
                }
                onClick={() => setOpen(false)}
              >
                {user?.role?.toUpperCase() === "ADMIN"
                  ? "Nhật ký hệ thống"
                  : "Nhật ký của tôi"}
              </NavLink>
              <button
                className="button secondary"
                disabled={busy}
                onClick={signOut}
              >
                {busy ? "Đang thoát…" : "Đăng xuất"}
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={() => setOpen(false)}>
                Đăng nhập
              </NavLink>
              <Link
                className="button"
                to="/register"
                onClick={() => setOpen(false)}
              >
                Tham gia
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
