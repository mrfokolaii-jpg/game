import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, isDemoMode } from './src/config.js';
import { loadDB, saveNow } from './src/store.js';
import { sessionMiddleware } from './src/middleware/session.js';
import connectRoutes from './src/routes/connect.js';
import studioRoutes from './src/routes/studio.js';
import publishRoutes from './src/routes/publish.js';
import messageRoutes from './src/routes/messages.js';
import leadRoutes from './src/routes/leads.js';
import agentRoutes from './src/routes/agent.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

loadDB();

app.use(express.json({ limit: '12mb' }));
app.use(sessionMiddleware);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.json({ ok: true, demoMode: isDemoMode() }));

app.use('/api/instagram', connectRoutes);
app.use('/api/studio', studioRoutes);
app.use('/api/publish', publishRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/agent', agentRoutes);

// SPA fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// مدیریت متمرکز خطاها
app.use((err, req, res, next) => {
  console.error('API error:', err.message);
  res.status(500).json({ error: err.message || 'خطای داخلی سرور' });
});

app.listen(config.port, '0.0.0.0', () => {
  console.log('──────────────────────────────────────────────');
  console.log('  کنتاکتور اینستگرام');
  console.log(`  حالت اجرا: ${isDemoMode() ? 'دمو (بدون Meta App)' : 'اتصال واقعی'}`);
  console.log(`  آدرس: ${config.appUrl || 'http://localhost:' + config.port}`);
  console.log('──────────────────────────────────────────────');
});

// ذخیره‌سازی نهایی هنگام خاموش‌شدن
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    saveNow();
    process.exit(0);
  });
}
