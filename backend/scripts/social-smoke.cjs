/* Kiểm thử khói end-to-end cho communities / notifications / reports qua HTTP thật.
 * Chạy: node scripts/social-smoke.cjs   (backend phải đang chạy, có 3 tài khoản test)
 * Tài khoản: tester1@test.local, tester2@test.local, tester-admin@test.local — mật khẩu Test@12345 */
const BASE = process.env.API_URL || "http://localhost:5000/api/v1";
let failed = 0;
const results = [];

async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}
function check(name, cond, extra = "") {
  results.push(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  -> " + extra}`);
  if (!cond) failed++;
}
async function login(email) {
  const r = await call("POST", "/auth/login", { body: { email, password: "Test@12345" } });
  if (r.status !== 200) throw new Error(`login ${email} -> ${r.status} ${JSON.stringify(r.json)}`);
  return r.json.data.accessToken;
}

(async () => {
  const u1 = await login("tester1@test.local");
  const u2 = await login("tester2@test.local");
  const admin = await login("tester-admin@test.local");

  // ---------- COMMUNITIES ----------
  let r = await call("GET", "/communities");
  check("GET /communities công khai không cần đăng nhập", r.status === 200 && Array.isArray(r.json.data));

  r = await call("POST", "/communities", { body: { name: "Nhom A", description: "Mo ta du dai" } });
  check("POST /communities không token -> 401", r.status === 401, r.status);

  r = await call("POST", "/communities", { token: u1, body: { name: "ab", description: "x" } });
  check("POST /communities dữ liệu sai -> 400", r.status === 400, r.status);

  const name = "Nhom thien nguyen " + Date.now();
  r = await call("POST", "/communities", { token: u1, body: { name, description: "Cong dong thu nghiem tu dong" } });
  check("tạo cộng đồng -> 201", r.status === 201 && r.json.data.isJoined === true && r.json.data.memberCount === 1, JSON.stringify(r.json));
  const gid = r.json?.data?.id;

  r = await call("GET", "/communities", { token: u1 });
  const mine = r.json.data.find((g) => g.id === gid);
  check("danh sách có isJoined=true cho người tạo", mine && mine.isJoined === true);
  r = await call("GET", "/communities", { token: u2 });
  check("danh sách isJoined=false cho người khác", r.json.data.find((g) => g.id === gid)?.isJoined === false);

  r = await call("POST", `/communities/${gid}/join`, { token: u1 });
  check("người tạo không thể rời nhóm -> 400", r.status === 400, r.status);

  r = await call("POST", `/communities/${gid}/posts`, { token: u2, body: { content: "xin chao" } });
  check("chưa là thành viên không đăng bài -> 403", r.status === 403, r.status);

  r = await call("POST", `/communities/${gid}/join`, { token: u2 });
  check("u2 tham gia -> isJoined true, 2 thành viên", r.status === 200 && r.json.data.isJoined === true && r.json.data.memberCount === 2, JSON.stringify(r.json));

  r = await call("POST", `/communities/${gid}/posts`, { token: u2, body: { content: "   " } });
  check("nội dung rỗng -> 400", r.status === 400, r.status);

  r = await call("POST", `/communities/${gid}/posts`, { token: u2, body: { content: "Bai viet dau tien" } });
  check("thành viên đăng bài -> 201", r.status === 201, JSON.stringify(r.json));
  const pid = r.json?.data?.id;

  r = await call("GET", `/communities/${gid}/posts`);
  check("xem bài viết công khai", r.status === 200 && r.json.data.length === 1 && r.json.data[0].isLiked === false);

  r = await call("POST", `/communities/${gid}/posts/${pid}/like`, { token: u1 });
  check("like lần 1 -> isLiked true, 1", r.json?.data?.isLiked === true && r.json.data.likeCount === 1, JSON.stringify(r.json));
  const [l2, l3] = await Promise.all([
    call("POST", `/communities/${gid}/posts/${pid}/like`, { token: u2 }),
    call("POST", `/communities/${gid}/posts/${pid}/like`, { token: u2 }),
  ]);
  r = await call("GET", `/communities/${gid}/posts`, { token: u2 });
  check("2 request like đồng thời không tạo bản ghi trùng (likeCount hợp lệ 1..2)", [1, 2].includes(r.json.data[0].likeCount), r.json.data[0].likeCount);
  r = await call("GET", `/communities/${gid}/posts`, { token: u1 });
  check("isLiked phản ánh đúng người xem", r.json.data[0].isLiked === true);
  // đưa về trạng thái xác định rồi kiểm tra bỏ thích
  const cur = (await call("GET", `/communities/${gid}/posts`, { token: u2 })).json.data[0];
  if (cur.isLiked) await call("POST", `/communities/${gid}/posts/${pid}/like`, { token: u2 });
  r = await call("POST", `/communities/${gid}/posts/${pid}/like`, { token: u1 });
  check("like lần 2 của u1 = bỏ thích", r.json?.data?.isLiked === false && r.json.data.likeCount === 0, JSON.stringify(r.json));

  r = await call("POST", `/communities/${gid}/posts/00000000-0000-0000-0000-000000000000/like`, { token: u1 });
  check("like bài không tồn tại -> 404", r.status === 404, r.status);
  r = await call("POST", `/communities/${gid}/posts/${pid}/comments`, { token: u1, body: { content: "Binh luan hay" } });
  check("bình luận -> 201", r.status === 201 && r.json.data.author.fullName === "Tester One", JSON.stringify(r.json));
  r = await call("GET", `/communities/${gid}/posts/${pid}/comments`);
  check("danh sách bình luận", r.status === 200 && r.json.data.length === 1);
  r = await call("GET", `/communities/${gid}/posts`);
  check("commentCount được cập nhật", r.json.data[0].commentCount === 1, r.json.data[0].commentCount);

  r = await call("POST", `/communities/${gid}/join`, { token: u2 });
  check("u2 rời nhóm -> isJoined false, 1 thành viên", r.json?.data?.isJoined === false && r.json.data.memberCount === 1, JSON.stringify(r.json));

  // nhóm riêng tư
  r = await call("POST", "/communities", { token: u1, body: { name: "Nhom rieng tu " + Date.now(), description: "Chi thanh vien moi xem", isPrivate: true } });
  const privId = r.json?.data?.id;
  r = await call("GET", `/communities/${privId}/posts`);
  check("nhóm riêng tư: khách không xem được -> 403", r.status === 403, r.status);
  r = await call("GET", `/communities/${privId}/posts`, { token: u2 });
  check("nhóm riêng tư: người ngoài -> 403", r.status === 403, r.status);
  r = await call("POST", `/communities/${privId}/join`, { token: u2 });
  check("nhóm riêng tư: không tự tham gia -> 403", r.status === 403, r.status);
  r = await call("GET", `/communities/${privId}/posts`, { token: u1 });
  check("nhóm riêng tư: chủ nhóm xem được", r.status === 200, r.status);
  r = await call("GET", "/communities");
  check("nhóm riêng tư không xuất hiện trong danh sách công khai", !r.json.data.some((g) => g.id === privId));

  // ---------- REPORTS ----------
  const campaign = await (async () => {
    const c = await call("GET", "/campaigns?limit=1");
    return c.json?.data?.[0]?.id;
  })();
  const targetId = campaign || "test-user-2";
  const targetType = campaign ? "CAMPAIGN" : "USER";

  r = await call("POST", "/reports", { body: { targetType, targetId, reason: "Lua dao" } });
  check("gửi báo cáo không token -> 401", r.status === 401, r.status);
  r = await call("POST", "/reports", { token: u1, body: { targetType, targetId: "khong-ton-tai", reason: "Lua dao" } });
  check("báo cáo đối tượng không tồn tại -> 404", r.status === 404, r.status);
  r = await call("POST", "/reports", { token: u1, body: { targetType: "USER", targetId: "test-user-1", reason: "Tu bao cao" } });
  check("tự báo cáo chính mình -> 400", r.status === 400, r.status);
  r = await call("POST", "/reports", { token: u1, body: { targetType, targetId, reason: "Nghi ngo gia mao", description: "Chi tiet bao cao thu nghiem" } });
  check("gửi báo cáo -> 201", r.status === 201 && r.json.data.status === "PENDING", JSON.stringify(r.json));
  const rid = r.json?.data?.id;
  r = await call("POST", "/reports", { token: u1, body: { targetType, targetId, reason: "Nghi ngo gia mao" } });
  check("báo cáo trùng khi đang chờ -> 409", r.status === 409, r.status);

  r = await call("GET", "/admin/reports", { token: u1 });
  check("user thường xem /admin/reports -> 403", r.status === 403, r.status);
  r = await call("GET", "/admin/reports", { token: admin });
  check("admin xem danh sách báo cáo", r.status === 200 && r.json.data.some((x) => x.id === rid));
  r = await call("PATCH", `/admin/reports/${rid}/resolve`, { token: u1, body: { resolution: "Da xu ly xong" } });
  check("user thường xử lý báo cáo -> 403", r.status === 403, r.status);
  r = await call("PATCH", `/admin/reports/${rid}/resolve`, { token: admin, body: { resolution: "a" } });
  check("resolution quá ngắn -> 400", r.status === 400, r.status);
  const [a, b] = await Promise.all([
    call("PATCH", `/admin/reports/${rid}/resolve`, { token: admin, body: { status: "RESOLVED", resolution: "Da xu ly xong" } }),
    call("PATCH", `/admin/reports/${rid}/resolve`, { token: admin, body: { status: "REJECTED", resolution: "Khong du can cu" } }),
  ]);
  const codes = [a.status, b.status].sort();
  check("2 admin xử lý đồng thời: đúng 1 thành công, 1 bị 409", codes[0] === 200 && codes[1] === 409, JSON.stringify(codes));
  r = await call("PATCH", `/admin/reports/00000000-0000-0000-0000-000000000000/resolve`, { token: admin, body: { resolution: "Khong ton tai" } });
  check("xử lý báo cáo không tồn tại -> 404", r.status === 404, r.status);

  // ---------- NOTIFICATIONS ----------
  r = await call("GET", "/notifications");
  check("GET /notifications không token -> 401", r.status === 401, r.status);
  r = await call("GET", "/notifications", { token: u1 });
  check("người báo cáo nhận thông báo kết quả", r.status === 200 && r.json.data.some((n) => n.type === "REPORT_RESOLVED") && r.json.meta.unread >= 1, JSON.stringify(r.json));
  const nid = r.json.data.find((n) => n.type === "REPORT_RESOLVED")?.id;
  r = await call("GET", "/notifications", { token: u2 });
  check("u2 không thấy thông báo của u1 (cô lập dữ liệu)", !r.json.data.some((n) => n.id === nid));
  r = await call("PATCH", `/notifications/${nid}/read`, { token: u2 });
  check("IDOR: u2 đánh dấu đọc thông báo của u1 -> 404", r.status === 404, r.status);
  r = await call("GET", "/notifications/unread-count", { token: u1 });
  const before = r.json.data.unread;
  r = await call("PATCH", `/notifications/${nid}/read`, { token: u1 });
  check("u1 đánh dấu đã đọc -> 200", r.status === 200, r.status);
  r = await call("PATCH", `/notifications/${nid}/read`, { token: u1 });
  check("đánh dấu đọc lần 2 vẫn 200 (idempotent)", r.status === 200, r.status);
  r = await call("GET", "/notifications/unread-count", { token: u1 });
  check("unread giảm đúng 1", r.json.data.unread === before - 1, `${before} -> ${r.json.data.unread}`);
  r = await call("PATCH", "/notifications/read-all", { token: u1 });
  check("read-all -> 200", r.status === 200, r.status);
  r = await call("GET", "/notifications/unread-count", { token: u1 });
  check("unread = 0 sau read-all", r.json.data.unread === 0, r.json.data.unread);

  console.log(results.join("\n"));
  console.log(`\n${results.length - failed}/${results.length} đạt`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("LỖI KỊCH BẢN:", e.message); process.exit(2); });
