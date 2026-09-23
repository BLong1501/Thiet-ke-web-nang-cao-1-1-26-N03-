# Đối chiếu nguồn và phạm vi Buổi 03

## Nguồn đã đọc

- Đề Buổi 03 do người dùng cung cấp: V4 ma trận đầy đủ và mỗi ô Không thành ca dự kiến; V5 nạp CSDL trực tuyến, Ảnh 02, OpenAPI mở được. Kiểm thử chung gồm DB rỗng trên hai máy/hệ điều hành, toàn vẹn FK, mở đặc tả, nhật ký có người chứng kiến. Sản phẩm chung có Ảnh 15 nhưng đoạn đề chưa định nghĩa ảnh này.
- `lecture/buoi2/Nhóm_9_Crowdfunding/Tran_Bao_Long_v1_2/Phạm vi đề tài.pdf`: vai trò Guest/User/Fundraiser/Admin, loại bỏ mạng xã hội độc lập, AC-01–AC-08.
- `lecture/buoi2/Nhóm_9_Crowdfunding/Nguyen_Tuan_Anh_v3/usecase (3).pdf`: UC01–UC08, YCCN01–YCCN35.
- Toàn bộ TypeScript backend: app/server, middleware, utils, Auth/KYC routes/controller/service/repository/validation; Prisma schema/config; SQL schema/init, Docker Compose, README, HTTP và Postman.
- Tài liệu V4/V5 Buổi 2: ma trận, test cases, yêu cầu BM01–BM12 và use case tổng quát.

## Quy tắc khi nguồn chưa thống nhất

Tài liệu Buổi 2 giữ làm lịch sử. Bộ `docs/` là sản phẩm Buổi 03. Với API đã có, OpenAPI bám đường dẫn, response và mã lỗi trong code. Hợp đồng review chỉ APPROVED/REJECTED được sửa validation trực tiếp và có test hồi quy. Với API chưa có, ma trận là thiết kế có ghi PLANNED, không chứng nhận đã triển khai.

| Điểm khác nhau | Xử lý trong sản phẩm |
|---|---|
| Ma trận B2 cấm User gửi KYC | Sửa theo UC02 và service: USER được gửi; FUNDRAISER/ADMIN bị từ chối nghiệp vụ 400 |
| B2 cho Admin tạo/sửa campaign như Fundraiser | Theo UC04/README: chỉ Fundraiser sở hữu; Admin quản trị qua endpoint riêng, không ngầm kế thừa mọi quyền |
| README POST /verifications, GET /verifications, GET /users/me | OpenAPI dùng route thật: /verifications/request, /verifications/pending, /auth/me |
| README cho donation Public/User, phạm vi/UC06 dùng User | Thiết kế bảo thủ yêu cầu đăng nhập, vẫn ẩn danh khi hiển thị. Đây là quyết định đề xuất cần nhóm chốt trước triển khai; DB nullable không tự quyết định quyền |
| Phạm vi cắt mạng xã hội, README và YCCN28/29 còn community | Giữ ma trận dự kiến DEFERRED để không mất truy vết; không tính thành chức năng đã hoàn thành |
| UC02/03 có yêu cầu bổ sung KYC | Backend enum mới có PENDING/APPROVED/REJECTED; KYC-SUPPLEMENT là đề xuất, chưa có API |
| UC01 yêu cầu xác minh liên hệ | Backend đăng ký cấp token ngay; verify-email chưa triển khai |
| AC-01 JWT tối đa 60 phút | Code và env mẫu đang mặc định 7 ngày; ghi ISSUE-03, không tuyên bố đạt |
| Phạm vi campaign SUSPENDED, Prisma dùng PAUSED | Kiểm thử hiện dùng PAUSED và ghi cần thống nhất từ điển trạng thái |
| AC-05 thiếu chứng từ trả 422; validation chung trả 400 | 422 chỉ là yêu cầu cho nghiệp vụ chứng từ chưa triển khai; API hiện tại mô tả đúng 400 |
| README liệt kê refresh/logout | Chưa có route; loại khỏi OpenAPI LIVE, giữ PLANNED trong ma trận |
| README kiến trúc React và nhiều module | Frontend hiện là Vite mẫu; nhiều module BE chỉ có .gitkeep |

Các đường dẫn đề xuất cho theo dõi payment, quản trị donation, yêu cầu bổ sung, sửa campaign, bổ sung chứng từ và like được ghi rõ trong ma trận. Không coi đây là quyết định API đã được V3 phê duyệt.

## Phát hiện backend liên quan V4

| ID | Phát hiện | Trạng thái / kiểm chứng |
|---|---|---|
| ISSUE-01 | nativeEnum cho phép review=PENDING, service rẽ sang từ chối | Đã giới hạn validation chỉ APPROVED/REJECTED; test hồi quy kiểm tra handler không được gọi |
| ISSUE-02 | authenticate chỉ kiểm JWT, authorize dùng role trong token | Chưa kiểm lại trạng thái/quyền hiện tại từ DB; khóa tài khoản hoặc thu hồi role chưa vô hiệu token đang có |
| ISSUE-03 | JWT mặc định 7 ngày và fallback secret trong source | Không đạt AC-01 <=60 phút; cấu hình production thiếu secret không dừng. Cần V1/BE chốt cơ chế phiên và cấu hình |
| ISSUE-04 | Global handler trả err.message cả lỗi 500 | Có nguy cơ lộ nội dung lỗi DB; chưa chứng nhận BM09 |
| ISSUE-05 | page/limit dùng parseInt, chưa giới hạn hoặc validate | Chưa chứng nhận toàn bộ BM05; cần thêm validation query và giới hạn trang |
| ISSUE-06 | KYC duyệt/từ chối không ghi audit log | Transaction có cập nhật hồ sơ/user/notification; thiếu yêu cầu UC03/BM12 |
| ISSUE-07 | Kiểm tra PENDING trước transaction, update không kèm điều kiện status | Có khả năng hai admin duyệt/từ chối đồng thời; cần kiểm thử DB và cập nhật có điều kiện |
| ISSUE-08 | Seed admin trong init.sql có hash không khớp phần chú thích rõ ràng | Không sử dụng mật khẩu chú thích làm bằng chứng đăng nhập; seed demo mới sinh bcrypt từ biến môi trường |

Buổi 03 là mốc thiết kế, không phải nghiệm thu toàn bộ sản phẩm cuối kỳ. Các lỗi còn mở được lưu để V4 có danh mục rủi ro trung thực; không tự mở rộng thành triển khai các module nghiệp vụ chưa viết.

## Chuẩn tham khảo

- [OpenAPI 3.0.3](https://spec.openapis.org/oas/v3.0.3): cấu trúc đặc tả, security, responses, schema.
- [Swagger UI installation](https://swagger.io/docs/open-source-tools/swagger-ui/usage/installation/): giao diện xem đặc tả. Dùng asset npm cục bộ, không gửi đặc tả/token lên dịch vụ ngoài.
