import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "activity-write-isolated-test-key";
process.env.DATABASE_URL = "mysql://test:test@127.0.0.1:1/test";
const actor = "11111111-1111-4111-8111-111111111111";
const entity = "22222222-2222-4222-8222-222222222222";
const event = "33333333-3333-4333-8333-333333333333";
let app: express.Express, audit: any, prisma: any;
let logs: any[] = [],
  queries: any[] = [],
  committed = false,
  occupied = false;
const restore: Array<() => void> = [];
function replace(target: any, key: string, value: any) {
  const old = target[key];
  restore.push(() => (target[key] = old));
  target[key] = value;
}
const auth = (role = "ADMIN") =>
  `Bearer ${jwt.sign({ userId: actor, role, email: "test@example.test" }, process.env.JWT_SECRET!, { expiresIn: "5m" })}`;
before(async () => {
  prisma = (await import("../src/core/database/prisma")).prisma;
  audit = (await import("../src/core/services/audit.service")).auditService;
  const repo = (await import("../src/modules/campaigns/campaign.repository"))
    .campaignRepository;
  const redis = (await import("../src/core/database/redis")).redisService;
  replace(redis, "delByPrefix", async () => {});
  replace(repo, "findCategoryById", async () => ({
    id: entity,
    name: "Danh mục",
  }));
  replace(repo, "countCampaigns", async () => (occupied ? 1 : 0));
  replace(repo, "deleteCategory", async () => {
    committed = true;
  });
  replace(prisma.auditLog, "create", async ({ data }: any) => {
    logs.push({ ...data, id: event, createdAt: new Date() });
    return logs.at(-1);
  });
  replace(prisma.auditLog, "findMany", async (args: any) => {
    queries.push(args);
    return logs.slice(args.skip, args.skip + args.take);
  });
  replace(prisma.auditLog, "count", async () => logs.length);
  replace(
    prisma.auditLog,
    "findUnique",
    async ({ where }: any) => logs.find((l) => l.id === where.id) ?? null,
  );
  app = express();
  app.use(express.json());
  app.use(
    "/campaigns",
    (await import("../src/modules/campaigns/campaign.routes")).campaignRouter,
  );
  app.use(
    "/activity-logs",
    (await import("../src/modules/activity-logs/activity-log.routes"))
      .activityLogRouter,
  );
  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(err.statusCode || 500).json({ message: err.message });
    },
  );
});
beforeEach(() => {
  logs = [];
  queries = [];
  committed = false;
  occupied = false;
});
after(async () => {
  restore.reverse().forEach((fn) => fn());
  (await import("../src/core/database/redis")).shutdownRedis();
  await prisma.$disconnect();
});
test("successful category deletion records real target and token actor, never body identity", async () => {
  const res = await request(app)
    .delete(`/campaigns/categories/${entity}`)
    .set("Authorization", auth())
    .send({ userId: entity, password: "secret", token: "secret" });
  assert.equal(res.status, 200);
  assert.equal(committed, true);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].userId, actor);
  assert.equal(logs[0].entityId, entity);
  assert.equal(logs[0].action, "DELETE_CATEGORY");
  assert.equal(logs[0].details.description, "Xóa danh mục");
  assert.ok(!JSON.stringify(logs).includes("secret"));
});
test("business rule failure prevents deletion and success audit", async () => {
  occupied = true;
  const res = await request(app)
    .delete(`/campaigns/categories/${entity}`)
    .set("Authorization", auth());
  assert.equal(res.status, 400);
  assert.equal(committed, false);
  assert.equal(logs.length, 0);
});
test("writer uses authenticated identity and allowlists all metadata", async () => {
  await audit.write({
    userId: entity,
    req: { user: { userId: actor } },
    action: "UPDATE_PROFILE",
    entityName: "User",
    entityId: actor,
    details: {
      password: "secret",
      bankAccountNumber: "secret",
      nested: { token: "secret" },
    },
  });
  assert.equal(logs[0].userId, actor);
  assert.deepEqual(logs[0].details, { description: "Cập nhật hồ sơ cá nhân" });
});
test("transaction writer propagates failure; post-commit logger preserves business result", async () => {
  await assert.rejects(
    audit.write(
      { action: "X", entityName: "User", entityId: actor },
      {
        auditLog: {
          create: async () => {
            throw new Error("rollback");
          },
        },
      },
    ),
    /rollback/,
  );
  const old = prisma.auditLog.create;
  prisma.auditLog.create = async () => {
    throw new Error("unavailable");
  };
  try {
    await assert.doesNotReject(
      audit.log({ action: "X", entityName: "User", entityId: actor }),
    );
  } finally {
    prisma.auditLog.create = old;
  }
});
test("filters, server pagination and stable newest-first order reach repository", async () => {
  const res = await request(app)
    .get("/activity-logs")
    .query({
      page: 2,
      limit: 5,
      search: "danh mục",
      userId: actor,
      action: "DELETE_CATEGORY",
      from: "2026-10-20",
      to: "2026-10-20",
    })
    .set("Authorization", auth());
  assert.equal(res.status, 200);
  const args = queries[0];
  assert.equal(args.skip, 5);
  assert.equal(args.take, 5);
  assert.equal(args.where.userId, actor);
  assert.equal(args.where.action, "DELETE_CATEGORY");
  assert.equal(
    args.where.createdAt.gte.toISOString(),
    "2026-10-19T17:00:00.000Z",
  );
  assert.equal(
    args.where.createdAt.lte.toISOString(),
    "2026-10-20T16:59:59.999Z",
  );
  assert.ok(
    args.where.OR.some((x: any) => x.details?.string_contains === "danh mục"),
  );
  assert.deepEqual(args.orderBy, [{ createdAt: "desc" }, { id: "desc" }]);
});
for (const query of [
  "from=bad",
  "from=2026-02-30",
  "from=2026-10-21&to=2026-10-20",
  "limit=101",
  "page=1.5",
  "userId=bad",
]) {
  test(`reject invalid query ${query}`, async () => {
    const res = await request(app)
      .get(`/activity-logs?${query}`)
      .set("Authorization", auth());
    assert.equal(res.status, 400);
    assert.equal(queries.length, 0);
  });
}
test("detail uses real lookup, hides historical sensitive metadata and handles missing ID", async () => {
  logs.push({
    id: event,
    action: "CREATE_CAMPAIGN",
    details: { bankAccountNumber: "secret" },
  });
  const res = await request(app)
    .get(`/activity-logs/${event}`)
    .set("Authorization", auth());
  assert.equal(res.status, 200);
  assert.equal(res.body.data.description, "Tạo chiến dịch");
  assert.ok(!JSON.stringify(res.body).includes("secret"));
  assert.equal(
    (
      await request(app)
        .get(`/activity-logs/${entity}`)
        .set("Authorization", auth())
    ).status,
    404,
  );
});
for (const role of ["USER", "FUNDRAISER"])
  test(`${role} denied list and detail`, async () => {
    for (const path of ["/activity-logs", `/activity-logs/${event}`])
      assert.equal(
        (await request(app).get(path).set("Authorization", auth(role))).status,
        403,
      );
    assert.equal(queries.length, 0);
  });
for (const method of ["post", "patch", "delete"] as const)
  test(`admin cannot ${method} audit records`, async () => {
    assert.equal(
      (
        await request(app)
          [method](
            method === "post" ? "/activity-logs" : `/activity-logs/${event}`,
          )
          .set("Authorization", auth())
          .send({ action: "FAKE" })
      ).status,
      404,
    );
  });
