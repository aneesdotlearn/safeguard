'use strict';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-minimum-64-characters-long-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-64-chars-xxxxxxxxxxxxxxxxxxxxxxxxxxxx';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.BCRYPT_ROUNDS = '4';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');

let accessToken;
let sosId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/safeguard_test_sos');

  const res = await request(app).post('/api/v1/auth/register').send({
    name: 'SOS Tester',
    email: `sostest_${Date.now()}@example.com`,
    phone: '+911234567891',
    password: 'Test@1234',
  });
  accessToken = res.body.data.accessToken;
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

describe('SOS API', () => {
  it('POST /api/v1/sos/trigger — should trigger SOS', async () => {
    const res = await request(app)
      .post('/api/v1/sos/trigger')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ coordinates: [80.2707, 13.0827], accuracy: 10, triggerMethod: 'button' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.sosId).toBeDefined();
    sosId = res.body.data.sosId;
  });

  it('GET /api/v1/sos/active — should return active SOS', async () => {
    const res = await request(app)
      .get('/api/v1/sos/active')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.sos).not.toBeNull();
  });

  it('PATCH /api/v1/sos/:id/location — should update SOS location', async () => {
    const res = await request(app)
      .patch(`/api/v1/sos/${sosId}/location`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ coordinates: [80.2750, 13.0850], accuracy: 8 });
    expect(res.status).toBe(200);
  });

  it('PATCH /api/v1/sos/:id/resolve — should resolve SOS', async () => {
    const res = await request(app)
      .patch(`/api/v1/sos/${sosId}/resolve`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ isFalseAlarm: false, resolutionNote: 'Test resolved' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('resolved');
  });

  it('GET /api/v1/sos/history — should return SOS history', async () => {
    const res = await request(app)
      .get('/api/v1/sos/history')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.sos)).toBe(true);
    expect(res.body.data.total).toBeGreaterThan(0);
  });

  it('POST /api/v1/sos/trigger — rejects without coordinates', async () => {
    const res = await request(app)
      .post('/api/v1/sos/trigger')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ triggerMethod: 'button' });
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/sos/trigger — rejects without auth', async () => {
    const res = await request(app)
      .post('/api/v1/sos/trigger')
      .send({ coordinates: [80.2707, 13.0827] });
    expect(res.status).toBe(401);
  });
});
