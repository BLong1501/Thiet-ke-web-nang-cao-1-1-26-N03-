// Additive migration. DDL commits independently in MySQL; safe to rerun after inspection.
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const mariadb = require('mariadb');
async function main() {
  const url = new URL(process.env.SESSION06_DATABASE_URL || process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('This preparation script only accepts local MySQL.');
  const database = url.pathname.slice(1);
  if (database !== 'crowdfunding_db' && !database.endsWith('_session06_test')) throw new Error('Unexpected target database.');
  const db = await mariadb.createConnection({ host: url.hostname, port: Number(url.port || 3306),
    user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database });
  try {
    const [[counts], tables] = await Promise.all([
      db.query('SELECT COUNT(*) AS usersCount FROM users'),
      db.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ledger_entries'", [database]),
    ]);
    if (!tables.length) {
      const [legacy] = await db.query("SELECT COUNT(*) AS n FROM donations WHERE payment_status IN ('SUCCESS','REFUNDED')");
      if (Number(legacy.n)) throw new Error('Existing settled donations need reviewed ledger backfill before migration. No changes made.');
    }
    await db.query(`CREATE TABLE IF NOT EXISTS ledger_entries (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      donation_id VARCHAR(36) NOT NULL,
      kind ENUM('RECEIPT','REFUND') NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY ledger_entries_donation_id_kind_key (donation_id, kind),
      CONSTRAINT ledger_positive CHECK (amount > 0),
      CONSTRAINT ledger_donation_fk FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE RESTRICT
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    const constraints = await db.query("SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ? AND TABLE_NAME = 'donations'", [database]);
    if (!constraints.some(c => c.CONSTRAINT_NAME === 'donations_positive_amount')) {
      await db.query('ALTER TABLE donations ADD CONSTRAINT donations_positive_amount CHECK (amount > 0)');
    }
    const triggers = {
      ledger_validate_insert: `CREATE TRIGGER ledger_validate_insert BEFORE INSERT ON ledger_entries FOR EACH ROW
      BEGIN
        DECLARE original_amount DECIMAL(15,2);
        DECLARE original_status VARCHAR(20);
        DECLARE receipt_amount DECIMAL(15,2) DEFAULT NULL;
        SELECT amount, payment_status INTO original_amount, original_status FROM donations WHERE id = NEW.donation_id FOR UPDATE;
        IF original_amount IS NULL OR NEW.amount <> original_amount THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ledger amount must equal the original full donation';
        END IF;
        IF NEW.kind = 'RECEIPT' AND original_status <> 'PENDING' THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Receipt requires PENDING donation';
        END IF;
        IF NEW.kind = 'REFUND' THEN
          SELECT amount INTO receipt_amount FROM ledger_entries WHERE donation_id = NEW.donation_id AND kind = 'RECEIPT';
          IF original_status <> 'SUCCESS' OR receipt_amount IS NULL OR NEW.amount > receipt_amount THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Refund requires a successful receipt and cannot exceed it';
          END IF;
        END IF;
      END`,
      ledger_no_update: `CREATE TRIGGER ledger_no_update BEFORE UPDATE ON ledger_entries FOR EACH ROW
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ledger entries are immutable'`,
      ledger_no_delete: `CREATE TRIGGER ledger_no_delete BEFORE DELETE ON ledger_entries FOR EACH ROW
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ledger entries are immutable'`,
      donation_lock_financial_fields: `CREATE TRIGGER donation_lock_financial_fields BEFORE UPDATE ON donations FOR EACH ROW
      BEGIN
        IF EXISTS (SELECT 1 FROM ledger_entries WHERE donation_id = OLD.id) THEN
          IF NEW.amount <> OLD.amount OR NEW.campaign_id <> OLD.campaign_id OR NOT (NEW.donor_id <=> OLD.donor_id) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Settled donation financial fields are immutable';
          END IF;
        END IF;
      END`,
    };
    const existing = await db.query('SELECT TRIGGER_NAME, ACTION_STATEMENT FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = ?', [database]);
    for (const [name, sql] of Object.entries(triggers)) {
      const current = existing.find(t => t.TRIGGER_NAME === name);
      const body = sql.split('FOR EACH ROW')[1].trim();
      if (current && current.ACTION_STATEMENT.trim() !== body) await db.query('DROP TRIGGER `' + name + '`');
      if (!current || current.ACTION_STATEMENT.trim() !== body) await db.query(sql);
    }
    const [after] = await db.query('SELECT COUNT(*) AS n FROM users');
    if (String(counts.usersCount) !== String(after.n)) throw new Error('Unexpected user count change.');
    const report = { checkedAt: new Date().toISOString(), database, usersPreserved: true,
      triggers: Object.keys(triggers), ledger: 'full refund only; one entry per donation/kind',
      scriptSha256: crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex') };
    const file = path.resolve(__dirname, '../../lecture/buoi6/evidence/schema-' + database + '.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await db.end(); }
}
main().catch(e => { console.error(e.code || e.message); process.exitCode = 1; });
