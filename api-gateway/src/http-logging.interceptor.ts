import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { trace } from '@opentelemetry/api';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType<string>() !== 'http') {
      return next.handle();
    }
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const { method, url } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - start;
        const span = trace.getActiveSpan();
        const traceId = span?.spanContext()?.traceId ?? null;
        process.stdout.write(
          JSON.stringify({
            level: 'info',
            message: `${method} ${url} ${res.statusCode} ${durationMs}ms`,
            method,
            path: url,
            statusCode: res.statusCode,
            durationMs,
            traceId,
            timestamp: new Date().toISOString(),
          }) + '\n',
        );
      }),
      catchError((err) => {
        const durationMs = Date.now() - start;
        const statusCode = err.status ?? 500;
        const span = trace.getActiveSpan();
        const traceId = span?.spanContext()?.traceId ?? null;
        process.stdout.write(
          JSON.stringify({
            level: 'error',
            message: `${method} ${url} ${statusCode} ${durationMs}ms`,
            method,
            path: url,
            statusCode,
            durationMs,
            traceId,
            error: err.message,
            timestamp: new Date().toISOString(),
          }) + '\n',
        );
        return throwError(() => err);
      }),
    );
  }
}
