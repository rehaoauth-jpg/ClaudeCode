#!/bin/bash
set -e

DIR="$(dirname "$0")"
cd "$DIR"

echo ">>> Aktualna wersja: $(cat VERSION)"
echo ">>> Pobieranie zmian z GitHub..."
git pull

NEW_VERSION="$(cat VERSION)"
echo ">>> Nowa wersja: $NEW_VERSION"
echo ">>> Przebudowywanie kontenerów..."
APP_VERSION=$NEW_VERSION docker compose build --no-cache

echo ">>> Restartowanie kontenerów..."
APP_VERSION=$NEW_VERSION docker compose up -d

echo ""
echo "✓ Taskr v$NEW_VERSION działa na porcie 3000."
