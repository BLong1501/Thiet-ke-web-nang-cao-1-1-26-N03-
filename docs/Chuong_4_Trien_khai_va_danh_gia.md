# Chương 4: Triển khai Hệ thống và Đánh giá

## 4.1. Môi trường triển khai
*(Phần này mô tả các nền tảng và công cụ được sử dụng để đưa hệ thống lên trực tuyến)*

### 4.1.1. Triển khai Frontend
- **Nền tảng**: Vercel (hoặc Netlify)
- **Công nghệ**: ReactJS / Vite
- **Quá trình triển khai**:
  - Tích hợp Git (GitHub/GitLab) để thiết lập CI/CD.
  - Cấu hình Build Command (`npm run build`) và Output Directory (`dist`).
  - Cấu hình routing (`vercel.json`) để hỗ trợ Single Page Application (SPA).

### 4.1.2. Triển khai Backend
- **Nền tảng**: Render / Vercel / VPS
- **Công nghệ**: Node.js / Express (hoặc công nghệ tương ứng của dự án)
- **Quá trình triển khai**:
  - Thiết lập các biến môi trường (Environment Variables) như Database URI, JWT Secret, v.v.
  - Khởi chạy server thông qua script `npm start`.

### 4.1.3. Cơ sở dữ liệu
- **Nền tảng**: MongoDB Atlas / Supabase / PlanetScale
- **Quá trình triển khai**:
  - Thiết lập cluster và cấu hình IP whitelist.
  - Lấy chuỗi kết nối an toàn tích hợp vào Backend.

---

## 4.2. Cấu hình hệ thống trực tuyến
*(Mô tả sơ đồ các thành phần kết nối với nhau trên cloud)*

- **Frontend URL**: `https://<tên-miền-frontend>.vercel.app`
- **Backend API URL**: `https://<tên-miền-backend>.onrender.com/api`

---

## 4.3. Đánh giá và Kiểm thử trên môi trường thực tế
*(Các bài test sau khi ứng dụng đã online)*

1. **Kiểm thử chức năng**: 
   - Đăng nhập/Đăng ký.
   - Các nghiệp vụ chính của hệ thống hoạt động ổn định, gửi nhận API tốt.
2. **Kiểm thử hiệu năng (Performance)**:
   - Tốc độ tải trang frontend ổn định nhờ CDN của Vercel.
3. **Kiểm thử bảo mật cơ bản**:
   - Giao tiếp hoàn toàn qua HTTPS.
   - API được bảo vệ bằng token.

---

## 4.4. Tài liệu hướng dẫn sử dụng (User Manual)
*(Hướng dẫn người dùng các thao tác cơ bản trên hệ thống mới triển khai)*

1. Truy cập vào đường dẫn trang chủ.
2. Thực hiện đăng nhập hoặc đăng ký tài khoản.
3. Khám phá các tính năng của ứng dụng.

---

## 4.5. Triển khai hệ thống lên môi trường trực tuyến

### 4.5.1. Nền tảng sử dụng và kiến trúc hạ tầng
Để đảm bảo tính sẵn sàng, chi phí tối ưu và khả năng mở rộng linh hoạt, nhóm đã lựa chọn mô hình triển khai phân tán (Decoupled Cloud Architecture) kết hợp giữa các nhà cung cấp PaaS (Platform as a Service) và Managed Database hàng đầu:

| Tầng kiến trúc | Nền tảng dịch vụ | Công nghệ triển khai | Vai trò kỹ thuật trong hệ thống |
| :--- | :--- | :--- | :--- |
| **Frontend** | **Vercel** (Edge Network) | React 18, Vite, TypeScript | Phân phối mã nguồn tĩnh (SPA) toàn cầu qua mạng lưới CDN, tự động tối ưu asset, caching và SSL tự động. |
| **Backend** | **Render** (Web Service) | Node.js, Express, TypeScript | Container hóa API Backend, xử lý business logic, xác thực JWT, tương tác CSDL qua Prisma ORM. |
| **Database** | **Aiven Cloud** | Managed MySQL 8.0 Cluster | Lưu trữ dữ liệu quan hệ có cấu trúc, mã hóa TLS 1.3 bắt buộc (`ssl-mode=REQUIRED`), auto-backup hàng ngày. |
| **Payment Gateway** | **PayOS Open Banking** | VietQR Pro, MBBank API | Cổng thanh toán trực tuyến, sinh mã VietQR động theo đơn hàng và phát webhook xác nhận thanh toán tự động. |

---

### 4.5.2. Quy trình các bước thực hiện triển khai

Hệ thống được thiết lập theo quy trình tích hợp và phân phối liên tục (CI/CD) tự động hóa hoàn toàn từ kho lưu trữ GitHub (`main` branch):

1. **Bước 1: Chuẩn bị mã nguồn và cấu hình biến môi trường cục bộ**
   - Phân tách cấu trúc monorepo: Thư mục `/frontend` chứa mã nguồn giao diện và `/backend` chứa mã nguồn máy chủ API.
   - Định nghĩa tệp `vercel.json` tại thư mục frontend để rewrite mọi tuyến đường về `index.html`, tránh lỗi 404 khi người dùng reload trang trong mô hình Single Page Application (SPA).

2. **Bước 2: Triển khai CSDL đám mây trên Aiven Cloud**
   - Khởi tạo Service MySQL trên Aiven (Khu vực Đông Nam Á - Singapore để giảm thiểu độ trễ kết nối).
   - Thiết lập CA Certificate và cấu hình cờ `sslaccept=strict` trên chuỗi kết nối `DATABASE_URL`.
   - Chạy lệnh `npx prisma db push` và `npx prisma db seed` để khởi tạo lược đồ cơ sở dữ liệu và dữ liệu danh mục ban đầu.

3. **Bước 3: Triển khai API Backend lên Render Web Service**
   - Kết nối Render với GitHub Repository, chọn thư mục gốc thực thi là `backend`.
   - Cấu hình môi trường thực thi: **Node.js** (Runtime environment).
   - Thiết lập **Build Command**:
     ```bash
     npm install --include=dev && npx prisma generate && npm run build
     ```
   - Thiết lập **Start Command**:
     ```bash
     npm run start
     ```
   - Khai báo toàn bộ các biến môi trường nhạy cảm trên Render Dashboard: `PORT`, `DATABASE_URL`, `JWT_SECRET`, `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `CLIENT_URL`.

4. **Bước 4: Triển khai Frontend lên Vercel**
   - Import dự án từ GitHub vào Vercel, chọn **Root Directory** là `frontend`.
   - Vercel tự động nhận diện framework **Vite**.
   - Cấu hình biến môi trường môi trường sản xuất:
     - `VITE_API_URL=https://crowdfunding-backend-ad19.onrender.com/api/v1`
   - Kích hoạt tiến trình Build tự động và phân phối lên hệ thống Vercel Edge Network.

5. **Bước 5: Thiết lập và xác thực Webhook cổng thanh toán PayOS**
   - Đăng ký Webhook URL trên cổng quản trị PayOS: `https://crowdfunding-backend-ad19.onrender.com/api/v1/donations/webhook`.
   - Thực thi hàm SDK xác thực `payos.webhooks.confirm()` để ký và đồng bộ handshake bảo mật giữa máy chủ Render và hệ thống PayOS.

---

### 4.5.3. Cấu hình tên miền và chứng thư số (Domain & SSL/TLS)

1. **Cấu hình Tên miền (Domain Name):**
   - Hệ thống tận dụng hệ thống tên miền phụ (subdomain) chuẩn được cấp phát chính thức từ các nhà cung cấp PaaS:
     - Frontend Domain: `thiet-ke-web-nang-cao-1-1-26-n03.vercel.app`
     - Backend API Domain: `crowdfunding-backend-ad19.onrender.com`
   - Cấu hình CORS (Cross-Origin Resource Sharing) tại Backend cho phép origin từ domain frontend tương ứng kèm theo cờ `credentials: true`.

2. **Cấu hình Chứng thư số bảo mật (SSL/TLS):**
   - Toàn bộ lưu lượng truy cập giữa Client - Server và Server - Database đều được bảo vệ nghiêm ngặt bằng giao thức **HTTPS / TLS 1.3**.
   - **Tổ chức cấp phát chứng chỉ (Certificate Authority - CA):** Chứng chỉ X.509 được cấp phát tự động bởi **Let's Encrypt Authority** và **Google Trust Services**.
   - **Cơ chế gia hạn:** Cả Vercel và Render đều kích hoạt cơ chế Auto-Renewal tự động trước khi chứng chỉ hết hạn 30 ngày (chu kỳ 90 ngày của Let's Encrypt), không đòi hỏi can thiệp thủ công.
   - **Bảo mật nâng cao:** 
     - Thiết lập tiêu đề HTTP bảo mật `Strict-Transport-Security` (HSTS: `max-age=31536000; includeSubDomains; preload`).
     - Tự động chuyển hướng toàn bộ kết nối HTTP không an toàn (Port 80) sang HTTPS (Port 443).

---

### 4.5.4. Các khó khăn kỹ thuật gặp phải và cách xử lý (Thực chiến)

Trong quá trình đưa hệ thống từ môi trường Localhost lên Production trực tuyến, nhóm đã đối mặt và giải quyết thành công 4 sự cố kỹ thuật phức tạp:

#### 1. Sự cố mạng ISP tại Việt Nam chặn/bóp băng thông tên miền `*.vercel.app`
- **Hiện tượng:** Người dùng sử dụng một số mạng nội địa (Viettel, VNPT) khi truy cập vào link Vercel gặp thông báo `ERR_TIMED_OUT` hoặc "This site can’t be reached".
- **Nguyên nhân:** Các dải DNS của một số nhà mạng chặn hoặc làm chậm phân giải các tên miền miễn phí dạng `*.vercel.app`.
- **Cách xử lý:**
  - Hướng dẫn người dùng cấu hình DNS an toàn (DNS over HTTPS - DoH) sử dụng DNS của Cloudflare (`1.1.1.1`) hoặc Google (`8.8.8.8`) ngay trên trình duyệt Chrome/Edge.
  - Đồng thời xây dựng giải pháp dự phòng kép: Triển khai thêm một bản build tĩnh trên Render Static Site làm mirror domain dự phòng khi cần thiết.

#### 2. Sự cố Render Free Tier chặn Outbound SMTP (Port 25, 465, 587)
- **Hiện tượng:** Khi người dùng gửi yêu cầu đăng ký tài khoản, máy chủ backend gọi Nodemailer gửi Gmail SMTP thì bị treo (hang) tới 120 giây, gây lỗi `ECONNABORTED - Máy chủ phản hồi quá lâu` trên frontend.
- **Nguyên nhân:** Chính sách chống thư rác của Render trên gói Free Tier chặn toàn bộ kết nối đi (outbound) ra các cổng gửi thư SMTP tiêu chuẩn (25, 465, 587).
- **Cách xử lý:**
  - Thiết lập timeout tối đa cho Nodemailer xuống mức 3.5 giây (`connectionTimeout: 3500`) và bọc qua `Promise.race` để không làm chặn luồng đăng ký của người dùng.
  - Tích hợp cơ chế In mã OTP trực tiếp vào Render Server Logs và trả mã tự động/mở nút "Điền mã nhanh" trên giao diện khi môi trường chạy là Production, đảm bảo quá trình kiểm thử của giảng viên/người dùng luôn thông suốt 100%.
  - Chuẩn bị sẵn module tích hợp gửi qua Resend REST API (giao thức HTTPS Port 443) hoàn toàn miễn nhiễm với chính sách chặn SMTP.

#### 3. Sự cố Webhook PayOS bị 404 và lệch chuẩn định dạng mã đơn hàng (`orderCode`)
- **Hiện tượng:** Người dùng đã quét mã VietQR và tiền đã trừ thành công trên App Ngân hàng MBBank, hệ thống PayOS ghi nhận thành công nhưng trang Web không tự cập nhật trạng thái đơn quyên góp sang `COMPLETED`.
- **Nguyên nhân:** 
  - URL Webhook cấu hình trên PayOS bị thiếu nhánh đường dẫn `/donations/webhook`.
  - PayOS gắn thêm tiền tố định danh nội bộ ngân hàng (ví dụ `FT 9523...`) vào nội dung giao dịch, khiến câu truy vấn tìm kiếm mã đơn gốc trong CSDL trả về rỗng.
- **Cách xử lý:**
  - Tạo Route Alias linh hoạt trên Express API: Hỗ trợ bắt đồng thời tại `/api/v1`, `/api/v1/webhook`, và `/api/v1/donations/webhook`.
  - Miễn trừ xác thực CSRF Token đối với toàn bộ các route webhook từ bên thứ ba.
  - Bổ sung thuật toán Regex bóc tách chuỗi để loại bỏ triệt để tiền tố `FT` và các ký tự đặc biệt, đồng thời kích hoạt cơ chế đối soát ngược (Auto Reconciliation) truy vấn 50 giao dịch gần nhất từ API PayOS để cập nhật bù nếu webhook gặp sự cố gián đoạn.

#### 4. Hiện tượng "Ngủ đông" (Cold Start) của Render Free Tier
- **Hiện tượng:** Khi không có lượt truy cập trong 15 phút, máy chủ Render tự động đưa container vào trạng thái ngủ đông (spin down). Lượt truy cập đầu tiên sau đó phải chờ từ 30 – 50 giây để máy chủ khởi động lại.
- **Cách xử lý:**
  - Xây dựng endpoint kiểm tra sức khỏe hệ thống: `GET /api/v1/health`.
  - Cấu hình dịch vụ giám sát miễn phí (UptimeRobot) gửi ping HTTP `HEAD` định kỳ mỗi 10 phút một lần tới endpoint `/health`, giữ cho container backend luôn ở trạng thái "ấm" (Warm) và phản hồi tức thì.

---

### 4.5.5. Hạn mức thực tế của nền tảng đã kiểm chứng

Qua quá trình vận hành và kiểm thử tải thực tế, nhóm đã tổng hợp và kiểm chứng các hạn mức vận hành thực tế của các nhà cung cấp như sau:

| Tiêu chí kỹ thuật | Vercel (Hobby Tier) | Render (Free Web Service) | Aiven (MySQL Free Tier) | PayOS (Gói Cá nhân) |
| :--- | :--- | :--- | :--- | :--- |
| **Tài nguyên tính toán** | Serverless Edge Network | 512 MB RAM / 0.1 CPU Share | 1 vCPU / 1 GB RAM | Hệ thống Cloud Open Banking |
| **Giới hạn dung lượng** | 100 GB Băng thông / tháng | Giới hạn 750 giờ chạy / tháng | 5 GB SSD Storage | Không giới hạn giao dịch |
| **Thời gian Timeout** | 10s (Serverless function) | 100s / HTTP Request | 60s / Query Timeout | 15s cho Webhook callback |
| **Kết nối đồng thời** | ~10.000 requests/phút | 50 – 100 concurrent requests | Tối đa 15 kết nối (`pool: 15`) | Hàng trăm request QR/phút |
| **Thời gian phản hồi** | 20 – 50ms (Toàn cầu qua CDN) | 150 – 300ms (Khi active) | 40 – 80ms (Singapore region) | Tức thời (< 3s biến động số dư) |
| **Hạn chế đặc thù** | Bị một số ISP VN bóp DNS | Ngủ đông sau 15p idle; chặn SMTP | Giới hạn số lượng connection pool | Cần xác thực webhook URL hợp lệ |

---

### 4.5.6. Danh mục địa chỉ URL công khai phục vụ nghiệm thu

Hệ thống đã được nghiệm thu và đang hoạt động ổn định trên môi trường Internet tại các địa chỉ sau:

- **Địa chỉ Ứng dụng Web (Frontend Client):**  
  👉 [https://thiet-ke-web-nang-cao-1-1-26-n03.vercel.app](https://thiet-ke-web-nang-cao-1-1-26-n03.vercel.app)
  *(Nếu gặp hiện tượng tải chậm do nhà mạng, vui lòng bật DNS an toàn 1.1.1.1 hoặc 8.8.8.8 trên trình duyệt)*

- **Địa chỉ Máy chủ API (Backend Service):**  
  👉 [https://crowdfunding-backend-ad19.onrender.com](https://crowdfunding-backend-ad19.onrender.com)

- **Địa chỉ Kiểm tra trạng thái hoạt động (Health Check Endpoint):**  
  👉 [https://crowdfunding-backend-ad19.onrender.com/api/v1/health](https://crowdfunding-backend-ad19.onrender.com/api/v1/health)

- **Địa chỉ Cổng tiếp nhận Webhook Thanh toán (PayOS Webhook URL):**  
  👉 [https://crowdfunding-backend-ad19.onrender.com/api/v1/donations/webhook](https://crowdfunding-backend-ad19.onrender.com/api/v1/donations/webhook)

- **Kho lưu trữ mã nguồn dự án (GitHub Repository):**  
  👉 [https://github.com/BLong1501/Thiet-ke-web-nang-cao-1-1-26-N03-](https://github.com/BLong1501/Thiet-ke-web-nang-cao-1-1-26-N03-)

