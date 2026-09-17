# Use Case Diagram – Crowdfunding CĐ09

## 1. Actors

### User

- Đăng ký / đăng nhập.
- Quản lý profile.
- Xem Campaign.
- Donation.
- Xem lịch sử Donation.
- Tham gia Community.

### Fundraiser

- Gửi hồ sơ xác minh.
- Tạo Campaign.
- Chỉnh sửa Campaign của mình.
- Upload media/tài liệu.
- Gửi Campaign để duyệt.
- Theo dõi Campaign.
- Đăng Campaign Update.

### Admin

- Quản lý User.
- Duyệt Verification.
- Cấp/thu hồi Fundraiser.
- Duyệt Campaign.
- Quản lý Donation/Payment.
- Xử lý Report.
- Suspend/Ban.
- Quản lý Category.
- Xem Audit Log.

---

## 2. Use Case Diagram tổng quát

Sơ đồ Use Case tổng quát của hệ thống Crowdfunding CĐ09 gồm ba actor chính: **User, Fundraiser và Admin**.

Ảnh sơ đồ được tạo từ mã nguồn PlantUML `use-case-general.puml`.

---

## 3. Phân rã Use Case theo module

### Authentication & User

```text
Authentication
├── Register
├── Login
├── Logout
├── Verify Email / Phone
├── Manage Profile
└── Manage Password / Session
```

### Verification

```text
Identity Verification
├── Submit Verification
├── Upload Identity Document
├── View Verification Status
├── Review Verification
├── Approve / Reject
└── Grant / Revoke Fundraiser
```

### Campaign

```text
Campaign
├── Create Campaign
├── Save Draft
├── Edit Campaign
├── Upload Media / Document
├── Set Goal
├── Set Deadline
├── Submit For Approval
├── Approve / Reject
├── Track Progress
└── Post Update
```

### Donation & Payment

```text
Donation
├── Select Amount
├── Anonymous Donation
├── Online Payment
├── Transaction Status
├── Donation History
└── Receipt
```

### Transparency

```text
Transparency
├── Raised Amount
├── Expenses
├── Receipts / Invoices
└── Financial Report
```

### Community

```text
Community
├── Create / Join Community
├── Follow / Block User
├── Post
├── Comment
├── Like
└── Share Campaign
```

### Admin

```text
Admin
├── User Management
├── Verification Management
├── Campaign Approval
├── Donation / Payment Management
├── Report Management
├── Suspend / Ban
├── Category Management
└── Audit Log
```

---

## 4. Kiểm tra "Remove a Role"

### Remove User

Nếu loại bỏ User, hệ thống mất actor thực hiện:

- Xem Campaign.
- Donation.
- Community.
- Quản lý tài khoản cá nhân.

→ **User là actor cần thiết.**

### Remove Fundraiser

Nếu loại bỏ Fundraiser, không còn actor trực tiếp:

- Tạo Campaign.
- Quản lý Campaign.
- Gửi Campaign để duyệt.
- Đăng Campaign Update.

→ **Fundraiser là actor cần thiết.**

### Remove Admin

Nếu loại bỏ Admin, không còn actor:

- Duyệt Verification.
- Cấp/thu hồi Fundraiser.
- Duyệt Campaign.
- Moderation.
- Quản lý User.
- Audit.

→ **Admin là actor cần thiết.**

Ba actor đều có trách nhiệm nghiệp vụ riêng.

---

## 5. Luồng nghiệp vụ chính

### 5.1 Create Campaign

```text
User
  ↓
Identity Verification
  ↓
Admin Review
  ↓
Fundraiser
  ↓
Create Campaign
  ↓
Save Draft
  ↓
Submit Campaign
  ↓
Admin Review
  ├── Reject → Edit Campaign
  ↓
Approve
  ↓
Published Campaign
```

### 5.2 Donation

```text
User
  ↓
Browse Campaign
  ↓
Select Campaign
  ↓
Enter Amount
  ↓
Payment
  ↓
Transaction
  ├── Failed → Donation Failed
  ↓
Donation Success
  ↓
DB Transaction
  ↓
Update Campaign Total
  ↓
Audit Trail
  ↓
Receipt
```

DB Transaction được sử dụng để bảo đảm khoản Donation và tổng tiến độ Campaign được cập nhật nhất quán.
