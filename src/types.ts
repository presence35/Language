export interface WordBreakdown {
  word: string;
  translation: string;
}

export interface Phrase {
  id: string;
  russianPhrase: string; // The target language phrase (Russian, Spanish, etc.)
  englishPhrase: string; // The English translation
  wordBreakdown: WordBreakdown[];
  dateAdded: number;
  difficultyScore: number;
  masteryScore: number;
  categories: string[];
  playCount?: number;
  targetLang?: string; // e.g. 'ru' or 'es'
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
  notificationFrequency: 'daily' | 'hourly' | 'few_hours';
  showAnimals: boolean;
  showRecentPhrases: boolean;
  useAiForTranslation: boolean;
  translationApiKey: string;
}

export interface PracticeStats {
  sessionsCompleted: number;
  timeSpentMs: number;
}
