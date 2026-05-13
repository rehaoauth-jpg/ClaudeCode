#!/bin/bash
set -e

echo ">>> Pobieranie zmian z GitHub..."
cd "$(dirname "$0")"
git pull

echo ">>> Przebudowywanie kontenerów..."
docker compose build --no-cache

echo ">>> Restartowanie kontenerów..."
docker compose up -d

echo ">>> Gotowe! Taskr działa na porcie 3000."
