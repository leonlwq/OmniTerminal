import React, { createContext, useContext, useState, useEffect } from 'react';
import { I18nKeys, dictionaries } from './dictionaries';

type I18nContextType = {
  lang: string;
  setLang: (lang: string) => void;
  t: (key: I18nKeys | string, fallback?: string) => string;
};

const detectSystemLanguage = (): string => {
  try {
    const navLang = (typeof navigator !== 'undefined' ? (navigator.language || (navigator as any).userLanguage || '') : '').toLowerCase();
    if (navLang.startsWith('en')) return 'en-US';
    if (navLang.startsWith('ja')) return 'ja-JP';
    if (navLang.startsWith('ko')) return 'ko-KR';
    if (navLang.startsWith('zh')) return 'zh-CN';
  } catch (e) {}
  return 'zh-CN';
};

const getInitialLanguage = (): string => {
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('app_lang') : null;
    if (stored && dictionaries[stored]) {
      return stored;
    }
  } catch (e) {}
  return detectSystemLanguage();
};

const I18nContext = createContext<I18nContextType>({
  lang: 'zh-CN',
  setLang: () => {},
  t: (key, fallback) => (typeof fallback === 'string' ? fallback : key),
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<string>(getInitialLanguage);

  useEffect(() => {
    const stored = localStorage.getItem('app_lang');
    if (stored && dictionaries[stored]) {
      setLang(stored);
    } else {
      const detected = detectSystemLanguage();
      if (detected !== lang) {
        setLang(detected);
      }
    }
  }, []);

  const changeLang = (newLang: string) => {
    if (dictionaries[newLang]) {
      setLang(newLang);
      localStorage.setItem('app_lang', newLang);
    }
  };

  const t = (key: I18nKeys | string, fallback?: string): string => {
    if (lang === 'zh-CN') {
      return (
        dictionaries['zh-CN']?.[key as I18nKeys] ||
        fallback ||
        dictionaries['en-US']?.[key as I18nKeys] ||
        (key as string)
      );
    }
    return (
      dictionaries[lang]?.[key as I18nKeys] ||
      dictionaries['en-US']?.[key as I18nKeys] ||
      fallback ||
      dictionaries['zh-CN']?.[key as I18nKeys] ||
      (key as string)
    );
  };

  return (
    <I18nContext.Provider value={{ lang, setLang: changeLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
