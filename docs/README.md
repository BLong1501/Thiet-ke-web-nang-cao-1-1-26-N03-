# Hồ sơ V4 và V5 — Buổi 03

## Đọc từ đâu

| Sản phẩm | Tệp |
|---|---|
| Ma trận phân quyền, trạng thái API và liên kết từng ô Không | [authorization-matrix.md](security/authorization-matrix.md) |
| 149 ca dự kiến tương ứng 149 ô Không | [authorization-test-cases.md](security/authorization-test-cases.md) |
| Ca sở hữu dữ liệu, token, bảo mật và nghiệp vụ | [additional-test-cases.md](security/additional-test-cases.md) |
| Dữ liệu và quy trình chạy test | [fixtures.md](security/fixtures.md) |
| Bằng chứng BM01–BM12 | [security-evidence.md](security/security-evidence.md) |
| Đặc tả 9 API đã có backend | [openapi.json](openapi.json) |
| Cách nạp và xác minh CSDL trực tuyến | [deployment/README.md](deployment/README.md) |
| Mâu thuẫn tài liệu và phát hiện backend | [source-review.md](session03/source-review.md) |
| Bảng kiểm và chỉ số nộp bài | [checklist.md](session03/checklist.md) |

## Kiểm tra và mở tài liệu

Yêu cầu Node.js tương thích dependency backend (môi trường đã dùng Node 24). Từ thư mục `backend`:

```text
npm ci
npm run prisma:generate
npm run build
npm test
npm run docs:check
npm run docs:serve
```

Mở `http://127.0.0.1:8081`. Swagger dùng tài nguyên cục bộ và có thể mở khi chưa chạy backend/DB. `npm test` kiểm tra HTTP/middleware/service với phần truy cập dữ liệu được thay thế có kiểm soát; không ghi vào DB thật.

## Cập nhật

- Quyền nằm trong `security/authorization-policy.json`; sửa rồi chạy `node docs/scripts/generate-authorization.cjs` từ thư mục gốc để đồng bộ ma trận và các ca dự kiến.
- `openapi.json` là đặc tả dùng để nộp và mở Swagger; sau khi sửa chạy `node docs/scripts/check-deliverables.cjs` để kiểm tra cú pháp, tham chiếu và so khớp route.
- `scripts/build-session03.py` là công cụ tạo bản đầu từ các nguồn đã đọc. Chạy lại sẽ ghi đè policy và OpenAPI; không dùng sau khi đã sửa thủ công mà chưa đối chiếu thay đổi.
- Tài liệu Buổi 2 giữ nguyên để bảo toàn lịch sử; Buổi 03 sửa các bất nhất theo source-review.md.

## Giới hạn xác nhận

Đã có sản phẩm thiết kế không có nghĩa là mọi API tương lai đã chạy được. Không đánh dấu triển khai online, kiểm thử trên hai máy, người chứng kiến hoặc đóng góp Git riêng nếu chưa có bằng chứng tương ứng. Trạng thái thực tế nằm trong checklist và evidence.
