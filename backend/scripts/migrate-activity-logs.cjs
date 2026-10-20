// Explicit opt-in: adds indexes only; no reset, drop or row deletion.
require("dotenv").config({ quiet: true });
const fs = require("node:fs");
const { createRequire } = require("node:module");
const mariadb = createRequire(require.resolve("@prisma/adapter-mariadb"))(
  "mariadb",
);
(async () => {
  const u = new URL(process.env.DATABASE_URL);
  const c = await mariadb.createConnection({
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
    ssl: !["localhost", "127.0.0.1"].includes(u.hostname)
      ? { rejectUnauthorized: false }
      : undefined,
    connectTimeout: 10000,
  });
  try {
    const sql = fs
      .readFileSync(
        require("node:path").join(
          __dirname,
          "../../database/migrations/003_activity_log_indexes.sql",
        ),
        "utf8",
      )
      .replace(/^--.*$/gm, "");
    for (const statement of sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean))
      await c.query(statement);
    const rows = await c.query(
      "SELECT DISTINCT INDEX_NAME FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'audit_logs' AND INDEX_NAME IN ('idx_audit_created_id', 'idx_audit_user_created_id', 'idx_audit_action_created_id')",
    );
    if (rows.length !== 3) throw new Error("Missing activity indexes");
    console.log(
      "Verified all 3 activity-log indexes. Existing rows preserved.",
    );
  } finally {
    await c.end();
  }
})().catch((e) => {
  console.error("Migration failed:", e.code || e.name);
  process.exitCode = 1;
});
