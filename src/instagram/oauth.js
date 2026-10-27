import crypto from 'node:crypto';
import { config, graphBase } from '../config.js';

/**
 * جریان رسمی اتصال: Facebook Login (OAuth 2.0)
 * اینستاگرام دیگر اجازه ورود با یوزرنیم/پسورد به اپ‌های شخص ثالث را نمی‌دهد؛
 * تنها مسیر رسمی و امن، همین جریان OAuth از طریق Meta است.
 */

const SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_messages',
  'instagram_manage_comments',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_metadata',
  'business_management',
].join(',');

export function redirectUri() {
  return `${config.appUrl}/api/instagram/callback`;
}

export function buildOauthUrl(state) {
  const params = new URLSearchParams({
    client_id: config.meta.appId,
    redirect_uri: redirectUri(),
    state,
    scope: SCOPES,
    response_type: 'code',
  });
  return `https://www.facebook.com/${config.meta.graphVersion}/dialog/oauth?${params.toString()}`;
}

export function newState() {
  return crypto.randomBytes(16).toString('hex');
}

/** تبادل کد OAuth با توکن کاربری فیسبوک */
export async function exchangeCode(code) {
  const url = new URL(`${graphBase()}/oauth/access_token`);
  url.searchParams.set('client_id', config.meta.appId);
  url.searchParams.set('client_secret', config.meta.appSecret);
  url.searchParams.set('redirect_uri', redirectUri());
  url.searchParams.set('code', code);

  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error?.message || 'تبادل کد OAuth ناموفق بود');
  }
  return data.access_token;
}

/**
 * دریافت صفحات فیسبوک و حساب تجاری اینستاگرام متصل به هر صفحه.
 * خروجی: [{ pageId, pageName, pageToken, igAccountId }]
 */
export async function listInstagramAccounts(userToken) {
  const pagesRes = await fetch(
    `${graphBase()}/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(userToken)}`
  );
  const pagesData = await pagesRes.json();
  if (!pagesRes.ok || !Array.isArray(pagesData.data)) {
    throw new Error(pagesData.error?.message || 'دریافت صفحات فیسبوک ناموفق بود');
  }

  const accounts = [];
  for (const page of pagesData.data) {
    const detailRes = await fetch(
      `${graphBase()}/${page.id}?fields=instagram_business_account&access_token=${encodeURIComponent(page.access_token)}`
    );
    const detail = await detailRes.json();
    if (detail.instagram_business_account?.id) {
      accounts.push({
        pageId: page.id,
        pageName: page.name,
        pageToken: page.access_token,
        igAccountId: detail.instagram_business_account.id,
      });
    }
  }
  return accounts;
}
