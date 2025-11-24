export type Language = 'zh' | 'en';

export interface TranslationData {
  [key: string]: {
    zh: string;
    en: string;
  };
}

export interface NewsItem {
  id: string;
  titleKey: string;
  summaryKey?: string;
  date?: string;
}

export interface ArticleContent {
  id: string;
  titleKey: string;
  contentZH: React.ReactNode;
  contentEN: React.ReactNode;
}