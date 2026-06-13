import React, { useState, useEffect, useRef } from 'react';
import { useStorage } from '../hooks/useStorage';
import { PlayCircle, Eye, CheckCircle, XCircle, Zap, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playAudioWithLang } from '../utils/audio';
import { generateSession } from '../utils/session';
import type { Phrase } from '../types';

const DEBUG = true;

export function Practice() {
  const { phrases, updatePhrase, updatePracticeStats } = useStorage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [practiceSession, setPracticeSession] = useState<Phrase[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [sessionTracked, setSessionTracked] = useState(true);
  
  const [isMiniTest, setIsMiniTest] = useState(false);
  const [isListeningPronunciation, setIsListeningPronunciation] = useState(false);
  const [pronunciationResult, setPronunciationResult] = useState<'success' | 'fail' | null>(null);
  const [spokenText, setSpokenText] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setPronunciationResult(null);
    setSpokenText('');
    setIsListeningPronunciation(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
  }, [currentIndex]);

  useEffect(() => {
    if (phrases.length > 0 && practiceSession.length === 0) {
      try {
        const pendingWords = localStorage.getItem('pending_practice_words');
        if (pendingWords) {
          localStorage.removeItem('pending_practice_words');
          const ids: string[] = JSON.parse(pendingWords);
          if (Array.isArray(ids) && ids.length > 0) {
            const matchedPhrases = phrases.filter(p => ids.includes(p.id));
            if (matchedPhrases.length > 0) {
              setPracticeSession(matchedPhrases);
              setSessionStartTime(Date.now());
              setSessionTracked(false);
              return;
            }
          }
        }
      } catch {}
      setPracticeSession(generateSession(phrases, 10));
      setSessionStartTime(Date.now());
      setSessionTracked(false);
    }
  }, [phrases, practiceSession.length]);

  const currentPhrase = practiceSession[currentIndex];

  const playPracticeAudio = async () => {
    if (!currentPhrase) return;
    updatePhrase(currentPhrase.id, { playCount: (currentPhrase.playCount || 0) + 1 });
    setPlayingAudio(true);
    await playAudioWithLang(currentPhrase.russianPhrase, currentPhrase.targetLang || 'ru');
    setPlayingAudio(false);
  };

  const togglePronunciationTest = () => {
    if (DEBUG) console.log('togglePronunciationTest', { isListening: isListeningPronunciation, SpeechRecognition: typeof ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) });
    if (isListeningPronunciation) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListeningPronunciation(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (DEBUG) console.log('SpeechRecognition not available in Practice');
      alert("Speech recognition isn't supported in this browser. Try Chrome.");
      return;
    }

    setPronunciationResult(null);
    setSpokenText('');
    setIsListeningPronunciation(true);

    const recognition = new SpeechRecognition();
    const targetLang = currentPhrase.targetLang || 'ru';
    recognition.lang = targetLang === 'en' ? 'en-US' : targetLang === 'es' ? 'es-ES' : targetLang === 'fr' ? 'fr-FR' : targetLang === 'de' ? 'de-DE' : 'ru-RU';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    recognitionRef.current = recognition;

    let resultHandled = false;

    recognition.onresult = async (event: any) => {
      resultHandled = true;
      const transcript = event.results[0][0].transcript.toLowerCase();
      setSpokenText(transcript);
      
      const cleanTranscript = transcript.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g,"").trim();
      const cleanTarget = currentPhrase.russianPhrase.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g,"").trim();
      
      if (cleanTranscript === cleanTarget) {
        setPronunciationResult('success');
      } else {
        setPronunciationResult('fail');
        await playAudioWithLang("Incorrect.", 'en-US');
        await playAudioWithLang(currentPhrase.russianPhrase, targetLang);
      }
    };

    recognition.onerror = (event: any) => {
      resultHandled = true;
      setIsListeningPronunciation(false);
      setPronunciationResult('fail');
      event.error === 'no-speech'
        ? setSpokenText('(No speech detected)')
        : setSpokenText(`(Error: ${event.error})`);
      try { recognition.abort(); } catch {}
    };

    recognition.onend = () => {
      setIsListeningPronunciation(false);
      if (!resultHandled) {
        setPronunciationResult('fail');
        setSpokenText('(Listening timed out or stopped)');
      }
    };

    recognition.start();
  };

  const handleResult = (knewIt: boolean) => {
    const c = currentPhrase;
    if (c) {
      const diff = knewIt ? Math.max(0, c.difficultyScore - 20) : Math.min(100, c.difficultyScore + 25);
      updatePhrase(c.id, { difficultyScore: diff });
    }
    setShowAnswer(false);
    setCurrentIndex(prev => prev + 1);
  };

  const handleSkip = () => {
    setShowAnswer(false);
    setCurrentIndex(prev => prev + 1);
  };

  if (phrases.length === 0) {
    return (
      <div className="p-4 flex flex-col pt-12 items-center justify-center space-y-4 h-full">
         <h2 className="text-2xl font-bold font-sans tracking-tight text-slate-100">Daily Practice</h2>
         <p className="text-slate-400 text-center">Add some phrases in Capture to start practicing with spaced repetition.</p>
      </div>
    );
  }

  if (!currentPhrase) {
     if (!sessionTracked && practiceSession.length > 0) {
        updatePracticeStats(1, Date.now() - sessionStartTime);
        setSessionTracked(true);
     }

     return (
       <div className="p-4 flex flex-col pt-12 items-center justify-center space-y-4 h-full">
         <div className="w-20 h-20 bg-green-900/30 text-green-400 border border-green-500/30 rounded-full flex items-center justify-center mb-4">
           <CheckCircle className="w-10 h-10" />
         </div>
         <h2 className="text-3xl font-bold font-sans tracking-tight text-slate-100">
           {isMiniTest ? "Mini Test Complete!" : "Session Complete!"}
         </h2>
         <p className="text-slate-400 text-center">
            {isMiniTest ? "Great job doing a quick repetition sprint." : "Great job relying on cognitive recall today."}
         </p>
         <button onClick={() => {
            setPracticeSession(generateSession(phrases, 10));
            setCurrentIndex(0);
            setShowAnswer(false);
            setIsMiniTest(false);
            setSessionStartTime(Date.now());
            setSessionTracked(false);
         }} className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-4 px-8 rounded-full shadow-lg transition-colors">
            Start New Session
         </button>
       </div>
     )
  }

  return (
    <div className="p-4 flex flex-col space-y-6 pb-6 h-full">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold font-sans tracking-tight text-slate-100 flex items-center gap-2">
            {isMiniTest ? <><Zap className="w-6 h-6 text-yellow-400"/> Mini Test</> : "Daily Practice"}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
             {isMiniTest ? "Quick 30s challenge" : "Spaced Repetition & Recall"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
           <div className="flex items-center gap-3">
             <div className="text-sm font-bold text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
                {currentIndex + 1} / {practiceSession.length}
             </div>
           </div>
           
         </div>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full py-4">
        <AnimatePresence mode="popLayout">
          <motion.div 
            key={currentPhrase.id}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -100, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.8}
            onDragEnd={(e, { offset, velocity }) => {
              if (Math.abs(offset.x) > 100 || Math.abs(velocity.x) > 800) {
                handleSkip();
              }
            }}
            className={`border text-center p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col relative transition-colors w-full ${!showAnswer ? 'cursor-grab active:cursor-grabbing' : ''} justify-center gap-4 sm:gap-6 ${isMiniTest ? 'bg-slate-800 border-yellow-900/30' : 'bg-slate-900 border-slate-800'}`}
          >
           
           <div>
             <h3 className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-3">What does this mean?</h3>
             <p className="text-3xl sm:text-4xl font-extrabold text-slate-100 leading-tight drop-shadow-sm">{currentPhrase.russianPhrase}</p>
           </div>
           
           <div className="flex justify-center gap-4">
             <button onClick={playPracticeAudio} disabled={playingAudio} className={`p-4 rounded-full transition-transform active:scale-95 flex flex-col items-center border shadow-inner ${isMiniTest ? 'text-yellow-400 bg-yellow-900/20 hover:bg-yellow-900/40 border-yellow-500/20' : 'text-indigo-400 bg-indigo-900/30 hover:bg-indigo-900/50 border-indigo-500/20'}`}>
                <PlayCircle className="w-10 h-10 mb-1" />
                <span className="text-xs font-bold w-full text-center tracking-wider">PLAY</span>
             </button>

             <button onClick={togglePronunciationTest} className={`p-4 w-24 rounded-full transition-transform active:scale-95 flex flex-col items-center border shadow-inner ${isListeningPronunciation ? 'text-red-400 bg-red-900/30 hover:bg-red-900/50 border-red-500/30 animate-pulse' : 'text-emerald-400 bg-emerald-900/30 hover:bg-emerald-900/50 border-emerald-500/20'}`}>
                {isListeningPronunciation ? <MicOff className="w-10 h-10 mb-1" /> : <Mic className="w-10 h-10 mb-1" />}
                <span className="text-xs font-bold w-full text-center tracking-wider">{isListeningPronunciation ? 'STOP' : 'SPEAK'}</span>
             </button>
           </div>

           {(spokenText || pronunciationResult) && (
              <div className={`p-4 rounded-2xl border text-sm mt-0 animate-in fade-in slide-in-from-bottom-2 ${pronunciationResult === 'success' ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-300' : pronunciationResult === 'fail' ? 'bg-red-900/20 border-red-500/30 text-red-300' : 'bg-slate-800/50 border-slate-700 text-slate-300'}`}>
                 <div className="font-bold flex items-center justify-center gap-2 mb-1">
                    {pronunciationResult === 'success' && <CheckCircle className="w-4 h-4" />}
                    {pronunciationResult === 'fail' && <XCircle className="w-4 h-4" />}
                    {pronunciationResult === 'success' ? 'Perfectly Pronounced!' : pronunciationResult === 'fail' ? 'Needs Work' : 'Listening...'}
                 </div>
                 {spokenText && <div className="italic break-words">"{spokenText}"</div>}
              </div>
           )}

           {!showAnswer ? (
             <div className="mt-auto pt-4 flex flex-col gap-3 items-center">
               <button onClick={() => setShowAnswer(true)} className="w-full border-2 border-slate-700 text-slate-300 font-bold text-lg p-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 active:bg-slate-700 transition-colors">
                  <Eye className="w-6 h-6"/> Show Answer
               </button>
               <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pointer-events-none opacity-60">
                 Swipe card to skip
               </div>
             </div>
           ) : (
              <div className="mt-auto pt-4 border-t border-slate-800 animate-in fade-in slide-in-from-top-4 duration-300 flex flex-col justify-center">
                 <p className="text-2xl text-slate-200 font-medium mb-6">{currentPhrase.englishPhrase}</p>

                 {currentPhrase.wordBreakdown.length > 1 && (
                   <div className="flex flex-wrap justify-center gap-2 mb-6">
                     {currentPhrase.wordBreakdown.map((wb, i) => (
                       <div key={i} className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 px-3 py-1.5 rounded-full text-sm">
                         <span className="font-bold text-slate-200">{wb.word}</span>
                         <span className="text-slate-500">→</span>
                         <span className="text-slate-400">{wb.translation}</span>
                       </div>
                     ))}
                   </div>
                 )}

                 <div className="flex gap-4">
                   <button onClick={() => handleResult(false)} className="flex-1 bg-red-950/30 border border-red-500/20 text-red-400 font-bold p-4 rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-red-950/50 active:scale-95 transition-all">
                      <XCircle className="w-8 h-8 mb-1"/> Didn't Know
                   </button>
                   <button onClick={() => handleResult(true)} className="flex-1 bg-green-950/30 border border-green-500/20 text-green-400 font-bold p-4 rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-green-950/50 active:scale-95 transition-all">
                      <CheckCircle className="w-8 h-8 mb-1"/> Knew It
                   </button>
                </div>
             </div>
           )}

         </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
