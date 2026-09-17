# So sánh hệ thống Crowdfunding tương tự

## 1. Mục đích

Khảo sát các hệ thống crowdfunding phổ biến để xác định các nhóm chức năng có thể tham khảo cho hệ thống Crowdfunding CĐ09.

Hai hệ thống được lựa chọn:

- Kickstarter
- GoFundMe

---

## 2. Bảng so sánh

| Tiêu chí               | Kickstarter                          | GoFundMe                              | CĐ09                   |
| ---------------------- | ------------------------------------ | ------------------------------------- | ---------------------- |
| Mô hình chính          | Crowdfunding cho dự án               | Fundraising cá nhân/cộng đồng/charity | Community Crowdfunding |
| Người tạo              | Creator                              | Organizer                             | Fundraiser             |
| Người đóng góp         | Backer                               | Donor                                 | User                   |
| Campaign/Fundraiser    | ✓                                    | ✓                                     | ✓                      |
| Mục tiêu gây quỹ       | ✓                                    | ✓                                     | ✓                      |
| Thời hạn               | ✓                                    | Có hỗ trợ                             | ✓                      |
| Theo dõi tiến độ       | ✓                                    | ✓                                     | ✓                      |
| Đóng góp               | Pledge                               | Donation                              | Donation               |
| Donation ẩn danh       | Có hỗ trợ tùy trường hợp             | Có                                    | ✓                      |
| Update Campaign        | ✓                                    | ✓                                     | ✓                      |
| Media                  | Ảnh/video                            | Ảnh/video                             | Ảnh/video              |
| Identity / Safety      | Có cơ chế kiểm tra                   | Có Trust & Safety                     | Identity Verification  |
| Admin moderation       | ✓                                    | ✓                                     | ✓                      |
| Community / Social     | Có                                   | Có chia sẻ                            | ✓                      |
| Financial transparency | Theo Campaign                        | Theo Fundraiser                       | ✓                      |
| Audit Trail            | Không xác định từ tài liệu công khai | Không xác định từ tài liệu công khai  | ✓                      |

---

## 3. Kiến trúc và dữ liệu

Kiến trúc backend và database nội bộ của Kickstarter và GoFundMe không được công khai đầy đủ trong phạm vi khảo sát này, vì vậy không giả định công nghệ cụ thể của hai hệ thống.

Đối với CĐ09, kiến trúc được xác định rõ:

```text
Frontend React
      │
      ▼
RESTful API
      │
      ▼
Modular Monolith
      │
 ┌────┼─────────────────┐
 │    │       │         │
Users Campaign Donations Verification
 │
 └──────── Communities
      │
      ▼
MySQL + Prisma
```

Các module chính:

```text
campaigns
communities
donations
users
verifications
```

---

## 4. Chức năng tham khảo cho CĐ09

Từ khảo sát, CĐ09 tập trung vào:

1. Tạo Campaign.
2. Thiết lập mục tiêu và thời hạn.
3. Donation.
4. Theo dõi tiến độ.
5. Công khai lịch sử đóng góp.
6. Campaign Update.
7. Media/Tài liệu.
8. Identity Verification.
9. Admin Approval.
10. Financial Transparency.
11. Community/Social.
12. Notification.
13. Audit Trail.

---

## 5. Kết luận

CĐ09 kế thừa mô hình nghiệp vụ cốt lõi của crowdfunding nhưng bổ sung các yêu cầu kỹ thuật riêng:

```text
Identity Verification
        +
Admin Approval
        +
Transaction DB
        +
Immutable Audit Trail
        +
Financial Transparency
```

Các yêu cầu này được dùng làm cơ sở cho đặc tả chức năng, bảo mật và thiết kế hệ thống.
