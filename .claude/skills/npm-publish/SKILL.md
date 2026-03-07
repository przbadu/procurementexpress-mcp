---
name: npm-publish
description: Bump package version, create a git tag, and publish to npm. Use when the user asks to "publish", "release", "bump version", "npm publish", "create a release", "tag and publish", "/npm-publish", "new version", or any variation of releasing/publishing the package to npm.
---

# npm Publish

Bump the version in package.json, create a git tag, and publish `@procurementexpress.com/mcp` to npm.

## Workflow

### 1. Pre-flight checks

Run these in parallel:
- `git status` — working tree must be clean (no uncommitted changes)
- `git branch --show-current` — must be on `main` branch
- `npm test` — all tests must pass

If any check fails, stop and tell the user what to fix.

**Version check:** Compare the current version in package.json against the latest published version:

```bash
npm view @procurementexpress.com/mcp version
```

If the versions match (not yet bumped), stop and tell the user to run `/bump-version` first to bump the version, commit, and merge a PR to `main` before publishing.

### 2. Get npm token

Ask the user for their npm auth token. They can find or generate one at: https://www.npmjs.com/settings/~/tokens

Store it for use in the publish step. **Never commit or log the token.**

### 3. Tag and publish

Run these commands sequentially:

```bash
# Create git tag for current version
git tag -a "v$(node -p "require('./package.json').version")" -m "v$(node -p "require('./package.json').version")"

# Push the tag to remote
git push origin --tags

# Build and publish with auth token
npm publish --//registry.npmjs.org/:_authToken=<npm_token>
```

**If publish fails with 404 or auth error:**
1. Ask the user to verify their token is valid and has publish permissions
2. Suggest regenerating the token at https://www.npmjs.com/settings/~/tokens
3. Ensure the token has the correct scope for `@procurementexpress.com`
4. Retry with the new token

### 4. Verify

After publishing, confirm success:

```bash
npm view @procurementexpress.com/mcp version
```

Report the published version and the npm package URL: https://www.npmjs.com/package/@procurementexpress.com/mcp
