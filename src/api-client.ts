import type { ApiError } from "./types.js";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private companyId: string | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = (
      baseUrl || process.env.PE_API_BASE_URL || "https://app.procurementexpress.com"
    ).replace(/\/$/, "");
  }

  setToken(token: string): void {
    this.token = token;
  }

  clearToken(): void {
    this.token = null;
  }

  getToken(): string | null {
    return this.token;
  }

  setCompanyId(companyId: string): void {
    this.companyId = companyId;
  }

  getCompanyId(): string | null {
    return this.companyId;
  }

  private buildHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    if (this.companyId) {
      headers["app_company_id"] = this.companyId;
    }

    if (extraHeaders) {
      Object.assign(headers, extraHeaders);
    }

    return headers;
  }

  async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = this.buildHeaders(extraHeaders);

    const options: RequestInit = { method, headers };
    if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      let message: string;
      try {
        const errorBody = (await response.json()) as ApiError;
        message = errorBody.message || response.statusText;
      } catch {
        message = response.statusText;
      }
      throw new ApiClientError(response.status, `${response.status}: ${message}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  async get<T>(path: string, extraHeaders?: Record<string, string>): Promise<T> {
    return this.request<T>("GET", path, undefined, extraHeaders);
  }

  async post<T>(
    path: string,
    body?: Record<string, unknown>,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>("POST", path, body, extraHeaders);
  }

  async put<T>(
    path: string,
    body?: Record<string, unknown>,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>("PUT", path, body, extraHeaders);
  }

  async delete<T>(path: string, extraHeaders?: Record<string, string>): Promise<T> {
    return this.request<T>("DELETE", path, undefined, extraHeaders);
  }
}
