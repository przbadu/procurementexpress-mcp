---
name: bump-version
description: Bump the npm package version, commit, and create a PR for merging before publishing. Use when the user asks to "bump version", "bump the version", "prepare a release", "version bump", "/bump-version", or when `/npm-publish` is invoked but the version hasn't been bumped yet. This skill ensures the version is incremented, committed, and merged to main via PR before publishing.
---

# Bump Version

Bump the package version in package.json, commit the change, create a pull request, and guide the user to merge before publishing.

## Workflow

### 1. Pre-flight checks

Run in parallel:
- `git status` — working tree must be clean
- `git branch --show-current` — note the current branch

If the working tree is dirty, stop and tell the user to commit or stash changes first.

### 2. Determine version bump

Read the current version from package.json and ask the user which bump type:

| Type | When to use |
|------|-------------|
| `patch` (1.0.0 → 1.0.1) | Bug fixes, documentation changes |
| `minor` (1.0.0 → 1.1.0) | New tools, features, backwards-compatible changes |
| `major` (1.0.0 → 2.0.0) | Breaking changes to existing tools |

Show the current version and what the new version will be.

### 3. Create a release branch and bump

```bash
# Create and switch to release branch
git checkout -b release/v<new-version>

# Bump version in package.json (no git tag yet — tag after merge)
npm version <patch|minor|major> --no-git-tag-version
```

### 4. Commit the change

Stage the version bump and use the `/commit` skill:

```bash
git add package.json package-lock.json
```

Then invoke `/commit` — the commit message should follow the pattern: `Bump version to <new-version>`

### 5. Push and create PR

```bash
# Push the release branch
git push -u origin release/v<new-version>

# Create PR targeting main
gh pr create --base main --title "Release v<new-version>" --body "Bump package version to <new-version> for npm publish."
```

If `gh` CLI is not available, provide the GitHub URL for manual PR creation.

### 6. Guide user to merge and publish

Tell the user:

> PR created. Please review and merge the PR to `main`, then run `/npm-publish` to publish the new version to npm.

Do NOT proceed with publishing — the user must merge the PR first.

## Rules

- Never create a git tag during bump — `/npm-publish` handles tagging after merge.
- Always use `--no-git-tag-version` with `npm version` to avoid premature tags.
- Always create a PR targeting `main` — never push directly to main.
- If already on a feature branch, create the release branch from it and target main.
