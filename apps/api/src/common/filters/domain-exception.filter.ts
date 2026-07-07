import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../domain-error';

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  /**
   * 将业务异常、Nest HTTP 异常和未知异常统一转换成 JSON 响应。
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof DomainError) {
      response.status(exception.statusCode).json({
        statusCode: exception.statusCode,
        message: exception.message,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      response.status(status).json(exception.getResponse());
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }
}
