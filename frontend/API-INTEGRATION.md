# Hợp đồng tích hợp FE

## Quy ước chung

JSON thành công: `{ success: true, data, meta? }`. Lỗi: HTTP 4xx/5xx với `{ success: false, message, errors? }`. Danh sách dùng `data: []` và `meta: { page, limit, total, totalPages }`; nhật ký hiện dùng `data: { items, meta }`, FE hỗ trợ cả hai.

Tiền tệ nhận number hoặc chuỗi decimal và được chuẩn hóa trước khi hiển thị. Ngày giờ là ISO 8601. Vai trò API là `USER`, `FUNDRAISER`, `ADMIN`. Trạng thái chiến dịch/giao dịch/KYC giữ nguyên enum backend.

Các API đã có được đối chiếu trực tiếp từ routes, validation, controller và repository trong backend, không chỉ dựa vào README cũ. Đổi mật khẩu gửi `oldPassword`; media gửi `url`; giải ngân gửi `disbursementDate`, `proofDocuments` và `note`.

### Nhật ký cá nhân và nhật ký admin

- `GET /activity-logs/me?page&limit&search&action&from&to`: tài khoản đã đăng nhập, chỉ trả hoạt động có `userId` khớp token. `data` gồm `{ id, action, entityName, entityId, createdAt }[]` và `meta` phân trang. Không nhận userId tùy ý, không trả chi tiết nội bộ/IP/thông tin tài khoản khác.
- `/activity-logs`, `/activity-logs/stats`, `/activity-logs/:id`, `/activity-logs/user/:userId` và `POST /activity-logs` vẫn chỉ dành cho Admin.
- Trang user gọi API `/me`; trang admin gọi API toàn hệ thống. Không lọc dữ liệu của người dùng khác tại frontend để giả lập phân quyền.

## API còn thiếu: hợp đồng FE dự kiến

Các mục bên dưới cần được backend hiện thực hoặc cùng điều chỉnh trước khi bật tính năng thật. Đây không phải khẳng định backend hiện đã hỗ trợ.

### Cộng đồng

- `GET /communities?page&limit` → danh sách `{ id, name, description, memberCount, isJoined }`.
- `POST /communities` body `{ name, description }` → nhóm vừa tạo.
- `POST /communities/:id/join` → chuyển trạng thái tham gia/rời nhóm, trả `{ isJoined }`.
- `GET /communities/:id/posts?page&limit` → `{ id, author: { fullName }, content, createdAt, likeCount, isLiked }[]`.
- `POST /communities/:id/posts` body `{ content }` → bài viết; backend kiểm tra thành viên.
- `POST /communities/:id/posts/:postId/like` → `{ isLiked, likeCount }`; kiểm tra user và chống like trùng.
- `GET /communities/:id/posts/:postId/comments?page&limit` → `{ id, author: { fullName }, content, createdAt }[]`.
- `POST /communities/:id/posts/:postId/comments` body `{ content }` → bình luận mới.

### Thông báo

- `GET /notifications?page&limit` → `{ id, title, message, isRead, createdAt, link? }[]`.
- `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` → kết quả cập nhật của user đang đăng nhập.
- `link` chỉ được FE điều hướng nếu là đường dẫn nội bộ bắt đầu bằng một dấu `/`.

### Báo cáo vi phạm

- `POST /reports` body `{ targetType: 'CAMPAIGN', targetId, reason, description }` → báo cáo mới.
- `GET /admin/reports?page&limit` → `{ id, targetType, targetId, reason, description, status, resolution?, createdAt }[]`.
- `PATCH /admin/reports/:id/resolve` body `{ status: 'RESOLVED', resolution }` → báo cáo đã xử lý.

Backend phải xác thực, phân quyền, kiểm tra ownership/membership, giới hạn dữ liệu và ghi audit log. Route guard FE chỉ điều khiển trải nghiệm người dùng, không thay thế kiểm tra ở server.

## Các khả năng cần API bổ sung khác

Upload ảnh/video/tài liệu công khai, quản lý bạn bè/theo dõi/chặn, thu hồi/cấp role trực tiếp, Google sign-in với client ID, báo cáo PDF có chữ ký/xác thực máy chủ và cổng thanh toán thật chưa nằm trong các luồng đã kiểm chứng. In/PDF trên FE là bản in dữ liệu giao dịch từ server, không phải chứng từ ngân hàng được ký số.
