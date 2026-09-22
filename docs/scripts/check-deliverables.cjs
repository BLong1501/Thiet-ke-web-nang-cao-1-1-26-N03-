const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const backendRequire = createRequire(path.join(root, 'backend/package.json'));
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
async function main() {
  const spec = read('docs/openapi.json');
  await backendRequire('@apidevtools/swagger-parser').validate(spec);
  const policy = read('docs/security/authorization-policy.json');
  const cases = read('docs/security/authorization-test-cases.json');
  assert.equal(new Set(policy.operations.map(o => o.id)).size, policy.operations.length);
  assert.equal(new Set(cases.map(c => c.id)).size, cases.length);
  const expected = [];
  for (const op of policy.operations) for (const role of ['GUEST','USER','FUNDRAISER','ADMIN','GATEWAY']) if (!op.allow.includes(role)) expected.push(`DENY-${op.id}-${role}`);
  assert.deepEqual(cases.map(c => c.id).sort(), expected.sort(), 'Every denied cell must have exactly one test');
  for (let n = 1; n <= 35; n++) {
    const ids = policy.requirements[`YCCN${String(n).padStart(2,'0')}`];
    assert.ok(ids && ids.length, `Missing YCCN${n}`);
    for (const id of ids) assert.ok(policy.operations.some(o => o.id===id) || ['SYSTEM-AUDIT','SYSTEM-NOTIFICATION'].includes(id));
  }
  // Extract actual mounted routes independently from the reviewed JSON.
  const actual = ['GET /health'];
  for (const [module, prefix] of [['auth','/auth'],['verifications','/verifications']]) {
    const file = module === 'auth' ? 'auth' : 'verification';
    const source = fs.readFileSync(path.join(root,`backend/src/modules/${module}/${file}.routes.ts`),'utf8');
    for (const match of source.matchAll(/router\.(get|post|patch|put|delete)\(\s*"([^"]+)"/g)) {
      actual.push(`${match[1].toUpperCase()} ${prefix}${match[2].replace(/:([a-zA-Z]+)/g,'{$1}')}`);
    }
  }
  const described = [];
  for (const [url, item] of Object.entries(spec.paths)) for (const [method, op] of Object.entries(item)) {
    if (!['get','post','put','patch','delete'].includes(method)) continue;
    described.push(`${method.toUpperCase()} ${url}`);
    const entry = policy.operations.find(o => o.id===op['x-authorization-id']);
    assert.ok(entry && entry.state==='LIVE', 'OpenAPI must point to LIVE matrix rows');
    assert.equal(entry.path,url);
    assert.equal(entry.method,method.toUpperCase());
    assert.deepEqual(op['x-roles'],entry.allow.filter(r=>r!=='GATEWAY'));
  }
  assert.deepEqual(described.sort(),actual.sort(), 'OpenAPI and mounted routes differ');
  const report = { checkedAt:new Date().toISOString(), openapi:'3.0.3', syntaxAndReferences:'PASS', routeCoverage:'PASS', operations:described.length,
    matrixOperations:policy.operations.length, deniedCells:expected.length, plannedDenyCases:cases.length,
    deniedCellCoverage:'100%', requirementMappings:35, result:'PASS',
    limitation:'Static contract and traceability checks, not proof of passing authorization requests or cloud deployment.' };
  fs.mkdirSync(path.join(root,'docs/evidence'),{recursive:true});
  fs.writeFileSync(path.join(root,'docs/evidence/document-validation.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
