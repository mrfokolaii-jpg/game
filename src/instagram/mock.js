/**
 * داده‌های شبیه‌سازی‌شده برای حالت دمو.
 * در نبود اعتبارنامه‌ی Meta App، کل برنامه با همین داده‌ها کار می‌کند
 * تا همه‌ی قابلیت‌ها قبل از اتصال واقعی قابل آزمایش باشند.
 */

export function mockProfile() {
  return {
    id: 'demo_ig_178920331',
    username: 'sabzineh.plants',
    name: 'گلخانه سبزینه | گیاهان آپارتمانی',
    accountType: 'BUSINESS',
    followersCount: 18420,
    followsCount: 312,
    mediaCount: 286,
    profilePictureUrl: '',
    website: 'https://sabzineh.example',
    biography: '🌿 خرید آنلاین گیاهان آپارتمانی و گل‌های زینتی\n🚚 ارسال به سراسر کشور\n💬 مشاوره رایگان پرورش گیاه',
    demo: true,
  };
}

export function mockMedia() {
  const items = [
    ['معرفی تراریوم جدید', 'IMAGE', 1240, 86, 34],
    ['آموزش آبیاری پوتوس', 'VIDEO', 8900, 1240, 156],
    ['کد تخفیف آخر هفته', 'IMAGE', 3120, 210, 78],
    ['پشت صحنه گلخانه', 'VIDEO', 15600, 980, 210],
    ['نکات تعویض گلدان', 'IMAGE', 2010, 145, 52],
    ['ریلز معرفی مونسترا', 'VIDEO', 24800, 2100, 340],
  ];
  return items.map(([caption, mediaType, reach, likes, comments], i) => ({
    id: `demo_media_${i + 1}`,
    caption,
    mediaType,
    mediaUrl: '',
    permalink: `https://instagram.com/p/demo${i + 1}`,
    timestamp: new Date(Date.now() - i * 86400000).toISOString(),
    insights: { reach, likes, comments },
  }));
}

export function mockThreads() {
  const base = Date.now();
  const day = 86400000;
  return [
    {
      id: 'thread_1',
      participant: 'مریم احمدی',
      handle: '@maryam.plantslover',
      avatar: '',
      status: 'lead',
      tags: ['مشتری بالقوه', 'تراریوم'],
      messages: [
        { id: 'm1', from: 'them', text: 'سلام، تراریوم مدور بزرگ موجوده؟ قیمتش چنده؟', at: new Date(base - 2 * day).toISOString() },
        { id: 'm2', from: 'them', text: 'ارسالش به کرج چند روزه؟', at: new Date(base - 2 * day + 600000).toISOString() },
      ],
      unread: 2,
    },
    {
      id: 'thread_2',
      participant: 'علی رضایی',
      handle: '@ali_rezaei78',
      avatar: '',
      status: 'customer',
      tags: ['مشتری فعلی'],
      messages: [
        { id: 'm1', from: 'them', text: 'سلام، گیاهی که هفته پیش رسید برگ‌هاش داره زرد میشه، چیکار کنم؟', at: new Date(base - day).toISOString() },
      ],
      unread: 1,
    },
    {
      id: 'thread_3',
      participant: 'سارا کریمی',
      handle: '@sara.krmi',
      avatar: '',
      status: 'lead',
      tags: ['مونسترا'],
      messages: [
        { id: 'm1', from: 'them', text: 'درود ❤️ ریلز مونستراتون عالی بود، هنوز موجود دارید؟', at: new Date(base - 3600000 * 5).toISOString() },
      ],
      unread: 1,
    },
    {
      id: 'thread_4',
      participant: 'حسین مرادی',
      handle: '@hossein_moradi',
      avatar: '',
      status: 'spam',
      tags: [],
      messages: [
        { id: 'm1', from: 'them', text: 'تبادل تبلیغ می‌کنید؟ پیج ما ۵۰ کا فالوور داره', at: new Date(base - 3 * day).toISOString() },
      ],
      unread: 0,
    },
  ];
}

export function mockLeads() {
  return [
    { id: 'lead_1', name: 'مریم احمدی', handle: '@maryam.plantslover', source: 'دایرکت', interest: 'تراریوم مدور', stage: 'در حال مذاکره', score: 82, note: 'پیگیری قیمت و ارسال به کرج', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    { id: 'lead_2', name: 'سارا کریمی', handle: '@sara.krmi', source: 'ریلز مونسترا', interest: 'مونسترا دلیسیوسا', stage: 'مشتری جدید', score: 91, note: 'از ریلز جذب شده، آماده خرید', createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
    { id: 'lead_3', name: 'نگار صادقی', handle: '@negar_sadeghi', source: 'هشتگ #گیاه_آپارتمانی', interest: 'پوتوس طلایی', stage: 'آگاهی', score: 54, note: 'روی پست آموزشی کامنت گذاشته', createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
    { id: 'lead_4', name: 'رضا توکلی', handle: '@reza.tavakoli', source: 'کامنت', interest: 'مشاوره فضای سبز اداری', stage: 'واجد شرایط', score: 73, note: 'سه کامنت پشت سر هم، نیاز به تماس', createdAt: new Date(Date.now() - 1.5 * 86400000).toISOString() },
  ];
}

export function mockCampaigns() {
  return [
    {
      id: 'camp_1',
      name: 'کمپین تخفیف پاییزه',
      goal: 'افزایش فروش',
      audience: 'علاقه‌مندان گیاهان آپارتمانی ۲۵ تا ۴۵ ساله',
      budget: '۲۵٬۰۰۰٬۰۰۰ ریال',
      status: 'در حال اجرا',
      brief: 'تمرکز روی تراریوم‌ها با کد تخفیف ۲۰٪ و سه ریلز آموزشی در ۱۰ روز.',
      createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    },
  ];
}

export function mockHashtagScan(tag) {
  const clean = tag.replace(/^#/, '');
  const names = ['کاربر علاقه‌مند', 'باغبان آماتور', 'علاقه‌مند گل و گیاه', 'مشتری بالقوه'];
  return Array.from({ length: 6 }, (_, i) => ({
    id: `scan_${Date.now()}_${i}`,
    handle: `@user_${clean}_${i + 1}`,
    name: names[i % names.length],
    source: `#${clean}`,
    reason: i % 2 === 0 ? 'پست مرتبط با حوزه کاری شما منتشر کرده' : 'روی پست‌های مشابه کامنت فعال داشته',
    score: 60 + ((i * 7) % 35),
    scannedAt: new Date().toISOString(),
  }));
}
