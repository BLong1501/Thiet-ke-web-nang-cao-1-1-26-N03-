SET NAMES utf8mb4;
UPDATE categories SET name = 'Y tế & Cứu trợ bệnh nhân' WHERE slug = 'y-te-cuu-tro-benh-nhan';
UPDATE categories SET name = 'Giáo dục & Học sinh nghèo' WHERE slug = 'giao-duc-hoc-sinh-ngheo';
UPDATE categories SET name = 'Cứu trợ thiên tai & Khẩn cấp' WHERE slug = 'cuu-tro-thien-tai-khan-cap';
UPDATE categories SET name = 'Trẻ em & Hoàn cảnh khó khăn' WHERE slug = 'tre-em-hoan-canh-kho-khan';
UPDATE categories SET name = 'Bảo vệ môi trường & Động vật' WHERE slug = 'moi-truong-dong-vat';

DELETE FROM ledger_entries WHERE id LIKE 'demo-l%';
DELETE FROM donations WHERE id LIKE 'demo-d%';
DELETE FROM campaigns WHERE id LIKE 'demo-c%';

INSERT INTO campaigns (
  id, fundraiser_id, category_id, title, slug, short_description, story, cover_image_url,
  target_amount, current_amount, donor_count, start_date, end_date, status,
  bank_account_number, bank_name, bank_account_name
)
SELECT 'demo-c1', u.id, c.id,
  'Chung tay phẫu thuật tim cho bé Bắp 3 tuổi',
  'phau-thuat-tim-be-bap',
  'Bé Bắp mắc thông liên thất nặng và cần mổ gấp tại Viện Tim TP.HCM.',
  'Gia đình bé Bắp ở vùng sâu, bố mẹ làm nông không đủ chi phí phẫu thuật. Mỗi đóng góp được ghi vào sổ cái và cập nhật tiến độ công khai.',
  'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=1200&q=80',
  100000000, 35000000, 3, DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_ADD(NOW(), INTERVAL 25 DAY), 'ACTIVE',
  '19034567890123', 'Techcombank', 'LE HOANG NAM'
FROM users u
JOIN categories c ON c.slug = 'y-te-cuu-tro-benh-nhan'
WHERE u.email = 'fundraiser@gmail.com';

INSERT INTO campaigns (
  id, fundraiser_id, category_id, title, slug, short_description, story, cover_image_url,
  target_amount, current_amount, donor_count, start_date, end_date, status,
  bank_account_number, bank_name, bank_account_name
)
SELECT 'demo-c2', u.id, c.id,
  'Xây phòng học mới cho điểm trường Tà Mung',
  'xay-phong-hoc-ta-mung',
  'Mang mái trường ấm cho 60 em nhỏ ở Lai Châu trước mùa đông.',
  'Điểm trường cũ dột mỗi khi mưa. Dự án kêu gọi vật liệu và công thợ để dựng hai phòng học kiên cố.',
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80',
  80000000, 52000000, 4, DATE_SUB(NOW(), INTERVAL 20 DAY), DATE_ADD(NOW(), INTERVAL 40 DAY), 'ACTIVE',
  '19034567890123', 'Techcombank', 'LE HOANG NAM'
FROM users u
JOIN categories c ON c.slug = 'giao-duc-hoc-sinh-ngheo'
WHERE u.email = 'fundraiser@gmail.com';

INSERT INTO campaigns (
  id, fundraiser_id, category_id, title, slug, short_description, story, cover_image_url,
  target_amount, current_amount, donor_count, start_date, end_date, status,
  bank_account_number, bank_name, bank_account_name
)
SELECT 'demo-c3', u.id, c.id,
  'Hỗ trợ khẩn cấp cho bà con vùng lũ',
  'ho-tro-khan-cap-vung-lu',
  'Gạo, nước sạch và thuốc men cho các hộ vừa mất nhà sau mưa lũ.',
  'Nhóm tình nguyện đang phát thực phẩm tại chỗ. Chiến dịch sắp hết hạn và cần thêm nguồn lực trong những ngày tới.',
  'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1200&q=80',
  50000000, 12500000, 2, DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_ADD(NOW(), INTERVAL 6 DAY), 'ACTIVE',
  '19034567890123', 'Techcombank', 'LE HOANG NAM'
FROM users u
JOIN categories c ON c.slug = 'cuu-tro-thien-tai-khan-cap'
WHERE u.email = 'fundraiser@gmail.com';

INSERT INTO donations (id, campaign_id, donor_id, transaction_code, amount, donor_name, is_anonymous, payment_status, paid_at) VALUES
('demo-d1', 'demo-c1', 'u0000000-0000-0000-0000-000000000004', 'DEMO-C1-1', 20000000, 'Nguyễn Văn An', 0, 'SUCCESS', DATE_SUB(NOW(), INTERVAL 8 DAY)),
('demo-d2', 'demo-c1', 'u0000000-0000-0000-0000-000000000005', 'DEMO-C1-2', 10000000, 'Trần Thị Bình', 0, 'SUCCESS', DATE_SUB(NOW(), INTERVAL 5 DAY)),
('demo-d3', 'demo-c1', NULL, 'DEMO-C1-3', 5000000, 'Nhà hảo tâm ẩn danh', 1, 'SUCCESS', DATE_SUB(NOW(), INTERVAL 2 DAY)),
('demo-d4', 'demo-c2', 'u0000000-0000-0000-0000-000000000004', 'DEMO-C2-1', 20000000, 'Nguyễn Văn An', 0, 'SUCCESS', DATE_SUB(NOW(), INTERVAL 15 DAY)),
('demo-d5', 'demo-c2', 'u0000000-0000-0000-0000-000000000005', 'DEMO-C2-2', 15000000, 'Trần Thị Bình', 0, 'SUCCESS', DATE_SUB(NOW(), INTERVAL 10 DAY)),
('demo-d6', 'demo-c2', NULL, 'DEMO-C2-3', 12000000, 'Phạm Minh', 0, 'SUCCESS', DATE_SUB(NOW(), INTERVAL 6 DAY)),
('demo-d7', 'demo-c2', NULL, 'DEMO-C2-4', 5000000, 'Lê Thu', 0, 'SUCCESS', DATE_SUB(NOW(), INTERVAL 1 DAY)),
('demo-d8', 'demo-c3', 'u0000000-0000-0000-0000-000000000004', 'DEMO-C3-1', 8000000, 'Nguyễn Văn An', 0, 'SUCCESS', DATE_SUB(NOW(), INTERVAL 3 DAY)),
('demo-d9', 'demo-c3', NULL, 'DEMO-C3-2', 4500000, 'Nhà hảo tâm ẩn danh', 1, 'SUCCESS', DATE_SUB(NOW(), INTERVAL 1 DAY));

INSERT INTO ledger_entries (id, donation_id, kind, amount, created_at)
SELECT CONCAT('demo-l', SUBSTRING(id, 7)), id, 'RECEIPT', amount, paid_at
FROM donations
WHERE id LIKE 'demo-d%';
