import { Router } from 'express';
import { config, isDemoMode } from '../config.js';
import { getSession, getConnection, setConnection, save } from '../store.js';
import { buildOauthUrl, newState, exchangeCode, listInstagramAccounts } from '../instagram/oauth.js';
import {
  buildInstagramOauthUrl,
  exchangeInstagramCode,
  exchangeLongLived,
  refreshLongLived,
  igRedirectUri,
  InstagramLoginClient,
} from '../instagram/ig-client.js';
import { InstagramGraphClient } from '../instagram/graph.js';
import { connectDemo, disconnect, publicConnection, dashboardData, normalizeProfile } from '../instagram/index.js';

const router = Router();

/** وضعیت کلی برنامه: حالت دمو/واقعی و اتصال فعلی */
router.get('/status', (req, res) => {
  res.json({
    demoMode: isDemoMode(),
    configured: !isDemoMode(),
    connection: publicConnection(),
  });
});

/** چک‌لیست راه‌اندازی: وضعیت اعتبارنامه و آدرس‌های بازگشت برای ثبت در Meta App */
router.get('/setup-check', (req, res) => {
  res.json({
    appIdSet: Boolean(config.meta.appId),
    appSecretSet: Boolean(config.meta.appSecret),
    graphVersion: config.meta.graphVersion,
    appUrl: config.appUrl,
    instagramRedirectUri: igRedirectUri(),
    facebookRedirectUri: `${config.appUrl}/api/instagram/callback`,
    requiredScopes: [
      'instagram_business_basic',
      'instagram_business_content_publish',
      'instagram_business_manage_messages',
      'instagram_business_manage_comments',
      'instagram_business_manage_insights',
    ],
  });
});

router.get('/dashboard', async (req, res, next) => {
  try {
    const data = await dashboardData();
    if (!data) return res.status(404).json({ error: 'هنوز حسابی متصل نشده است' });
    res.json(data);
  } catch (e) { next(e); }
});

// ─── جریان A: ورود مستقیم اینستاگرام (بدون فیسبوک) ─────────────
router.get('/ig-oauth-url', (req, res) => {
  if (isDemoMode()) {
    return res.status(400).json({
      error: 'Meta App پیکربندی نشده است؛ مقادیر META_APP_ID و META_APP_SECRET را در .env وارد کنید.',
    });
  }
  const session = getSession(req.sessionId);
  const state = newState();
  session.igOauthState = state;
  save();
  res.json({ url: buildInstagramOauthUrl(state) });
});

router.get('/ig-callback', async (req, res) => {
  try {
    const { code, state, error, error_reason: reason } = req.query;
    if (error) return res.redirect('/?auth=error&reason=' + encodeURIComponent(reason || error));

    const session = getSession(req.sessionId);
    if (!state || state !== session.igOauthState) {
      return res.redirect('/?auth=error&reason=state_mismatch');
    }

    const { accessToken: shortToken, userId } = await exchangeInstagramCode(code);
    const { accessToken, expiresIn } = await exchangeLongLived(shortToken);
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const client = new InstagramLoginClient({ userId, accessToken });
    client.setExpiry(Date.now() + expiresIn * 1000);
    const rawProfile = await client.getProfile();

    setConnection({
      mode: 'real',
      loginType: 'instagram',
      connectedAt: new Date().toISOString(),
      igUserId: userId,
      accessToken,
      tokenIssuedAt: new Date().toISOString(),
      tokenExpiresAt,
      profile: normalizeProfile(rawProfile),
    });
    res.redirect('/?auth=success');
  } catch (err) {
    console.error('instagram oauth callback error:', err);
    res.redirect('/?auth=error&reason=' + encodeURIComponent(err.message));
  }
});

/** تمدید دستی توکن بلندمدت */
router.post('/refresh-token', async (req, res, next) => {
  try {
    const conn = publicConnection();
    if (!conn || conn.mode !== 'real' || !conn.loginType || conn.loginType === 'facebook') {
      return res.status(400).json({ error: 'اتصال قابل‌تمدی وجود ندارد' });
    }
    const stored = getConnection();
    const { accessToken, expiresIn } = await refreshLongLived(stored.accessToken);
    stored.accessToken = accessToken;
    stored.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    save();
    res.json({ ok: true, tokenExpiresAt: stored.tokenExpiresAt });
  } catch (e) { next(e); }
});

/**
 * اتصال با توکن تولیدشده در داشبورد Meta (مسیر بدون redirect عمومی).
 * برای اتصال حساب خودتان: App Dashboard → Instagram → API Setup with Instagram Login → Generate token
 */
router.post('/manual-token', async (req, res, next) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken || !String(accessToken).trim()) {
      return res.status(400).json({ error: 'توکن دسترسی الزامی است' });
    }
    const client = new InstagramLoginClient({ userId: null, accessToken: accessToken.trim() });
    const rawProfile = await client.getProfile();
    const userId = rawProfile.id;

    setConnection({
      mode: 'real',
      loginType: 'manual',
      connectedAt: new Date().toISOString(),
      igUserId: userId,
      accessToken: accessToken.trim(),
      tokenIssuedAt: new Date().toISOString(),
      tokenExpiresAt: new Date(Date.now() + 60 * 86400000).toISOString(),
      profile: normalizeProfile(rawProfile),
    });
    res.json({ ok: true, connection: publicConnection() });
  } catch (e) { next(e); }
});

// ─── جریان B: ورود با Facebook Login (نیازمند صفحه فیسبوک) ─────
router.get('/oauth-url', (req, res) => {
  if (isDemoMode()) {
    return res.status(400).json({
      error: 'Meta App پیکربندی نشده است؛ مقادیر META_APP_ID و META_APP_SECRET را در .env وارد کنید.',
    });
  }
  const session = getSession(req.sessionId);
  const state = newState();
  session.oauthState = state;
  save();
  res.json({ url: buildOauthUrl(state) });
});

router.get('/callback', async (req, res) => {
  try {
    const { code, state, error, error_reason: reason } = req.query;
    if (error) return res.redirect('/?auth=error&reason=' + encodeURIComponent(reason || error));

    const session = getSession(req.sessionId);
    if (!state || state !== session.oauthState) {
      return res.redirect('/?auth=error&reason=state_mismatch');
    }

    const userToken = await exchangeCode(code);
    const accounts = await listInstagramAccounts(userToken);
    if (!accounts.length) {
      return res.redirect('/?auth=error&reason=no_instagram_account');
    }

    const account = accounts[0];
    const client = new InstagramGraphClient({
      igAccountId: account.igAccountId,
      pageId: account.pageId,
      pageToken: account.pageToken,
      userToken,
    });
    const profile = await client.getProfile();

    setConnection({
      mode: 'real',
      loginType: 'facebook',
      connectedAt: new Date().toISOString(),
      igAccountId: account.igAccountId,
      pageId: account.pageId,
      pageToken: account.pageToken,
      userToken,
      profile: normalizeProfile(profile),
    });
    res.redirect('/?auth=success');
  } catch (err) {
    console.error('oauth callback error:', err);
    res.redirect('/?auth=error&reason=' + encodeURIComponent(err.message));
  }
});

/** اتصال حالت دمو برای تجربه کامل بدون اعتبارنامه واقعی */
router.post('/demo', (req, res) => {
  const conn = connectDemo();
  res.json({ ok: true, connection: { mode: conn.mode, profile: conn.profile } });
});

router.post('/disconnect', (req, res) => {
  disconnect();
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  res.json({ connection: publicConnection(), metaAppConfigured: Boolean(config.meta.appId) });
});

export default router;
