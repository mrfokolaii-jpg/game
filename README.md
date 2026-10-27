# کنتاکتور اینستگرام (Instagram Contactor)

اتصال‌دهنده (کنتاکتور) رسمی و تحت وب برای مدیریت هوشمند صفحه اینستاگرام؛ مجهز به ایجنت هوش مصنوعی Arena برای
تولید محتوا، انتشار پست/استوری/ریلز، دایرکت هوشمند، جذب مشتری و طراحی کمپین‌های تبلیغاتی.

> نام پیشنهادی مخزن در گیت‌هاب: **`instagram-contactor`**
> (گیت‌هاب نام فارسی برای مخزن نمی‌پذیرد؛ عنوان فارسی در توضیحات مخزن قرار می‌گیرد.)

---

## ✨ امکانات

| بخش | قابلیت‌ها |
|---|---|
| 🔗 اتصال | ورود امن با **Facebook Login (OAuth 2.0 رسمی Meta)** + حالت دمو با داده نمونه |
| 📊 داشبورد | آمار ریچ، نمایش، نرخ تعامل، دنبال‌کننده و آخرین محتواها |
| 🎨 استودیو محتوا | تولید کپشن فروش‌محور، ایده محتوا، هشتگ هدفمند، اسکریپت ریلز، استوری تعاملی، **پوستر گرافیکی SVG** |
| 🚀 انتشار | پست فید، استوری و ریلز از طریق **Instagram Content Publishing API** + تاریخچه انتشار |
| 💬 دایرکت هوشمند | صندوق ورودی، تشخیص قصد مشتری، پیشنهاد پاسخ هوشمند و ارسال از طریق **Instagram Messaging API** |
| 🎯 جذب مشتری | کشف سرنخ با **Hashtag Search API**، مدیریت قیف فروش (مرحله‌بندی سرنخ‌ها) |
| 📢 تبلیغات | ساخت کمپین و تولید بریف هوشمند (مخاطب، تقویم محتوا، KPI، بودجه) |
| 🤖 ایجنت Arena | اتصال به اندپوینت `https://arena.ai/agent` با کلید API؛ در نبود کلید، موتور محلی فارسی فعال است |
| 🖼️ کتابخانه رسانه | آپلود تصویر و تولید پوستر، ذخیره روی سرور |

## ⚠️ چرا فرم یوزرنیم/پسورد نداریم؟ (مهم)

اینستاگرام (طبق قوانین Meta) ورود با نام کاربری و رمز عبور در ابزارهای شخص ثالث را ممنوع کرده است:

- ابزارهایی که رمز اینستاگرام می‌گیرند (ربات‌های غیررسمی مثل کتابخانه‌های موبایل‌محور) باعث
  **مسدود یا حذف دائمی پیج** می‌شوند.
- ذخیره رمز، ریسک امنیتی جدی برای کاربران دارد.
- تنها مسیر رسمی و امن، **OAuth از طریق فیسبوک** است که در این پروژه پیاده‌سازی شده؛ رمز شما
  هرگز وارد این سیستم نمی‌شود و فقط توکن دسترسی روی سرور خودتان نگهداری می‌شود.

محدودیت‌های API رسمی: دنبال‌کردن انبوه، لایک انبوه، اسکرپ فالوورها و پیام گروهی خودکار امکان‌پذیر نیست
و هر کسی ادعای این کارها را بکند، از مسیرهای غیرمجاز استفاده می‌کند.

## 🚀 شروع سریع (حالت دمو، بدون نیاز به اعتبارنامه)

```bash
npm install
npm start
# مرورگر: http://localhost:3000
```

سپس روی **«اتصال نمونه (دمو)»** بزنید. تمام قابلیت‌ها با داده‌های فارسی نمونه قابل آزمایش هستند.

## 🔐 اتصال واقعی اینستاگرام

پیش‌نیازها:

1. یک حساب **تجاری (Business) یا سازنده (Creator)** اینستاگرام که به یک صفحه فیسبوک متصل باشد.
2. یک App در [developers.facebook.com](https://developers.facebook.com) از نوع Business.

سپس فایل `.env` را بسازید (نمونه: [`.env.example`](.env.example)):

```env
PORT=3000
APP_URL=https://your-domain.example
META_APP_ID=1234567890
META_APP_SECRET=xxxxxxxx
META_GRAPH_VERSION=v21.0
```

مراحل کامل ثبت اپ، OAuth و مجوزها در مستند
[docs/instagram-setup.md](docs/instagram-setup.md) توضیح داده شده است.

> برای انتشار واقعی، فایل رسانه باید یک **URL عمومی و قابل‌دسترس** برای سرورهای Meta باشد
> (آپلودهای لوکال فقط در حالت دمو شبیه‌سازی می‌شوند).

## 🤖 پیکربندی ایجنت Arena

از صفحه **«تنظیمات ایجنت»** در وب، یا از طریق متغیرهای محیطی:

```env
ARENA_API_URL=https://arena.ai/agent
ARENA_API_KEY=کلید_شما
ARENA_MODEL=arena-agent
```

قرارداد فراخوانی، سازگار با Chat Completions است
(`POST {ARENA_API_URL}/chat/completions` با هدر `Authorization: Bearer`).
اگر کلید وارد نشود یا اندپوینت در دسترس نباشد، برنامه به‌صورت خودکار با **موتور محلی فارسی**
پاسخ می‌دهد تا هیچ بخشی از کار متوقف نشود.

## 🐳 اجرا با Docker

```bash
docker build -t instagram-contactor .
docker run -p 3000:3000 --env-file .env -v $(pwd)/data:/app/data instagram-contactor
```

## 🧱 ساختار پروژه

```
├── server.js                 # ورودی Express
├── src/
│   ├── config.js             # پیکربندی env
│   ├── store.js              # ذخیره‌سازی JSON (توکن‌ها، سرنخ‌ها، تاریخچه)
│   ├── middleware/session.js # سشن بدون وابستگی خارجی
│   ├── instagram/
│   │   ├── oauth.js          # جریان رسمی OAuth فیسبوک
│   │   ├── graph.js          # کلاینت Instagram Graph API
│   │   ├── mock.js           # داده‌های حالت دمو
│   │   └── index.js          # سیم‌کشی اتصال و داشبورد
│   ├── ai/
│   │   ├── agent.js          # آداپتور Arena + fallback محلی
│   │   └── local-agent.js    # موتور فارسی محلی
│   ├── studio/poster.js      # تولید پوستر SVG
│   └── routes/               # روت‌های REST
├── public/                   # رابط کاربری (HTML/CSS/JS خالص، RTL)
├── data/                     # پایگاه‌داده زمان اجرا (gitignore)
└── legacy/                   # فایل‌های پروژه یونیتی قبلی همین مخزن
```

## 📡 مهم‌ترین endpointها

- `GET  /api/instagram/status` · `POST /api/instagram/demo` · `GET /api/instagram/oauth-url`
- `GET  /api/instagram/callback` · `POST /api/instagram/disconnect`
- `POST /api/studio/{caption,ideas,hashtags,reel-script,story-script,poster,upload}`
- `POST /api/publish/{post,story,reel}` · `GET /api/publish`
- `GET  /api/messages` · `POST /api/messages/:id/suggest` · `POST /api/messages/:id/reply`
- `GET  /api/leads` · `POST /api/leads/scan` · `PATCH /api/leads/:id`
- `GET/POST /api/leads/campaigns` · `POST /api/leads/campaigns/brief`
- `GET/PUT /api/agent/settings` · `POST /api/agent/chat`

## 🔒 نکات امنیتی استقرار

- فایل `.env` و پوشه `data/` هرگز منتشر نشوند (در `.gitignore` قرار دارند).
- پشت HTTPS و یک reverse proxy (nginx/Caddy) اجرا شود و `APP_URL` دقیقاً دامنه عمومی باشد.
- توکن صفحه فیسبوک دسترسی گسترده دارد؛ سرور را فقط خودتان مدیریت کنید.
- برای محیط تولید، ذخیره‌سازی JSON را با یک دیتابیس واقعی (Postgres و…) جایگزین کنید.

## 📄 مجوز

استفاده از این پروژه تابع قوانین رسمی [Meta Platform Terms](https://developers.facebook.com/terms/) و
[Instagram Platform Policy](https://help.instagram.com/581066165581870) است.
