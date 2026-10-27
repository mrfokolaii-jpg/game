import { config } from '../config.js';
import { getArenaConfig } from '../store.js';
import * as local from './local-agent.js';

/**
 * آداپتور ایجنت هوش مصنوعی.
 * اگر کلید ARENA_API_KEY (در env یا تنظیمات برنامه) موجود باشد،
 * درخواست‌ها به اندپوینت Arena با قرارداد سازگار با Chat Completions فرستاده می‌شوند؛
 * در غیر این صورت — یا در صورت خطا — ایجنت محلی فارسی پاسخ می‌دهد تا برنامه همیشه کار کند.
 */

function effectiveConfig() {
  const saved = getArenaConfig();
  return {
    apiUrl: saved.apiUrl || config.arena.apiUrl,
    apiKey: saved.apiKey || config.arena.apiKey,
    model: saved.model || config.arena.model,
  };
}

async function callArena({ system, user, expectJson = false }) {
  const cfg = effectiveConfig();
  if (!cfg.apiKey) return null; // بدون کلید: مستقیم سراغ ایجنت محلی

  const res = await fetch(`${cfg.apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.85,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      ...(expectJson ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Arena API ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('پاسخ ایجنت Arena خالی بود');

  if (expectJson) {
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    return JSON.parse(content.slice(start, end + 1));
  }
  return content.trim();
}

/** اجرای امن: اول Arena، در صورت نبود کلید/خطا، ایجنت محلی */
async function runAgent({ system, user, expectJson, localFn, args }) {
  try {
    const out = await callArena({ system, user, expectJson });
    if (out === null) return localFn(args);
    return out;
  } catch (err) {
    console.warn('[ai] سقوط به ایجنت محلی:', err.message);
    return localFn(args);
  }
}

const BRAND_RULES = `تو یک مدیر بازاریابی و محتوای حرفه‌ای اینستاگرام هستی.
همیشه به فارسی روان و جذاب بنویس، از ایموجی مرتبط و خلاقانه استفاده کن،
محتوا باید برای کسب‌وکارهای ایرانی کاربردی، فروش‌محور اما غیراسپمی باشد.`;

export function generateCaption(input) {
  return runAgent({
    system: `${BRAND_RULES} خروجی حتما JSON معتبر با کلیدهای caption (رشته)، hashtags (آرایه رشته) باشد.`,
    user: `برای این موضوع کپشن اینستاگرام بنویس:\nموضوع: ${input.topic}\nلحن: ${input.tone || 'دوستانه'}\nکلمات کلیدی: ${input.keywords || '-'}`,
    expectJson: true,
    localFn: local.makeCaption,
    args: input,
  });
}

export function generateIdeas(input) {
  return runAgent({
    system: `${BRAND_RULES} خروجی JSON معتبر با کلید ideas که آرایه‌ای از اشیاء {title, type, hook} است.`,
    user: `برای حوزه «${input.niche}» تعداد ${input.count || 6} ایده محتوا (پست/ریلز/استوری) بده.`,
    expectJson: true,
    localFn: local.makeIdeas,
    args: input,
  });
}

export function generateHashtags(input) {
  return runAgent({
    system: `${BRAND_RULES} خروجی JSON معتبر با کلید groups که آرایه‌ای از {label, tags} است.`,
    user: `برای موضوع «${input.topic}» سه گروه هشتگ (پرترافیک، تخصصی، نیش/محلی) پیشنهاد بده.`,
    expectJson: true,
    localFn: local.makeHashtags,
    args: input,
  });
}

export function generateReelScript(input) {
  return runAgent({
    system: `${BRAND_RULES} خروجی JSON معتبر با کلیدهای title, duration, scenes (آرایه {sec, visual, overlay, voiceover}), caption باشد.`,
    user: `اسکریپت ریلز برای: ${input.topic}`,
    expectJson: true,
    localFn: local.makeReelScript,
    args: input,
  });
}

export function generateStoryScript(input) {
  return runAgent({
    system: `${BRAND_RULES} خروجی JSON معتبر با کلیدهای frames (آرایه {frame, text, sticker, cta}) باشد.`,
    user: `برای موضوع «${input.topic}» یک استوری چند فریمی تعاملی بساز.`,
    expectJson: true,
    localFn: local.makeStoryScript,
    args: input,
  });
}

export function generateSmartReply(input) {
  return runAgent({
    system: `${BRAND_RULES} لحن پاسخ مؤدبانه، کوتاه و قانع‌کننده باشد. خروجی JSON با کلید reply (رشته) و intent (رشته).`,
    user: `به این دایرکت پاسخ بده:\nپیام مشتری: ${input.message}\nزمینه: ${input.context || '-'}`,
    expectJson: true,
    localFn: local.makeReply,
    args: input,
  });
}

export function generateCampaignBrief(input) {
  return runAgent({
    system: `${BRAND_RULES} خروجی JSON با کلیدهای objective, audience, pillars (آرایه), schedule (آرایه), kpis (آرایه), budgetSuggestion باشد.`,
    user: `برای کمپین «${input.name || input.goal || 'فروش'}» با هدف ${input.goal || 'افزایش فروش'} بریف تبلیغاتی بده.`,
    expectJson: true,
    localFn: local.makeCampaignBrief,
    args: input,
  });
}

export function agentChat(input) {
  return runAgent({
    system: BRAND_RULES,
    user: input.message,
    expectJson: false,
    localFn: local.makeChat,
    args: input,
  });
}

export function agentMode() {
  const cfg = effectiveConfig();
  return cfg.apiKey ? 'arena' : 'local-demo';
}
