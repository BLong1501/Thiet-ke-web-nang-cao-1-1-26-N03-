# Buổi 07 – V4: kiểm tra tệp tải lên

## Phạm vi thực hiện

API POST `/api/v1/uploads` nhận một tệp ở trường multipart `file`, yêu cầu đăng nhập. Chỉ nhận PNG/JPEG khi phần mở rộng, MIME và chữ ký thật khớp. Sharp giải mã ảnh và mã hóa lại thành PNG, loại bỏ metadata và nội dung nối thêm. Giới hạn đầu vào/đầu ra 5 MiB, tối đa 16 triệu điểm ảnh.

Máy chủ tự đặt tên UUID; lưu ngoài thư mục phục vụ công khai tại `backend/private-uploads` (hoặc PRIVATE_UPLOAD_DIR). GET `/api/v1/uploads/:id` yêu cầu đăng nhập, chỉ chủ sở hữu hoặc ADMIN đọc được. Không cung cấp đường dẫn hệ thống tệp và không dùng express.static cho tệp riêng tư. Thư mục lưu tệp được loại khỏi Git.

## Kiểm thử thủ công ngày 07/10/2026

| Ca | Kỳ vọng | Quan sát | Bằng chứng |
|---|---|---|---|
| Ảnh hợp lệ | 201, tên UUID, PRIVATE | Đạt | V4_B7_01_Upload_hop_le.png |
| Mã PHP vô hại đổi đuôi JPG | 415, từ chối nội dung giả | Đạt | Anh_23a_Tu_choi_anh_gia.png |
| GET ảnh không đăng nhập | 401 | Đạt | Anh_23b_Chan_truy_cap_khong_dang_nhap.png |
| Chủ sở hữu GET ảnh | 200, image/png | Đạt, đã xem ảnh tại máy | Ảnh gốc giữ local vì lộ một phần token; cần chụp lại trước khi đưa lên Git |
| Ảnh vượt 5 MiB | 413 | Đạt | V4_B7_05_Tu_choi_tep_qua_5MB.png |

Tổng: 5 ca thực hiện thủ công, 5 ca đáp ứng kết quả HTTP/nội dung mong đợi. Đây là kiểm thử local, không phải bằng chứng triển khai trực tuyến. Ảnh 23 được chia thành 23a/23b để thể hiện hai tình huống.

Lưu ý: panel “Xác thực phản hồi” trong các ảnh còn đặt mặc định HTTP 200/JSON nên hiện đỏ. Đây là cấu hình assertion chưa đúng của Apidog; không tính panel này là kết quả kiểm thử tự động đạt. Cần sửa kỳ vọng từng request: upload hợp lệ 201, tệp giả 415, không đăng nhập 401, quá lớn 413, tải ảnh 200 với image/png.

## Chạy lại

Từ backend: `npm ci`, `npm run prisma:generate`, `npm run dev`. Dùng tài khoản đã đăng nhập để lấy token mới, không đưa token vào tài liệu hay Git.

Kiểm thử tự động: `npx tsx --test tests/uploads.test.ts`. Có 12 ca con (Node báo tổng 13 gồm test cha): ảnh thật, chủ sở hữu, không đăng nhập, người khác, ADMIN, script đổi đuôi, chữ ký giả, sai đuôi, quá dung lượng, thiếu file, upload không đăng nhập, thêm ownerId và không để lại file khi bị từ chối. Bộ này dùng HTTP multipart thật và thư mục tạm, JWT kiểm thử; không kiểm thử tích hợp MySQL hay thu hồi tài khoản.

## Việc cần bổ sung trước khi chốt nộp

Kiểm tra trước khi đẩy Git ngày 07/10/2026: `npx tsx --test tests/uploads.test.ts tests/authorization.test.ts` đạt 48/48 mục do Node thống kê (35 kiểm thử phân quyền, 12 ca upload và 1 test cha). `npm run build` thành công. Kiểm thử phân quyền dùng mock ở ranh giới dữ liệu theo bộ test có sẵn, không thay thế kiểm thử nghiệp vụ MySQL.

- Chụp lại ảnh chủ sở hữu sau khi chuyển khỏi tab Auth để không hiện token.
- Theo hướng dẫn ảnh, cần có ngữ cảnh thời gian/vai trò. Ảnh hiện có thể hiện URL và kết quả nhưng chưa đủ rõ thời gian/vai trò; bổ sung ngữ cảnh thật khi chốt nộp, không chỉnh nội dung kết quả.
- Ghi người thực hiện/người chứng kiến thực tế trong nhật ký và cập nhật chỉ số BM theo mẫu nhóm. Không tự ghi đã có giảng viên/trưởng nhóm chứng kiến.
- Đính kèm lịch sử commit và các ảnh vào phần nộp chung của nhóm. V5 chưa hoàn tất.

Giới hạn triển khai: storage hiện là đĩa riêng của một backend. Khi triển khai cần đĩa bền vững hoặc storage riêng; không dùng ổ tạm của dịch vụ để lưu hồ sơ lâu dài. Chức năng hiện kiểm tra ảnh, chưa hỗ trợ PDF/video hoặc quét virus tổng quát.
