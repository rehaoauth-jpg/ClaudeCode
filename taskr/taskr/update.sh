#!/bin/bash
set -e

DIR="$(dirname "$0")"
cd "$DIR"

CURRENT_VERSION="$(cat VERSION)"
echo ">>> Current version: v$CURRENT_VERSION"

echo ">>> Checking for updates..."
git fetch origin master --quiet

REMOTE_VERSION="$(git show origin/master:taskr/taskr/VERSION 2>/dev/null || echo $CURRENT_VERSION)"

if [ "$CURRENT_VERSION" = "$REMOTE_VERSION" ]; then
  echo ">>> Already up to date. Taskr v$CURRENT_VERSION is the latest version."
  exit 0
fi

echo ">>> New version available: v$REMOTE_VERSION. Updating..."
git pull

echo ">>> Rebuilding containers..."
APP_VERSION=$REMOTE_VERSION docker compose build --no-cache

echo ">>> Restarting containers..."
APP_VERSION=$REMOTE_VERSION docker compose up -d

echo ""
echo "✓ Updated Taskr v$CURRENT_VERSION → v$REMOTE_VERSION"
