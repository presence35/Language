import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStorage } from './hooks/useStorage';
import { Capture } from './components/Capture';
import { Collection } from './components/Collection';
import { Practice } from './components/Practice';
import { Settings } from './components/Settings';
import { Stats } from './components/Stats';
import { Mic, BookHeart, Dumbbell, Settings as SettingsIcon, BarChart3 } from 'lucide-react';
import { isDue, daysOverdue } from './utils/sm2';
import type { Phrase } from './types';

type Tab = 'capture' | 'collection' | 'practice' | 'stats' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('capture');
  const { phrases, settings } = useStorage();
  const notificationInterval = useRef<any>(null);
  const phrasesRef = useRef(phrases);
  const settingsRef = useRef(settings);

  useEffect(() => { phrasesRef.current = phrases; }, [phrases]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const getFrequencyMs = useCallback((freq: string) => {
    if (freq === '2h') return 2 * 60 * 60 * 1000;
    if (freq === '6h') return 6 * 60 * 60 * 1000;
    return 24 * 60 * 60 * 1000;
  }, []);

  const storeNotificationState = async () => {
    if (!('caches' in window)) return;
    try {
      const cache = await caches.open('notification-state');
      const data = JSON.stringify({
        phrases: phrasesRef.current.map(p => ({
          id: p.id, nativePhrase: p.nativePhrase, translation: p.translation,
          difficultyScore: p.difficultyScore, dateAdded: p.dateAdded, targetLang: p.targetLang,
          easeFactor: p.easeFactor, intervalDays: p.intervalDays, repetitions: p.repetitions,
          nextReviewDate: p.nextReviewDate, lastReviewDate: p.lastReviewDate,
          wordBreakdown: p.wordBreakdown,
        })),
        lastNotified: parseInt(localStorage.getItem('last_notified_time') || '0', 10),
        frequency: settingsRef.current.notificationFrequency,
        defaultTargetLanguage: settingsRef.current.defaultTargetLanguage,
        notificationSessionSize: settingsRef.current.notificationSessionSize || 10,
      });
      cache.put('/notification-state', new Response(data, { headers: { 'Content-Type': 'application/json' } }));
    } catch {}
  };

  const storePendingIds = async (ids: string[]) => {
    localStorage.setItem('pending_practice_words', JSON.stringify(ids));
    try {
      if ('caches' in window) {
        const cache = await caches.open('notification-state');
        cache.put('/pending-practice-ids', new Response(JSON.stringify(ids), { headers: { 'Content-Type': 'application/json' } }));
      }
    } catch {}
  };

  const selectDuePhrases = useCallback((allPhrases: Phrase[], count: number): Phrase[] => {
    const due = allPhrases.filter(isDue);
    due.sort((a, b) => daysOverdue(b) - daysOverdue(a));
    if (due.length >= count) return due.slice(0, count);
    const notDue = allPhrases.filter(p => !isDue(p));
    notDue.sort((a, b) => a.nextReviewDate - b.nextReviewDate);
    return [...due, ...notDue.slice(0, count - due.length)];
  }, []);

  const checkAndNotify = useCallback(async () => {
    const s = settingsRef.current;
    const p = phrasesRef.current;
    if (!s.notificationsEnabled || Notification.permission !== 'granted') return;

    const lastNotifiedStr = localStorage.getItem('last_notified_time');
    const lastNotified = lastNotifiedStr ? parseInt(lastNotifiedStr, 10) : 0;
    const now = Date.now();
    const freqMs = getFrequencyMs(s.notificationFrequency);

    if (!lastNotifiedStr) {
      localStorage.setItem('last_notified_time', now.toString());
      return;
    }

    if (now - lastNotified < freqMs) return;
    if (p.length === 0) return;

    const count = s.notificationSessionSize || 10;
    const session = selectDuePhrases(p, count);
    if (session.length === 0) return;

    const ids = session.map(ph => ph.id);
    await storePendingIds(ids);

    const teasers = session.slice(0, Math.min(3, session.length));
    const teaserText = teasers.map(ph => ph.nativePhrase).join(', ');
    const title = 'Ready to practice?';
    const body = `Review words like: ${teaserText} — Tap to start a ${session.length}-word session!`;

    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'show-notification',
        title,
        body,
        icon: '/icons/icon.svg',
      });
    } else {
      const notif = new Notification(title, { body, icon: '/icon.svg' });
      notif.onclick = () => {
        window.focus();
        setActiveTab('practice');
      };
    }

    localStorage.setItem('last_notified_time', now.toString());
  }, [getFrequencyMs, selectDuePhrases]);

  useEffect(() => {
    const startInterval = () => {
      if (notificationInterval.current) clearInterval(notificationInterval.current);
      const freqMs = getFrequencyMs(settings.notificationFrequency);
      notificationInterval.current = setInterval(() => {
        checkAndNotify();
        storeNotificationState();
      }, freqMs);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkAndNotify();
      }
    };

    if (settings.notificationsEnabled && Notification.permission === 'granted') {
      startInterval();
      document.addEventListener('visibilitychange', handleVisibility);
      storeNotificationState();
      navigator.serviceWorker.ready.then((reg) => {
        if ('periodicSync' in reg) {
          try {
            (reg as any).periodicSync.register('check-notifications', {
              minInterval: getFrequencyMs(settings.notificationFrequency),
            });
          } catch {}
        }
      });
    } else {
      if (notificationInterval.current) clearInterval(notificationInterval.current);
    }

    return () => {
      if (notificationInterval.current) clearInterval(notificationInterval.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [settings.notificationsEnabled, settings.notificationFrequency, checkAndNotify, getFrequencyMs]);

  useEffect(() => {
    storeNotificationState();
  }, [phrases]);

  useEffect(() => {
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'navigate-practice') {
        if (event.data?.wordIds) {
          localStorage.setItem('pending_practice_words', JSON.stringify(event.data.wordIds));
        }
        setActiveTab('practice');
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleSWMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
  }, []);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'capture', label: 'Capture', icon: <Mic className="w-5 h-5 sm:w-6 sm:h-6" /> },
    { id: 'collection', label: 'Phrases', icon: <BookHeart className="w-5 h-5 sm:w-6 sm:h-6" /> },
    { id: 'practice', label: 'Practice', icon: <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6" /> },
    { id: 'stats', label: 'Stats', icon: <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6" /> },
  ];

  return (
    <div className="flex flex-col h-[100dvh] max-w-lg mx-auto bg-slate-950 border-x border-slate-900 shadow-2xl overflow-hidden font-sans">

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar">
        {activeTab === 'capture' && <Capture />}
        {activeTab === 'collection' && <Collection />}
        {activeTab === 'practice' && <Practice />}
        {activeTab === 'stats' && <Stats />}
        {activeTab === 'settings' && <Settings />}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-slate-900 border-t border-slate-800 pb-safe z-50 shrink-0">
        <div className="flex justify-around items-center p-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center p-1 sm:p-2 w-14 sm:w-16 rounded-xl transition-colors ${
                  isActive ? 'text-indigo-400 font-bold' : 'text-slate-400 font-medium hover:bg-slate-800'
                }`}
              >
                <div className={`mb-1 ${isActive ? 'scale-110 transition-transform' : ''}`}>
                  {tab.icon}
                </div>
                <span className="text-[10px] sm:text-xs text-center leading-tight">
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  );
}
