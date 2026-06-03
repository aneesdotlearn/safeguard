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
let contactId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/safeguard_test_contacts');
  const res = await request(app).post('/api/v1/auth/register').send({
    name: 'Contact Tester',
    email: `contacttest_${Date.now()}@example.com`,
    phone: '+911234567892',
    password: 'Test@1234',
  });
  accessToken = res.body.data.accessToken;
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

describe('Contacts API', () => {
  it('GET /api/v1/contacts — should return empty list initially', async () => {
    const res = await request(app)
      .get('/api/v1/contacts')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.contacts).toHaveLength(0);
  });

  it('POST /api/v1/contacts — should create a contact', async () => {
    const res = await request(app)
      .post('/api/v1/contacts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Jane Doe', phone: '+911111111111', email: 'jane@example.com', relationship: 'Sister', priority: 1 });
    expect(res.status).toBe(201);
    expect(res.body.data.contact.name).toBe('Jane Doe');
    contactId = res.body.data.contact._id;
  });

  it('PATCH /api/v1/contacts/:id — should update a contact', async () => {
    const res = await request(app)
      .patch(`/api/v1/contacts/${contactId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ priority: 2 });
    expect(res.status).toBe(200);
    expect(res.body.data.contact.priority).toBe(2);
  });

  it('DELETE /api/v1/contacts/:id — should delete a contact', async () => {
    const res = await request(app)
      .delete(`/api/v1/contacts/${contactId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(204);
  });

  it('POST /api/v1/contacts — rejects invalid phone format', async () => {
    const res = await request(app)
      .post('/api/v1/contacts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Test', phone: '09876543210', relationship: 'Friend' });
    expect(res.status).toBe(400);
  });
});
