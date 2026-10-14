# Hướng dẫn chạy lại và hoàn thiện nộp V4/V5

## Chạy local

1. Mở Docker Desktop, tại thư mục mã nguồn chạy `docker compose up -d mysql redis`. Không chạy `down -v` để tránh xóa dữ liệu.
2. Copy backend/.env.example thành backend/.env; cấu hình DATABASE_URL local và khóa JWT riêng. Không dùng Aiven cho script seed/test local. Cài Node phù hợp bản Vite/Prisma và chạy `npm ci` trong backend/frontend.
3. Nếu chưa có database tương thích: từ backend chạy `node scripts/fresh-local-data.cjs`. Script tạo schema local mới, sync Prisma, nhập dữ liệu mẫu UTF-8 và chuyển .env; giữ DB cũ. Cần Docker container crowdfunding_mysql và quyền local. Đọc source trước chạy; mật khẩu mẫu Password@123 chỉ dùng demo.
4. Backend: `npm run prisma:generate`, `npm run dev`. Frontend: `npm run dev -- --port 5173 --strictPort`. Kiểm health/categories rồi đăng nhập admin demo.
5. Mở /admin/analytics, xem ba biểu đồ, đổi khoảng ngày, nhấn Xuất CSV. Phần này dùng ledger_entries; không dùng số giả để che DB thiếu bút toán.

## Kiểm thử lại

- Backend: `npx tsx scripts/v4-v5-check.ts` chạy 25 ca và supplement với DB local, ghi JSON/CSV vào evidence; DEMO_TEST_PASSWORD có thể đổi nếu tài khoản mẫu có mật khẩu khác. Không in token.
- Backend: `npx tsx --test tests/analytics.test.ts tests/uploads.test.ts` chạy biên ngày/CSV/upload. `npm run build` kiểm build.
- Frontend: `npm run build`; chạy Playwright axe với PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH nếu dùng Chrome có sẵn, hoặc cài browser Playwright. Scope 9 trang hiện là fixture. scripts/capture-evidence.cjs chụp analytics với API local thật và ghi audit riêng.
- `node docs/scripts/audit-secrets.cjs` rà bốn detector trong lịch sử reachable Git. Không coi không có hit là đảm bảo mọi secret đã sạch.

## Bằng chứng đang có

- 25-api-results.json: 25/25 và đúng phân bố 9/6/7/3, có kết quả kỳ vọng qua assertion.
- security-supplement.json: kết quả bổ sung và giới hạn phạm vi.
- daily/campaigns/categories JSON/CSV: tổng thu 35 triệu khớp SQL, dữ liệu mô phỏng local.
- V5_B7_01/02/03_Bieu_do.png và trang tổng hợp: ảnh app thật, không chèn số.
- wcag-results.json (fixture) và wcag-analytics-live.json (MySQL thật): phân biệt hai loại kiểm tra.
- secret-history.json: kết quả rà soát, không chứa giá trị secret.
- lecture/buoi7: ảnh 23a/23b và bằng chứng upload trước đó; bổ sung timestamp/vai trò khi chốt nộp.

Mở từng CSV trong Excel bằng Data → From Text/CSV → UTF-8 → dấu phân cách comma nếu máy không tự nhận. Kiểm cột Nhóm/Số khoản/Đã thu/Đã hoàn/Ròng, giữ dấu phẩy và dấu nháy trong tên nhóm. Chụp ảnh Excel thật; parser CSV/build không thay cho ảnh phần mềm bảng tính.

## Phần triển khai riêng theo lựa chọn của người dùng

1. Backend dùng render.yaml; frontend dùng Vercel hoặc nền tảng đã chọn. Tạo database triển khai riêng và migration được nhóm rà soát, không chạy init.sql vào Aiven đang có dữ liệu.
2. Điền biến môi trường qua dashboard; đổi các password/SMTP/JWT đã chia sẻ trong chat; không commit .env. Cần storage ảnh riêng tư bền vững, Redis dùng cho thu hồi token, TLS DB có kiểm chứng.
3. Trước build frontend: sinh sitemap bằng `SITE_URL` đúng origin HTTPS và `node scripts/generate-seo.cjs`; đặt VITE_API_URL tới API thật. CLIENT_URL backend phải đúng origin FE.
4. vercel.json cung cấp 5 header, Helmet cho API. Kiểm tra curl -I trên cả hai URL; chứng thư/HTTPS/redirect phải kiểm chứng trên tên miền, không thay bằng localhost.
5. Chạy smoke đủ ba vai trò, bộ 25 ca bản online được nhóm rà soát để không sửa dữ liệu thật; bổ sung ảnh 24/26/30/32 đúng môi trường. Script local hiện từ chối host cloud, không bỏ guard chỉ để chạy cho nhanh.

## Đóng gói

`node docs/scripts/package-final-draft.cjs` tạo tám thư mục theo tài liệu. Output nằm submission-output, không commit. Nếu output đã có thì đặt SUBMISSION_NAME mới; script không xóa dữ liệu. Source không chứa node_modules, .git, .env, private uploads hoặc dist. Manifest có SHA-256.

Trước nộp: bổ sung báo cáo chung DOCX/PDF 30–80 trang có mục lục/hình/bảng cập nhật; video 8–15 phút; URL; hồ sơ có chữ ký; dump và kiểm phục hồi; ảnh còn thiếu. Đối chiếu 19 thành phần Phụ lục 08 (không có đủ phụ lục này trong hồ sơ đọc hiện tại nên chưa chứng nhận đủ 19). Tên lớp N03/nhóm09/đề tài09 trong gói nháp cần xác minh với nhóm trưởng. Nhờ người khác dựng lại trên máy sạch trong 30 phút, ghi thời gian/kết quả thật. Nộp Canvas do người có quyền thực hiện; gói nháp không thay cho xác nhận đã nộp.
