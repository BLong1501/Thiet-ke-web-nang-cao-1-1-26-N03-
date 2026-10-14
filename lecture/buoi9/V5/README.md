# Buổi 9 – V5: WCAG, bàn phím, metadata và bằng chứng

Đợt kiểm tra ngày 14/10/2026 trên React/Vite local nối Express/MySQL thật. Không chặn/intercept network để đưa dữ liệu giả. Kết quả không thay thế kiểm tra trên tên miền online.

## Kết quả thực tế

- Axe: 6 trang `/`, `/login`, `/profile`, `/admin`, `/admin/analytics`, `/admin/categories`, theo vai trò GUEST/USER/ADMIN; 0 violation trong tag WCAG2 A/AA và WCAG2.1 A/AA.
- Axe vẫn báo cần rà thủ công color-contrast tại ba trang; không gọi đây là chứng nhận toàn bộ WCAG AA.
- Lighthouse nguyên bản: trang chủ local Accessibility 100/100, SEO 100/100. Nguồn score: lighthouse-home.report.json, không lấy số tự đặt từ axe.
- Hai luồng chỉ dùng Tab/type/Enter: đăng nhập USER thành công, sửa/lưu hồ sơ rồi tải lại thấy dữ liệu mới. Bio được phục hồi sau kiểm thử.
- Screenshot XSS: payload lưu thật, mở lại profile, không có alert/dialog, văn bản nhìn thấy nguyên dạng.
- Robots/sitemap local đã có; cần sinh lại SITE_URL HTTPS thật khi deploy.

## File nộp

- `evidence/Anh_30_Lighthouse_Accessibility_SEO.png`: screenshot báo cáo HTML **nguyên bản do Lighthouse tạo**, có URL/điểm và thời điểm trong báo cáo.
- `evidence/Anh_30_Axe_WCAG_LOCAL.png`: screenshot report từ quét axe thật, bảng URL/time/role và luồng bàn phím.
- `evidence/browser-audit.json`: kết quả đầy đủ, violation/incomplete và cookie properties đã che value.
- `evidence/lighthouse-home.report.html/.json`: báo cáo nguyên bản để mở/đối chiếu.
- `Ban_phim_01`, `02`, `03` và `Anh_17_XSS_plain_text.png`: screenshot ứng dụng thật. Dòng đầu ghi ngữ cảnh do test thêm từ URL/time và tài khoản xác thực; không sửa dữ liệu hoặc kết quả UI.
- `WCAG_DOI_CHIEU.md`: đối chiếu tiêu chí và phạm vi kiểm chứng.

## Lặp lại

1. Chạy BE5000/FE5173 với DB local có tài khoản demo; không dùng Aiven để chạy script kiểm thử này.
2. Chạy `backend/scripts/session08-audit.ts` trước để có dữ liệu báo cáo bảo mật.
3. Từ frontend chạy `npx --yes lighthouse http://localhost:5173/ --only-categories=accessibility,seo --chrome-path="C:/Program Files/Google/Chrome/Application/chrome.exe" --chrome-flags="--headless --no-sandbox" --output=json --output=html --output-path="../lecture/buoi9/V5/evidence/lighthouse-home" --quiet`.
4. Chạy `node scripts/session09-browser-audit.cjs`. Chrome có thể đổi qua PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH.
5. Khi deploy, đo lại URL thật, kiểm bàn phím, screen reader, trạng thái lỗi và tương phản còn incomplete; không tái dùng ảnh localhost để khẳng định online đạt.
