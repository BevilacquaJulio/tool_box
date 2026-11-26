import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestingApp, TEST_API_KEY } from './create-testing-app';

describe('App e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestingApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health is public', async () => {
    const response = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
  });

  it('POST /api/db-verify/test requires the internal key', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/db-verify/test')
      .send({
        host: '127.0.0.1',
        database: 'app',
        username: 'root',
        password: '',
      })
      .expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(response.body.error.requestId).toEqual(expect.any(String));
  });

  it('POST /api/db-verify/test rejects invalid input', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/db-verify/test')
      .set('x-internal-api-key', TEST_API_KEY)
      .send({
        host: '',
        database: 'app',
        username: 'root',
      })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/media-extract/analyze requires the internal key', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/media-extract/analyze')
      .send({ url: 'https://example.com/video.mp4' })
      .expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/media-extract/analyze rejects empty URL', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/media-extract/analyze')
      .set('x-internal-api-key', TEST_API_KEY)
      .send({ url: '   ' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/media-extract/download/:token requires internal key and rejects tampered tokens', async () => {
    await request(app.getHttpServer())
      .get('/api/media-extract/download/fake.token')
      .expect(401);

    const response = await request(app.getHttpServer())
      .get('/api/media-extract/download/fake.token')
      .set('x-internal-api-key', TEST_API_KEY)
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
