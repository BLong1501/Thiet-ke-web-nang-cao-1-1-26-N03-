import axios from "axios";
import { api } from "./api";
import type { Campaign, User } from "../types";

/**
 * Ranh giới dữ liệu API: payload từ máy chủ chưa được kiểm tra schema ở runtime nên các
 * trang đọc thuộc tính "lỏng". Đây là chủ ý và chỉ khai báo `any` ở đúng 3 chỗ dưới đây;
 * mọi nơi khác trong `src/` đều dùng kiểu cụ thể hoặc `unknown`.
 * Hướng nâng cấp tiếp theo: parse bằng zod ở `payload()` cho từng endpoint.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RecordData = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const payload = (response: any) => response.data?.data;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function listResult(response: any): {
  items: RecordData[];
  total: number;
  pages: number;
} {
  const data = payload(response);
  const meta = response.data?.meta || data?.meta || {};
  const items = Array.isArray(data) ? data : data?.items || [];
  return {
    items,
    total: Number(meta.total ?? meta.totalItems ?? items.length),
    pages: Math.max(1, Number(meta.totalPages || 1)),
  };
}
export function normalizeUser(u: RecordData): User {
  return {
    id: String(u.id),
    name: u.fullName || u.name || "",
    email: u.email || "",
    role: String(u.role || "USER").toLowerCase() as User["role"],
    avatar: u.avatarUrl || u.avatar,
    isVerified:
      u.verification?.status === "APPROVED" || u.role === "FUNDRAISER",
    bio: u.bio || "",
    phoneNumber: u.phoneNumber || "",
    joinedAt: u.createdAt || u.joinedAt || "",
  };
}
export function normalizeCampaign(c: RecordData): Campaign {
  return {
    ...c,
    id: String(c.id),
    title: c.title,
    description: c.story || "",
    shortDesc: c.shortDescription || "",
    category: c.category?.slug || "khac",
    categoryName:
      typeof c.category?.name === "string" ? c.category.name : undefined,
    targetAmount: Number(c.targetAmount || 0),
    raisedAmount: Number(c.currentAmount || 0),
    donorCount: Number(c._count?.donations || c.donorCount || 0),
    deadline: c.endDate,
    status: c.status,
    creator: normalizeUser(c.fundraiser || {}),
    thumbnail: c.coverImageUrl || "/campaign-placeholder.svg",
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}
/** Các đoạn đường dẫn tĩnh dưới `/campaigns/` mà slug không được trùng. */
const RESERVED_CAMPAIGN_SEGMENTS = new Set(["create"]);
/**
 * Đường dẫn tới trang chi tiết chiến dịch. Ưu tiên slug (thân thiện SEO), quay về id
 * khi thiếu slug. Máy chủ tra cứu theo `/campaigns/:idOrSlug` nên cả hai đều hợp lệ.
 */
export function campaignPath(c: { id?: unknown; slug?: unknown }): string {
  const slug = typeof c.slug === "string" ? c.slug.trim() : "";
  const key =
    slug && !RESERVED_CAMPAIGN_SEGMENTS.has(slug.toLowerCase())
      ? slug
      : String(c.id ?? "");
  return `/campaigns/${encodeURIComponent(key)}`;
}
/** Mã HTTP của lỗi từ máy chủ; `undefined` khi là lỗi mạng/timeout hoặc lỗi phía trình duyệt. */
export function httpStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: unknown } | undefined)
      ?.message;
    if (typeof message === "string" && message) return message;
    if (error.code === "ECONNABORTED")
      return "Máy chủ phản hồi quá lâu. Vui lòng thử lại.";
    if (!error.response)
      return "Không kết nối được máy chủ. Kiểm tra kết nối rồi thử lại.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Có lỗi xảy ra. Vui lòng thử lại.";
}
export function safeUrl(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  try {
    const url = new URL(value, window.location.origin);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
export function privateUploadPath(value: string): string | null {
  try {
    const base = new URL(api.defaults.baseURL!, window.location.origin);
    const url = new URL(value, base.origin);
    return url.origin === base.origin &&
      /^\/api\/v1\/uploads\/[0-9a-f-]+$/i.test(url.pathname)
      ? url.pathname.replace("/api/v1", "")
      : null;
  } catch {
    return null;
  }
}
export function downloadCsv(
  filename: string,
  headings: string[],
  rows: unknown[][],
) {
  const cell = (v: unknown) => {
    let s = String(v ?? "");
    if (/^\s*[=+@\-]/.test(s) || /^[\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const blob = new Blob(
    [
      "\uFEFF" +
        [headings, ...rows].map((row) => row.map(cell).join(",")).join("\r\n"),
    ],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const statusLabels: Record<string, string> = {
  DRAFT: "Bản nháp",
  PENDING_APPROVAL: "Chờ duyệt",
  ACTIVE: "Đang hoạt động",
  PAUSED: "Tạm dừng",
  COMPLETED: "Hoàn tất",
  REJECTED: "Từ chối",
  CANCELLED: "Đã hủy",
  PENDING: "Đang chờ",
  APPROVED: "Đã duyệt",
  SUCCESS: "Thành công",
  FAILED: "Hết hiệu lực",
  EXPIRED: "Hết hiệu lực",
  REFUNDED: "Đã hoàn tiền",
  SUSPENDED: "Tạm khóa",
  BANNED: "Đã khóa",
};
