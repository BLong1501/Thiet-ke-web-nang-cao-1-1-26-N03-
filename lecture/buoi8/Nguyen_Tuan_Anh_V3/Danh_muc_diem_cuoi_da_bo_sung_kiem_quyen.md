# Danh mục điểm cuối đã bổ sung kiểm quyền trên đối tượng

**Nhóm 9 · Hệ thống Gây quỹ Cộng đồng · CĐ09**  
**Vai trò V3 — Phụ trách nghiệp vụ: Nguyễn Tuấn Anh**  
**Nhiệm vụ:** Bổ sung kiểm quyền trên đối tượng cho toàn bộ điểm cuối còn thiếu  
**Sản phẩm cá nhân:** Danh mục điểm cuối đã bổ sung kiểm quyền  
**Ngày thực hiện:** 14/10/2026

Kiểm quyền chức năng (RBAC / `authorize`) không đủ: user đã đăng nhập vẫn có thể đổi `:id` sang tài nguyên của người khác (IDOR). Lớp `assertObjectAccess` / `assertAnyObjectAccess` (`backend/src/core/auth/object-access.ts`) đối chiếu **chủ sở hữu bản ghi** với `req.user.userId`, ghi `IDOR_ATTEMPT_BLOCKED` khi bị chặn.

---

## 1. Điểm cuối vừa bổ sung (phạm vi nhiệm vụ này)

| STT | Method | Điểm cuối | Đối tượng | Quy tắc | Kết quả khi sai chủ |
|:---:|:------:|-----------|-----------|---------|---------------------|
| 1 | `GET` | `/api/v1/campaigns` | Campaign (trạng thái nội bộ) | Khách/USER/FUNDRAISER không lọc `DRAFT` / `PENDING_APPROVAL` / `REJECTED`. Admin được lọc. | **403** |
| 2 | `GET` | `/api/v1/campaigns/:idOrSlug` | Campaign chưa công khai | Bản nháp/chờ duyệt/từ chối chỉ chủ chiến dịch hoặc ADMIN. Người khác nhận 404 (không lộ tồn tại). | **404** |
| 3 | `GET` | `/api/v1/campaigns/:idOrSlug` | Dữ liệu nhạy cảm (STK, MST) | Khách chỉ thấy bản đã che. Chủ/ADMIN thấy đủ. | Che trường, không 403 |
| 4 | `PUT` | `/api/v1/campaigns/:id` | Campaign | Chủ hoặc ADMIN. Ghi audit IDOR. | **403** |
| 5 | `POST` | `/api/v1/campaigns/:id/media` | Campaign | Chủ hoặc ADMIN. | **403** |
| 6 | `POST` | `/api/v1/campaigns/:id/updates` | Campaign | Chủ hoặc ADMIN. | **403** |
| 7 | `POST` | `/api/v1/campaigns/:id/disbursements` | Campaign | Chủ hoặc ADMIN. | **403** |
| 8 | `POST` | `/api/v1/donations/:id/confirm` | Donation | Bắt buộc đăng nhập. Chỉ **donor** hoặc ADMIN. Khoản khách (không `donorId`) chỉ ADMIN. | **401 / 403** |
| 9 | `GET` | `/api/v1/donations/:id` | Donation | Donor **hoặc** chủ chiến dịch **hoặc** ADMIN. | **403** |
| 10 | `POST` | `/api/v1/donations/:id/refund` | Donation | Donor hoặc ADMIN. | **403** |
| 11 | `GET` | `/api/v1/donations/campaign/:campaignId/manage-donations` | Campaign (PII nhà hảo tâm) | Chủ chiến dịch hoặc ADMIN. | **403** |
| 12 | `PATCH` | `/api/v1/notifications/:id/read` | Notification | Chỉ chủ thông báo. **ADMIN không được đọc hộ** (đúng ma trận AUTH-ME/API-58). | **403** |
| 13 | `POST` | `/api/v1/communities/:id/posts` | Community + Campaign gắn kèm | Phải là thành viên. `campaignId` chỉ ACTIVE hoặc chiến dịch của mình. | **403 / 404** |
| 14 | `POST` | `/api/v1/communities/:id/posts/:postId/like` | Community | Phải là thành viên (không like chui nhóm). | **403** |
| 15 | `POST` | `/api/v1/communities/:id/posts/:postId/comments` | Community | Phải là thành viên. | **403** |

`optionalAuthenticate` gắn vào `GET /campaigns` và `GET /campaigns/:idOrSlug` để nhận diện chủ sở hữu khi có token, vẫn cho khách xem bản công khai.

---

## 2. Điểm cuối đã đúng từ trước (không đụng logic, chỉ đối chiếu)

| Method | Điểm cuối | Cách chặn IDOR |
|--------|-----------|----------------|
| `GET` | `/auth/me`, `/profile/me`, `/campaigns/my/list`, `/donations/my/history`, `/notifications`, `/activity-logs/me` | Identity lấy từ JWT, bỏ `userId` client |
| `GET` | `/uploads/:id` | `owner.json` khớp `req.user.userId`, ADMIN được đọc |
| `GET` | `/verifications/my-status` | Hồ sơ theo `req.user.userId` |
| `GET` | `/communities/:id/posts` | Nhóm riêng: chỉ thành viên (`getReadable`) |
| `POST` | `/reports` | `reporterId` từ token |

---

## 3. Điểm cuối không áp dụng ownership (công khai hoặc thuần RBAC)

| Nhóm | Ví dụ | Lý do |
|------|--------|------|
| Công khai | `GET /campaigns` (ACTIVE), `GET /categories`, `GET /donations/campaign/:id` (bảng vinh danh đã ẩn danh) | Không có chủ riêng |
| Chỉ ADMIN | `/verifications/pending`, `/users`, `/admin/reports`, `/activity-logs` (trừ `/me`) | `authorize(ADMIN)` đủ |
| Gateway mô phỏng | `POST /donations/:id/confirm-demo` | Chỉ ADMIN, môi trường dev/test |

---

## 4. Cách kiểm chứng

```bash
cd backend
npx tsx --test tests/object-access.test.ts
```

Kịch bản thủ công (Apidog):

1. Fundraiser A tạo chiến dịch `DRAFT`. User B gọi `GET /api/v1/campaigns/{id}` → **404**.
2. User B gọi `GET /api/v1/campaigns?status=DRAFT` → **403**.
3. User B gọi `POST /api/v1/donations/{idCủaA}/confirm` (đã đăng nhập) → **403**.
4. User B gọi `PATCH /api/v1/notifications/{idCủaA}/read` → **403**.
5. Chủ chiến dịch gọi `GET` chi tiết chiến dịch ACTIVE → thấy STK; khách gọi cùng URL → `bankAccountNumber: null`.

---

## 5. Vị trí mã

| Thành phần | File |
|------------|------|
| Helper kiểm quyền đối tượng | `backend/src/core/auth/object-access.ts` |
| Chiến dịch (ẩn bản nháp, che STK, ownership ghi) | `campaign.service.ts`, `campaign.routes.ts` |
| Quyên góp (confirm / detail / refund / manage) | `donation.service.ts`, `donation.routes.ts` |
| Thông báo | `notification.service.ts` |
| Cộng đồng (thành viên + gắn campaign) | `community.service.ts` |
| Kiểm thử | `backend/tests/object-access.test.ts` |
