import { Router } from 'express';
import { getDB, getConnection, uid, save } from '../store.js';
import { getClient, ensureDemoSeed } from '../instagram/index.js';
import { mockHashtagScan } from '../instagram/mock.js';
import * as agent from '../ai/agent.js';

const router = Router();

function requireConnection(req, res, next) {
  if (!getConnection()) return res.status(403).json({ error: 'ابتدا یک حساب اینستاگرام متصل کنید' });
  next();
}

router.use(requireConnection);

// ─── مشتریان بالقوه (Leads) ───────────────────────────────────
router.get('/', (req, res) => {
  ensureDemoSeed();
  res.json({ leads: getDB().leads });
});

/** اسکن هشتگ برای کشف مشتری بالقوه — رسمی از طریق Hashtag Search API */
router.post('/scan', async (req, res, next) => {
  try {
    const { hashtag } = req.body;
    if (!hashtag) return res.status(400).json({ error: 'هشتگ الزامی است' });
    const conn = getConnection();
    let found;

    if (conn.mode === 'demo') {
      found = mockHashtagScan(hashtag);
    } else {
      const client = getClient();
      const tagId = await client.findHashtagId(hashtag);
      if (!tagId) return res.status(404).json({ error: 'هشتگ در Graph API یافت نشد' });
      const data = await client.recentMediaByHashtag(tagId, 10);
      found = (data.data || []).map((m) => ({
        id: uid('lead'),
        handle: '@' + (m.owner?.username || 'instagram_user'),
        name: m.owner?.name || 'کاربر اینستاگرام',
        source: hashtag.startsWith('#') ? hashtag : '#' + hashtag,
        reason: 'اخیراً محتوای مرتبط با هشتگ هدف منتشر کرده',
        score: 60 + Math.floor(Math.random() * 30),
        scannedAt: new Date().toISOString(),
        stage: 'آگاهی',
        note: (m.caption || '').slice(0, 120),
      }));
    }

    const db = getDB();
    db.leads.unshift(...found);
    save();
    res.json({ found, leads: db.leads });
  } catch (e) { next(e); }
});

router.patch('/:id', (req, res) => {
  const lead = getDB().leads.find((l) => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'سرنخ یافت نشد' });
  const { stage, note } = req.body;
  if (stage) lead.stage = stage;
  if (typeof note === 'string') lead.note = note;
  save();
  res.json(lead);
});

// ─── کمپین‌های تبلیغاتی ───────────────────────────────────────
router.get('/campaigns', (req, res) => {
  ensureDemoSeed();
  res.json({ campaigns: getDB().campaigns });
});

router.post('/campaigns', (req, res) => {
  const { name, goal, audience, budget } = req.body;
  if (!name) return res.status(400).json({ error: 'نام کمپین الزامی است' });
  const campaign = {
    id: uid('camp'),
    name,
    goal: goal || 'افزایش فروش',
    audience: audience || '',
    budget: budget || '',
    status: 'پیش‌نویس',
    brief: '',
    createdAt: new Date().toISOString(),
  };
  getDB().campaigns.unshift(campaign);
  save();
  res.json(campaign);
});

/** تولید بریف هوشمند کمپین با ایجنت */
router.post('/campaigns/brief', async (req, res, next) => {
  try {
    const brief = await agent.generateCampaignBrief(req.body);
    res.json(brief);
  } catch (e) { next(e); }
});

export default router;
