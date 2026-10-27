import { Router } from 'express';
import { config, isDemoMode } from '../config.js';
import { getSession, getConnection, setConnection, save } from '../store.js';
import { buildOauthUrl, newState, exchangeCode, listInstagramAccounts } from '../instagram/oauth.js';
import { InstagramGraphClient } from '../instagram/graph.js';
import { connectDemo, disconnect, publicConnection, dashboardData } from '../instagram/index.js';

const router = Router();

/** وضعیت کلی برنامه: حالت دمو/واقعی و اتصال فعلی */
router.get('/status', (req, res) => {
  res.json({
    demoMode: isDemoMode(),
    configured: !isDemoMode(),
    connection: publicConnection(),
  });
});

router.get('/dashboard', (req, res) => {
  const data = dashboardData();
  if (!data) return res.status(404).json({ error: 'هنوز حسابی متصل نشده است' });
  res.json(data);
});

/** شروع جریان OAuth رسمی فیسبوک / اینستاگرام */
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
  res.json({ url: buildOauthUrl(state), redirectNote: 'پس از تأیید، مجدداً به همین برنامه بازمی‌گردید.' });
});

/** مسیر بازگشت OAuth (redirect_uri باید در تنظیمات Meta App ثبت شده باشد) */
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

    // انتخاب اولین حساب تجاری متصل؛ در نسخه توسعه‌یافته می‌توان صفحه انتخاب حساب اضافه کرد
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
      connectedAt: new Date().toISOString(),
      igAccountId: account.igAccountId,
      pageId: account.pageId,
      pageToken: account.pageToken,
      userToken,
      profile: {
        id: profile.id,
        username: profile.username,
        name: profile.name,
        accountType: profile.account_type,
        followersCount: profile.followers_count,
        followsCount: profile.follows_count,
        mediaCount: profile.media_count,
        profilePictureUrl: profile.profile_picture_url,
        website: profile.website,
        biography: profile.biography,
      },
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
