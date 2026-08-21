import { createI18n } from 'vue-i18n';

import en from './locales/en';
import id from './locales/id';

export const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'id', label: 'Bahasa Indonesia' },
] as const;

export type LocaleCode = (typeof LOCALES)[number]['code'];

export const LOCALE_STORAGE_KEY = 'html-tools:locale';
export const DEFAULT_LOCALE: LocaleCode = 'en';

export function isLocaleCode(value: string): value is LocaleCode {
  return LOCALES.some((item) => item.code === value);
}

function readStoredLocale(): LocaleCode {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && isLocaleCode(stored)) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}

export const i18n = createI18n({
  legacy: false,
  locale: readStoredLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: { en, id },
});

export function currentLocale(): LocaleCode {
  const value = i18n.global.locale.value;
  return isLocaleCode(value) ? value : DEFAULT_LOCALE;
}

export function applyDocumentLang(code: LocaleCode = currentLocale()) {
  document.documentElement.lang = code;
}

export function setLocale(code: LocaleCode) {
  i18n.global.locale.value = code;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, code);
  } catch {
    /* ignore */
  }
  applyDocumentLang(code);
}
