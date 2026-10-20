/** Live smoke test. Creates then deletes one unique category; audit records are retained. */
require("dotenv").config({ quiet: true });
const assert = require("node:assert/strict");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const { prisma } = require("../dist/core/database/prisma");
const { shutdownRedis } = require("../dist/core/database/redis");
const app = require("../dist/app").default;
(async () => {
  if (process.env.ACTIVITY_LIVE_CHECK !== "1")
    throw new Error(
      "Set ACTIVITY_LIVE_CHECK=1 to allow creating/deleting a test category",
    );
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", status: "ACTIVE" },
    select: { id: true, email: true, role: true, fullName: true },
  });
  assert.ok(admin, "An active admin must exist");
  const token = jwt.sign(
    { userId: admin.id, email: admin.email, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: "5m" },
  );
  const headers = { Authorization: `Bearer ${token}` };
  const marker = `audit-check-${Date.now()}`;
  let categoryId;
  try {
    const created = await request(app)
      .post("/api/v1/campaigns/categories")
      .set(headers)
      .send({ name: `Kiểm thử nhật kí ${marker}`, slug: marker });
    assert.equal(created.status, 201);
    categoryId = created.body.data.id;
    let events = await prisma.auditLog.findMany({
      where: { entityId: categoryId },
    });
    assert.equal(events.length, 1);
    assert.equal(events[0].userId, admin.id);
    assert.equal(events[0].action, "CREATE_CATEGORY");
    const duplicate = await request(app)
      .post("/api/v1/campaigns/categories")
      .set(headers)
      .send({ name: `Kiểm thử nhật kí ${marker}`, slug: marker });
    assert.equal(duplicate.status, 400);
    assert.equal(
      await prisma.auditLog.count({ where: { entityId: categoryId } }),
      1,
    );
    const updated = await request(app)
      .put(`/api/v1/campaigns/categories/${categoryId}`)
      .set(headers)
      .send({ name: `Đã cập nhật ${marker}` });
    assert.equal(updated.status, 200);
    const now = new Date(),
      from = new Date(now.getTime() - 60000).toISOString(),
      to = new Date(now.getTime() + 60000).toISOString();
    const list = await request(app)
      .get("/api/v1/activity-logs")
      .query({
        search: categoryId,
        userId: admin.id,
        from,
        to,
        limit: 1,
        page: 1,
      })
      .set(headers);
    assert.equal(list.status, 200);
    assert.equal(list.body.data.items.length, 1);
    assert.equal(list.body.meta.total, 2);
    assert.equal(list.body.meta.totalPages, 2);
    const second = await request(app)
      .get("/api/v1/activity-logs")
      .query({ search: categoryId, limit: 1, page: 2 })
      .set(headers);
    assert.equal(second.status, 200);
    assert.notEqual(second.body.data.items[0].id, list.body.data.items[0].id);
    const filtered = await request(app)
      .get("/api/v1/activity-logs")
      .query({ search: categoryId, action: "CREATE_CATEGORY" })
      .set(headers);
    assert.equal(filtered.body.meta.total, 1);
    const detail = await request(app)
      .get(`/api/v1/activity-logs/${events[0].id}`)
      .set(headers);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.data.description, "Tạo danh mục");
    const lowerToken = jwt.sign(
      { userId: admin.id, email: admin.email, role: "USER" },
      process.env.JWT_SECRET,
      { expiresIn: "5m" },
    );
    for (const path of [
      "/api/v1/activity-logs",
      `/api/v1/activity-logs/${events[0].id}`,
    ]) {
      assert.equal(
        (
          await request(app)
            .get(path)
            .set("Authorization", `Bearer ${lowerToken}`)
        ).status,
        403,
      );
      assert.equal((await request(app).get(path)).status, 401);
    }
    console.log(
      "LIVE API PASS: create/update, failed duplicate, trusted actor, list/detail, search, action/user/date filters, pagination, 401/403.",
    );
    if (process.env.ACTIVITY_BROWSER_CHECK === "1") {
      const { createRequire } = require("node:module");
      const frontRequire = createRequire(
        require("node:path").resolve("../frontend/package.json"),
      );
      const { chromium } = frontRequire("@playwright/test");
      const server = app.listen(0, "127.0.0.1");
      await new Promise((resolve) => server.once("listening", resolve));
      let browser, page;
      try {
        browser = await chromium.launch({
          headless: true,
          ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
            ? {
                executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
              }
            : {}),
        });
        page = await browser.newPage({
          viewport: { width: 390, height: 844 },
          timezoneId: "America/New_York",
        });
        await page.addInitScript(
          ({ user, token }) =>
            sessionStorage.setItem(
              "fundtrust-session-v2",
              JSON.stringify({
                state: {
                  user: { ...user, name: user.fullName },
                  token,
                  isAuthenticated: true,
                },
                version: 0,
              }),
            ),
          { user: admin, token },
        );
        // Proxy every browser API request to the real local app/database; no mock responses.
        await page.route("**/api/v1/**", async (route) => {
          try {
            const url = new URL(route.request().url());
            const response = await route.fetch({
              url: `http://127.0.0.1:${server.address().port}${url.pathname}${url.search}`,
            });
            await route.fulfill({ response });
          } catch {
            // Playwright network errors can include Authorization headers; never print them.
            await route.abort().catch(() => {});
          }
        });
        await page.goto("http://127.0.0.1:5174/admin/activity-logs");
        await page
          .getByRole("heading", { name: "Nhật kí hoạt động", exact: true })
          .waitFor();
        await page
          .getByRole("searchbox", { name: "Tìm nhật kí" })
          .fill(categoryId);
        await page
          .getByRole("button", { name: "Lọc nhật kí", exact: true })
          .click();
        await page.getByText("2 bản ghi", { exact: true }).waitFor();
        const detailLoaded = page.waitForResponse(
          (response) =>
            /\/activity-logs\/[0-9a-f-]{36}$/.test(
              new URL(response.url()).pathname,
            ) && response.status() === 200,
        );
        await page
          .getByRole("button", { name: /^Xem nhật kí/ })
          .first()
          .click();
        await detailLoaded;
        await page
          .getByRole("heading", { name: "Chi tiết nhật kí hoạt động" })
          .waitFor();
        await page
          .getByText("Cập nhật danh mục", { exact: true })
          .last()
          .waitFor();
        const expected = new Date(
          list.body.data.items[0].createdAt,
        ).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
        assert.ok(
          (await page.locator("body").innerText()).includes(expected),
          "Vietnam time independent of browser timezone",
        );
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth + 1,
          ),
          "No mobile page overflow",
        );
        console.log(
          "LIVE BROWSER PASS: real API/database rows, search, detail, Vietnam time in New York timezone, mobile width 390px.",
        );
      } finally {
        if (page) await page.unrouteAll({ behavior: "wait" });
        if (browser) await browser.close();
        await new Promise((resolve) => server.close(resolve));
      }
    }
  } finally {
    if (categoryId) {
      const removed = await request(app)
        .delete(`/api/v1/campaigns/categories/${categoryId}`)
        .set(headers);
      assert.equal(
        removed.status,
        200,
        "Remove only the category created by this check",
      );
      const deletion = await prisma.auditLog.findFirst({
        where: { entityId: categoryId, action: "DELETE_CATEGORY" },
      });
      assert.ok(deletion);
      console.log(
        "LIVE CLEANUP PASS: test category deleted; audit trail retained.",
      );
    }
    await require("../dist/core/auth/token-revocation").revoke(token);
  }
})()
  .catch((e) => {
    console.error("Live check failed:", e.code || e.name);
    process.exitCode = 1;
  })
  .finally(async () => {
    shutdownRedis();
    await prisma.$disconnect();
  });
