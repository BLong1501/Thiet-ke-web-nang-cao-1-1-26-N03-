import { Response } from "express";
import { redisService } from "../database/redis";
import type { CampaignQueryInput } from "../../modules/campaigns/campaign.validation";

export type CacheStatus = "HIT" | "MISS";

/** Mọi khóa đọc công khai của chiến dịch dùng chung tiền tố này để vô hiệu hóa một lần. */
export const CAMPAIGN_CACHE_PREFIX = "cache:campaigns:";

export const CampaignCacheTTL = {
  list: 60,
  detail: 45,
  categories: 300,
  donations: 30,
} as const;

export const campaignCacheKeys = {
  list(query: CampaignQueryInput): string {
    return (
      `${CAMPAIGN_CACHE_PREFIX}list:` +
      `p=${query.page}:l=${query.limit}` +
      `:c=${query.categoryId ?? ""}` +
      `:q=${encodeURIComponent(query.search ?? "")}` +
      `:s=${query.status ?? "ACTIVE"}` +
      `:o=${query.sortBy ?? "newest"}`
    );
  },
  detail(idOrSlug: string): string {
    return `${CAMPAIGN_CACHE_PREFIX}detail:${idOrSlug}`;
  },
  categories(isActiveOnly: boolean): string {
    return `${CAMPAIGN_CACHE_PREFIX}categories:${isActiveOnly ? "active" : "all"}`;
  },
  donations(campaignId: string, page: number, limit: number): string {
    return `${CAMPAIGN_CACHE_PREFIX}donations:${campaignId}:p=${page}:l=${limit}`;
  },
};

export async function readCampaignCache<T>(key: string): Promise<T | null> {
  return redisService.getJSON<T>(key);
}

export async function writeCampaignCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await redisService.setJSON(key, value, ttlSeconds);
}

/**
 * Ghi dữ liệu chiến dịch làm thay đổi danh sách, chi tiết, danh mục hoặc bảng ủng hộ.
 * Vô hiệu hóa toàn bộ khóa công khai cùng tiền tố.
 */
export async function invalidatePublicCampaignCache(): Promise<void> {
  await redisService.delByPrefix(CAMPAIGN_CACHE_PREFIX);
}

export function applyPublicCacheHeaders(
  res: Response,
  cacheStatus: CacheStatus,
  maxAgeSeconds: number
): void {
  res.setHeader("X-Cache", cacheStatus);
  res.setHeader(
    "Cache-Control",
    `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 2}`
  );
}
