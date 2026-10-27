import { getConnection, getDB, save } from '../store.js';
import { InstagramGraphClient } from './graph.js';
import { InstagramLoginClient } from './ig-client.js';
import * as mock from './mock.js';

/**
 * ساخت کلاینت مناسب بر اساس نوع اتصال ذخیره‌شده:
 *  - loginType 'instagram' | 'manual' → InstagramLoginClient (graph.instagram.com)
 *  - loginType 'facebook' (یا اتصال قدیمی) → InstagramGraphClient (graph.facebook.com)
 */
export function getClient() {
  const conn = getConnection();
  if (!conn || conn.mode !== 'real') return null;

  if (conn.loginType === 'facebook') {
    return new InstagramGraphClient({
      igAccountId: conn.igAccountId,
      pageId: conn.pageId,
      pageToken: conn.pageToken,
      userToken: conn.userToken,
      username: conn.profile?.username,
    });
  }

  const client = new InstagramLoginClient({
    userId: conn.igUserId,
    accessToken: conn.accessToken,
    onTokenRefresh: (newToken, expiresAt) => {
      const c = getConnection();
      if (c) {
        c.accessToken = newToken;
        c.tokenExpiresAt = new Date(expiresAt).toISOString();
        save();
      }
    },
  });
  if (conn.tokenExpiresAt) client.setExpiry(new Date(conn.tokenExpiresAt).getTime());
  client.username = conn.profile?.username;
  return client;
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
    loginType: conn.loginType || null,
    connectedAt: conn.connectedAt,
    tokenExpiresAt: conn.tokenExpiresAt || null,
    profile: conn.profile,
  };
}

/** نرمال‌سازی پروفایل خام هر دو کلاینت به شکل یکسان */
export function normalizeProfile(p) {
  return {
    id: p.id,
    username: p.username,
    name: p.name,
    accountType: p.account_type || p.accountType || 'BUSINESS',
    followersCount: p.followers_count ?? p.followersCount ?? 0,
    followsCount: p.follows_count ?? p.followsCount ?? 0,
    mediaCount: p.media_count ?? p.mediaCount ?? 0,
    profilePictureUrl: p.profile_picture_url || p.profilePictureUrl || '',
    website: p.website || '',
    biography: p.biography || '',
  };
}

export async function dashboardData() {
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

  // اتصال واقعی: تلاش برای دریافت داده‌های زنده، با fallback به پروفایل ذخیره‌شده
  const base = { mode: 'real', loginType: conn.loginType, profile: conn.profile };
  try {
    const client = getClient();
    const [mediaRes] = await Promise.all([client.getMedia(12)]);
    return {
      ...base,
      media: (mediaRes.data || []).map((m) => ({
        id: m.id,
        caption: m.caption || '',
        mediaType: m.media_type,
        mediaUrl: m.media_url || '',
        permalink: m.permalink || '',
        timestamp: m.timestamp,
        insights: { likes: m.like_count || 0, comments: m.comments_count || 0 },
      })),
    };
  } catch (err) {
    return { ...base, warning: `داده‌های زنده در دسترس نیست: ${err.message}` };
  }
}
