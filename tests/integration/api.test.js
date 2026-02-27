require('dotenv').config();
const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/mysql');

describe('API Integration', () => {
  afterAll(async () => {
    await pool.end();
  });

  test('GET /health should return 200 and connected database', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('database', 'connected');
  });

  test('POST /api/auth/login should return token for seeded admin', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'admin@apotik.local',
      password: 'admin12345',
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data.token');
    expect(response.body.data.role).toBe('admin_apotik');
  });

  test('GET /api/prescriptions without token should return 401', async () => {
    const response = await request(app).get('/api/prescriptions');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('success', false);
  });
});
