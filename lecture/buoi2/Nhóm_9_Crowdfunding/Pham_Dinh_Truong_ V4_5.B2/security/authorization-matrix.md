# Ma trận phân quyền

## 1. Các vai trò

| Role       | Mô tả                                                              |
| ---------- | ------------------------------------------------------------------ |
| User       | Người dùng thông thường, có thể xem Campaign và thực hiện Donation |
| Fundraiser | Người dùng đã được xác minh và được cấp quyền tạo/quản lý Campaign |
| Admin      | Quản trị hệ thống, xử lý verification, Campaign và moderation      |

---

## 2. Ma trận quyền

| Chức năng                         | User | Fundraiser | Admin |
| --------------------------------- | :--: | :--------: | :---: |
| Đăng ký / đăng nhập               |  ✓   |     ✓      |   ✓   |
| Quản lý profile của bản thân      |  ✓   |     ✓      |   ✓   |
| Xem Campaign                      |  ✓   |     ✓      |   ✓   |
| Donation                          |  ✓   |     ✓      |   ✓   |
| Xem lịch sử Donation của bản thân |  ✓   |     ✓      |   ✓   |
| Gửi hồ sơ verification            |  ✗   |     ✓      |   ✓   |
| Tạo Campaign                      |  ✗   |     ✓      |   ✓   |
| Chỉnh sửa Campaign của mình       |  ✗   |     ✓      |   ✓   |
| Chỉnh sửa Campaign của người khác |  ✗   |     ✗      |   ✓   |
| Gửi Campaign để duyệt             |  ✗   |     ✓      |   ✓   |
| Duyệt Campaign                    |  ✗   |     ✗      |   ✓   |
| Từ chối Campaign                  |  ✗   |     ✗      |   ✓   |
| Duyệt verification                |  ✗   |     ✗      |   ✓   |
| Cấp quyền Fundraiser              |  ✗   |     ✗      |   ✓   |
| Thu hồi quyền Fundraiser          |  ✗   |     ✗      |   ✓   |
| Quản lý User                      |  ✗   |     ✗      |   ✓   |
| Suspend / Ban User                |  ✗   |     ✗      |   ✓   |
| Quản lý Donation / Payment        |  ✗   |     ✗      |   ✓   |
| Xử lý Report                      |  ✗   |     ✗      |   ✓   |
| Quản lý Category                  |  ✗   |     ✗      |   ✓   |
| Xem Audit Log quản trị            |  ✗   |     ✗      |   ✓   |

---

## 3. Nguyên tắc Authorization

### Authentication

Xác định người gửi request là ai.

```text
Không đăng nhập
      ↓
    401
```

### Role Authorization

Xác định role có quyền thực hiện chức năng hay không.

```text
Đã đăng nhập
     ↓
Kiểm tra Role
     ↓
Không đủ quyền → 403
```

### Ownership Authorization

Đối với Campaign/resource thuộc về Fundraiser:

```text
Request
   ↓
Authentication
   ↓
Role Check
   ↓
Ownership Check
   ↓
Business Logic
```

Fundraiser chỉ được sửa/xóa Campaign thuộc quyền sở hữu của mình, trừ Admin.
