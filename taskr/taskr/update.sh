#!/bin/bash
set -e

DIR="$(dirname "$0")"
cd "$DIR"

CURRENT_VERSION="$(cat VERSION)"
echo ">>> Aktualna wersja: v$CURRENT_VERSION"

echo ">>> Sprawdzanie aktualizacji..."
git fetch origin master --quiet

REMOTE_VERSION="$(git show origin/master:taskr/taskr/VERSION 2>/dev/null || echo $CURRENT_VERSION)"

if [ "$CURRENT_VERSION" = "$REMOTE_VERSION" ]; then
  echo ">>> Brak aktualizacji. Taskr v$CURRENT_VERSION jest aktualny."
  exit 0
fi

echo ">>> Dostępna nowa wersja: v$REMOTE_VERSION. Aktualizuję..."
git pull

echo ">>> Przebudowywanie kontenerów..."
APP_VERSION=$REMOTE_VERSION docker compose build --no-cache

echo ">>> Restartowanie kontenerów..."
APP_VERSION=$REMOTE_VERSION docker compose up -d

echo ""
echo "✓ Zaktualizowano Taskr v$CURRENT_VERSION → v$REMOTE_VERSION"
