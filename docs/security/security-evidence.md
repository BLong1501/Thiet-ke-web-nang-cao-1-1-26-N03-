# Bằng chứng bảo mật BM01–BM12 — Buổi 03

## Cách tính chỉ số

Đợt kiểm tra cục bộ: **5/12 nhóm có bằng chứng thực thi trong phạm vi đã kiểm tra** (BM01–BM05). Đây không phải 5/12 yêu cầu đã đạt toàn hệ thống. BM04 mới kiểm tra identity của Auth/KYC; BM05 chưa kiểm tra toàn bộ dữ liệu/query. Các bằng chứng đọc mã nguồn được ghi riêng, không cộng thành số nhóm đã chạy.

Bộ tự động: **35 ca chạy, 35 PASS, 0 FAIL, tỷ lệ đạt 100% trong bộ 35 ca**. 149 ca từ ma trận là danh mục thiết kế riêng; không tuyên bố 149/149 đã chạy. Chi tiết tại `../evidence/authorization-run.json`, mã kiểm thử `../../backend/tests/authorization.test.ts`.

| Mã | Bằng chứng thực thi / đọc mã | Phạm vi và việc còn thiếu |
|---|---|---|
| BM01 mật khẩu | ROLE-01 chạy service đăng ký, kiểm hash bcrypt cost 10 và không truyền role từ input | PASS phạm vi service; chưa kiểm cột DB và mọi luồng mật khẩu |
| BM02 xác thực | TOKEN-01/02: 6 route bảo vệ thiếu token/sai chữ ký; thêm token hết hạn và refresh thay access | PASS phạm vi route có code; API tương lai chưa kiểm |
| BM03 phân quyền | USER/FUNDRAISER gọi 3 route Admin bị 403 trước handler; Admin được qua; KYC submit cấm Fundraiser/Admin ở service bằng 400 | PASS các trường hợp đã chạy; chưa kiểm thu hồi quyền/token cũ (ISSUE-02) |
| BM04 IDOR | IDOR-01/02/03: profile, trạng thái KYC và nộp KYC lấy principal từ token, bỏ userId/role giả mạo | PASS phạm vi identity Auth/KYC; campaign/donation/notification chưa có API để nghiệm thu |
| BM05 validation | ROLE-07/08 và BM05-01: chặn trạng thái review không hợp lệ, lý do ngắn/thiếu, KYC thiếu trường | PASS các input đã chạy; query phân trang chưa validate (ISSUE-05) |
| BM06 SQL injection | Đọc repositories: thao tác dùng Prisma | Chưa chạy payload trên DB nghiệp vụ; chưa chứng nhận hoàn tất |
| BM07 secrets | .gitignore loại .env; đọc JWT có fallback secret | Chưa audit toàn lịch sử Git; cần bỏ fallback production (ISSUE-03) |
| BM08 cookie | Đọc AuthController: refreshToken HttpOnly, SameSite=lax, Secure khi production | Chưa có test cookie production/CSRF; refresh/logout chưa triển khai |
| BM09 lỗi | Có sendError và global handler; không trả stack trực tiếp | err.message 500 vẫn có thể lộ nội dung nội bộ (ISSUE-04) |
| BM10 upload | Input KYC hiện chỉ nhận URL | Chưa có endpoint upload kiểm MIME/kích thước; không ghi PASS |
| BM11 XSS | app.use(helmet()); frontend nghiệp vụ chưa có | Chưa chạy payload qua UI nghiệp vụ và chứng minh escape/sanitize |
| BM12 audit | Có bảng/model audit_logs | Duyệt KYC chưa ghi audit log (ISSUE-06); không ghi PASS chỉ vì có bảng |

## Bằng chứng bổ sung

- `../evidence/document-validation.json`: OpenAPI hợp lệ, 9 route khớp mã nguồn, 149 ô cấm có đủ test, truy vết 35 YCCN.
- `../evidence/openapi-viewer.png` và `openapi-viewer-kyc.png`: ảnh thật từ Swagger UI cục bộ.
- Kết quả FK/seed nếu có: `../evidence/database-*.json`. Đây là bằng chứng CSDL; không thay thế kiểm thử IDOR/API tích hợp.
