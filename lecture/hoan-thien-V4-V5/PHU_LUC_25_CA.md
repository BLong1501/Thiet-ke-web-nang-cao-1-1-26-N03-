# Phụ lục 25 ca kiểm thử

Môi trường: LOCAL; thời điểm: 2026-10-14T05:44:52.626Z. Dùng dữ liệu local demo và MySQL thật. Tiền đề: ADMIN/FUNDRAISER/USER mẫu, ba khoản thành công đã có bút toán. Các bước và mã HTTP mong đợi cụ thể nằm trong script; chạy online cần bản được nhóm rà soát để không sửa dữ liệu chung.

| Mã | Nhóm | Kịch bản | Mong đợi | Kết quả thực tế |
|---|---|---|---|
| TC-01 | Nghiệp vụ | Đăng nhập ADMIN | Assertion trong scripts/v4-v5-check.ts | PASS {"status":200,"role":"ADMIN"} |
| TC-02 | Nghiệp vụ | Đăng nhập USER | Assertion trong scripts/v4-v5-check.ts | PASS {"status":200,"role":"USER"} |
| TC-03 | Nghiệp vụ | Đăng nhập FUNDRAISER | Assertion trong scripts/v4-v5-check.ts | PASS {"status":200,"role":"FUNDRAISER"} |
| TC-04 | Nghiệp vụ | Danh mục thật | Assertion trong scripts/v4-v5-check.ts | PASS {"count":5} |
| TC-05 | Nghiệp vụ | Danh sách chiến dịch | Assertion trong scripts/v4-v5-check.ts | PASS {"count":1} |
| TC-06 | Nghiệp vụ | Chi tiết chiến dịch | Assertion trong scripts/v4-v5-check.ts | PASS  |
| TC-07 | Nghiệp vụ | Hồ sơ chính mình | Assertion trong scripts/v4-v5-check.ts | PASS  |
| TC-08 | Nghiệp vụ | Lịch sử đóng góp của tôi | Assertion trong scripts/v4-v5-check.ts | PASS  |
| TC-09 | Nghiệp vụ | Danh sách thông báo | Assertion trong scripts/v4-v5-check.ts | PASS  |
| TC-10 | Biên/ngoại lệ | Email đăng nhập sai định dạng | Assertion trong scripts/v4-v5-check.ts | PASS  |
| TC-11 | Biên/ngoại lệ | Ngày không tồn tại | Assertion trong scripts/v4-v5-check.ts | PASS  |
| TC-12 | Biên/ngoại lệ | Trang âm | Assertion trong scripts/v4-v5-check.ts | PASS  |
| TC-13 | Biên/ngoại lệ | Giới hạn trang quá lớn | Assertion trong scripts/v4-v5-check.ts | PASS  |
| TC-14 | Biên/ngoại lệ | Thiếu trường KYC | Assertion trong scripts/v4-v5-check.ts | PASS  |
| TC-15 | Biên/ngoại lệ | Upload thiếu tệp | Assertion trong scripts/v4-v5-check.ts | PASS  |
| TC-16 | Phân quyền/bảo mật | Thiếu token | Assertion trong scripts/v4-v5-check.ts | PASS  |
| TC-17 | Phân quyền/bảo mật | Chữ ký token giả | Assertion trong scripts/v4-v5-check.ts | PASS  |
| TC-18 | Phân quyền/bảo mật | USER không được đọc thống kê admin | Assertion trong scripts/v4-v5-check.ts | PASS  |
| TC-19 | Phân quyền/bảo mật | CSRF domain giả chứa localhost | Assertion trong scripts/v4-v5-check.ts | PASS  |
| TC-20 | Phân quyền/bảo mật | SQL injection tìm kiếm | Assertion trong scripts/v4-v5-check.ts | PASS  |
| TC-21 | Phân quyền/bảo mật | Script đổi đuôi ảnh | Assertion trong scripts/v4-v5-check.ts | PASS  |
| TC-22 | Phân quyền/bảo mật | Tệp riêng tư yêu cầu đăng nhập | Assertion trong scripts/v4-v5-check.ts | PASS  |
| TC-23 | Báo cáo/CSV | Báo cáo daily và xuất CSV | Assertion trong scripts/v4-v5-check.ts | PASS {"groups":3,"received":35000000,"manualReceived":"35000000.00"} |
| TC-24 | Báo cáo/CSV | Báo cáo campaigns và xuất CSV | Assertion trong scripts/v4-v5-check.ts | PASS {"groups":1,"received":35000000,"manualReceived":"35000000.00"} |
| TC-25 | Báo cáo/CSV | Báo cáo categories và xuất CSV | Assertion trong scripts/v4-v5-check.ts | PASS {"groups":1,"received":35000000,"manualReceived":"35000000.00"} |

Kết quả 25/25. Phân bố 9/6/7/3. Không dùng kết quả local làm chứng nhận đã chạy online.
