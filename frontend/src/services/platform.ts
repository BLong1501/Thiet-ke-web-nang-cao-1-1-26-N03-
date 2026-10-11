import { api } from "./api";
import type { Campaign, User } from "../types";

/** Wire records are normalized once at the API boundary. */
export type RecordData = Record<string, any>;
export const payload = (response: any) => response.data?.data;
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
export function errorMessage(error: any): string {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === "ECONNABORTED")
    return "Máy chủ phản hồi quá lâu. Vui lòng thử lại.";
  if (error?.isAxiosError && !error.response)
    return "Không kết nối được máy chủ. Kiểm tra kết nối rồi thử lại.";
  return error?.message || "Có lỗi xảy ra. Vui lòng thử lại.";
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
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
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
  FAILED: "Thất bại",
  REFUNDED: "Đã hoàn tiền",
  SUSPENDED: "Tạm khóa",
  BANNED: "Đã khóa",
};
