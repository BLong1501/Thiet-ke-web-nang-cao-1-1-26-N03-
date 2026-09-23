# Bài nộp Buổi 03 — Phạm Đình Trường — V4/V5

**Nhóm 9 · Đề tài Crowdfunding · Ngày cập nhật 23/09/2026**

Hồ sơ chỉ gồm phần cá nhân . Cấu trúc nộp kế thừa Buổi 2: thư mục buổi học → nhóm → thành viên → sản phẩm theo vai trò.

## Danh mục sản phẩm

| Vai trò | Sản phẩm | Tệp nộp |
|---|---|---|
| V4 | Ma trận phân quyền, 66 thao tác, truy vết YCCN01–35 | [Ma trận](security/authorization-matrix.md) · [Dữ liệu quyền](security/authorization-policy.json) |
| V4 | 149 ca dự kiến cho 149 ô Không | [Ca kiểm thử](security/authorization-test-cases.md) · [JSON](security/authorization-test-cases.json) |
| V4 | Kiểm thử sở hữu, token, bảo mật và dữ liệu mẫu | [Ca bổ sung](security/additional-test-cases.md) · [Fixtures](security/fixtures.md) |
| V4 | Đánh giá BM01–BM12 và kết quả 35/35 ca cục bộ | [Bảng bằng chứng](security/security-evidence.md) · [Kết quả test](evidence/authorization-run.json) |
| V5 | OpenAPI 3.0.3 mô tả 9 API hiện có | [Đặc tả](openapi.json) · [Kết quả kiểm tra](evidence/document-validation.json) |
| V5 | Ảnh mở đặc tả | [Tổng quan](evidence/openapi-viewer.png) · [KYC](evidence/openapi-viewer-kyc.png) |
| V5 | Quy trình nạp schema, seed và kiểm khóa ngoại | [Hướng dẫn CSDL](deployment/README.md) |
| V5 | Bằng chứng MySQL cục bộ: 15 bảng, 24 FK, 0 bản ghi mồ côi | [Apply](evidence/database-apply-1790088065317.json) · [Inspect](evidence/database-inspect-1790088065521.json) · [Từ chối apply lại](evidence/database-refusal.txt) |
| V4/V5 | Checklist, nhật ký, chỉ số và đối chiếu nguồn | [Checklist](session03/checklist.md) · [Đối chiếu](session03/source-review.md) |

## Trạng thái nộp

Các mục xác nhận ngoài CSDL đã được người dùng xác nhận ngày 23/09/2026, ghi `CONFIRMED_BY_USER` trong checklist. Xác nhận không làm thay đổi kết quả test, các lỗi còn mở hoặc trạng thái LIVE/PLANNED/DEFERRED. Riêng Ảnh 15 đã được người dùng xác nhận nhưng chưa có tệp riêng trong repository; hai ảnh Swagger vẫn giữ đúng tên và nội dung gốc.

**CSDL vẫn chờ xác nhận:** chưa có triển khai trực tuyến và Ảnh 02; chưa xác nhận chạy schema trên hai máy/hệ điều hành cùng nhật ký CSDL. Kết quả MySQL cục bộ không thay thế các hạng mục này. Vì vậy phần V5 chưa hoàn thành toàn bộ.

35/35 ca là kiểm thử cục bộ có thay thế ranh giới truy cập DB; 149/149 là độ phủ thiết kế ca từ chối, không phải 149 ca đã chạy. Bằng chứng thực thi giữ nguyên thời gian ghi nhận trong từng tệp.

## Mở và kiểm tra bài

Bản nộp chứa trực tiếp tài liệu và ảnh để đọc trên GitHub. [Nguồn hồ sơ](../../../../docs/README.md), [mã kiểm thử](../../../../backend/tests/authorization.test.ts), [schema SQL](../../../../database/schema.sql) và [công cụ CSDL](../../../../docs/scripts/database.cjs) được duy trì tại gốc repository.

Tại thư mục gốc repository, sau khi cài dependency backend theo hướng dẫn nguồn:

```text
node docs/scripts/check-deliverables.cjs
node docs/scripts/serve.cjs
```

Mở Swagger tại `http://127.0.0.1:8081`. Các lệnh và đường dẫn `docs/`, `backend/`, `database/` trong tài liệu luôn tính từ gốc repository, không chạy từ thư mục bài nộp.

## Đồng bộ hồ sơ

Sửa nguồn trong `docs/`, kiểm tra rồi chạy `node docs/scripts/package-submission.cjs`. [Manifest](manifest.json) ghi nguồn và SHA-256 của 18 tệp đóng gói để đối chiếu (văn bản chuẩn hóa xuống dòng LF, ảnh giữ nguyên byte); không sửa riêng các bản sao. Không đưa thông tin kết nối, mật khẩu hoặc token vào bài nộp.
