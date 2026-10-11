import { NavLink } from "react-router-dom";
export default function AdminNav() {
  return (
    <nav className="tabs admin-nav" aria-label="Quản trị">
      {[
        ["/admin", "Tổng quan"],
        ["/admin/campaigns", "Chiến dịch"],
        ["/admin/verifications", "Hồ sơ KYC"],
        ["/admin/users", "Người dùng"],
        ["/admin/categories", "Danh mục"],
        ["/admin/donations", "Giao dịch"],
        ["/admin/reports", "Báo cáo"],
        ["/admin/activity-logs", "Nhật ký hệ thống"],
      ].map(([to, label]) => (
        <NavLink key={to} to={to} end>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
