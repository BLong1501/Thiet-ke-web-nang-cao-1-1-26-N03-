# Nhật kí hoạt động — triển khai và kiểm tra (21/10/2026)

## Thiết kế

Tái sử dụng bảng `audit_logs`, Prisma/MariaDB, Express, JWT/role ADMIN và trang React hiện có. Không tìm thấy AGENTS.md trong dự án. Không cài thêm thư viện.

- `AuditService.write(options, tx)` dùng chung trong các transaction hiện có; lỗi ghi làm transaction rollback như trước.
- `AuditService.log(options)` được await sau khi nghiệp vụ thành công; lỗi ghi được báo ở server nhưng không đổi kết quả nghiệp vụ đã commit. Đây là cơ chế best-effort, chưa có outbox/retry bền vững: nếu database lỗi ở bước ghi sau commit, sự kiện có thể thiếu.
- Danh tính lấy từ `req.user.userId` hoặc actor đã xác thực được truyền từ service; webhook/hệ thống/khách có `userId = null`. Xác nhận thanh toán bởi admin sử dụng actor admin, không gán nhầm cho người quyên góp.
- Thời gian do database xác định. JSON `details` chỉ lưu mô tả do server tạo, không lưu body, mật khẩu, token, nội dung tự do, tài khoản ngân hàng, thông tin KYC hay dữ liệu thanh toán.
- Dữ liệu nhạy cảm trong JSON của các bản ghi cũ bị che khi đọc API, không sửa/xóa lịch sử đã tồn tại.
- Bỏ middleware cũ chưa được gắn vào app (sai trường user.id và không có ID đối tượng chính xác), tránh ghi trùng.
- Không có API quản trị tạo tùy ý/sửa/xóa nhật kí. `/me` tiếp tục chỉ trả nhật kí của tài khoản đã xác thực; danh sách toàn hệ thống, thống kê, chi tiết và nhật kí người khác chỉ ADMIN được xem.

## Nghiệp vụ đã tích hợp

- Chiến dịch: tạo, cập nhật, phê duyệt/từ chối, hủy.
- Danh mục: tạo, cập nhật, xóa.
- Minh chứng và tiến độ chiến dịch: thêm media, đăng cập nhật.
- Giải ngân: tạo hồ sơ, phê duyệt/từ chối; sửa ID người duyệt thành `req.user.userId`.
- Hồ sơ cá nhân: cập nhật, đổi mật khẩu.
- KYC: gửi và duyệt hồ sơ.
- Người dùng: thay đổi trạng thái tài khoản.
- Cộng đồng: tạo cộng đồng, tham gia/rời cộng đồng, tạo bài viết, bình luận.
- Báo cáo vi phạm: gửi và xử lý.
- Quyên góp: tạo (không ghi lại khi replay idempotency), xác nhận, xác nhận mô phỏng, hoàn tiền mô phỏng; giữ transaction kiểm toán hiện có.
- Tiếp tục ghi đăng nhập và sự kiện bảo mật có sẵn. Các sự kiện thất bại bảo mật có mã riêng, không phải nhật kí nghiệp vụ thành công.

## API và giao diện

`GET /api/v1/activity-logs`: `search`, `userId` (UUID), `action`, `entityName`, `from`, `to`, `page`, `limit` (1–100, mặc định 20). Sắp xếp cố định `createdAt DESC, id DESC`. Tìm trong hành động, đối tượng, ID, mô tả và tên/email người thực hiện.

`GET /api/v1/activity-logs/:id`: UUID hợp lệ; 404 nếu không tồn tại. Endpoint tương thích `/api/v1/users/audit-logs` dùng cùng kiểm tra và cách che dữ liệu cũ.

Ngày `YYYY-MM-DD` bao gồm trọn ngày tại Việt Nam; ISO timestamp phải có múi giờ. Kiểm tra ngày không tồn tại, thứ tự khoảng ngày, kích thước trang và ID trước khi truy vấn.

Trang `/admin/activity-logs`: API thật, tìm kiếm, lọc actor bằng UUID (có thể lấy trong chi tiết), mã hành động, ngày, phân trang server, tổng số dòng, chi tiết tải riêng từ API, CSV trang hiện tại. Có trạng thái tải/rỗng/lỗi/không đủ quyền; không hiển thị dữ liệu cũ khi truy vấn lỗi. Giờ Việt Nam cố định `Asia/Ho_Chi_Minh`; bảng cuộn trong vùng chứa trên màn hình nhỏ.

## Migration / chạy lại

Migration `database/migrations/003_activity_log_indexes.sql` thêm ba index ghép, kiểm tra tồn tại trước khi tạo. Không thêm bảng/trường, reset hay xóa dữ liệu.

Đã chạy migration thành công trên database cấu hình trong backend/.env và xác nhận đủ ba index. Các môi trường khác cần chạy từ thư mục backend:

```powershell
node scripts/migrate-activity-logs.cjs
npm run build
```

Không cần biến môi trường mới cho ứng dụng; tiếp tục dùng DATABASE_URL, JWT_SECRET, Redis và cấu hình API frontend hiện có.

Kiểm tra thật (tạo rồi xóa một danh mục thử nghiệm; giữ nhật kí; yêu cầu tài khoản ADMIN ACTIVE có sẵn):

```powershell
# Trong backend, sau npm run build
$env:ACTIVITY_LIVE_CHECK='1'
node scripts/activity-logs-live-check.cjs
```

Để kiểm tra trình duyệt thật, chạy Vite frontend trên `127.0.0.1:5174`, đặt thêm `$env:ACTIVITY_BROWSER_CHECK='1'` rồi chạy cùng script. Playwright phải có Chromium. Script chuyển tiếp các request đến Express thật/database thật, không giả lập kết quả API. Token kiểm thử không được in và được thu hồi khi kết thúc.

## Kết quả đã thực hiện

- Backend `npm run build`: đạt.
- Frontend `npm run build`: đạt; ESLint ba component thay đổi đạt.
- Backend `npm test`: 99/100 đạt; toàn bộ 17 ca mới trong activity-log-writes và 16 ca activity-logs hiện có đạt.
- Một ca không đạt: `GET /campaigns/:id công khai ẩn STK với khách` ở object-access.test.ts:138. Mã hydrate chiến dịch công khai hiện trả bankAccountNumber, trong khi test đòi null; đã đối chiếu cùng hành vi ở HEAD trước sửa. Không thay đổi quy tắc hiển thị thanh toán ngoài phạm vi nhật kí.
- Playwright có sẵn: trang nhật kí cá nhân/phân quyền, điều hướng trang admin và bố cục admin tablet/mobile đều đạt (ca điều hướng chạy lại sau sửa selector theo header quản trị hiện có).
- Live API/database: tạo/cập nhật/xóa danh mục sinh đúng log và actor; tạo trùng thất bại không sinh log thành công; tìm kiếm, action, actor, ngày, phân trang, chi tiết và quyền 401/403 đạt.
- Live browser/database: đọc dữ liệu thật, tìm kiếm, tải chi tiết API thật; màn hình 390px không tràn toàn trang; thời gian Việt Nam đúng khi timezone trình duyệt là America/New_York. Danh mục thử nghiệm đã xóa, nhật kí giữ lại. Lần chạy đầu lỗi teardown trình duyệt; đã dọn fixture/thu hồi token và chạy lại toàn bộ thành công.
- Chưa kiểm tra tải lớn/concurrency và chưa thao tác thật từng nghiệp vụ tài chính/KYC; chúng được nối vào writer tập trung và kiểm tra qua build/kiểm thử cô lập.

## Các file thay đổi

- `backend/src/core/services/audit.service.ts`, mới `activity-description.ts`; bỏ `core/middleware/audit-log.middleware.ts`.
- `backend/src/modules/activity-logs/`: controller, service, repository, routes, validation.
- Controllers: campaigns, communities, donations, profile, verifications.
- Services: campaigns, donations, users; donation.repository và user.routes.
- `backend/prisma/schema.prisma`; migration 003; scripts mới `migrate-activity-logs.cjs`, `activity-logs-live-check.cjs`.
- Tests: mới `backend/tests/activity-log-writes.test.ts`; mock logger trong `authorization.test.ts` để không kết nối DB thật trong test độc lập.
- Frontend: `AdminActivityLogsPage.tsx`, `AdminNav.tsx`, `layout/Navbar.tsx`, `tests/frontend.spec.ts`.

Các thay đổi có sẵn trong backend/Dockerfile và backend/package-lock.json được giữ nguyên.
