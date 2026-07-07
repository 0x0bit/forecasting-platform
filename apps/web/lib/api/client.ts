// API 请求客户端文件，封装基础地址、请求头、错误处理和 JSON 解析。
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api';

type RequestOptions = RequestInit & {
  idempotencyKey?: string;
};

export class ApiError extends Error {
  /**
   * 包装后端错误响应，保留 HTTP 状态码供页面展示。
   */
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

/**
 * 发送 JSON 请求，统一处理 Content-Type、幂等 Key、缓存和错误响应。
 */
export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.idempotencyKey) {
    headers.set('Idempotency-Key', options.idempotencyKey);
  }

  // 前端每次操作后都会刷新真实后端状态，所以这里关闭浏览器缓存。
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store'
  });
  const payload = (await response.json().catch(() => null)) as { message?: string } | T | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload && payload.message
        ? payload.message
        : `Request failed with ${response.status}`;
    throw new ApiError(String(message), response.status);
  }

  return payload as T;
}
