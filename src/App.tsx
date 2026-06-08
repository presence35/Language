/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useStorage } from './hooks/useStorage';
import { Capture } from './components/Capture';
import { Collection } from './components/Collection';
import { Practice } from './components/Practice';
import { Settings } from './components/Settings';
import { Stats } from './components/Stats';
import { Mic, BookHeart, Dumbbell, Settings as SettingsIcon, BarChart3 } from 'lucide-react';

type Tab = 'capture' | 'collection' | 'practice' | 'stats' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('capture');
  const { phrases, settings } = useStorage();
  const notificationInterval = useRef<any>(null);

  useEffect(() => {
    if (settings.notificationsEnabled && Notification.permission === 'granted') {
      if (notificationInterval.current) clearInterval(notificationInterval.current);
          notificationInterval.current = setInterval(() => {
        const storedPause = localStorage.getItem('practice_pause_until');
        const isPaused = storedPause && Date.now() < parseInt(storedPause, 10);
        
        const lastNotifiedStr = localStorage.getItem('last_notified_time');
        const lastNotified = lastNotifiedStr ? parseInt(lastNotifiedStr, 10) : 0;
        const now = Date.now();
        
        let shouldCheck = false;
        const hoursSince = (now - lastNotified) / (1000 * 60 * 60);

        if (settings.notificationFrequency === 'hourly' && hoursSince >= 1) shouldCheck = true;
        if (settings.notificationFrequency === 'few_hours' && hoursSince >= 3) shouldCheck = true;
        if (settings.notificationFrequency === 'daily' && hoursSince >= 24) shouldCheck = true;

        // If first launch, wait a bit before notifying instead of immediately.
        if (!lastNotifiedStr) {
           localStorage.setItem('last_notified_time', now.toString());
           return;
        }
        
        if (phrases.length > 0 && !isPaused && Notification.permission === 'granted' && shouldCheck) {
           const duePhrases = phrases.filter(p => {
             const daysSince = Math.max(0.1, (now - p.dateAdded) / (1000 * 60 * 60 * 24));
             return p.difficultyScore > 20 && daysSince >= 1;
           });
           
           if (duePhrases.length > 0) {
             const randomPhrase = duePhrases[Math.floor(Math.random() * duePhrases.length)];
             const notif = new Notification(`🇺🇦 Quick Recall Challenge!`, {
                body: `Do you remember what "${randomPhrase.russianPhrase}" means? Click to take a quick test!`,
                icon: '/icon.svg'
             });
             localStorage.setItem('last_notified_time', now.toString());

             notif.onclick = () => {
                window.focus();
                setActiveTab('practice');
             }
           }
        }
      }, 5 * 60 * 1000); // 5 mins interval
    } else {
       if (notificationInterval.current) clearInterval(notificationInterval.current);
    }
    return () => {
       if (notificationInterval.current) clearInterval(notificationInterval.current);
    };
  }, [phrases.length, settings.notificationsEnabled, settings.notificationFrequency]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'capture', label: 'Capture', icon: <Mic className="w-5 h-5 sm:w-6 sm:h-6" /> },
    { id: 'collection', label: 'Phrases', icon: <BookHeart className="w-5 h-5 sm:w-6 sm:h-6" /> },
    { id: 'practice', label: 'Practice', icon: <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6" /> },
    { id: 'stats', label: 'Stats', icon: <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6" /> },
  ];

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-slate-950 border-x border-slate-900 shadow-2xl overflow-hidden font-sans">
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar">
        {activeTab === 'capture' && <Capture />}
        {activeTab === 'collection' && <Collection />}
        {activeTab === 'practice' && <Practice />}
        {activeTab === 'stats' && <Stats />}
        {activeTab === 'settings' && <Settings />}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-slate-900 border-t border-slate-800 pb-safe z-50">
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

