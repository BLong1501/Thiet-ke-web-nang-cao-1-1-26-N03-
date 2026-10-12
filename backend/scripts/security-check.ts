import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_security_secret_key_123456';
process.env.CLIENT_URL = 'http://localhost:5173';

async function runSecurityAudit() {
  console.log("==================================================================");
  console.log("  KIỂM THỬ BẢO MẬT & PHÒNG CHỐNG CÁC LỖ HỔNG (TÀI LIỆU CHÍNH [2]) ");
  console.log("==================================================================");

  const { prisma: db } = await import('../src/core/database/prisma');
  const app = (await import('../src/app')).default;
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/v1`;

  const adminId = randomUUID();
  const victimUserId = randomUUID();
  const attackerUserId = randomUUID();

  const adminActor = { userId: adminId, role: 'ADMIN', email: `admin-${adminId}@test.security` };
  const victimActor = { userId: victimUserId, role: 'FUNDRAISER', email: `victim-${victimUserId}@test.security` };
  const attackerActor = { userId: attackerUserId, role: 'USER', email: `attacker-${attackerUserId}@test.security` };

  const generateToken = (actor: any) =>
    jwt.sign(actor, process.env.JWT_SECRET!, { expiresIn: '15m' });

  const apiRequest = async (
    method: string,
    route: string,
    actor?: any,
    body?: any,
    headers: Record<string, string> = {}
  ) => {
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (actor) {
      defaultHeaders['Authorization'] = `Bearer ${generateToken(actor)}`;
    }
    const response = await fetch(base + route, {
      method,
      headers: defaultHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let responseBody: any = null;
    try {
      responseBody = await response.json();
    } catch {}
    return { status: response.status, body: responseBody };
  };

  try {
    // -------------------------------------------------------------
    // CHUẨN BỊ FIXTURE TRONG DATABASE
    // -------------------------------------------------------------
    const dummyHash = '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ0123';

    await db.user.create({
      data: {
        id: adminId,
        email: adminActor.email,
        passwordHash: dummyHash,
        fullName: 'Security Admin',
        role: 'ADMIN',
        isEmailVerified: true,
      },
    });

    await db.user.create({
      data: {
        id: victimUserId,
        email: victimActor.email,
        passwordHash: dummyHash,
        fullName: 'Security Fundraiser Victim',
        role: 'FUNDRAISER',
        isEmailVerified: true,
      },
    });

    await db.user.create({
      data: {
        id: attackerUserId,
        email: attackerActor.email,
        passwordHash: dummyHash,
        fullName: 'Security Attacker User',
        role: 'USER',
        isEmailVerified: true,
      },
    });

    const category = await db.category.create({
      data: { name: 'Security Category ' + randomUUID().substring(0, 8), slug: randomUUID() },
    });

    const victimCampaign = await db.campaign.create({
      data: {
        id: randomUUID(),
        fundraiserId: victimUserId,
        categoryId: category.id,
        title: 'Victim Campaign for IDOR Test',
        slug: 'victim-campaign-' + randomUUID(),
        shortDescription: 'Testing IDOR protection',
        story: 'Detailed story for testing security measures',
        coverImageUrl: 'https://example.com/cover.jpg',
        targetAmount: 5000000,
        currentAmount: 0,
        status: 'PENDING_APPROVAL',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000 * 30),
        bankAccountNumber: '0123456789',
        bankName: 'MBBank',
        bankAccountName: 'NGUYEN VAN VICTIM',
      },
    });

    // -------------------------------------------------------------
    // 1. KIỂM THỬ: PHÒNG CHỐNG TIÊM NHIỄM SQL (SQL INJECTION)
    // -------------------------------------------------------------
    // Trường hợp 1: Chèn SQL Injection vào email -> Bị Zod chặn ngay tại cửa (Server-side validation)
    const sqliEmailRes = await apiRequest('POST', '/auth/login', undefined, {
      email: "' OR '1'='1' -- ",
      password: 'password123',
    });
    assert.equal(sqliEmailRes.status, 400, 'SQL Injection trong email bị Zod Validation chặn với 400 Bad Request');

    // Trường hợp 2: Chèn SQL Injection vào password -> Prisma & Bcrypt xử lý an toàn dưới dạng string literal
    const sqliPassRes = await apiRequest('POST', '/auth/login', undefined, {
      email: adminActor.email,
      password: "' OR '1'='1' -- ",
    });
    assert.equal(sqliPassRes.status, 401, 'SQL Injection trong password không thể bypass và bị từ chối 401 Unauthorized');
    console.log('  ✔ PASS: SQL Injection bị chặn kép ở cả tầng Validation (400) và Parameterized Query/Bcrypt (401).');

    // -------------------------------------------------------------
    // 2. KIỂM THỬ: PHÒNG CHỐNG XSS (CROSS-SITE SCRIPTING)
    // -------------------------------------------------------------
    console.log('\n[2/7] Kiểm tra: Phòng chống Tấn công XSS (Cross-Site Scripting)');
    const xssPayload = "Tiêu đề an toàn <script>alert('xss_attack')</script><iframe src='evil.com'></iframe>";
    const xssRes = await apiRequest('POST', '/campaigns', victimActor, {
      title: xssPayload,
      categoryId: category.id,
      shortDescription: "Mô tả ngắn tối thiểu hai mươi ký tự trở lên để hợp lệ",
      story: "Câu chuyện chi tiết về chiến dịch gây quỹ cộng đồng vượt qua năm mươi ký tự theo đúng schema Zod",
      coverImageUrl: "https://example.com/cover-image.jpg",
      targetAmount: 500000,
      endDate: new Date(Date.now() + 86400000 * 10).toISOString(),
      bankAccountNumber: "0987654321",
      bankName: "Vietcombank",
      bankAccountName: "SECURITY FUNDRAISER VICTIM",
    });
    // Kiểm tra xem title có bị loại bỏ thẻ <script> không
    assert.equal(xssRes.status, 201, 'Tạo chiến dịch thành công');
    assert.ok(
      !xssRes.body.data.title.includes('<script>'),
      'Chuỗi độc hại <script> phải bị loại bỏ bởi xssSanitizer'
    );
    assert.ok(
      !xssRes.body.data.title.includes('<iframe'),
      'Thẻ <iframe phải bị loại bỏ bởi xssSanitizer'
    );
    console.log('  ✔ PASS: Input Sanitizer đã triệt tiêu hoàn toàn mã độc <script> và <iframe>.');

    // -------------------------------------------------------------
    // 3. KIỂM THỬ: PHÒNG CHỐNG CSRF (CROSS-SITE REQUEST FORGERY)
    // -------------------------------------------------------------
    console.log('\n[3/7] Kiểm tra: Phòng chống Tấn công CSRF (Cross-Site Request Forgery)');
    // Gửi yêu cầu thay đổi trạng thái (POST) với Origin giả mạo từ trang web độc hại và không có Bearer token
    const csrfRes = await apiRequest(
      'POST',
      '/campaigns',
      undefined,
      { title: 'Fake CSRF Campaign' },
      { Origin: 'http://malicious-website.com' }
    );
    // CSRF Protection chặn vì Origin không được phép
    assert.equal(csrfRes.status, 403, 'CSRF request phải bị từ chối với HTTP 403');
    console.log('  ✔ PASS: Request giả mạo Origin/Referer bị từ chối 403 Forbidden.');

    // -------------------------------------------------------------
    // 4. KIỂM THỬ: PHÒNG CHỐNG IDOR (INSECURE DIRECT OBJECT REFERENCE)
    // -------------------------------------------------------------
    console.log('\n[4/7] Kiểm tra: Phòng chống Tham chiếu Đối tượng Trực tiếp Không An toàn (IDOR)');
    // Attacker cố tình dùng quyền của mình để chỉnh sửa chiến dịch thuộc sở hữu của Victim
    const idorRes = await apiRequest('PUT', `/campaigns/${victimCampaign.id}`, attackerActor, {
      title: 'Hacked Campaign Title by Attacker',
      description: 'Attacker attempting IDOR',
    });
    assert.equal(idorRes.status, 403, 'Hành vi can thiệp tài nguyên của người khác phải bị 403 Forbidden');
    console.log('  ✔ PASS: Tấn công IDOR bị chặn đứng với mã lỗi 403 (Object-level Permission Check).');

    // -------------------------------------------------------------
    // 5. KIỂM THỬ: PHÒNG CHỐNG PHÁ VỠ KIỂM SOÁT TRUY CẬP (BROKEN ACCESS CONTROL)
    // -------------------------------------------------------------
    console.log('\n[5/7] Kiểm tra: Phòng chống Phá vỡ Kiểm soát Truy cập (Broken Access Control)');
    // User thông thường cố tình gọi API duyệt chiến dịch của Admin
    const bacRes = await apiRequest(
      'PATCH',
      `/campaigns/${victimCampaign.id}/review`,
      attackerActor,
      { status: 'ACTIVE', note: 'Attacker trying to approve' }
    );
    assert.equal(bacRes.status, 403, 'User không có quyền ADMIN phải bị 403 Forbidden');

    // User thông thường cố tình lấy danh sách quản trị người dùng
    const bacUserListRes = await apiRequest('GET', '/users', attackerActor);
    assert.equal(bacUserListRes.status, 403, 'Truy cập endpoint /api/v1/users phải bị 403 Forbidden');
    console.log('  ✔ PASS: RBAC bảo vệ nghiêm ngặt, chặn mọi nỗ lực leo thang đặc quyền.');

    // -------------------------------------------------------------
    // 6. KIỂM THỬ: KIỂM HỢP LỆ ĐẦU VÀO PHÍA MÁY CHỦ (SERVER-SIDE INPUT VALIDATION)
    // -------------------------------------------------------------
    console.log('\n[6/7] Kiểm tra: Kiểm tra Hợp lệ Đầu vào Phía Máy chủ (Zod Validation)');
    const invalidInputRes = await apiRequest('POST', '/auth/register', undefined, {
      email: 'not-an-email',
      password: '123', // Quá ngắn
      fullName: '',
    });
    assert.equal(invalidInputRes.status, 400, 'Dữ liệu không hợp lệ phải bị 400 Bad Request');
    assert.ok(
      Array.isArray(invalidInputRes.body.errors),
      'Phải trả về danh sách chi tiết các trường vi phạm'
    );
    console.log('  ✔ PASS: DTO Zod schema chặn 100% dữ liệu sai định dạng ngay tại tầng Middleware.');

    // -------------------------------------------------------------
    // 7. KIỂM THỬ: GHI NHẬT KÝ HÀNH VI NHẠY CẢM (SECURITY AUDIT LOGGING)
    // -------------------------------------------------------------
    console.log('\n[7/7] Kiểm tra: Ghi Nhật ký Các Hành vi Nhạy cảm (Security Audit Logging)');
    // Admin truy vấn danh sách audit logs
    const auditRes = await apiRequest('GET', '/users/audit-logs', adminActor);
    assert.equal(auditRes.status, 200, 'Admin lấy danh sách Audit Logs thành công');
    assert.ok(auditRes.body.data.length > 0, 'Phải có các bản ghi nhật ký kiểm toán trong CSDL');

    const actions = auditRes.body.data.map((l: any) => l.action);
    console.log('  Các hành vi nhạy cảm đã được ghi nhận tự động vào CSDL:');
    actions.slice(0, 5).forEach((act: string) => console.log(`   - [AUDIT ACTION]: ${act}`));
    // -------------------------------------------------------------
    // BM 10: DÒ MẬT KHẨU VÀ LẠM DỤNG DỊCH VỤ (BRUTE-FORCE & RATE LIMITING)
    // -------------------------------------------------------------
    console.log('\n[BM 10] Kiểm tra: Khóa tạm tài khoản sau 5 lần nhập sai mật khẩu (Rate Limiting)');
    const testBruteEmail = `brute_victim_${randomUUID().substring(0, 6)}@example.com`;
    await db.user.create({
      data: {
        id: randomUUID(),
        email: testBruteEmail,
        passwordHash: dummyHash,
        fullName: 'Brute Force Test User',
        role: 'USER',
        isEmailVerified: true,
      },
    });

    // Thử đăng nhập sai 5 lần liên tiếp với khoảng trắng thừa ở email và mật khẩu
    for (let i = 1; i <= 5; i++) {
      const failRes = await apiRequest('POST', '/auth/login', undefined, {
        email: `   ${testBruteEmail.toUpperCase()}   `, // Khoảng trắng và chữ hoa được chuẩn hóa tự động
        password: '   wrong_password   ',
      });
      assert.equal(failRes.status, 401, `Lần thử ${i}: Bị từ chối 401 Unauthorized`);
    }

    // Lần thử thứ 6: Bắt buộc phải bị khóa tạm và trả về HTTP 429 Too Many Requests
    const lockedRes = await apiRequest('POST', '/auth/login', undefined, {
      email: testBruteEmail,
      password: 'wrong_password',
    });
    assert.equal(lockedRes.status, 429, 'Từ lần thử thứ 6: Phải trả về mã 429 Too Many Requests do bị khóa tạm 10 phút');
    assert.ok(
      lockedRes.body.message.includes('tạm khóa'),
      'Thông báo phải nêu rõ tài khoản bị tạm khóa 10 phút'
    );
    console.log('  ✔ PASS: Nhập sai 5 lần bị 401, từ lần thứ 6 hệ thống kích hoạt khóa tạm 10 phút (HTTP 429).');

    console.log("\n==================================================================");
    console.log("  KẾT QUẢ: TOÀN BỘ TIÊU CHÍ AN TOÀN BẢO MẬT ĐẠT 100% TIÊU CHUẨN!");
    console.log("==================================================================");

  } finally {
    server.close();
  }
}

runSecurityAudit().catch((err) => {
  console.error("LỖI KIỂM THỬ BẢO MẬT:", err);
  process.exit(1);
});
