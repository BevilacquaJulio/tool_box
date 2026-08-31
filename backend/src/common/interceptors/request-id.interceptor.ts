import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { resolveRequestId } from '../request-id';

type RequestWithId = Request & { id?: string };

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();
    const id = request.id ?? resolveRequestId(request.headers['x-request-id']);

    request.id = id;
    response.setHeader('x-request-id', id);

    return next.handle();
  }
}
