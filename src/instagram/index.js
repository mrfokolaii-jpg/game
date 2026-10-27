import { getConnection, getDB, save } from '../store.js';
import { InstagramGraphClient } from './graph.js';
import * as mock from './mock.js';

export function getClient() {
  const conn = getConnection();
  if (!conn || conn.mode !== 'real') return null;
  return new InstagramGraphClient({
    igAccountId: conn.igAccountId,
    pageId: conn.pageId,
    pageToken: conn.pageToken,
    userToken: conn.userToken,
  });
}

/** بذر اولیه داده‌های دمو (فقط یک بار اجرا می‌شود) */
export function ensureDemoSeed(force = false) {
  const db = getDB();
  if (db.seeded && !force) return;
  db.threads = mock.mockThreads();
  db.leads = mock.mockLeads();
  db.campaigns = mock.mockCampaigns();
  db.seeded = true;
  save();
}

export function connectDemo() {
  ensureDemoSeed(true);
  const db = getDB();
  db.connection = {
    mode: 'demo',
    connectedAt: new Date().toISOString(),
    profile: mock.mockProfile(),
  };
  save();
  return db.connection;
}

export function disconnect() {
  const db = getDB();
  db.connection = null;
  save();
}

export function publicConnection() {
  const conn = getConnection();
  if (!conn) return null;
  return {
    mode: conn.mode,
    connectedAt: conn.connectedAt,
    profile: conn.profile,
  };
}

export function dashboardData() {
  const conn = getConnection();
  if (!conn) return null;
  const db = getDB();
  if (conn.mode === 'demo') {
    return {
      mode: 'demo',
      profile: conn.profile,
      media: mock.mockMedia(),
      stats: {
        reach: 48210,
        impressions: 76400,
        profileViews: 3980,
        newFollowers: 412,
        engagementRate: 4.8,
        unreadMessages: db.threads.reduce((s, t) => s + (t.unread || 0), 0),
        openLeads: db.leads.filter((l) => l.stage !== 'مشتری جدید').length,
      },
    };
  }
  return { mode: 'real', profile: conn.profile };
}
