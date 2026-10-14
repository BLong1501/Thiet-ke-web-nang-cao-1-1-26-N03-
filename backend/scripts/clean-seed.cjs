const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const mariadb = require('mariadb');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function cleanSeed() {
  const connectionUrl = process.env.DATABASE_URL;
  if (!connectionUrl) {
    throw new Error('DATABASE_URL is not defined in .env');
  }

  console.log('Connecting to Aiven Cloud database...');
  const url = new URL(connectionUrl);
  const host = url.hostname;
  const port = parseInt(url.port || '3306', 10);
  const user = url.username;
  const password = url.password;
  const database = url.pathname.replace(/^\//, '');
  const sslRequired = connectionUrl.includes('ssl-mode=REQUIRED') || url.searchParams.get('ssl-mode') === 'REQUIRED';

  const connConfig = {
    host,
    port,
    user,
    password,
    database,
    connectTimeout: 30000,
    socketTimeout: 30000,
  };

  if (sslRequired) {
    connConfig.ssl = { rejectUnauthorized: false };
  }

  const conn = await mariadb.createConnection(connConfig);
  console.log(` Successfully connected to ${host}:${port}/${database}`);

  console.log('Clearing all existing tables (cleaning garbage data)...');
  await conn.query('SET FOREIGN_KEY_CHECKS = 0;');

  const tables = [
    'notifications',
    'reports',
    'audit_logs',
    'comments',
    'post_likes',
    'community_posts',
    'community_members',
    'communities',
    'disbursements',
    'ledger_entries',
    'donations',
    'campaign_updates',
    'campaign_media',
    'campaigns',
    'verifications',
    'users',
    'categories',
  ];

  for (const table of tables) {
    try {
      await conn.query(`TRUNCATE TABLE \`${table}\`;`);
      console.log(`  ✓ Cleared table: ${table}`);
    } catch (e) {
      console.log(`  - Table ${table} skipped or not created yet (${e.message})`);
    }
  }

  await conn.query('SET FOREIGN_KEY_CHECKS = 1;');

  console.log('Seeding clean standard data for team...');

  // 1. Categories chuẩn
  console.log('1. Inserting standard categories...');
  await conn.query(`
    INSERT INTO \`categories\` (\`id\`, \`name\`, \`slug\`, \`description\`, \`icon_url\`, \`is_active\`)
    VALUES 
      ('b0000000-0000-0000-0000-000000000001', 'Y tế & Cứu trợ bệnh nhân', 'y-te-cuu-tro-benh-nhan', 'Hỗ trợ chi phí viện phí, mổ tim, điều trị bệnh hiểm nghèo', 'medical_services', TRUE),
      ('b0000000-0000-0000-0000-000000000002', 'Giáo dục & Học sinh nghèo', 'giao-duc-hoc-sinh-ngheo', 'Trao học bổng, xây trường vùng cao, tặng sách vở và thiết bị học tập', 'school', TRUE),
      ('b0000000-0000-0000-0000-000000000003', 'Cứu trợ Thiên tai & Khẩn cấp', 'cuu-tro-thien-tai-khan-cap', 'Hỗ trợ đồng bào lũ lụt, sạt lở, bão gió tái thiết cuộc sống', 'flood', TRUE),
      ('b0000000-0000-0000-0000-000000000004', 'Trẻ em & Hoàn cảnh khó khăn', 'tre-em-hoan-canh-kho-khan', 'Chăm lo bữa ăn dinh dưỡng, áo ấm, bảo trợ trẻ em cơ nhỡ', 'child_care', TRUE),
      ('b0000000-0000-0000-0000-000000000005', 'Bảo vệ Môi trường & Động vật', 'moi-truong-dong-vat', 'Trồng rừng, dọn rác bãi biển, cứu hộ chó mèo bị bỏ rơi', 'eco', TRUE);
  `);

  // 2. Hash mật khẩu chung: Password@123
  const hash = await bcrypt.hash('Password@123', 10);

  // 3. 5 Tài khoản phân quyền chuẩn cho cả nhóm
  console.log('2. Inserting clean standard accounts (Password@123)...');
  await conn.query(`
    INSERT INTO \`users\` (
      \`id\`, \`email\`, \`password_hash\`, \`full_name\`, \`phone_number\`, \`avatar_url\`, \`bio\`, \`role\`, \`status\`, \`is_email_verified\`, \`email_verified_at\`, \`created_at\`, \`updated_at\`
    ) VALUES 
      -- Admin tối cao
      ('a0000000-0000-0000-0000-000000000001', 'admin@crowdfunding.vn', ?, 'Quản trị viên Hệ thống (ADMIN1)', '0901234567', 'https://i.pravatar.cc/300?img=1', 'Quản trị viên phụ trách xét duyệt và an toàn quỹ', 'ADMIN', 'ACTIVE', TRUE, NOW(), NOW(), NOW()),
      
      -- Người gây quỹ đã duyệt KYC
      ('u0000000-0000-0000-0000-000000000002', 'fundraiser@gmail.com', ?, 'Lê Hoàng Nam (Người gây quỹ)', '0912345678', 'https://i.pravatar.cc/300?img=12', 'Trưởng nhóm thiện nguyện Cầu Vồng Yêu Thương', 'FUNDRAISER', 'ACTIVE', TRUE, NOW(), NOW(), NOW()),
      
      -- Người dùng đã nộp hồ sơ KYC đang chờ duyệt
      ('u0000000-0000-0000-0000-000000000003', 'pending_kyc@gmail.com', ?, 'Phạm Thị Cúc (Chờ duyệt KYC)', '0987654321', 'https://i.pravatar.cc/300?img=5', 'Cần gây quỹ hỗ trợ viện phí cho cháu gái', 'USER', 'ACTIVE', TRUE, NOW(), NOW(), NOW()),
      
      -- Nhà hảo tâm 1
      ('u0000000-0000-0000-0000-000000000004', 'donor1@gmail.com', ?, 'Nguyễn Văn An (Nhà hảo tâm 1)', '0933333333', 'https://i.pravatar.cc/300?img=60', 'Ủng hộ các hoàn cảnh trẻ em vùng cao', 'USER', 'ACTIVE', TRUE, NOW(), NOW(), NOW()),
      
      -- Nhà hảo tâm 2
      ('u0000000-0000-0000-0000-000000000005', 'donor2@gmail.com', ?, 'Trần Thị Bình (Nhà hảo tâm 2)', '0944444444', 'https://i.pravatar.cc/300?img=47', 'Lan tỏa tinh thần tương thân tương ái', 'USER', 'ACTIVE', TRUE, NOW(), NOW(), NOW());
  `, [hash, hash, hash, hash, hash]);

  // 4. KYC records mẫu để Admin có dữ liệu test duyệt
  console.log('3. Inserting clean KYC records...');
  await conn.query(`
    INSERT INTO \`verifications\` (
      \`id\`, \`user_id\`, \`id_card_number\`, \`card_issued_date\`, \`card_issued_place\`, \`front_card_image\`, \`back_card_image\`, \`portrait_image\`, \`supporting_documents\`, \`status\`, \`reviewed_by\`, \`reviewed_at\`, \`created_at\`, \`updated_at\`
    ) VALUES
      -- Hồ sơ đã duyệt cho fundraiser
      ('v0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000002', '001095012345', '2021-05-15', 'Cục Cảnh sát QLHC về TTXH', 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f', 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb', JSON_ARRAY('https://images.unsplash.com/photo-1584515979956-d9f6e5d09982'), 'APPROVED', 'a0000000-0000-0000-0000-000000000001', NOW(), NOW(), NOW()),

      -- Hồ sơ đang chờ duyệt để Admin test tính năng Duyệt / Từ chối
      ('v0000000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000003', '079198054321', '2022-08-20', 'Cục Cảnh sát QLHC về TTXH', 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f', 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d', JSON_ARRAY('https://images.unsplash.com/photo-1584515979956-d9f6e5d09982'), 'PENDING', NULL, NULL, NOW(), NOW());
  `);

  console.log('\n=============================================');
  console.log(' AIVEN DATABASE SYNCHRONIZED & CLEANED!');
  console.log(' Host:', host);
  console.log(' Database:', database);
  console.log(' Tất cả tài khoản có mật khẩu chung: Password@123');
  console.log('=============================================\n');

  await conn.end();
}

cleanSeed().catch((err) => {
  console.error('Error seeding clean data to Aiven:', err);
  process.exit(1);
});
