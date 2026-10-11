# FundTrust Frontend

React 18 + TypeScript + Vite. Giữ giao diện FundTrust, tách CSS dùng chung, tải trang theo route bằng `React.lazy`.

## Chạy local

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Mở địa chỉ Vite in ra (mặc định `http://localhost:5173`). Backend mặc định `http://localhost:5000/api/v1`. Cấu hình `CLIENT_URL` của backend phải khớp **origin** frontend. Không trộn `localhost` và `127.0.0.1` khi kiểm tra cookie thật. Không đưa bí mật vào biến `VITE_*`.

```powershell
npm run typecheck
npm run build
npm run preview
```

Production cần cấu hình URL API, HTTPS, CORS credentials và SPA fallback. Backend đang đặt refresh cookie `SameSite=Strict`, vì vậy frontend/API cần triển khai cùng site hoặc cấu hình cookie/reverse proxy phù hợp ở backend. FE không tự sửa chính sách cookie máy chủ. `vercel.json` đã có SPA rewrite.

## Các luồng đã nối với API có trong repository

- Đăng ký → OTP email → đăng nhập; gửi lại OTP; quên/đặt lại mật khẩu; đăng xuất qua API.
- Phiên đăng nhập lưu trong `sessionStorage` với tên mới, không dùng token demo cũ; kiểm tra `/auth/me` khi mở lại, chia sẻ một yêu cầu refresh cho các lỗi token đồng thời.
- Danh sách chiến dịch: tìm kiếm, lọc danh mục, sắp xếp, phân trang phía server; không trộn dữ liệu mẫu vào dữ liệu thật.
- Chi tiết chiến dịch: câu chuyện, media, nhật ký, đóng góp công khai, chứng từ, xuất CSV các khoản giải ngân.
- Fundraiser/Admin: tạo nháp, gửi duyệt, sửa, thông tin tổ chức/cá nhân/ngân hàng, thêm media, cập nhật, giải ngân.
- Hồ sơ: xem/cập nhật thông tin, đổi mật khẩu, nộp KYC, theo dõi kết quả, nộp lại hồ sơ bị từ chối.
- Upload KYC PNG/JPEG 5 MB; tải ảnh riêng tư bằng bearer token, giải phóng blob URL. Upload lỗi không được xem là upload thành công.
- Quyên góp: tạo giao dịch thật qua API với `requestKey`, giữ trạng thái PENDING cho đến khi server xác nhận; lịch sử, chi tiết, in/lưu PDF và yêu cầu hoàn tiền mô phỏng.
- Admin: duyệt KYC/chiến dịch, hủy chiến dịch khi backend cho phép, đối soát, giao dịch, tài khoản, danh mục, nhật ký, xuất CSV trang đang xem.
- Nhật ký riêng: `/admin/activity-logs` dành cho Admin xem toàn hệ thống; `/activity-logs` hiển thị hoạt động của tài khoản đang đăng nhập. API `/activity-logs/me` lấy userId từ token, bỏ tham số userId do client gửi và không trả metadata nội bộ. User/Fundraiser không có quyền gọi các API nhật ký toàn hệ thống, chi tiết quản trị hoặc người dùng khác.
- Route guard theo vai trò, trang 403/404, error boundary, trạng thái loading/error/empty/retry, form labels, modal bàn phím, responsive desktop/mobile.

`VITE_ENABLE_PAYMENT_DEMO=true` chỉ bật nút xác nhận **mô phỏng** cho Admin. Mặc định tắt. Backend cũng phải cho phép môi trường kiểm thử. FE không gọi endpoint confirm công khai để tự biến một yêu cầu thành thanh toán thành công. Thanh toán/hoàn tiền ngân hàng thật cần backend/cổng thanh toán.

Ảnh bìa, avatar và chứng từ công khai dùng URL HTTP(S). Endpoint `/uploads` hiện là **private owner/admin-only** nên không thể dùng nó như một kho media công khai cho người xem chiến dịch. Không chuyển ảnh riêng tư thành base64 để giả lập upload.

## Giao diện đã có nhưng cần backend bổ sung

Các module cộng đồng, thông báo và báo cáo chưa được mount trong `backend/src/app.ts`. Giao diện gọi API và hiển thị trạng thái chưa khả dụng/lỗi nếu chưa có dịch vụ; không lưu dữ liệu giả trong localStorage, không báo gửi thành công khi server từ chối. Hợp đồng dự kiến được ghi trong [API-INTEGRATION.md](API-INTEGRATION.md).

Chưa thể xem đây là sản phẩm hoạt động 100% từ đầu đến cuối khi các API đó chưa có, thanh toán còn mô phỏng, hoặc backend chưa chạy được.

## Kiểm thử trình duyệt

```powershell
npx playwright install chromium
npm run test:e2e
```

Hoặc dùng Edge có sẵn trên Windows:

```powershell
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
npm run test:e2e
```

Playwright tự chạy Vite tại `127.0.0.1:5174`. Test chặn request API bằng fixtures; **không ghi dữ liệu vào backend thật**. Các kiểm thử này xác nhận hành vi FE và dữ liệu request, không chứng minh email, CSDL, ngân hàng hay backend production hoạt động. Test bao gồm sai mật khẩu, OTP, quyền truy cập, refresh token, payload tạo chiến dịch, thanh toán pending, lỗi duyệt, ảnh KYC có xác thực, lỗi upload và mobile không tràn ngang.

## Các điểm chặn tích hợp backend quan sát được

Lần kiểm tra `npm run build` trong backend ngày 12/10/2026 báo thiếu module `sharp` và Prisma `TransactionClient.ledgerEntry`. Cần sửa môi trường/dependencies và generate Prisma Client tương ứng schema/migration ledger trước khi chạy kiểm thử tích hợp thật. FE không sửa dữ liệu, migrate CSDL hoặc cấu hình bí mật của backend.
