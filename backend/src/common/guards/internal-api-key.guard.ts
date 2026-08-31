import { createHash, timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { EnvConfig } from '../../config/env.validation';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export function safeEqual(provided: string, expected: string): boolean {
  const providedDigest = createHash('sha256').update(provided).digest();
  const expectedDigest = createHash('sha256').update(expected).digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers['x-internal-api-key'];
    const expected = this.configService.get('INTERNAL_API_KEY', { infer: true });

    if (typeof provided !== 'string' || !safeEqual(provided, expected)) {
      throw new UnauthorizedException('Chave interna invalida ou ausente.');
    }

    return true;
  }
}
