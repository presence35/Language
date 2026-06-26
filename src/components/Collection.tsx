import React, { useState } from 'react';
import { useStorage } from '../hooks/useStorage';
import { PlayCircle, Trash2, Search, ChevronDown, ChevronUp, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import { playAudioWithLang } from '../utils/audio';
import { LANGUAGE_FLAGS } from '../utils/language';

const getTimeAgo = (timestamp: number) => {
  const diffInSeconds = Math.floor((Date.now() - timestamp) / 1000);
  if (diffInSeconds < 60) return 'just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes === 1) return '1 min ago';
  if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours === 1) return '1 hour ago';
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return '1 day ago';
  return `${diffInDays} days ago`;
};

export function Collection() {
  const { phrases, deletePhrase, updatePhrase, settings } = useStorage();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'date' | 'alphabetical'>('date');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [filterDifficulty, setFilterDifficulty] = useState({
    red: true,
    yellow: true,
    green: true
  });
  const [filterType, setFilterType] = useState<'all' | 'phrase' | 'word'>('all');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const playPhraseAudio = async (phrase: any) => {
    updatePhrase(phrase.id, { playCount: (phrase.playCount || 0) + 1 });
    setPlayingAudio(true);
    await playAudioWithLang(phrase.nativePhrase, phrase.targetLang || 'ru');
    setPlayingAudio(false);
  };

  const exploreWord = async (word: string, phrase: any) => {
    await playAudioWithLang(word, phrase.targetLang || 'ru');
  };

  const toggleSort = (field: 'date' | 'alphabetical') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection(field === 'date' ? 'desc' : 'asc');
    }
  };

  const toggleDifficulty = (color: keyof typeof filterDifficulty) => {
    setFilterDifficulty(prev => ({ ...prev, [color]: !prev[color] }));
  };

  const filteredAndSortedPhrases = phrases
    .filter(p => p.nativePhrase.toLowerCase().includes(searchQuery.toLowerCase()) || p.translation.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(p => {
      const isWord = p.nativePhrase.trim().split(/\s+/).length === 1;
      if (filterType === 'phrase' && isWord) return false;
      if (filterType === 'word' && !isWord) return false;
      return true;
    })
    .filter(p => {
      if (p.difficultyScore > 70) return filterDifficulty.red;
      if (p.difficultyScore > 30) return filterDifficulty.yellow;
      return filterDifficulty.green;
    })
    .filter(p => {
      if (filterLanguage === 'all') return true;
      return p.targetLang === filterLanguage || (filterLanguage === 'ru' && !p.targetLang);
    })
    .sort((a, b) => {
      if (sortField === 'date') {
        return sortDirection === 'desc' ? b.dateAdded - a.dateAdded : a.dateAdded - b.dateAdded;
      }
      if (sortField === 'alphabetical') {
        return sortDirection === 'asc' ? a.nativePhrase.localeCompare(b.nativePhrase) : b.nativePhrase.localeCompare(a.nativePhrase);
      }
      return 0;
    });

  return (
    <div className="p-4 flex flex-col space-y-6 pb-24">
      <div>
        <h2 className="text-2xl font-bold font-sans tracking-tight text-slate-100">Learning Collection</h2>
        <p className="text-slate-400 text-sm">Your personal library of real-world phrases.</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-500" />
            </div>
            <input
              type="text"
              className="block w-full pl-9 pr-3 py-2 border border-slate-800 rounded-lg leading-5 bg-slate-900 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border transition-colors ${showFilters ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'}`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
        
        {showFilters && (
          <div className="flex flex-col gap-4 p-4 bg-slate-900 rounded-xl border border-slate-800 text-sm shadow-lg">
            {/* Language Filters */}
            <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-2">
              <button
                onClick={() => setFilterLanguage('all')}
                className={`px-4 py-2 min-h-[44px] rounded-full text-sm font-bold transition-colors shrink-0 ${filterLanguage === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                All Languages
              </button>
              {Object.entries(LANGUAGE_FLAGS).map(([code, url]) => {
                if (!settings.enabledLanguages[code as keyof typeof settings.enabledLanguages] && code !== 'ru') return null;
                const isActive = filterLanguage === code;
                return (
                  <button
                    key={code}
                    onClick={() => setFilterLanguage(isActive ? 'all' : code)}
                    className={`shrink-0 w-11 h-11 rounded-full overflow-hidden transition-all border-2 ${isActive ? 'border-indigo-500 scale-110 shadow-sm bg-slate-800' : 'border-transparent hover:scale-105'}`}
                  >
                    <img src={url} alt={code} className={`w-full h-full object-cover rounded-full ${filterLanguage === 'all' || isActive ? 'opacity-100 grayscale-0' : 'opacity-50 grayscale hover:opacity-100 hover:grayscale-0'}`} />
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-5 border-t border-slate-800 pt-4 text-sm font-semibold">
              <div className="flex flex-col gap-2">
                <span className="text-slate-500 uppercase text-xs">Sort</span>
                <div className="flex gap-2 items-center">
                  <button 
                    onClick={() => toggleSort('date')}
                    className={`flex-1 flex justify-center items-center gap-1 min-h-[44px] px-3 rounded-lg transition-colors border ${sortField === 'date' ? 'bg-indigo-900/30 text-indigo-400 border-indigo-500/50' : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-800'}`}
                  >
                    Recent {sortField === 'date' && (sortDirection === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />)}
                  </button>
                  <button 
                    onClick={() => toggleSort('alphabetical')}
                    className={`flex-1 flex justify-center items-center gap-1 min-h-[44px] px-3 rounded-lg transition-colors border ${sortField === 'alphabetical' ? 'bg-indigo-900/30 text-indigo-400 border-indigo-500/50' : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-800'}`}
                  >
                    A-Z {sortField === 'alphabetical' && (sortDirection === 'asc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />)}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-slate-500 uppercase text-xs">Type</span>
                <div className="flex bg-slate-800 p-1.5 rounded-xl gap-1">
                  <button onClick={() => setFilterType('all')} className={`flex-1 min-h-[44px] px-2 py-2 rounded-lg font-medium transition-colors ${filterType === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}>All</button>
                  <button onClick={() => setFilterType('phrase')} className={`flex-1 min-h-[44px] px-2 py-2 rounded-lg font-medium transition-colors ${filterType === 'phrase' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}>Phrase</button>
                  <button onClick={() => setFilterType('word')} className={`flex-1 min-h-[44px] px-2 py-2 rounded-lg font-medium transition-colors ${filterType === 'word' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}>Word</button>
                </div>
              </div>

                <div className="flex flex-col gap-2">
                  <span className="text-slate-500 uppercase text-xs">Status</span>
                  <div className="flex gap-2">
                    <button onClick={() => toggleDifficulty('red')} className={`flex-1 h-12 rounded-lg flex items-center justify-center transition-colors border ${filterDifficulty.red ? 'bg-slate-800 border-slate-700' : 'border-transparent opacity-40 hover:opacity-60 bg-slate-900'}`}>
                      <span className={`w-4 h-4 rounded-full bg-red-500 ${filterDifficulty.red ? 'shadow-[0_0_8px_rgba(239,68,68,0.5)]' : ''}`} />
                    </button>
                    <button onClick={() => toggleDifficulty('yellow')} className={`flex-1 h-12 rounded-lg flex items-center justify-center transition-colors border ${filterDifficulty.yellow ? 'bg-slate-800 border-slate-700' : 'border-transparent opacity-40 hover:opacity-60 bg-slate-900'}`}>
                      <span className={`w-4 h-4 rounded-full bg-amber-400 ${filterDifficulty.yellow ? 'shadow-[0_0_8px_rgba(251,191,36,0.5)]' : ''}`} />
                    </button>
                    <button onClick={() => toggleDifficulty('green')} className={`flex-1 h-12 rounded-lg flex items-center justify-center transition-colors border ${filterDifficulty.green ? 'bg-slate-800 border-slate-700' : 'border-transparent opacity-40 hover:opacity-60 bg-slate-900'}`}>
                      <span className={`w-4 h-4 rounded-full bg-emerald-500 ${filterDifficulty.green ? 'shadow-[0_0_8px_rgba(16,185,129,0.5)]' : ''}`} />
                    </button>
                  </div>
                </div>
            </div>
          </div>
        )}
      </div>
      
      {phrases.length === 0 ? (
        <div className="text-center p-12 bg-slate-900 rounded-2xl text-slate-500 border border-slate-800">
           No phrases saved yet. Use the Capture tab to add some!
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedPhrases.map((phrase) => {
            const difficultyClass = phrase.difficultyScore > 70 ? 'border-red-500/50 hover:border-red-500' :
              phrase.difficultyScore > 30 ? 'border-amber-400/50 hover:border-amber-400' :
              'border-emerald-500/50 hover:border-emerald-500';

            return (
            <div key={phrase.id} className={`bg-slate-900 border text-left p-5 rounded-2xl shadow-sm transition-colors ${difficultyClass}`}>
              <div className="flex justify-between items-start gap-4">
                <div 
                  className="flex-1 cursor-pointer" 
                  onClick={() => setExpandedId(expandedId === phrase.id ? null : phrase.id)}
                >
                  <p className="text-2xl font-semibold text-slate-100 leading-tight flex items-center gap-2">
                    <img src={LANGUAGE_FLAGS[phrase.targetLang || 'ru']} alt={phrase.targetLang} className="w-5 h-5 object-cover rounded shadow-sm opacity-90 shrink-0" />
                    {phrase.nativePhrase}
                  </p>
                  <p className="text-slate-400 font-medium mt-1">{phrase.translation}</p>
                </div>
                <div className="flex flex-col items-center space-y-2 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); playPhraseAudio(phrase); }} disabled={playingAudio} className="text-indigo-400 p-2 bg-indigo-900/30 hover:bg-indigo-900/50 rounded-full transition-colors">
                    <PlayCircle className="w-7 h-7" />
                  </button>
                </div>
              </div>
              
              {expandedId === phrase.id && (
                <div className="mt-6 pt-4 border-t border-slate-800 space-y-4">
                  {phrase.wordBreakdown.length > 1 && (
                    <div>
                      <h4 className="text-xs uppercase font-bold tracking-wider text-slate-500 mb-3">Word Breakdown</h4>
                      <div className="flex flex-wrap gap-2">
                         {phrase.wordBreakdown.map((item: any, idx: number) => (
                           <div key={idx} onClick={(e) => { e.stopPropagation(); exploreWord(item.word, phrase); }} className="bg-slate-800 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-700 active:bg-slate-600 transition-colors">
                             <div className="font-semibold text-slate-200 text-lg flex items-center gap-1">
                               {item.word}
                               <PlayCircle className="w-4 h-4 text-slate-400" />
                             </div>
                             <div className="text-xs text-slate-400">{item.translation}</div>
                           </div>
                         ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center text-sm text-slate-500 mt-4 pt-4 border-t border-slate-800">
                    <span>Added {getTimeAgo(phrase.dateAdded)}</span>
                    <span className="flex items-center gap-1 font-medium bg-indigo-900/30 text-indigo-400 px-2 py-1 rounded-full"><PlayCircle className="w-4 h-4"/> Played {phrase.playCount || 0}x</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deletePhrase(phrase.id); }}
                      className="text-red-400 flex items-center p-2 rounded-lg hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
              
              <div 
                className="mt-3 flex justify-center w-full"
                onClick={() => setExpandedId(expandedId === phrase.id ? null : phrase.id)}
              >
                 {expandedId === phrase.id ? <ChevronUp className="w-5 h-5 text-slate-500"/> : <ChevronDown className="w-5 h-5 text-slate-500"/>}
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  );
}
