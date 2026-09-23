# Bảng kiểm nộp Buổi 03 — V4/V5

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
| Chung | Ảnh 15 đúng quy định hồ sơ | NEEDS_INFO — đề trích dẫn chưa mô tả nội dung ảnh; không tự đổi nhãn ảnh Swagger |
| Chung | Chạy schema trên 2 máy/hệ điều hành | NOT_CONFIRMED — kiểm tra local/container trên cùng máy không đủ điều kiện này |
| Chung | Nhóm trưởng/giảng viên chứng kiến, nhật ký | NOT_CONFIRMED — không tự ghi tên hoặc chữ ký |
| Cá nhân | Commit/push và lịch sử đóng góp riêng Buổi 03 | PENDING — file đã chuẩn bị trong working tree; chưa commit/push |
| Cá nhân | Cập nhật dashboard của nhóm | PENDING — chỉ số có trong hồ sơ, chưa có địa chỉ/quyền ghi dashboard |

## Chỉ số có căn cứ

| Vai trò | Chỉ số | Giá trị trong phạm vi kiểm tra |
|---|---|---|
| V4 | Số rủi ro BM1–BM12 có bằng chứng thực thi | 5/12 nhóm có bằng chứng cục bộ một phần; không đồng nghĩa nghiệm thu hoàn toàn |
| V4 | Số ca đã chạy và tỷ lệ đạt | 35 ca; 35 PASS; 0 FAIL; 100% của bộ tự động cục bộ |
| V4 bổ sung | Ô Không đã có ca dự kiến | 149/149 = 100%; đây là độ phủ thiết kế |
| V5 | Số lần phát hành thành công lên online có bằng chứng | 0 lần được xác minh trong phiên này; không khẳng định lịch sử ngoài repository là 0 |
| V5 | Số trang báo cáo hoàn thành | N/A — sản phẩm Markdown/JSON chưa dàn trang; không lấy số tệp làm số trang |

## Nhật ký cần xác nhận trước nộp

| Hoạt động | Thời gian | Người thao tác | Máy / hệ điều hành | Người chứng kiến | Bằng chứng |
|---|---|---|---|---|---|
| Kiểm tra OpenAPI, test BE | Xem timestamp trong evidence | Hỗ trợ tự động trong phiên làm việc | Windows; Node 24 | Chưa xác nhận | authorization-run.json, document-validation.json, ảnh Swagger |
| Chạy schema/seed và kiểm FK local | 22/09/2026 21:41 (UTC+7) | Hỗ trợ tự động trong phiên làm việc | MySQL 8.0.46 trong Docker Linux trên cùng máy Windows | Chưa xác nhận | database-apply-1790088065317.json, database-inspect-1790088065521.json, database-refusal.txt |
| CSDL trực tuyến | Chưa thực hiện | Chưa xác nhận | Chưa xác nhận | Chưa xác nhận | Chờ Ảnh 02 và kết quả database-inspect |
| Máy thứ hai | Chưa xác nhận | Chưa xác nhận | Phải khác hệ điều hành theo đề | Chưa xác nhận | Chờ nhật ký |

Không đánh dấu V5 hoàn thành toàn bộ trước khi có triển khai online và Ảnh 02 thật. Không sửa tác giả/thời gian Git để tạo bằng chứng đóng góp giả.
