import { Router } from 'express';
import { getDB, getConnection, uid, save } from '../store.js';
import { getClient, ensureDemoSeed } from '../instagram/index.js';
import * as agent from '../ai/agent.js';

const router = Router();

function requireConnection(req, res, next) {
  if (!getConnection()) return res.status(403).json({ error: 'ابتدا یک حساب اینستاگرام متصل کنید' });
  next();
}

router.use(requireConnection);

/** فهرست گفتگوها — در حالت واقعی از conversations API نگاشت می‌شود */
router.get('/', async (req, res, next) => {
  try {
    const conn = getConnection();
    if (conn.mode === 'demo') {
      ensureDemoSeed();
      return res.json({ threads: getDB().threads, mode: 'demo' });
    }
    const client = getClient();
    const threads = await client.listThreads();
    res.json({ threads, mode: 'real' });
  } catch (e) { next(e); }
});

/** پیشنهاد پاسخ هوشمند برای آخرین پیام هر گفتگو */
router.post('/:id/suggest', async (req, res, next) => {
  try {
    const thread = getDB().threads.find((t) => t.id === req.params.id);
    if (!thread) return res.status(404).json({ error: 'گفتگو یافت نشد' });
    const last = [...thread.messages].reverse().find((m) => m.from === 'them');
    if (!last) return res.status(400).json({ error: 'پیامی برای پاسخ وجود ندارد' });
    const result = await agent.generateSmartReply({
      message: last.text,
      context: thread.tags?.join('، ') || '',
    });
    res.json(result);
  } catch (e) { next(e); }
});

/** ارسال پاسخ — حالت واقعی از Instagram Messaging API استفاده می‌کند */
router.post('/:id/reply', async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'متن پیام خالی است' });
    const conn = getConnection();
    const thread = getDB().threads.find((t) => t.id === req.params.id);
    if (!thread) return res.status(404).json({ error: 'گفتگو یافت نشد' });

    if (conn.mode === 'real') {
      const client = getClient();
      await client.sendText(thread, text);
    }
    thread.messages.push({ id: uid('msg'), from: 'me', text: text.trim(), at: new Date().toISOString() });
    thread.unread = 0;
    save();
    res.json({ ok: true, thread });
  } catch (e) { next(e); }
});

export default router;
