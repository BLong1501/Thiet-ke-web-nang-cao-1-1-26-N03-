import { useEffect, useRef, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  LuBell,
  LuChevronDown,
  LuHistory,
  LuLogOut,
  LuMenu,
  LuUserRound,
  LuX,
} from "react-icons/lu";
import { useAuthStore } from "../../store/authStore";
import { authApi } from "../../services/api";
import { errorMessage, safeUrl } from "../../services/platform";
import { useUnreadNotifications } from "../../hooks/useUnreadNotifications";
import { Dropdown } from "../ui/Dropdown";
import toast from "react-hot-toast";
import AdminNav from "../AdminNav";

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (
    words
      .slice(-2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?"
  );
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const unread = useUnreadNotifications(isAuthenticated);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";
  const name = user?.name || user?.email || "Tài khoản";
  const avatar = safeUrl(user?.avatar);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

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

  const accountActions = isAuthenticated ? (
    <>
      <NavLink
        to="/notifications"
        className="nav-icon-link"
        onClick={close}
        aria-label={
          unread > 0 ? `Thông báo, ${unread} chưa đọc` : "Thông báo"
        }
        data-tooltip="Thông báo"
      >
        <LuBell aria-hidden="true" />
        {unread > 0 && (
          <span className="nav-badge" aria-hidden="true">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </NavLink>
      <Dropdown
        label={`Tài khoản ${name}`}
        triggerClassName="account-trigger"
        onOpen={close}
        trigger={
          <>
            <span className="avatar" aria-hidden="true">
              {avatar ? <img src={avatar} alt="" /> : initials(name)}
            </span>
            <span className="account-name">{name}</span>
            <LuChevronDown aria-hidden="true" />
          </>
        }
      >
        <div className="dropdown-header">
          <strong>{name}</strong>
          {user?.email && <span>{user.email}</span>}
        </div>
        <NavLink to="/profile">
          <LuUserRound aria-hidden="true" />
          Hồ sơ
        </NavLink>
        <NavLink to={isAdmin ? "/admin/activity-logs" : "/activity-logs"}>
          <LuHistory aria-hidden="true" />
          {isAdmin ? "Nhật ký hoạt động" : "Nhật ký của tôi"}
        </NavLink>
        <div className="dropdown-separator" role="presentation" />
        <button
          type="button"
          disabled={busy}
          aria-busy={busy}
          onClick={signOut}
        >
          <LuLogOut aria-hidden="true" />
          {busy ? "Đang thoát…" : "Đăng xuất"}
        </button>
      </Dropdown>
    </>
  ) : null;

  return (
    <header
      className={isAdmin ? "site-header site-header--admin" : "site-header"}
      ref={headerRef}
    >
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      <div className="container nav-inner">
        <Link className="brand" to={isAdmin ? "/admin" : "/"} onClick={close}>
          <img
            className="brand-mark"
            src="/logo.png"
            alt=""
            width={40}
            height={40}
          />
          FundTrust
        </Link>
        {isAdmin ? (
          <>
            <div className="nav-actions">{accountActions}</div>
            <div className="admin-nav-row" id="primary-nav">
              <AdminNav onNavigate={close} />
            </div>
          </>
        ) : (
          <nav className="main-nav" aria-label="Điều hướng chính">
            <div
              id="primary-nav"
              className={open ? "primary-nav open" : "primary-nav"}
            >
              <NavLink to="/campaigns" onClick={close}>
                Chiến dịch
              </NavLink>
              <NavLink to="/how-it-works" onClick={close}>
                Cách hoạt động
              </NavLink>
              <NavLink to="/community" onClick={close}>
                Cộng đồng
              </NavLink>
              {isAuthenticated ? (
                <NavLink to="/dashboard" onClick={close}>
                  Bảng điều khiển
                </NavLink>
              ) : (
                <div className="nav-auth">
                  <NavLink to="/login" onClick={close}>
                    Đăng nhập
                  </NavLink>
                  <Link className="button" to="/register" onClick={close}>
                    Tham gia
                  </Link>
                </div>
              )}
            </div>
            <div className="nav-actions">
              {accountActions}
              <button
                ref={toggleRef}
                type="button"
                className="icon-button mobile-toggle"
                aria-label="Menu"
                aria-expanded={open}
                aria-controls="primary-nav"
                onClick={() => setOpen(!open)}
              >
                {open ? (
                  <LuX aria-hidden="true" />
                ) : (
                  <LuMenu aria-hidden="true" />
                )}
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
