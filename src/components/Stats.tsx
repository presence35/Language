import React, { useMemo, useState } from 'react';
import { useStorage } from '../hooks/useStorage';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { BarChart2, BookOpen, Clock, Target, Dumbbell } from 'lucide-react';
import { LANGUAGE_FLAGS } from '../utils/language';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export function Stats() {
  const { phrases, practiceStats } = useStorage();
  const [filterLanguage, setFilterLanguage] = useState<string>('all');

  const { overallStats, languageStats, activityData, difficultyData } = useMemo(() => {
    // Filter phrases for language-specific stats
    const filteredPhrases = filterLanguage === 'all' 
      ? phrases 
      : phrases.filter(p => (p.targetLang || 'ru') === filterLanguage);

    // Overall counts (respecting filter)
    const totalPhrases = filteredPhrases.length;
    const totalWords = filteredPhrases.reduce((acc, p) => p.russianPhrase.split(/\s+/).length === 1 ? acc + 1 : acc, 0);
    const totalSentences = totalPhrases - totalWords;
    
    // Per Language (always calculate from all phrases to show the options)
    const byLang: Record<string, { name: string; targetLang: string; count: number }> = {};
    
    const langNames: Record<string, string> = {
      en: 'English',
      ru: 'Russian',
      es: 'Spanish',
      fr: 'French',
      de: 'German'
    };

    // Difficulty overall (respecting filter)
    let red = 0;
    let yellow = 0;
    let green = 0;

    // Calculate difficulty from filtered phrases
    filteredPhrases.forEach(p => {
      if (p.difficultyScore > 70) red++;
      else if (p.difficultyScore > 30) yellow++;
      else green++;
    });

    // Calculate language frequencies from ALL phrases
    phrases.forEach(p => {
      const lang = p.targetLang || 'ru';
      if (!byLang[lang]) byLang[lang] = { name: langNames[lang] || lang, targetLang: lang, count: 0 };
      byLang[lang].count++;
    });

    const languageStats = Object.values(byLang).sort((a, b) => b.count - a.count);
    
    const difficultyData = [
      { name: 'Mastered', value: green, color: '#10b981' },
      { name: 'Needs Practice', value: yellow, color: '#f59e0b' },
      { name: 'Hard', value: red, color: '#ef4444' }
    ].filter(d => d.value > 0);

    // Activity over time (Last 7 days, respecting filter)
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { 
        date: d.toLocaleDateString(undefined, { weekday: 'short' }), 
        timestamp: d.setHours(0,0,0,0) 
      };
    });

    const activityData = last7Days.map(day => {
      const count = filteredPhrases.filter(p => {
        const pd = new Date(p.dateAdded).setHours(0,0,0,0);
        return pd === day.timestamp;
      }).length;
      return { name: day.date, new: count };
    });

    return {
      overallStats: { totalPhrases, totalWords, totalSentences },
      languageStats,
      activityData,
      difficultyData
    };
  }, [phrases, filterLanguage]);

    const formattedTime = useMemo(() => {
    const totalMinutes = Math.floor((practiceStats?.timeSpentMs || 0) / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }, [practiceStats]);

  return (
    <div className="p-4 flex flex-col space-y-6 pb-24 h-full overflow-y-auto w-full max-w-full">
      <div className="flex items-center gap-3">
        <BarChart2 className="w-8 h-8 text-indigo-400" />
        <div>
          <h2 className="text-2xl font-bold font-sans tracking-tight text-slate-100">Statistics</h2>
          <p className="text-slate-400 text-sm">Track your language learning progress.</p>
        </div>
      </div>

      {/* Language Filter */}
      {phrases.length > 0 && languageStats.length > 0 && (
        <div className="flex flex-col gap-2">
           <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Filter by language</h3>
           <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-2">
             <button
                onClick={() => setFilterLanguage('all')}
                className={`flex items-center justify-center px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0 border-2 ${filterLanguage === 'all' ? 'border-indigo-500 bg-indigo-600 shadow-md text-white' : 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
              >
                All Languages
              </button>
             {languageStats.map((stat) => (
                <button
                  key={stat.targetLang}
                  onClick={() => setFilterLanguage(stat.targetLang)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all shrink-0 border-2 ${filterLanguage === stat.targetLang ? 'border-indigo-500 bg-slate-800 shadow-md text-white' : 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
                >
                  <img src={LANGUAGE_FLAGS[stat.targetLang]} alt={stat.targetLang} className="w-5 h-5 object-cover rounded shadow-sm" />
                  <span className="bg-slate-800 px-2 py-0.5 rounded-md text-xs">{stat.count}</span>
                </button>
             ))}
           </div>
        </div>
      )}

      {phrases.length === 0 ? (
        <div className="text-center p-12 bg-slate-900 rounded-2xl text-slate-500 border border-slate-800">
           Collect some phrases to see your stats!
        </div>
      ) : (
        <>
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-indigo-900/20 border border-indigo-500/20 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                <Dumbbell className="w-6 h-6 text-indigo-400 mb-2" />
                <span className="text-3xl font-bold text-slate-100">{practiceStats?.sessionsCompleted || 0}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Sessions completed</span>
             </div>
             <div className="bg-emerald-900/20 border border-emerald-500/20 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                <Clock className="w-6 h-6 text-emerald-400 mb-2" />
                <span className="text-3xl font-bold text-slate-100">{formattedTime}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Practice time</span>
             </div>
             <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                <BookOpen className="w-6 h-6 text-indigo-400 mb-2" />
                <span className="text-3xl font-bold text-slate-100">{overallStats.totalPhrases}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Items</span>
             </div>
             <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                <Target className="w-6 h-6 text-emerald-400 mb-2" />
                <span className="text-3xl font-bold text-slate-100">{overallStats.totalWords}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Words</span>
             </div>
          </div>

          {/* Activity Chart */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
             <h3 className="text-lg font-bold text-slate-200">Activity (Last 7 Days)</h3>
             <div className="h-48 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={activityData}>
                   <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                   <YAxis allowDecimals={false} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                   <Tooltip 
                     contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                     itemStyle={{ color: '#818cf8' }}
                   />
                   <Line type="monotone" dataKey="new" stroke="#818cf8" strokeWidth={3} dot={{ fill: '#818cf8', strokeWidth: 2 }} className="drop-shadow-md" />
                 </LineChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* Difficulty Breakdown */}
          {difficultyData.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 flex flex-col items-center">
              <h3 className="text-lg font-bold text-slate-200 self-start">Mastery Status</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={difficultyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {difficultyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#e2e8f0' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 text-xs mt-2">
                 {difficultyData.map(d => (
                   <div key={d.name} className="flex items-center gap-1 text-slate-400 font-medium">
                     <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></span>
                     {d.name} ({d.value})
                   </div>
                 ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
