/**
 * Chuyển đổi chuỗi tiếng Việt có dấu thành slug URL thân thiện
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Xóa dấu tiếng Việt
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9\s-]/g, "") // Xóa ký tự đặc biệt
    .trim()
    .replace(/\s+/g, "-") // Thay khoảng trắng bằng dấu gạch ngang
    .replace(/-+/g, "-"); // Tránh lặp dấu gạch ngang
}

/**
 * Sinh slug duy nhất kết hợp chuỗi ngẫu nhiên ngắn
 */
export function generateUniqueSlug(title: string): string {
  const base = slugify(title);
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return `${base}-${randomSuffix}`;
}
