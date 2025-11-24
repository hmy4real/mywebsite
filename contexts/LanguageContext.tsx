import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Language, TranslationData } from '../types';
import { TRANSLATIONS } from '../data/content';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => React.ReactNode;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('zh');

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'zh' ? 'en' : 'zh'));
  };

  const t = (key: string): React.ReactNode => {
    const entry = TRANSLATIONS[key];
    if (!entry) return key;
    const text = entry[language];
    // Simple HTML parsing simulation for bold tags
    if (text.includes('<strong>') || text.includes('<br>')) {
        return <span dangerouslySetInnerHTML={{ __html: text }} />;
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};