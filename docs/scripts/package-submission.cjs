// Run from any directory. Copy only reviewed submission artifacts, never .env or dependencies.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const destination = path.join(root, 'lecture/buoi3/Nhóm_9_Crowdfunding/Pham_Dinh_Truong_V4_V5');
const files = [
  'openapi.json',
  'security/authorization-matrix.md', 'security/authorization-policy.json',
  'security/authorization-test-cases.md', 'security/authorization-test-cases.json',
  'security/additional-test-cases.md', 'security/fixtures.md', 'security/security-evidence.md',
  'session03/checklist.md', 'session03/source-review.md', 'deployment/README.md',
  'evidence/authorization-run.json', 'evidence/document-validation.json',
  'evidence/openapi-viewer.png', 'evidence/openapi-viewer-kyc.png',
  'evidence/database-apply-1790088065317.json',
  'evidence/database-inspect-1790088065521.json', 'evidence/database-refusal.txt',
];
const manifest = files.map(file => {
  const data = fs.readFileSync(path.join(root, 'docs', file));
  const target = path.join(destination, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, data);
  const hashData = file.endsWith('.png') ? data : Buffer.from(data.toString('utf8').replace(/\r\n/g, '\n'));
  return { file, source: `docs/${file}`, sha256: crypto.createHash('sha256').update(hashData).digest('hex') };
});
fs.writeFileSync(path.join(destination, 'manifest.json'), JSON.stringify({
  student: 'Phạm Đình Trường', group: 9, session: 3, roles: ['V4', 'V5'],
  hashConvention: 'SHA-256; PNG raw bytes; UTF-8 text normalized from CRLF to LF for Git portability', files: manifest,
}, null, 2) + '\n');
console.log(`Packaged ${files.length} artifacts in ${path.relative(root, destination)}`);
