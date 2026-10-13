import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import type { IconType } from "react-icons";
import {
  LuFlag,
  LuHandHeart,
  LuHistory,
  LuLayoutDashboard,
  LuReceipt,
  LuShieldCheck,
  LuTags,
  LuUsers,
} from "react-icons/lu";

const ITEMS: [to: string, label: string, icon: IconType][] = [
  ["/admin", "Tổng quan", LuLayoutDashboard],
  ["/admin/campaigns", "Chiến dịch", LuHandHeart],
  ["/admin/verifications", "Hồ sơ KYC", LuShieldCheck],
  ["/admin/users", "Người dùng", LuUsers],
  ["/admin/categories", "Danh mục", LuTags],
  ["/admin/donations", "Giao dịch", LuReceipt],
  ["/admin/reports", "Báo cáo", LuFlag],
  ["/admin/activity-logs", "Nhật ký hệ thống", LuHistory],
];

export default function AdminNav() {
  const ref = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  useEffect(() => {
    const nav = ref.current;
    const active = nav?.querySelector<HTMLElement>(".active");
    if (!nav || !active) return;
    nav.scrollLeft =
      active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
  }, [pathname]);
  return (
    <nav ref={ref} className="tabs subnav admin-nav" aria-label="Quản trị">
      {ITEMS.map(([to, label, Icon]) => (
        <NavLink key={to} to={to} end>
          <Icon aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
