/* ───────────────────────── ابزارهای پایه ───────────────────────── */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const state = {
  view: 'connect',
  status: null,
  connection: null,
  studioTab: 'caption',
  leadsTab: 'leads',
  activeThreadId: null,
  threads: [],
};

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const faNum = (v) => String(v ?? '').replace(/[0-9]/g, (d) => FA_DIGITS[+d]);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'همین حالا';
  if (m < 60) return faNum(m) + ' دقیقه پیش';
  const h = Math.floor(m / 60);
  if (h < 24) return faNum(h) + ' ساعت پیش';
  return faNum(Math.floor(h / 24)) + ' روز پیش';
}

let toastTimer;
function toast(msg, type = '') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3400);
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `خطای سرور (${res.status})`);
  return data;
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(
    () => toast('در حافظه کپی شد ✓', 'success'),
    () => toast('کپی ناموفق بود', 'error')
  );
}

function loadingBtn(btn, text) {
  btn.disabled = true;
  btn.dataset.html = btn.innerHTML;
  btn.innerHTML = `<span class="loader"></span> ${text || 'در حال انجام…'}`;
}
function resetBtn(btn) {
  btn.disabled = false;
  btn.innerHTML = btn.dataset.html || btn.innerHTML;
}

const TITLES = {
  connect: 'اتصال اینستاگرام',
  dashboard: 'داشبورد',
  studio: 'استودیو تولید محتوا',
  publish: 'انتشار پست، استوری و ریلز',
  messages: 'دایرکت هوشمند',
  leads: 'جذب مشتری و تبلیغات',
  settings: 'تنظیمات ایجنت Arena',
};

/* ───────────────────────── راه‌اندازی ───────────────────────── */
async function init() {
  $$('.nav-item').forEach((btn) =>
    btn.addEventListener('click', () => switchView(btn.dataset.view))
  );

  $('#chatFab').addEventListener('click', () => $('#chatPanel').classList.toggle('hidden'));
  $('#chatClose').addEventListener('click', () => $('#chatPanel').classList.add('hidden'));
  $('#chatForm').addEventListener('submit', sendChat);

  // بازگشت از OAuth
  const params = new URLSearchParams(location.search);
  if (params.get('auth') === 'success') toast('اتصال به اینستاگرام برقرار شد ✓', 'success');
  if (params.get('auth') === 'error') toast('خطای اتصال: ' + (params.get('reason') || 'نامشخص'), 'error');
  history.replaceState({}, '', location.pathname);

  await refreshStatus();
  await loadAgentMode();
  switchView(state.connection ? 'dashboard' : 'connect');
  setInterval(pollUnread, 30000);
}

async function refreshStatus() {
  state.status = await api('/api/instagram/status');
  state.connection = state.status.connection;
  const badge = $('#connBadge');
  if (!state.connection) {
    badge.textContent = 'متصل نیست';
    badge.className = 'conn-badge';
  } else if (state.connection.mode === 'demo') {
    badge.textContent = `حالت دمو: ${state.connection.profile.username}`;
    badge.className = 'conn-badge demo';
  } else {
    badge.textContent = `متصل: ${state.connection.profile.username}`;
    badge.className = 'conn-badge ok';
  }
}

async function loadAgentMode() {
  try {
    const { mode } = await api('/api/agent/mode');
    const el = $('#modeBadge');
    if (mode === 'arena') {
      el.textContent = '🤖 ایجنت: Arena متصل';
      el.className = 'mode-badge arena';
    } else {
      el.textContent = '🤖 ایجنت: حالت محلی (دمو)';
      el.className = 'mode-badge local';
    }
  } catch { /* بی‌خیال */ }
}

function switchView(view) {
  state.view = view;
  $$('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  $('#viewTitle').textContent = TITLES[view];
  render();
}

function render() {
  const view = $('#view');
  const map = {
    connect: renderConnect,
    dashboard: renderDashboard,
    studio: renderStudio,
    publish: renderPublish,
    messages: renderMessages,
    leads: renderLeads,
    settings: renderSettings,
  };
  view.innerHTML = map[state.view]();
  const binders = {
    connect: bindConnect,
    dashboard: () => {},
    studio: bindStudio,
    publish: bindPublish,
    messages: bindMessages,
    leads: bindLeads,
    settings: bindSettings,
  }[state.view];
  binders?.();
}

function needConnection() {
  if (state.connection) return false;
  $('#view').innerHTML = `
    <div class="card empty">
      <div style="font-size:40px;margin-bottom:10px">🔗</div>
      <h3>هنوز حسابی متصل نشده است</h3>
      <p>برای استفاده از این بخش ابتدا حساب اینستاگرام خود را متصل کنید.</p>
      <button class="btn btn-primary section-gap" onclick="switchView('connect')">رفتن به صفحه اتصال</button>
    </div>`;
  return true;
}

/* ───────────────────────── صفحه اتصال ───────────────────────── */
function renderConnect() {
  if (state.connection) {
    const p = state.connection.profile;
    return `
      <div class="card">
        <div class="profile-head">
          <div class="avatar">${esc((p.name || p.username || '؟').slice(0, 1))}</div>
          <div style="flex:1">
            <h2>${esc(p.name || p.username)}</h2>
            <div class="handle">${esc(p.username)} · نوع حساب: ${esc(p.accountType || 'BUSINESS')}</div>
            <div class="bio">${esc(p.biography || '')}</div>
          </div>
          <span class="pill ${state.connection.mode === 'demo' ? 'amber' : 'green'}">
            ${state.connection.mode === 'demo' ? 'حالت دمو' : 'اتصال رسمی OAuth'}
          </span>
        </div>
        <div class="grid grid-4 section-gap">
          <div class="stat"><div class="num">${faNum(p.followersCount ?? 0)}</div><div class="lbl">دنبال‌کننده</div></div>
          <div class="stat"><div class="num">${faNum(p.followsCount ?? 0)}</div><div class="lbl">دنبال‌شده</div></div>
          <div class="stat"><div class="num">${faNum(p.mediaCount ?? 0)}</div><div class="lbl">پست</div></div>
          <div class="stat"><div class="num">${timeAgo(state.connection.connectedAt)}</div><div class="lbl">زمان اتصال</div></div>
        </div>
        <div class="copy-row" style="margin-top:18px">
          <button id="disconnectBtn" class="btn btn-danger">قطع اتصال</button>
        </div>
      </div>`;
  }

  return `
  <div class="card connect-hero">
    <div class="big-ico">📸</div>
    <h2>کنتاکتور اتصال‌دهنده اینستاگرام</h2>
    <p>از طریق رابط رسمی Meta (Facebook Login / OAuth 2.0) حساب تجاری یا سازنده خود را متصل کنید تا
    تولید محتوا، انتشار، دایرکت هوشمند و جذب مشتری را از همین داشبورد مدیریت کنید.</p>

    ${state.status?.demoMode ? `
    <div class="security-note" style="background:#eff6ff;border-color:#bfdbfe;margin-bottom:18px">
      <b style="color:#1e40af">ℹ️ وضعیت فعلی سرور: حالت دمو — دکمه ورود رسمی موقتاً غیرفعال است</b><br>
      اتصال واقعی <b>شدنی است</b>، اما هنوز اعتبارنامه‌ی Meta App روی سرور تنظیم نشده. به محض قرار گرفتن
      <span class="mono">META_APP_ID</span> و <span class="mono">META_APP_SECRET</span> در فایل
      <span class="mono">.env</span> و ری‌استارت سرور، دکمه زیر فعال و اتصال به حساب واقعی ممکن می‌شود.
      راهنمای کامل قدم‌به‌قدم در <span class="mono">docs/instagram-setup.md</span> آمده است.
    </div>` : `
    <div class="security-note" style="background:#dcfce7;border-color:#86efac;margin-bottom:18px">
      <b style="color:#065f46">✅ اتصال رسمی آماده است</b> — روی دکمه «ورود امن» بزنید تا از طریق فیسبوک
      وارد حساب اینستاگرام خود شوید و آن را متصل کنید.
    </div>`}

    <div class="grid grid-2" style="text-align:right">
      <div class="card" style="box-shadow:none;background:#fafaff">
        <h3>🧪 تجربه سریع در حالت دمو</h3>
        <p class="hint">بدون نیاز به اعتبارنامه، همه امکانات را با داده‌های نمونه آزمایش کنید.</p>
        <button id="demoBtn" class="btn btn-primary">اتصال نمونه (دمو)</button>
      </div>
      <div class="card" style="box-shadow:none;background:#fafaff">
        <h3>🔐 اتصال رسمی اینستاگرام</h3>
        <p class="hint">نیازمند Meta App با دسترسی Instagram Graph API.</p>
        <button id="oauthBtn" class="btn btn-ghost" ${state.status?.demoMode ? 'disabled' : ''}>
          ورود امن با Facebook Login
        </button>
        ${state.status?.demoMode ? '<p class="small" style="margin-top:10px;color:#b91c1c">غیرفعال: Meta App روی سرور پیکربندی نشده است (مراحل پایین را ببینید).</p>' : ''}
      </div>
    </div>

    <ol class="steps section-gap">
      <li>در <b>developers.facebook.com</b> یک App از نوع Business بسازید و محصول Instagram Graph API را اضافه کنید.</li>
      <li>آدرس بازگشت <span class="mono">/api/instagram/callback</span> را در تنظیمات OAuth ثبت کنید.</li>
      <li>مقادیر <span class="mono">META_APP_ID</span> و <span class="mono">META_APP_SECRET</span> را در فایل <span class="mono">.env</span> قرار دهید.</li>
      <li>حساب اینستاگرام باید <b>تجاری (Business) یا سازنده (Creator)</b> و به یک صفحه فیسبوک متصل باشد.</li>
      <li>روی «ورود امن» بزنید و دسترسی‌ها را تأیید کنید تا حساب اینجا متصل شود.</li>
    </ol>

    <div class="security-note">
      <b>چرا فرم یوزرنیم و پسورد نداریم؟</b><br>
      اینستاگرام طبق قوانین Meta، ورود با نام کاربری و رمز عبور در اپ‌های شخص ثالث را ممنوع کرده و هر ابزاری که رمز شما را بخواهد
      (مثل ربات‌های غیررسمی) باعث <b>مسدود شدن دائمی پیج</b> می‌شود. کنتاکتور فقط از مسیر رسمی OAuth استفاده می‌کند؛
      رمز عبور شما هرگز وارد این سیستم نمی‌شود و توکن‌ها فقط روی همین سرور ذخیره می‌گردند.
    </div>
  </div>`;
}

function bindConnect() {
  $('#demoBtn')?.addEventListener('click', async (e) => {
    loadingBtn(e.currentTarget, 'در حال اتصال…');
    try {
      await api('/api/instagram/demo', { method: 'POST' });
      await refreshStatus();
      toast('حساب نمونه متصل شد ✓', 'success');
      switchView('dashboard');
    } catch (err) { toast(err.message, 'error'); resetBtn(e.currentTarget); }
  });

  $('#oauthBtn')?.addEventListener('click', async (e) => {
    try {
      const { url } = await api('/api/instagram/oauth-url');
      window.location.href = url;
    } catch (err) { toast(err.message, 'error'); }
  });

  $('#disconnectBtn')?.addEventListener('click', async () => {
    await api('/api/instagram/disconnect', { method: 'POST' });
    await refreshStatus();
    toast('اتصال قطع شد');
    switchView('connect');
  });
}

/* ───────────────────────── داشبورد ───────────────────────── */
async function renderDashboard() {
  if (needConnection()) return '';
  $('#view').innerHTML = '<div class="empty"><span class="loader" style="border-color:#ddd;border-top-color:#7c3aed"></span><br>در حال بارگذاری…</div>';
  try {
    const d = await api('/api/instagram/dashboard');
    const p = d.profile;
    $('#view').innerHTML = `
      <div class="card">
        <div class="profile-head">
          <div class="avatar">${esc((p.name || '؟').slice(0, 1))}</div>
          <div>
            <h2>${esc(p.name || p.username)}</h2>
            <div class="handle">@${esc(p.username)} · <span class="pill ${d.mode === 'demo' ? 'amber' : 'green'}">${d.mode === 'demo' ? 'دمو' : 'واقعی'}</span></div>
          </div>
        </div>
      </div>
      ${d.stats ? `
      <div class="grid grid-4 section-gap">
        <div class="card stat"><div class="num">${faNum(d.stats.reach.toLocaleString('en-US'))}</div><div class="lbl">ریچ ۳۰ روز</div></div>
        <div class="card stat"><div class="num">${faNum(d.stats.impressions.toLocaleString('en-US'))}</div><div class="lbl">نمایش</div></div>
        <div class="card stat"><div class="num">${faNum(d.stats.newFollowers)}</div><div class="lbl">دنبال‌کننده جدید</div></div>
        <div class="card stat"><div class="num">${faNum(d.stats.engagementRate)}٪</div><div class="lbl">نرخ تعامل</div></div>
        <div class="card stat"><div class="num">${faNum(d.stats.profileViews.toLocaleString('en-US'))}</div><div class="lbl">بازدید پروفایل</div></div>
        <div class="card stat"><div class="num">${faNum(d.stats.unreadMessages)}</div><div class="lbl">دایرکت خوانده‌نشده</div></div>
        <div class="card stat"><div class="num">${faNum(d.stats.openLeads)}</div><div class="lbl">سرنخ باز</div></div>
        <div class="card stat"><div class="num">${faNum(p.followersCount.toLocaleString('en-US'))}</div><div class="lbl">کل دنبال‌کننده</div></div>
      </div>` : ''}
      <div class="card section-gap">
        <h3>📷 آخرین محتواها</h3>
        <div class="media-grid">
          ${(d.media || []).map((m) => `
            <div class="media-item">
              ${m.mediaUrl ? `<img src="${esc(m.mediaUrl)}" alt="">` : `<div class="media-placeholder">${m.mediaType === 'VIDEO' ? '🎬' : '🖼️'}</div>`}
              <div class="cap" title="${esc(m.caption || '')}">${esc(m.caption || 'بدون کپشن')}</div>
            </div>`).join('')}
        </div>
      </div>`;
  } catch (err) {
    $('#view').innerHTML = `<div class="card empty">خطا در بارگذاری داشبورد: ${esc(err.message)}</div>`;
  }
  return '';
}

/* ───────────────────────── استودیو محتوا ───────────────────────── */
const STUDIO_TABS = [
  ['caption', '✍️ کپشن'], ['ideas', '💡 ایده محتوا'], ['hashtags', '# هشتگ'],
  ['reel', '🎬 اسکریپت ریلز'], ['story', '⭕ استوری'], ['poster', '🖼️ پوستر گرافیکی'],
];

function renderStudio() {
  if (needConnection()) return '';
  const t = state.studioTab;
  return `
  <div class="tabs">${STUDIO_TABS.map(([id, label]) =>
    `<button class="tab ${t === id ? 'active' : ''}" data-tab="${id}">${label}</button>`).join('')}</div>
  <div class="grid grid-2">
    <div class="card" id="studioForm">${studioFormHTML(t)}</div>
    <div class="card" id="studioOut"><h3>خروجی</h3><div class="empty">فرم را پر کنید و دکمه تولید را بزنید.</div></div>
  </div>`;
}

function studioFormHTML(t) {
  if (t === 'caption') return `
    <h3>✍️ تولید کپشن فروش‌محور</h3>
    <label class="field"><span>موضوع پست</span><input id="f-topic" placeholder="مثلا: تراریوم مدور جدید"></label>
    <label class="field"><span>لحن</span>
      <select id="f-tone"><option>دوستانه</option><option>حرفه‌ای</option><option>صمیمی و طنز</option><option>لوکس و رسمی</option></select></label>
    <label class="field"><span>کلمات کلیدی (با ویرگول)</span><input id="f-keywords" placeholder="تراریوم، گیاه، هدیه"></label>
    <button class="btn btn-primary" id="genBtn">تولید کپشن</button>`;
  if (t === 'ideas') return `
    <h3>💡 ایده‌های محتوایی</h3>
    <label class="field"><span>حوزه فعالیت</span><input id="f-niche" placeholder="مثلا: فروش گیاهان آپارتمانی"></label>
    <label class="field"><span>تعداد ایده</span><input id="f-count" type="number" value="6" min="1" max="8"></label>
    <button class="btn btn-primary" id="genBtn">دریافت ایده‌ها</button>`;
  if (t === 'hashtags') return `
    <h3># پیشنهاد هشتگ هدفمند</h3>
    <label class="field"><span>موضوع</span><input id="f-topic" placeholder="مثلا: گیاه آپارتمانی"></label>
    <button class="btn btn-primary" id="genBtn">تولید هشتگ‌ها</button>`;
  if (t === 'reel') return `
    <h3>🎬 اسکریپت ریلز (صحنه‌به‌صحنه)</h3>
    <label class="field"><span>موضوع ریلز</span><input id="f-topic" placeholder="مثلا: معرفی مونسترا"></label>
    <button class="btn btn-primary" id="genBtn">ساخت اسکریپت</button>`;
  if (t === 'story') return `
    <h3>⭕ استوری تعاملی چندفریمی</h3>
    <label class="field"><span>موضوع استوری</span><input id="f-topic" placeholder="مثلا: تخفیف آخر هفته"></label>
    <button class="btn btn-primary" id="genBtn">ساخت استوری</button>`;
  return `
    <h3>🖼️ تولید پوستر گرافیکی (SVG)</h3>
    <label class="field"><span>عنوان اصلی</span><input id="f-title" placeholder="مثلا: تخفیف ۲۰٪"></label>
    <label class="field"><span>زیرعنوان</span><input id="f-subtitle" placeholder="مثلا: فقط تا پایان هفته"></label>
    <label class="field"><span>نام برند</span><input id="f-brand" placeholder="گلخانه سبزینه"></label>
    <label class="field"><span>قالب</span>
      <select id="f-format"><option value="post">پست مربعی (۱۰۸۰×۱۰۸۰)</option><option value="story">استوری عمودی (۱۰۸۰×۱۹۲۰)</option></select></label>
    <button class="btn btn-primary" id="genBtn">ساخت پوستر</button>`;
}

function bindStudio() {
  $$('.tab').forEach((tab) => tab.addEventListener('click', () => { state.studioTab = tab.dataset.tab; render(); }));
  $('#genBtn')?.addEventListener('click', runStudio);
}

async function runStudio(e) {
  const btn = e.currentTarget;
  const out = $('#studioOut');
  loadingBtn(btn, 'در حال تولید…');
  try {
    const t = state.studioTab;
    let data;
    if (t === 'caption') data = await api('/api/studio/caption', { method: 'POST', body: { topic: $('#f-topic').value, tone: $('#f-tone').value, keywords: $('#f-keywords').value } });
    if (t === 'ideas') data = await api('/api/studio/ideas', { method: 'POST', body: { niche: $('#f-niche').value, count: +$('#f-count').value } });
    if (t === 'hashtags') data = await api('/api/studio/hashtags', { method: 'POST', body: { topic: $('#f-topic').value } });
    if (t === 'reel') data = await api('/api/studio/reel-script', { method: 'POST', body: { topic: $('#f-topic').value } });
    if (t === 'story') data = await api('/api/studio/story-script', { method: 'POST', body: { topic: $('#f-topic').value } });
    if (t === 'poster') data = await api('/api/studio/poster', { method: 'POST', body: { title: $('#f-title').value, subtitle: $('#f-subtitle').value, brand: $('#f-brand').value, format: $('#f-format').value } });
    out.innerHTML = studioOutputHTML(t, data);
    bindOutput(t, data);
  } catch (err) {
    out.innerHTML = `<div class="empty" style="color:#b91c1c">${esc(err.message)}</div>`;
  } finally { resetBtn(btn); }
}

function studioOutputHTML(t, d) {
  if (t === 'caption') {
    const tags = (d.hashtags || []).map((x) => `<span class="tag-chip" onclick="copyText('${esc(x)}')">${esc(x)}</span>`).join('');
    return `<h3>✍️ کپشن آماده</h3><div class="output-box" id="capText">${esc(d.caption)}</div>
      <div class="section-gap">${tags}</div>
      <div class="copy-row"><button class="btn btn-ghost btn-sm" id="copyAll">کپی کپشن + هشتگ‌ها</button></div>`;
  }
  if (t === 'ideas') {
    return `<h3>💡 ${faNum(d.ideas.length)} ایده محتوا</h3>` + d.ideas.map((i, n) => `
      <div class="output-box"><b>${faNum(n + 1)}. ${esc(i.title)}</b><br>
      <span class="pill purple">${esc(i.type)}</span> <span class="small">${esc(i.hook)}</span></div>`).join('');
  }
  if (t === 'hashtags') {
    return d.groups.map((g) => `
      <h3 class="section-gap">${esc(g.label)}</h3>
      <div>${g.tags.map((x) => `<span class="tag-chip" onclick="copyText('${esc(x)}')">${esc(x)}</span>`).join('')}</div>`).join('')
      + `<div class="copy-row"><button class="btn btn-ghost btn-sm" id="copyAll">کپی همه هشتگ‌ها</button></div>`;
  }
  if (t === 'reel') {
    return `<h3>🎬 ${esc(d.title)} <span class="pill blue">${esc(d.duration)}</span></h3>` +
      d.scenes.map((s) => `<div class="output-box"><b>ثانیه ${esc(s.sec)}</b> — ${esc(s.visual)}<br>
        <span class="pill amber">روی ویدیو: ${esc(s.overlay)}</span><br><span class="small">🎙️ ${esc(s.voiceover)}</span></div>`).join('') +
      `<h3 class="section-gap">کپشن پیشنهادی</h3><div class="output-box">${esc(d.caption)}</div>
       <div class="copy-row"><button class="btn btn-ghost btn-sm" onclick="copyText(document.querySelector('#studioOut .output-box').textContent)">کپی</button></div>`;
  }
  if (t === 'story') {
    return `<h3>⭕ استوری ${faNum(d.frames.length)} فریمی</h3>` + d.frames.map((f) => `
      <div class="output-box"><b>فریم ${faNum(f.frame)}</b><br>${esc(f.text)}<br>
      <span class="pill purple">استیکر: ${esc(f.sticker)}</span> <span class="pill green">${esc(f.cta)}</span></div>`).join('');
  }
  return `<h3>🖼️ پوستر ساخته شد</h3>
    <img src="${d.url}" style="width:100%;border-radius:14px;border:1px solid var(--line)" alt="poster">
    <div class="copy-row">
      <a class="btn btn-primary btn-sm" href="${d.url}" download="poster.svg">دانلود فایل SVG</a>
    </div>
    <p class="small section-gap">این فایل در کتابخانه رسانه‌ها هم ذخیره شد و در بخش انتشار قابل استفاده است.</p>`;
}

function bindOutput(t, d) {
  $('#copyAll')?.addEventListener('click', () => {
    if (t === 'caption') copyText(d.caption + '\n\n' + (d.hashtags || []).join(' '));
    if (t === 'hashtags') copyText(d.groups.flatMap((g) => g.tags).join(' '));
  });
}

/* ───────────────────────── انتشار ───────────────────────── */
function renderPublish() {
  if (needConnection()) return '';
  return `
  <div class="grid grid-2">
    <div class="card">
      <h3>🚀 انتشار محتوای جدید</h3>
      <label class="field"><span>نوع محتوا</span>
        <select id="p-kind"><option value="post">پست فید</option><option value="story">استوری</option><option value="reel">ریلز</option></select></label>
      <label class="field"><span>کپشن</span><textarea id="p-caption" placeholder="متن پست را بنویسید یا از دکمه پیشنهاد هوش مصنوعی استفاده کنید"></textarea></label>
      <div class="flex-between" style="margin-bottom:14px">
        <input id="p-topic" placeholder="موضوع برای کپشن هوشمند" style="flex:1;margin-left:8px">
        <button class="btn btn-ghost btn-sm" id="aiCaptionBtn">✨ پیشنهاد کپشن</button>
      </div>
      <label class="field"><span>آپلود تصویر از سیستم</span><input id="p-file" type="file" accept="image/*"></label>
      <div id="p-preview"></div>
      <label class="field section-gap"><span>یا آدرس عمومی رسانه (برای انتشار واقعی Graph API)</span>
        <input id="p-url" dir="ltr" placeholder="https://example.com/image.jpg"></label>
      <button class="btn btn-primary" id="publishBtn">انتشار روی اینستاگرام</button>
      <p class="small section-gap" id="p-note"></p>
    </div>
    <div class="card">
      <h3>📜 تاریخچه انتشار</h3>
      <div id="postHistory"><div class="empty">در حال بارگذاری…</div></div>
    </div>
  </div>`;
}

function bindPublish() {
  let uploadedUrl = '';
  $('#p-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await new Promise((r) => {
      const fr = new FileReader();
      fr.onload = () => r(fr.result);
      fr.readAsDataURL(file);
    });
    try {
      const rec = await api('/api/studio/upload', { method: 'POST', body: { name: file.name, dataUrl } });
      uploadedUrl = rec.url;
      $('#p-preview').innerHTML = `<img src="${rec.url}" style="max-height:160px;border-radius:12px;border:1px solid var(--line)">`;
      toast('تصویر در کتابخانه ذخیره شد ✓', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });

  $('#aiCaptionBtn').addEventListener('click', async () => {
    const topic = $('#p-topic').value;
    if (!topic) return toast('موضوع را بنویسید', 'error');
    const btn = $('#aiCaptionBtn');
    loadingBtn(btn, 'در حال نوشتن…');
    try {
      const d = await api('/api/studio/caption', { method: 'POST', body: { topic } });
      $('#p-caption').value = d.caption + '\n\n' + (d.hashtags || []).join(' ');
      toast('کپشن آماده شد ✓', 'success');
    } catch (err) { toast(err.message, 'error'); } finally { resetBtn(btn); }
  });

  $('#publishBtn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const body = {
      caption: $('#p-caption').value,
      mediaUrl: $('#p-url').value || uploadedUrl,
    };
    if (!body.caption && !body.mediaUrl) return toast('کپشن یا رسانه لازم است', 'error');
    loadingBtn(btn, 'در حال انتشار…');
    try {
      const rec = await api('/api/publish/' + $('#p-kind').value, { method: 'POST', body });
      toast(rec.message || 'با موفقیت منتشر شد ✓', 'success');
      loadHistory();
    } catch (err) { toast(err.message, 'error'); } finally { resetBtn(btn); }
  });

  loadHistory();
}

async function loadHistory() {
  try {
    const { posts } = await api('/api/publish');
    $('#postHistory').innerHTML = posts.length ? posts.map((p) => `
      <div class="output-box">
        <div class="flex-between">
          <b>${{ post: 'پست', story: 'استوری', reel: 'ریلز' }[p.kind]}</b>
          <span class="pill ${p.status.includes('demo') ? 'amber' : 'green'}">${p.status.includes('demo') ? 'دمو' : 'منتشرشده'}</span>
        </div>
        <div class="small">${timeAgo(p.createdAt)}${p.igMediaId ? ' · شناسه: ' + faNum(p.igMediaId) : ''}</div>
        <div class="small">${esc((p.caption || 'بدون کپشن').slice(0, 90))}…</div>
      </div>`).join('') : '<div class="empty">هنوز محتوایی منتشر نشده است.</div>';
  } catch (err) { $('#postHistory').innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
}

/* ───────────────────────── دایرکت هوشمند ───────────────────────── */
function renderMessages() {
  if (needConnection()) return '';
  return `<div class="card dm-layout">
    <div class="thread-list" id="threadList"><div class="empty">در حال بارگذاری…</div></div>
    <div id="conversation"><div class="empty">یک گفتگو را انتخاب کنید</div></div>
  </div>`;
}

async function bindMessages() {
  try {
    const d = await api('/api/messages');
    state.threads = d.threads;
    renderThreadList();
    if (state.threads[0]) openThread(state.threads[0].id);
  } catch (err) { $('#threadList').innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
}

function renderThreadList() {
  $('#threadList').innerHTML = state.threads.map((t) => `
    <div class="thread ${t.id === state.activeThreadId ? 'active' : ''}" data-id="${t.id}">
      <div class="t-name">${esc(t.participant)} ${t.unread ? '<span class="dot-unread"></span>' : ''}</div>
      <div class="t-handle">${esc(t.handle)}</div>
      <div class="t-preview">${esc(t.messages.at(-1)?.text || '')}</div>
    </div>`).join('');
  $$('.thread').forEach((el) => el.addEventListener('click', () => openThread(el.dataset.id)));
  const unread = state.threads.reduce((s, t) => s + (t.unread || 0), 0);
  const badge = $('#msgBadge');
  badge.textContent = faNum(unread);
  badge.classList.toggle('hidden', unread === 0);
}

function openThread(id) {
  state.activeThreadId = id;
  const t = state.threads.find((x) => x.id === id);
  if (!t) return;
  renderThreadList();
  $('#conversation').innerHTML = `
    <div class="chat-conv">
      <div class="flex-between" style="margin-bottom:10px">
        <div><b>${esc(t.participant)}</b> <span class="small">${esc(t.handle)}</span></div>
        <div>${(t.tags || []).map((x) => `<span class="pill purple">${esc(x)}</span>`).join(' ')}</div>
      </div>
      <div class="conv-body" id="convBody">
        ${t.messages.map((m) => `
          <div class="bubble ${m.from === 'me' ? 'me' : 'them'}">
            ${esc(m.text)}<span class="time">${timeAgo(m.at)}</span>
          </div>`).join('')}
      </div>
      <div class="conv-actions">
        <div id="suggestBox"></div>
        <div class="reply-form">
          <input id="replyInput" placeholder="پاسخ خود را بنویسید…">
          <button class="btn btn-ghost btn-sm" id="suggestBtn">✨ پیشنهاد هوشمند</button>
          <button class="btn btn-primary btn-sm" id="sendBtn">ارسال</button>
        </div>
      </div>
    </div>`;
  const body = $('#convBody');
  body.scrollTop = body.scrollHeight;

  $('#suggestBtn').addEventListener('click', async (e) => {
    loadingBtn(e.currentTarget, 'تحلیل…');
    try {
      const s = await api(`/api/messages/${id}/suggest`, { method: 'POST' });
      $('#suggestBox').innerHTML = `
        <div class="suggest-box">
          <div class="head"><span class="pill blue">قصد تشخیص‌داده: ${esc(s.intent)}</span>
            <button class="btn btn-ghost btn-sm" id="useSuggest">استفاده از این پاسخ</button></div>
          <div id="suggestText">${esc(s.reply)}</div>
        </div>`;
      $('#useSuggest').addEventListener('click', () => { $('#replyInput').value = s.reply; });
    } catch (err) { toast(err.message, 'error'); } finally { resetBtn(e.currentTarget); }
  });

  const send = async () => {
    const input = $('#replyInput');
    if (!input.value.trim()) return;
    const updated = await api(`/api/messages/${id}/reply`, { method: 'POST', body: { text: input.value } });
    Object.assign(t, updated.thread);
    toast('پیام ارسال شد ✓', 'success');
    openThread(id);
  };
  $('#sendBtn').addEventListener('click', send);
  $('#replyInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
}

async function pollUnread() {
  if (!state.connection || state.view === 'messages') return;
  try {
    const { threads } = await api('/api/messages');
    state.threads = threads;
    const unread = threads.reduce((s, t) => s + (t.unread || 0), 0);
    const badge = $('#msgBadge');
    badge.textContent = faNum(unread);
    badge.classList.toggle('hidden', unread === 0);
  } catch { /* بی‌خیال */ }
}

/* ───────────────────────── جذب مشتری و کمپین ───────────────────────── */
function renderLeads() {
  if (needConnection()) return '';
  return `
  <div class="tabs">
    <button class="tab ${state.leadsTab === 'leads' ? 'active' : ''}" data-ltab="leads">🎯 مشتریان بالقوه</button>
    <button class="tab ${state.leadsTab === 'campaigns' ? 'active' : ''}" data-ltab="campaigns">📢 کمپین‌های تبلیغاتی</button>
  </div>
  <div id="leadsBody"></div>`;
}

function bindLeads() {
  $$('[data-ltab]').forEach((b) => b.addEventListener('click', () => { state.leadsTab = b.dataset.ltab; renderLeads(); }));
  if (state.leadsTab === 'leads') bindLeadTab();
  else bindCampaignTab();
}

async function bindLeadTab() {
  const body = $('#leadsBody');
  body.innerHTML = `
    <div class="card">
      <h3>🔎 کشف مشتری از طریق هشتگ</h3>
      <p class="hint">جستجوی رسمی Hashtag Search API — کاربرانی که محتوای مرتبط با حوزه شما منتشر می‌کنند.</p>
      <div class="flex-between">
        <input id="scanTag" placeholder="مثلا: گیاه_آپارتمانی" style="flex:1;margin-left:10px">
        <button class="btn btn-primary" id="scanBtn">اسکن هشتگ</button>
      </div>
    </div>
    <div class="card section-gap"><h3>لیست سرنخ‌ها</h3><div id="leadTable"></div></div>`;
  $('#scanBtn').addEventListener('click', async (e) => {
    const tag = $('#scanTag').value.trim();
    if (!tag) return toast('هشتگ را وارد کنید', 'error');
    loadingBtn(e.currentTarget, 'در حال اسکن…');
    try {
      const d = await api('/api/leads/scan', { method: 'POST', body: { hashtag: tag } });
      toast(`${faNum(d.found.length)} سرنخ جدید پیدا شد`, 'success');
      drawLeads(d.leads);
    } catch (err) { toast(err.message, 'error'); } finally { resetBtn(e.currentTarget); }
  });
  const { leads } = await api('/api/leads');
  drawLeads(leads);
}

const STAGES = ['آگاهی', 'واجد شرایط', 'در حال مذاکره', 'مشتری جدید'];
const stagePill = (s) => `<span class="pill ${s === 'مشتری جدید' ? 'green' : s === 'در حال مذاکره' ? 'blue' : 'amber'}">${esc(s)}</span>`;

function drawLeads(leads) {
  $('#leadTable').innerHTML = `
    <div style="overflow-x:auto"><table>
      <thead><tr><th>کاربر</th><th>منبع</th><th>علاقه‌مندی</th><th>امتیاز</th><th>مرحله</th><th>یادداشت</th></tr></thead>
      <tbody>${leads.map((l) => `
        <tr>
          <td><b>${esc(l.name)}</b><br><span class="small">${esc(l.handle)}</span></td>
          <td>${esc(l.source || '-')}</td>
          <td>${esc(l.interest || l.reason || '-')}</td>
          <td><b>${faNum(l.score ?? '-')}</b></td>
          <td>
            <select data-lead="${l.id}" class="stage-select">
              ${STAGES.map((s) => `<option ${l.stage === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </td>
          <td class="small">${esc(l.note || '-')}</td>
        </tr>`).join('')}</tbody>
    </table></div>`;
  $$('.stage-select').forEach((sel) => sel.addEventListener('change', async (e) => {
    await api('/api/leads/' + sel.dataset.lead, { method: 'PATCH', body: { stage: sel.value } });
    toast('مرحله سرنخ به‌روزرسانی شد ✓', 'success');
  }));
}

async function bindCampaignTab() {
  const body = $('#leadsBody');
  body.innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <h3>➕ ساخت کمپین جدید</h3>
        <label class="field"><span>نام کمپین</span><input id="c-name" placeholder="کمپین تخفیف یلدا"></label>
        <label class="field"><span>هدف</span><input id="c-goal" placeholder="افزایش فروش"></label>
        <label class="field"><span>مخاطب هدف</span><input id="c-aud"></label>
        <label class="field"><span>بودجه</span><input id="c-budget"></label>
        <button class="btn btn-primary" id="c-create">ایجاد کمپین</button>
      </div>
      <div class="card">
        <h3>🤖 بریف هوشمند کمپین</h3>
        <p class="hint">ایجنت، استراتژی محتوا، تقویم انتشار و شاخص‌های کلیدی را می‌سازد.</p>
        <label class="field"><span>نام / هدف</span><input id="b-topic" placeholder="کمپین فروش زمستانه"></label>
        <button class="btn btn-ghost" id="b-gen">تولید بریف</button>
        <div id="briefOut" class="section-gap"></div>
      </div>
    </div>
    <div class="card section-gap"><h3>کمپین‌ها</h3><div id="campList"></div></div>`;

  $('#c-create').addEventListener('click', async (e) => {
    if (!$('#c-name').value) return toast('نام کمپین لازم است', 'error');
    loadingBtn(e.currentTarget);
    await api('/api/leads/campaigns', {
      method: 'POST',
      body: { name: $('#c-name').value, goal: $('#c-goal').value, audience: $('#c-aud').value, budget: $('#c-budget').value },
    });
    toast('کمپین ساخته شد ✓', 'success');
    resetBtn(e.currentTarget);
    loadCampaigns();
  });

  $('#b-gen').addEventListener('click', async (e) => {
    loadingBtn(e.currentTarget, 'در حال تحلیل…');
    try {
      const b = await api('/api/leads/campaigns/brief', { method: 'POST', body: { name: $('#b-topic').value, goal: $('#c-goal').value } });
      $('#briefOut').innerHTML = `
        <div class="output-box">
          <b>هدف:</b> ${esc(b.objective)}<br>
          <b>مخاطب:</b> ${esc(b.audience)}<br><br>
          <b>ستون‌های محتوایی:</b><br>${b.pillars.map((x) => '• ' + esc(x)).join('<br>')}<br><br>
          <b>تقویم اجرا:</b><br>${b.schedule.map((x) => '• ' + esc(x)).join('<br>')}<br><br>
          <b>شاخص‌ها (KPI):</b> ${b.kpis.map((x) => `<span class="pill blue">${esc(x)}</span>`).join(' ')}<br><br>
          <b>پیشنهاد بودجه:</b> ${esc(b.budgetSuggestion)}
        </div>`;
    } catch (err) { toast(err.message, 'error'); } finally { resetBtn(e.currentTarget); }
  });
  loadCampaigns();
}

async function loadCampaigns() {
  const { campaigns } = await api('/api/leads/campaigns');
  $('#campList').innerHTML = campaigns.map((c) => `
    <div class="output-box">
      <div class="flex-between"><b>${esc(c.name)}</b><span class="pill ${c.status === 'در حال اجرا' ? 'green' : 'gray'}">${esc(c.status)}</span></div>
      <div class="small">هدف: ${esc(c.goal)} · بودجه: ${esc(c.budget || '-')} · ${timeAgo(c.createdAt)}</div>
      ${c.brief ? `<div class="small">${esc(c.brief)}</div>` : ''}
    </div>`).join('') || '<div class="empty">کمپینی وجود ندارد.</div>';
}

/* ───────────────────────── تنظیمات ───────────────────────── */
function renderSettings() {
  return `
  <div class="grid grid-2">
    <div class="card">
      <h3>⚙️ اتصال ایجنت Arena</h3>
      <p class="hint">با وارد کردن کلید API، تمام تولید محتوا از ایجنت Arena انجام می‌شود؛ در غیر این صورت موتور محلی فارسی فعال است.</p>
      <label class="field"><span>آدرس API</span><input id="s-url" dir="ltr" placeholder="https://arena.ai/agent"></label>
      <label class="field"><span>کلید API</span><input id="s-key" type="password" dir="ltr" placeholder="برای تغییر، کلید جدید را وارد کنید"></label>
      <label class="field"><span>نام مدل</span><input id="s-model" dir="ltr" placeholder="arena-agent"></label>
      <button class="btn btn-primary" id="saveSettings">ذخیره تنظیمات</button>
    </div>
    <div class="card">
      <h3>🤖 چت مستقیم با ایجنت</h3>
      <p class="hint">هر سؤال یا درخواست مرتبط با پیج را بنویسید؛ از ویجت شناور 🤖 پایین صفحه هم در همه بخش‌ها در دسترس است.</p>
      <div id="modeLine" class="pill gray">در حال بررسی وضعیت…</div>
      <div class="output-box section-gap" id="chatHint">مثال: «برای معرفی محصول جدید یک ریلز ۳۰ ثانیه‌ای طراحی کن»</div>
    </div>
  </div>`;
}

async function bindSettings() {
  const s = await api('/api/agent/settings');
  $('#s-url').value = s.arenaApiUrl;
  $('#s-model').value = s.arenaModel;
  $('#s-key').placeholder = s.arenaApiKeySet ? 'کلید فعلی: ' + s.arenaApiKeyHint + ' (در صورت نیاز جایگزین کنید)' : 'کلید API وارد نشده';
  const { mode } = await api('/api/agent/mode');
  const line = $('#modeLine');
  line.textContent = mode === 'arena' ? 'ایجنت Arena فعال است' : 'موتور محلی (دمو) فعال است';
  line.className = 'pill ' + (mode === 'arena' ? 'green' : 'amber');

  $('#saveSettings').addEventListener('click', async (e) => {
    loadingBtn(e.currentTarget);
    try {
      await api('/api/agent/settings', {
        method: 'PUT',
        body: { arenaApiUrl: $('#s-url').value, arenaApiKey: $('#s-key').value, arenaModel: $('#s-model').value },
      });
      toast('تنظیمات ذخیره شد ✓', 'success');
      await loadAgentMode();
      bindSettings();
    } catch (err) { toast(err.message, 'error'); } finally { resetBtn(e.currentTarget); }
  });
}

/* ───────────────────────── چت شناور ایجنت ───────────────────────── */
async function sendChat(e) {
  e.preventDefault();
  const input = $('#chatInput');
  const text = input.value.trim();
  if (!text) return;
  const body = $('#chatBody');
  body.insertAdjacentHTML('beforeend', `<div class="bubble me">${esc(text)}</div>`);
  input.value = '';
  body.insertAdjacentHTML('beforeend', `<div class="bubble them" id="thinking">در حال فکر کردن…</div>`);
  body.scrollTop = body.scrollHeight;
  try {
    const { reply } = await api('/api/agent/chat', { method: 'POST', body: { message: text } });
    $('#thinking')?.remove();
    body.insertAdjacentHTML('beforeend', `<div class="bubble them">${esc(reply)}</div>`);
  } catch (err) {
    $('#thinking')?.remove();
    body.insertAdjacentHTML('beforeend', `<div class="bubble them">خطا: ${esc(err.message)}</div>`);
  }
  body.scrollTop = body.scrollHeight;
}

window.switchView = switchView;
window.copyText = copyText;

init();
