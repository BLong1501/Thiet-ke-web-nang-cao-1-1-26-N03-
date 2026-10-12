import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const user = {
  id: "user-1",
  fullName: "Nguyễn An",
  email: "an@example.test",
  role: "FUNDRAISER",
  createdAt: "2026-01-01",
  status: "ACTIVE",
};
const campaign = {
  id: "campaign-1",
  title: "Xây trường cho trẻ em vùng cao",
  categoryId: "education",
  category: { id: "education", slug: "giao-duc", name: "Giáo dục" },
  shortDescription: "Cùng xây dựng một ngôi trường mới cho trẻ em.",
  story:
    "Một chiến dịch gây quỹ để xây dựng phòng học an toàn và đầy đủ thiết bị cho trẻ em vùng cao.",
  targetAmount: "100000000",
  currentAmount: "30000000",
  endDate: "2030-12-01T00:00:00.000Z",
  startDate: "2026-01-01T00:00:00.000Z",
  status: "ACTIVE",
  coverImageUrl: "/campaign-placeholder.svg",
  fundraiserId: user.id,
  fundraiser: user,
  bankName: "Ngân hàng kiểm thử",
  bankAccountNumber: "0000000000",
  bankAccountName: "NGUYEN AN",
  _count: { donations: 3 },
  daysLeft: 30,
  media: [],
  updates: [],
  disbursements: [],
};
type Options = {
  role?: string;
  loggedIn?: boolean;
  failLogin?: boolean;
  failReview?: boolean;
  failUpload?: boolean;
  expire?: boolean;
  donationSuccess?: boolean;
  /** Số thông báo chưa đọc trả về từ API; bỏ trống = dịch vụ thông báo không khả dụng (404). */
  unread?: number;
  emptyTimeline?: boolean;
  /** Gắn slug cho chiến dịch mẫu; khi đó cả `/campaigns/campaign-1` và `/campaigns/<slug>` đều trả về chiến dịch. */
  campaignSlug?: string;
  /** Mã lỗi cho endpoint timeline; 0 = lỗi mạng (request bị hủy). */
  timelineStatus?: number;
  /** Mã lỗi khi tra cứu `/donations/donation-1`. */
  donationLookupStatus?: number;
};
async function setup(page: Page, options: Options = {}) {
  const actor = { ...user, role: options.role || "FUNDRAISER" };
  const current = options.campaignSlug
    ? { ...campaign, slug: options.campaignSlug }
    : campaign;
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  let refreshes = 0;
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  if (options.loggedIn)
    await page.addInitScript(
      ({ actor }) =>
        sessionStorage.setItem(
          "fundtrust-session-v2",
          JSON.stringify({
            state: {
              user: {
                ...actor,
                name: actor.fullName,
                isVerified: true,
                joinedAt: actor.createdAt,
              },
              token: "test-token",
              isAuthenticated: true,
            },
            version: 0,
          }),
        ),
      { actor },
    );
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/v1", "");
    const method = request.method();
    const headers = {
      "access-control-allow-origin":
        request.headers().origin || "http://127.0.0.1:5174",
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    };
    const ok = (data: unknown, meta?: unknown) =>
      route.fulfill({
        status: 200,
        headers,
        json: { success: true, data, meta },
      });
    const fail = (status: number, message: string) =>
      route.fulfill({ status, headers, json: { success: false, message } });
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers });
    let body: Record<string, unknown> = {};
    if (request.headers()["content-type"]?.includes("application/json"))
      body = request.postDataJSON() || {};
    if (method !== "GET") writes.push({ path, body });
    if (path === "/auth/refresh-token") {
      refreshes++;
      return ok({ accessToken: "refreshed-token" });
    }
    if (
      options.expire &&
      path !== "/auth/login" &&
      request.headers().authorization === "Bearer test-token"
    )
      return fail(401, "Token expired");
    if (path === "/auth/login")
      return options.failLogin
        ? fail(401, "Email hoặc mật khẩu không đúng")
        : ok({ user: actor, accessToken: "test-token" });
    if (path === "/auth/me" || path === "/profile/me") return ok(actor);
    if (
      [
        "/auth/register",
        "/auth/resend-otp",
        "/auth/forgot-password",
        "/auth/reset-password",
        "/profile/change-password",
        "/auth/logout",
      ].includes(path)
    )
      return ok({});
    if (path === "/auth/verify-email")
      return body.otp === "123456"
        ? ok({ user: actor, accessToken: "test-token" })
        : fail(400, "Mã OTP không đúng");
    if (path === "/campaigns/categories")
      return ok([
        { id: "education", name: "Giáo dục", slug: "giao-duc", isActive: true },
      ]);
    if (path === "/campaigns" && method === "POST")
      return ok({ ...campaign, ...body });
    if (
      ["/campaigns", "/campaigns/my/list", "/campaigns/admin/pending"].includes(
        path,
      )
    )
      return ok(
        [
          {
            ...current,
            status: path.endsWith("pending")
              ? "PENDING_APPROVAL"
              : campaign.status,
          },
        ],
        { total: 1, totalPages: 1 },
      );
    if (path.endsWith("/review"))
      return options.failReview
        ? fail(500, "Không thể lưu quyết định xét duyệt")
        : ok({});
    if (
      path === "/campaigns/campaign-1" ||
      (options.campaignSlug && path === `/campaigns/${options.campaignSlug}`)
    )
      return ok(current);
    if (
      path === "/notifications" &&
      method === "GET" &&
      options.unread !== undefined
    )
      return ok([], {
        page: 1,
        limit: 1,
        total: 0,
        totalPages: 0,
        unread: options.unread,
      });
    if (
      path === "/donations/campaign/campaign-1/timeline" &&
      options.timelineStatus !== undefined
    )
      return options.timelineStatus === 0
        ? route.abort("failed")
        : fail(options.timelineStatus, "Timeline service failed");
    if (path === "/donations/campaign/campaign-1/timeline")
      return ok({
        target: 1000000,
        raised: 800000,
        points: options.emptyTimeline
          ? []
          : [
              {
                date: "2026-10-01",
                amount: 300000,
                donors: 2,
                cumulative: 300000,
              },
              {
                date: "2026-10-03",
                amount: 500000,
                donors: 1,
                cumulative: 800000,
              },
            ],
      });
    if (path === "/verifications/my-status")
      return ok({ hasSubmitted: false, status: null, verification: null });
    if (path === "/verifications/pending")
      return ok(
        [
          {
            id: "kyc-1",
            user: actor,
            status: "PENDING",
            createdAt: "2026-10-01",
          },
        ],
        { total: 1, totalPages: 1 },
      );
    if (path === "/verifications/kyc-1")
      return ok({
        id: "kyc-1",
        user: actor,
        status: "PENDING",
        idCardNumber: "000000000000",
        frontCardImage:
          "http://localhost:5000/api/v1/uploads/00000000-0000-4000-8000-000000000000",
        backCardImage: "/campaign-placeholder.svg",
        portraitImage: "/campaign-placeholder.svg",
      });
    if (path === "/uploads")
      return options.failUpload
        ? fail(500, "Tải ảnh thất bại")
        : ok({
            downloadUrl: "/api/v1/uploads/00000000-0000-4000-8000-000000000000",
          });
    if (path.startsWith("/uploads/"))
      return route.fulfill({
        status: 200,
        headers: { ...headers, "content-type": "image/svg+xml" },
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect width="50" height="50" fill="blue"/></svg>',
      });
    if (path === "/donations" && method === "POST")
      return ok({
        id: "donation-1",
        ...body,
        transactionCode: "TEST-001",
        paymentStatus: "PENDING",
      });
    if (path === "/donations/donation-1" && options.donationLookupStatus)
      return fail(
        options.donationLookupStatus,
        options.donationLookupStatus === 403
          ? "Bạn không sở hữu khoản đóng góp này"
          : options.donationLookupStatus === 401
            ? "Unauthorized"
            : "Donation service failed",
      );
    if (path === "/donations/donation-1")
      return ok({
        id: "donation-1",
        donorId: user.id,
        campaignId: campaign.id,
        campaign,
        amount: 100000,
        transactionCode: "TEST-001",
        paymentStatus: options.donationSuccess ? "SUCCESS" : "PENDING",
        paymentMethod: "BANK_TRANSFER",
        createdAt: "2026-10-01",
      });
    if (path.startsWith("/donations/"))
      return ok([], { total: 0, totalPages: 1 });
    if (path === "/users") return ok([actor], { total: 1, totalPages: 1 });
    if (path === "/activity-logs/me")
      return ok(
        [
          {
            id: "own-event",
            action: "LOGIN_SUCCESS",
            entityName: "User",
            entityId: actor.id,
            createdAt: "2026-10-12T01:00:00Z",
          },
        ],
        { total: 1, totalPages: 1 },
      );
    if (path === "/activity-logs")
      return ok({ items: [], meta: { total: 0, totalPages: 1 } });
    if (path === "/communities") return fail(404, "Not found");
    return fail(404, `Unmocked endpoint: ${path}`);
  });
  return { writes, errors, refreshes: () => refreshes };
}
test("public pages, missing campaign and 404 routes render without exceptions", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Sẻ chia có địa chỉ, minh bạch đến từng khoản chi/,
    }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Khám phá chiến dịch", exact: true })
    .click();
  await expect(page.getByText("1 chiến dịch", { exact: true })).toBeVisible();
  await page.getByRole("heading", { name: campaign.title }).click();
  await expect(
    page.getByRole("button", { name: "Đóng góp ngay" }),
  ).toBeVisible();
  await page.goto("/campaigns/nonexistent");
  await expect(page.getByRole("alert")).toContainText("Unmocked endpoint");
  await page.goto("/unknown-route");
  await expect(
    page.getByRole("heading", { name: "Không tìm thấy trang" }),
  ).toBeVisible();
  expect(state.errors).toEqual([]);
});
test("real login request, incorrect password stays signed out", async ({
  page,
}) => {
  const state = await setup(page, { failLogin: true });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("incorrect");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Email hoặc mật khẩu không đúng",
  );
  expect(state.writes.some((w) => w.path === "/auth/login")).toBeTruthy();
  expect(state.refreshes()).toBe(0);
  await expect(page).toHaveURL(/login/);
});
test("register then verify OTP before an authenticated session exists", async ({
  page,
}) => {
  const state = await setup(page, { role: "USER" });
  await page.goto("/register");
  await page.getByLabel("Họ và tên").fill(user.fullName);
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("password123");
  await page.getByLabel("Nhập lại mật khẩu").fill("password123");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Tạo tài khoản" }).click();
  await expect(page).toHaveURL(/verify-email/);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(sessionStorage.getItem("fundtrust-session-v2") || "{}").state
          ?.isAuthenticated,
    ),
  ).not.toBe(true);
  await page.getByLabel("Mã OTP trong email").fill("123456");
  await page.getByRole("button", { name: "Xác minh", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  expect(state.errors).toEqual([]);
});
test("route guards preserve destination and deny admin to a normal user", async ({
  page,
}) => {
  await setup(page, { role: "USER" });
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Bạn chưa có quyền truy cập" }),
  ).toBeVisible();
  await page.goto("/campaigns/create");
  await expect(
    page.getByRole("link", { name: "Xác minh danh tính", exact: true }),
  ).toBeVisible();
});
test("expired session refreshes once and retains the user", async ({
  page,
}) => {
  const state = await setup(page, { loggedIn: true, expire: true });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: `Xin chào, ${user.fullName}` }),
  ).toBeVisible();
  expect(state.refreshes()).toBe(1);
  expect(state.errors).toEqual([]);
});
test("campaign creation validates and posts the backend contract", async ({
  page,
}) => {
  const state = await setup(page, { loggedIn: true });
  await page.goto("/campaigns/create");
  await page.getByLabel("Tên chiến dịch").fill(campaign.title);
  await page.getByLabel("Danh mục", { exact: true }).selectOption("education");
  await page.getByLabel("Mô tả ngắn").fill(campaign.shortDescription);
  await page
    .getByLabel("Câu chuyện và kế hoạch sử dụng quỹ")
    .fill(campaign.story);
  await page
    .getByLabel("URL ảnh bìa công khai")
    .fill("https://example.test/cover.jpg");
  await page.getByLabel("Mục tiêu (VND)").fill("1000000");
  await page.getByLabel("Ngày kết thúc").fill("2030-12-01T12:00");
  await page.getByLabel("Tên ngân hàng").fill("Test Bank");
  await page.getByLabel("Số tài khoản", { exact: true }).fill("0000000000");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Gửi xét duyệt" }).click();
  await expect(page).toHaveURL(/campaigns\/campaign-1$/);
  const body = state.writes.find((w) => w.path === "/campaigns")?.body;
  expect(body?.status).toBe("PENDING_APPROVAL");
  expect(body?.targetAmount).toBe(1000000);
  expect(body?.charityCommitmentAccepted).toBe(true);
  expect(state.errors).toEqual([]);
});
test("donation stays pending; no client confirmation or fake success", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/campaigns/campaign-1");
  await page.getByRole("button", { name: "Đóng góp ngay" }).click();
  await page.getByRole("button", { name: "Tạo yêu cầu đóng góp" }).click();
  await expect(
    page.getByRole("dialog").getByText("Đang chờ", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Kiểm tra trạng thái thanh toán" })
    .click();
  await expect(
    page.getByRole("dialog").getByText("Đang chờ", { exact: true }),
  ).toBeVisible();
  expect(state.writes.filter((w) => /confirm/.test(w.path))).toHaveLength(0);
  expect(
    state.writes.find((w) => w.path === "/donations")?.body?.requestKey,
  ).toBeTruthy();
});
test("admin review failure never removes the pending item", async ({
  page,
}) => {
  await setup(page, { loggedIn: true, role: "ADMIN", failReview: true });
  await page.goto("/admin/campaigns");
  await page.getByRole("button", { name: "Duyệt", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Không thể lưu quyết định",
  );
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Đóng hộp thoại" }).click();
  await expect(page.getByRole("link", { name: campaign.title })).toBeVisible();
});
test("KYC image requests carry authentication and modal keyboard works", async ({
  page,
}) => {
  await setup(page, { loggedIn: true, role: "ADMIN" });
  await page.goto("/admin/verifications");
  const imageRequest = page.waitForRequest((r) =>
    r.url().includes("/uploads/"),
  );
  await page.getByRole("button", { name: "Xem hồ sơ" }).click();
  expect((await imageRequest).headers().authorization).toBe(
    "Bearer test-token",
  );
  await expect(
    page
      .getByRole("dialog")
      .getByRole("img", { name: "Mặt trước CCCD", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("upload failure cannot mark KYC submitted or verified", async ({
  page,
}) => {
  const state = await setup(page, {
    loggedIn: true,
    role: "USER",
    failUpload: true,
  });
  await page.goto("/profile?tab=kyc");
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: Buffer.from("test"),
    });
  await expect(page.getByRole("alert")).toContainText("Tải ảnh thất bại");
  expect(state.writes.some((w) => w.path === "/verifications/request")).toBe(
    false,
  );
});
test("mobile layouts, navigation and missing community service", async ({
  page,
}) => {
  const state = await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    "/",
    "/campaigns",
    "/campaigns/campaign-1",
    "/login",
    "/register",
    "/how-it-works",
    "/community",
  ]) {
    await page.goto(path);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
  }
  await expect(
    page.getByText(/Không gian cộng đồng hiện chưa khả dụng/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Điều hướng chính" })
    .getByRole("link", { name: "Đăng nhập", exact: true })
    .click();
  await expect(page).toHaveURL(/login/);
  expect(state.errors).toEqual([]);
});

test("user activity page uses its own endpoint and cannot open admin logs", async ({
  page,
}) => {
  const state = await setup(page, { loggedIn: true, role: "USER" });
  const urls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/activity-logs")) urls.push(r.url());
  });
  await page.goto("/activity-logs");
  await expect(
    page.getByRole("heading", { name: "Nhật ký của tôi" }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Đăng nhập thành công" }),
  ).toBeVisible();
  expect(
    urls.some((url) => new URL(url).pathname.endsWith("/activity-logs/me")),
  ).toBe(true);
  expect(urls.some((url) => new URL(url).searchParams.has("userId"))).toBe(
    false,
  );
  await expect(page.getByRole("navigation", { name: "Quản trị" })).toHaveCount(
    0,
  );
  await page.getByLabel("Loại hoạt động").selectOption("LOGIN_SUCCESS");
  const filtered = page.waitForRequest(
    (r) =>
      r.url().includes("/activity-logs/me") &&
      new URL(r.url()).searchParams.get("action") === "LOGIN_SUCCESS",
  );
  await page.getByRole("button", { name: "Lọc hoạt động" }).click();
  await filtered;
  await page.goto("/admin/activity-logs");
  await expect(
    page.getByRole("heading", { name: "Bạn chưa có quyền truy cập" }),
  ).toBeVisible();
  expect(state.errors).toEqual([]);
});

test("admin log navigation opens the system page, not the personal page", async ({
  page,
}) => {
  await setup(page, { loggedIn: true, role: "ADMIN" });
  await page.goto("/admin/activity-logs");
  await expect(
    page.getByRole("heading", { name: "Nhật ký hệ thống — Admin" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Quản trị" }),
  ).toBeVisible();
  const mainNav = page.getByRole("navigation", { name: "Điều hướng chính" });
  await mainNav.getByRole("button", { name: /^Tài khoản/ }).click();
  await expect(
    mainNav.getByRole("link", { name: "Nhật ký hệ thống" }),
  ).toHaveAttribute("href", "/admin/activity-logs");
});

test("account menu and mobile menu close with Escape and restore focus", async ({
  page,
}) => {
  const state = await setup(page, { loggedIn: true });
  await page.goto("/");
  const mainNav = page.getByRole("navigation", { name: "Điều hướng chính" });
  const account = mainNav.getByRole("button", { name: /^Tài khoản/ });
  await account.click();
  await expect(account).toHaveAttribute("aria-expanded", "true");
  await expect(mainNav.getByRole("link", { name: "Hồ sơ" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(account).toHaveAttribute("aria-expanded", "false");
  await expect(account).toBeFocused();
  await expect(mainNav.getByRole("link", { name: "Hồ sơ" })).toBeHidden();

  await page.setViewportSize({ width: 390, height: 844 });
  const toggle = page.getByRole("button", { name: "Menu", exact: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(
    mainNav.getByRole("link", { name: "Chiến dịch", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
  await expect(
    mainNav.getByRole("link", { name: "Chiến dịch", exact: true }),
  ).toBeHidden();
  expect(state.errors).toEqual([]);
});

test("successful server confirmation closes the donation form without creating another transaction", async ({
  page,
}) => {
  await setup(page, { donationSuccess: true });
  await page.goto("/campaigns/campaign-1");
  await page.getByRole("button", { name: "Đóng góp ngay" }).click();
  await page.getByRole("button", { name: "Tạo yêu cầu đóng góp" }).click();
  await page
    .getByRole("button", { name: "Kiểm tra trạng thái thanh toán" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText("Máy chủ đã xác nhận đóng góp. Cảm ơn bạn!"),
  ).toBeVisible();
});

test("unavailable notification and report services do not report false success", async ({
  page,
}) => {
  const state = await setup(page, { loggedIn: true });
  await page.goto("/notifications");
  await expect(
    page.getByText(/Dịch vụ thông báo hiện chưa khả dụng/),
  ).toBeVisible();
  await page.goto("/campaigns/campaign-1");
  await page.getByRole("button", { name: "Báo cáo chiến dịch" }).click();
  await page
    .getByLabel("Thông tin chi tiết")
    .fill("Nội dung cần được kiểm tra thêm.");
  await page.getByRole("button", { name: "Gửi báo cáo", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Báo cáo chưa được gửi",
  );
  expect(state.errors).toEqual([]);
});

test("admin pages fit tablet and mobile widths; capture representative screens", async ({
  page,
}, testInfo) => {
  // Test này tải lại trang ~17 lần nên vốn dài; 30s mặc định quá sát (đo thực tế ~26s).
  test.setTimeout(90_000);
  const state = await setup(page, { loggedIn: true, role: "ADMIN" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: campaign.title }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("home-desktop.png"),
    fullPage: true,
  });
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of [
      "/dashboard",
      "/profile",
      "/admin",
      "/admin/users",
      "/admin/categories",
      "/admin/donations",
      "/admin/reports",
      "/admin/activity-logs",
    ]) {
      await page.goto(path);
      await page.getByRole("heading", { level: 1 }).waitFor();
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true);
    }
  }
  await page.goto("/campaigns/campaign-1");
  await expect(
    page.getByRole("button", { name: "Đóng góp ngay" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("campaign-mobile.png"),
    fullPage: true,
  });
  expect(state.errors).toEqual([]);
});

test("navbar shows unread notification badge and hides it at zero", async ({
  page,
}) => {
  const state = await setup(page, { loggedIn: true, unread: 3 });
  await page.goto("/");
  const link = page.getByRole("link", { name: "Thông báo, 3 chưa đọc" });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", "/notifications");
  expect(state.errors).toEqual([]);
});

test("navbar has no badge when there are no unread notifications", async ({
  page,
}) => {
  await setup(page, { loggedIn: true, unread: 0 });
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Thông báo", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".nav-badge")).toHaveCount(0);
});

test("campaign donors tab renders the funding progress chart with an accessible table", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/campaigns/campaign-1");
  await page.getByRole("tab", { name: "Đóng góp", exact: true }).click();
  // Chunk Recharts được tải lazy (~360 kB) nên lần đầu có thể chậm hơn timeout mặc định 5s.
  await expect(
    page.getByRole("heading", { name: "Tiến độ gây quỹ theo thời gian" }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".progress-chart .recharts-surface")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("img", { name: /Biểu đồ lũy kế/ })).toBeVisible();
  await page.getByText("Xem dữ liệu dạng bảng").click();
  const rows = page.locator(".progress-chart tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(rows.last()).toContainText("800.000");
  expect(state.errors).toEqual([]);
});

test("progress chart shows an empty state when nothing was raised", async ({
  page,
}) => {
  await setup(page, { emptyTimeline: true });
  await page.goto("/campaigns/campaign-1");
  await page.getByRole("tab", { name: "Đóng góp", exact: true }).click();
  await expect(
    page.getByText("Chưa có khoản đóng góp nào được xác nhận để vẽ biểu đồ."),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".recharts-surface")).toHaveCount(0);
});

test("campaign tabs follow the WAI-ARIA tabs pattern with keyboard support", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/campaigns/campaign-1");
  const tablist = page.getByRole("tablist", { name: "Nội dung chiến dịch" });
  await expect(tablist).toBeVisible();
  const story = tablist.getByRole("tab", { name: "Câu chuyện" });
  await expect(story).toHaveAttribute("aria-selected", "true");
  await expect(story).toHaveAttribute("tabindex", "0");
  await expect(tablist.getByRole("tab", { name: "Cập nhật" })).toHaveAttribute(
    "tabindex",
    "-1",
  );

  await story.focus();
  await page.keyboard.press("ArrowRight");
  const updates = tablist.getByRole("tab", { name: "Cập nhật" });
  await expect(updates).toHaveAttribute("aria-selected", "true");
  await expect(updates).toBeFocused();
  await expect(page.getByRole("tabpanel")).toHaveAccessibleName("Cập nhật");

  await page.keyboard.press("End");
  await expect(tablist.getByRole("tab", { name: "Minh bạch" })).toBeFocused();
  await page.keyboard.press("ArrowRight"); // vòng về đầu danh sách
  await expect(story).toBeFocused();
  await expect(story).toHaveAttribute("aria-selected", "true");
  expect(state.errors).toEqual([]);
});

test("public pages expose SEO metadata; private pages are noindex", async ({
  page,
}) => {
  await setup(page, { loggedIn: true });
  await page.goto("/campaigns/campaign-1");
  await expect(page).toHaveTitle(`${campaign.title} — FundTrust`);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    campaign.shortDescription,
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    `${campaign.title} — FundTrust`,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/campaigns\/campaign-1$/,
  );
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

  await page.goto("/dashboard");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex,nofollow",
  );
});

test("campaign links prefer the slug; id URLs still resolve with a slug canonical", async ({
  page,
}) => {
  const slug = "xay-truong-vung-cao";
  const state = await setup(page, { campaignSlug: slug });
  await page.goto("/campaigns");
  const card = page.getByRole("link", { name: new RegExp(campaign.title) });
  await expect(card.first()).toHaveAttribute("href", `/campaigns/${slug}`);
  await card.first().click();
  await expect(page).toHaveURL(new RegExp(`/campaigns/${slug}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: campaign.title }),
  ).toBeVisible();
  await page.goto("/campaigns/campaign-1");
  await expect(
    page.getByRole("heading", { level: 1, name: campaign.title }),
  ).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    new RegExp(`/campaigns/${slug}$`),
  );
  expect(state.errors).toEqual([]);
});

test("campaign links fall back to the id when the API has no slug", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/campaigns");
  await expect(
    page.getByRole("link", { name: new RegExp(campaign.title) }).first(),
  ).toHaveAttribute("href", "/campaigns/campaign-1");
});

test("progress chart is replaced by a neutral notice when the timeline endpoint returns 404", async ({
  page,
}) => {
  const state = await setup(page, { timelineStatus: 404 });
  await page.goto("/campaigns/campaign-1");
  await page.getByRole("tab", { name: "Đóng góp", exact: true }).click();
  const chart = page.locator(".progress-chart");
  await expect(
    chart.getByText(/Dữ liệu tiến độ đang được cập nhật/),
  ).toBeVisible({ timeout: 20_000 });
  await expect(chart.getByRole("alert")).toHaveCount(0);
  await expect(chart.getByRole("button", { name: "Thử lại" })).toHaveCount(0);
  await expect(chart.locator(".recharts-surface")).toHaveCount(0);
  expect(state.errors).toEqual([]);
});

test("progress chart still surfaces real server errors (500)", async ({
  page,
}) => {
  await setup(page, { timelineStatus: 500 });
  await page.goto("/campaigns/campaign-1");
  await page.getByRole("tab", { name: "Đóng góp", exact: true }).click();
  const chart = page.locator(".progress-chart");
  await expect(chart.getByRole("alert")).toContainText(
    "Timeline service failed",
    { timeout: 20_000 },
  );
  await expect(chart.getByRole("button", { name: "Thử lại" })).toBeVisible();
  await expect(
    chart.getByText(/Dữ liệu tiến độ đang được cập nhật/),
  ).toHaveCount(0);
});

test("progress chart still surfaces network failures", async ({ page }) => {
  await setup(page, { timelineStatus: 0 });
  await page.goto("/campaigns/campaign-1");
  await page.getByRole("tab", { name: "Đóng góp", exact: true }).click();
  await expect(
    page.locator(".progress-chart").getByRole("alert"),
  ).toContainText("Không kết nối được máy chủ", { timeout: 20_000 });
});

test("guest donation lookup rejected with 401 explains next steps and stays pending", async ({
  page,
}) => {
  const state = await setup(page, { donationLookupStatus: 401 });
  await page.goto("/campaigns/campaign-1");
  await page.getByRole("button", { name: "Đóng góp ngay" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/Bạn chưa đăng nhập/)).toBeVisible();
  await dialog.getByRole("button", { name: "Tạo yêu cầu đóng góp" }).click();
  await expect(dialog.getByText("Đang chờ", { exact: true })).toBeVisible();
  await expect(dialog.getByText(/Hãy lưu lại mã giao dịch/)).toBeVisible();
  await dialog
    .getByRole("button", { name: "Kiểm tra trạng thái thanh toán" })
    .click();
  await expect(
    dialog.getByText(/chưa hỗ trợ khách chưa đăng nhập tra cứu/),
  ).toBeVisible();
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await expect(dialog.getByText("Đang chờ", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Thành công", { exact: true })).toHaveCount(0);
  expect(state.writes.filter((w) => /confirm/.test(w.path))).toHaveLength(0);
  expect(state.errors).toEqual([]);
});

test("donation detail explains 401 instead of showing a technical error", async ({
  page,
}) => {
  const state = await setup(page, { donationLookupStatus: 401 });
  await page.goto("/donations/donation-1");
  await expect(
    page.getByText(/Cần đăng nhập để xem giao dịch này/),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Cập nhật trạng thái" }),
  ).toHaveCount(0);
  await page
    .getByRole("main")
    .getByRole("link", { name: "Đăng nhập", exact: true })
    .click();
  await expect(page).toHaveURL(/login/);
  expect(state.errors).toEqual([]);
});

test("donation detail explains 403 for accounts that do not own the donation", async ({
  page,
}) => {
  await setup(page, { loggedIn: true, donationLookupStatus: 403 });
  await page.goto("/donations/donation-1");
  await expect(
    page.getByText(/không có quyền xem giao dịch này/),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("donation detail still reports server errors (500)", async ({ page }) => {
  await setup(page, { loggedIn: true, donationLookupStatus: 500 });
  await page.goto("/donations/donation-1");
  await expect(page.getByRole("alert")).toContainText(
    "Donation service failed",
    { timeout: 20_000 },
  );
});

test.describe("accessibility (axe, WCAG 2.1 A/AA)", () => {
  const pages: [string, string, Options][] = [
    ["home", "/", {}],
    ["campaigns list", "/campaigns", {}],
    ["campaign detail", "/campaigns/campaign-1", {}],
    ["login", "/login", {}],
    ["register", "/register", {}],
    ["how it works", "/how-it-works", {}],
    ["dashboard", "/dashboard", { loggedIn: true }],
    ["profile", "/profile", { loggedIn: true }],
    ["notifications", "/notifications", { loggedIn: true, unread: 2 }],
  ];
  for (const [name, path, options] of pages) {
    test(`${name} has no serious or critical violations`, async ({ page }) => {
      await setup(page, options);
      await page.goto(path);
      await page.getByRole("heading", { level: 1 }).first().waitFor();
      await page.waitForLoadState("networkidle");
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const blocking = violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => ({
          rule: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
        }));
      expect(blocking).toEqual([]);
    });
  }
});
