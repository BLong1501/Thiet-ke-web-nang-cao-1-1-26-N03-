# Authorization & Security Test Cases

> Các test case dưới đây là **test case thiết kế**. Chỉ ghi PASS sau khi thực tế chạy trên hệ thống.

| ID         | Actor        | Scenario                                 | Expected                         |
| ---------- | ------------ | ---------------------------------------- | -------------------------------- |
| TC-AUTH-01 | Anonymous    | Tạo Campaign                             | `401`                            |
| TC-AUTH-02 | User         | Tạo Campaign                             | `403`                            |
| TC-AUTH-03 | Fundraiser   | Tạo Campaign                             | `201` nếu dữ liệu hợp lệ         |
| TC-AUTH-04 | User         | Duyệt Campaign                           | `403`                            |
| TC-AUTH-05 | Fundraiser   | Duyệt Campaign                           | `403`                            |
| TC-AUTH-06 | Admin        | Duyệt Campaign                           | Thành công nếu Campaign hợp lệ   |
| TC-AUTH-07 | Fundraiser A | Sửa Campaign của Fundraiser B            | `403` hoặc `404`                 |
| TC-AUTH-08 | Fundraiser A | Sửa Campaign của chính mình              | Thành công                       |
| TC-AUTH-09 | Anonymous    | Truy cập protected API                   | `401`                            |
| TC-AUTH-10 | User         | Sử dụng token không hợp lệ               | `401`                            |
| TC-AUTH-11 | User A       | Truy cập Donation của User B             | `403` hoặc `404`                 |
| TC-AUTH-12 | User A       | Sửa profile User B                       | `403`                            |
| TC-AUTH-13 | Fundraiser   | Quản lý User                             | `403`                            |
| TC-AUTH-14 | Admin        | Suspend User                             | Thành công                       |
| TC-AUTH-15 | Fundraiser   | Tự cấp quyền Admin                       | `403`                            |
| TC-SEC-01  | User         | Gửi SQL Injection payload                | Không bypass / không thay đổi DB |
| TC-SEC-02  | User         | Gửi XSS payload                          | Payload không được thực thi      |
| TC-SEC-03  | Fundraiser   | Upload file không hợp lệ                 | `400`                            |
| TC-SEC-04  | Anonymous    | Donation vào protected endpoint          | `401`                            |
| TC-SEC-05  | User         | Truy cập resource bằng ID của người khác | Bị từ chối                       |

---

## 1. Ví dụ test IDOR

### Precondition

```text
Fundraiser A → Campaign A
Fundraiser B → Campaign B
```

### Action

Fundraiser A gửi:

```http
PUT /api/v1/campaigns/{campaignB}
```

### Expected

```text
HTTP 403 Forbidden
```

hoặc `404 Not Found` tùy thiết kế API.

Campaign B không được thay đổi.

---

## 2. Ví dụ test Role

### User tạo Campaign

```http
POST /api/v1/campaigns
```

Expected:

```text
401  → nếu chưa đăng nhập
403  → nếu đã đăng nhập nhưng chỉ có role User
```

### Fundraiser tạo Campaign

Expected:

```text
201 Created
```

nếu dữ liệu hợp lệ và Fundraiser đã được xác minh.

---

## 3. Ví dụ test SQL Injection

Gửi payload SQL Injection vào input.

Expected:

- Không bypass authentication.
- Không bypass authorization.
- Không truy xuất dữ liệu trái phép.
- Không thay đổi database trái phép.

---

## 4. Ví dụ test XSS

Nhập payload XSS vào:

- Campaign description.
- Comment.
- Community post.

Expected:

```text
Payload không được thực thi trên trình duyệt.
```

---

## 5. Metric kiểm thử

Sau khi thực tế chạy test, cập nhật:

```text
Total test cases: XX
Executed: XX
Passed: XX
Failed: XX

Pass rate = Passed / Executed × 100%
```

Không ghi số liệu trước khi thực tế kiểm thử.
