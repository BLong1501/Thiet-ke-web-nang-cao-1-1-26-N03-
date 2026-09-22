// Source of truth: authorization-policy.json. Regenerate both documents together.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const policy = JSON.parse(fs.readFileSync(path.join(root, 'security/authorization-policy.json'), 'utf8'));
const roles = ['GUEST', 'USER', 'FUNDRAISER', 'ADMIN', 'GATEWAY'];
const cells = [];
const lines = [
  '# Ma trận phân quyền — Buổi 03', '',
  'Nguồn: tài liệu phạm vi, UC01–UC08/YCCN01–35, README và mã nguồn backend. Xem `../session03/source-review.md` để biết cách xử lý các điểm chưa thống nhất.', '',
  '**Có điều kiện** không có nghĩa là được truy cập mọi dữ liệu. GUEST là khách chưa đăng nhập; USER/FUNDRAISER/ADMIN là tài khoản ACTIVE; GATEWAY là máy chủ thanh toán có chữ ký hợp lệ, không phải vai trò người dùng.', '',
  'LIVE = đã có route, không khẳng định mọi nghiệp vụ đã hoàn thiện. PLANNED = mới thiết kế, chưa được ghi PASS từ phản hồi 404. DEFERRED = ngoài phạm vi chính hoặc còn chờ nhóm chốt.', '',
  'Tiền tố mọi API: `/api/v1`. ADMIN không tự động kế thừa quyền tạo/quản lý chiến dịch của FUNDRAISER; thao tác quản trị đi qua API quản trị. Quyền sở hữu áp dụng cả cho ADMIN khi đọc hồ sơ/thông báo cá nhân.', '',
  '| ID | API / chức năng | Trạng thái | Guest | User | Fundraiser | Admin | Gateway | Điều kiện / nguồn |',
  '|---|---|---|---|---|---|---|---|---|'
];
const cases = [];
for (const row of policy.operations) {
  const values = roles.map(role => {
    if (row.allow.includes(role)) return 'Có';
    const id = `DENY-${row.id}-${role}`;
    let expected = role === 'GUEST' ? 401 : 403;
    if (row.id === 'KYC-SUBMIT' && ['FUNDRAISER', 'ADMIN'].includes(role)) expected = 400;
    if (role === 'GATEWAY') expected = 401;
    if (row.id === 'PAY-WEBHOOK') expected = 403;
    const test = { id, operation: row.id, role, method: row.method, path: row.path, expected,
      state: 'NOT_RUN', availability: row.state,
      precondition: role === 'GUEST' ? 'Không gửi token/cookie hoặc chữ ký cổng thanh toán.' : role === 'GATEWAY' ? 'Chỉ gửi thông tin xác thực máy chủ thanh toán; không có JWT người dùng.' : `JWT hợp lệ của ${role}; tài khoản ACTIVE. Với webhook: JWT người dùng không thay thế chữ ký gateway.`,
      action: `Gửi ${row.method} /api/v1${row.path} với dữ liệu hợp lệ và ID tài nguyên tồn tại theo fixtures.md.`,
      expectedEffect: 'Không trả dữ liệu riêng tư; không tạo/sửa/xóa dữ liệu nghiệp vụ, không phát sinh thông báo hoặc thanh toán.' };
    cases.push(test);
    return `Không [${id}](authorization-test-cases.md#${id.toLowerCase()})`;
  });
  lines.push(`| ${row.id} | ${row.method} \`${row.path}\` — ${row.name} | ${row.state} | ${values.join(' | ')} | ${row.condition.replaceAll('|', '/')} |`);
}
lines.push('', '## Hành động nội bộ', '',
  'YCCN34 (gửi thông báo) và YCCN35 (ghi audit log) do service thực hiện sau nghiệp vụ, không có API công khai để người dùng tự gửi thông báo hệ thống hoặc sửa lịch sử kiểm toán. Mọi vai trò ngoài hệ thống không được gọi trực tiếp; kiểm thử SYS-01/SYS-02 trong additional-test-cases.md.', '',
  '## Truy vết yêu cầu chức năng', '',
  '| Yêu cầu | Các dòng ma trận |', '|---|---|');
for (const [requirement, ids] of Object.entries(policy.requirements)) lines.push(`| ${requirement} | ${ids.join(', ')} |`);
lines.push('', `Tổng ${policy.operations.length} dòng API/chức năng; ${cases.length} ô Không, mỗi ô có đúng một ca dự kiến. Điều kiện sở hữu, token và nghiệp vụ có ca bổ sung trong additional-test-cases.md.`, '');
fs.writeFileSync(path.join(root, 'security/authorization-matrix.md'), lines.join('\n'));
const testLines = ['# Danh mục ca kiểm thử từ từng ô Không — Buổi 03', '',
  'Sinh từ authorization-policy.json. Tất cả ca dưới đây là thiết kế; kết quả thực thi nằm riêng trong ../evidence/. Không coi NOT_RUN, BLOCKED hoặc route chưa tồn tại là PASS.', '',
  'Chuẩn bị tài khoản/tài nguyên theo fixtures.md. Thay tham số đường dẫn bằng ID tồn tại, gửi body hợp lệ để không nhầm lỗi validation/404 với chặn phân quyền. GATEWAY dùng thông tin xác thực gateway, tuyệt đối không dùng JWT Admin.', '',
  'KYC-SUBMIT: Fundraiser/Admin hiện bị từ chối bằng 400 theo service; đây là điều kiện nghiệp vụ đã ghi nhận, không khẳng định middleware trả 403. Các ca webhook dùng 403 theo thiết kế khi thiếu/sai chữ ký.', '',
  '| Test ID | Ô ma trận | Actor | HTTP dự kiến | API | Trạng thái API | Kết quả chạy |', '|---|---|---|---|---|---|---|'];
for (const test of cases) testLines.push(`| <a id="${test.id.toLowerCase()}"></a>${test.id} | ${test.operation} | ${test.role} | ${test.expected} | ${test.method} \`${test.path}\` | ${test.availability} | NOT_RUN |`);
testLines.push('', '## Quy trình áp dụng cho từng ca', '',
  '1. Ghi thời gian, phiên bản mã nguồn và môi trường. Đảm bảo tài khoản/tài nguyên mẫu tồn tại.',
  '2. Chụp trạng thái tài nguyên trước yêu cầu; lấy token đúng actor (khách không gửi token).',
  '3. Gửi đúng method/path trong bảng; dùng body hợp lệ từ OpenAPI đối với API LIVE, hoặc hợp đồng API đã chốt đối với API PLANNED.',
  '4. Đối chiếu mã HTTP và JSON lỗi; đảm bảo response không lộ dữ liệu riêng tư.',
  '5. Kiểm tra trạng thái tài nguyên không đổi; lưu request/response đã che token và thông tin cá nhân.',
  '6. Ghi PASS/FAIL/BLOCKED vào báo cáo thực thi. PLANNED/DEFERRED chưa triển khai phải ghi BLOCKED, không chạy để lấy 404 rồi ghi PASS.', '',
  `Số ca dự kiến: ${cases.length}. JSON kèm theo chứa tiền điều kiện, hành động và hậu điều kiện của từng ca để truy vết tự động.`, '');
fs.writeFileSync(path.join(root, 'security/authorization-test-cases.md'), testLines.join('\n'));
fs.writeFileSync(path.join(root, 'security/authorization-test-cases.json'), JSON.stringify(cases, null, 2) + '\n');
console.log(`${policy.operations.length} operations; ${cases.length} denied cells -> ${cases.length} test cases`);
