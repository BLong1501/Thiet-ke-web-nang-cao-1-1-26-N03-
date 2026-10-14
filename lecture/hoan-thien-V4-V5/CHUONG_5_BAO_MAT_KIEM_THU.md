# Chương 5. Bảo mật, hiệu năng và khả năng truy cập

## 5.1. Phạm vi và mô hình kiểm chứng

Ứng dụng FundTrust gồm React/Vite, Express và MySQL/Prisma, Redis cho giới hạn đăng nhập và lưu trạng thái thu hồi token. Tệp ảnh riêng tư được lưu ngoài thư mục public. Đợt kiểm chứng này chạy trên môi trường local của nhóm; không suy diễn kết quả thành việc đã triển khai trực tuyến. Báo cáo phân biệt kiểm tra HTTP/MySQL thật, fixture giao diện và kiểm tra tĩnh Git.

Tài khoản ADMIN quản lý; FUNDRAISER phụ trách chiến dịch; USER đóng góp. Máy chủ kiểm tra token, vai trò và quyền trên đối tượng. Điều hướng frontend chỉ hỗ trợ thao tác, không thay cho kiểm quyền API. Các bộ test có sẵn ở docs/security và backend/tests được dùng làm tài liệu tham chiếu; ma trận đầy đủ cần được đồng bộ với các endpoint mới.

## 5.2. Cách quản lý phiên và cấu hình

JWT access có thời hạn, refresh dùng cookie HttpOnly/SameSite strict, Secure ở production. Mỗi token cấp mới có jti ngẫu nhiên. Khi đăng xuất, hash SHA-256 của access/refresh được lưu vào danh sách thu hồi Redis đến thời điểm hết hạn; middleware xác thực từ chối token đã thu hồi. Refresh xoay token và thu hồi refresh cũ. Không lưu token hoặc mật khẩu thật trong bằng chứng.

Production buộc khóa JWT riêng biệt có ít nhất 32 ký tự; không sử dụng fallback của local. Cần Redis bền vững khi chạy nhiều instance. Memory fallback chỉ phục vụ phát triển, không chứng minh thu hồi phiên bền vững sau restart. Thay mật khẩu, khóa tài khoản và refresh đồng thời cần tiếp tục đánh giá trong ma trận nghiệm thu.

## 5.3. Bảng mười hai rủi ro theo mã của tài liệu kỹ thuật

| Mã | Biện pháp/vị trí code | Kiểm chứng và giới hạn | Ảnh cần nộp |
|---|---|---|---|
| BM1 SQL injection | Prisma và Prisma.sql trong analytics; whitelist kind | TC-20 trả kết quả rỗng, không lộ SQL. Chưa thử toàn bộ search/path trong dự án. | 16 |
| BM2 XSS | React escape đầu ra; bio là plain text; các trường markup khác qua sanitizer; CSP | Đợt Buổi 8 mới giữ script/onerror nguyên dạng trong bio, lưu/đọc thật và mở lại bằng Chrome: không dialog. Ảnh ứng dụng ở lecture/buoi9/V5/evidence/Anh_17_XSS_plain_text.png. | 17 |
| BM3 CSRF | Exact Origin whitelist, Bearer giảm rủi ro gửi tự động, cookie SameSite; cookie thiếu Origin bị 403 | TC-19 domain localhost.attacker.example bị 403. Cần kiểm trên tên miền online và mô hình cookie thực tế trước nghiệm thu. | 18 |
| BM4 IDOR | object-access và kiểm quyền service; upload owner | Donor khác đọc donation bị 403, chủ đọc 200; upload test kiểm người khác bị 403. Không thay cho mọi đối tượng trong hệ thống. | 19 |
| BM5 Phân quyền | authenticate/authorize, route admin analytics | TC-18 USER bị 403; bộ hồi quy Auth/KYC đã có. Cần bảng tất cả ô Không theo ma trận mới. | 20 |
| BM6 Mật khẩu | bcrypt cost 10+, không trả hash | Kiểm hash local với regex bcrypt cost >=10, login DTO không có passwordHash. Không đưa hash thật vào ảnh public. | 21 |
| BM7 Phiên | JWT jti/expiry, token-revocation, cookie HttpOnly/Strict/Secure | Logout rồi dùng access/refresh cũ đều 401. Secure phụ thuộc production; cần ảnh cookie online và kiểm đổi mật khẩu/thu hồi vai trò. | 22 |
| BM8 Upload | magic bytes + sharp decode/re-encode, 5 MiB, random UUID, private storage | 12 ca upload, ảnh 23a/23b local. Không quét virus tổng quát hoặc nhận PDF/video. | 23 |
| BM9 Che lỗi | app.ts production mask, X-Request-Id, server log | Fault injection user.findUnique trả 500 chung có requestId, không lộ SQL/path. Lỗi cố ý không sửa dữ liệu MySQL. | 24 |
| BM10 Dò mật khẩu | Redis theo email khóa sau quá 5 lần; login-rate IP 60 yêu cầu/10 phút; audit | Lần 6 của tài khoản kiểm thử không tồn tại trả 429; log nhóm có LOGIN_FAILED/ACCOUNT_LOCKED_TEMPORARY. Cần ảnh nhật ký thực tế và tải đồng thời. | 25 |
| BM11 Bí mật | .env ignored; scanner Git reachable objects | 478 text objects, 0 phát hiện với 4 detector. Không chứng nhận mọi mật khẩu/Gmail/key trong mọi nội dung đã sạch. Các secret đã chia sẻ trong chat cần đổi trước deploy. | Chụp kết quả audit theo hướng dẫn |
| BM12 Header/HTTPS | Helmet API; năm header ở vercel.json | Supplement thấy đủ 5 header local. HTTPS/chứng thư/tên miền và header FE online chờ deploy. | 26 |

Vị trí chính: backend/src/core/middleware, backend/src/core/auth/token-revocation.ts, backend/src/core/utils/jwt.util.ts, backend/src/modules/uploads, frontend/vercel.json. Bằng chứng JSON nằm ở evidence/security-supplement.json; các ảnh 16–26 chưa đủ để nhận hoàn thành toàn bộ Buổi 8.

## 5.4. Hiệu năng

Báo cáo mới tổng hợp tại MySQL bằng SUM/COUNT DISTINCT/GROUP BY, nối ledger_entries, donations, campaigns và categories, không tải mọi dòng vào vòng lặp JS để tính tổng. CSV xuất toàn bộ các nhóm trong bộ lọc; trên 1000 nhóm trả lỗi yêu cầu thu hẹp khoảng ngày thay vì âm thầm cắt bớt dữ liệu. Khoảng lọc tối đa 366 ngày và thứ tự có khóa nhóm ổn định.

Code nhóm có Redis campaign-cache và giới hạn phân trang. Chưa đo trước/sau trên >=5000 dòng, 5 endpoint, mỗi endpoint 50 lần trong đợt này; không ghi số trung vị hoặc mức cải thiện không có bằng chứng. Phần đó thuộc nhiệm vụ V2/V3 và cần kết quả của nhóm để đưa vào báo cáo chung.

## 5.5. WCAG 2.1 AA và metadata

Trang thống kê có nhãn ngày, nút thao tác, h1/h2, caption/header bảng, bảng số liệu thay cho biểu đồ, chú thích không phụ thuộc màu. Bộ axe có sẵn đã chạy 9 màn hình với fixture: không có serious/critical. Trang thống kê chạy với API/MySQL local: 0 violation trong các tag WCAG2 A/AA và WCAG2.1 A/AA.

| Tiêu chí | Bằng chứng | Kết luận |
|---|---|---|
| 1.1.1 Nội dung không phải văn bản | Biểu đồ role img có nhãn, bảng số liệu tương ứng | Có triển khai, axe không phát hiện trên analytics |
| 1.3.1 Cấu trúc và quan hệ | h1/h2, caption, th scope, label input | Đạt trong phạm vi audit analytics |
| 1.4.3 Tương phản | Axe fixture và analytics | Chưa kiểm thủ công mọi hover/focus/chart/text |
| 2.1.1 Bàn phím | HTML form/button/link chuẩn, test bàn phím có sẵn | Cần chạy trọn luồng login + nghiệp vụ và ghi kết quả |
| 2.4.1 Bỏ qua khối | Skip link sẵn có của nhóm | Cần ảnh/kiểm bàn phím thực tế |
| 2.4.6 Tiêu đề/nhãn | Page, label ngày, các h2 báo cáo | Audit analytics 0 violation |
| 2.4.7 Focus | CSS chỉ báo focus sẵn có | Cần kiểm thủ công trên mọi nền/trạng thái |
| 3.3.1 Nhận biết lỗi | Notice khoảng ngày, lỗi API/CSV | Có triển khai, cần kiểm với screen reader |
| 4.1.2 Tên/vai trò/giá trị | Axe và semantic HTML | Đạt phạm vi quét, không chứng nhận toàn site |

Script generate-seo.cjs sinh robots.txt và sitemap.xml từ SITE_URL. Bản local dùng localhost; khi deploy phải sinh lại với origin HTTPS thật. Sitemap hiện có bốn trang public tĩnh; cần bổ sung slug chiến dịch public nếu nhóm chọn lập chỉ mục chiến dịch. Không đưa đường dẫn hồ sơ/admin vào sitemap.
