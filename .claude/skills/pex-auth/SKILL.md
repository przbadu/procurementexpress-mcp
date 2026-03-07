---
name: pex:auth
description: >
  ProcurementExpress authentication and user profile management. Use when authenticating
  to the ProcurementExpress API (V1 static token or V3 OAuth2 login), validating or revoking
  tokens, or managing the current user's profile. Routes to MCP tools: authenticate,
  validate_token, revoke_token, get_current_user, update_current_user. Triggers on: login,
  sign in, authenticate, token, session, user profile, my account, change password.
---

# ProcurementExpress Authentication

## Prerequisites

Authentication is ALWAYS required before any other ProcurementExpress MCP tool call.
After authenticating, call `set_active_company` (pex-companies skill) to set the working company.

## Authentication Modes

The API version is set via `PROCUREMENTEXPRESS_API_VERSION` env var (`v1` or `v3`, default: `v1`).

### V1 Authentication (Static Token)

Call `authenticate` with:
- `authentication_token` (optional if `PROCUREMENTEXPRESS_AUTH_TOKEN` env var is set)
- `company_id` (optional if `PROCUREMENTEXPRESS_COMPANY_ID` env var is set)

V1 tokens never expire. If both env vars are set, calling `authenticate` with no args works.

### V3 Authentication (OAuth2)

Call `authenticate` with:
- `email` (required) — user's email address
- `password` (required) — user's password

Returns an access token with expiry time. V3 requires `PROCUREMENTEXPRESS_CLIENT_ID` and
`PROCUREMENTEXPRESS_CLIENT_SECRET` env vars for the OAuth2 client credentials.

**Note:** OTP/2FA is not currently supported by the MCP server. If the user's account has
2FA enabled, V1 authentication with a static token should be used instead.

## Tools Reference

### authenticate
Authenticate to the ProcurementExpress API.
- **V1 params:** `authentication_token` (optional), `company_id` (optional)
- **V3 params:** `email` (required), `password` (required)
- **Returns:** Confirmation message (V1) or token with expiry info (V3)

### validate_token
Check if the current authentication token is valid.
- **Params:** None
- **Returns:** V1 returns `User` object, V3 returns `TokenInfo` (resource_owner_id, scopes, expires_in_seconds)

### revoke_token
End the current session.
- **Params:** None
- **V1:** Clears token locally (no server call)
- **V3:** Revokes token on server via OAuth2 revocation endpoint, then clears locally

### get_current_user
Get the authenticated user's profile including company memberships and roles.
- **Params:** None
- **Returns:** `User` object with fields: id, email, name, phone_number, setup_incomplete, employer_id, approval_limit, companies[]
- Each company in `companies[]` has: id, name, roles[], is_locked, in_trial, trial_expired, remaining_trial_days

### update_current_user
Update the authenticated user's profile.
- **Params (all optional):** `email`, `name`, `first_name`, `last_name`, `phone_number`, `password`, `password_confirmation`
- When changing password, both `password` and `password_confirmation` are required
- **Returns:** Updated `User` object

## Typical Workflow

```
1. authenticate → get session
2. get_current_user → see available companies
3. set_active_company (pex-companies) → pick a company
4. Start using other ProcurementExpress tools
```
