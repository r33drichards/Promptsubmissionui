/**
 * HTTP client interface for making requests to the backend.
 * This abstraction allows for easy mocking and swapping of HTTP implementations.
 */

export interface HttpClient {
  /**
   * Makes a GET request to the specified URL
   */
  get<T = any>(url: string, config?: RequestConfig): Promise<HttpResponse<T>>;

  /**
   * Makes a POST request to the specified URL
   */
  post<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<HttpResponse<T>>;

  /**
   * Makes a PUT request to the specified URL
   */
  put<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<HttpResponse<T>>;

  /**
   * Makes a PATCH request to the specified URL
   */
  patch<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<HttpResponse<T>>;

  /**
   * Makes a DELETE request to the specified URL
   */
  delete<T = any>(
    url: string,
    config?: RequestConfig
  ): Promise<HttpResponse<T>>;
}

export interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
  signal?: AbortSignal;
}

export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
