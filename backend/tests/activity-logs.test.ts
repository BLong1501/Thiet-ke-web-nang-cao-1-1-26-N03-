import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'isolated-activity-tests-not-a-production-key';
process.env.DATABASE_URL = 'mysql://test:test@127.0.0.1:1/no_real_database';
let app: express.Express;
let filters: any[] = [];
const restore: Array<() => void> = [];
const events = [
  { id: 'event-a', userId: 'user-a', action: 'LOGIN_SUCCESS', entityName: 'User', entityId: 'user-a', createdAt: new Date(), details: { internal: 'private-admin-metadata' }, ipAddress: '127.0.0.1', user: { email: 'a@example.test' } },
  { id: 'event-b', userId: 'user-b', action: 'UPDATE_PROFILE', entityName: 'User', entityId: 'user-b', createdAt: new Date(), details: { internal: 'other-user-data' } },
  { id: 'event-admin', userId: 'admin-a', action: 'REVIEW_KYC', entityName: 'Verification', entityId: 'kyc-a', createdAt: new Date() },
  { id: 'event-system', userId: null, action: 'SYSTEM', entityName: 'System', entityId: 'system', createdAt: new Date() },
];
const token = (role = 'USER', userId = 'user-a') => jwt.sign({ userId, email: 'a@example.test', role }, process.env.JWT_SECRET!, { expiresIn: '5m' });
before(async () => {
  const { prisma } = await import('../src/core/database/prisma');
  const { auditService } = await import('../src/core/services/audit.service');
  const findMany = prisma.auditLog.findMany; const count = prisma.auditLog.count; const log = auditService.log;
  restore.push(() => { prisma.auditLog.findMany = findMany; prisma.auditLog.count = count; auditService.log = log; });
  prisma.auditLog.findMany = (async (args: any) => { filters.push(args.where); return args.where.userId ? events.filter(e => e.userId === args.where.userId) : events; }) as any;
  prisma.auditLog.count = (async (args: any) => args.where.userId ? events.filter(e => e.userId === args.where.userId).length : events.length) as any;
  auditService.log = async () => {};
  const { activityLogRouter } = await import('../src/modules/activity-logs/activity-log.routes');
  app = express(); app.use(express.json()); app.use('/activity-logs', activityLogRouter);
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => { res.status(err.statusCode || 500).json({ message: err.message }); });
});
beforeEach(() => { filters = []; });
after(() => { restore.reverse().forEach(fn => fn()); });

test('personal logs require authentication', async () => {
  const r = await request(app).get('/activity-logs/me'); assert.equal(r.status, 401); assert.equal(filters.length, 0);
});
for (const role of ['USER', 'FUNDRAISER']) {
  test(`${role} personal logs force token identity and omit internal fields`, async () => {
    const r = await request(app).get('/activity-logs/me?userId=user-b&search=User').set('Authorization', `Bearer ${token(role)}`);
    assert.equal(r.status, 200); assert.equal(filters[0].userId, 'user-a'); assert.equal(r.body.meta.total, 1);
    assert.deepEqual(r.body.data.map((e: any) => e.id), ['event-a']);
    assert.deepEqual(Object.keys(r.body.data[0]).sort(), ['action', 'createdAt', 'entityId', 'entityName', 'id']);
    assert.equal(JSON.stringify(r.body).includes('private-admin-metadata'), false);
  });
  for (const path of ['/activity-logs', '/activity-logs/stats', '/activity-logs/event-b', '/activity-logs/user/user-b']) {
    test(`${role} cannot read admin endpoint ${path}`, async () => {
      const r = await request(app).get(path).set('Authorization', `Bearer ${token(role)}`);
      assert.equal(r.status, 403); assert.equal(filters.length, 0);
    });
  }
  test(`${role} cannot create arbitrary system logs`, async () => {
    const r = await request(app).post('/activity-logs').set('Authorization', `Bearer ${token(role)}`).send({ action: 'FAKE', entityName: 'User', entityId: 'user-b' });
    assert.equal(r.status, 403);
  });
}
test('admin retains system-wide logs', async () => {
  const r = await request(app).get('/activity-logs').set('Authorization', `Bearer ${token('ADMIN', 'admin-a')}`);
  assert.equal(r.status, 200); assert.equal(r.body.data.items.length, 4); assert.equal(filters[0].userId, undefined);
});
test('admin personal logs remain scoped to the admin account', async () => {
  const r = await request(app).get('/activity-logs/me').set('Authorization', `Bearer ${token('ADMIN', 'admin-a')}`);
  assert.equal(r.status, 200); assert.equal(filters[0].userId, 'admin-a'); assert.deepEqual(r.body.data.map((e: any) => e.id), ['event-admin']);
});
test('invalid pagination is rejected before querying logs', async () => {
  const r = await request(app).get('/activity-logs/me?limit=1000').set('Authorization', `Bearer ${token()}`);
  assert.equal(r.status, 400); assert.equal(filters.length, 0);
});
