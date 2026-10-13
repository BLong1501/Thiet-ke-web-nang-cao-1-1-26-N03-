import type { Campaign } from "../../types";
import { getDaysLeft, getProgress } from "../../services/api";
import { normalizeCampaign, type RecordData } from "../../services/platform";

export type Phase = "funded" | "ending" | "ended" | "open";

export interface HomeCampaign {
  campaign: Campaign;
  progress: number;
  daysLeft: number;
  phase: Phase;
  /**
   * Số người ủng hộ có giao dịch đã được máy chủ xác nhận (`donorCount` của API).
   * Không dùng `_count.donations` vì trường đó gồm cả giao dịch đang chờ.
   */
  supporters?: number;
}

export function toHomeCampaign(raw: RecordData): HomeCampaign {
  const campaign = normalizeCampaign(raw);
  const progress = getProgress(campaign.raisedAmount, campaign.targetAmount);
  const daysLeft = getDaysLeft(campaign.deadline);
  const phase: Phase =
    progress >= 100
      ? "funded"
      : daysLeft === 0
        ? "ended"
        : daysLeft <= 7
          ? "ending"
          : "open";
  const supporters = Number(raw.donorCount);
  return {
    campaign,
    progress,
    daysLeft,
    phase,
    supporters: Number.isFinite(supporters) ? supporters : undefined,
  };
}

export function daysLabel({ phase, daysLeft }: HomeCampaign) {
  return phase === "ended" ? "Đã kết thúc" : `Còn ${daysLeft} ngày`;
}

const RESIZABLE_HOSTS = new Set(["images.unsplash.com"]);

/** Đổi tham số `w` cho CDN ảnh hỗ trợ resize; các nguồn khác giữ nguyên URL. */
function resized(url: string, width: number) {
  try {
    const u = new URL(url, window.location.origin);
    if (!RESIZABLE_HOSTS.has(u.hostname)) return null;
    u.searchParams.set("w", String(width));
    return u.toString();
  } catch {
    return null;
  }
}

/** `srcSet` cho ảnh chiến dịch khi nguồn hỗ trợ; tránh tải ảnh 1200px cho ô thu nhỏ. */
export function imageSources(url: string, widths: number[]) {
  const candidates = widths
    .map((w) => {
      const src = resized(url, w);
      return src ? `${src} ${w}w` : null;
    })
    .filter(Boolean);
  if (candidates.length !== widths.length) return { src: url };
  return {
    src: resized(url, widths[widths.length - 1]) ?? url,
    srcSet: candidates.join(", "),
  };
}
