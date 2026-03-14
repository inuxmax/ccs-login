#!/bin/bash
# Dev Release Script
# Calculates version based on current stable, not semantic-release's predicted next version.
# Pattern: {stable}-dev.{N} where N increments for each dev release.
#
# Example:
#   main at v6.7.1 → dev releases: 6.7.1-dev.1, 6.7.1-dev.2, ...
#   main releases v6.7.2 → dev releases: 6.7.2-dev.1, 6.7.2-dev.2, ...

set -euo pipefail

# Colors for output (respects NO_COLOR)
if [[ -z "${NO_COLOR:-}" ]] && [[ -t 1 ]]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  NC='\033[0m'
else
  RED=''
  GREEN=''
  YELLOW=''
  NC=''
fi

log_info() { echo -e "${GREEN}[i]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[X]${NC} $1"; }

# Ensure we have the latest tags
git fetch --tags origin main

# Get latest stable tag from main (exclude prereleases like -dev, -beta, -rc)
# Match only clean semver tags: vX.Y.Z
STABLE_TAG=$(git tag -l "v[0-9]*.[0-9]*.[0-9]" --merged origin/main --sort=-v:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1 || echo "")

if [ -z "$STABLE_TAG" ]; then
  log_warn "No stable tags found on main, defaulting to v0.0.0"
  STABLE_TAG="v0.0.0"
fi

STABLE=${STABLE_TAG#v}
log_info "Current stable version: ${STABLE}"

# Find latest dev tag for this stable version
LATEST_DEV=$(git tag -l "v${STABLE}-dev.*" --sort=-v:refname | head -1 || echo "")

# Calculate next dev number
if [ -z "$LATEST_DEV" ]; then
  DEV_NUM=1
  log_info "No existing dev tags for ${STABLE}, starting at dev.1"
else
  DEV_NUM=$(echo "$LATEST_DEV" | sed 's/.*dev\.\([0-9]*\)/\1/')
  DEV_NUM=$((DEV_NUM + 1))
  log_info "Latest dev tag: ${LATEST_DEV}, incrementing to dev.${DEV_NUM}"
fi

VERSION="${STABLE}-dev.${DEV_NUM}"
log_info "New version: ${VERSION}"

# Check if tag already exists (safety check)
if git rev-parse "v${VERSION}" >/dev/null 2>&1; then
  log_error "Tag v${VERSION} already exists!"
  exit 1
fi

# Update package.json
npm version "$VERSION" --no-git-tag-version
log_info "Updated package.json to ${VERSION}"

# Configure git for GitHub Actions
git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"

# Commit version change
git add package.json
git commit -m "chore(release): ${VERSION} [skip ci]"
log_info "Created release commit"

# Create tag
git tag "v${VERSION}"
log_info "Created tag v${VERSION}"

# Push commit and tag
git push origin dev
git push origin "v${VERSION}"
log_info "Pushed to origin"

# Publish to npm with dev tag
npm publish --tag dev
log_info "Published to npm with @dev tag"

# Generate release notes from commits since last tag
PREV_TAG=$(git tag -l "v*" --sort=-v:refname | sed -n '2p' || echo "")
if [ -n "$PREV_TAG" ]; then
  # Get commits between previous tag and the one before our release commit
  NOTES=$(git log --pretty=format:"- %s" "${PREV_TAG}..HEAD~1" 2>/dev/null | grep -v "chore(release):" | head -15 || echo "- Dev release")
else
  NOTES="- Dev release based on ${STABLE}"
fi

# Create GitHub prerelease
gh release create "v${VERSION}" \
  --title "v${VERSION}" \
  --notes "${NOTES}" \
  --prerelease

log_info "Created GitHub prerelease"

# Save release info for Discord notification
# This file is read by send-discord-release.cjs for dev releases
cat > .dev-release-info.json << EOF
{
  "version": "${VERSION}",
  "notes": $(echo "$NOTES" | jq -Rs .)
}
EOF
log_info "Saved release info for Discord notification"

# Output for GitHub Actions
echo "version=${VERSION}" >> "${GITHUB_OUTPUT:-/dev/null}"
echo "released=true" >> "${GITHUB_OUTPUT:-/dev/null}"

log_info "Dev release ${VERSION} complete!"
