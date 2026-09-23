# Danh mục ca kiểm thử từ từng ô Không — Buổi 03

Sinh từ authorization-policy.json. Tất cả ca dưới đây là thiết kế; kết quả thực thi nằm riêng trong ../evidence/. Không coi NOT_RUN, BLOCKED hoặc route chưa tồn tại là PASS.

Chuẩn bị tài khoản/tài nguyên theo fixtures.md. Thay tham số đường dẫn bằng ID tồn tại, gửi body hợp lệ để không nhầm lỗi validation/404 với chặn phân quyền. GATEWAY dùng thông tin xác thực gateway, tuyệt đối không dùng JWT Admin.

KYC-SUBMIT: Fundraiser/Admin hiện bị từ chối bằng 400 theo service; đây là điều kiện nghiệp vụ đã ghi nhận, không khẳng định middleware trả 403. Các ca webhook dùng 403 theo thiết kế khi thiếu/sai chữ ký.

| Test ID | Ô ma trận | Actor | HTTP dự kiến | API | Trạng thái API | Kết quả chạy |
|---|---|---|---|---|---|---|
| <a id="deny-api-03-guest"></a>DENY-API-03-GUEST | API-03 | GUEST | 401 | POST `/auth/logout` | PLANNED | NOT_RUN |
| <a id="deny-api-03-gateway"></a>DENY-API-03-GATEWAY | API-03 | GATEWAY | 401 | POST `/auth/logout` | PLANNED | NOT_RUN |
| <a id="deny-auth-me-guest"></a>DENY-AUTH-ME-GUEST | AUTH-ME | GUEST | 401 | GET `/auth/me` | LIVE | NOT_RUN |
| <a id="deny-auth-me-gateway"></a>DENY-AUTH-ME-GATEWAY | AUTH-ME | GATEWAY | 401 | GET `/auth/me` | LIVE | NOT_RUN |
| <a id="deny-api-09-guest"></a>DENY-API-09-GUEST | API-09 | GUEST | 401 | PUT `/users/me` | PLANNED | NOT_RUN |
| <a id="deny-api-09-gateway"></a>DENY-API-09-GATEWAY | API-09 | GATEWAY | 401 | PUT `/users/me` | PLANNED | NOT_RUN |
| <a id="deny-api-10-guest"></a>DENY-API-10-GUEST | API-10 | GUEST | 401 | PUT `/users/me/password` | PLANNED | NOT_RUN |
| <a id="deny-api-10-gateway"></a>DENY-API-10-GATEWAY | API-10 | GATEWAY | 401 | PUT `/users/me/password` | PLANNED | NOT_RUN |
| <a id="deny-api-11-guest"></a>DENY-API-11-GUEST | API-11 | GUEST | 401 | POST `/users/me/avatar` | PLANNED | NOT_RUN |
| <a id="deny-api-11-gateway"></a>DENY-API-11-GATEWAY | API-11 | GATEWAY | 401 | POST `/users/me/avatar` | PLANNED | NOT_RUN |
| <a id="deny-kyc-submit-guest"></a>DENY-KYC-SUBMIT-GUEST | KYC-SUBMIT | GUEST | 401 | POST `/verifications/request` | LIVE | NOT_RUN |
| <a id="deny-kyc-submit-fundraiser"></a>DENY-KYC-SUBMIT-FUNDRAISER | KYC-SUBMIT | FUNDRAISER | 400 | POST `/verifications/request` | LIVE | NOT_RUN |
| <a id="deny-kyc-submit-admin"></a>DENY-KYC-SUBMIT-ADMIN | KYC-SUBMIT | ADMIN | 400 | POST `/verifications/request` | LIVE | NOT_RUN |
| <a id="deny-kyc-submit-gateway"></a>DENY-KYC-SUBMIT-GATEWAY | KYC-SUBMIT | GATEWAY | 401 | POST `/verifications/request` | LIVE | NOT_RUN |
| <a id="deny-kyc-me-guest"></a>DENY-KYC-ME-GUEST | KYC-ME | GUEST | 401 | GET `/verifications/my-status` | LIVE | NOT_RUN |
| <a id="deny-kyc-me-gateway"></a>DENY-KYC-ME-GATEWAY | KYC-ME | GATEWAY | 401 | GET `/verifications/my-status` | LIVE | NOT_RUN |
| <a id="deny-kyc-list-guest"></a>DENY-KYC-LIST-GUEST | KYC-LIST | GUEST | 401 | GET `/verifications/pending` | LIVE | NOT_RUN |
| <a id="deny-kyc-list-user"></a>DENY-KYC-LIST-USER | KYC-LIST | USER | 403 | GET `/verifications/pending` | LIVE | NOT_RUN |
| <a id="deny-kyc-list-fundraiser"></a>DENY-KYC-LIST-FUNDRAISER | KYC-LIST | FUNDRAISER | 403 | GET `/verifications/pending` | LIVE | NOT_RUN |
| <a id="deny-kyc-list-gateway"></a>DENY-KYC-LIST-GATEWAY | KYC-LIST | GATEWAY | 401 | GET `/verifications/pending` | LIVE | NOT_RUN |
| <a id="deny-kyc-detail-guest"></a>DENY-KYC-DETAIL-GUEST | KYC-DETAIL | GUEST | 401 | GET `/verifications/{id}` | LIVE | NOT_RUN |
| <a id="deny-kyc-detail-user"></a>DENY-KYC-DETAIL-USER | KYC-DETAIL | USER | 403 | GET `/verifications/{id}` | LIVE | NOT_RUN |
| <a id="deny-kyc-detail-fundraiser"></a>DENY-KYC-DETAIL-FUNDRAISER | KYC-DETAIL | FUNDRAISER | 403 | GET `/verifications/{id}` | LIVE | NOT_RUN |
| <a id="deny-kyc-detail-gateway"></a>DENY-KYC-DETAIL-GATEWAY | KYC-DETAIL | GATEWAY | 401 | GET `/verifications/{id}` | LIVE | NOT_RUN |
| <a id="deny-kyc-review-guest"></a>DENY-KYC-REVIEW-GUEST | KYC-REVIEW | GUEST | 401 | PATCH `/verifications/{id}/review` | LIVE | NOT_RUN |
| <a id="deny-kyc-review-user"></a>DENY-KYC-REVIEW-USER | KYC-REVIEW | USER | 403 | PATCH `/verifications/{id}/review` | LIVE | NOT_RUN |
| <a id="deny-kyc-review-fundraiser"></a>DENY-KYC-REVIEW-FUNDRAISER | KYC-REVIEW | FUNDRAISER | 403 | PATCH `/verifications/{id}/review` | LIVE | NOT_RUN |
| <a id="deny-kyc-review-gateway"></a>DENY-KYC-REVIEW-GATEWAY | KYC-REVIEW | GATEWAY | 401 | PATCH `/verifications/{id}/review` | LIVE | NOT_RUN |
| <a id="deny-api-20-guest"></a>DENY-API-20-GUEST | API-20 | GUEST | 401 | GET `/campaigns/my-campaigns` | PLANNED | NOT_RUN |
| <a id="deny-api-20-user"></a>DENY-API-20-USER | API-20 | USER | 403 | GET `/campaigns/my-campaigns` | PLANNED | NOT_RUN |
| <a id="deny-api-20-admin"></a>DENY-API-20-ADMIN | API-20 | ADMIN | 403 | GET `/campaigns/my-campaigns` | PLANNED | NOT_RUN |
| <a id="deny-api-20-gateway"></a>DENY-API-20-GATEWAY | API-20 | GATEWAY | 401 | GET `/campaigns/my-campaigns` | PLANNED | NOT_RUN |
| <a id="deny-api-21-guest"></a>DENY-API-21-GUEST | API-21 | GUEST | 401 | POST `/campaigns` | PLANNED | NOT_RUN |
| <a id="deny-api-21-user"></a>DENY-API-21-USER | API-21 | USER | 403 | POST `/campaigns` | PLANNED | NOT_RUN |
| <a id="deny-api-21-admin"></a>DENY-API-21-ADMIN | API-21 | ADMIN | 403 | POST `/campaigns` | PLANNED | NOT_RUN |
| <a id="deny-api-21-gateway"></a>DENY-API-21-GATEWAY | API-21 | GATEWAY | 401 | POST `/campaigns` | PLANNED | NOT_RUN |
| <a id="deny-api-22-guest"></a>DENY-API-22-GUEST | API-22 | GUEST | 401 | PUT `/campaigns/{id}` | PLANNED | NOT_RUN |
| <a id="deny-api-22-user"></a>DENY-API-22-USER | API-22 | USER | 403 | PUT `/campaigns/{id}` | PLANNED | NOT_RUN |
| <a id="deny-api-22-admin"></a>DENY-API-22-ADMIN | API-22 | ADMIN | 403 | PUT `/campaigns/{id}` | PLANNED | NOT_RUN |
| <a id="deny-api-22-gateway"></a>DENY-API-22-GATEWAY | API-22 | GATEWAY | 401 | PUT `/campaigns/{id}` | PLANNED | NOT_RUN |
| <a id="deny-api-23-guest"></a>DENY-API-23-GUEST | API-23 | GUEST | 401 | PATCH `/campaigns/{id}/submit` | PLANNED | NOT_RUN |
| <a id="deny-api-23-user"></a>DENY-API-23-USER | API-23 | USER | 403 | PATCH `/campaigns/{id}/submit` | PLANNED | NOT_RUN |
| <a id="deny-api-23-admin"></a>DENY-API-23-ADMIN | API-23 | ADMIN | 403 | PATCH `/campaigns/{id}/submit` | PLANNED | NOT_RUN |
| <a id="deny-api-23-gateway"></a>DENY-API-23-GATEWAY | API-23 | GATEWAY | 401 | PATCH `/campaigns/{id}/submit` | PLANNED | NOT_RUN |
| <a id="deny-api-24-guest"></a>DENY-API-24-GUEST | API-24 | GUEST | 401 | POST `/campaigns/{id}/media` | PLANNED | NOT_RUN |
| <a id="deny-api-24-user"></a>DENY-API-24-USER | API-24 | USER | 403 | POST `/campaigns/{id}/media` | PLANNED | NOT_RUN |
| <a id="deny-api-24-admin"></a>DENY-API-24-ADMIN | API-24 | ADMIN | 403 | POST `/campaigns/{id}/media` | PLANNED | NOT_RUN |
| <a id="deny-api-24-gateway"></a>DENY-API-24-GATEWAY | API-24 | GATEWAY | 401 | POST `/campaigns/{id}/media` | PLANNED | NOT_RUN |
| <a id="deny-api-25-guest"></a>DENY-API-25-GUEST | API-25 | GUEST | 401 | POST `/campaigns/{id}/updates` | PLANNED | NOT_RUN |
| <a id="deny-api-25-user"></a>DENY-API-25-USER | API-25 | USER | 403 | POST `/campaigns/{id}/updates` | PLANNED | NOT_RUN |
| <a id="deny-api-25-admin"></a>DENY-API-25-ADMIN | API-25 | ADMIN | 403 | POST `/campaigns/{id}/updates` | PLANNED | NOT_RUN |
| <a id="deny-api-25-gateway"></a>DENY-API-25-GATEWAY | API-25 | GATEWAY | 401 | POST `/campaigns/{id}/updates` | PLANNED | NOT_RUN |
| <a id="deny-api-27-guest"></a>DENY-API-27-GUEST | API-27 | GUEST | 401 | POST `/donations` | PLANNED | NOT_RUN |
| <a id="deny-api-27-gateway"></a>DENY-API-27-GATEWAY | API-27 | GATEWAY | 401 | POST `/donations` | PLANNED | NOT_RUN |
| <a id="deny-api-28-guest"></a>DENY-API-28-GUEST | API-28 | GUEST | 401 | POST `/payments/create-url` | PLANNED | NOT_RUN |
| <a id="deny-api-28-gateway"></a>DENY-API-28-GATEWAY | API-28 | GATEWAY | 401 | POST `/payments/create-url` | PLANNED | NOT_RUN |
| <a id="deny-pay-webhook-guest"></a>DENY-PAY-WEBHOOK-GUEST | PAY-WEBHOOK | GUEST | 403 | POST `/payments/webhook` | PLANNED | NOT_RUN |
| <a id="deny-pay-webhook-user"></a>DENY-PAY-WEBHOOK-USER | PAY-WEBHOOK | USER | 403 | POST `/payments/webhook` | PLANNED | NOT_RUN |
| <a id="deny-pay-webhook-fundraiser"></a>DENY-PAY-WEBHOOK-FUNDRAISER | PAY-WEBHOOK | FUNDRAISER | 403 | POST `/payments/webhook` | PLANNED | NOT_RUN |
| <a id="deny-pay-webhook-admin"></a>DENY-PAY-WEBHOOK-ADMIN | PAY-WEBHOOK | ADMIN | 403 | POST `/payments/webhook` | PLANNED | NOT_RUN |
| <a id="deny-api-31-guest"></a>DENY-API-31-GUEST | API-31 | GUEST | 401 | GET `/donations/my-history` | PLANNED | NOT_RUN |
| <a id="deny-api-31-gateway"></a>DENY-API-31-GATEWAY | API-31 | GATEWAY | 401 | GET `/donations/my-history` | PLANNED | NOT_RUN |
| <a id="deny-api-32-guest"></a>DENY-API-32-GUEST | API-32 | GUEST | 401 | GET `/donations/{id}/receipt` | PLANNED | NOT_RUN |
| <a id="deny-api-32-gateway"></a>DENY-API-32-GATEWAY | API-32 | GATEWAY | 401 | GET `/donations/{id}/receipt` | PLANNED | NOT_RUN |
| <a id="deny-api-35-guest"></a>DENY-API-35-GUEST | API-35 | GUEST | 401 | POST `/disbursements` | PLANNED | NOT_RUN |
| <a id="deny-api-35-user"></a>DENY-API-35-USER | API-35 | USER | 403 | POST `/disbursements` | PLANNED | NOT_RUN |
| <a id="deny-api-35-gateway"></a>DENY-API-35-GATEWAY | API-35 | GATEWAY | 401 | POST `/disbursements` | PLANNED | NOT_RUN |
| <a id="deny-api-38-guest"></a>DENY-API-38-GUEST | API-38 | GUEST | 401 | POST `/campaigns/{id}/comments` | PLANNED | NOT_RUN |
| <a id="deny-api-38-gateway"></a>DENY-API-38-GATEWAY | API-38 | GATEWAY | 401 | POST `/campaigns/{id}/comments` | PLANNED | NOT_RUN |
| <a id="deny-api-39-guest"></a>DENY-API-39-GUEST | API-39 | GUEST | 401 | POST `/users/{id}/follow` | DEFERRED | NOT_RUN |
| <a id="deny-api-39-gateway"></a>DENY-API-39-GATEWAY | API-39 | GATEWAY | 401 | POST `/users/{id}/follow` | DEFERRED | NOT_RUN |
| <a id="deny-api-41-guest"></a>DENY-API-41-GUEST | API-41 | GUEST | 401 | POST `/communities` | DEFERRED | NOT_RUN |
| <a id="deny-api-41-gateway"></a>DENY-API-41-GATEWAY | API-41 | GATEWAY | 401 | POST `/communities` | DEFERRED | NOT_RUN |
| <a id="deny-api-42-guest"></a>DENY-API-42-GUEST | API-42 | GUEST | 401 | POST `/communities/{id}/join` | DEFERRED | NOT_RUN |
| <a id="deny-api-42-gateway"></a>DENY-API-42-GATEWAY | API-42 | GATEWAY | 401 | POST `/communities/{id}/join` | DEFERRED | NOT_RUN |
| <a id="deny-api-44-guest"></a>DENY-API-44-GUEST | API-44 | GUEST | 401 | POST `/communities/{id}/posts` | DEFERRED | NOT_RUN |
| <a id="deny-api-44-gateway"></a>DENY-API-44-GATEWAY | API-44 | GATEWAY | 401 | POST `/communities/{id}/posts` | DEFERRED | NOT_RUN |
| <a id="deny-api-45-guest"></a>DENY-API-45-GUEST | API-45 | GUEST | 401 | GET `/admin/users` | PLANNED | NOT_RUN |
| <a id="deny-api-45-user"></a>DENY-API-45-USER | API-45 | USER | 403 | GET `/admin/users` | PLANNED | NOT_RUN |
| <a id="deny-api-45-fundraiser"></a>DENY-API-45-FUNDRAISER | API-45 | FUNDRAISER | 403 | GET `/admin/users` | PLANNED | NOT_RUN |
| <a id="deny-api-45-gateway"></a>DENY-API-45-GATEWAY | API-45 | GATEWAY | 401 | GET `/admin/users` | PLANNED | NOT_RUN |
| <a id="deny-api-46-guest"></a>DENY-API-46-GUEST | API-46 | GUEST | 401 | PATCH `/admin/users/{id}/status` | PLANNED | NOT_RUN |
| <a id="deny-api-46-user"></a>DENY-API-46-USER | API-46 | USER | 403 | PATCH `/admin/users/{id}/status` | PLANNED | NOT_RUN |
| <a id="deny-api-46-fundraiser"></a>DENY-API-46-FUNDRAISER | API-46 | FUNDRAISER | 403 | PATCH `/admin/users/{id}/status` | PLANNED | NOT_RUN |
| <a id="deny-api-46-gateway"></a>DENY-API-46-GATEWAY | API-46 | GATEWAY | 401 | PATCH `/admin/users/{id}/status` | PLANNED | NOT_RUN |
| <a id="deny-api-47-guest"></a>DENY-API-47-GUEST | API-47 | GUEST | 401 | PATCH `/admin/users/{id}/role` | PLANNED | NOT_RUN |
| <a id="deny-api-47-user"></a>DENY-API-47-USER | API-47 | USER | 403 | PATCH `/admin/users/{id}/role` | PLANNED | NOT_RUN |
| <a id="deny-api-47-fundraiser"></a>DENY-API-47-FUNDRAISER | API-47 | FUNDRAISER | 403 | PATCH `/admin/users/{id}/role` | PLANNED | NOT_RUN |
| <a id="deny-api-47-gateway"></a>DENY-API-47-GATEWAY | API-47 | GATEWAY | 401 | PATCH `/admin/users/{id}/role` | PLANNED | NOT_RUN |
| <a id="deny-api-48-guest"></a>DENY-API-48-GUEST | API-48 | GUEST | 401 | PATCH `/admin/campaigns/{id}/status` | PLANNED | NOT_RUN |
| <a id="deny-api-48-user"></a>DENY-API-48-USER | API-48 | USER | 403 | PATCH `/admin/campaigns/{id}/status` | PLANNED | NOT_RUN |
| <a id="deny-api-48-fundraiser"></a>DENY-API-48-FUNDRAISER | API-48 | FUNDRAISER | 403 | PATCH `/admin/campaigns/{id}/status` | PLANNED | NOT_RUN |
| <a id="deny-api-48-gateway"></a>DENY-API-48-GATEWAY | API-48 | GATEWAY | 401 | PATCH `/admin/campaigns/{id}/status` | PLANNED | NOT_RUN |
| <a id="deny-api-49-guest"></a>DENY-API-49-GUEST | API-49 | GUEST | 401 | POST `/reports` | PLANNED | NOT_RUN |
| <a id="deny-api-49-gateway"></a>DENY-API-49-GATEWAY | API-49 | GATEWAY | 401 | POST `/reports` | PLANNED | NOT_RUN |
| <a id="deny-api-50-guest"></a>DENY-API-50-GUEST | API-50 | GUEST | 401 | GET `/admin/reports` | PLANNED | NOT_RUN |
| <a id="deny-api-50-user"></a>DENY-API-50-USER | API-50 | USER | 403 | GET `/admin/reports` | PLANNED | NOT_RUN |
| <a id="deny-api-50-fundraiser"></a>DENY-API-50-FUNDRAISER | API-50 | FUNDRAISER | 403 | GET `/admin/reports` | PLANNED | NOT_RUN |
| <a id="deny-api-50-gateway"></a>DENY-API-50-GATEWAY | API-50 | GATEWAY | 401 | GET `/admin/reports` | PLANNED | NOT_RUN |
| <a id="deny-api-51-guest"></a>DENY-API-51-GUEST | API-51 | GUEST | 401 | PATCH `/admin/reports/{id}/resolve` | PLANNED | NOT_RUN |
| <a id="deny-api-51-user"></a>DENY-API-51-USER | API-51 | USER | 403 | PATCH `/admin/reports/{id}/resolve` | PLANNED | NOT_RUN |
| <a id="deny-api-51-fundraiser"></a>DENY-API-51-FUNDRAISER | API-51 | FUNDRAISER | 403 | PATCH `/admin/reports/{id}/resolve` | PLANNED | NOT_RUN |
| <a id="deny-api-51-gateway"></a>DENY-API-51-GATEWAY | API-51 | GATEWAY | 401 | PATCH `/admin/reports/{id}/resolve` | PLANNED | NOT_RUN |
| <a id="deny-api-52-guest"></a>DENY-API-52-GUEST | API-52 | GUEST | 401 | POST `/admin/categories` | PLANNED | NOT_RUN |
| <a id="deny-api-52-user"></a>DENY-API-52-USER | API-52 | USER | 403 | POST `/admin/categories` | PLANNED | NOT_RUN |
| <a id="deny-api-52-fundraiser"></a>DENY-API-52-FUNDRAISER | API-52 | FUNDRAISER | 403 | POST `/admin/categories` | PLANNED | NOT_RUN |
| <a id="deny-api-52-gateway"></a>DENY-API-52-GATEWAY | API-52 | GATEWAY | 401 | POST `/admin/categories` | PLANNED | NOT_RUN |
| <a id="deny-api-53-guest"></a>DENY-API-53-GUEST | API-53 | GUEST | 401 | PUT `/admin/categories/{id}` | PLANNED | NOT_RUN |
| <a id="deny-api-53-user"></a>DENY-API-53-USER | API-53 | USER | 403 | PUT `/admin/categories/{id}` | PLANNED | NOT_RUN |
| <a id="deny-api-53-fundraiser"></a>DENY-API-53-FUNDRAISER | API-53 | FUNDRAISER | 403 | PUT `/admin/categories/{id}` | PLANNED | NOT_RUN |
| <a id="deny-api-53-gateway"></a>DENY-API-53-GATEWAY | API-53 | GATEWAY | 401 | PUT `/admin/categories/{id}` | PLANNED | NOT_RUN |
| <a id="deny-api-54-guest"></a>DENY-API-54-GUEST | API-54 | GUEST | 401 | DELETE `/admin/categories/{id}` | PLANNED | NOT_RUN |
| <a id="deny-api-54-user"></a>DENY-API-54-USER | API-54 | USER | 403 | DELETE `/admin/categories/{id}` | PLANNED | NOT_RUN |
| <a id="deny-api-54-fundraiser"></a>DENY-API-54-FUNDRAISER | API-54 | FUNDRAISER | 403 | DELETE `/admin/categories/{id}` | PLANNED | NOT_RUN |
| <a id="deny-api-54-gateway"></a>DENY-API-54-GATEWAY | API-54 | GATEWAY | 401 | DELETE `/admin/categories/{id}` | PLANNED | NOT_RUN |
| <a id="deny-api-55-guest"></a>DENY-API-55-GUEST | API-55 | GUEST | 401 | GET `/admin/analytics/overview` | PLANNED | NOT_RUN |
| <a id="deny-api-55-user"></a>DENY-API-55-USER | API-55 | USER | 403 | GET `/admin/analytics/overview` | PLANNED | NOT_RUN |
| <a id="deny-api-55-fundraiser"></a>DENY-API-55-FUNDRAISER | API-55 | FUNDRAISER | 403 | GET `/admin/analytics/overview` | PLANNED | NOT_RUN |
| <a id="deny-api-55-gateway"></a>DENY-API-55-GATEWAY | API-55 | GATEWAY | 401 | GET `/admin/analytics/overview` | PLANNED | NOT_RUN |
| <a id="deny-api-56-guest"></a>DENY-API-56-GUEST | API-56 | GUEST | 401 | GET `/admin/audit-logs` | PLANNED | NOT_RUN |
| <a id="deny-api-56-user"></a>DENY-API-56-USER | API-56 | USER | 403 | GET `/admin/audit-logs` | PLANNED | NOT_RUN |
| <a id="deny-api-56-fundraiser"></a>DENY-API-56-FUNDRAISER | API-56 | FUNDRAISER | 403 | GET `/admin/audit-logs` | PLANNED | NOT_RUN |
| <a id="deny-api-56-gateway"></a>DENY-API-56-GATEWAY | API-56 | GATEWAY | 401 | GET `/admin/audit-logs` | PLANNED | NOT_RUN |
| <a id="deny-api-57-guest"></a>DENY-API-57-GUEST | API-57 | GUEST | 401 | GET `/notifications` | PLANNED | NOT_RUN |
| <a id="deny-api-57-gateway"></a>DENY-API-57-GATEWAY | API-57 | GATEWAY | 401 | GET `/notifications` | PLANNED | NOT_RUN |
| <a id="deny-api-58-guest"></a>DENY-API-58-GUEST | API-58 | GUEST | 401 | PATCH `/notifications/{id}/read` | PLANNED | NOT_RUN |
| <a id="deny-api-58-gateway"></a>DENY-API-58-GATEWAY | API-58 | GATEWAY | 401 | PATCH `/notifications/{id}/read` | PLANNED | NOT_RUN |
| <a id="deny-api-59-guest"></a>DENY-API-59-GUEST | API-59 | GUEST | 401 | PATCH `/notifications/read-all` | PLANNED | NOT_RUN |
| <a id="deny-api-59-gateway"></a>DENY-API-59-GATEWAY | API-59 | GATEWAY | 401 | PATCH `/notifications/read-all` | PLANNED | NOT_RUN |
| <a id="deny-kyc-supplement-guest"></a>DENY-KYC-SUPPLEMENT-GUEST | KYC-SUPPLEMENT | GUEST | 401 | PATCH `/verifications/{id}/supplement` | PLANNED | NOT_RUN |
| <a id="deny-kyc-supplement-user"></a>DENY-KYC-SUPPLEMENT-USER | KYC-SUPPLEMENT | USER | 403 | PATCH `/verifications/{id}/supplement` | PLANNED | NOT_RUN |
| <a id="deny-kyc-supplement-fundraiser"></a>DENY-KYC-SUPPLEMENT-FUNDRAISER | KYC-SUPPLEMENT | FUNDRAISER | 403 | PATCH `/verifications/{id}/supplement` | PLANNED | NOT_RUN |
| <a id="deny-kyc-supplement-gateway"></a>DENY-KYC-SUPPLEMENT-GATEWAY | KYC-SUPPLEMENT | GATEWAY | 401 | PATCH `/verifications/{id}/supplement` | PLANNED | NOT_RUN |
| <a id="deny-campaign-revision-guest"></a>DENY-CAMPAIGN-REVISION-GUEST | CAMPAIGN-REVISION | GUEST | 401 | PATCH `/admin/campaigns/{id}/revision` | PLANNED | NOT_RUN |
| <a id="deny-campaign-revision-user"></a>DENY-CAMPAIGN-REVISION-USER | CAMPAIGN-REVISION | USER | 403 | PATCH `/admin/campaigns/{id}/revision` | PLANNED | NOT_RUN |
| <a id="deny-campaign-revision-fundraiser"></a>DENY-CAMPAIGN-REVISION-FUNDRAISER | CAMPAIGN-REVISION | FUNDRAISER | 403 | PATCH `/admin/campaigns/{id}/revision` | PLANNED | NOT_RUN |
| <a id="deny-campaign-revision-gateway"></a>DENY-CAMPAIGN-REVISION-GATEWAY | CAMPAIGN-REVISION | GATEWAY | 401 | PATCH `/admin/campaigns/{id}/revision` | PLANNED | NOT_RUN |
| <a id="deny-pay-status-guest"></a>DENY-PAY-STATUS-GUEST | PAY-STATUS | GUEST | 401 | GET `/donations/{id}/status` | PLANNED | NOT_RUN |
| <a id="deny-pay-status-gateway"></a>DENY-PAY-STATUS-GATEWAY | PAY-STATUS | GATEWAY | 401 | GET `/donations/{id}/status` | PLANNED | NOT_RUN |
| <a id="deny-pay-admin-guest"></a>DENY-PAY-ADMIN-GUEST | PAY-ADMIN | GUEST | 401 | GET `/admin/donations` | PLANNED | NOT_RUN |
| <a id="deny-pay-admin-user"></a>DENY-PAY-ADMIN-USER | PAY-ADMIN | USER | 403 | GET `/admin/donations` | PLANNED | NOT_RUN |
| <a id="deny-pay-admin-fundraiser"></a>DENY-PAY-ADMIN-FUNDRAISER | PAY-ADMIN | FUNDRAISER | 403 | GET `/admin/donations` | PLANNED | NOT_RUN |
| <a id="deny-pay-admin-gateway"></a>DENY-PAY-ADMIN-GATEWAY | PAY-ADMIN | GATEWAY | 401 | GET `/admin/donations` | PLANNED | NOT_RUN |
| <a id="deny-expense-evidence-guest"></a>DENY-EXPENSE-EVIDENCE-GUEST | EXPENSE-EVIDENCE | GUEST | 401 | POST `/disbursements/{id}/attachments` | PLANNED | NOT_RUN |
| <a id="deny-expense-evidence-user"></a>DENY-EXPENSE-EVIDENCE-USER | EXPENSE-EVIDENCE | USER | 403 | POST `/disbursements/{id}/attachments` | PLANNED | NOT_RUN |
| <a id="deny-expense-evidence-admin"></a>DENY-EXPENSE-EVIDENCE-ADMIN | EXPENSE-EVIDENCE | ADMIN | 403 | POST `/disbursements/{id}/attachments` | PLANNED | NOT_RUN |
| <a id="deny-expense-evidence-gateway"></a>DENY-EXPENSE-EVIDENCE-GATEWAY | EXPENSE-EVIDENCE | GATEWAY | 401 | POST `/disbursements/{id}/attachments` | PLANNED | NOT_RUN |
| <a id="deny-social-like-guest"></a>DENY-SOCIAL-LIKE-GUEST | SOCIAL-LIKE | GUEST | 401 | POST `/comments/{id}/likes` | DEFERRED | NOT_RUN |
| <a id="deny-social-like-gateway"></a>DENY-SOCIAL-LIKE-GATEWAY | SOCIAL-LIKE | GATEWAY | 401 | POST `/comments/{id}/likes` | DEFERRED | NOT_RUN |

## Quy trình áp dụng cho từng ca

1. Ghi thời gian, phiên bản mã nguồn và môi trường. Đảm bảo tài khoản/tài nguyên mẫu tồn tại.
2. Chụp trạng thái tài nguyên trước yêu cầu; lấy token đúng actor (khách không gửi token).
3. Gửi đúng method/path trong bảng; dùng body hợp lệ từ OpenAPI đối với API LIVE, hoặc hợp đồng API đã chốt đối với API PLANNED.
4. Đối chiếu mã HTTP và JSON lỗi; đảm bảo response không lộ dữ liệu riêng tư.
5. Kiểm tra trạng thái tài nguyên không đổi; lưu request/response đã che token và thông tin cá nhân.
6. Ghi PASS/FAIL/BLOCKED vào báo cáo thực thi. PLANNED/DEFERRED chưa triển khai phải ghi BLOCKED, không chạy để lấy 404 rồi ghi PASS.

Số ca dự kiến: 149. JSON kèm theo chứa tiền điều kiện, hành động và hậu điều kiện của từng ca để truy vết tự động.
