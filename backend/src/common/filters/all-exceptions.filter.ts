import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';

export type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
};

type RequestWithId = Request & { id?: string };

const STATUS_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_ERROR',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'PAYLOAD_TOO_LARGE',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    const requestId = typeof request.id === 'string' ? request.id : 'unknown';

    const { status, code, message } = this.normalize(exception);

    const body: ErrorEnvelope = {
      error: {
        code,
        message,
        requestId,
      },
    };

    response.status(status).json(body);
  }

  private normalize(exception: unknown): { status: number; code: string; message: string } {
    if (exception instanceof ZodValidationException) {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: 'VALIDATION_ERROR',
        message: this.zodMessage(exception),
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        status,
        code: STATUS_CODES[status] ?? 'REQUEST_ERROR',
        message: this.httpMessage(exception, status),
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Erro interno do servidor.',
    };
  }

  private httpMessage(exception: HttpException, status: number): string {
    if (status >= 500) {
      return 'Erro interno do servidor.';
    }

    const payload = exception.getResponse();
    if (typeof payload === 'string' && payload.trim().length > 0) {
      return payload;
    }

    if (typeof payload === 'object' && payload !== null && 'message' in payload) {
      const value = (payload as { message?: unknown }).message;
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
      if (Array.isArray(value) && typeof value[0] === 'string') {
        return value[0];
      }
    }

    return exception.message;
  }

  private zodMessage(exception: ZodValidationException): string {
    const issues = exception.getZodError().issues;
    const first = issues[0]?.message;
    return typeof first === 'string' && first.length > 0 ? first : 'Dados invalidos.';
  }
}
