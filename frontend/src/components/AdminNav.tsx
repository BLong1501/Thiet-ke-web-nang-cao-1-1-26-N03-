import { NavLink } from "react-router-dom";
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
  LuBanknote,
  LuRotateCcw,
} from "react-icons/lu";

const ITEMS: [to: string, label: string, icon: IconType][] = [
  ["/admin", "Tổng quan", LuLayoutDashboard],
  ["/admin/campaigns", "Chiến dịch", LuHandHeart],
  ["/admin/disbursements", "Duyệt giải ngân", LuBanknote],
  ["/admin/refunds", "Duyệt hoàn tiền", LuRotateCcw],
  ["/admin/verifications", "Hồ sơ KYC", LuShieldCheck],
  ["/admin/users", "Người dùng", LuUsers],
  ["/admin/categories", "Danh mục", LuTags],
  ["/admin/donations", "Giao dịch", LuReceipt],
  ["/admin/reports", "Báo cáo vi phạm", LuFlag],
  ["/admin/activity-logs", "Nhật ký hoạt động", LuHistory],
];

export default function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div
      className="admin-navigation-bar"
      role="navigation"
      aria-label="Quản trị"
    >
      {ITEMS.map(([to, label, Icon]) => (
        <NavLink key={to} to={to} end onClick={onNavigate}>
          <Icon aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </div>
  );
}
