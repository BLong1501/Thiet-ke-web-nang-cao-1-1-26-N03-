const bcrypt = require('bcrypt');
const mariadb = require('mariadb');

async function main() {
  const hash = await bcrypt.hash('Password@123', 10);
  console.log('Valid hash for Password@123:', hash);

  const conn = await mariadb.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'dbuser',
    password: 'dbpassword',
    database: 'crowdfunding_db',
  });

  const emails = [
    'admin@crowdfunding.vn',
    'fundraiser@gmail.com',
    'donor1@gmail.com',
    'donor2@gmail.com',
    'pending_kyc@gmail.com',
  ];

  const result = await conn.query(
    'UPDATE users SET password_hash = ? WHERE email IN (?, ?, ?, ?, ?)',
    [hash, ...emails]
  );
  console.log('Updated rows:', result.affectedRows);

  const rows = await conn.query(
    'SELECT email, password_hash, role FROM users WHERE email IN (?, ?, ?, ?, ?)',
    emails
  );
  console.log('Current users in DB:');
  for (const r of rows) {
    const ok = await bcrypt.compare('Password@123', r.password_hash);
    console.log(`- ${r.email} (${r.role}): match Password@123 = ${ok}`);
  }

  await conn.end();
}

main().catch(console.error);
