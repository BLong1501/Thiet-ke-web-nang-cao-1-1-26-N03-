import test, { before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { CampaignStatus } from "@prisma/client";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "cache-test-secret";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "mysql://test:test@127.0.0.1:1/test_not_connected";

let sumLedgerRowsToNetMap: typeof import("../src/modules/campaigns/campaign.repository").sumLedgerRowsToNetMap;
let CampaignService: typeof import("../src/modules/campaigns/campaign.service").CampaignService;
let redisService: typeof import("../src/core/database/redis").redisService;
let CAMPAIGN_CACHE_PREFIX: typeof import("../src/core/cache/campaign-cache").CAMPAIGN_CACHE_PREFIX;
let campaignCacheKeys: typeof import("../src/core/cache/campaign-cache").campaignCacheKeys;
let invalidatePublicCampaignCache: typeof import("../src/core/cache/campaign-cache").invalidatePublicCampaignCache;

function sampleCampaign(id: string, currentAmount = 0) {
  return {
    id,
    slug: `slug-${id}`,
    title: `Chiến dịch ${id}`,
    targetAmount: 1_000_000,
    currentAmount,
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: CampaignStatus.ACTIVE,
    beneficiaryInfo: null,
  };
}

function mockRepo(
  campaigns: ReturnType<typeof sampleCampaign>[],
  onLedger: (ids: string[]) => void
) {
  return {
    findCampaigns: async () => campaigns,
    countCampaigns: async () => campaigns.length,
    findLedgerNetByCampaignIds: async (ids: string[]) => {
      onLedger(ids);
      return new Map(campaigns.map((item) => [item.id, Number(item.currentAmount)]));
    },
    findAllCategories: async () => [{ id: "cat-1", name: "Y tế", slug: "y-te", isActive: true }],
  };
}

before(async () => {
  ({ sumLedgerRowsToNetMap } = await import("../src/modules/campaigns/campaign.repository"));
  ({ CampaignService } = await import("../src/modules/campaigns/campaign.service"));
  ({ redisService } = await import("../src/core/database/redis"));
  ({
    CAMPAIGN_CACHE_PREFIX,
    campaignCacheKeys,
    invalidatePublicCampaignCache,
  } = await import("../src/core/cache/campaign-cache"));
});

beforeEach(async () => {
  if (invalidatePublicCampaignCache) {
    await invalidatePublicCampaignCache();
  }
});

test("Gộp sổ cái: một hàng RECEIPT và REFUND ra số dư ròng", () => {
  const net = sumLedgerRowsToNetMap(
    ["c1", "c2"],
    [
      { campaignId: "c1", kind: "RECEIPT", total: 150000 },
      { campaignId: "c1", kind: "REFUND", total: 50000 },
      { campaignId: "c2", kind: "RECEIPT", total: "200000" },
    ]
  );
  assert.equal(net.get("c1"), 100000);
  assert.equal(net.get("c2"), 200000);
});

test("Gộp sổ cái: chiến dịch không có bút toán = 0", () => {
  const net = sumLedgerRowsToNetMap(["empty"], []);
  assert.equal(net.get("empty"), 0);
  assert.equal(net.size, 1);
});

test("GET /campaigns: một lần đọc sổ cái cho cả trang, không N lần groupBy", async () => {
  const ledgerCalls: string[][] = [];
  const service = new CampaignService(
    mockRepo([sampleCampaign("c1", 10), sampleCampaign("c2", 20)], (ids) =>
      ledgerCalls.push(ids)
    ) as any
  );

  const result = await service.getCampaigns({ page: 1, limit: 10, sortBy: "newest" });

  assert.equal(ledgerCalls.length, 1, "chỉ một lần đọc sổ cái cho cả trang");
  assert.deepEqual(ledgerCalls[0], ["c1", "c2"]);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].currentAmount, 10);
  assert.equal(result.cacheStatus, "MISS");
});

test("GET /campaigns: lần 2 lấy từ bộ nhớ đệm, không đụng repository", async () => {
  let findCalls = 0;
  let ledgerCalls = 0;
  const service = new CampaignService(
    mockRepo([sampleCampaign("c3", 30)], () => {
      ledgerCalls += 1;
    }) as any
  );
  const originalFind = service["repo"].findCampaigns.bind(service["repo"]);
  service["repo"].findCampaigns = (async (...args: any[]) => {
    findCalls += 1;
    return originalFind(...args);
  }) as any;

  const query = { page: 1, limit: 10, sortBy: "newest" as const, search: "cache-hit-check" };
  const first = await service.getCampaigns(query);
  const second = await service.getCampaigns(query);

  assert.equal(first.cacheStatus, "MISS");
  assert.equal(second.cacheStatus, "HIT");
  assert.equal(findCalls, 1);
  assert.equal(ledgerCalls, 1);
  assert.equal(second.items[0].id, "c3");
});

test("Ghi chiến dịch làm mất hiệu lực cache danh sách", async () => {
  const service = new CampaignService(
    mockRepo([sampleCampaign("c4", 40)], () => undefined) as any
  );
  const query = { page: 2, limit: 5, sortBy: "newest" as const };
  await service.getCampaigns(query);
  const hit = await service.getCampaigns(query);
  assert.equal(hit.cacheStatus, "HIT");

  await invalidatePublicCampaignCache();
  const missed = await service.getCampaigns(query);
  assert.equal(missed.cacheStatus, "MISS");
});

test("GET /categories: HIT sau lần đọc đầu", async () => {
  let loads = 0;
  const service = new CampaignService({
    findAllCategories: async () => {
      loads += 1;
      return [{ id: "cat-1", name: "Giáo dục" }];
    },
  } as any);

  const first = await service.getCategories(true);
  const second = await service.getCategories(true);
  assert.equal(first.cacheStatus, "MISS");
  assert.equal(second.cacheStatus, "HIT");
  assert.equal(loads, 1);
  assert.equal(second.categories[0].name, "Giáo dục");
});

test("RedisService JSON + xóa theo tiền tố hoạt động với fallback RAM", async () => {
  const key = `${CAMPAIGN_CACHE_PREFIX}unit:${Date.now()}`;
  await redisService.setJSON(key, { ok: true }, 30);
  const stored = await redisService.getJSON<{ ok: boolean }>(key);
  assert.equal(stored?.ok, true);
  await redisService.delByPrefix(CAMPAIGN_CACHE_PREFIX);
  assert.equal(await redisService.getJSON(key), null);
});

test("Khóa cache danh sách phân biệt bộ lọc", () => {
  const a = campaignCacheKeys.list({ page: 1, limit: 10, sortBy: "newest" });
  const b = campaignCacheKeys.list({ page: 1, limit: 10, sortBy: "most_funded" });
  const c = campaignCacheKeys.list({ page: 1, limit: 10, sortBy: "newest", categoryId: "cat-9" });
  assert.notEqual(a, b);
  assert.notEqual(a, c);
});
