# Danh mục điểm cuối đã tối ưu

**Nhóm 9 · Hệ thống Gây quỹ Cộng đồng · CĐ09**  
**Vai trò V3 — Phụ trách nghiệp vụ: Nguyễn Tuấn Anh**  
**Nhiệm vụ:** Khắc phục truy vấn lặp và áp dụng bộ nhớ đệm cho điểm cuối nặng nhất  
**Sản phẩm cá nhân:** Danh mục điểm cuối đã tối ưu  
**Ngày thực hiện:** 14/10/2026

---

## 1. Điểm cuối nặng nhất (trước khi tối ưu)

`GET /api/v1/campaigns` là điểm cuối đọc nhiều nhất (trang chủ, trang khám phá). Tầng nghiệp vụ `formatCampaign` gọi `ledgerEntry.groupBy` **một lần cho mỗi** chiến dịch trên trang.

Với `pageSize = 10`:

| Bước | Truy vấn | Số lần |
|------|----------|--------|
| Danh sách + đếm | `findMany` + `count` | 2 |
| Số dư sổ cái | `groupBy` theo `campaignId` | **10 (N+1)** |
| **Tổng** | | **12 truy vấn / request** |

`GET /api/v1/campaigns/:idOrSlug` cũng nặng vì JOIN media, updates, donations, disbursements; bị gọi lại mỗi lần mở trang chi tiết.

---

## 2. Kỹ thuật đã áp dụng

1. **Khắc phục truy vấn lặp (N+1):** một lần đọc sổ cái cho cả trang (`findLedgerNetByCampaignIds`, JOIN `donations` + cộng RECEIPT − REFUND theo `campaignId`). `formatCampaign` không còn chạm CSDL.
2. **Bộ nhớ đệm Redis** (fallback RAM nếu Redis chưa sẵn sàng) cho các GET công khai.
3. **Vô hiệu hóa theo tiền tố** `cache:campaigns:` khi tạo/sửa/duyệt chiến dịch, thêm media/nhật ký/giải ngân, xác nhận/hoàn tiền/hủy quyên góp, CRUD danh mục.
4. **Header kiểm chứng:** `X-Cache: HIT|MISS` và `Cache-Control: public, max-age=…`.

---

## 3. Danh mục điểm cuối đã tối ưu

| STT | Method | Điểm cuối | Quyền | Vấn đề cũ | Tối ưu | TTL | Header |
|:---:|:------:|-----------|-------|-----------|--------|----:|--------|
| 1 | `GET` | `/api/v1/campaigns` | Public | N+1 sổ cái (1 `groupBy` / chiến dịch) | 1 truy vấn sổ cái cho cả trang + cache theo bộ lọc | 60s | `X-Cache`, `Cache-Control` |
| 2 | `GET` | `/api/v1/campaigns/:idOrSlug` | Public | JOIN nặng, đọc lặp mỗi lần mở trang | Cache theo id và slug | 45s | `X-Cache`, `Cache-Control` |
| 3 | `GET` | `/api/v1/campaigns/categories` | Public | Đếm chiến dịch ACTIVE mỗi request | Cache danh mục | 300s | `X-Cache`, `Cache-Control` |
| 4 | `GET` | `/api/v1/donations/campaign/:campaignId` | Public | Đọc lại bảng ủng hộ mỗi lần xem chi tiết | Cache theo trang | 30s | `X-Cache`, `Cache-Control` |
| 5 | `GET` | `/api/v1/campaigns/my/list` | Fundraiser | N+1 sổ cái (không cache vì dữ liệu theo user) | Chỉ gộp sổ cái, **không** cache | — | — |
| 6 | `GET` | `/api/v1/campaigns/admin/pending` | Admin | N+1 sổ cái (không cache vì dữ liệu quản trị) | Chỉ gộp sổ cái, **không** cache | — | — |

Các điểm cuối ghi (POST/PUT/PATCH/DELETE chiến dịch, danh mục, xác nhận/hoàn tiền) **không** cache. Chúng gọi `invalidatePublicCampaignCache()` để lần GET tiếp theo là `MISS` với dữ liệu mới.

---

## 4. Khóa cache và phạm vi vô hiệu hóa

| Khóa | Nguồn |
|------|--------|
| `cache:campaigns:list:p=…:l=…:c=…:q=…:s=…:o=…` | Danh sách công khai, mỗi bộ lọc một khóa |
| `cache:campaigns:detail:{id\|slug}` | Chi tiết; ghi cả id lẫn slug để tránh miss kép |
| `cache:campaigns:categories:{active\|all}` | Danh mục |
| `cache:campaigns:donations:{campaignId}:p=…:l=…` | Bảng ủng hộ công khai |

Ghi dữ liệu → `DEL` theo tiền tố `cache:campaigns:` (SCAN, không dùng `KEYS`).

---

## 5. Số truy vấn sau tối ưu — `GET /api/v1/campaigns?limit=10`

| Tình huống | Số truy vấn CSDL |
|------------|-----------------:|
| Trước tối ưu | 12 |
| Cache MISS (sau tối ưu) | **3** (`findMany` + `count` + 1 đọc sổ cái gộp) |
| Cache HIT | **0** |

Cùng một payload, lần request thứ hai trả `X-Cache: HIT`.

---

## 6. Vị trí mã nguồn

| Thành phần | File |
|------------|------|
| Khóa, TTL, vô hiệu hóa, header | `backend/src/core/cache/campaign-cache.ts` |
| get/set/JSON/SCAN prefix | `backend/src/core/database/redis.ts` |
| Gộp sổ cái 1 lần đọc | `backend/src/modules/campaigns/campaign.repository.ts` → `findLedgerNetByCampaignIds` |
| Nghiệp vụ + cache đọc | `backend/src/modules/campaigns/campaign.service.ts` |
| Header `X-Cache` | `campaign.controller.ts`, `donation.controller.ts` |
| Invalidate khi ghi sổ cái | `backend/src/modules/donations/donation.service.ts` |
| Kiểm thử | `backend/tests/cache-endpoints.test.ts` |

---

## 7. Cách kiểm chứng nhanh

```bash
cd backend
npx tsx --test tests/cache-endpoints.test.ts
```

Thủ công (server đang chạy):

```http
GET /api/v1/campaigns?page=1&limit=10
```

Lần 1: `X-Cache: MISS`. Lần 2 ngay sau đó: `X-Cache: HIT`. Sau khi tạo/duyệt chiến dịch hoặc xác nhận quyên góp, lần GET tiếp theo lại `MISS`.

---

## 8. Ranh giới không cache

- `GET /campaigns/my/list`, `GET /campaigns/admin/pending`: dữ liệu theo phiên/vai trò.
- Mọi POST/PUT/PATCH/DELETE: nguồn sự thật vẫn là MySQL + sổ cái; Redis chỉ đệm bản đọc công khai.
- Số dư hiển thị vẫn lấy từ sổ cái (RECEIPT − REFUND), không tin `current_amount` như nguồn sự thật.
