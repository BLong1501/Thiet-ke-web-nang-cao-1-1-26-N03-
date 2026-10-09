import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import sharp from 'sharp';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'isolated-upload-test-secret';

test('Buoi 7: real multipart upload, private storage and access checks', async t => {
  const { createUploadRouter, MAX_UPLOAD_BYTES } = await import('../src/modules/uploads/upload.routes');
  const root = await mkdtemp(path.join(os.tmpdir(), 'session07-upload-'));
  const app = express();
  app.use('/api/v1/uploads', createUploadRouter(root));
  const token = (userId: string, role = 'USER') => jwt.sign({ userId, role, email: 'test@example.test' }, process.env.JWT_SECRET!, { expiresIn: '5m' });
  const owner = token('owner');
  const image = await sharp({ create: { width: 30, height: 30, channels: 3, background: '#336699' } }).png().toBuffer();
  const post = () => request(app).post('/api/v1/uploads').set('Authorization', `Bearer ${owner}`);
  let url = '';
  try {
    await t.test('valid PNG saved under random name', async () => {
      const r = await post().attach('file', image, 'original.png');
      assert.equal(r.status, 201, JSON.stringify(r.body));
      assert.notEqual(r.body.data.fileName, 'original.png');
      url = r.body.data.downloadUrl;
    });
    await t.test('owner downloads normalized image', async () => {
      const r = await request(app).get(url).set('Authorization', `Bearer ${owner}`);
      assert.equal(r.status, 200); assert.equal(r.headers['content-type'], 'image/png');
      assert.equal((await sharp(r.body).metadata()).width, 30);
    });
    await t.test('direct URL without credentials blocked', async () => {
      assert.equal((await request(app).get(url)).status, 401);
    });
    await t.test('other user blocked', async () => {
      assert.equal((await request(app).get(url).set('Authorization', `Bearer ${token('other')}`)).status, 403);
    });
    await t.test('admin may read', async () => {
      assert.equal((await request(app).get(url).set('Authorization', `Bearer ${token('admin', 'ADMIN')}`)).status, 200);
    });
    await t.test('script renamed to jpg rejected', async () => {
      assert.equal((await post().attach('file', Buffer.from('<?php echo "TEST ONLY"; ?>'), 'fake.jpg')).status, 415);
    });
    await t.test('PNG header with invalid image body rejected', async () => {
      assert.equal((await post().attach('file', Buffer.concat([image.subarray(0, 8), Buffer.from('not an image')]), 'fake.png')).status, 415);
    });
    await t.test('mismatched extension rejected', async () => {
      assert.equal((await post().attach('file', image, 'wrong.jpg')).status, 415);
    });
    await t.test('over 5 MB rejected', async () => {
      assert.equal((await post().attach('file', Buffer.alloc(MAX_UPLOAD_BYTES + 1), 'large.png')).status, 413);
    });
    await t.test('missing file rejected', async () => { assert.equal((await post()).status, 400); });
    await t.test('unauthenticated upload blocked', async () => {
      assert.equal((await request(app).post('/api/v1/uploads').attach('file', image, 'valid.png')).status, 401);
    });
    await t.test('extra owner field rejected; rejected requests leave no files', async () => {
      assert.equal((await post().field('ownerId', 'someone-else').attach('file', image, 'valid.png')).status, 400);
      assert.equal((await readdir(root)).length, 1);
    });
  } finally {
    // mkdtemp root is a unique test directory under the OS temp directory.
    await rm(root, { recursive: true, force: true });
  }
});
