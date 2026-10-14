// Creates a NEW local database; never drops or resets an existing database.
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, randomBytes } = require('node:crypto');
const { execFileSync, spawnSync } = require('node:child_process');
const mariadb = require('mariadb');
const bcrypt = require('bcrypt');
const root = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env'), quiet: true });
async function main() {
  const previous = new URL(process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1'].includes(previous.hostname)) throw Error('Only local database is supported');
  const name = 'crowdfunding_local_' + new Date().toISOString().slice(0,10).replaceAll('-', '') + '_' + randomBytes(3).toString('hex');
  const password = execFileSync('docker', ['exec','crowdfunding_mysql','printenv','MYSQL_ROOT_PASSWORD'], {encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  const admin = await mariadb.createConnection({host:'127.0.0.1',port:3306,user:'root',password});
  try {
    await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    const user = decodeURIComponent(previous.username);
    const matches = await admin.query('SELECT User,Host FROM mysql.user WHERE User = ?', [user]);
    for (const account of matches) await admin.query(`GRANT ALL PRIVILEGES ON \`${name}\`.* TO ${admin.escape(account.User)}@${admin.escape(account.Host)}`);
  } finally { await admin.end(); }
  const adminUrl = `mysql://root:${encodeURIComponent(password)}@127.0.0.1:3306/${name}`;
  const build = spawnSync(process.execPath, ['node_modules/prisma/build/index.js','db','push'], {
    cwd:root,env:{...process.env,DATABASE_URL:adminUrl},encoding:'utf8',timeout:120000,
  });
  if (build.status !== 0) throw Error('Prisma schema initialization failed; previous environment unchanged. New database: ' + name);
  const db = await mariadb.createConnection({host:'127.0.0.1',port:3306,user:'root',password,database:name,charset:'utf8mb4',multipleStatements:true});
  try {
    await db.query("SET time_zone = '+00:00'");
    const source = fs.readFileSync(path.resolve(root,'../database/init.sql'),'utf8');
    let seed = source.slice(source.indexOf('INSERT INTO `categories`'));
    if (!seed.startsWith('INSERT INTO `categories`') || /\b(DROP|TRUNCATE|USE|CREATE DATABASE)\b/i.test(seed)) throw Error('Unexpected seed content');
    // Seed uses non-UUID prefixes (u/v/c); use fresh valid UUIDs consistently.
    const ids = new Map();
    seed = seed.replace(/[a-z]0000000-0000-0000-0000-000000000\d{3}/g, value => {
      if (!ids.has(value)) ids.set(value,randomUUID());
      return ids.get(value);
    });
    await db.beginTransaction();
    await db.query(seed);
    const accounts = await db.query('SELECT id,email,password_hash FROM users');
    for (const account of accounts) {
      if (!await bcrypt.compare('Password@123',account.password_hash)) {
        await db.query('UPDATE users SET password_hash=? WHERE id=?',[await bcrypt.hash('Password@123',10),account.id]);
      }
    }
    // New sample receipts must also exist in the ledger used by the current backend.
    await db.query("INSERT INTO ledger_entries (id,donation_id,kind,amount,created_at) SELECT UUID(),d.id,'RECEIPT',d.amount,COALESCE(d.paid_at,d.created_at) FROM donations d WHERE d.payment_status IN ('SUCCESS','REFUNDED') AND NOT EXISTS (SELECT 1 FROM ledger_entries l WHERE l.donation_id=d.id AND l.kind='RECEIPT')");
    await db.commit();
    const categories = await db.query('SELECT name FROM categories ORDER BY name');
    console.log(JSON.stringify({database:name,accounts:accounts.map(a=>a.email),categories:categories.map(c=>c.name)}));
  } catch(e) { await db.rollback(); throw e; } finally { await db.end(); }
  const Redis = require('ioredis');
  const redis = new Redis({host:process.env.REDIS_HOST||'localhost',port:Number(process.env.REDIS_PORT||6379),password:process.env.REDIS_PASSWORD||undefined,maxRetriesPerRequest:1});
  try {
    const accounts = ['admin@crowdfunding.vn','fundraiser@gmail.com','pending_kyc@gmail.com','donor1@gmail.com','donor2@gmail.com','tphamdinh583@gmail.com'];
    await redis.del(...accounts.flatMap(email=>['login_lock:'+email,'login_attempts:'+email]));
    let cursor = '0';
    do {
      const page = await redis.scan(cursor, 'MATCH', 'cache:campaigns:*', 'COUNT', 100);
      cursor = page[0];
      if (page[1].length) await redis.del(...page[1]);
    } while (cursor !== '0');
  } finally { redis.disconnect(); }
  const envPath = path.join(root,'.env');
  let env = fs.readFileSync(envPath,'utf8');
  fs.writeFileSync(path.join(root,'.env.before-fresh-'+name),env,{flag:'wx'});
  previous.pathname = '/'+name;
  const values = {DATABASE_URL:previous.toString(),JWT_SECRET:randomBytes(48).toString('hex'),JWT_REFRESH_SECRET:randomBytes(48).toString('hex'),COOKIE_SECRET:randomBytes(48).toString('hex')};
  for (const [key,value] of Object.entries(values)) {
    const pattern = new RegExp('^'+key+'=.*$','m');
    env = pattern.test(env)?env.replace(pattern,()=>`${key}="${value}"`):env+`\n${key}="${value}"\n`;
  }
  fs.writeFileSync(envPath,env);
  console.log('New database ready; .env switched; old database preserved; restart backend.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
