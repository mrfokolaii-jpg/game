import { graphBase } from '../config.js';

/**
 * کلاینت رسمی Instagram Graph API.
 * مستندات: https://developers.facebook.com/docs/instagram-platform
 * همه‌ی فراخوانی‌ها با توکن صفحه (Page Token) و روی حساب BUSINESS/CREATOR انجام می‌شوند.
 */
export class InstagramGraphClient {
  constructor({ igAccountId, pageId, pageToken, userToken }) {
    this.igAccountId = igAccountId;
    this.pageId = pageId;
    this.pageToken = pageToken;
    this.userToken = userToken;
  }

  async #get(path, params = {}) {
    const url = new URL(`${graphBase()}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set('access_token', this.pageToken);
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `Graph API خطا: ${res.status}`);
    return data;
  }

  async #post(path, body = {}) {
    const url = new URL(`${graphBase()}${path}`);
    url.searchParams.set('access_token', this.pageToken);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `Graph API خطا: ${res.status}`);
    return data;
  }

  // ─── پروفایل و آمار ─────────────────────────────────────────
  async getProfile() {
    return this.#get(`/${this.igAccountId}`, {
      fields: 'id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count,biography,website',
    });
  }

  async getMedia(limit = 12) {
    return this.#get(`/${this.igAccountId}/media`, {
      fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
      limit,
    });
  }

  async getInsights() {
    const day = 86400000;
    const since = Math.floor((Date.now() - 30 * day) / 1000);
    const until = Math.floor(Date.now() / 1000);
    return this.#get(`/${this.igAccountId}/insights`, {
      metric: 'impressions,reach,profile_views,follower_count',
      period: 'day',
      since,
      until,
    });
  }

  // ─── انتشار محتوا ───────────────────────────────────────────
  /** ساخت کانتینر رسانه؛ رسانه باید URL عمومی و قابل‌دسترس باشد */
  async createMediaContainer({ mediaType = 'IMAGE', mediaUrl, videoUrl, caption, isStory = false, children }) {
    const body = { caption };
    if (mediaType === 'CAROUSEL' && Array.isArray(children)) {
      body.media_type = 'CAROUSEL';
      body.children = children;
    } else if (mediaType === 'VIDEO' || mediaType === 'REELS') {
      body.media_type = mediaType === 'REELS' ? 'REELS' : 'VIDEO';
      body.video_url = videoUrl || mediaUrl;
    } else {
      body.image_url = mediaUrl;
    }
    const path = isStory
      ? `/${this.igAccountId}/stories`
      : `/${this.igAccountId}/media`;
    const data = await this.#post(path, body);
    return data.id;
  }

  async publishContainer(creationId) {
    const data = await this.#post(`/${this.igAccountId}/media_publish`, {
      creation_id: creationId,
    });
    return data.id;
  }

  /** انتشار کامل یک مرحله‌ای برای سادگی فرانت */
  async publish(input) {
    const creationId = await this.createMediaContainer(input);
    // انتشار بلافاصله بعد از ساخت کانتینر (برای ویدیو ممکن است نیاز به polling وضعیت باشد)
    const mediaId = await this.publishContainer(creationId);
    return { mediaId, creationId };
  }

  // ─── دایرکت و پیام‌رسانی ────────────────────────────────────
  async getConversations() {
    return this.#get(`/${this.pageId}/conversations`, {
      fields: 'id,participants,messages{from,created_time,message}',
      platform: 'instagram',
    });
  }

  async sendMessage(recipientId, text) {
    return this.#post(`/${this.pageId}/messages`, {
      recipient: { id: recipientId },
      message: { text },
    });
  }

  // ─── جستجوی هشتگ (کشف مشتری) ────────────────────────────────
  async findHashtagId(tag) {
    const clean = tag.replace(/^#/, '');
    const data = await this.#get(`/ig_hashtag_search`, {
      q: clean,
      user_id: this.igAccountId,
    });
    return data.data?.[0]?.id || null;
  }

  async recentMediaByHashtag(hashtagId, limit = 10) {
    return this.#get(`/${hashtagId}/recent_media`, {
      user_id: this.igAccountId,
      fields: 'id,caption,permalink,media_type,timestamp,owner',
      limit,
    });
  }
}
