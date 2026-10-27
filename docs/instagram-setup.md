# راهنمای اتصال رسمی اینستاگرام (Meta Developer)

این راهنما قدم‌به‌قدم اتصال واقعی کنتاکتور به Instagram Graph API را نشان می‌دهد.

## ۱) آماده‌سازی حساب اینستاگرام

1. وارد اپ اینستاگرام شوید → **Settings and privacy → Account type and tools → Switch to professional account**.
2. نوع **Business** (یا Creator) را انتخاب کنید.
3. حساب را به یک **صفحه فیسبوک (Facebook Page)** که مدیریتش را دارید متصل کنید
   (در همان منوی Professional dashboard یا از تنظیمات Page).

## ۲) ساخت Meta App

1. به [developers.facebook.com/apps](https://developers.facebook.com/apps) بروید و **Create App** را بزنید.
2. نوع اپ را **Business** انتخاب کنید.
3. در داشبورد اپ، محصول **Instagram Graph API** را با دکمه «Set up» اضافه کنید.
4. از مسیر **App settings → Basic** مقادیر زیر را بردارید:
   - **App ID** → `META_APP_ID`
   - **App Secret** → `META_APP_SECRET`

## ۳) پیکربندی OAuth و آدرس بازگشت

در بخش **Facebook Login → Settings** (یا Instagram API setup):

- **Valid OAuth Redirect URIs:**
  `https://your-domain.example/api/instagram/callback`
- برای توسعه لوکال می‌توانید `http://localhost:3000/api/instagram/callback` را هم اضافه کنید.
- همین دامنه باید دقیقاً در متغیر `APP_URL` فایل `.env` ست شده باشد.

## ۴) دسترسی‌های درخواستی (Scopes)

کنتاکتور هنگام ورود این دسترسی‌ها را می‌خواهد:

| Scope | کاربرد |
|---|---|
| `instagram_basic` | خواندن پروفایل و رسانه‌ها |
| `instagram_content_publish` | انتشار پست/استوری/ریلز |
| `instagram_manage_messages` | خواندن و پاسخ دایرکت |
| `instagram_manage_comments` | مدیریت کامنت‌ها |
| `pages_show_list`, `pages_read_engagement` | دسترسی به صفحه متصل |
| `pages_manage_metadata` | وب‌هوک‌ها و پیام‌رسانی |
| `business_management` | دسترسی به دارایی‌های بیزینس |

## ۵) تست در حالت Development

اپ‌های تازه‌ساخته در حالت **Development** هستند؛ در این حالت فقط افرادی که در بخش
**Roles → Instagram Testers / App Roles** اضافه شده‌اند می‌توانند وارد شوند:

1. حساب اینستاگرام تستی را به‌عنوان **Instagram Tester** دعوت کنید.
2. دعوت را از داخل همان حساب اینستاگرام (Settings → Apps invites) بپذیرید.
3. حالا دکمه «ورود امن با Facebook Login» در وب‌اپ کار می‌کند.

## ۶) انتشار عمومی (Live Mode)

برای استفاده مشتریان واقعی:

1. از **App Review → Requests** دسترسی‌های بالا را با ویدیوی دموی کاربرد درخواست دهید.
2. تأیید هویت بیزینس (Business Verification) را کامل کنید.
3. اپ را از Development به **Live** ببرید.

## ۷) نکات API

- **انتشار رسانه:** آدرس تصویر/ویدیو باید عمومی و برای سرورهای Meta قابل دانلود باشد
  (مثلاً روی S3/CDN). فایل لوکال کار نمی‌کند.
- محدودیت نرخ: ۵۰ انتشار در هر ۲۴ ساعت برای هر حساب.
- ویدیو/ریلز بعد از ساخت کانتینر، چند ثانیه در حالت `IN_PROGRESS` است؛ در نسخه production
  قبل از publish باید وضعیت کانتینر polling شود (کلاینت `graph.js` برای نسخه ساده بلافاصله publish می‌کند).
- **Hashtag Search:** فقط هشتگ‌هایی را برمی‌گرداند که محتوای عمومی دارند و حداکثر ۳۰ هشتگ در ۷ روز.
- **دایرکت:** فقط برای حساب‌های Business متصل به Page فعال است و پیام به کاربرانی که در ۲۴ ساعت
  اخیر به پیج پیام داده‌اند آزاد است (قانون ۲۴ ساعته Meta).

## ۸) عیب‌یابی

| خطا | علت محتمل |
|---|---|
| `state_mismatch` | کوکی سشن بین شروع OAuth و بازگشت عوض شده؛ جریان را دوباره شروع کنید |
| `no_instagram_account` | هیچ Page فیسبوکی حساب اینستاگرام Business متصل ندارد |
| خطای ۴۰۳ در انتشار | scope محتوا تأیید نشده یا حساب Professional نیست |
| `redirect_uri mismatch` | آدرس بازگشت با ثبت‌شده در Meta App یکی نیست |
