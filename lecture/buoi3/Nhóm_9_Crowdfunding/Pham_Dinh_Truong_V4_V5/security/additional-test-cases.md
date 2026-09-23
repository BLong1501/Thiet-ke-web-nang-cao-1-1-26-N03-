# Ca bổ sung ngoài từng ô Không

Tất cả dòng dưới đây là thiết kế. Chỉ cập nhật kết quả trong báo cáo chạy thực tế; trạng thái ban đầu NOT_RUN. Dùng fixtures.md. Các endpoint chưa viết là BLOCKED khi thực hiện một đợt chạy.

| ID | Thao tác và điều kiện | Kỳ vọng |
|---|---|---|
| TOKEN-01 | Gọi từng API bảo vệ không token | 401, handler nghiệp vụ không chạy |
| TOKEN-02 | Gọi từng API bảo vệ với JWT sai chữ ký, hết hạn, hoặc refreshToken thay accessToken | 401, không lộ hồ sơ |
| TOKEN-03 | Token chứa role ADMIN nhưng tài khoản vừa bị thu hồi quyền | Bị chặn theo quyền hiện tại; backend hiện chưa kiểm tra lại DB, xem ISSUE-02 |
| TOKEN-04 | Token còn hạn của tài khoản vừa SUSPENDED/BANNED | Bị chặn; chưa được middleware hiện tại bảo đảm |
| ROLE-01 | Đăng ký với body thêm role=ADMIN/FUNDRAISER | Tài khoản vẫn USER; không truyền role tùy ý xuống repository |
| ROLE-02 | User nộp KYC hợp lệ lần đầu | 201; userId lấy từ token; status PENDING |
| ROLE-03 | Fundraiser/Admin nộp KYC | 400 theo service hiện tại; không gọi create/update |
| ROLE-04 | User gửi lại hồ sơ PENDING/APPROVED | 400; dữ liệu không đổi |
| ROLE-05 | Admin duyệt hồ sơ PENDING | 200; APPROVED + FUNDRAISER + notification trong transaction; kiểm tra DB riêng |
| ROLE-06 | Admin từ chối với lý do hợp lệ | 200; REJECTED; không nâng quyền |
| ROLE-07 | Admin gửi review status=PENDING hoặc trạng thái lạ | 400; không gọi service review; không tạo notification |
| ROLE-08 | Admin từ chối nhưng thiếu lý do hoặc lý do dưới 5 ký tự sau trim | 400; dữ liệu không đổi |
| IDOR-01 | USER_A gọi /auth/me kèm userId=USER_B | Chỉ trả USER_A, không passwordHash |
| IDOR-02 | USER_A gọi /verifications/my-status?userId=USER_B | Chỉ hồ sơ USER_A |
| IDOR-03 | USER_A nộp KYC với body userId=USER_B | Chỉ tạo hồ sơ USER_A; bỏ trường userId |
| IDOR-04 | FUNDRAISER_A sửa/gửi duyệt/thêm media/cập nhật CAMPAIGN_B | 403, không đổi CAMPAIGN_B; một lần chạy cho từng API |
| IDOR-05 | USER_A đọc receipt/status DONATION_B | 403 hoặc chính sách che tồn tại 404 đã thống nhất; không lộ dữ liệu |
| IDOR-06 | USER_A đánh dấu NOTIFICATION_B đã đọc | 403; NOTIFICATION_B không đổi |
| IDOR-07 | FUNDRAISER_A lập phiếu/bổ sung chứng từ của CAMPAIGN_B | 403, không ghi khoản chi |
| MEMBER-01 | Non-member đăng bài hoặc đọc nhóm riêng | 403; áp dụng nếu phân hệ được giữ trong phạm vi |
| PUBLIC-01 | Khách xem chiến dịch đang công khai và báo cáo công khai | 200, không lộ KYC, tài khoản ngân hàng riêng tư hoặc donor ẩn danh |
| PUBLIC-02 | Khách biết ID/slug chiến dịch DRAFT hoặc chưa duyệt | 404 theo thiết kế che tài nguyên chưa công khai |
| PUBLIC-03 | USER_A quyên góp ẩn danh | Backend giữ liên kết giao dịch với User; API công khai không lộ danh tính |
| PAYMENT-01 | Webhook thiếu/sai chữ ký, sai số tiền/transaction | Từ chối; không tăng currentAmount |
| PAYMENT-02 | Lặp cùng webhook hợp lệ 10 lần | Chỉ ghi nhận 1 lần, các lần sau 200/409 theo hợp đồng gateway |
| PAYMENT-03 | 20 giao dịch hợp lệ đồng thời | Tổng campaign bằng tổng donation SUCCESS, sai số 0 VNĐ |
| PAYMENT-04 | Donation vào chiến dịch PAUSED/hết hạn | Bị từ chối; không tạo giao dịch mới |
| BM01-01 | Đăng ký rồi kiểm tra hash lưu trong DB | bcrypt cost >=10, không plaintext; không trả passwordHash |
| BM05-01 | Email sai, thiếu tên, mật khẩu quá ngắn, body KYC thiếu ảnh | 400 với errors[field,message] |
| BM05-02 | Query page/limit âm, cực lớn, không nguyên | 400 theo đề xuất; hiện chưa validate, xem ISSUE-05 |
| BM06-01 | Payload SQL injection ở email/id/search | Không bypass, không lộ dữ liệu; xét code dùng Prisma và chạy trên DB kiểm thử |
| BM07-01 | Kiểm tra Git và cấu hình production thiếu JWT secrets | Không có secret thật; production phải dừng nếu thiếu secret (hiện chưa đáp ứng) |
| BM08-01 | Đăng nhập với NODE_ENV=production | Cookie refreshToken có HttpOnly, Secure, SameSite=Lax; token không vào log |
| BM09-01 | Giả lập lỗi DB chứa chuỗi nhạy cảm | Response 500 không có stack/secret; hiện err.message có thể bị trả nguyên |
| BM10-01 | Chứng từ rỗng, sai MIME/đuôi, >5 MB | Từ chối; theo AC-05 chứng từ rỗng là 422; API upload chưa có |
| BM11-01 | XSS trong story/comment, mở trên trình duyệt | Không thực thi; frontend nghiệp vụ chưa có |
| BM12-01 | Duyệt/từ chối KYC và đổi quyền | Audit log chứa actor/target/action/time; backend hiện chưa ghi audit log |
| SYS-01 | USER/FUNDRAISER/ADMIN/GATEWAY gọi API tự gửi thông báo hệ thống | Không có route công khai để giả mạo; 404; xác nhận không ghi notification |
| SYS-02 | USER/FUNDRAISER/ADMIN/GATEWAY gọi API sửa/xóa audit log | Không có route công khai; 404; dữ liệu lịch sử không đổi |

Chia sẻ liên kết chiến dịch là thao tác phía client; không tự thêm quyền sửa chiến dịch. Yêu cầu xác minh email, bổ sung hồ sơ và quản lý phiên chưa hoàn tất trong backend: ghi BLOCKED cho ca tích hợp tương ứng.
