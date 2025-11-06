import {
  HttpClient,
  HttpResponse,
  HttpError as _HttpError,
  RequestConfig,
} from './types';

/**
 * Mock HTTP client for testing and development.
 * Replace this with a real implementation (e.g., axios-based) when the OpenAPI client is ready.
 */
export class MockHttpClient implements HttpClient {
  private baseURL: string;
  private defaultDelay: number;

  constructor(
    baseURL: string = 'http://localhost:8000/api',
    defaultDelay: number = 500
  ) {
    this.baseURL = baseURL;
    this.defaultDelay = defaultDelay;
  }

  async get<T = any>(
    url: string,
    config?: RequestConfig
  ): Promise<HttpResponse<T>> {
    return this.mockRequest<T>('GET', url, undefined, config);
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<HttpResponse<T>> {
    return this.mockRequest<T>('POST', url, data, config);
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<HttpResponse<T>> {
    return this.mockRequest<T>('PUT', url, data, config);
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<HttpResponse<T>> {
    return this.mockRequest<T>('PATCH', url, data, config);
  }

  async delete<T = any>(
    url: string,
    config?: RequestConfig
  ): Promise<HttpResponse<T>> {
    return this.mockRequest<T>('DELETE', url, undefined, config);
  }

  private async mockRequest<T>(
    method: string,
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<HttpResponse<T>> {
    // Simulate network delay
    await this.delay(this.defaultDelay);

    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;

    console.log(`[MockHttpClient] ${method} ${fullUrl}`, {
      data,
      config,
    });

    // Simulate different responses based on the URL
    const mockData = this.getMockData<T>(method, url, data);

    return {
      data: mockData,
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json',
      },
    };
  }

  private getMockData<T>(method: string, url: string, data?: any): T {
    // Return mock data based on the endpoint
    // This can be expanded as needed

    if (url.includes('/sessions') && method === 'GET') {
      return [] as T; // Return empty array for sessions list
    }

    if (url.includes('/sessions') && method === 'POST') {
      return {
        id: crypto.randomUUID(),
        ...data,
        createdAt: new Date().toISOString(),
        inboxStatus: 'pending',
      } as T;
    }

    if (url.match(/\/sessions\/[^/]+$/) && method === 'GET') {
      return {
        id: url.split('/').pop(),
        title: 'Mock Session',
        repo: 'mock/repo',
        branch: 'main',
        targetBranch: 'main',
        inboxStatus: 'pending',
        createdAt: new Date().toISOString(),
      } as T;
    }

    if (url.includes('/sessions') && (method === 'PUT' || method === 'PATCH')) {
      return {
        ...data,
        updatedAt: new Date().toISOString(),
      } as T;
    }

    if (method === 'DELETE') {
      return { success: true } as T;
    }

    // Default mock response
    return { message: 'Mock response', data } as T;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
