# Kịch bản video 13 phút – quay sau triển khai

Chuẩn bị: URL FE/API thật, dữ liệu mô phỏng, tài khoản ba vai trò, 1280×720 trở lên, microphone, tắt autofill mật khẩu và thông báo cá nhân. Không để lộ token/secret. Ghi thông tin nhóm/lớp/đề tài thật ở phần mở đầu.

| Thời gian | Thao tác và lời thuyết minh |
|---|---|
| 00:00–01:00 | Giới thiệu đề tài gây quỹ, bài toán, nhóm và URL HTTPS. Nêu dữ liệu mô phỏng. |
| 01:00–02:30 | Giải thích kiến trúc React/Express/Prisma/MySQL/Redis, vai trò và health không cần login. |
| 02:30–05:00 | USER đăng nhập, mở chiến dịch, tạo khoản đóng góp mô phỏng, kiểm lịch sử; không chuyển tiền thật. |
| 05:00–06:30 | FUNDRAISER xem chiến dịch của mình, cập nhật hoặc giải thích hồ sơ KYC đã chuẩn bị. |
| 06:30–08:00 | ADMIN xét duyệt hồ sơ/chiến dịch, xem nhật ký và số liệu thay đổi. |
| 08:00–09:30 | Thuật toán hoàn tiền/chống lặp đã có: chỉ dùng fixture riêng đủ điều kiện, trình diễn hai yêu cầu và kết quả đúng; không dùng dữ liệu chung khi chưa được nhóm cho phép. |
| 09:30–11:00 | API gọi chéo 403, upload giả415, đăng nhập sai429 với tài khoản riêng; cho thấy header trên domain. |
| 11:00–12:00 | Bảng hiệu năng thật của V2/V3, audit WCAG và thao tác bằng bàn phím. Không nói có benchmark nếu chưa có. |
| 12:00–13:00 | Ba báo cáo /admin/analytics, đổi ngày, xuất/mở CSV, nêu giới hạn và kết luận. |

Chưa có video trong đợt local này. Người thực hiện quay phải ghi thời điểm, URL, thao tác thật và giọng thuyết minh; ảnh tĩnh ghép slideshow không thay cho video online theo yêu cầu.
