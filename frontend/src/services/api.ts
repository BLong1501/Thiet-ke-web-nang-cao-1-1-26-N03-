import axios from "axios";
import { useAuthStore } from "../store/authStore";

const rawApiUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1").trim();
const BASE_URL = rawApiUrl.endsWith("/api/v1")
  ? rawApiUrl
  : `${rawApiUrl.replace(/\/+$/, "")}/api/v1`;

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 20000,
});

// Request interceptor - attach token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;
// Share a refresh request across concurrent callers.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const request = error.config;
    const previousToken = useAuthStore.getState().token;
    if (
      error.response?.status === 401 &&
      request &&
      !request._retry &&
      previousToken &&
      (!request.url?.startsWith("/auth/") ||
        ["/auth/me", "/auth/logout"].includes(request.url))
    ) {
      request._retry = true;
      // A late 401 may refer to the previous token after another request refreshed it.
      const sentToken = request.headers?.Authorization;
      if (sentToken && sentToken !== `Bearer ${previousToken}`) {
        request.headers.Authorization = `Bearer ${previousToken}`;
        return api(request);
      }
      try {
        if (!refreshPromise)
          refreshPromise = axios
            .post(
              `${BASE_URL}/auth/refresh-token`,
              {},
              { withCredentials: true, timeout: 20000 },
            )
            .then((r) => {
              const token = r.data?.data?.accessToken;
              if (!token) throw new Error("Phiên đăng nhập không hợp lệ");
              return token;
            })
            .finally(() => {
              refreshPromise = null;
            });
        const token = await refreshPromise;
        const currentToken = useAuthStore.getState().token;
        if (currentToken !== previousToken && currentToken !== token)
          return Promise.reject(error);
        useAuthStore.setState({ token });
        request.headers.Authorization = `Bearer ${token}`;
        return api(request);
      } catch (refreshError: unknown) {
        if (
          axios.isAxiosError(refreshError) &&
          [401, 403].includes(refreshError.response?.status ?? 0) &&
          useAuthStore.getState().token === previousToken
        )
          useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }
    if (error.response?.status === 401 && request?._retry) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);

// --- Auth APIs ---
export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  register: (data: {
    fullName: string;
    email: string;
    password: string;
    phoneNumber?: string;
  }) => api.post("/auth/register", data),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
  verifyEmail: (data: { email: string; otp: string }) =>
    api.post("/auth/verify-email", data),
  resendOtp: (email: string) => api.post("/auth/resend-otp", { email }),
  forgotPassword: (email: string) =>
    api.post("/auth/forgot-password", { email }),
  resetPassword: (data: { email: string; otp: string; newPassword: string }) =>
    api.post("/auth/reset-password", data),
};

// --- Upload APIs ---
export const uploadApi = {
  uploadFile: async (
    file: File,
  ): Promise<{ id: string; fileName: string; downloadUrl: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post("/uploads", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data?.data || res.data;
  },
  uploadPublicImage: async (
    file: File,
  ): Promise<{ id: string; fileName: string; url: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post("/uploads/public", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data?.data || res.data;
  },
};

// --- Campaign APIs ---
export const campaignApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get("/campaigns", { params }),
  getById: (idOrSlug: string) => api.get(`/campaigns/${idOrSlug}`),
  getMyCampaigns: (params?: Record<string, unknown>) =>
    api.get("/campaigns/my/list", { params }),
  getPending: (params?: Record<string, unknown>) =>
    api.get("/campaigns/admin/pending", { params }),
  create: (data: Record<string, unknown>) => api.post("/campaigns", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/campaigns/${id}`, data),
  review: (
    id: string,
    data: { status: "ACTIVE" | "REJECTED"; rejectionReason?: string },
  ) => api.patch(`/campaigns/${id}/review`, data),
  addMedia: (
    id: string,
    data: {
      mediaType: "IMAGE" | "VIDEO" | "DOCUMENT";
      url: string;
      caption?: string;
    },
  ) => api.post(`/campaigns/${id}/media`, data),
  postUpdate: (id: string, data: { title: string; content: string }) =>
    api.post(`/campaigns/${id}/updates`, data),
  addDisbursement: (
    id: string,
    data: {
      title: string;
      amount: number;
      disbursementDate: string;
      proofDocuments: string[];
      note?: string;
    },
  ) => api.post(`/campaigns/${id}/disbursements`, data),
  getCategories: () => api.get("/campaigns/categories"),
};

// --- Donation APIs ---
export const donationApi = {
  create: (data: {
    campaignId: string;
    amount: number;
    donorName?: string;
    donorEmail?: string;
    donorPhone?: string;
    message?: string;
    isAnonymous?: boolean;
    paymentMethod?: string;
    requestKey?: string;
  }) => api.post("/donations", data),
  confirmPayment: (
    id: string,
    data?: { gatewayTransactionNo?: string; note?: string },
  ) => api.post(`/donations/${id}/confirm`, data || {}),
  getCampaignDonations: (
    campaignId: string,
    params?: Record<string, unknown>,
  ) => api.get(`/donations/campaign/${campaignId}`, { params }),
  getMyDonations: (params?: Record<string, unknown>) =>
    api.get("/donations/my/history", { params }),
  getCampaignTimeline: (campaignId: string) =>
    api.get(`/donations/campaign/${campaignId}/timeline`),
  getAllForAdmin: (params?: Record<string, unknown>) =>
    api.get("/donations/admin/all", { params }),
  getById: (id: string) => api.get(`/donations/${id}`),
};

// --- Verification APIs (KYC) ---
export const verificationApi = {
  submit: (data: {
    idCardNumber: string;
    frontCardImage: string;
    backCardImage: string;
    portraitImage: string;
    cardIssuedDate?: string;
    cardIssuedPlace?: string;
    supportingDocuments?: unknown;
  }) => api.post("/verifications/request", data),
  getMyStatus: () => api.get("/verifications/my-status"),
  getPending: (params?: Record<string, unknown>) =>
    api.get("/verifications/pending", { params }),
  getById: (id: string) => api.get(`/verifications/${id}`),
  review: (
    id: string,
    data: { status: "APPROVED" | "REJECTED"; rejectionReason?: string },
  ) => api.patch(`/verifications/${id}/review`, data),
};

// --- Profile & User APIs ---
export const profileApi = {
  getMyProfile: () => api.get("/profile/me"),
  updateProfile: (data: {
    fullName?: string;
    phoneNumber?: string;
    avatarUrl?: string;
    bio?: string;
  }) => api.put("/profile/me", data),
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    api.put("/profile/change-password", data),
};

export const userApi = {
  getUsers: (params?: Record<string, unknown>) => api.get("/users", { params }),
  getUserDetail: (id: string) => api.get(`/users/${id}`),
  updateUserStatus: (
    id: string,
    data: { status: "ACTIVE" | "SUSPENDED" | "BANNED"; reason?: string },
  ) => api.patch(`/users/${id}/status`, data),
};

// --- Activity Log APIs (Admin) ---
export const activityLogApi = {
  getMyLogs: (params?: Record<string, unknown>) =>
    api.get("/activity-logs/me", { params }),
  getLogs: (params?: Record<string, unknown>) =>
    api.get("/activity-logs", { params }),
  getStats: (params?: { from?: string; to?: string }) =>
    api.get("/activity-logs/stats", { params }),
  getLogById: (id: string) => api.get(`/activity-logs/${id}`),
  getUserLogs: (userId: string, params?: Record<string, unknown>) =>
    api.get(`/activity-logs/user/${userId}`, { params }),
};

// --- Notification APIs ---
export const notificationApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/notifications", { params }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/read-all"),
};

// --- Report APIs ---
export const reportApi = {
  create: (data: {
    targetType: "CAMPAIGN" | "USER" | "POST" | "COMMENT";
    targetId: string;
    reason: string;
    description?: string;
  }) => api.post("/reports", data),
  resolve: (id: string, data: { resolution: string; status: string }) =>
    api.patch(`/admin/reports/${id}/resolve`, data),
};

// --- Community APIs ---
export const communityApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/communities", { params }),
  create: (data: { name: string; description: string }) =>
    api.post("/communities", data),
  join: (id: string) => api.post(`/communities/${id}/join`),
  listPosts: (id: string, params?: Record<string, unknown>) =>
    api.get(`/communities/${id}/posts`, { params }),
  createPost: (id: string, data: { content: string }) =>
    api.post(`/communities/${id}/posts`, data),
  listComments: (
    communityId: string,
    postId: string,
    params?: Record<string, unknown>,
  ) =>
    api.get(`/communities/${communityId}/posts/${postId}/comments`, { params }),
  createComment: (
    communityId: string,
    postId: string,
    data: { content: string },
  ) => api.post(`/communities/${communityId}/posts/${postId}/comments`, data),
  likePost: (communityId: string, postId: string) =>
    api.post(`/communities/${communityId}/posts/${postId}/like`),
};

// --- Helper Functions ---
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
};

export const getDaysLeft = (deadline: string): number => {
  const now = new Date();
  const end = new Date(deadline);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export const getProgress = (raised: number, target: number): number => {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((raised / target) * 100));
};
