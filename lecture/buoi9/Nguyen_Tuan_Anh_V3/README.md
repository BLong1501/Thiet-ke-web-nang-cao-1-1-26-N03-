# Buổi 08 — V3 Phụ trách nghiệp vụ

**Thành viên:** Nguyễn Tuấn Anh  
**Nhiệm vụ:** Khắc phục truy vấn lặp và áp dụng bộ nhớ đệm cho điểm cuối nặng nhất  
**Sản phẩm cá nhân:** [Danh mục điểm cuối đã tối ưu](./Danh_muc_diem_cuoi_da_toi_uu.md)

Điểm cuối nặng nhất là `GET /api/v1/campaigns`: trước đây mỗi phần tử trong trang gọi thêm một `groupBy` sổ cái (N+1). Đã gộp thành một lần đọc và đệm Redis (fallback RAM) cho các GET công khai. Kiểm thử: `npx tsx --test tests/cache-endpoints.test.ts` trong thư mục `backend`.
