# Buổi 6 — V3 và V4, nhóm 9, đề tài gây quỹ

## Phạm vi và trạng thái

Backend + Apidog + MySQL Docker. Không cần giao diện web. Các thao tác tiền đều là mô phỏng; không gọi ngân hàng/cổng thanh toán thật.

Luồng thứ ba: người dùng tạo đóng góp PENDING → Admin xác nhận mô phỏng SUCCESS và ghi bút toán RECEIPT → khi chiến dịch bị hủy hoặc hết hạn không đạt mục tiêu, người đóng góp/Admin hoàn toàn bộ khoản tiền → REFUNDED và một bút toán REFUND.

Phạm vi bản này chỉ hỗ trợ hoàn toàn bộ, không nhận số tiền hoàn tùy ý và không hỗ trợ hoàn một phần. Chưa triển khai giải ngân theo mốc, cổng thanh toán thật hoặc toàn bộ yêu cầu cuối khóa. Khung Buổi 6 áp dụng T2 chống ghi tiền trùng và T3 máy trạng thái. Không áp dụng giữ chỗ có thời hạn.

## V3 — API đã hiện thực

Tất cả tiền tệ trong request là số nguyên VND. Các cột tiền và tính tổng trong backend dùng Decimal. Các số tiền trong phản hồi donation/ledger có thể là chuỗi để không mất độ chính xác.

| Phương thức và đường dẫn (sau /api/v1) | Người gọi | Kết quả |
|---|---|---|
| POST /donations | Tài khoản ACTIVE, đã xác thực email | 201 tạo mới; 200 trả lại yêu cầu cùng requestKey/nội dung |
| GET /donations/:id | Chủ khoản đóng góp hoặc Admin | 200, chi tiết và bút toán |
| POST /donations/:id/confirm-demo | Admin; NODE_ENV development/test | 200, ghi nhận tiền mô phỏng |
| POST /donations/campaigns/:campaignId/cancel | Admin | 200; chỉ ACTIVE/PAUSED, chưa giải ngân |
| POST /donations/:id/refund | Chủ khoản đóng góp hoặc Admin | 200, hoàn toàn bộ một lần |
| GET /donations/campaigns/:campaignId/reconciliation | Admin | Tổng thu, tổng hoàn, số dư và matches |

Thiếu token → 401; sai quyền → 403; input sai → 400; requestKey tái sử dụng cho nội dung khác → 409; chuyển trạng thái/điều kiện nghiệp vụ sai → 422. Route confirm-demo bị vô hiệu hóa ở production.

### Quy tắc

1. Chỉ nhận đóng góp khi chiến dịch ACTIVE và startDate ≤ hiện tại < endDate.
2. Tạo yêu cầu chưa có nghĩa là đã nhận tiền. Chỉ Admin xác nhận mô phỏng mới sinh RECEIPT.
3. Tổng tiền hiển thị chiến dịch đọc từ RECEIPT trừ REFUND. current_amount chỉ là cache đối soát, không phải nguồn sự thật.
4. Khóa chiến dịch trước, khóa khoản đóng góp sau; đọc lại trạng thái sau khi khóa. Ghi ledger, trạng thái, cache, audit và notification trong cùng giao dịch.
5. Chỉ hoàn khoản SUCCESS thuộc người gọi, khi chiến dịch CANCELLED hoặc đã hết hạn và tổng RECEIPT thấp hơn mục tiêu. Không cho hoàn nếu đã có giải ngân.
6. Khoản REFUNDED không được hoàn thêm. UNIQUE(donation_id, kind) cũng chặn bút toán trùng.
7. MySQL CHECK chặn tiền không dương. Trigger chặn bút toán sai số tiền, hoàn không có thu, sửa/xóa bút toán và sửa số tiền/chủ sở hữu/chiến dịch của khoản đã ghi sổ.
8. Tiến trình backend kiểm tra hết hạn khi khởi động và mỗi 60 giây; chuyển ACTIVE/PAUSED → COMPLETED mà không cần request. Backend phải chạy liên tục; không tuyên bố tác vụ vẫn chạy khi máy chủ bị tắt/ngủ.

### Mã giả khớp mã nguồn — hoàn tiền

```text
BEGIN TRANSACTION (READ COMMITTED)
  Tìm campaignId của donation; không có → 404
  SELECT campaign FOR UPDATE
  SELECT donation FOR UPDATE; đọc lại donation
  Kiểm tra tài khoản còn hoạt động, đã xác thực email
  Nếu không phải chủ donation hoặc ADMIN → 403
  Nếu paymentStatus khác SUCCESS → 422
  Tính tổng RECEIPT từ ledger
  Nếu campaign không CANCELLED và không hết hạn dưới mục tiêu → 422
  Nếu đã giải ngân → 422
  INSERT ledger REFUND với đúng toàn bộ donation.amount
    (DB kiểm tra số tiền, receipt, trạng thái và khóa duy nhất)
  UPDATE donation → REFUNDED
  Tính lại tổng thu - tổng hoàn từ ledger, cập nhật cache chiến dịch
  INSERT audit + notification
COMMIT → HTTP 200
Nếu bất kỳ bước nào lỗi → ROLLBACK toàn bộ
```

### Mã giả xác nhận

```text
Chặn nếu không ở development/test
BEGIN → khóa campaign → khóa donation
Kiểm tra ADMIN trong DB, donation=PENDING, campaign còn nhận tiền
INSERT RECEIPT → donation=SUCCESS, paidAt=now
Tính lại cache từ ledger → ghi audit + notification
COMMIT; sai trạng thái → 422, lỗi ghi → ROLLBACK
```

## V4 — chạy lại và bằng chứng

Tại backend, giữ Docker hoạt động:

```powershell
npm.cmd run test:session06:local
```

Lệnh tự tạo/sử dụng **crowdfunding_session06_test**, không dùng database bài thực hành crowdfunding_db. Nó đọc thông tin quản trị Docker trong bộ nhớ, không ghi mật khẩu/token vào báo cáo. Schema test không bị reset/drop. Mỗi lượt tạo fixture UUID mới và giữ dữ liệu để kiểm chứng; các bút toán là bất biến.

Kịch bản khởi động một HTTP server riêng trên cổng ngẫu nhiên, gọi API thật và MySQL thật. JWT thử nghiệm được ký riêng trong tiến trình; không dùng token thật của sinh viên. Nó không kiểm chứng OTP/email hoặc đăng nhập end-to-end — phần đó kiểm thử riêng bằng Apidog.

50 yêu cầu POST refund được phát đồng thời bằng Promise.all đến cùng donation. Tài nguyên hữu hạn là **một quyền hoàn toàn bộ** cho một khoản 100.000 đồng. Mong đợi đúng 1 HTTP 200, 49 HTTP 422; ledger chỉ có 1 REFUND, tổng hoàn 100.000, số dư 0; chỉ 1 audit và 1 notification hoàn tiền. Không coi 49 yêu cầu bị chặn là 49 lỗi kiểm thử.

Kịch bản còn kiểm tra input, phân quyền, requestKey, hoàn PENDING, xác nhận lặp, hoàn khi chưa đủ điều kiện, hoàn nguyên khi gây lỗi sau ghi ledger, vi phạm DB trực tiếp và tác vụ đóng hết hạn.

Kết quả thực tế được ghi trong:

- evidence/session06-results.json: từng nhóm kiểm tra và 50 phản hồi.
- evidence/50-requests.csv: bảng 50 dòng để nộp.
- evidence/session06-test-output.txt: nhật ký chạy.

**Ảnh 31**: tự chụp Terminal thật sau khi chạy, gồm tên lệnh, bảng kết quả và dòng `ANH 31: 50 requests | 1 HTTP 200 | 49 HTTP 422 ...`. Có thể chia 31a/31b để đủ 50 dòng, vẫn nộp CSV gốc. Không thay ảnh chạy thật bằng bảng tự điền. Ghi thời gian và người chứng kiến vào nhật ký khi nghiệm thu; hiện chưa có người chứng kiến/ảnh 31 được xác nhận.

Ảnh bổ sung Apidog: tạo PENDING, xác nhận SUCCESS, đối soát khớp, hủy chiến dịch, hoàn REFUNDED, lặp hoàn bị 422. Mỗi ảnh hiện method/URL/body/mã HTTP/phản hồi; ẩn token. Dùng campaign mẫu riêng vì hủy là kết thúc luồng của campaign đó.

## Chuẩn bị môi trường khi tải lại code

Chạy prisma:generate và build. Lệnh session06:prepare thêm ledger/CHECK/trigger trên MySQL local; user thường có thể thiếu quyền CREATE TRIGGER trong MySQL có binary log, khi đó chạy bằng quyền quản trị local. Không bật tắt binary log hoặc xóa DB để xử lý lỗi quyền. Script từ chối backfill tự động nếu có donation SUCCESS/REFUNDED mà chưa có ledger — cần đối soát trước.

.

