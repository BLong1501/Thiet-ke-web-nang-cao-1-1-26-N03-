# Yêu cầu phi chức năng – Bảo mật

## 1. Mục đích

Tài liệu xác định các yêu cầu phi chức năng về bảo mật cho hệ thống Gây quỹ Cộng đồng (Crowdfunding) CĐ09.

Các yêu cầu được xây dựng dựa trên kiến trúc Modular Monolith + MVC, RESTful API, MySQL + Prisma, xác thực và phân quyền người dùng.

---

## 2. Các yêu cầu bảo mật

| ID         | Yêu cầu             | Tiêu chí đo lường / nghiệm thu                                                             |
| ---------- | ------------------- | ------------------------------------------------------------------------------------------ |
| YCPCN-BM01 | Bảo mật mật khẩu    | 100% mật khẩu được lưu dưới dạng hash bằng bcrypt; không lưu plaintext                     |
| YCPCN-BM02 | Authentication      | 100% request vào API yêu cầu đăng nhập nhưng không có authentication hợp lệ phải trả `401` |
| YCPCN-BM03 | Authorization       | 100% request không đủ quyền phải bị từ chối bằng `403`                                     |
| YCPCN-BM04 | Chống IDOR          | 100% test truy cập/sửa resource của người khác trái phép phải bị chặn                      |
| YCPCN-BM05 | Validate input      | 100% API nhận dữ liệu từ client phải thực hiện validation                                  |
| YCPCN-BM06 | Chống SQL Injection | 100% thao tác database sử dụng Prisma/parameterized query; không nối chuỗi SQL từ input    |
| YCPCN-BM07 | Bảo vệ Secret       | 0 secret thật được commit vào Git repository                                               |
| YCPCN-BM08 | Session/Cookie      | Cookie xác thực sử dụng `HttpOnly=true`, `Secure=true` khi production và `SameSite=Lax`    |
| YCPCN-BM09 | Error Handling      | 0 stack trace hoặc thông tin secret được trả về client trong production                    |
| YCPCN-BM10 | File Upload         | 100% file upload được kiểm tra loại file và kích thước trước khi lưu                       |
| YCPCN-BM11 | Chống XSS           | 100% dữ liệu người dùng hiển thị trên frontend phải được escape/sanitize phù hợp           |
| YCPCN-BM12 | Audit Trail         | 100% hành động quản trị và giao dịch quan trọng phải được ghi audit log                    |

---

## 3. Chi tiết yêu cầu

### YCPCN-BM01 – Bảo mật mật khẩu

Mật khẩu người dùng phải được hash bằng `bcrypt` trước khi lưu vào database.

Không được lưu hoặc log mật khẩu dưới dạng plaintext.

**Nghiệm thu:**

- 100% password trong database là giá trị hash.
- Không xuất hiện plaintext password trong source code, database hoặc log.

---

### YCPCN-BM02 – Authentication

Các API yêu cầu đăng nhập phải kiểm tra Session hoặc JWT trước khi xử lý request.

**Nghiệm thu:**

- Không có authentication → `401 Unauthorized`.
- Authentication không hợp lệ → `401 Unauthorized`.
- Authentication hợp lệ → tiếp tục kiểm tra authorization.

---

### YCPCN-BM03 – Authorization

Hệ thống phải phân quyền tối thiểu theo:

```text
User
Fundraiser
Admin
```

**Nghiệm thu:**

- User không được thực hiện chức năng chỉ dành cho Fundraiser/Admin.
- Fundraiser không được thực hiện chức năng chỉ dành cho Admin.
- Request không đủ quyền → `403 Forbidden`.

---

### YCPCN-BM04 – IDOR

Hệ thống phải kiểm tra quyền sở hữu resource trước khi cho phép sửa hoặc xóa.

Ví dụ:

```text
Fundraiser A
   └── Campaign A

Fundraiser B
   └── Campaign B
```

Fundraiser A không được sửa Campaign B chỉ bằng cách thay đổi `campaignId`.

**Nghiệm thu:**

100% test case IDOR trái phép phải bị chặn.

---

### YCPCN-BM05 – Input Validation

Backend phải validate toàn bộ dữ liệu nhận từ client.

Các nội dung cần kiểm tra:

- Kiểu dữ liệu.
- Giá trị số.
- Độ dài chuỗi.
- Email.
- Ngày tháng.
- Trường bắt buộc.
- File upload.

Request không hợp lệ phải trả `400 Bad Request`.

---

### YCPCN-BM06 – SQL Injection

Không được nối chuỗi SQL trực tiếp với dữ liệu người dùng.

Database phải được truy cập thông qua Prisma hoặc cơ chế parameterized query.

**Nghiệm thu:**

- 0 câu SQL được ghép trực tiếp từ input.
- Payload SQL Injection không được bypass authentication/authorization.
- Payload không được làm thay đổi dữ liệu trái phép.

---

### YCPCN-BM07 – Secret Management

Thông tin nhạy cảm phải được quản lý bằng biến môi trường.

Các secret bao gồm:

- Database credentials.
- JWT secret.
- API key.
- Payment credentials.

Repository chỉ chứa:

```text
.env.example
```

Không commit `.env` thật.

**Nghiệm thu:**

`0` secret thật trong Git repository.

---

### YCPCN-BM08 – Session & Cookie

Nếu sử dụng Cookie để quản lý Session/Refresh Token:

```text
HttpOnly = true
Secure = true        # production
SameSite = Lax
```

Cơ chế CSRF Token có thể được sử dụng bổ sung khi cần.

---

### YCPCN-BM09 – Error Handling

Backend phải sử dụng Error Handler thống nhất.

Production response không được tiết lộ:

- Stack trace.
- Database credentials.
- JWT secret.
- Thông tin hệ thống nội bộ.

---

### YCPCN-BM10 – File Upload

Các file Campaign và tài liệu xác minh danh tính phải được kiểm tra trước khi lưu.

Kiểm tra tối thiểu:

```text
File type
File size
File extension
MIME type
```

File không hợp lệ phải bị từ chối.

---

### YCPCN-BM11 – XSS

Frontend React phải tận dụng cơ chế escape mặc định.

Không sử dụng:

```text
dangerouslySetInnerHTML
```

trừ trường hợp thực sự cần thiết.

Nếu phải render HTML từ người dùng, dữ liệu phải được sanitize bằng cơ chế phù hợp như DOMPurify.

Backend sử dụng HTTP security header theo yêu cầu dự án:

```text
Content-Security-Policy:
default-src 'self'; script-src 'self' 'unsafe-inline';
```

---

### YCPCN-BM12 – Audit Trail

Các thao tác quan trọng phải được ghi nhận vào Audit Log.

Tối thiểu gồm:

- Đăng nhập/đăng xuất.
- Thay đổi quyền.
- Xác minh danh tính.
- Duyệt/từ chối Campaign.
- Giao dịch Donation.
- Thay đổi trạng thái tài khoản.
- Các thao tác quản trị quan trọng.

Audit Trail của giao dịch phải tuân thủ nguyên tắc **không chỉnh sửa lịch sử sau khi ghi nhận**.

---

## 4. Nguyên tắc bảo mật tổng quát

```text
Client
   │
   ▼
Authentication
   │
   ▼
Authorization
   │
   ▼
Input Validation
   │
   ▼
Business Logic
   │
   ▼
Prisma / Database
   │
   ▼
Audit Trail
```

Mục tiêu là bảo đảm request được xác thực, phân quyền và kiểm tra dữ liệu trước khi tác động đến hệ thống.
