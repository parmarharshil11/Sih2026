import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    // 1. Handle standard HttpExceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      message = exceptionResponse?.message || exception.message;
    } 
    // 2. Handle Prisma known request errors
    else if (
      exception &&
      typeof exception === 'object' &&
      (exception as any).constructor?.name === 'PrismaClientKnownRequestError'
    ) {
      const prismaError = exception as any;
      if (prismaError.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'A record with this value already exists';
      } else if (prismaError.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Resource not found';
      }
      this.logger.error(
        `Prisma error ${prismaError.code} on ${request.method} ${request.url}`,
        prismaError.message,
      );
    }
    // 3. Handle malformed JSON body
    else if (exception instanceof SyntaxError && (exception as any).status === 400) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Malformed request body';
    } 
    // 4. Handle all other unhandled exceptions (log stack trace, hide from client)
    else {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    // Format final response without leaking internals
    response.status(status).json({
      error: {
        code: status,
        message: Array.isArray(message) ? message.join(', ') : message,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
      data: null,
      meta: null,
    });
  }
}
