import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './config.js';

const DB_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULT_DB = {
  sessions: {},        // sessionId -> { createdAt, ... }
  connection: null,    // اتصال اینستاگرام فعال
  posts: [],           // تاریخچه انتشار
  threads: [],         // گفتگوهای دایرکت
  leads: [],           // مشتریان بالقوه
  campaigns: [],       // کمپین‌های تبلیغاتی
  media: [],           // کتابخانه رسانه (آپلودها / پوسترها)
  settings: {
    arenaApiUrl: '',
    arenaApiKey: '',
    arenaModel: '',
  },
  seeded: false,
};

let db = null;
let saveTimer = null;

export function loadDB() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    try {
      db = { ...structuredClone(DEFAULT_DB), ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
    } catch {
      db = structuredClone(DEFAULT_DB);
    }
  } else {
    db = structuredClone(DEFAULT_DB);
    saveNow();
  }
  return db;
}

export function saveNow() {
  if (!db) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

/** ذخیره با تأخیر کوتاه برای جلوگیری از نوشتن مکرر روی دیسک */
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 150);
}

export function getDB() {
  if (!db) loadDB();
  return db;
}

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ─── کمک‌توابع مجموعه‌ها ───────────────────────────────────────
export function getConnection() {
  return getDB().connection;
}

export function setConnection(connection) {
  getDB().connection = connection;
  save();
}

export function getSession(id) {
  return getDB().sessions[id] || null;
}

export function createSession(id) {
  const sessions = getDB().sessions;
  sessions[id] = { createdAt: new Date().toISOString() };
  save();
  return sessions[id];
}

export function getSettings() {
  const s = getDB().settings;
  return {
    arenaApiUrl: s.arenaApiUrl || '',
    arenaModel: s.arenaModel || '',
    // کلید هرگز کامل به فرانت برنمی‌گردد
    arenaApiKeySet: Boolean(s.arenaApiKey),
    arenaApiKeyHint: s.arenaApiKey ? '••••••••' + s.arenaApiKey.slice(-4) : '',
  };
}

export function updateSettings(patch) {
  const s = getDB().settings;
  if (typeof patch.arenaApiUrl === 'string') s.arenaApiUrl = patch.arenaApiUrl.trim();
  if (typeof patch.arenaModel === 'string') s.arenaModel = patch.arenaModel.trim();
  if (typeof patch.arenaApiKey === 'string' && patch.arenaApiKey.trim() !== '') {
    s.arenaApiKey = patch.arenaApiKey.trim();
  }
  save();
  return getSettings();
}

export function getArenaConfig() {
  const s = getDB().settings;
  return {
    apiUrl: s.arenaApiUrl || undefined,
    apiKey: s.arenaApiKey || undefined,
    model: s.arenaModel || undefined,
  };
}
