export interface WordBreakdown {
  word: string;
  translation: string;
}

export interface Phrase {
  id: string;
  nativePhrase: string;
  translation: string;
  wordBreakdown: WordBreakdown[];
  dateAdded: number;
  difficultyScore: number;
  masteryScore: number;
  categories: string[];
  playCount?: number;
  targetLang?: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewDate: number;
  lastReviewDate: number;
}

export type PracticeMode = 'listenChoose' | 'listenRepeat' | 'audioCloze';

export interface ClozeData {
  fullPhrase: string;
  blankedPhrase: string;
  correctWord: string;
  options: string[];
}

export interface CommunicationFailure {
  id: string;
  whatChildSaid: string;
  translation: string;
  contextNotes: string;
  dateAdded: number;
}

export interface AppSettings {
  defaultTargetLanguage: 'ru' | 'es' | 'en' | 'fr' | 'de';
  enabledLanguages: {
    en: boolean;
    ru: boolean;
    es: boolean;
    fr: boolean;
    de: boolean;
  };
  showRecentTranslations: boolean;
  notificationsEnabled: boolean;
  notificationFrequency: '2h' | '6h' | '24h';
  notificationSessionSize: number;
  showAnimals: boolean;
  showRecentPhrases: boolean;
  useAiForTranslation: boolean;
  translationApiKey: string;
}

export interface PracticeStats {
  sessionsCompleted: number;
  timeSpentMs: number;
}
