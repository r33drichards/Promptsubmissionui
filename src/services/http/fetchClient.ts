import { HttpClient, HttpResponse, HttpError, RequestConfig } from './types';

/**
 * HTTP client implementation using the native fetch API.
 * Provides a consistent interface for making HTTP requests to the backend.
 */
export class FetchHttpClient implements HttpClient {
  constructor(private baseURL: string = '') {}

  async get<T = any>(url: string, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>('GET', url, undefined, config);
  }

  async post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>('POST', url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>('PUT', url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>('PATCH', url, data, config);
  }

  async delete<T = any>(url: string, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', url, undefined, config);
  }

  private async request<T>(
    method: string,
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<HttpResponse<T>> {
    const fullUrl = this.buildUrl(url, config?.params);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config?.headers,
    };

    const init: {
      method: string;
      headers: Record<string, string>;
      body?: string;
      signal?: AbortSignal;
    } = {
      method,
      headers,
      signal: config?.signal,
    };

    if (data !== undefined) {
      init.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(fullUrl, init);

      // Parse response body
      let responseData: T;
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text() as any;
      }

      // Convert headers to object
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const httpResponse: HttpResponse<T> = {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      };

      // Throw error for non-2xx responses
      if (!response.ok) {
        throw new HttpError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          responseData
        );
      }

      return httpResponse;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      if (error instanceof Error) {
        throw new HttpError(error.message, 0);
      }

      throw new HttpError('Unknown error occurred', 0);
    }
  }

  private buildUrl(url: string, params?: Record<string, any>): string {
    const fullUrl = this.baseURL + url;

    if (!params || Object.keys(params).length === 0) {
      return fullUrl;
    }

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `${fullUrl}?${queryString}` : fullUrl;
  }
}
