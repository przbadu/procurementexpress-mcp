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
- `npm whoami` — must be logged in to npm
- `npm test` — all tests must pass

If any check fails, stop and tell the user what to fix.

### 2. Determine version bump

Ask the user which bump type they want:

| Type | When to use |
|------|-------------|
| `patch` (1.0.0 → 1.0.1) | Bug fixes, documentation changes |
| `minor` (1.0.0 → 1.1.0) | New tools, features, backwards-compatible changes |
| `major` (1.0.0 → 2.0.0) | Breaking changes to existing tools |

Show the current version from package.json and what the new version will be.

### 3. Bump, tag, and publish

Run these commands sequentially:

```bash
# Bump version in package.json and create git tag
npm version <patch|minor|major> -m "v%s"

# Push the commit and tag to remote
git push && git push --tags

# Publish to npm (prepublishOnly will auto-build)
npm publish
```

### 4. Verify

After publishing, confirm success:

```bash
npm view @procurementexpress.com/mcp version
```

Report the published version and the npm package URL: https://www.npmjs.com/package/@procurementexpress.com/mcp
