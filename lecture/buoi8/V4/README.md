# Buổi 8 – V4: kiểm chứng 12 rủi ro và bằng chứng thực tế

Nguồn: Sổ tay Buổi 8 trang 43–46; tài liệu kỹ thuật mục 7.1 và danh mục ảnh trang 51–52. Kiểm thử ngày 14/10/2026 trên local, code của nhóm và MySQL thật. Không dùng dữ liệu Aiven và không giả lập kết quả online.

## Kết quả

`backend/scripts/session08-audit.ts`: 12/12 nhóm kiểm tra đạt trong phạm vi kịch bản đã chạy; 124/124 lần gọi thuộc các ô Không của ma trận route hiện tại nhận đúng 401/403. Đây là tập endpoint được liệt kê trong script, không chứng nhận mọi trạng thái nghiệp vụ và mọi tổ hợp đối tượng. IDOR kiểm chủ sở hữu và người khác trên donation, upload; các kiểm quyền dịch vụ khác vẫn cần xem kết quả V3 khi nghiệm thu toàn hệ thống.

Test đăng nhập sai dùng email fixture riêng và có nhật ký ACCOUNT_LOCKED_TEMPORARY thật. Thử che lỗi dùng production mode và fault injection có chủ đích vào user.findUnique, không phá dữ liệu DB. Token, cookie value và toàn bộ hash mật khẩu không được ghi vào bằng chứng. Hash ở ảnh 21 chỉ hiện prefix/cost và chiều dài; có thể cho giảng viên xem query tại máy để kiểm chứng bản đầy đủ nếu cần.

## Ảnh và nguồn dữ liệu

| Yêu cầu | File | Loại ảnh thực tế và ngữ cảnh |
|---|---|---|
| 16 SQL injection | evidence/Anh_16_SQLi.png | Screenshot báo cáo tự động từ phản hồi HTTP thật, URL/time/role lưu trong báo cáo |
| 17 XSS | ../../buoi9/V5/evidence/Anh_17_XSS_plain_text.png | Screenshot ứng dụng thật sau lưu và mở lại profile; Chrome không có dialog. Dòng ngữ cảnh được trình kiểm thử thêm từ location/time/role đã xác thực, không sửa kết quả |
| 18 CSRF | Anh_18_CSRF.png và Anh_18b_Bieu_mau_ngoai_403.png | Report HTTP thật và screenshot phản hồi trình duyệt sau submit form từ origin khác |
| 19 IDOR | Anh_19_IDOR.png | Report hai lần gọi thật 200/403 trên cùng donation |
| 20 Ma trận quyền | Anh_20_1 đến Anh_20_4_Ma_tran_quyen.png | 124 lần gọi thật, chia trang cho dễ đọc; permission-matrix.json lưu toàn bộ |
| 21 Hash | Anh_21_Hash_mat_khau.png | Query Prisma/MySQL thật, chỉ hiện bcrypt prefix/cost/length; tail che để tránh công bố hash |
| 22 Cookie | BM7_Cookie_Chrome_LOCAL.png | Thuộc tính cookie do Chrome đọc thật, value đã che. **Chưa phải ảnh tab Application theo yêu cầu đề** |
| 23 Upload | Anh_23_Upload_private.png | Tệp giả415, tệp ảnh thật201/owner200/guest401/user khác403; fixture ảnh xóa sau kiểm tra |
| 24 Che lỗi | Anh_24_Che_loi_production_test.png và Anh_24b_Phan_hoi_loi_that.png | Report lỗi500 production fault injection và screenshot API thật400, không lộ SQL/path |
| 25 Giới hạn login | Anh_25_429_va_nhat_ky.png | Sáu lần gọi thật, lần6=429, kèm log lấy từ MySQL |
| 26 Headers | Anh_26_Curl_LOCAL.png | Output curl.exe -I thật trên health API local; curl-headers.txt nguyên bản. **Chưa phải tên miền HTTPS** |
| BM11 lịch sử | BM11_Quet_lich_su.png | Kết quả scanner thật có scope/detector ghi rõ; source secret-history của đợt trước |

Các ảnh report là ảnh của báo cáo HTML sinh từ quan sát thực tế, **không phải ảnh giả cửa sổ Apidog, terminal hay DevTools**. HTML/JSON nguyên bản được giữ để đối chiếu và chạy lại. Không tự tạo “kết quả trước sửa” cho những lỗi không được chứng kiến ở phiên này.

## Sửa trong đợt này

- KYC submit có authorize(USER) trước validate; ADMIN/FUNDRAISER bị403 đúng ma trận.
- Profile bio là plain text, giữ nguyên mã lệnh được nhập và hiển thị bằng React/textarea. Không dùng dangerouslySetInnerHTML. Trình duyệt mở lại payload script/onerror không thực thi. Những trường có markup khác vẫn qua sanitizer; không bỏ sanitizer toàn hệ thống.
- Test supplemental cũ được cập nhật theo hợp đồng plain-text mới.

## Chạy lại

Backend local: `npx tsx scripts/session08-audit.ts`. Frontend với BE/FE đang chạy: `node scripts/session09-browser-audit.cjs`. Cần tài khoản demo local và Chrome; script browser kiểm bàn phím, khôi phục bio sau khi kiểm. Không chụp token/cookie value.

## Còn phải bổ sung để chốt nộp

1. Ảnh 22 tab Application/Cookies thật: mở DevTools, chọn refreshToken, thấy HttpOnly/SameSite/expiry; che cột Value. Cookie Secure cần môi trường production HTTPS, không nhận Secure=false local là đạt production.
2. Ảnh 26 trên tên miền HTTPS khi người dùng deploy (đã chọn làm riêng). HTTPS và certificate chưa có thì không đánh dấu BM12 hoàn tất trực tuyến.
3. Nhật ký người chứng kiến, chữ ký thật và kiểm tra giảng viên có chấp nhận ảnh report hay yêu cầu chụp thêm trực tiếp Apidog/terminal. Không ghi đã có chứng kiến khi chưa có.
4. Rà mọi đối tượng/ràng buộc quyền theo danh mục V3 mới nhất; kết quả ở đây là kiểm chứng các route/case cụ thể.
