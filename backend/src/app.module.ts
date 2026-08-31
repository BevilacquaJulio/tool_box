import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { InternalApiKeyGuard } from './common/guards/internal-api-key.guard';
import { validateEnv, type EnvConfig } from './config/env.validation';
import { DbVerifyModule } from './modules/db-verify/db-verify.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvConfig, true>) => {
        const nodeEnv = configService.get('NODE_ENV', { infer: true });
        return {
          pinoHttp: {
            level: nodeEnv === 'test' ? 'silent' : nodeEnv === 'production' ? 'info' : 'debug',
            genReqId: (req, res) => {
              const header = req.headers['x-request-id'];
              const id =
                typeof header === 'string' && header.trim().length > 0
                  ? header.trim().slice(0, 128)
                  : randomUUID();
              res.setHeader('x-request-id', id);
              return id;
            },
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.headers["x-internal-api-key"]',
                'req.headers["x-api-key"]',
                'req.body.password',
                'res.headers["set-cookie"]',
              ],
            },
            serializers: {
              req(request) {
                return {
                  id: request.id,
                  method: request.method,
                  url: request.url,
                };
              },
            },
          },
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvConfig, true>) => [
        {
          ttl: configService.get('THROTTLE_TTL_MS', { infer: true }),
          limit: configService.get('THROTTLE_LIMIT', { infer: true }),
        },
      ],
    }),
    HealthModule,
    DbVerifyModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: InternalApiKeyGuard,
    },
  ],
})
export class AppModule {}
