// Safe Buổi 03 deployment: refuses a non-empty schema, never drops tables.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const requireBackend = createRequire(path.join(root, 'backend/package.json'));
requireBackend('dotenv').config({ path: path.join(root, 'backend/.env'), quiet: true });
const mariadb = requireBackend('mariadb');
const bcrypt = requireBackend('bcrypt');
const command = process.argv[2];
const expectedTables = [...fs.readFileSync(path.join(root, 'database/schema.sql'), 'utf8').matchAll(/CREATE TABLE `([^`]+)`/g)].map(m => m[1]).sort();
const quote = name => '`' + name.replaceAll('`', '``') + '`';
async function main() {
  if (!['inspect', 'apply'].includes(command)) throw new Error('Use inspect or apply --confirm-empty.');
  if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL. Configure backend/.env locally; never paste credentials into reports.');
  const url = new URL(process.env.DATABASE_URL);
  if (!['mysql:', 'mariadb:'].includes(url.protocol)) throw new Error('Expected MySQL/MariaDB URL.');
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!database) throw new Error('Select a dedicated database in DATABASE_URL.');
  const local = ['localhost', '127.0.0.1', '[::1]', 'mysql'].includes(url.hostname);
  const options = {
    host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password), database, connectTimeout: 15000,
    bigIntAsNumber: true, multipleStatements: false,
    // Local disposable MySQL 8 uses caching_sha2_password without TLS.
    allowPublicKeyRetrieval: local
  };
  if (!local || process.env.DB_SSL === 'true') {
    options.ssl = { rejectUnauthorized: true };
    if (process.env.DB_SSL_CA) options.ssl.ca = fs.readFileSync(path.resolve(root, 'backend', process.env.DB_SSL_CA), 'utf8');
  }
  if (command === 'apply') {
    if (!process.argv.includes('--confirm-empty')) throw new Error('Apply requires --confirm-empty after selecting the dedicated empty schema.');
    if (!process.env.SEED_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD.length < 12) throw new Error('Set SEED_ADMIN_PASSWORD (at least 12 characters) locally before creating demo admin.');
  }
  let connection;
  try {
    connection = await mariadb.createConnection(options);
    const before = await connection.query("SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME", [database]);
    if (command === 'apply') {
      if (before.length) throw new Error('Refusing to apply: target schema is not empty. No data was deleted. Use inspect, or select a new empty schema.');
      const sql = fs.readFileSync(path.join(root, 'database/schema.sql'), 'utf8');
      for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) await connection.query(statement);
      // Data changes are transactional; MySQL DDL above auto-commits.
      await connection.beginTransaction();
      try {
        const categories = [['Sức khỏe','suc-khoe'],['Giáo dục','giao-duc'],['Thiên tai','thien-tai'],['Cộng đồng','cong-dong'],['Môi trường','moi-truong']];
        for (let i = 0; i < categories.length; i++) await connection.query('INSERT INTO categories (id, name, slug, description, is_active) VALUES (?, ?, ?, ?, ?)', [`b0000000-0000-0000-0000-${String(i+1).padStart(12,'0')}`, categories[i][0], categories[i][1], 'Dữ liệu mẫu Buổi 03', true]);
        const hash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD, 10);
        await connection.query('INSERT INTO users (id, email, password_hash, full_name, role, status, is_email_verified, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))', ['a0000000-0000-0000-0000-000000000001', process.env.SEED_ADMIN_EMAIL || 'admin@example.test', hash, 'Quản trị kiểm thử Buổi 03', 'ADMIN', 'ACTIVE', true]);
        await connection.commit();
      } catch (error) { await connection.rollback(); throw error; }
    }
    const tables = await connection.query("SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME", [database]);
    const names = tables.map(t => t.name);
    const missing = expectedTables.filter(t => !names.includes(t));
    const foreignKeys = await connection.query('SELECT TABLE_NAME AS childTable, COLUMN_NAME AS childColumn, REFERENCED_TABLE_NAME AS parentTable, REFERENCED_COLUMN_NAME AS parentColumn FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL', [database]);
    const violations = [];
    for (const fk of foreignKeys) {
      const query = `SELECT COUNT(*) AS count FROM ${quote(fk.childTable)} c LEFT JOIN ${quote(fk.parentTable)} p ON c.${quote(fk.childColumn)} = p.${quote(fk.parentColumn)} WHERE c.${quote(fk.childColumn)} IS NOT NULL AND p.${quote(fk.parentColumn)} IS NULL`;
      const [result] = await connection.query(query);
      if (Number(result.count)) violations.push({ table: fk.childTable, column: fk.childColumn, count: Number(result.count) });
    }
    const counts = {};
    for (const table of ['users','categories']) {
      if (names.includes(table)) counts[table] = Number((await connection.query(`SELECT COUNT(*) AS count FROM ${quote(table)}`))[0].count);
    }
    const report = { checkedAt: new Date().toISOString(), action: command, environment: local ? 'local' : 'remote-unverified-provider', tlsRequired: !local || process.env.DB_SSL === 'true',
      mysqlVersion: (await connection.query('SELECT VERSION() AS version'))[0].version,
      tables: names, expectedTableCount: expectedTables.length, missingTables: missing,
      foreignKeysChecked: foreignKeys.length, violations, seedCounts: counts,
      passed: missing.length === 0 && foreignKeys.length > 0 && violations.length === 0 && counts.users > 0 && counts.categories > 0,
      limitation: 'Remote host is not by itself proof of online deployment. Capture authenticated provider table list as Anh 02. This check does not prove two-machine execution or every column/index matches Prisma.' };
    const file = path.join(root, 'docs/evidence', `database-${command}-${Date.now()}.json`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(report, null, 2)+'\n');
    console.log(JSON.stringify(report, null, 2));
    console.log(`Saved ${path.relative(root, file)}`);
    if (!report.passed) process.exitCode = 1;
  } catch (error) {
    // Do not echo driver connection errors: they may contain usernames, hosts or credentials.
    if (error.code) console.error(`Database operation failed (${error.code}). Review connection/permissions locally. MySQL DDL is not rolled back; inspect partial tables before retrying.`);
    else console.error(error.message);
    process.exitCode = 1;
  } finally { if (connection) await connection.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
