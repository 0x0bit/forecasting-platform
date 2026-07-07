export class DomainError extends Error {
  /**
   * 创建业务异常，并携带要返回给 HTTP 客户端的状态码。
   */
  constructor(
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
  }
}
