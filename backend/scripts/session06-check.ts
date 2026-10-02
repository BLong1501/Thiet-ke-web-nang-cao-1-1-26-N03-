import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import jwt from 'jsonwebtoken';

// Real HTTP + real MySQL, isolated schema required. No production data or real money.
const target = process.env.SESSION06_DATABASE_URL;
if (!target) throw new Error('Set SESSION06_DATABASE_URL to a local *_session06_test database.');
const url = new URL(target);
if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.endsWith('_session06_test')) {
  throw new Error('Refusing to test outside a dedicated local *_session06_test database.');
}
process.env.DATABASE_URL = target;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = randomUUID();
process.env.REDIS_PORT = '1';
process.env.SMTP_HOST = '';
const cases: any[] = [], parallel: any[] = [];
async function main() {
  const { prisma: db } = await import('../src/core/database/prisma');
  const { donationService: service } = await import('../src/modules/donations/donation.service');
  const app = (await import('../src/app')).default;
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/v1`;
  const adminId = randomUUID(), userId = randomUUID(), otherId = randomUUID(), campaignId = randomUUID();
  const admin = { userId: adminId, role: 'ADMIN' }, user = { userId, role: 'USER' };
  const token = (actor: any) => jwt.sign({ ...actor, email: 'fixture@example.test' }, process.env.JWT_SECRET!, { expiresIn: '10m' });
  const request = async (method: string, route: string, actor?: any, body?: any) => {
    const response = await fetch(base + route, { method, headers: {
      'Content-Type': 'application/json', ...(actor ? { Authorization: `Bearer ${token(actor)}` } : {}),
    }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json() as any };
  };
  const check = async (name: string, action: () => Promise<void>) => {
    await action(); cases.push({ name, passed: true }); console.log(`PASS ${name}`);
  };
  try {
    await db.user.createMany({ data: [admin, user, { userId: otherId, role: 'USER' }].map(a => ({
      id: a.userId, email: `${a.userId}@example.test`, fullName: 'Session06 fixture', role: a.role as any, isEmailVerified: true,
    })) });
    const category = await db.category.create({ data: { name: 'Session06 test', slug: randomUUID() } });
    await db.campaign.create({ data: {
      id: campaignId, fundraiserId: adminId, categoryId: category.id, title: 'Session06 isolated fixture', slug: campaignId,
      shortDescription: 'Synthetic fixture', story: 'Synthetic fixture', coverImageUrl: 'https://example.test/cover',
      targetAmount: 1000000, startDate: new Date(Date.now() - 3600000), endDate: new Date(Date.now() + 86400000),
      status: 'ACTIVE', bankAccountNumber: '0000000000', bankName: 'Test bank', bankAccountName: 'Test',
    } });
    let donationId = '';
    const input = { campaignId, amount: 100000, requestKey: randomUUID() };
    await check('B6-01 create PENDING + idempotent replay', async () => {
      const first = await request('POST', '/donations', user, input);
      assert.equal(first.status, 201, JSON.stringify(first.body));
      donationId = first.body.data.donation.id;
      assert.equal(first.body.data.donation.paymentStatus, 'PENDING');
      const replay = await request('POST', '/donations', user, input);
      assert.equal(replay.status, 200); assert.equal(replay.body.data.donation.id, donationId);
      assert.equal(await db.donation.count({ where: { transactionCode: input.requestKey } }), 1);
    });
    await check('B6-02 missing token 401; USER confirm 403; cross-owner detail 403', async () => {
      assert.equal((await request('GET', `/donations/${donationId}`)).status, 401);
      assert.equal((await request('POST', `/donations/${donationId}/confirm-demo`, user, {})).status, 403);
      assert.equal((await request('GET', `/donations/${donationId}`, { userId: otherId, role: 'USER' })).status, 403);
    });
    await check('B6-03 invalid amount 400; key reused with changed payload 409; pending refund 422', async () => {
      assert.equal((await request('POST', '/donations', user, { ...input, amount: -1 })).status, 400);
      assert.equal((await request('POST', '/donations', user, { ...input, amount: 200000 })).status, 409);
      assert.equal((await request('POST', `/donations/${donationId}/refund`, user, { reason: 'Test pending refund' })).status, 422);
    });
    await check('B6-04 rollback on injected notification/audit failure', async () => {
      const original = (service as any).record;
      try {
        (service as any).record = async () => { throw new Error('TEST_INJECTED_AFTER_LEDGER'); };
        await assert.rejects(() => service.confirm(admin, donationId), /TEST_INJECTED_AFTER_LEDGER/);
      } finally { (service as any).record = original; }
      assert.equal((await db.donation.findUniqueOrThrow({ where: { id: donationId } })).paymentStatus, 'PENDING');
      assert.equal(await db.ledgerEntry.count({ where: { donationId } }), 0);
      assert.equal((await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })).currentAmount.toString(), '0');
    });
    await check('B6-05 ADMIN confirm + repeated confirm 422 + reconciliation', async () => {
      const response = await request('POST', `/donations/${donationId}/confirm-demo`, admin, {});
      assert.equal(response.status, 200, JSON.stringify(response.body));
      assert.equal(response.body.data.donation.paymentStatus, 'SUCCESS');
      assert.equal((await request('POST', `/donations/${donationId}/confirm-demo`, admin, {})).status, 422);
      const balance = await request('GET', `/donations/campaigns/${campaignId}/reconciliation`, admin);
      assert.equal(balance.body.data.matches, true); assert.equal(balance.body.data.net, '100000');
    });
    await check('B6-06 active campaign refund 422; admin cancellation', async () => {
      assert.equal((await request('POST', `/donations/${donationId}/refund`, user, { reason: 'Test full refund' })).status, 422);
      assert.equal((await request('POST', `/donations/campaigns/${campaignId}/cancel`, user, { reason: 'Test cancellation' })).status, 403);
      assert.equal((await request('POST', `/donations/campaigns/${campaignId}/cancel`, admin, { reason: 'Test cancellation' })).status, 200);
    });
    await check('B6-07 real DB rejects refund exceeding receipt', async () => {
      await assert.rejects(() => db.ledgerEntry.create({ data: { donationId, kind: 'REFUND', amount: 100001 } }), /Ledger amount must equal/);
      assert.equal(await db.ledgerEntry.count({ where: { donationId, kind: 'REFUND' } }), 0);
    });
    await check('B6-08 50 concurrent HTTP refunds: exactly 1 success, 49 rejected', async () => {
      const rows = await Promise.all(Array.from({ length: 50 }, async (_, i) => {
        const start = performance.now();
        const result = await request('POST', `/donations/${donationId}/refund`, user, { reason: 'Concurrent full refund test' });
        return { request: i + 1, httpStatus: result.status, durationMs: Math.round(performance.now() - start), message: result.body.message };
      }));
      parallel.push(...rows);
      assert.equal(rows.filter(r => r.httpStatus === 200).length, 1, JSON.stringify(rows));
      assert.equal(rows.filter(r => r.httpStatus === 422).length, 49, JSON.stringify(rows));
      const entries = await db.ledgerEntry.findMany({ where: { donationId } });
      assert.equal(entries.filter(e => e.kind === 'REFUND').length, 1);
      assert.equal(entries.find(e => e.kind === 'REFUND')!.amount.toString(), '100000');
      assert.equal((await db.donation.findUniqueOrThrow({ where: { id: donationId } })).paymentStatus, 'REFUNDED');
      assert.equal(await db.auditLog.count({ where: { entityId: donationId, action: 'DEMO_FULL_REFUND' } }), 1);
      assert.equal(await db.notification.count({ where: { userId, type: 'DEMO_FULL_REFUND' } }), 1);
    });
    await check('B6-09 direct DB duplicate refund and ledger editing rejected', async () => {
      await assert.rejects(() => db.ledgerEntry.create({ data: { donationId, kind: 'REFUND', amount: 100000 } }), /Refund requires/);
      await assert.rejects(() => db.ledgerEntry.updateMany({ where: { donationId }, data: { amount: 999999 } }), /Ledger entries are immutable/);
      await assert.rejects(() => db.donation.update({ where: { id: donationId }, data: { amount: 200000 } }), /financial fields are immutable/);
      const result = await request('GET', `/donations/campaigns/${campaignId}/reconciliation`, admin);
      assert.equal(result.body.data.net, '0'); assert.equal(result.body.data.refunded, '100000'); assert.equal(result.body.data.matches, true);
      const detail = await request('GET', `/campaigns/${campaignId}`);
      assert.equal(detail.status, 200); assert.equal(detail.body.data.currentAmount, 0);
    });
    await check('B6-10 expiry task closes campaign without HTTP access', async () => {
      // Separate synthetic campaign, never rewrite a real campaign for testing.
      const original = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } });
      const expiredId = randomUUID();
      await db.campaign.create({ data: { ...original, id: expiredId, slug: expiredId, status: 'ACTIVE', currentAmount: 0, startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() - 1000) } });
      await service.expireCampaigns();
      assert.equal((await db.campaign.findUniqueOrThrow({ where: { id: expiredId } })).status, 'COMPLETED');
    });
    console.table(parallel);
    console.log('ANH 31: 50 requests | 1 HTTP 200 | 49 HTTP 422 | refunded 100000 / received 100000 | net 0');
  } catch (error: any) {
    cases.push({ name: 'Run failure', passed: false, message: error.message });
    console.error(error.message); process.exitCode = 1;
  } finally {
    const output = path.resolve(__dirname, '../../lecture/buoi6/evidence');
    fs.mkdirSync(output, { recursive: true });
    const report = { checkedAt: new Date().toISOString(), environment: 'local isolated MySQL + real HTTP; simulated money',
      database: url.pathname.slice(1), campaignId, cases, parallel,
      passed: cases.length > 0 && cases.every(c => c.passed) && parallel.length === 50 };
    fs.writeFileSync(path.join(output, 'session06-results.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(output, '50-requests.csv'), 'request,httpStatus,durationMs\n' + parallel.map(r => `${r.request},${r.httpStatus},${r.durationMs}`).join('\n') + '\n');
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await db.$disconnect();
  }
}
main().catch(e => { console.error(e.code || e.message); process.exitCode = 1; });
