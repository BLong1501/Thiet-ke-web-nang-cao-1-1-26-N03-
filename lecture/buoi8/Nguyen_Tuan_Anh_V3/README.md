# Buổi 08 — V3 Phụ trách nghiệp vụ

**Thành viên:** Nguyễn Tuấn Anh

## Sản phẩm cá nhân

1. [Danh mục điểm cuối đã tối ưu](./Danh_muc_diem_cuoi_da_toi_uu.md) — hết N+1 và cache Redis.
2. [Danh mục điểm cuối đã bổ sung kiểm quyền](./Danh_muc_diem_cuoi_da_bo_sung_kiem_quyen.md) — kiểm quyền trên đối tượng (IDOR) cho các điểm cuối còn thiếu.

## Kiểm thử

```bash
cd backend
npx tsx --test tests/cache-endpoints.test.ts tests/object-access.test.ts
```
