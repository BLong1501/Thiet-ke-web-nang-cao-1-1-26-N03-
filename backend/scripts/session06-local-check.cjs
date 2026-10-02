// One command for the student's local Docker setup. Secrets stay in child environments.
const { execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const mariadb = require('mariadb');
const root = path.resolve(__dirname, '..');
const output = path.resolve(root, '../lecture/buoi6/evidence');
async function main() {
  const password = execFileSync('docker', ['exec', 'crowdfunding_mysql', 'printenv', 'MYSQL_ROOT_PASSWORD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  if (!password) throw new Error('Local Docker root credentials unavailable.');
  const database = 'crowdfunding_session06_test';
  const connection = await mariadb.createConnection({ host: '127.0.0.1', port: 3306, user: 'root', password });
  try { await connection.query('CREATE DATABASE IF NOT EXISTS crowdfunding_session06_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'); }
  finally { await connection.end(); }
  const url = `mysql://root:${encodeURIComponent(password)}@127.0.0.1:3306/${database}`;
  const env = { ...process.env, DATABASE_URL: url, SESSION06_DATABASE_URL: url };
  const run = args => {
    const result = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000 });
    if (result.error || result.status !== 0) throw new Error(`Preparation failed (${args[0]}). Inspect local database; no reset/drop is performed.`);
  };
  run(['node_modules/prisma/build/index.js', 'db', 'push']);
  run(['scripts/session06-schema.cjs']);
  fs.mkdirSync(output, { recursive: true });
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/session06-check.ts'], { cwd: root, env, encoding: 'utf8', timeout: 180000 });
  const log = (result.stdout || '') + (result.stderr || '');
  fs.writeFileSync(path.join(output, 'session06-test-output.txt'), log);
  process.stdout.write(log);
  if (result.error || result.status !== 0) process.exitCode = 1;
}
main().catch(e => { console.error(e.code || e.message); process.exitCode = 1; });
