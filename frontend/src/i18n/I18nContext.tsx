import React, { createContext, useContext, useState, useEffect } from 'react';
import { I18nKeys, dictionaries } from './dictionaries';

type I18nContextType = {
  lang: string;
  setLang: (lang: string) => void;
  t: (key: I18nKeys) => string;
};

const I18nContext = createContext<I18nContextType>({
  lang: 'zh-CN',
  setLang: () => {},
  t: (key) => key,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState('zh-CN');

  useEffect(() => {
    const stored = localStorage.getItem('app_lang');
    if (stored && dictionaries[stored]) {
      setLang(stored);
    }
  }, []);

  const changeLang = (newLang: string) => {
    if (dictionaries[newLang]) {
      setLang(newLang);
      localStorage.setItem('app_lang', newLang);
    }
  };

  const t = (key: I18nKeys): string => {
    return dictionaries[lang]?.[key] || dictionaries['zh-CN']?.[key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang: changeLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
