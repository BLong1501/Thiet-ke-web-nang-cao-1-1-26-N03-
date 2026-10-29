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
import { useAdminPendingCounts } from "../hooks/useAdminPendingCounts";

type NavPendingKey = "campaigns" | "disbursements" | "refunds" | "verifications" | "reports";

const ITEMS: [to: string, label: string, icon: IconType, pendingKey?: NavPendingKey][] = [
  ["/admin", "Tổng quan", LuLayoutDashboard],
  ["/admin/campaigns", "Chiến dịch", LuHandHeart, "campaigns"],
  ["/admin/disbursements", "Duyệt giải ngân", LuBanknote, "disbursements"],
  ["/admin/refunds", "Duyệt hoàn tiền", LuRotateCcw, "refunds"],
  ["/admin/verifications", "Hồ sơ KYC", LuShieldCheck, "verifications"],
  ["/admin/users", "Người dùng", LuUsers],
  ["/admin/categories", "Danh mục", LuTags],
  ["/admin/donations", "Giao dịch", LuReceipt],
  ["/admin/reports", "Báo cáo vi phạm", LuFlag, "reports"],
  ["/admin/activity-logs", "Nhật ký hoạt động", LuHistory],
];

export default function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const { data: counts } = useAdminPendingCounts();

  const getPendingCount = (key?: NavPendingKey): number => {
    if (!counts || !key) return 0;
    if (key === "campaigns") return counts.campaigns?.total || 0;
    return (counts as any)[key] || 0;
  };

  return (
    <div
      className="admin-navigation-bar"
      role="navigation"
      aria-label="Quản trị"
    >
      {ITEMS.map(([to, label, Icon, pendingKey]) => {
        const pendingCount = getPendingCount(pendingKey);
        const hasPending = pendingCount > 0;

        return (
          <NavLink
            key={to}
            to={to}
            end
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                isActive ? "active" : "",
                hasPending ? "has-pending" : "",
              ]
                .filter(Boolean)
                .join(" ")
            }
            title={
              hasPending
                ? `${label} (Có ${pendingCount} yêu cầu chờ phê duyệt)`
                : label
            }
          >
            <Icon aria-hidden="true" />
            <span className="admin-nav-label">{label}</span>
            {hasPending && (
              <span
                className="admin-nav-badge"
                aria-label={`${pendingCount} yêu cầu chờ phê duyệt`}
              >
                {pendingCount > 99 ? "99+" : pendingCount}
              </span>
            )}
          </NavLink>
        );
      })}
    </div>
  );
}
