import React from 'react';
import { useStorage } from '../hooks/useStorage';
import { Globe, Settings as SettingsIcon, History, Bell, Presentation, Bot, CheckCircle2, Cloud, Wand2, Download, Upload, Sparkles } from 'lucide-react';

const APP_VERSION = '1.0';

export function Settings() {
  const { settings, updateSettings, phrases, importData } = useStorage();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataStr = JSON.stringify(phrases, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `language-phrases-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          importData(parsed);
          alert(`Successfully imported ${parsed.length} phrases.`);
        } else {
          alert("Invalid file format.");
        }
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLanguageToggle = (lang: 'en' | 'ru' | 'es' | 'fr' | 'de') => {
    const newEnabledLanguages = {
      ...settings.enabledLanguages,
      [lang]: !settings.enabledLanguages[lang],
    };

    const updates: Partial<typeof settings> = {
      enabledLanguages: newEnabledLanguages,
    };

    if (settings.defaultTargetLanguage === lang && !newEnabledLanguages[lang]) {
      const fallbackLang = Object.keys(newEnabledLanguages).find(k => newEnabledLanguages[k as keyof typeof newEnabledLanguages]) as 'ru' | 'es' | 'en' | 'fr' | 'de';
      if (fallbackLang) {
        updates.defaultTargetLanguage = fallbackLang;
      }
    }

    updateSettings(updates);
  };

  const setTargetLanguage = (lang: 'ru' | 'es' | 'en' | 'fr' | 'de') => {
    updateSettings({ defaultTargetLanguage: lang });
  };

  const languages = [
    { id: 'en', name: 'English', flag: 'https://flagcdn.com/us.svg' },
    { id: 'ru', name: 'Russian', flag: 'https://flagcdn.com/ru.svg' },
    { id: 'es', name: 'Spanish', flag: 'https://flagcdn.com/es.svg' },
    { id: 'fr', name: 'French', flag: 'https://flagcdn.com/fr.svg' },
    { id: 'de', name: 'German', flag: 'https://flagcdn.com/de.svg' },
  ];

  return (
    <div className="p-4 flex flex-col space-y-6 pb-24 h-full overflow-y-auto">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-8 h-8 text-indigo-400" />
        <div>
          <h2 className="text-2xl font-bold font-sans tracking-tight text-slate-100">Settings</h2>
          <p className="text-slate-400 text-sm">Configure your learning experience</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-slate-200">Languages</h3>
          </div>
          <p className="text-sm text-slate-400 mb-4">Click the card to enable or disable it. Tap the checkmark to set it as the default target language.</p>
          
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {languages.map((lang) => {
              const isEnabled = settings.enabledLanguages[lang.id as keyof typeof settings.enabledLanguages];
              const isTarget = settings.defaultTargetLanguage === lang.id;
              
              return (
                <div
                  key={lang.id}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 ${isEnabled ? 'bg-slate-800 border-indigo-500/50' : 'bg-slate-800/50 border-slate-700/50'}`}
                >
                  {isEnabled && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setTargetLanguage(lang.id as any); }}
                      className={`absolute top-2 right-2 p-1 rounded-full bg-slate-900 shadow-sm transition-colors cursor-pointer ${isTarget ? 'text-green-500' : 'text-slate-600 hover:text-green-400'}`}
                      title={isTarget ? "Default Language" : "Set as Default"}
                    >
                      <CheckCircle2 className={`w-5 h-5 ${isTarget ? 'fill-green-900' : ''}`} />
                    </button>
                  )}
                  <button
                    onClick={() => handleLanguageToggle(lang.id as any)}
                    className="flex flex-col flex-1 w-full items-center justify-center outline-none"
                  >
                    <img 
                      src={lang.flag} 
                      alt={lang.name} 
                      className={`w-10 h-10 object-cover rounded-full border-2 transition-all duration-300 mb-2 mt-1 ${isEnabled ? 'border-indigo-400 grayscale-0 scale-100 opacity-100' : 'border-slate-600 grayscale scale-95 opacity-50'}`} 
                    />
                    <span className={`font-semibold text-sm ${isEnabled ? 'text-slate-200' : 'text-slate-500'}`}>{lang.name}</span>
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-slate-200">Notifications</h3>
          </div>
          
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-slate-200 font-semibold">Enable Notifications</p>
                <p className="text-sm text-slate-400">Allow reminders for practice mode.</p>
              </div>
              <button
                onClick={() => {
                  const newValue = !settings.notificationsEnabled;
                  updateSettings({ notificationsEnabled: newValue });
                  if (newValue && 'Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                    Notification.requestPermission();
                  }
                }}
                className={`relative inline-flex h-6 w-11 mt-1 shrink-0 items-center rounded-full transition-colors focus:outline-none ${settings.notificationsEnabled ? 'bg-indigo-500' : 'bg-slate-600'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {settings.notificationsEnabled && 'Notification' in window && Notification.permission === 'denied' && (
              <p className="text-xs text-rose-400 pl-6 mt-1">Notifications are blocked by your browser settings.</p>
            )}
            {settings.notificationsEnabled && (
              <div className="pl-6 pt-2 flex flex-col gap-4 border-t border-slate-800 mt-2">
                <p className="text-sm text-slate-400">
                  On each schedule interval, you'll get a single notification with a teaser of words to review. Tap it to start a full practice session with those words. Dismiss to skip until the next interval. 10% of sessions include mastered words to keep them fresh.
                </p>
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-slate-300 font-medium">Notification Frequency</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => updateSettings({ notificationFrequency: '2h' })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        settings.notificationFrequency === '2h'
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Every 2 hours
                    </button>
                    <button
                      onClick={() => updateSettings({ notificationFrequency: '6h' })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        settings.notificationFrequency === '6h'
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Every 6 hours
                    </button>
                    <button
                      onClick={() => updateSettings({ notificationFrequency: '24h' })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        settings.notificationFrequency === '24h'
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Once a day
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-slate-300 font-medium">Session Size</p>
                  <p className="text-xs text-slate-500">How many words to include in notification-triggered practice sessions.</p>
                  <div className="flex flex-wrap gap-2">
                    {[5, 10, 15, 20].map((size) => (
                      <button
                        key={size}
                        onClick={() => updateSettings({ notificationSessionSize: size })}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          settings.notificationSessionSize === size
                            ? 'bg-indigo-500 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Presentation className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-slate-200">Display</h3>
          </div>

          <div className="flex items-start justify-between gap-4">
             <div>
               <div className="flex items-center gap-2 mb-1">
                 <Bot className="w-4 h-4 text-slate-400" />
                 <p className="text-slate-200 font-semibold">Show Animal Modes</p>
               </div>
               <p className="text-sm text-slate-400">Toggle whether to show the 6 animals (kid mode) or just a simple microphone icon next to the translate box.</p>
             </div>
             <button
               onClick={() => updateSettings({ showAnimals: !settings.showAnimals })}
               className={`relative inline-flex h-6 w-11 mt-1 shrink-0 items-center rounded-full transition-colors focus:outline-none ${settings.showAnimals ? 'bg-indigo-500' : 'bg-slate-600'}`}
             >
               <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.showAnimals ? 'translate-x-6' : 'translate-x-1'}`} />
             </button>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <History className="w-4 h-4 text-slate-400" />
                <p className="text-slate-200 font-semibold">Show Recent Translations</p>
              </div>
              <p className="text-sm text-slate-400">Show up to 5 recently captured translations for quick access. They disappear after 30 minutes. Helpful for multi-part, in-person conversations where you occasionally need to refer back to previous translations without re-recording.</p>
            </div>
            <button
              onClick={() => updateSettings({ showRecentTranslations: !settings.showRecentTranslations })}
              className={`relative inline-flex h-6 w-11 mt-1 shrink-0 items-center rounded-full transition-colors focus:outline-none ${settings.showRecentTranslations ? 'bg-indigo-500' : 'bg-slate-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.showRecentTranslations ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-start justify-between gap-4">
             <div>
               <div className="flex items-center gap-2 mb-1">
                 <History className="w-4 h-4 text-slate-400" />
                 <p className="text-slate-200 font-semibold">Show Recent Added Phrases</p>
               </div>
               <p className="text-sm text-slate-400">Show recently saved phrases at the bottom of the Capture page.</p>
             </div>
             <button
               onClick={() => updateSettings({ showRecentPhrases: !settings.showRecentPhrases })}
               className={`relative inline-flex h-6 w-11 mt-1 shrink-0 items-center rounded-full transition-colors focus:outline-none ${settings.showRecentPhrases ? 'bg-indigo-500' : 'bg-slate-600'}`}
             >
               <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.showRecentPhrases ? 'translate-x-6' : 'translate-x-1'}`} />
             </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-slate-200">Translation</h3>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Wand2 className="w-4 h-4 text-slate-400" />
                <p className="text-slate-200 font-semibold">Use AI for Translation</p>
              </div>
              <p className="text-sm text-slate-400">Use AI models instead of browser default for better translations.</p>
            </div>
            <button
              onClick={() => updateSettings({ useAiForTranslation: !settings.useAiForTranslation })}
              className={`relative inline-flex h-6 w-11 mt-1 shrink-0 items-center rounded-full transition-colors focus:outline-none ${settings.useAiForTranslation ? 'bg-indigo-500' : 'bg-slate-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.useAiForTranslation ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {settings.useAiForTranslation && (
            <div className="pl-6">
              <input
                type="password"
                placeholder="Enter API Key"
                value={settings.translationApiKey || ''}
                onChange={(e) => updateSettings({ translationApiKey: e.target.value })}
                className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Cloud className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-slate-200">Data</h3>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-slate-200 font-semibold">Data Management</p>
              <p className="text-sm text-slate-400">Export or import your learning data as a JSON file.</p>
            </div>
            <div className="flex flex-col gap-2 mt-1 shrink-0">
              <button 
                onClick={handleExport}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700 shadow-sm flex items-center justify-center gap-2"
              >
                <Download className="w-3 h-3" />
                Export
              </button>
              <input 
                type="file" 
                accept=".json" 
                ref={fileInputRef} 
                onChange={handleImport} 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700 shadow-sm flex items-center justify-center gap-2"
              >
                <Upload className="w-3 h-3" />
                Import
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pt-4 pb-2">
        <p className="text-xs text-slate-600">Version {APP_VERSION}</p>
      </div>
    </div>
  );
}
