import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '..');
export const DATA_DIR = path.join(ROOT_DIR, 'data');
export const UPLOADS_DIR = path.join(ROOT_DIR, 'public', 'uploads');

export const config = {
  port: Number(process.env.PORT || 3000),
  appUrl: (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, ''),
  meta: {
    appId: process.env.META_APP_ID || '',
    appSecret: process.env.META_APP_SECRET || '',
    graphVersion: process.env.META_GRAPH_VERSION || 'v21.0',
  },
  arena: {
    apiUrl: (process.env.ARENA_API_URL || 'https://arena.ai/agent').replace(/\/$/, ''),
    apiKey: process.env.ARENA_API_KEY || '',
    model: process.env.ARENA_MODEL || 'arena-agent',
  },
};

/** حالت دمو وقتی فعال است که اطلاعات اپ Meta وارد نشده باشد */
export function isDemoMode() {
  return !config.meta.appId || !config.meta.appSecret;
}

export function graphBase() {
  return `https://graph.facebook.com/${config.meta.graphVersion}`;
}

/** میزبان Graph برای جریان «ورود مستقیم اینستاگرام» (Instagram Login) */
export function igGraphBase() {
  return `https://graph.instagram.com/${config.meta.graphVersion}`;
}
