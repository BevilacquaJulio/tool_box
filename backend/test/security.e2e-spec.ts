import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestingApp, TEST_API_KEY } from './create-testing-app';

describe('Security e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestingApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const payload = {
    host: '127.0.0.1',
    port: 3306,
    database: 'app',
    username: 'root',
    password: 'super-secret-password',
  };

  it('does not leak secrets or stack traces on unauthorized requests', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/db-verify/test')
      .send(payload)
      .expect(401);

    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toMatch(/super-secret-password/);
    expect(serialized).not.toMatch(/stack/i);
    expect(response.body.error.message).toBe('Chave interna invalida ou ausente.');
  });

  it('rejects unknown fields (mass assignment / strict body)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/db-verify/test')
      .set('x-internal-api-key', TEST_API_KEY)
      .send({
        ...payload,
        role: 'admin',
        multipleStatements: true,
      })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects SQL injection payloads in bounded identifiers', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/db-verify/test')
      .set('x-internal-api-key', TEST_API_KEY)
      .send({
        ...payload,
        database: "app'; DROP TABLE users; --",
      })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(response.body)).not.toMatch(/DROP TABLE/i);
  });

  it('blocks metadata and link-local destinations', async () => {
    const metadata = await request(app.getHttpServer())
      .post('/api/db-verify/test')
      .set('x-internal-api-key', TEST_API_KEY)
      .send({ ...payload, host: 'metadata.google.internal' })
      .expect(400);

    expect(metadata.body.error.code).toBe('VALIDATION_ERROR');

    const linkLocal = await request(app.getHttpServer())
      .post('/api/db-verify/test')
      .set('x-internal-api-key', TEST_API_KEY)
      .send({ ...payload, host: '169.254.169.254' })
      .expect(400);

    expect(linkLocal.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('does not echo the internal API key', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/db-verify/test')
      .set('x-internal-api-key', TEST_API_KEY)
      .send({ ...payload, host: '' })
      .expect(400);

    expect(JSON.stringify(response.body)).not.toContain(TEST_API_KEY);
  });

  it('reflects only exact CORS origins', async () => {
    const allowed = await request(app.getHttpServer())
      .get('/api/health')
      .set('Origin', 'http://localhost:5173')
      .expect(200);

    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    const denied = await request(app.getHttpServer())
      .get('/api/health')
      .set('Origin', 'https://evil.example')
      .expect(200);

    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('keeps Swagger available outside production', async () => {
    await request(app.getHttpServer()).get('/api/docs').expect(200);
  });

  it('returns 404 envelope for unknown routes', async () => {
    const response = await request(app.getHttpServer()).get('/api/does-not-exist').expect(404);
    expect(response.body.error).toMatchObject({
      code: 'NOT_FOUND',
      requestId: expect.any(String),
    });
    expect(JSON.stringify(response.body)).not.toMatch(/node_modules|dist\\src/i);
  });
});
