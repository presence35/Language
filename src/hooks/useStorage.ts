import { useState, useEffect } from 'react';
import type { Phrase, CommunicationFailure, AppSettings, PracticeStats } from '../types';
import { SEED_WORDS } from '../data/seedWords';

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
  notificationFrequency: 'daily',
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
    const storedPhrases = localStorage.getItem('russian_phrases');
    const storedFailures = localStorage.getItem('russian_failures');
    const storedSettings = localStorage.getItem('app_settings');
    const storedStats = localStorage.getItem('practice_stats');
    
    let loadedPhrases: Phrase[] = [];
    if (storedPhrases) {
      loadedPhrases = JSON.parse(storedPhrases);
    }

    // Ensure seed words are present, inject new Odesa phrases once
    const hasSeededOdesa = localStorage.getItem('has_seeded_odesa');
    if (!hasSeededOdesa) {
      // Clean out any old initial data that wasn't specific
      const customPhrases = loadedPhrases.filter(p => !p.id.startsWith('init_') && !p.id.startsWith('seed_'));
      
      // Inject the current seed
      loadedPhrases = [...customPhrases, ...SEED_WORDS];
      localStorage.setItem('has_seeded_odesa', 'true');
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
      localStorage.setItem('russian_phrases', JSON.stringify(phrases));
    }
  }, [phrases, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('russian_failures', JSON.stringify(failures));
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

  const addPhrase = (phrase: Omit<Phrase, 'id' | 'dateAdded' | 'difficultyScore' | 'masteryScore' | 'playCount'>) => {
    const newPhrase: Phrase = {
      ...phrase,
      targetLang: phrase.targetLang || 'ru',
      id: Date.now().toString(),
      dateAdded: Date.now(),
      difficultyScore: 50,
      masteryScore: 0,
      playCount: 0,
      categories: phrase.categories || []
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
    // Basic deduplication by phrase text
    setPhrases(prev => {
      const existingTexts = new Set(prev.map(p => p.russianPhrase?.toLowerCase() || ''));
      const newUnique = importedPhrases.filter(p => !existingTexts.has(p.russianPhrase?.toLowerCase() || ''));
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
