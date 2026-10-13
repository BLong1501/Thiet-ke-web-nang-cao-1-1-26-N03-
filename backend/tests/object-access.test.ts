import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { CampaignStatus, UserRole } from "@prisma/client";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "object-access-test-secret";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "mysql://test:test@127.0.0.1:1/test_not_connected";

let assertObjectAccess: typeof import("../src/core/auth/object-access").assertObjectAccess;
let assertAnyObjectAccess: typeof import("../src/core/auth/object-access").assertAnyObjectAccess;
let CampaignService: typeof import("../src/modules/campaigns/campaign.service").CampaignService;
let NotificationService: typeof import("../src/modules/notifications/notification.service").NotificationService;
let CommunityService: typeof import("../src/modules/communities/community.service").CommunityService;
let restoreAudit: () => void;

before(async () => {
  const audit = await import("../src/core/services/audit.service");
  const original = audit.auditService.log.bind(audit.auditService);
  audit.auditService.log = async () => {};
  restoreAudit = () => {
    audit.auditService.log = original;
  };

  ({ assertObjectAccess, assertAnyObjectAccess } = await import("../src/core/auth/object-access"));
  ({ CampaignService } = await import("../src/modules/campaigns/campaign.service"));
  ({ NotificationService } = await import("../src/modules/notifications/notification.service"));
  ({ CommunityService } = await import("../src/modules/communities/community.service"));
});

after(() => {
  restoreAudit?.();
});

function sampleCampaign(id: string, status: CampaignStatus, fundraiserId = "owner-1") {
  return {
    id,
    slug: `slug-${id}`,
    fundraiserId,
    title: `Chiến dịch ${id}`,
    targetAmount: 1_000_000,
    currentAmount: 0,
    bankAccountNumber: "0123456789",
    bankName: "VCB",
    bankAccountName: "NGUYEN VAN A",
    endDate: new Date(Date.now() + 86400000),
    status,
    beneficiaryInfo: JSON.stringify({ taxCode: "SECRET-TAX" }),
  };
}

test("assertObjectAccess: khách chưa đăng nhập -> 401", async () => {
  await assert.rejects(
    () =>
      assertObjectAccess({
        actor: null,
        ownerId: "owner-1",
        entityName: "Campaign",
        entityId: "c1",
      }),
    (err: any) => err.statusCode === 401
  );
});

test("assertObjectAccess: user khác chủ sở hữu -> 403", async () => {
  await assert.rejects(
    () =>
      assertObjectAccess({
        actor: { userId: "attacker", role: UserRole.USER },
        ownerId: "owner-1",
        entityName: "Campaign",
        entityId: "c1",
      }),
    (err: any) => err.statusCode === 403
  );
});

test("assertObjectAccess: chủ sở hữu và ADMIN được phép", async () => {
  await assertObjectAccess({
    actor: { userId: "owner-1", role: UserRole.FUNDRAISER },
    ownerId: "owner-1",
    entityName: "Campaign",
    entityId: "c1",
  });
  await assertObjectAccess({
    actor: { userId: "admin-1", role: UserRole.ADMIN },
    ownerId: "owner-1",
    entityName: "Campaign",
    entityId: "c1",
  });
});

test("assertAnyObjectAccess: donor hoặc chủ chiến dịch đều được đọc donation", async () => {
  await assertAnyObjectAccess({
    actor: { userId: "fundraiser-1", role: UserRole.FUNDRAISER },
    ownerIds: ["donor-1", "fundraiser-1"],
    entityName: "Donation",
    entityId: "d1",
  });
});

test("GET /campaigns?status=DRAFT bị chặn với khách/user", async () => {
  const service = new CampaignService({} as any);
  await assert.rejects(
    () =>
      service.getCampaigns(
        { page: 1, limit: 10, sortBy: "newest", status: CampaignStatus.DRAFT },
        { userId: "user-a", role: UserRole.USER }
      ),
    (err: any) => err.statusCode === 403
  );
});

test("GET /campaigns/:id bản nháp của người khác trả 404, không lộ tồn tại", async () => {
  const draftId = "11111111-1111-4111-8111-111111111111";
  const draft = sampleCampaign(draftId, CampaignStatus.DRAFT, "owner-1");
  const service = new CampaignService({
    findById: async () => draft,
    findBySlug: async () => null,
    findLedgerNetByCampaignIds: async () => new Map([[draftId, 0]]),
  } as any);

  await assert.rejects(
    () => service.getCampaignDetail(draftId, { userId: "attacker", role: UserRole.USER }),
    (err: any) => err.statusCode === 404
  );

  const ownerView = await service.getCampaignDetail(draftId, {
    userId: "owner-1",
    role: UserRole.FUNDRAISER,
  });
  assert.equal(ownerView.campaign.bankAccountNumber, "0123456789");
  assert.equal(ownerView.campaign.taxCode, "SECRET-TAX");
});

test("GET /campaigns/:id công khai ẩn STK với khách", async () => {
  const publicId = "22222222-2222-4222-8222-222222222222";
  const active = sampleCampaign(publicId, CampaignStatus.ACTIVE, "owner-1");
  const service = new CampaignService({
    findById: async () => active,
    findBySlug: async () => null,
    findLedgerNetByCampaignIds: async () => new Map([[publicId, 0]]),
  } as any);

  const guest = await service.getCampaignDetail(publicId);
  assert.equal(guest.campaign.bankAccountNumber, null);
  assert.equal(guest.campaign.taxCode, null);
  assert.equal(guest.campaign.status, CampaignStatus.ACTIVE);
});

test("PATCH thông báo của người khác -> 403", async () => {
  const service = new NotificationService({
    findById: async () => ({ id: "n1", userId: "owner-1", isRead: false }),
    markRead: async () => {
      throw new Error("không được gọi khi IDOR");
    },
  } as any);

  await assert.rejects(
    () => service.markRead("attacker", UserRole.USER, "n1"),
    (err: any) => err.statusCode === 403
  );
});

test("Comment/like cộng đồng yêu cầu tư cách thành viên", async () => {
  const service = new CommunityService({
    findById: async () => ({ id: "com-1", isPrivate: false, name: "Nhóm" }),
    isMember: async () => false,
    findPostInCommunity: async () => ({ id: "post-1" }),
  } as any);

  await assert.rejects(
    () => service.createComment("user-a", "com-1", "post-1", { content: "xin chào cộng đồng" }),
    (err: any) => err.statusCode === 403
  );
  await assert.rejects(
    () => service.toggleLike("user-a", "com-1", "post-1"),
    (err: any) => err.statusCode === 403
  );
});
