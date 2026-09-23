# Dữ liệu và quy tắc chạy kiểm thử

## Môi trường

Chạy các ca có ghi dữ liệu trên CSDL kiểm thử riêng. Không sử dụng ảnh CCCD, token hoặc mật khẩu thật trong bằng chứng. Các test tự động `backend/tests/authorization.test.ts` chạy router/middleware/service thật nhưng thay repository/service tại ranh giới DB; không kết nối hoặc sửa CSDL trực tuyến. Kết quả này chứng minh xử lý HTTP/quyền ở phạm vi đã kiểm thử, không chứng minh transaction MySQL hoặc triển khai online.

## Tài khoản và tài nguyên cần có cho kiểm thử tích hợp

| Bí danh | Điều kiện |
|---|---|
| USER_A, USER_B | ACTIVE, role USER, hai ID khác nhau; xác minh liên hệ nếu nghiệp vụ yêu cầu |
| FUNDRAISER_A, FUNDRAISER_B | ACTIVE, role FUNDRAISER, đã duyệt KYC |
| ADMIN_A | ACTIVE, role ADMIN |
| SUSPENDED_A, BANNED_A | Token cấp trước khi tài khoản bị khóa/cấm, token chưa hết hạn |
| KYC_A, KYC_B | Hồ sơ của USER_A/USER_B, trạng thái PENDING |
| CAMPAIGN_A, CAMPAIGN_B | Thuộc hai Fundraiser tương ứng; có bản DRAFT, ACTIVE, PAUSED và hết hạn |
| DONATION_A, DONATION_B | Thuộc USER_A/USER_B; có giao dịch thành công và đang chờ |
| NOTIFICATION_A, NOTIFICATION_B | Thuộc hai user khác nhau |
| COMMUNITY_A | Nếu nhóm giữ phân hệ: nhóm riêng với member và non-member |
| GATEWAY | Tài khoản sandbox và khóa ký của nhà cung cấp; không phải JWT người dùng |

ID trong đường dẫn phải tồn tại để chứng minh kiểm tra quyền. Body phải hợp lệ theo hợp đồng API, trừ ca cố ý kiểm tra validation. Tạo dữ liệu qua fixture/seed riêng; không gọi đăng ký với `role=ADMIN` để chuẩn bị tài khoản.

## Kết quả và bằng chứng

- PASS: đã chạy, thỏa mãn tất cả kỳ vọng trong phạm vi test.
- FAIL: đã chạy nhưng sai mã HTTP, lộ dữ liệu hoặc có thay đổi trái phép.
- BLOCKED: thiếu endpoint, DB, tài khoản hoặc điều kiện cần thiết.
- NOT_RUN: mới thiết kế, chưa thực thi.
- Tỷ lệ đạt = PASS / (PASS + FAIL) × 100%. Không đưa BLOCKED/NOT_RUN vào mẫu số; nếu chưa chạy, ghi N/A.
- Ca chặn thao tác phải kiểm tra dữ liệu trước/sau hoặc xác nhận handler ghi dữ liệu không được gọi. Response 404 do route chưa viết không phải bằng chứng phân quyền.

Ghi thời gian, commit, môi trường, ID test, request đã che thông tin nhạy cảm, HTTP/response và kết quả. Kết quả test dùng stub cần được ghi rõ, không trộn với kiểm thử DB hoặc sản xuất.
