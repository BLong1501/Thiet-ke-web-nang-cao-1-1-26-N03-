# Nạp CSDL và bằng chứng V5 — Buổi 03

## Trạng thái

Chưa có bằng chứng CSDL trực tuyến trong phiên kiểm tra ban đầu. Không ghi đã triển khai hoặc tự tạo ảnh bảng giả. `database/schema.sql` là DDL không chứa DROP; script bên dưới chỉ chạy trên schema trống, seed 5 danh mục và 1 Admin với bcrypt thật. Đây là dữ liệu mẫu khởi tạo, không phải bộ dữ liệu đầy đủ cho test nghiệp vụ tài chính.

Đã chạy thực tế trên MySQL 8.0.46 cục bộ: tạo đủ 15 bảng, kiểm tra 24 khóa ngoại không có bản ghi mồ côi, có 5 danh mục và 1 Admin. Apply lần hai bị từ chối vì schema không còn rỗng. Bằng chứng JSON và `database-refusal.txt` nằm trong `../evidence/`. Đây là một môi trường kiểm thử tạm trên cùng máy, không thay cho online hoặc máy thứ hai.

**Không dùng `database/init.sql` trên CSDL có dữ liệu:** file đó có DROP TABLE. Không chạy cả init.sql và schema.sql lên cùng một schema. Không dùng mật khẩu Admin được ghi trong chú thích init.sql vì chưa xác nhận khớp hash.

## Chuẩn bị và thực hiện

1. Dùng CSDL MySQL riêng cho đồ án trên nhà cung cấp đã chọn. Tạo schema rỗng bằng giao diện quản trị. Không dùng tài khoản/mật khẩu thật trong tài liệu nộp.
2. Cài dependency backend bằng `npm ci` sau khi có lockfile; chạy `npm run prisma:generate` nếu cần chạy BE. Chỉ xem Swagger không cần DB.
3. Tạo `backend/.env` từ `.env.example`. Điền DATABASE_URL thật. Mật khẩu có ký tự đặc biệt phải URL-encode. Các biến bổ sung của công cụ triển khai:

```dotenv
# Không commit file .env thật.
DB_SSL=true
# Đường dẫn CA do nhà cung cấp cung cấp, tương đối thư mục backend; bỏ trống nếu CA tin cậy hệ thống.
DB_SSL_CA=
SEED_ADMIN_EMAIL=admin@example.test
SEED_ADMIN_PASSWORD=<mat-khau-rieng-toi-thieu-12-ky-tu>
```

4. Từ thư mục gốc repository, kiểm tra đích:

```text
node docs/scripts/database.cjs inspect
```

5. Nếu đích là schema rỗng đã được phép sử dụng, nạp lược đồ và mẫu:

```text
node docs/scripts/database.cjs apply --confirm-empty
node docs/scripts/database.cjs inspect
```

Script buộc TLS có kiểm chứng chứng chỉ với máy chủ ngoài localhost. Không đặt rejectUnauthorized=false. Script không tạo database, không DROP/TRUNCATE/ghi đè bảng có sẵn. Mật khẩu Admin không in ra báo cáo. Khi apply có lỗi, DDL MySQL có thể đã tạo một phần bảng; script sẽ từ chối lần chạy tiếp theo vào schema đó. Kiểm tra và dùng schema rỗng mới, không tự xóa dữ liệu.

## Ảnh 02 và nhật ký

- Mở giao diện quản trị của nhà cung cấp hoặc client đã kết nối CSDL trực tuyến.
- Chụp danh sách đủ 15 bảng, có ngữ cảnh xác định môi trường trực tuyến; che mật khẩu/chuỗi kết nối/token và dữ liệu cá nhân.
- Lưu `docs/evidence/anh-02-database-online.png` sau khi kiểm tra ảnh. Chưa có ảnh thì ghi BLOCKED, không dùng ảnh local thay thế.
- Lưu JSON từ inspect/apply; các kiểm tra FK là truy vấn chống mồ côi trên từng khóa ngoại và mong đợi `violations: []`. Kiểm tra cả số FK >0 để tránh PASS giả khi chưa có constraint.
- Đính kèm thời gian, người thao tác, người chứng kiến và máy/hệ điều hành trong `../session03/checklist.md`.
- Theo đề chung cần chạy schema trên hai máy/hệ điều hành khác nhau. Chạy lại trên một máy không đáp ứng yêu cầu này.

## OpenAPI

Từ gốc repository:

```text
node docs/scripts/check-deliverables.cjs
node docs/scripts/serve.cjs
```

Mở `http://127.0.0.1:8081`. Viewer dùng Swagger UI asset cục bộ. Chức năng gửi request bị tắt trong viewer nộp bài để tránh thao tác nhầm dữ liệu; dùng Postman hoặc HTTP client trên môi trường kiểm thử nếu muốn chạy API. Việc mở tài liệu không đòi hỏi backend đang chạy.

Đặc tả chính: `docs/openapi.json`, chuẩn OpenAPI 3.0.3, có 9 API đã có code; các chức năng tương lai trong ma trận. Ảnh Swagger lưu `docs/evidence/openapi-viewer.png`. Chưa tự gán ảnh đó là Ảnh 15 vì đề được cung cấp chưa giải thích nội dung Ảnh 15.
