import { useT } from '../i18n/LanguageContext';

// Small EN | RU toggle. Used in the main app header and in the admin panel
// header, since admin and the regular UI are independent screens.
export default function LanguageSwitcher({ className }) {
  const { lang, setLang, t } = useT();

  return (
    <div className={`lang-switcher ${className || ''}`}>
      <button
        type="button"
        className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
        onClick={() => setLang('en')}
        title={t('language.titleEn')}
        aria-pressed={lang === 'en'}
      >
        {t('language.en')}
      </button>
      <button
        type="button"
        className={`lang-btn ${lang === 'ru' ? 'active' : ''}`}
        onClick={() => setLang('ru')}
        title={t('language.titleRu')}
        aria-pressed={lang === 'ru'}
      >
        {t('language.ru')}
      </button>
    </div>
  );
}
