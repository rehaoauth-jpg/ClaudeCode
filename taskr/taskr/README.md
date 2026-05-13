# Taskr — Full-Stack Task Manager

Aplikacja do zarządzania zadaniami z backendem Node.js + SQLite, real-time WebSocket sync, drag & drop Kanban i interfejsem inspirowanym iOS 26.

## Stack technologiczny

| Warstwa | Technologia |
|---------|------------|
| Frontend | HTML + Vanilla JS, PWA, Service Worker |
| Backend | Node.js 20 + Express 4 |
| Baza danych | SQLite (better-sqlite3) — jeden plik, zero konfiguracji |
| Real-time | WebSockets (ws library) |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Reverse proxy | Nginx |
| Kontenery | Docker + docker-compose |

## Funkcje

### Zadania
- Tworzenie, edycja, usuwanie zadań
- Priorytety: wysoki / średni / niski / brak
- Statusy: Do zrobienia / W toku / Recenzja / Gotowe
- Tagi (wiele tagów na zadanie)
- Terminy wykonania z oznaczeniem przeterminowanych
- Przypisywanie zadań innym użytkownikom
- Podzadania (subtaski) z progress ringiem
- Komentarze do zadań
- Historia zmian (activity log)
- Wyszukiwanie i filtrowanie

### Widoki
- **Pulpit** — statystyki + lista lub kanban
- **Lista** — grupowanie wg statusu, filtry, wyszukiwarka
- **Kanban** — drag & drop między kolumnami
- **Kalendarz** — kolorowe kropki dla zadań z terminem
- **Aktywność** — feed wszystkich akcji
- **Admin** — zarządzanie użytkownikami

### Użytkownicy
- Logowanie JWT (token ważny 7 dni)
- Role: admin / user
- Admin może: dodawać użytkowników, edytować role, resetować hasła, usuwać konta
- Każdy user może zmienić własne hasło i dostosować profil (kolor avatara)

### Real-time sync
- WebSocket — wszystkie zmiany propagują się do wszystkich zalogowanych użytkowników natychmiast
- Toast notyfikacje przy zmianach od innych użytkowników

### PWA (iPhone)
- Installable jako aplikacja na ekranie głównym (iOS Safari → Udostępnij → Dodaj do ekranu)
- Service Worker cache — działa offline (tylko UI; dane wymagają połączenia)
- Dopasowany viewport-fit i safe-area-inset

---

## Konta demo (seed przy pierwszym uruchomieniu)

| Login | Hasło | Rola |
|-------|-------|------|
| admin | admin123 | Administrator |
| jan | user123 | Użytkownik |
| anna | user123 | Użytkownik |

---

## Szybki start (lokalnie)

```bash
git clone / rozpakuj taskr/
cd taskr
docker-compose up --build
```

Aplikacja dostępna na: **http://localhost:3000**

---

## Deployment na Proxmox

### Opcja A — Docker w kontenerze LXC (zalecana)

1. **Utwórz LXC** w Proxmox (Ubuntu 22.04 lub Debian 12):
   - CPU: 1 rdzeń
   - RAM: 256 MB (512 MB zalecane)
   - Dysk: 4 GB
   - Sieć: bridge do LAN, stałe IP (np. 192.168.1.50)

2. **Zainstaluj Docker** w LXC:
```bash
apt update && apt install -y curl
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin
```

3. **Skopiuj pliki** na serwer:
```bash
# Z Twojego komputera:
scp -r taskr/ root@192.168.1.50:/opt/taskr/
```

4. **Ustaw JWT_SECRET** w `docker-compose.yml` — zmień na losowy string:
```bash
# Wygeneruj bezpieczny secret:
openssl rand -hex 32
```

5. **Uruchom**:
```bash
cd /opt/taskr
docker compose up -d --build
```

6. **Sprawdź logi**:
```bash
docker compose logs -f
```

### Opcja B — Nginx Proxy Manager (domena + HTTPS)

Jeśli masz już NPM na Proxmox:
- Utwórz Proxy Host → `192.168.1.50:3000`
- Włącz SSL przez Let's Encrypt (np. przez Cloudflare DNS challenge)
- Aplikacja dostępna pod `https://taskr.twojadomena.pl`

---

## Backup danych

Dane SQLite są w Docker volume `taskr-data`. Backup:

```bash
# Jednorazowy backup bazy danych:
docker run --rm -v taskr_taskr-data:/data -v $(pwd):/backup alpine \
  cp /data/taskr.db /backup/taskr-backup-$(date +%Y%m%d).db

# Cron co noc o 3:00 (dodaj do crontab):
0 3 * * * docker run --rm -v taskr_taskr-data:/data -v /opt/backups:/backup alpine cp /data/taskr.db /backup/taskr-$(date +\%Y\%m\%d).db
```

---

## Aktualizacja

```bash
cd /opt/taskr
git pull   # lub skopiuj nowe pliki
docker compose up -d --build
```

Dane w volume są bezpieczne — nie są kasowane przy rebuildzie.

---

## Zmienne środowiskowe (backend)

| Zmienna | Domyślna | Opis |
|---------|----------|------|
| PORT | 4000 | Port API |
| DB_PATH | /data/taskr.db | Ścieżka do bazy SQLite |
| JWT_SECRET | taskr-secret-... | Sekret JWT — ZMIEŃ W PRODUKCJI |

---

## Struktura projektu

```
taskr/
├── backend/
│   ├── server.js          # Express + SQLite + WebSocket API
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── public/
│   │   ├── index.html     # Cała aplikacja SPA
│   │   ├── manifest.json  # PWA manifest
│   │   └── sw.js          # Service Worker
│   ├── nginx.conf         # Nginx z proxy do API + WS
│   └── Dockerfile
└── docker-compose.yml
```
