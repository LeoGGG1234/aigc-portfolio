// Shared preference for every portfolio page. Initial URL choice never broadcasts.
const EVENT_KEY = 'portfolio:language-change';
const siteRoot = new URL('./', import.meta.url).pathname;
const pages = new Set(['', 'index.html', 'portfolio.html', 'materials.html', 'room/', 'room/index.html', 'room/text.html', 'room/mv.html', 'room/short-drama.html', 'room/mmd-dance.html']);

export function normaliseLanguage(value) {
  if (value === 'zh' || value === 'en') return value;
  try { const parsed = JSON.parse(value); return parsed === 'zh' || parsed === 'en' ? parsed : null; }
  catch { return null; }
}
export function readLanguage(fallback = 'en') {
  const explicit = normaliseLanguage(new URL(location.href).searchParams.get('lang'));
  if (explicit) return explicit;
  let saved = null;
  try { saved = normaliseLanguage(localStorage.getItem('lang')); } catch { /* private mode */ }
  return saved || ((navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : normaliseLanguage(fallback) || 'en');
}
export function updateLanguageUrl(value) {
  const lang = normaliseLanguage(value);
  if (!lang) return;
  const url = new URL(location.href);
  url.searchParams.set('lang', lang);
  history.replaceState(history.state, '', url);
}
export function rememberLanguage(value) {
  const lang = normaliseLanguage(value);
  if (!lang) return;
  try {
    localStorage.setItem('lang', lang);
    // A fresh event also reaches other tabs when the saved language is already the same.
    localStorage.setItem(EVENT_KEY, JSON.stringify({ lang, nonce: `${Date.now()}-${Math.random()}` }));
  } catch { /* URL and current-page switching still work without storage. */ }
  updateLanguageUrl(lang);
}
export function onLanguageChange(callback) {
  const listener = event => {
    let lang = null;
    if (event.key === 'lang') lang = normaliseLanguage(event.newValue);
    if (event.key === EVENT_KEY) {
      try { lang = normaliseLanguage(JSON.parse(event.newValue)?.lang); } catch { /* ignore malformed events */ }
    }
    if (lang) callback(lang);
  };
  addEventListener('storage', listener);
  return () => removeEventListener('storage', listener);
}
// Restrict propagation to this site's HTML pages; media, downloads and external URLs stay intact.
export function languageHref(raw, lang) {
  try {
    const url = new URL(raw, location.href);
    if (normaliseLanguage(lang) && url.origin === location.origin && url.pathname.startsWith(siteRoot)
        && pages.has(url.pathname.slice(siteRoot.length))) url.searchParams.set('lang', lang);
    return url.href;
  } catch { return raw; }
}
export function localisePageLinks(lang, root = document) {
  root.querySelectorAll('a[href]:not([download])').forEach(a => {
    const next = languageHref(a.href, lang);
    if (next !== a.href) a.href = next;
  });
}
export function labelLanguageButton(button, lang) {
  button.lang = lang === 'zh' ? 'en' : 'zh-CN';
  button.setAttribute('aria-label', lang === 'zh' ? 'Switch to English' : '切换为中文');
  button.title = lang === 'zh' ? 'English' : '中文';
}
