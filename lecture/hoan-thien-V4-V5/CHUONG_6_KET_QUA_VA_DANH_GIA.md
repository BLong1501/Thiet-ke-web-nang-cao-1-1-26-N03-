# Chương 6. Kết quả thực hiện và đánh giá

## 6.1. Kết quả chức năng

Phần bổ sung dùng code nhóm ea35045 làm nền. Module tố giác reports giữ nguyên chức năng; module analytics mới phục vụ thống kê. ADMIN có mục Thống kê trên thanh điều hướng ngang và truy cập /admin/analytics. Mỗi báo cáo có biểu đồ, bảng số liệu, bộ lọc from/to và CSV. Các báo cáo tính từ bút toán RECEIPT/REFUND theo thời điểm phát sinh, UTC+7; ròng không phải tiền có thể giải ngân vì chưa trừ chi.

Ba báo cáo chạy trên dữ liệu local hiện có: tổng thu 35.000.000 VND, đã hoàn 0, ròng 35.000.000. Mỗi báo cáo được đối chiếu với SUM trực tiếp của ledger_entries trong cùng biên ngày. Dữ liệu local là mô phỏng và không đại diện quy mô thực tế.

## 6.2. Kết quả kiểm thử

Bộ 25 ca chạy HTTP thật qua Express/MySQL local, kết quả 25/25. Phân bố 9 ca nghiệp vụ, 6 ca ngoại lệ/biên, 7 ca phân quyền/bảo mật, 3 ca báo cáo/CSV; đáp ứng tỷ lệ ở mục 7.4 tài liệu kỹ thuật. Script từ chối DATABASE_URL ngoài localhost để tránh chạy kiểm thử ghi dữ liệu vào Aiven của nhóm.

Các ca nghiệp vụ xác nhận đăng nhập ba vai trò, danh mục, chiến dịch, hồ sơ, lịch sử đóng góp và thông báo. Chúng chưa bao phủ toàn bộ quyên góp/KYC/hoàn tiền mới qua ba vai trò; các luồng tài chính cần bộ Buổi 6 và kiểm thử smoke riêng của nhóm.

Hai kiểm thử biên ngày/CSV và 12 ca upload đều đạt (Node thống kê 15 test gồm test cha). Seven supplemental checks đã đạt ở thời điểm chạy: header, bcrypt, logout, login429, IDOR, stored XSS và che lỗi production. Các check bổ sung không được cộng để thay đổi tỷ lệ 25 ca. Kiểm thứ tự ngày và phép escape CSV giúp ngăn xuất lỗi cấu trúc; việc mở CSV bằng Excel cần ảnh chứng minh riêng.

Kết quả axe 9 trang fixture là kiểm tra giao diện có dữ liệu mô phỏng qua network interception, không phải kiểm thử MySQL. Trang analytics có audit riêng kết nối API thật với 0 violation. Không khẳng định WCAG AA toàn site từ một lần quét tự động.

## 6.3. Đóng góp V4/V5

V4 bổ sung kiểm chứng bảo mật, bộ 25 ca, kiểm tra data range/CSV và file bằng chứng có thể chạy lại. V5 bổ sung báo cáo, biểu đồ, export, cấu hình header FE và tài liệu/gói nháp. Mỗi commit gắn với phần việc thực tế, không tạo commit rỗng hoặc đổi ngày để tăng số lượng.

Ảnh báo cáo và kết quả nằm ở evidence. Các chương này là nội dung để tích hợp vào báo cáo chung; chưa phải báo cáo toàn nhóm 30–80 trang có DOCX/PDF, mục lục tự động, chữ ký hoặc bản ghi hình. Chỉ người thực sự chứng kiến mới ký nhật ký.

## 6.4. Hạn chế và việc còn lại

Deploy do người dùng chọn làm riêng. Cần URL thật, HTTPS, header tại FE/API, Redis bền vững, storage ảnh bền vững, khóa bí mật đã xoay, smoke đủ vai trò và 25 ca chạy online. Video phải quay 8–15 phút, trên URL thật, có giọng thuyết minh. Chưa có video hoặc URL thì gói không được gọi là nộp cuối hoàn chỉnh.

Chưa có thử dựng lại trên máy sạch của một thành viên khác; chưa kiểm backup/restore online. Không sử dụng số liệu build local thay cho những yêu cầu này. Cần đối chiếu 19 thành phần của Phụ lục 08 và báo cáo đủ 30–80 trang trước khi ký bảng kiểm.

## 6.5. Ma trận chuẩn đầu ra

| Chuẩn | Bằng chứng V4/V5 hiện có | Phần phải bổ sung |
|---|---|---|
| 1.1 | Luồng báo cáo, truy vấn/biểu đồ/export và test chức năng | Đối chiếu báo cáo chung, nghiệp vụ đầy đủ |
| 4.1 | Hướng dẫn dựng local, API analytics và gói source nháp | Dựng lại bởi thành viên khác trên máy sạch |
| 4.2 | 25 ca, supplement, ảnh upload và báo cáo, WCAG JSON | Ảnh 16–26/30/32 có ngữ cảnh, test online |
| 4.3 | Commit thực tế, bảng giới hạn và lộ trình triển khai | Nhật ký có chứng kiến, video, vận hành/nộp bài |

## 6.6. Kết luận

Phần local đã có ba báo cáo có thể dùng và xuất dữ liệu, cùng kiểm thử chức năng/bảo mật có thể tái chạy. Việc phân biệt bằng chứng chạy thật và phần chưa kiểm chứng giúp nhóm đưa kết luận đúng phạm vi. Bước kế tiếp là kiểm chứng trực tuyến, bổ sung chứng cứ người dùng, biên tập toàn văn và đóng gói cuối cùng.
