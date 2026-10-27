import fs from 'node:fs';
import path from 'node:path';
import { UPLOADS_DIR } from '../config.js';
import { uid } from '../store.js';

const PALETTES = [
  { a: '#833ab4', b: '#fd1d1d', c: '#fcb045' }, // گرادیان اینستاگرامی
  { a: '#0f9b8e', b: '#11998e', c: '#38ef7d' },
  { a: '#1f2937', b: '#374151', c: '#f59e0b' },
  { a: '#7f00ff', b: '#e100ff', c: '#fce7f3' },
];

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

/** شکستن متن فارسی به خطوط تقریبی بر اساس طول */
function wrapText(text, maxLen = 26) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxLen) {
      if (line) lines.push(line.trim());
      line = w;
    } else {
      line += ' ' + w;
    }
  }
  if (line) lines.push(line.trim());
  return lines.slice(0, 5);
}

/**
 * تولید پوستر گرافیکی SVG برای پست/استوری اینستاگرام.
 * خروجی فایل در public/uploads ذخیره و آدرس عمومی آن برگردانده می‌شود.
 */
export function generatePoster({ title, subtitle = '', brand = '', format = 'post' }) {
  const isStory = format === 'story';
  const w = isStory ? 1080 : 1080;
  const h = isStory ? 1920 : 1080;
  const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  const id = uid('poster');

  const titleLines = wrapText(title || 'عنوان پست', isStory ? 22 : 24);
  const subLines = subtitle ? wrapText(subtitle, isStory ? 30 : 34).slice(0, 3) : [];

  const titleSize = isStory ? 64 : 58;
  const lineGap = titleSize * 1.5;
  const startY = h / 2 - ((titleLines.length - 1) * lineGap) / 2 - (subLines.length ? 60 : 0);

  const titleTspans = titleLines
    .map((line, i) =>
      `<tspan x="${w / 2}" y="${startY + i * lineGap}">${escapeXml(line)}</tspan>`)
    .join('');

  const subTspans = subLines
    .map((line, i) =>
      `<tspan x="${w / 2}" y="${startY + titleLines.length * lineGap + 40 + i * 52}" class="sub">${escapeXml(line)}</tspan>`)
    .join('');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.a}"/>
      <stop offset="55%" stop-color="${palette.b}"/>
      <stop offset="100%" stop-color="${palette.c}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <circle cx="${w * 0.85}" cy="${h * 0.12}" r="260" fill="url(#glow)"/>
  <circle cx="${w * 0.12}" cy="${h * 0.88}" r="320" fill="url(#glow)"/>
  <circle cx="${w * 0.5}" cy="${h * 0.5}" r="${isStory ? 420 : 360}" fill="#000000" opacity="0.18"/>
  <text direction="rtl" unicode-bidi="bidi-override" text-anchor="middle"
        font-family="Tahoma, 'Segoe UI', sans-serif" font-weight="bold"
        font-size="${titleSize}" fill="#ffffff">${titleTspans}</text>
  <text direction="rtl" unicode-bidi="bidi-override" text-anchor="middle"
        font-family="Tahoma, 'Segoe UI', sans-serif" font-size="34"
        fill="#ffffff" opacity="0.92">${subTspans}</text>
  <text x="${w / 2}" y="${h - (isStory ? 120 : 80)}" text-anchor="middle"
        direction="rtl" unicode-bidi="bidi-override"
        font-family="Tahoma, 'Segoe UI', sans-serif" font-size="30"
        fill="#ffffff" opacity="0.85">${escapeXml(brand || 'کنتاکتور اینستگرام')}</text>
</svg>`;

  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const fileName = `${id}.svg`;
  fs.writeFileSync(path.join(UPLOADS_DIR, fileName), svg, 'utf8');
  return {
    id,
    url: `/uploads/${fileName}`,
    kind: isStory ? 'story-poster' : 'post-poster',
    createdAt: new Date().toISOString(),
  };
}
