# Taskr — Full-Stack Task Manager

> **Current version: v1.0.9**

A task management application with a Node.js + SQLite backend, real-time WebSocket sync, drag & drop Kanban board, and an iOS-inspired interface.

---

## Changelog

### v1.0.9 — 2026-05-13
- **Fix:** PWA now fills the entire screen — `window.innerHeight` sets a `--vh` CSS variable via JS, which is the only reliable method on iOS where `100vh`/`100%` return incorrect values in standalone mode.

### v1.0.8 — 2026-05-13
- **Fix:** Removed growing empty space at the bottom in PWA — `-webkit-fill-available` was applied simultaneously on `html`, `body` and `#app`, causing values to compound. Simplified to `height: 100%` at each level.

### v1.0.7 — 2026-05-13
- **Fix:** Task creation modal no longer overflows above the top bar in PWA — `.modal-bg` now starts below the topbar.
- **Fix:** Removed empty space at the bottom in PWA — content padding now includes `env(safe-area-inset-bottom)`.
- **Fix:** Disabled scaling (`user-scalable=no`) — eliminates unintended pinch-to-zoom in PWA.

### v1.0.6 — 2026-05-13
- **Fix:** Safe-area (Dynamic Island / status bar) now only applies in PWA mode — browser view unchanged.
- **Fix:** Scrolling in PWA mode on iPhone improved (`-webkit-overflow-scrolling: touch`, `overscroll-behavior: contain`).
- **Fix:** App height uses `-webkit-fill-available` instead of `100vh` — eliminates scaling issues in PWA.

### v1.0.5 — 2026-05-13
- **Fix:** Topbar and sidebar no longer overlap the Dynamic Island and iPhone status bar when used as a PWA (added `env(safe-area-inset-top)`).

### v1.0.4 — 2026-05-13
- **Fix:** Clicking a subtask checkbox in the open detail panel now immediately refreshes the view without needing to close and reopen the task.

### v1.0.3 — 2026-05-13
- **Fix:** Fixed red WebSocket status dot — nginx now correctly proxies the `/ws` path to the backend.

### v1.0.2 — 2026-05-13
- **Fix:** Fixed `SyntaxError: Unexpected identifier '$'` in JS (unclosed template literal at line 875) — the app was completely non-functional after page load.

### v1.0.1 — 2026-05-13
- **Fix:** Fixed nginx configuration — `/` now serves static files instead of proxying everything to the backend (login was broken).
- **Fix:** Added a dedicated nginx block for API proxy (`/api/`).

### v1.0.0 — 2026-05-12
- Initial release of Taskr.
- Frontend: HTML + Vanilla JS, PWA, Service Worker.
- Backend: Node.js 20 + Express + SQLite.
- Authentication: JWT + bcrypt.
- WebSocket real-time sync.
- Views: Dashboard, List, Kanban, Calendar, Activity, Admin.
- Subtasks with progress ring.
- Comments and activity log.
- Docker + docker-compose.

---

## Checking the version

**On the server:**
```bash
cat /opt/ClaudeCode/taskr/taskr/VERSION
```

**In the app:** visible at the bottom of the Settings panel (⚙ icon in the menu).

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML + Vanilla JS, PWA, Service Worker |
| Backend | Node.js 20 + Express 4 |
| Database | SQLite (better-sqlite3) — single file, zero config |
| Real-time | WebSockets (ws library) |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Reverse proxy | Nginx |
| Containers | Docker + docker-compose |

---

## Features

### Tasks
- Create, edit, delete tasks
- Priorities: high / medium / low / none
- Statuses: To Do / In Progress / Review / Done
- Tags (multiple tags per task)
- Due dates with overdue highlighting
- Assign tasks to other users
- Subtasks with progress ring
- Comments on tasks
- Activity log (change history)
- Search and filtering

### Views
- **Dashboard** — stats + list or kanban
- **List** — grouped by status, filters, search
- **Kanban** — drag & drop between columns
- **Calendar** — colored dots for tasks with due dates
- **Activity** — feed of all actions
- **Admin** — user management

### Users
- JWT authentication (token valid for 7 days)
- Roles: admin / user
- Admin can: add users, edit roles, reset passwords, delete accounts
- Every user can change their own password and customize their profile (avatar color)

### Real-time sync
- WebSocket — all changes instantly propagate to all logged-in users
- Toast notifications for changes made by other users

### PWA (iPhone)
- Installable as a home screen app (iOS Safari → Share → Add to Home Screen)
- Service Worker cache — works offline (UI only; data requires a connection)
- Proper `viewport-fit` and `safe-area-inset` support for Dynamic Island

---

## Demo accounts (seeded on first run)

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Administrator |
| jan | user123 | User |
| anna | user123 | User |

---

## Quick start

```bash
git clone https://github.com/rehaoauth-jpg/ClaudeCode.git
cd ClaudeCode/taskr/taskr
docker compose up -d --build
```

App available at: **http://localhost:3000**

---

## Updating on the server

```bash
update
```

The `update.sh` script automatically pulls changes from GitHub, checks if a new version is available, and rebuilds the containers only when needed.

---

## Deployment on Proxmox

### Option A — Docker in an LXC container (recommended)

1. **Create an LXC** in Proxmox (Ubuntu 22.04 or Debian 12):
   - CPU: 1 core
   - RAM: 256 MB (512 MB recommended)
   - Disk: 4 GB
   - Network: bridge to LAN, static IP (e.g. 192.168.1.50)

2. **Install Docker** in the LXC:
```bash
apt update && apt install -y curl
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin
```

3. **Clone the repo and start:**
```bash
git clone https://github.com/rehaoauth-jpg/ClaudeCode.git /opt/ClaudeCode
cd /opt/ClaudeCode/taskr/taskr
chmod +x update.sh
echo 'alias update="bash /opt/ClaudeCode/taskr/taskr/update.sh"' >> ~/.bashrc && source ~/.bashrc
docker compose up -d --build
```

4. **Set JWT_SECRET** in `docker-compose.yml` — replace with a random string:
```bash
openssl rand -hex 32
```

### Option B — Nginx Proxy Manager (domain + HTTPS)

If you already have NPM on Proxmox:
- Create a Proxy Host → `<LXC_IP>:3000`
- Enable SSL via Let's Encrypt (e.g. Cloudflare DNS challenge)
- App available at `https://taskr.yourdomain.com`

---

## Data backup

SQLite data is stored in the Docker volume `taskr-data`. Backup:

```bash
# One-time database backup:
docker run --rm -v taskr_taskr-data:/data -v $(pwd):/backup alpine \
  cp /data/taskr.db /backup/taskr-backup-$(date +%Y%m%d).db

# Nightly cron at 3:00 AM (add to crontab):
0 3 * * * docker run --rm -v taskr_taskr-data:/data -v /opt/backups:/backup alpine cp /data/taskr.db /backup/taskr-$(date +\%Y\%m\%d).db
```

---

## Environment variables (backend)

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4000 | API port |
| DB_PATH | /data/taskr.db | Path to SQLite database |
| JWT_SECRET | taskr-secret-... | JWT secret — **CHANGE IN PRODUCTION** |

---

## Project structure

```
taskr/
├── backend/
│   ├── server.js          # Express + SQLite + WebSocket API
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── public/
│   │   ├── index.html     # Full SPA application
│   │   ├── manifest.json  # PWA manifest
│   │   └── sw.js          # Service Worker
│   ├── nginx.conf         # Nginx with API + WS proxy
│   └── Dockerfile
├── update.sh              # Update script
├── VERSION                # Current application version
└── docker-compose.yml
```
