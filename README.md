# Dự án Hệ thống Gây quỹ Cộng đồng (Crowdfunding) - CĐ09

Dự án này sử dụng mô hình kiến trúc **Modular Monolith** kết hợp MVC cho Backend và cấu trúc phân rã theo Component cho Frontend. Cấu trúc này giúp dễ dàng mở rộng, quản lý code theo từng nhóm tính năng (Feature-driven) và hạn chế xung đột khi làm việc nhóm.

## Cấu trúc thư mục (Modular Monolith)

- `/backend`: API Server (Node.js/Express hoặc NestJS)
  - `src/`
    - `core/`: Các thành phần cốt lõi dùng chung cho toàn dự án
      - `config/`: Cấu hình hệ thống, biến môi trường
      - `database/`: Kết nối cơ sở dữ liệu
      - `middleware/`: Middleware dùng chung (Authentication, Error Handler...)
      - `utils/`: Các hàm tiện ích (Helpers)
    - `modules/`: Các phân hệ chức năng độc lập (Mỗi phân hệ tuân thủ MVC/Layered)
      - `campaigns/`: Xử lý Chiến dịch (Controller, Service, Model, Route)
      - `communities/`: Xử lý Mạng xã hội, Cộng đồng
      - `donations/`: Xử lý Quyên góp, Thanh toán
      - `users/`: Xử lý Người dùng, Đăng nhập
      - `verifications/`: Xử lý Xác minh danh tính
- `/frontend`: Giao diện người dùng (React)
  - `assets/`: Tài nguyên tĩnh như hình ảnh, font chữ, CSS chung
  - `components/`: Các UI component tái sử dụng (Button, Modal, Card...)
  - `pages/`: Các trang chính của ứng dụng
  - `services/`: Các module gọi API giao tiếp với Backend
- `/database`: Chứa script tạo cơ sở dữ liệu (`.sql`), sơ đồ ERD, tài liệu thiết kế DB
- `/docs`: Đặc tả API (Swagger, Postman), tài liệu phân tích nghiệp vụ

---

## ⚡ RÀNG BUỘC KỸ THUẬT BẮT BUỘC ĐÃ TÍCH HỢP
Dự án này được thiết kế để vượt qua mọi tiêu chuẩn khắt khe nhất của đồ án:
1. **Kiến trúc 3 tầng (3-tier Layered):** Tách bạch rõ ràng `Controller` -> `Service` -> `Repository/Model` trong từng module.
2. **API RESTful Chuẩn mực:** Giao tiếp hoàn toàn bằng JSON, trả mã HTTP status đúng chuẩn (200, 201, 400, 401, 403, 404, 500), có Error Handler thống nhất và quản lý phiên bản API (VD: `/api/v1/...`).
3. **Database (MySQL + Prisma):** Bảo đảm >6 thực thể có quan hệ thực chất, chống hoàn toàn việc ghép chuỗi SQL (SQL Injection).
4. **Auth & Phân quyền:** Mã hóa mật khẩu bằng `bcrypt`. Xác thực bằng Session (với Cookie an toàn) hoặc JWT (có Refresh Token). Tối thiểu 3 vai trò: *Admin, Fundraiser (Người gây quỹ), User (Người dùng thường)*.
5. **Bảo mật Toàn diện:** Chống XSS, CSRF (với SameSite Cookie/CSRF Token), chống IDOR (kiểm tra quyền sở hữu resource trước khi cho phép sửa/xóa).
6. **Hiệu năng & Khả năng truy cập:** 
   - Dùng Redis để Caching.
   - Phân trang (Pagination) cho danh sách Campaign/Donation.
   - Đánh chỉ mục (Index) các cột hay truy vấn. 
   - Frontend sẽ có thẻ Meta SEO và đáp ứng chuẩn WCAG 2.1 AA.
7. **Triển khai (Nhánh B):** 
   - **Local:** Sử dụng `docker-compose.yml` để dev.
   - **Production:** Triển khai API lên nền tảng miễn phí (VD: **Render, Railway, Koyeb**). Kết nối với CSDL quản trị (VD: **Neon, Supabase, Aiven**). Cần lưu ý hiện tượng "ngủ đông" (cold start) làm chậm request đầu tiên trên các host miễn phí.
8. **Quản lý mã nguồn & Tài liệu:** Sinh tài liệu API tự động bằng Swagger. Tuyệt đối dùng file `.env.example`. Sử dụng Git với lịch sử commit trung thực. Mời giảng viên vào Repo ngay từ Mốc 1.

---

## 📋 Yêu cầu Đặc thù Chuyên đề (CĐ09)

### Thực thể Dữ liệu (Dự kiến)
- [ ] `ChienDich` (Campaign)
- [ ] `NguoiUngHo` (Donator / Backer)
- [ ] `KhoanDongGop` (Donation Transaction)
- [ ] `NguoiDung` (User / Fundraiser)

### Chức năng Cốt lõi (Bắt buộc)
- [ ] Khởi tạo chiến dịch gây quỹ với mục tiêu số tiền và thời hạn cụ thể.
- [ ] Người dùng thực hiện đóng góp cho chiến dịch.
- [ ] Theo dõi tiến độ gây quỹ và công khai lịch sử đóng góp.

### Chức năng Nâng cao (Định hướng nghiên cứu)
- [ ] Trực quan hóa tiến độ gây quỹ theo thời gian thực bằng biểu đồ.
- [ ] Xác thực người dùng qua mã xác thực một lần (OTP) hoặc xác thực thư điện tử.
- [ ] Xuất báo cáo minh bạch tài chính của chiến dịch dưới dạng PDF hoặc CSV.

### Yêu cầu Kỹ thuật Đặc thù
- [ ] **Transaction DB:** Áp dụng transaction khi ghi nhận khoản đóng góp để đảm bảo tính toàn vẹn giữa số tiền đóng góp và tổng tiến độ chiến dịch.
- [ ] **Audit Trail:** Thiết kế lịch sử giao dịch theo nguyên tắc không thể chỉnh sửa sau khi ghi nhận (phục vụ yêu cầu minh bạch tài chính).
- [ ] **Kiểm soát danh tính:** Kiểm soát chặt chẽ việc xác thực danh tính trước khi cho phép khởi tạo chiến dịch.

---

## 📋 Danh sách Chức năng Chi tiết (Checklist)

### A. Authentication & User
- [ ] Đăng ký/đăng nhập/đăng xuất.
- [ ] Xác minh email hoặc số điện thoại.
- [ ] Quản lý hồ sơ cá nhân.
- [ ] Đổi mật khẩu và quản lý phiên đăng nhập.

### B. Identity Verification & Fundraiser
- [ ] Gửi hồ sơ xác minh.
- [ ] Cung cấp thông tin định danh và tài liệu xác minh.
- [ ] Theo dõi trạng thái hồ sơ.
- [ ] Admin duyệt/từ chối/yêu cầu bổ sung.
- [ ] Cấp hoặc thu hồi quyền Fundraiser.

### C. Crowdfunding Campaign
- [ ] Tạo campaign.
- [ ] Lưu nháp, chỉnh sửa và gửi duyệt.
- [ ] Upload ảnh/video/tài liệu.
- [ ] Thiết lập mục tiêu và thời gian gây quỹ.
- [ ] Theo dõi tiến độ và trạng thái campaign.
- [ ] Đăng cập nhật campaign.

### D. Donation & Payment
- [ ] Chọn số tiền quyên góp.
- [ ] Quyên góp ẩn danh.
- [ ] Thanh toán trực tuyến.
- [ ] Theo dõi trạng thái giao dịch.
- [ ] Xem lịch sử và biên lai quyên góp.

### E. Transparency
- [ ] Công khai số tiền đã huy động.
- [ ] Đăng các khoản chi.
- [ ] Upload chứng từ/hóa đơn.
- [ ] Hiển thị báo cáo tài chính của campaign.

### F. Social & Community
- [ ] Kết bạn, theo dõi và chặn người dùng.
- [ ] Tạo và tham gia community.
- [ ] Đăng bài, bình luận, like và chia sẻ.
- [ ] Tạo/đăng campaign trong community.

### G. Admin & Moderation
- [ ] Quản lý User.
- [ ] Quản lý verification.
- [ ] Duyệt campaign.
- [ ] Quản lý donation/payment.
- [ ] Xử lý report.
- [ ] Suspend/ban User hoặc Campaign.
- [ ] Quản lý category.

### H. Notification & Audit
- [ ] Thông báo verification, campaign, donation và social.
- [ ] Ghi nhận audit log cho các hành động quan trọng.

---

## 🛡️ Yêu cầu Bảo mật Ứng dụng Web (OWASP Top 10)

Đây là các tiêu chí bảo mật **bắt buộc** cần tích hợp trực tiếp vào mã nguồn:

### 1. Phòng chống SQL Injection (A03:2021)
- **Tuyệt đối không** nối chuỗi SQL trực tiếp với dữ liệu đầu vào của người dùng.
- **Giải pháp:** Mọi giá trị đầu vào phải đi qua **Prepared Statement** (nếu dùng database driver thuần) hoặc sử dụng tính năng escape/parameterized tự động của ORM/Query Builder.

### 2. Phòng chống Cross-Site Scripting - XSS (A03:2021)
- **Phía Backend:** Thêm HTTP Header bảo mật: `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline';`.
- **Phía Frontend (React):** 
  - Tận dụng cơ chế tự động escape của React (ví dụ: `<p>{userInput}</p>`).
  - **TUYỆT ĐỐI TRÁNH** sử dụng `dangerouslySetInnerHTML` trừ trường hợp bắt buộc (như render Rich Text).
  - Nếu phải render HTML, bắt buộc dùng thư viện **DOMPurify** để sanitize (làm sạch) dữ liệu trước.

### 3. Bảo mật Session & Cookie
- Cấu hình Cookie/Session chặt chẽ:
  - `httponly: true` (Ngăn JavaScript phía client đọc Cookie -> Chống XSS).
  - `secure: true` (Chỉ truyền Cookie qua kết nối HTTPS).
  - `samesite: "Lax"` (Bảo vệ cơ bản trước tấn công CSRF).
- Cân nhắc thêm cơ chế fingerprint (kiểm tra IP, User-Agent) để phát hiện Session Hijacking.

### 4. Validate Dữ liệu Đầu vào (Data Validation)
- Backend là **tuyến phòng thủ cuối cùng**. Bắt buộc phải validate toàn bộ dữ liệu (cắt khoảng trắng, giới hạn độ dài, kiểm tra kiểu dữ liệu như int/float/email/date...) đối với mọi request từ client.
- Gợi ý sử dụng các thư viện validate mạnh mẽ ở backend Node.js như `Joi`, `Zod` hoặc `express-validator` để làm sạch và kiểm tra dữ liệu trước khi xử lý.
