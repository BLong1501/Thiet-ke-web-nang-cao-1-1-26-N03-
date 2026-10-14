# Tiến độ V4/V5 – Buổi 7 đến Buổi 10

Nguồn yêu cầu: Sổ tay thực hành 10 buổi CSE702051, trang 39–54; tài liệu kỹ thuật mục 7.1, 7.3, 7.4, 8.5, 8.6. Mốc code nhóm: ea35045. Người dùng chọn triển khai/URL thành phần riêng, thực hiện sau.

## Đã thực hiện và kiểm chứng local

- B7 V4: giữ API upload đã có, khôi phục ignore ảnh riêng. Bằng chứng 23a/23b đã nằm trong lecture/buoi7. Ảnh có ngữ cảnh vai trò/thời điểm cần được nhóm bổ sung trước chốt nộp.
- B7 V5: thêm ba báo cáo sổ cái tại /admin/analytics; lọc ngày Việt Nam, truy vấn SUM/GROUP BY phía MySQL, xuất CSV toàn bộ tập được lọc, ba biểu đồ và bảng thay thế cho người không đọc được biểu đồ. Không đè module reports/tố giác.
- B8: chặn Origin giả chứa localhost, giới hạn IP đăng nhập, thu hồi access/refresh khi logout, mã phiên mới mỗi lần cấp, requestId trong lỗi, từ chối khóa JWT production không hợp lệ. Production che lỗi chi tiết đã có trong code nhóm, nay có kiểm chứng gây lỗi ở ranh giới DB.
- B9 V4: bộ 25 ca thật, phân bố 9 nghiệp vụ/6 biên/7 bảo mật/3 báo cáo, JSON kết quả và ba CSV. Tổng thu đối chiếu SQL trực tiếp: 35.000.000 VND ở mỗi báo cáo trên dữ liệu mẫu hiện tại.
- B9 V5: axe trên 9 màn hình fixture đạt tiêu chí không có serious/critical; trang thống kê với dữ liệu MySQL có 0 violation. Đây là bằng chứng tự động có phạm vi cụ thể, không chứng nhận toàn bộ WCAG AA.
- Có scanner bốn mẫu bí mật trên toàn bộ Git object truy cập được: 478 object văn bản, không có phát hiện ở lần chạy hiện tại; chưa bảo đảm phát hiện mọi loại bí mật.

## Cần hoàn tất bên ngoài phiên local

- B7/B8 V5: deploy, HTTPS, năm header trên tên miền FE/API, mở file CSV bằng Excel, chạy lại 25 ca online; ảnh 24/26 phải có ngữ cảnh môi trường thật.
- B8 V4: bổ sung toàn bộ ảnh 16–26, kiểm tra mọi ô Không trong ma trận quyền; 25 ca có phạm vi giới hạn không thay cho toàn ma trận.
- BM7: storage thu hồi token dùng Redis; fallback RAM chỉ ổn cho một process và không bền qua restart. Khi deploy cần Redis bền vững, kiểm tra logout/refresh thực tế. Thu hồi sau đổi mật khẩu/khóa tài khoản cần kiểm tra riêng.
- B9 V5: kiểm tra bàn phím trọn luồng login/nghiệp vụ, tương phản mọi trạng thái, screen reader, công cụ trên tên miền; file sitemap/robots phải sinh lại với SITE_URL thật.
- B10 V4: tích hợp Chương 5/6 và phụ lục vào báo cáo chung 30–80 trang, cập nhật mục lục/hình/bảng, kết xuất DOCX/PDF và rà soát với nhóm.
- B10 V5: quay video 8–15 phút trên hệ thống trực tuyến, giọng thuyết minh, che token; thêm video vào gói nháp; hoàn thiện 19 thành phần theo Phụ lục 08; người thật ký và nộp Canvas.
- Sao lưu/phục hồi online và dựng lại trên máy sạch do nhóm thực hiện, không nhận hoàn thành bằng việc build trên máy hiện tại.

## Tiếp tục sau gián đoạn

Đọc file này trước, xem git log và evidence. Chạy backend/scripts/v4-v5-check.ts chỉ trên local. Không chạy seed/reset/kiểm thử ghi dữ liệu vào Aiven. Không apply toàn bộ stash cũ vì module reports hiện là tố giác. .env và các bản backup .env không được commit. Chỉ chọn file cụ thể khi git add.

## Xem và nộp

Mở http://localhost:5173/admin/analytics với tài khoản Admin local. Tài khoản mẫu được tạo trước: admin@crowdfunding.vn, mật khẩu demo Password@123 (không dùng cho production). Ảnh/JSON/CSV nằm tại evidence. Hồ sơ local là gói chuẩn bị, không coi là đã nộp Canvas hoặc đã triển khai.
