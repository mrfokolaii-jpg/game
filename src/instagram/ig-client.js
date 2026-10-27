import { config, igGraphBase } from '../config.js';

/**
 * جریان رسمی «Instagram API with Instagram Login» (Business Login for Instagram)
 * مستندات: https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login
 *
 * تفاوت با جریان فیسبوک:
 *  - کاربر مستقیماً در صفحه رسمی اینستاگرام یوزرنیم/پسورد خود را وارد می‌کند (نیازی به حساب فیسبوک نیست)
 *  - توکن، Instagram User Token است و همه فراخوانی‌ها روی graph.instagram.com انجام می‌شوند
 *  - حساب باید Professional (Business/Creator) باشد
 */

export const IG_SCOPES = [
  'instagram_business_basic',
  'instagram_business_content_publish',
  'instagram_business_manage_messages',
  'instagram_business_manage_comments',
  'instagram_business_manage_insights',
].join(',');

export function igRedirectUri() {
  return `${config.appUrl}/api/instagram/ig-callback`;
}

/** آدرس صفحه ورود رسمی اینستاگرام (بدون گزینه ورود با فیسبوک) */
export function buildInstagramOauthUrl(state) {
  const params = new URLSearchParams({
    client_id: config.meta.appId,
    redirect_uri: igRedirectUri(),
    response_type: 'code',
    state,
    scope: IG_SCOPES,
  });
  // enable_fb_login=0 یعنی فقط فرم ورود اینستاگرام نمایش داده شود
  return `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&${params.toString()}`;
}

/** تبادل کد OAuth با توکن کوتاه‌مدت (۱ ساعت اعتبار) */
export async function exchangeInstagramCode(code) {
  const res = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.meta.appId,
      client_secret: config.meta.appSecret,
      grant_type: 'authorization_code',
      redirect_uri: igRedirectUri(),
      code,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_message || data.error?.message || 'تبادل کد اینستاگرام ناموفق بود');
  }
  return { accessToken: data.access_token, userId: data.user_id, permissions: data.permissions || [] };
}

/** تبدیل توکن کوتاه‌مدت به توکن بلندمدت (۶۰ روز) */
export async function exchangeLongLived(shortLivedToken) {
  const url = new URL('https://graph.instagram.com/access_token');
  url.searchParams.set('grant_type', 'ig_exchange_token');
  url.searchParams.set('client_secret', config.meta.appSecret);
  url.searchParams.set('access_token', shortLivedToken);
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error?.message || 'دریافت توکن بلندمدت اینستاگرام ناموفق بود');
  }
  return { accessToken: data.access_token, expiresIn: data.expires_in || 5184000 };
}

/** تمدید توکن بلندمدت برای ۶۰ روز دیگر (حداقل ۲۴ ساعت از صدور گذشته باشد) */
export async function refreshLongLived(token) {
  const url = new URL('https://graph.instagram.com/refresh_access_token');
  url.searchParams.set('grant_type', 'ig_refresh_token');
  url.searchParams.set('access_token', token);
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error?.message || 'تمدید توکن اینستاگرام ناموفق بود');
  }
  return { accessToken: data.access_token, expiresIn: data.expires_in || 5184000 };
}

/**
 * کلاینت Graph برای جریان ورود مستقیم اینستاگرام.
 * همه متدها خروجی نرمال‌شده‌ی مشابه کلاینت فیسبوک برمی‌گردانند.
 */
export class InstagramLoginClient {
  constructor({ userId, accessToken, onTokenRefresh }) {
    this.userId = userId;
    this.accessToken = accessToken;
    this.onTokenRefresh = onTokenRefresh || (() => {});
  }

  async #request(path, { method = 'GET', params, body } = {}) {
    await this.#ensureFresh();
    const url = new URL(`${igGraphBase()}${path}`);
    if (params) for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) url.searchParams.set(k, v);
    url.searchParams.set('access_token', this.accessToken);

    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `Instagram Graph خطا: ${res.status}`);
    return data;
  }

  /** اگر کمتر از ۷ روز به انقضا مانده باشد، توکن تمدید می‌شود */
  async #ensureFresh() {
    if (!this.tokenExpiresAt) return;
    const sevenDays = 7 * 86400000;
    if (this.tokenExpiresAt - Date.now() > sevenDays) return;
    const { accessToken, expiresIn } = await refreshLongLived(this.accessToken);
    this.accessToken = accessToken;
    this.tokenExpiresAt = Date.now() + expiresIn * 1000;
    this.onTokenRefresh(accessToken, this.tokenExpiresAt);
  }

  setExpiry(expiresAt) {
    this.tokenExpiresAt = expiresAt;
  }

  // ─── پروفایل ─────────────────────────────────────────────────
  async getProfile() {
    const data = await this.#request('/me', {
      params: {
        fields: 'user_id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count,biography,website',
      },
    });
    return {
      id: data.user_id,
      username: data.username,
      name: data.name,
      account_type: data.account_type,
      profile_picture_url: data.profile_picture_url,
      followers_count: data.followers_count,
      follows_count: data.follows_count,
      media_count: data.media_count,
      biography: data.biography,
      website: data.website,
    };
  }

  async getMedia(limit = 12) {
    return this.#request(`/${this.userId}/media`, {
      params: {
        fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
        limit,
      },
    });
  }

  async getInsights() {
    const since = Math.floor((Date.now() - 30 * 86400000) / 1000);
    const until = Math.floor(Date.now() / 1000);
    return this.#request(`/${this.userId}/insights`, {
      params: { metric: 'impressions,reach,profile_views,follower_count', period: 'day', since, until },
    });
  }

  // ─── انتشار ──────────────────────────────────────────────────
  async createMediaContainer({ mediaType = 'IMAGE', mediaUrl, videoUrl, caption, isStory = false }) {
    const body = { caption };
    if (isStory) {
      body.media_type = 'STORIES';
      body.image_url = mediaUrl;
      if (videoUrl) { body.media_type = 'STORIES'; delete body.image_url; body.video_url = videoUrl; }
    } else if (mediaType === 'REELS' || mediaType === 'VIDEO') {
      body.media_type = mediaType === 'REELS' ? 'REELS' : 'VIDEO';
      body.video_url = videoUrl || mediaUrl;
    } else {
      body.image_url = mediaUrl;
    }
    const data = await this.#request(`/${this.userId}/media`, { method: 'POST', body });
    return data.id;
  }

  async publishContainer(creationId) {
    const data = await this.#request(`/${this.userId}/media_publish`, {
      method: 'POST',
      body: { creation_id: creationId },
    });
    return data.id;
  }

  async publish(input) {
    const creationId = await this.createMediaContainer(input);
    const mediaId = await this.publishContainer(creationId);
    return { mediaId, creationId };
  }

  // ─── دایرکت (خروجی نرمال‌شده) ────────────────────────────────
  async listThreads() {
    const data = await this.#request(`/${this.userId}/conversations`, {
      params: { fields: 'id,participants,messages{from,created_time,message}', platform: 'instagram' },
    });
    return (data.data || []).map((c) => ({
      id: c.id,
      participant: c.participants?.data?.map((p) => p.name || p.username || p.id).join(', ') || 'گفتگو',
      handle: '@' + (c.participants?.data?.[0]?.username || 'instagram_user'),
      participantId: c.participants?.data?.[0]?.id,
      messages: (c.messages?.data || []).map((m) => ({
        id: m.id,
        from: m.from?.username === this.username ? 'me' : 'them',
        text: m.message,
        at: m.created_time,
      })),
      unread: 0,
    }));
  }

  async sendText(thread, text) {
    const recipientId = thread?.participantId || thread?.id;
    return this.#request(`/${this.userId}/messages`, {
      method: 'POST',
      body: { recipient: { id: recipientId }, message: { text } },
    });
  }

  // ─── جستجوی هشتگ ─────────────────────────────────────────────
  async findHashtagId(tag) {
    const data = await this.#request('/ig_hashtag_search', {
      params: { q: tag.replace(/^#/, ''), user_id: this.userId },
    });
    return data.data?.[0]?.id || null;
  }

  async recentMediaByHashtag(hashtagId, limit = 10) {
    return this.#request(`/${hashtagId}/recent_media`, {
      params: { user_id: this.userId, fields: 'id,caption,permalink,media_type,timestamp,owner', limit },
    });
  }
}
