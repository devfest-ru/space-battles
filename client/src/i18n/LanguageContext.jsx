// Language context and useT() hook.
// Two-language i18n (en/ru) without external dependencies.
//
// Initial language pick order:
//   1. localStorage.getItem('lang') — if user has chosen one previously
//   2. navigator.language — if it starts with "ru", use Russian
//   3. fallback: English
//
// After user picks a language via the switcher, it's saved in localStorage
// and stops being overridden by the browser locale.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from './translations';

const STORAGE_KEY = 'lang';
const SUPPORTED = ['en', 'ru'];

function detectInitialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED.includes(saved)) return saved;
  } catch {
    // ignore storage errors (private mode etc.)
  }
  const nav = (typeof navigator !== 'undefined' && navigator.language) || 'en';
  return nav.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

// Walk a dot-notation path in the translations object.
function lookup(obj, key) {
  const parts = key.split('.');
  let val = obj;
  for (const p of parts) {
    if (val == null) return undefined;
    val = val[p];
  }
  return val;
}

// Build a translator bound to a specific language.
function makeT(lang) {
  return (key, params) => {
    let val = lookup(translations[lang], key);
    if (val === undefined) {
      // Fall back to English to avoid showing raw keys.
      val = lookup(translations.en, key);
    }
    if (val === undefined) return key;
    if (typeof val !== 'string') return val;
    if (params) {
      return Object.entries(params).reduce(
        (s, [k, v]) => s.split('{' + k + '}').join(String(v)),
        val
      );
    }
    return val;
  };
}

const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: makeT('en'),
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectInitialLanguage);

  const setLang = useCallback((newLang) => {
    if (!SUPPORTED.includes(newLang)) return;
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {
      // ignore storage errors
    }
  }, []);

  // Keep <html lang> and document.title in sync with the current language.
  useEffect(() => {
    document.documentElement.lang = lang;
    const titleKey = lookup(translations[lang], 'pageTitle');
    if (typeof titleKey === 'string') {
      document.title = titleKey;
    }
  }, [lang]);

  const value = useMemo(
    () => ({ lang, setLang, t: makeT(lang) }),
    [lang, setLang]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook for components: const { t, lang, setLang } = useT();
export function useT() {
  return useContext(LanguageContext);
}
