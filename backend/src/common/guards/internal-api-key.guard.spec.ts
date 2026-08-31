import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { EnvConfig } from '../../config/env.validation';
import { InternalApiKeyGuard, safeEqual } from './internal-api-key.guard';

describe('InternalApiKeyGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  const configService = {
    get: jest.fn().mockReturnValue('test-internal-api-key-32-chars-min'),
  } as unknown as ConfigService<EnvConfig, true>;

  const guard = new InternalApiKeyGuard(reflector, configService);

  function contextWithHeader(value: string | undefined): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          headers: value === undefined ? {} : { 'x-internal-api-key': value },
        }),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
  });

  it('allows public routes without a key', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);
    expect(guard.canActivate(contextWithHeader(undefined))).toBe(true);
  });

  it('rejects missing or wrong keys', () => {
    expect(() => guard.canActivate(contextWithHeader(undefined))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(contextWithHeader('wrong-key'))).toThrow(UnauthorizedException);
  });

  it('accepts the configured key', () => {
    expect(guard.canActivate(contextWithHeader('test-internal-api-key-32-chars-min'))).toBe(true);
  });

  it('compares keys in a length-independent way', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
