// One preference for the 3D studio and the original portfolio.
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

export function rememberLanguage(lang) {
  if (!normaliseLanguage(lang)) return;
  try { localStorage.setItem('lang', lang); } catch { /* private mode */ }
  updateLanguageUrl(lang);
}

export function updateLanguageUrl(lang) {
  const url = new URL(location.href);
  url.searchParams.set('lang', lang);
  history.replaceState(history.state, '', url);
}

export function onLanguageChange(callback) {
  addEventListener('storage', (event) => {
    if (event.key !== 'lang') return;
    const lang = normaliseLanguage(event.newValue);
    if (lang) callback(lang);
  });
}
