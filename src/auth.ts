import type { ApiClient } from "./api-client.js";
import type { OAuthTokenResponse, TokenInfo, User } from "./types.js";

export class AuthManager {
  private clientId: string;
  private clientSecret: string;

  constructor(
    private apiClient: ApiClient,
    clientId?: string,
    clientSecret?: string,
  ) {
    this.clientId = clientId || process.env.PROCUREMENTEXPRESS_CLIENT_ID || "";
    this.clientSecret = clientSecret || process.env.PROCUREMENTEXPRESS_CLIENT_SECRET || "";
  }

  isV1(): boolean {
    return this.apiClient.getApiVersion() === "v1";
  }

  /**
   * V1 authentication: Set the static auth token and company ID directly.
   */
  authenticateV1(authToken: string, companyId: string): void {
    this.apiClient.setToken(authToken);
    this.apiClient.setCompanyId(companyId);
  }

  /**
   * V3 authentication: OAuth2 password grant.
   */
  async authenticateV3(email: string, password: string): Promise<OAuthTokenResponse> {
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

  /**
   * Validate the current token.
   * V1: Calls /api/v1/currentuser to verify the token works.
   * V3: Calls /oauth/token/info for token metadata.
   */
  async validateToken(): Promise<TokenInfo | User> {
    if (this.isV1()) {
      return this.apiClient.get<User>(this.apiClient.buildPath("/currentuser"));
    }
    return this.apiClient.get<TokenInfo>("/oauth/token/info");
  }

  /**
   * Revoke the current token.
   * V1: Just clears the local token (V1 tokens are static).
   * V3: Calls /oauth/revoke then clears the local token.
   */
  async revokeToken(): Promise<void> {
    if (!this.isV1()) {
      await this.apiClient.post("/oauth/revoke", {
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });
    }
    this.apiClient.clearToken();
  }
}
