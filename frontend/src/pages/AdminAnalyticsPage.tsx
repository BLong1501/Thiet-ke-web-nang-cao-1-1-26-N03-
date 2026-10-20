import { Navigate } from "react-router-dom";

/** Đã gộp vào /admin (Tổng quan). Giữ route cũ để không gãy bookmark. */
export default function AdminAnalyticsPage() {
  return <Navigate to="/admin" replace />;
}
