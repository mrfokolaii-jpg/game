import { Router } from 'express';
import { getDB, uid, save, getConnection } from '../store.js';
import { getClient } from '../instagram/index.js';

const router = Router();

function requireConnection(req, res, next) {
  if (!getConnection()) return res.status(403).json({ error: 'ابتدا یک حساب اینستاگرام متصل کنید' });
  next();
}

router.use(requireConnection);

/**
 * انتشار پست / استوری / ریلز.
 * نکته Graph API: آدرس رسانه باید یک URL عمومی و قابل‌دسترس برای سرورهای Meta باشد.
 * فایل‌های آپلودی لوکال فقط در حالت دمو شبیه‌سازی می‌شوند.
 */
router.post('/:kind', async (req, res, next) => {
  try {
    const kind = req.params.kind; // post | story | reel
    if (!['post', 'story', 'reel'].includes(kind)) {
      return res.status(400).json({ error: 'نوع انتشار نامعتبر است' });
    }
    const { caption = '', mediaUrl = '', videoUrl = '' } = req.body;
    const conn = getConnection();
    const record = {
      id: uid('post'),
      kind,
      caption,
      mediaUrl: videoUrl || mediaUrl,
      status: 'pending',
      igMediaId: null,
      createdAt: new Date().toISOString(),
      mode: conn.mode,
    };

    if (conn.mode === 'demo') {
      record.status = 'published-demo';
      record.message = 'انتشار در حالت دمو شبیه‌سازی شد؛ با اتصال واقعی روی صفحه منتشر می‌شود.';
    } else {
      const client = getClient();
      if (kind !== 'story' && !mediaUrl && !videoUrl) {
        return res.status(400).json({ error: 'برای انتشار واقعی، URL عمومی رسانه الزامی است' });
      }
      const mediaType = kind === 'reel' ? 'REELS' : videoUrl ? 'VIDEO' : 'IMAGE';
      const { mediaId } = await client.publish({
        mediaType,
        mediaUrl,
        videoUrl,
        caption,
        isStory: kind === 'story',
      });
      record.status = 'published';
      record.igMediaId = mediaId;
    }

    getDB().posts.unshift(record);
    save();
    res.json(record);
  } catch (e) { next(e); }
});

router.get('/', (req, res) => {
  res.json({ posts: getDB().posts });
});

export default router;
