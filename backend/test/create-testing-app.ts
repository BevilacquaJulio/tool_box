import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap/configure-app';

export const TEST_API_KEY = 'test-internal-api-key-32-chars-min';

export async function createTestingApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication({
    bodyParser: false,
  });
  configureApp(app);
  await app.init();
  return app;
}
