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

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/safeguard_test');
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

describe('Auth API', () => {
  const testUser = {
    name: 'Test User',
    email: `test_${Date.now()}@example.com`,
    phone: '+911234567890',
    password: 'Test@1234',
  };

  let accessToken;

  it('POST /api/v1/auth/register — should register a new user', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe(testUser.email);
    accessToken = res.body.data.accessToken;
  });

  it('POST /api/v1/auth/register — should reject duplicate email', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);
    expect(res.status).toBe(409);
  });

  it('POST /api/v1/auth/login — should login with valid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    accessToken = res.body.data.accessToken;
  });

  it('POST /api/v1/auth/login — should reject wrong password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: testUser.email,
      password: 'WrongPassword@1',
    });
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/auth/me — should return current user', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(testUser.email);
  });

  it('GET /api/v1/auth/me — should reject without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/auth/logout — should logout successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
  });
});

describe('Input Validation', () => {
  it('POST /api/v1/auth/register — rejects invalid email', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Test', email: 'not-an-email', phone: '+911234567890', password: 'Test@1234',
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/auth/register — rejects weak password', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Test', email: 'valid@test.com', phone: '+911234567890', password: 'weak',
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/auth/register — rejects invalid phone', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Test', email: 'valid2@test.com', phone: '1234567890', password: 'Test@1234',
    });
    expect(res.status).toBe(400);
  });
});
