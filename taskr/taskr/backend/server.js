const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const VERSION = process.env.APP_VERSION || '1.0.4';

const JWT_SECRET = process.env.JWT_SECRET || 'taskr-secret-change-in-production';
const PORT = process.env.PORT || 4000;
const DB_PATH = process.env.DB_PATH || '/data/taskr.db';

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    avatar_color TEXT DEFAULT '#6c63ff',
    created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    priority TEXT DEFAULT 'none',
    status TEXT DEFAULT 'todo',
    due_date TEXT,
    tags TEXT DEFAULT '[]',
    owner_id TEXT REFERENCES users(id),
    assignee_id TEXT REFERENCES users(id),
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    sort_order INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    action TEXT NOT NULL,
    meta TEXT DEFAULT '{}',
    created_at INTEGER DEFAULT (unixepoch())
  );
`);

// Migration: add parent_id column if upgrading from old schema
try { db.exec(`ALTER TABLE tasks ADD COLUMN parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE`); } catch {}

// Migration: import old subtasks table
try {
  const hasSubs = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='subtasks'`).get();
  if (hasSubs) {
    const subs = db.prepare('SELECT * FROM subtasks').all();
    if (subs.length) {
      db.transaction(() => {
        subs.forEach(s => {
          try {
            db.prepare(`INSERT OR IGNORE INTO tasks (id,parent_id,title,status,priority,sort_order,created_at)
              VALUES (?,?,?,?,?,?,?)`).run(s.id, s.task_id, s.text, s.done ? 'done' : 'todo', 'none', s.sort_order||0, s.created_at||Math.floor(Date.now()/1000));
          } catch {}
        });
      })();
    }
    try { db.exec('DROP TABLE subtasks'); } catch {}
  }
} catch {}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

// Seed demo data
(function seed() {
  if (db.prepare('SELECT COUNT(*) as c FROM users').get().c > 0) return;
  const users = [
    { id: uid(), un: 'admin', pw: 'admin123', name: 'Administrator', role: 'admin', color: '#7c6df0' },
    { id: uid(), un: 'jan',   pw: 'user123',  name: 'Jan Kowalski',  role: 'user',  color: '#05d394' },
    { id: uid(), un: 'anna',  pw: 'user123',  name: 'Anna Nowak',    role: 'user',  color: '#f0438c' }
  ];
  const insU = db.prepare('INSERT INTO users (id,username,password,name,role,avatar_color) VALUES (?,?,?,?,?,?)');
  users.forEach(u => insU.run(u.id, u.un, bcrypt.hashSync(u.pw, 10), u.name, u.role, u.color));

  const [aId, jId, nId] = users.map(u => u.id);
  const t = d => { const r = new Date(); r.setDate(r.getDate()+d); return r.toISOString().slice(0,10); };
  const insT = db.prepare(`INSERT INTO tasks (id,parent_id,title,description,priority,status,due_date,tags,owner_id,assignee_id,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);

  const t1=uid(),t2=uid(),t3=uid(),t4=uid(),t5=uid();
  db.transaction(() => {
    insT.run(t1,null,'Skonfiguruj serwer Proxmox','Zainstaluj i skonfiguruj Proxmox VE na dedykowanym serwerze.','high','inprog',t(1),'["infrastruktura"]',aId,jId,0);
    insT.run(uid(),t1,'Zainstaluj Proxmox VE','Pobierz ISO ze strony proxmox.com i zainstaluj na maszynie.','high','done',t(0),'[]',aId,jId,0);
    insT.run(uid(),t1,'Skonfiguruj sieć bridged','Ustaw bridge vmbr0 i przypisz interfejsy sieciowe.','med','done',t(0),'[]',aId,jId,1);
    insT.run(uid(),t1,'Utwórz pierwsze VM','Ubuntu 22.04 LTS jako baza dla kontenerów.','med','todo',t(1),'[]',aId,nId,2);
    insT.run(uid(),t1,'Backup konfiguracji','Automatyczny backup przez Proxmox Backup Server.','low','todo',t(7),'[]',aId,null,3);

    insT.run(t2,null,'Zaprojektuj UI aplikacji','Design system i makiety dla nowego projektu.','med','done',t(0),'["design","ui"]',aId,nId,1);
    insT.run(uid(),t2,'Makiety mobilne','Widoki iPhone i Android w Figma.','med','done',t(-1),'[]',aId,nId,0);
    insT.run(uid(),t2,'Kolorystyka i typografia','Zdefiniuj palety kolorów i fonty.','low','done',t(-1),'[]',aId,nId,1);

    insT.run(t3,null,'Wdrożyć kontener Docker','Zbuduj obraz i opublikuj w rejestrze.','high','todo',t(1),'["backend","docker"]',jId,jId,2);
    insT.run(uid(),t3,'Napisz Dockerfile','Multi-stage build dla Node.js z Alpine.','high','inprog',t(1),'[]',jId,jId,0);
    insT.run(uid(),t3,'docker-compose.yml','Backend + frontend + nginx w jednym compose.','med','todo',t(2),'[]',jId,null,1);
    insT.run(uid(),t3,'Testy smoke','Przetestuj build lokalnie przed wdrożeniem.','low','todo',t(3),'[]',jId,jId,2);

    insT.run(t4,null,'Dokumentacja API','Opisz endpointy REST z przykładami i schematem.','low','todo',t(7),'["dokumentacja"]',nId,null,3);
    insT.run(t5,null,'Code review modułu auth','','med','review',t(1),'["security"]',aId,nId,4);
    insT.run(uid(),t5,'Walidacja JWT','Sprawdź czy tokeny są prawidłowo weryfikowane i odświeżane.','high','todo',t(1),'[]',aId,nId,0);
    insT.run(uid(),t5,'Testy penetracyjne','Podstawowe testy bezpieczeństwa endpointu /login.','med','todo',t(2),'[]',aId,nId,1);
  })();
})();

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────
function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(h.slice(7), JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}
function broadcastAll(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(msg); });
}
function logActivity(task_id, user_id, action, meta = {}) {
  try { db.prepare('INSERT INTO activity_log (id,task_id,user_id,action,meta) VALUES (?,?,?,?,?)').run(uid(), task_id, user_id, action, JSON.stringify(meta)); } catch {}
}

// Hydrate single task row with all relations
function hydrateTask(t) {
  if (!t) return null;
  t.tags = JSON.parse(t.tags || '[]');
  t.done = t.status === 'done';
  t.assignee = t.assignee_id ? db.prepare('SELECT id,name,avatar_color FROM users WHERE id=?').get(t.assignee_id) : null;
  t.owner    = t.owner_id    ? db.prepare('SELECT id,name,avatar_color FROM users WHERE id=?').get(t.owner_id)    : null;
  const children = db.prepare('SELECT * FROM tasks WHERE parent_id=? ORDER BY sort_order,created_at').all(t.id);
  t.subtasks = children.map(c => hydrateTask(c));
  t.comment_count = db.prepare('SELECT COUNT(*) as c FROM comments WHERE task_id=?').get(t.id).c;
  return t;
}

function fullTask(id) {
  const t = db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
  if (!t) return null;
  const task = hydrateTask(t);
  task.comments = db.prepare(`
    SELECT c.*, u.name as user_name, u.avatar_color
    FROM comments c JOIN users u ON c.user_id=u.id
    WHERE c.task_id=? ORDER BY c.created_at
  `).all(id);
  return task;
}

app.use(cors());
app.use(express.json());

// ─── AUTH ROUTES ──────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username?.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Nieprawidłowy użytkownik lub hasło' });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role, avatar_color: user.avatar_color } });
});

app.post('/api/auth/change-password', auth, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!new_password || new_password.length < 4) return res.status(400).json({ error: 'Hasło min. 4 znaki' });
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!bcrypt.compareSync(current_password, user.password)) return res.status(400).json({ error: 'Aktualne hasło nieprawidłowe' });
  db.prepare('UPDATE users SET password=? WHERE id=?').run(bcrypt.hashSync(new_password, 10), req.user.id);
  res.json({ ok: true });
});

app.get('/api/auth/me', auth, (req, res) => {
  res.json(db.prepare('SELECT id,username,name,role,avatar_color FROM users WHERE id=?').get(req.user.id));
});

// ─── USER ROUTES ──────────────────────────────────────────────
app.get('/api/users', auth, (req, res) => {
  res.json(db.prepare('SELECT id,username,name,role,avatar_color,created_at FROM users ORDER BY name').all());
});

app.post('/api/users', auth, adminOnly, (req, res) => {
  const { username, password, name, role } = req.body;
  if (!username || !password || !name) return res.status(400).json({ error: 'Wymagane: username, password, name' });
  if (db.prepare('SELECT id FROM users WHERE username=?').get(username.toLowerCase()))
    return res.status(400).json({ error: 'Taki użytkownik już istnieje' });
  const colors = ['#7c6df0','#05d394','#f0438c','#38bdf8','#ffcc4d','#ff5c5c','#a78bfa','#fb923c'];
  const id = uid();
  db.prepare('INSERT INTO users (id,username,password,name,role,avatar_color) VALUES (?,?,?,?,?,?)')
    .run(id, username.toLowerCase(), bcrypt.hashSync(password, 10), name, role||'user', colors[Math.floor(Math.random()*colors.length)]);
  broadcastAll({ type: 'users_updated' });
  res.json({ ok: true, id });
});

app.put('/api/users/:id', auth, (req, res) => {
  const tid = req.params.id;
  if (req.user.role !== 'admin' && req.user.id !== tid) return res.status(403).json({ error: 'Brak dostępu' });
  const { name, role, avatar_color, password } = req.body;
  const ups = [], vals = [];
  if (name)         { ups.push('name=?');         vals.push(name); }
  if (role && req.user.role==='admin') { ups.push('role=?'); vals.push(role); }
  if (avatar_color) { ups.push('avatar_color=?'); vals.push(avatar_color); }
  if (password && req.user.role==='admin') { ups.push('password=?'); vals.push(bcrypt.hashSync(password, 10)); }
  if (!ups.length) return res.status(400).json({ error: 'Nic do zmiany' });
  vals.push(tid);
  db.prepare(`UPDATE users SET ${ups.join(',')} WHERE id=?`).run(...vals);
  broadcastAll({ type: 'users_updated' });
  res.json({ ok: true });
});

app.delete('/api/users/:id', auth, adminOnly, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Nie możesz usunąć siebie' });
  db.prepare('UPDATE tasks SET assignee_id=NULL WHERE assignee_id=?').run(req.params.id);
  db.prepare('UPDATE tasks SET owner_id=NULL WHERE owner_id=?').run(req.params.id);
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  broadcastAll({ type: 'users_updated' });
  res.json({ ok: true });
});

// ─── TASK ROUTES ──────────────────────────────────────────────
app.get('/api/tasks', auth, (req, res) => {
  const rows = req.user.role === 'admin'
    ? db.prepare('SELECT * FROM tasks WHERE parent_id IS NULL ORDER BY sort_order,created_at DESC').all()
    : db.prepare('SELECT * FROM tasks WHERE parent_id IS NULL AND (owner_id=? OR assignee_id=?) ORDER BY sort_order,created_at DESC').all(req.user.id, req.user.id);
  res.json(rows.map(t => hydrateTask(t)));
});

app.post('/api/tasks', auth, (req, res) => {
  const { title, description, priority, status, due_date, tags, assignee_id, parent_id } = req.body;
  if (!title) return res.status(400).json({ error: 'Tytuł wymagany' });
  const pid = parent_id || null;
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM tasks WHERE parent_id IS ?').get(pid).m || 0;
  const id = uid();
  db.prepare(`INSERT INTO tasks (id,parent_id,title,description,priority,status,due_date,tags,owner_id,assignee_id,sort_order)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, pid, title, description||'', priority||'none', status||'todo', due_date||null, JSON.stringify(tags||[]), req.user.id, assignee_id||null, maxOrder+1);
  logActivity(id, req.user.id, 'created', { title });
  // If subtask, return updated parent; else return new task
  const rootId = pid ? (db.prepare('SELECT parent_id FROM tasks WHERE id=?').get(pid)?.parent_id || pid) : id;
  const task = fullTask(rootId);
  broadcastAll({ type: pid ? 'task_updated' : 'task_created', task });
  res.json(task);
});

app.get('/api/tasks/:id', auth, (req, res) => {
  const t = fullTask(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});

app.put('/api/tasks/:id', auth, (req, res) => {
  const old = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Not found' });
  const fields = ['title','description','priority','status','due_date','assignee_id'];
  const ups = [], vals = [];
  fields.forEach(f => { if (req.body[f] !== undefined) { ups.push(`${f}=?`); vals.push(req.body[f]); } });
  if (req.body.tags !== undefined) { ups.push('tags=?'); vals.push(JSON.stringify(req.body.tags)); }
  ups.push('updated_at=?'); vals.push(Math.floor(Date.now()/1000));
  vals.push(req.params.id);
  db.prepare(`UPDATE tasks SET ${ups.join(',')} WHERE id=?`).run(...vals);

  if (req.body.status && req.body.status !== old.status)
    logActivity(req.params.id, req.user.id, 'status_changed', { from: old.status, to: req.body.status });

  // Find root parent and broadcast full update
  const updated = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  const rootId = updated.parent_id
    ? (db.prepare('SELECT parent_id FROM tasks WHERE id=?').get(updated.parent_id)?.parent_id || updated.parent_id)
    : req.params.id;
  const task = fullTask(rootId);
  broadcastAll({ type: 'task_updated', task });
  res.json(task);
});

app.delete('/api/tasks/:id', auth, (req, res) => {
  const t = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  if (req.user.role !== 'admin' && t.owner_id !== req.user.id)
    return res.status(403).json({ error: 'Brak dostępu' });
  const parentId = t.parent_id;
  db.prepare('DELETE FROM tasks WHERE id=?').run(req.params.id);
  if (parentId) {
    const rootId = db.prepare('SELECT parent_id FROM tasks WHERE id=?').get(parentId)?.parent_id || parentId;
    broadcastAll({ type: 'task_updated', task: fullTask(rootId) });
  } else {
    broadcastAll({ type: 'task_deleted', id: req.params.id });
  }
  res.json({ ok: true });
});

app.post('/api/tasks/reorder', auth, (req, res) => {
  const stmt = db.prepare('UPDATE tasks SET status=?,sort_order=?,updated_at=? WHERE id=?');
  const now = Math.floor(Date.now()/1000);
  db.transaction(() => req.body.updates.forEach(u => stmt.run(u.status, u.sort_order, now, u.id)))();
  broadcastAll({ type: 'tasks_reordered', updates: req.body.updates });
  res.json({ ok: true });
});

// ─── COMMENTS ─────────────────────────────────────────────────
app.post('/api/tasks/:id/comments', auth, (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required' });
  db.prepare('INSERT INTO comments (id,task_id,user_id,text) VALUES (?,?,?,?)').run(uid(), req.params.id, req.user.id, text);
  logActivity(req.params.id, req.user.id, 'commented', { preview: text.slice(0,60) });
  const t = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  const rootId = t?.parent_id || req.params.id;
  const task = fullTask(rootId);
  broadcastAll({ type: 'task_updated', task });
  res.json(task);
});

// ─── ACTIVITY ─────────────────────────────────────────────────
app.get('/api/tasks/:id/activity', auth, (req, res) => {
  res.json(db.prepare(`SELECT a.*,u.name as user_name,u.avatar_color FROM activity_log a LEFT JOIN users u ON a.user_id=u.id WHERE a.task_id=? ORDER BY a.created_at DESC LIMIT 50`).all(req.params.id).map(r=>({...r,meta:JSON.parse(r.meta||'{}')})));
});

app.get('/api/activity', auth, (req, res) => {
  res.json(db.prepare(`SELECT a.*,u.name as user_name,u.avatar_color,t.title as task_title FROM activity_log a LEFT JOIN users u ON a.user_id=u.id LEFT JOIN tasks t ON a.task_id=t.id ORDER BY a.created_at DESC LIMIT 40`).all().map(r=>({...r,meta:JSON.parse(r.meta||'{}')})));
});

// ─── VERSION ──────────────────────────────────────────────────
app.get('/api/version', (req, res) => res.json({ version: VERSION }));

// ─── STATS ────────────────────────────────────────────────────
app.get('/api/stats', auth, (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const base = isAdmin ? 'FROM tasks WHERE parent_id IS NULL' : 'FROM tasks WHERE parent_id IS NULL AND (owner_id=? OR assignee_id=?)';
  const args = isAdmin ? [] : [req.user.id, req.user.id];
  const q = sql => db.prepare(`SELECT COUNT(*) as c ${base} ${sql}`).get(...args).c;
  res.json({ total:q(''), done:q("AND status='done'"), inprog:q("AND status='inprog'"), overdue:q("AND status!='done' AND due_date IS NOT NULL AND due_date < date('now')") });
});

// ─── WEBSOCKET ────────────────────────────────────────────────
wss.on('connection', ws => {
  ws.on('message', msg => { try { const d=JSON.parse(msg); if(d.type==='ping') ws.send(JSON.stringify({type:'pong'})); } catch {} });
  ws.send(JSON.stringify({ type: 'connected' }));
});

server.listen(PORT, () => console.log(`Taskr backend on port ${PORT}`));
