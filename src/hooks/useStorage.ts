import { useState, useEffect } from 'react';
import type { Phrase, CommunicationFailure, AppSettings, PracticeStats } from '../types';
import { SEED_WORDS } from '../data/seedWords';
import { defaultSM2Fields } from '../utils/sm2';

const DEFAULT_SETTINGS: AppSettings = {
  defaultTargetLanguage: 'ru',
  enabledLanguages: {
    en: true,
    ru: true,
    es: false,
    fr: false,
    de: false,
  },
  showRecentTranslations: true,
  notificationsEnabled: true,
  notificationFrequency: '2h',
  notificationSessionSize: 10,
  showAnimals: true,
  showRecentPhrases: true,
  useAiForTranslation: false,
  translationApiKey: '',
};

export function useStorage() {
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [failures, setFailures] = useState<CommunicationFailure[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [practiceStats, setPracticeStats] = useState<PracticeStats>({ sessionsCompleted: 0, timeSpentMs: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedPhrases = localStorage.getItem('phrases') || localStorage.getItem('russian_phrases');
    const storedFailures = localStorage.getItem('communication_failures') || localStorage.getItem('russian_failures');
    const storedSettings = localStorage.getItem('app_settings');
    const storedStats = localStorage.getItem('practice_stats');
    
    let loadedPhrases: Phrase[] = [];
    if (storedPhrases) {
      loadedPhrases = JSON.parse(storedPhrases);
    }

    const hasSeededOdesa = localStorage.getItem('has_seeded_odesa');
    if (!hasSeededOdesa) {
      const customPhrases = loadedPhrases.filter(p => !p.id.startsWith('init_') && !p.id.startsWith('seed_'));
      loadedPhrases = [...customPhrases, ...SEED_WORDS];
      localStorage.setItem('has_seeded_odesa', 'true');
    }

    let migrated = false;
    loadedPhrases = loadedPhrases.map(p => {
      let updated = p;
      const raw = p as any;
      if (raw.russianPhrase !== undefined || raw.englishPhrase !== undefined) {
        migrated = true;
        updated = {
          ...updated,
          nativePhrase: raw.russianPhrase || updated.nativePhrase || '',
          translation: raw.englishPhrase || updated.translation || '',
        };
        delete raw.russianPhrase;
        delete raw.englishPhrase;
      }
      if (updated.easeFactor === undefined || updated.easeFactor === null) {
        migrated = true;
        return { ...updated, ...defaultSM2Fields(updated.dateAdded) };
      }
      return updated;
    });
    if (migrated) {
      localStorage.setItem('phrases', JSON.stringify(loadedPhrases));
      localStorage.removeItem('russian_phrases');
    }

    setPhrases(loadedPhrases);

    if (storedFailures) setFailures(JSON.parse(storedFailures));
    if (storedSettings) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) });
      } catch (e) {}
    }
    if (storedStats) {
      try {
        setPracticeStats(JSON.parse(storedStats));
      } catch (e) {}
    }
    
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('phrases', JSON.stringify(phrases));
    }
  }, [phrases, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('communication_failures', JSON.stringify(failures));
    }
  }, [failures, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('app_settings', JSON.stringify(settings));
    }
  }, [settings, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('practice_stats', JSON.stringify(practiceStats));
    }
  }, [practiceStats, isLoaded]);

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const addPhrase = (phrase: Omit<Phrase, 'id' | 'dateAdded' | 'difficultyScore' | 'masteryScore' | 'playCount' | 'easeFactor' | 'intervalDays' | 'repetitions' | 'nextReviewDate' | 'lastReviewDate'>) => {
    const now = Date.now();
    const newPhrase: Phrase = {
      ...phrase,
      targetLang: phrase.targetLang || 'ru',
      id: now.toString(),
      dateAdded: now,
      difficultyScore: 50,
      masteryScore: 0,
      playCount: 0,
      categories: phrase.categories || [],
      ...defaultSM2Fields(now),
    };
    setPhrases(prev => [newPhrase, ...prev]);
  };

  const addFailure = (failure: Omit<CommunicationFailure, 'id' | 'dateAdded'>) => {
    const newFailure: CommunicationFailure = {
      ...failure,
      id: Date.now().toString(),
      dateAdded: Date.now()
    };
    setFailures(prev => [newFailure, ...prev]);
  };

  const updatePhrase = (id: string, updates: Partial<Phrase>) => {
    setPhrases(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePhrase = (id: string) => {
    setPhrases(prev => prev.filter(p => p.id !== id));
  };

  const importData = (importedPhrases: Phrase[]) => {
    setPhrases(prev => {
      const existingTexts = new Set(prev.map(p => p.nativePhrase?.toLowerCase() || ''));
      const newUnique = importedPhrases.filter(p => !existingTexts.has(p.nativePhrase?.toLowerCase() || ''));
      return [...newUnique, ...prev];
    });
  };

  const updatePracticeStats = (sessions: number, timeMs: number) => {
    setPracticeStats(prev => ({
      sessionsCompleted: prev.sessionsCompleted + sessions,
      timeSpentMs: prev.timeSpentMs + timeMs
    }));
  };

  return { phrases, addPhrase, updatePhrase, deletePhrase, failures, addFailure, settings, updateSettings, importData, practiceStats, updatePracticeStats };
}
