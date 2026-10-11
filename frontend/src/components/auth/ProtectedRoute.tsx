import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { Empty, Page } from "../ui/WorkspaceUI";
export default function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: ReactNode;
  requiredRole?: "ADMIN" | "FUNDRAISER";
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
  if (requiredRole && role !== "ADMIN" && role !== requiredRole)
    return (
      <Page title="Bạn chưa có quyền truy cập">
        <Empty>
          {requiredRole === "FUNDRAISER" ? (
            <>
              Hãy hoàn thành xác minh danh tính để bắt đầu gây quỹ.
              <p>
                <Link className="button" to="/profile?tab=kyc">
                  Xác minh danh tính
                </Link>
              </p>
            </>
          ) : (
            <>
              Khu vực này dành cho quản trị viên.
              <p>
                <Link to="/dashboard">Về bảng điều khiển</Link>
              </p>
            </>
          )}
        </Empty>
      </Page>
    );
  return <>{children}</>;
}
