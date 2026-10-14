import test,{after} from 'node:test';import assert from 'node:assert/strict';
process.env.NODE_ENV='test';
after(async()=>{(await import('../src/core/database/redis')).shutdownRedis();await (await import('../src/core/database/prisma')).prisma.$disconnect();});
test('Date boundaries use Vietnam local days and reject invalid dates',async()=>{
  const {dateRange}=await import('../src/modules/analytics/analytics.routes');
  assert.equal(dateRange('2026-10-14','2026-10-14').start.toISOString(),'2026-10-13T17:00:00.000Z');
  assert.equal(dateRange('2026-10-14','2026-10-14').end.toISOString(),'2026-10-14T17:00:00.000Z');
  for(const pair of [['2026-02-30','2026-03-01'],['2026-12-01','2026-01-01'],['2024-01-01','2026-01-01']])assert.throws(()=>dateRange(...pair as [string,string]));
});
test('CSV escapes commas, quotes, newlines, and prefixed spreadsheet formulas',async()=>{
  const {encodeCsv}=await import('../src/modules/analytics/analytics.routes');
  const csv=encodeCsv([{label:'  =HYPERLINK("x"),\ny',donations:1,received:'100',refunded:'0',net:'100'}]);
  assert.equal(csv.charCodeAt(0),0xfeff);assert.ok(csv.includes('"\'  =HYPERLINK(""x""),\ny"'));assert.ok(csv.endsWith('\r\n'));
});
