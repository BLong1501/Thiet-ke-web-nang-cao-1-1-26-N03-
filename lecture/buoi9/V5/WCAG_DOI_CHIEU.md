# Bảng đối chiếu WCAG 2.1 mức AA – V5

| Tiêu chí | Kiểm chứng thực tế | Kết quả/phạm vi |
|---|---|---|
| 1.1.1 Nội dung không phải văn bản | Axe 6 trang, alt/nhãn biểu đồ; bảng số liệu thay thế | Không có violation tự động trong phạm vi quét |
| 1.3.1 Thông tin và quan hệ | Label input, h1/h2, table headers/caption | Không có violation; không kiểm hết mọi trạng thái modal |
| 1.4.3 Tương phản | Lighthouse trang chủ100; axe color-contrast | Ba trang có incomplete cần xem thủ công. Không nhận toàn site đạt AA |
| 2.1.1 Bàn phím | Tab/type/Enter login USER và lưu profile; reload đối chiếu DB | Hai luồng PASS; còn các thao tác admin/KYC khác chưa kiểm trong phiên |
| 2.1.2 Không bẫy bàn phím | Tab chuyển tới input/nút, Enter hoạt động | Đạt hai luồng đã thực hiện; dialog phức tạp chưa được chứng nhận |
| 2.4.1 Bỏ qua khối | Skip-link của nhóm xuất hiện trong thứ tự Tab | Có triển khai, axe không phát hiện lỗi |
| 2.4.2 Tiêu đề trang | Lighthouse SEO, Helmet/Seo metadata | Trang chủ local SEO100; kiểm lại title/canonical theo domain khi deploy |
| 2.4.6 Tiêu đề và nhãn | GetByLabel Email/Mật khẩu/Giới thiệu, heading h1 | Locator và bàn phím hoạt động thật |
| 2.4.7 Focus rõ | Screenshot nút Đăng nhập/Lưu thông tin đang focus | Có ảnh thật; tương phản mọi focus/background chưa kiểm toàn bộ |
| 3.3.1 Nhận biết lỗi | API400 có message/field/requestId; Notice của app | Có báo lỗi, screen reader thông báo lỗi còn cần kiểm thủ công |
| 4.1.2 Tên/vai trò/giá trị | Axe6trang + semantic fields/buttons | Không violation; dynamic ARIA toàn site chưa kiểm |

Không có người chứng kiến hoặc kiểm screen-reader đầy đủ trong phiên này. Ghi nhận người kiểm/thời gian/URL thật khi chốt nộp, không tự ký thay nhóm trưởng.
