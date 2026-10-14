import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { Empty, Page } from "../ui/WorkspaceUI";
import { NoIndex } from "../Seo";
export default function ProtectedRoute({
  children,
  requiredRole,
  disallowAdmin = false,
}: {
  children: ReactNode;
  requiredRole?: "ADMIN" | "FUNDRAISER" | "USER";
  disallowAdmin?: boolean;
}) {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();
  if (!isAuthenticated)
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  const role = user?.role?.toUpperCase();

  // 1. Phân quyền nghiêm ngặt: Admin không vào trang chức năng của Fundraiser/Donor
  if (role === "ADMIN" && (disallowAdmin || requiredRole === "FUNDRAISER"))
    return (
      <Page title="Không có quyền truy cập">
        <Empty>
          Tài khoản Quản trị viên (Admin) không thể thực hiện chức năng của Người gây quỹ hoặc Nhà hảo tâm.
          <p>
            <Link className="button" to="/admin">
              Về trang Quản trị
            </Link>
          </p>
        </Empty>
      </Page>
    );

  // 2. Chặn người dùng không phải ADMIN vào trang quản trị
  if (requiredRole === "ADMIN" && role !== "ADMIN")
    return (
      <Page title="Bạn chưa có quyền truy cập">
        <Empty>
          Khu vực này dành riêng cho quản trị viên.
          <p>
            <Link to="/dashboard">Về bảng điều khiển</Link>
          </p>
        </Empty>
      </Page>
    );

  // 3. Chặn người dùng chưa KYC/chưa là FUNDRAISER vào trang tạo chiến dịch
  if (requiredRole === "FUNDRAISER" && role !== "FUNDRAISER")
    return (
      <Page title="Bạn chưa có quyền truy cập">
        <Empty>
          Hãy hoàn thành xác minh danh tính để bắt đầu gây quỹ.
          <p>
            <Link className="button" to="/profile?tab=kyc">
              Xác minh danh tính
            </Link>
          </p>
        </Empty>
      </Page>
    );
  return (
    <>
      <NoIndex />
      {children}
    </>
  );
}
