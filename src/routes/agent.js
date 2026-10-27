import { Router } from 'express';
import { getSettings, updateSettings } from '../store.js';
import * as agent from '../ai/agent.js';

const router = Router();

router.get('/mode', (req, res) => {
  res.json({ mode: agent.agentMode() });
});

router.get('/settings', (req, res) => {
  res.json(getSettings());
});

router.put('/settings', (req, res) => {
  const { arenaApiUrl, arenaApiKey, arenaModel } = req.body;
  res.json(updateSettings({ arenaApiUrl, arenaApiKey, arenaModel }));
});

/** چت آزاد با ایجنت Arena (یا ایجنت محلی در حالت دمو) */
router.post('/chat', async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'پیام خالی است' });
    const reply = await agent.agentChat({ message });
    res.json({ reply, mode: agent.agentMode() });
  } catch (e) { next(e); }
});

export default router;
