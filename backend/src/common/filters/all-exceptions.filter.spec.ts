import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  function hostWith(statusSpy: jest.Mock, jsonSpy: jest.Mock, requestId = 'req-1'): ArgumentsHost {
    return {
      switchToHttp: () => ({
        getResponse: () => ({
          status: statusSpy.mockReturnValue({ json: jsonSpy }),
        }),
        getRequest: () => ({ id: requestId }),
      }),
    } as unknown as ArgumentsHost;
  }

  it('returns a sanitized envelope for unknown errors', () => {
    const status = jest.fn();
    const json = jest.fn();
    filter.catch(new Error('Prisma query failed on table users'), hostWith(status, json));

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor.',
        requestId: 'req-1',
      },
    });
  });

  it('keeps client HttpException messages for 4xx', () => {
    const status = jest.fn();
    const json = jest.fn();
    filter.catch(new HttpException('Chave interna invalida ou ausente.', 401), hostWith(status, json));

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Chave interna invalida ou ausente.',
        requestId: 'req-1',
      },
    });
  });
});
