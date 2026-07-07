import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../domain-error';
import { DomainExceptionFilter } from './domain-exception.filter';

describe('DomainExceptionFilter', () => {
  let filter: DomainExceptionFilter;
  let response: jest.Mocked<Pick<Response, 'status' | 'json'>>;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new DomainExceptionFilter();
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    host = createArgumentsHost(response as unknown as Response);
  });

  describe('catch', () => {
    it('maps DomainError to its business status code and message', () => {
      filter.catch(new DomainError('Insufficient balance', 400), host);

      expect(response.status).toHaveBeenCalledWith(400);
      expect(response.json).toHaveBeenCalledWith({
        statusCode: 400,
        message: 'Insufficient balance',
      });
    });

    it('passes Nest HttpException response through', () => {
      filter.catch(new BadRequestException('Invalid request'), host);

      expect(response.status).toHaveBeenCalledWith(400);
      expect(response.json).toHaveBeenCalledWith({
        message: 'Invalid request',
        error: 'Bad Request',
        statusCode: 400,
      });
    });

    it('maps unknown errors to internal server error response', () => {
      filter.catch(new Error('database failed'), host);

      expect(response.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(response.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
    });
  });
});

/**
 * 创建只包含异常过滤器所需 HTTP 上下文方法的 ArgumentsHost 替身。
 */
function createArgumentsHost(response: Response): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getResponse: () => response,
    }),
  } as ArgumentsHost;
}
