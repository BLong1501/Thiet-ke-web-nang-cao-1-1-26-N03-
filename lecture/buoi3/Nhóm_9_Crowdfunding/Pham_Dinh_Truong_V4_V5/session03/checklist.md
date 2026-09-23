# Bảng kiểm nộp Buổi 03 — V4/V5

Người nộp: **Phạm Đình Trường — Nhóm 9 — V4/V5**. Cập nhật ngày 23/09/2026 theo xác nhận của người dùng: các mục cần xác nhận ngoài CSDL đã được xác nhận. `CONFIRMED_BY_USER` là xác nhận do người dùng cung cấp, không phải bằng chứng thực thi mới. Phần CSDL (bao gồm online, Ảnh 02, chạy schema trên hai máy và nhật ký CSDL) vẫn chờ xác nhận.

## Sản phẩm cá nhân

| Vai trò | Hạng mục | Trạng thái |
|---|---|---|
| V4 | Ma trận quyền và truy vết YCCN01–35 | DONE — 66 dòng; có LIVE/PLANNED/DEFERRED và nguồn quyết định |
| V4 | Mỗi ô Không có ca dự kiến | DONE — 149 ô, 149 ca; kiểm tra tự động 100% |
| V4 | Ca sở hữu tài nguyên/token/bảo mật bổ sung | DONE — additional-test-cases.md và fixtures.md |
| V4 | Bộ test cho backend hiện có | DONE — 35/35 PASS, có giới hạn stub DB rõ ràng |
| V4 | Bảng bằng chứng BM01–BM12 | DONE — phân biệt đã chạy, đọc code và lỗi còn mở |
| V5 | Tệp đặc tả OpenAPI mở được | DONE — 9 API hiện có, kiểm tra parser và Swagger UI |
| V5 | Ảnh xem đặc tả | DONE — openapi-viewer.png, openapi-viewer-kyc.png |
| V5 | Công cụ nạp schema/seed, kiểm FK, hướng dẫn | DONE — script không xóa dữ liệu, chỉ apply schema trống |
| V5 hỗ trợ | Chạy trên MySQL cục bộ rỗng | DONE — MySQL 8.0.46, 15 bảng, 24 FK, 0 bản ghi mồ côi; seed 1 Admin + 5 danh mục; từ chối apply lại vào schema có dữ liệu |
| V5 | Nạp lược đồ/dữ liệu lên CSDL trực tuyến | BLOCKED — chưa có cấu hình kết nối và xác nhận CSDL đích |
| V5 | Ảnh 02 danh sách bảng online | BLOCKED — chưa được chụp từ môi trường trực tuyến |
| Chung | Ảnh 15 đúng quy định hồ sơ | CONFIRMED_BY_USER — người dùng đã xác nhận; tệp Ảnh 15 riêng chưa được cung cấp trong repository; không đổi nhãn ảnh Swagger |
| Chung | Chạy schema trên 2 máy/hệ điều hành | NOT_CONFIRMED — kiểm tra local/container trên cùng máy không đủ điều kiện này |
| Chung | Nhóm trưởng/giảng viên chứng kiến, nhật ký | CONFIRMED_BY_USER — phần ngoài CSDL; không tự điền tên, giờ hoặc chữ ký chưa cung cấp |
| Cá nhân | Commit/push và lịch sử đóng góp riêng Buổi 03 | Đã có lịch sử hồ sơ Buổi 03 tại fe25030, test tại e6624c0, sửa validation tại be1d83f; lần đóng gói này đối chiếu lịch sử Git, không sửa tác giả/thời gian |
| Cá nhân | Cập nhật dashboard của nhóm | CONFIRMED_BY_USER — người dùng xác nhận đã hoàn tất; chưa có URL để kiểm chứng độc lập |

## Chỉ số có căn cứ

| Vai trò | Chỉ số | Giá trị trong phạm vi kiểm tra |
|---|---|---|
| V4 | Số rủi ro BM1–BM12 có bằng chứng thực thi | 5/12 nhóm có bằng chứng cục bộ một phần; không đồng nghĩa nghiệm thu hoàn toàn |
| V4 | Số ca đã chạy và tỷ lệ đạt | 35 ca; 35 PASS; 0 FAIL; 100% của bộ tự động cục bộ |
| V4 bổ sung | Ô Không đã có ca dự kiến | 149/149 = 100%; đây là độ phủ thiết kế |
| V5 | Số lần phát hành thành công lên online có bằng chứng | 0 lần được xác minh trong phiên này; không khẳng định lịch sử ngoài repository là 0 |
| V5 | Số trang báo cáo hoàn thành | N/A — sản phẩm Markdown/JSON chưa dàn trang; không lấy số tệp làm số trang |

## Nhật ký và nguồn xác nhận

| Hoạt động | Thời gian | Người thao tác | Máy / hệ điều hành | Người chứng kiến | Bằng chứng |
|---|---|---|---|---|---|
| Kiểm tra OpenAPI, test BE | Xem timestamp trong evidence | Hỗ trợ tự động trong phiên làm việc | Windows; Node 24 | Người dùng xác nhận đã có chứng kiến; chưa cung cấp tên | authorization-run.json, document-validation.json, ảnh Swagger |
| Chạy schema/seed và kiểm FK local | 22/09/2026 21:41 (UTC+7) | Hỗ trợ tự động trong phiên làm việc | MySQL 8.0.46 trong Docker Linux trên cùng máy Windows | Chưa xác nhận | database-apply-1790088065317.json, database-inspect-1790088065521.json, database-refusal.txt |
| CSDL trực tuyến | Chưa thực hiện | Chưa xác nhận | Chưa xác nhận | Chưa xác nhận | Chờ Ảnh 02 và kết quả database-inspect |
| Máy thứ hai | Chưa xác nhận | Chưa xác nhận | Phải khác hệ điều hành theo đề | Chưa xác nhận | Chờ nhật ký |

Không đánh dấu V5 hoàn thành toàn bộ trước khi có triển khai online và Ảnh 02 thật. Không sửa tác giả/thời gian Git để tạo bằng chứng đóng góp giả.
