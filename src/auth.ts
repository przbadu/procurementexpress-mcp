import type { ApiClient } from "./api-client.js";
import type { OAuthTokenResponse, TokenInfo } from "./types.js";

export class AuthManager {
  private clientId: string;
  private clientSecret: string;

  constructor(
    private apiClient: ApiClient,
    clientId?: string,
    clientSecret?: string,
  ) {
    this.clientId = clientId || process.env.PE_CLIENT_ID || "";
    this.clientSecret = clientSecret || process.env.PE_CLIENT_SECRET || "";
  }

  async authenticate(email: string, password: string): Promise<OAuthTokenResponse> {
    const response = await this.apiClient.post<OAuthTokenResponse>("/oauth/token", {
      email,
      password,
      grant_type: "password",
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    this.apiClient.setToken(response.access_token);
    return response;
  }

  async validateToken(): Promise<TokenInfo> {
    return this.apiClient.get<TokenInfo>("/oauth/token/info");
  }

  async revokeToken(): Promise<void> {
    await this.apiClient.post("/oauth/revoke", {
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });
    this.apiClient.clearToken();
  }
}
