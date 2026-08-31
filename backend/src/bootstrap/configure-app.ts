import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { ZodValidationPipe } from 'nestjs-zod';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { RequestIdInterceptor } from '../common/interceptors/request-id.interceptor';
import { parseCorsOrigins, type EnvConfig } from '../config/env.validation';

export function isSwaggerEnabled(nodeEnv: string): boolean {
  return nodeEnv !== 'production';
}

export function configureApp(app: INestApplication): void {
  const configService = app.get(ConfigService<EnvConfig, true>);
  const nodeEnv = configService.get('NODE_ENV', { infer: true });
  const corsOrigin = configService.get('CORS_ORIGIN', { infer: true });
  const jsonBodyLimit = configService.get('JSON_BODY_LIMIT', { infer: true });

  app.use(
    helmet({
      contentSecurityPolicy: false,
      hsts: nodeEnv === 'production' ? { maxAge: 15_552_000, includeSubDomains: true } : false,
    }),
  );

  app.enableCors({
    origin: parseCorsOrigins(corsOrigin),
    credentials: true,
  });

  app.use(json({ limit: jsonBodyLimit }));
  app.use(urlencoded({ extended: false, limit: jsonBodyLimit }));

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new RequestIdInterceptor());

  if (isSwaggerEnabled(nodeEnv)) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Toolbox Labs API')
      .setDescription('API do Toolbox Labs')
      .setVersion('1.0.0')
      .addApiKey({ type: 'apiKey', name: 'x-internal-api-key', in: 'header' }, 'internal-api-key')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }
}
