# Taskr — Full-Stack Task Manager

> **Aktualna wersja: v1.0.9**

Aplikacja do zarządzania zadaniami z backendem Node.js + SQLite, real-time WebSocket sync, drag & drop Kanban i interfejsem inspirowanym iOS 26.

---

## Changelog

### v1.0.9 — 2026-05-13
- **Fix:** PWA wypełnia cały ekran — `window.innerHeight` ustawia zmienną `--vh` przez JS, co jest jedyną niezawodną metodą na iOS gdzie `100vh`/`100%` zwracają błędne wartości w trybie standalone.

### v1.0.8 — 2026-05-13
- **Fix:** Usunięto rosnący pusty obszar na dole w PWA — `-webkit-fill-available` było stosowane wielokrotnie na `html`, `body` i `#app` jednocześnie, powodując mnożenie wartości. Uproszczono do `height: 100%` na każdym poziomie.

### v1.0.7 — 2026-05-13
- **Fix:** Modal tworzenia zadania nie wychodzi już poza górną belkę w PWA — `.modal-bg` zaczyna poniżej topbara.
- **Fix:** Usunięto puste miejsce na dole w PWA — padding treści uwzględnia `env(safe-area-inset-bottom)`.
- **Fix:** Wyłączono skalowanie (`user-scalable=no`) — eliminuje problemy z pinch-to-zoom w PWA.

### v1.0.6 — 2026-05-13
- **Fix:** Safe-area (Dynamic Island / status bar) działa teraz tylko w trybie PWA — w przeglądarce wygląd bez zmian.
- **Fix:** Scrollowanie w trybie PWA na iPhone poprawione (`-webkit-overflow-scrolling: touch`, `overscroll-behavior: contain`).
- **Fix:** Wysokość aplikacji używa `-webkit-fill-available` zamiast `100vh` — eliminuje problemy ze skalowaniem w PWA.

### v1.0.5 — 2026-05-13
- **Fix:** Topbar i sidebar nie nachodzą już na Dynamic Island i status bar iPhone przy używaniu jako PWA (dodano `env(safe-area-inset-top)`).

### v1.0.4 — 2026-05-13
- **Fix:** Kliknięcie checkboxa podzadania w otwartym panelu szczegółów teraz natychmiast odświeża widok bez potrzeby zamykania i ponownego otwierania zadania.

### v1.0.3 — 2026-05-13
- **Fix:** Naprawiono czerwoną kropkę statusu WebSocket — nginx teraz poprawnie proxuje ścieżkę `/ws` do backendu.

### v1.0.2 — 2026-05-13
- **Fix:** Naprawiono błąd `SyntaxError: Unexpected identifier '$'` w JS (niezamknięty template literal w linii 875) — aplikacja całkowicie nie działała po załadowaniu strony.

### v1.0.1 — 2026-05-13
- **Fix:** Naprawiono konfigurację nginx — `/` serwuje teraz pliki statyczne zamiast proxować wszystko do backendu (logowanie nie działało).
- **Fix:** Dodano osobny blok nginx dla proxy API (`/api/`).

### v1.0.0 — 2026-05-12
- Pierwsze uruchomienie aplikacji Taskr.
- Frontend HTML + Vanilla JS, PWA, Service Worker.
- Backend Node.js 20 + Express + SQLite.
- Autoryzacja JWT + bcrypt.
- WebSocket real-time sync.
- Widoki: Pulpit, Lista, Kanban, Kalendarz, Aktywność, Admin.
- Podzadania z progress ringiem.
- Komentarze i historia zmian.
- Docker + docker-compose.

---

## Jak sprawdzić wersję

**Na serwerze:**
```bash
cat /opt/ClaudeCode/taskr/taskr/VERSION
```

**W aplikacji:** widoczna w stopce panelu ustawień (ikona ⚙ w menu).

---

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

## Szybki start

```bash
git clone https://github.com/rehaoauth-jpg/ClaudeCode.git
cd ClaudeCode/taskr/taskr
docker compose up -d --build
```

Aplikacja dostępna na: **http://localhost:3000**

---

## Aktualizacja na serwerze

```bash
update
```

Skrypt `update.sh` automatycznie pobiera zmiany z GitHub i przebudowuje kontenery.

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

3. **Sklonuj repo i uruchom:**
```bash
git clone https://github.com/rehaoauth-jpg/ClaudeCode.git /opt/ClaudeCode
cd /opt/ClaudeCode/taskr/taskr
chmod +x update.sh
echo 'alias update="bash /opt/ClaudeCode/taskr/taskr/update.sh"' >> ~/.bashrc && source ~/.bashrc
docker compose up -d --build
```

4. **Ustaw JWT_SECRET** w `docker-compose.yml` — zmień na losowy string:
```bash
openssl rand -hex 32
```

### Opcja B — Nginx Proxy Manager (domena + HTTPS)

Jeśli masz już NPM na Proxmox:
- Utwórz Proxy Host → `<IP_LXC>:3000`
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
├── update.sh              # Skrypt aktualizacji
├── VERSION                # Aktualna wersja aplikacji
└── docker-compose.yml
```
