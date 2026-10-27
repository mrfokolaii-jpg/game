import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { UPLOADS_DIR } from '../config.js';
import { getDB, uid, save } from '../store.js';
import * as agent from '../ai/agent.js';
import { generatePoster } from '../studio/poster.js';

const router = Router();

function requireConnection(req, res, next) {
  if (!getDB().connection) {
    return res.status(403).json({ error: 'ابتدا یک حساب اینستاگرام متصل کنید' });
  }
  next();
}

router.use(requireConnection);

router.post('/caption', async (req, res, next) => {
  try {
    const { topic, tone, keywords } = req.body;
    if (!topic) return res.status(400).json({ error: 'موضوع محتوا الزامی است' });
    res.json(await agent.generateCaption({ topic, tone, keywords }));
  } catch (e) { next(e); }
});

router.post('/ideas', async (req, res, next) => {
  try {
    const { niche, count } = req.body;
    if (!niche) return res.status(400).json({ error: 'حوزه فعالیت الزامی است' });
    res.json(await agent.generateIdeas({ niche, count }));
  } catch (e) { next(e); }
});

router.post('/hashtags', async (req, res, next) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: 'موضوع الزامی است' });
    res.json(await agent.generateHashtags({ topic }));
  } catch (e) { next(e); }
});

router.post('/reel-script', async (req, res, next) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: 'موضوع ریلز الزامی است' });
    res.json(await agent.generateReelScript({ topic }));
  } catch (e) { next(e); }
});

router.post('/story-script', async (req, res, next) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: 'موضوع استوری الزامی است' });
    res.json(await agent.generateStoryScript({ topic }));
  } catch (e) { next(e); }
});

/** ساخت پوستر گرافیکی SVG (تصویر پست یا استوری) */
router.post('/poster', (req, res) => {
  const { title, subtitle, brand, format } = req.body;
  if (!title) return res.status(400).json({ error: 'عنوان پوستر الزامی است' });
  const poster = generatePoster({ title, subtitle, brand, format });
  getDB().media.unshift({ ...poster, name: title, source: 'generator' });
  save();
  res.json(poster);
});

/** آپلود تصویر به‌صورت data URL (بدون وابستگی multer) */
router.post('/upload', (req, res) => {
  const { name, dataUrl } = req.body;
  if (!dataUrl || !/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/.test(dataUrl)) {
    return res.status(400).json({ error: 'فقط فرمت‌های تصویری png/jpg/webp/gif/svg پذیرفته می‌شود' });
  }
  const mime = dataUrl.slice(5, dataUrl.indexOf(';')).replace('image/', '');
  const ext = { 'jpeg': 'jpg', 'svg+xml': 'svg', 'png': 'png', 'webp': 'webp', 'gif': 'gif' }[mime] || 'img';
  const id = uid('media');
  const fileName = `${id}.${ext}`;
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOADS_DIR, fileName), Buffer.from(dataUrl.split(',')[1], 'base64'));

  const record = {
    id,
    name: name || fileName,
    type: 'image',
    url: `/uploads/${fileName}`,
    source: 'upload',
    createdAt: new Date().toISOString(),
  };
  getDB().media.unshift(record);
  save();
  res.json(record);
});

router.get('/media', (req, res) => {
  res.json({ media: getDB().media });
});

export default router;
