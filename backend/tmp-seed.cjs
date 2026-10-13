const fs = require("fs");
const { spawn } = require("child_process");

const child = spawn(
  "docker",
  [
    "exec",
    "-i",
    "crowdfunding_mysql",
    "sh",
    "-c",
    'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" --default-character-set=utf8mb4',
  ],
  { stdio: ["pipe", "inherit", "pipe"] },
);

let err = "";
child.stderr.on("data", (chunk) => {
  err += chunk;
});
child.on("close", (code) => {
  const lines = err
    .split(/\r?\n/)
    .filter((line) => line && !/Using a password/.test(line));
  console.log("exit", code);
  if (lines.length) console.log(lines.join("\n"));
  process.exit(code ?? 1);
});
child.stdin.end(fs.readFileSync("tmp-seed.sql"));
