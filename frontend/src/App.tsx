import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { queryClient } from "./services/queryClient";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import SessionGate from "./components/auth/SessionGate";
import ErrorBoundary from "./components/ErrorBoundary";
import { NotFound } from "./components/ui/WorkspaceUI";
const HomePage = lazy(() => import("./pages/HomePage"));
const CampaignsPage = lazy(() => import("./pages/CampaignsPage"));
const CampaignDetailPage = lazy(() => import("./pages/CampaignDetailPage"));
const CreateCampaignPage = lazy(() => import("./pages/CreateCampaignPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const HowItWorksPage = lazy(() => import("./pages/HowItWorksPage"));
const CommunityPage = lazy(() => import("./pages/CommunityPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const AdminReportsPage = lazy(() => import("./pages/AdminReportsPage"));
const InformationPage = lazy(() => import("./pages/InformationPage"));
const DonationDetailPage = lazy(() => import("./pages/DonationDetailPage"));
const AdminHomePage = lazy(() => import("./pages/AdminHomePage"));
const AdminDonationsPage = lazy(() =>
  import("./pages/AdminHomePage").then((m) => ({
    default: m.AdminDonationsPage,
  })),
);
const AdminCampaignsPage = lazy(() => import("./pages/AdminCampaignsPage"));
const AdminVerificationsPage = lazy(
  () => import("./pages/AdminVerificationsPage"),
);
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const AdminCategoriesPage = lazy(() => import("./pages/AdminCategoriesPage"));
const AdminActivityLogsPage = lazy(
  () => import("./pages/AdminActivityLogsPage"),
);
const UserActivityLogsPage = lazy(() => import("./pages/UserActivityLogsPage"));
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
export default function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ScrollToTop />
            <SessionGate>
              <Navbar />
              <main id="main" className="app-main">
                <Suspense
                  fallback={
                    <div className="loading-state" role="status">
                      Đang tải trang…
                    </div>
                  }
                >
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/campaigns" element={<CampaignsPage />} />
                    <Route
                      path="/campaigns/create"
                      element={
                        <ProtectedRoute requiredRole="FUNDRAISER">
                          <CreateCampaignPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/campaigns/:id/edit"
                      element={
                        <ProtectedRoute requiredRole="FUNDRAISER">
                          <CreateCampaignPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/campaigns/:id"
                      element={<CampaignDetailPage />}
                    />
                    <Route
                      path="/donations/:id"
                      element={<DonationDetailPage />}
                    />
                    {(
                      [
                        ["/login", "login"],
                        ["/register", "register"],
                        ["/verify-email", "verify"],
                        ["/forgot-password", "forgot"],
                        ["/reset-password", "reset"],
                      ] as const
                    ).map(([path, mode]) => (
                      <Route
                        key={path}
                        path={path}
                        element={<AuthPage key={mode} mode={mode} />}
                      />
                    ))}
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <DashboardPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <ProfilePage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/community" element={<CommunityPage />} />
                    <Route
                      path="/notifications"
                      element={
                        <ProtectedRoute>
                          <NotificationsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/reports"
                      element={
                        <ProtectedRoute requiredRole="ADMIN">
                          <AdminReportsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/how-it-works" element={<HowItWorksPage />} />
                    <Route path="/terms" element={<InformationPage />} />
                    <Route
                      path="/privacy"
                      element={<InformationPage privacy />}
                    />
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute requiredRole="ADMIN">
                          <AdminHomePage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/campaigns"
                      element={
                        <ProtectedRoute requiredRole="ADMIN">
                          <AdminCampaignsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/verifications"
                      element={
                        <ProtectedRoute requiredRole="ADMIN">
                          <AdminVerificationsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/users"
                      element={
                        <ProtectedRoute requiredRole="ADMIN">
                          <AdminUsersPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/categories"
                      element={
                        <ProtectedRoute requiredRole="ADMIN">
                          <AdminCategoriesPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/donations"
                      element={
                        <ProtectedRoute requiredRole="ADMIN">
                          <AdminDonationsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/activity-logs"
                      element={
                        <ProtectedRoute requiredRole="ADMIN">
                          <AdminActivityLogsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/activity-logs"
                      element={
                        <ProtectedRoute>
                          <UserActivityLogsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </main>
              <Footer />
            </SessionGate>
            <Toaster
              position="top-right"
              containerStyle={{ zIndex: "var(--z-toast)" }}
              toastOptions={{
                duration: 4500,
                style: {
                  maxWidth: "26rem",
                  padding: "var(--space-3) var(--space-4)",
                  color: "var(--color-text)",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-md)",
                  fontSize: "var(--text-sm)",
                  lineHeight: "var(--leading-normal)",
                },
                success: {
                  iconTheme: { primary: "#047857", secondary: "#fff" },
                },
                error: {
                  iconTheme: { primary: "#b91c1c", secondary: "#fff" },
                },
              }}
            />
          </BrowserRouter>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}
