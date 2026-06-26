import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStorage } from '../hooks/useStorage';
import { PlayCircle, CheckCircle, XCircle, Zap, Mic, MicOff, Volume2, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playAudioWithLang, stopAllAudio } from '../utils/audio';
import { generateSession, SessionCard, generateClozeData } from '../utils/session';
import { sm2Review } from '../utils/sm2';
import type { Phrase } from '../types';

export function Practice() {
  const { phrases, updatePhrase, updatePracticeStats, settings } = useStorage();
  const [sessionCards, setSessionCards] = useState<SessionCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [sessionTracked, setSessionTracked] = useState(true);
  const [now, setNow] = useState(Date.now());

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [pronunciationResult, setPronunciationResult] = useState<'success' | 'fail' | null>(null);
  const [spokenText, setSpokenText] = useState('');
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [showClozeText, setShowClozeText] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const newSession = useCallback(() => {
    stopAllAudio();
    setSessionCards(generateSession(phrases, 10));
    setCurrentIndex(0);
    setSessionStartTime(Date.now());
    setSessionTracked(false);
    resetCardState();
  }, [phrases]);

  const resetCardState = () => {
    setSelectedAnswer(null);
    setAnswerRevealed(false);
    setIsListening(false);
    setPronunciationResult(null);
    setSpokenText('');
    setAudioPlayed(false);
    setShowClozeText(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }
  };

  useEffect(() => {
    if (phrases.length > 0 && sessionCards.length === 0) {
      try {
        const pendingWords = localStorage.getItem('pending_practice_words');
        if (pendingWords) {
          localStorage.removeItem('pending_practice_words');
          const ids: string[] = JSON.parse(pendingWords);
          if (Array.isArray(ids) && ids.length > 0) {
            const matched = phrases.filter(p => ids.includes(p.id));
            if (matched.length > 0) {
              const modes: Array<'listenChoose' | 'listenRepeat' | 'audioCloze'> = ['listenChoose', 'listenRepeat', 'audioCloze'];
              const cards: SessionCard[] = matched.map(phrase => {
                const mode = modes[Math.floor(Math.random() * modes.length)];
                const card: SessionCard = { phrase, mode };
                const distractors = phrases.filter(p => p.id !== phrase.id).sort(() => Math.random() - 0.5).slice(0, 3);
                if (mode === 'listenChoose') {
                  card.distractors = distractors;
                } else if (mode === 'audioCloze') {
                  card.distractors = distractors;
                  card.clozeData = generateClozeData(phrase, phrases);
                }
                return card;
              });
              setSessionCards(cards);
              setSessionStartTime(Date.now());
              setSessionTracked(false);
              return;
            }
          }
        }
      } catch {}
      newSession();
    }
  }, [phrases, sessionCards.length]);

  const currentCard = sessionCards[currentIndex];
  const currentPhrase = currentCard?.phrase;

  const playCardAudio = async () => {
    if (!currentPhrase) return;
    updatePhrase(currentPhrase.id, { playCount: (currentPhrase.playCount || 0) + 1 });
    await playAudioWithLang(currentPhrase.nativePhrase, currentPhrase.targetLang || 'ru');
    setAudioPlayed(true);
  };

  useEffect(() => {
    if (currentCard && !audioPlayed) {
      const timer = setTimeout(() => { playCardAudio(); }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, currentCard?.mode]);

  useEffect(() => {
    resetCardState();
  }, [currentIndex]);

  const finishCard = (quality: number) => {
    if (!currentPhrase) return;
    const result = sm2Review(currentPhrase, quality);
    updatePhrase(currentPhrase.id, {
      ...result,
      difficultyScore: quality >= 3
        ? Math.max(0, currentPhrase.difficultyScore - 20)
        : Math.min(100, currentPhrase.difficultyScore + 25),
    });
    setCurrentIndex(prev => prev + 1);
  };

  const handleChooseAnswer = (answer: string) => {
    if (answerRevealed) return;
    setSelectedAnswer(answer);
    setAnswerRevealed(true);
  };

  const handleChooseNext = () => {
    const isCorrect = selectedAnswer === currentPhrase.translation;
    finishCard(isCorrect ? 4 : 1);
  };

  const handleClozeAnswer = (word: string) => {
    if (answerRevealed) return;
    setSelectedAnswer(word);
    setAnswerRevealed(true);
  };

  const handleClozeNext = () => {
    const isCorrect = selectedAnswer === currentCard.clozeData?.correctWord;
    finishCard(isCorrect ? 4 : 1);
  };

  const toggleRepeat = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition isn't supported in this browser. Try Chrome.");
      return;
    }

    setPronunciationResult(null);
    setSpokenText('');
    setIsListening(true);

    const recognition = new SpeechRecognition();
    const targetLang = currentPhrase.targetLang || 'ru';
    recognition.lang = targetLang === 'en' ? 'en-US' : targetLang === 'es' ? 'es-ES' : targetLang === 'fr' ? 'fr-FR' : targetLang === 'de' ? 'de-DE' : 'ru-RU';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    let resultHandled = false;

    recognition.onresult = (event: any) => {
      resultHandled = true;
      const transcript = event.results[0][0].transcript.toLowerCase();
      setSpokenText(transcript);
      const cleanTranscript = transcript.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '').trim();
      const cleanTarget = currentPhrase.nativePhrase.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '').trim();
      if (cleanTranscript === cleanTarget) {
        setPronunciationResult('success');
      } else {
        setPronunciationResult('fail');
      }
    };

    recognition.onerror = (event: any) => {
      resultHandled = true;
      setIsListening(false);
      setPronunciationResult('fail');
      event.error === 'no-speech'
        ? setSpokenText('(No speech detected)')
        : setSpokenText(`(Error: ${event.error})`);
      try { recognition.abort(); } catch {}
    };

    recognition.onend = () => {
      setIsListening(false);
      if (!resultHandled) {
        setPronunciationResult('fail');
        setSpokenText('(Listening timed out)');
      }
    };

    recognition.start();
  };

  const nextSessionNote = (() => {
    if (!settings.notificationsEnabled) return null;
    const freqHrs = settings.notificationFrequency === '2h' ? 2 : settings.notificationFrequency === '6h' ? 6 : 24;
    const last = parseInt(localStorage.getItem('last_notified_time') || '0', 10);
    if (!last) {
      const first = now + freqHrs * 60 * 60 * 1000;
      return `Next session ${new Date(first).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    const next = last + freqHrs * 60 * 60 * 1000;
    if (next <= now) return 'Session due';
    return `Next session ${new Date(next).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  })();

  if (phrases.length === 0) {
    return (
      <div className="p-4 flex flex-col pt-12 items-center justify-center space-y-4 h-full">
        <h2 className="text-2xl font-bold font-sans tracking-tight text-slate-100">Practice</h2>
        <p className="text-slate-400 text-center">Add some phrases in Capture to start practicing.</p>
      </div>
    );
  }

  if (!currentCard) {
    if (!sessionTracked && sessionCards.length > 0) {
      updatePracticeStats(1, Date.now() - sessionStartTime);
      setSessionTracked(true);
    }
    return (
      <div className="p-4 flex flex-col pt-12 items-center justify-center space-y-4 h-full">
        <div className="w-20 h-20 bg-green-900/30 text-green-400 border border-green-500/30 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold font-sans tracking-tight text-slate-100">Session Complete!</h2>
        <p className="text-slate-400 text-center">Great job. Your phrases are now scheduled for optimal review.</p>
        <button onClick={() => newSession()} className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-4 px-8 rounded-full shadow-lg transition-colors">
          Start New Session
        </button>
      </div>
    );
  }

  const modeLabel = {
    listenChoose: 'Listen & Choose',
    listenRepeat: 'Listen & Repeat',
    audioCloze: 'Fill the Gap',
  }[currentCard.mode];

  return (
    <div className="p-4 flex flex-col space-y-4 pb-6 h-full">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold font-sans tracking-tight text-slate-100">Practice</h2>
          <p className="text-slate-400 text-sm mt-1">{nextSessionNote || 'Spaced Repetition'}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm font-bold text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full">
            {currentIndex + 1} / {sessionCards.length}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full py-2">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentCard.phrase.id + currentCard.mode}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -100, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={(_, info) => {
              if (info.offset.x < -100) {
                finishCard(0);
              }
            }}
            className="border text-center p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col justify-center gap-4 sm:gap-5 bg-slate-900 border-slate-800 w-full cursor-grab active:cursor-grabbing"
          >
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              {modeLabel}
            </div>

            {currentCard.mode === 'listenChoose' && (
              <ListenChoose
                card={currentCard}
                audioPlayed={audioPlayed}
                onPlayAudio={playCardAudio}
                selectedAnswer={selectedAnswer}
                answerRevealed={answerRevealed}
                onSelect={handleChooseAnswer}
                onNext={handleChooseNext}
              />
            )}

            {currentCard.mode === 'listenRepeat' && (
              <ListenRepeat
                card={currentCard}
                audioPlayed={audioPlayed}
                onPlayAudio={playCardAudio}
                isListening={isListening}
                pronunciationResult={pronunciationResult}
                spokenText={spokenText}
                onToggleRepeat={toggleRepeat}
                onNext={() => finishCard(pronunciationResult === 'success' ? 5 : 2)}
              />
            )}

            {currentCard.mode === 'audioCloze' && (
              <AudioCloze
                card={currentCard}
                audioPlayed={audioPlayed}
                onPlayAudio={playCardAudio}
                selectedAnswer={selectedAnswer}
                answerRevealed={answerRevealed}
                onSelect={handleClozeAnswer}
                onNext={handleClozeNext}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function ListenChoose({ card, audioPlayed, onPlayAudio, selectedAnswer, answerRevealed, onSelect, onNext }: {
  card: SessionCard;
  audioPlayed: boolean;
  onPlayAudio: () => void;
  selectedAnswer: string | null;
  answerRevealed: boolean;
  onSelect: (answer: string) => void;
  onNext: () => void;
}) {
  const options = card.distractors
    ? [card.phrase.translation, ...card.distractors.map(d => d.translation)].slice(0, 4)
    : [card.phrase.translation];

  const shuffled = React.useMemo(() => {
    const a = [...options];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, [card.phrase.id]);

  return (
    <>
      <div className="flex flex-col gap-2">
        <p className="text-3xl font-extrabold text-slate-100 leading-tight">{card.phrase.nativePhrase}</p>
        <button onClick={onPlayAudio} className="p-4 mx-auto rounded-full transition-transform active:scale-95 flex flex-col items-center border shadow-inner text-indigo-400 bg-indigo-900/30 hover:bg-indigo-900/50 border-indigo-500/20">
          <PlayCircle className="w-10 h-10 mb-1" />
          <span className="text-xs font-bold tracking-wider">PLAY</span>
        </button>
      </div>

      <div className="flex flex-col gap-3 w-full">
        {shuffled.map((option, i) => {
          const isCorrect = option === card.phrase.translation;
          const isSelected = selectedAnswer === option;
          let style = 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700';
          if (answerRevealed) {
            if (isCorrect) style = 'bg-emerald-900/30 border-emerald-500/40 text-emerald-300';
            else if (isSelected) style = 'bg-red-900/30 border-red-500/40 text-red-300';
            else style = 'bg-slate-800/50 border-slate-700/50 text-slate-500';
          }
          return (
            <button
              key={i}
              onClick={() => onSelect(option)}
              disabled={answerRevealed}
              className={`w-full p-4 rounded-2xl border text-left font-medium transition-all ${style}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {answerRevealed && (
        <button onClick={onNext} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-4 rounded-2xl transition-colors mt-2">
          Continue
        </button>
      )}
    </>
  );
}

function ListenRepeat({ card, audioPlayed, onPlayAudio, isListening, pronunciationResult, spokenText, onToggleRepeat, onNext }: {
  card: SessionCard;
  audioPlayed: boolean;
  onPlayAudio: () => void;
  isListening: boolean;
  pronunciationResult: 'success' | 'fail' | null;
  spokenText: string;
  onToggleRepeat: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <p className="text-3xl font-extrabold text-slate-100 leading-tight">{card.phrase.nativePhrase}</p>
      </div>

      <div className="flex justify-center gap-4">
        <button onClick={onPlayAudio} className="p-5 rounded-full transition-transform active:scale-95 flex flex-col items-center border shadow-inner text-indigo-400 bg-indigo-900/30 hover:bg-indigo-900/50 border-indigo-500/20">
          <PlayCircle className="w-10 h-10 mb-1" />
          <span className="text-xs font-bold tracking-wider">HEAR</span>
        </button>
        <button
          onClick={onToggleRepeat}
          className={`p-5 w-28 rounded-full transition-transform active:scale-95 flex flex-col items-center border shadow-inner ${
            isListening
              ? 'text-red-400 bg-red-900/30 hover:bg-red-900/50 border-red-500/30 animate-pulse'
              : pronunciationResult === 'success'
              ? 'text-emerald-400 bg-emerald-900/30 border-emerald-500/30'
              : pronunciationResult === 'fail'
              ? 'text-red-400 bg-red-900/30 border-red-500/30'
              : 'text-emerald-400 bg-emerald-900/30 hover:bg-emerald-900/50 border-emerald-500/20'
          }`}
        >
          {isListening ? <MicOff className="w-10 h-10 mb-1" /> : <Mic className="w-10 h-10 mb-1" />}
          <span className="text-xs font-bold tracking-wider">{isListening ? 'STOP' : 'REPEAT'}</span>
        </button>
      </div>

      {(spokenText || pronunciationResult) && (
        <div className={`flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border animate-in fade-in slide-in-from-bottom-2 ${
          pronunciationResult === 'success' ? 'bg-emerald-900/20 border-emerald-500/30'
          : pronunciationResult === 'fail' ? 'bg-red-900/20 border-red-500/30'
          : 'bg-slate-800/50 border-slate-700'
        }`}>
          {pronunciationResult === 'success' && <CheckCircle className="w-8 h-8 text-emerald-400" />}
          {pronunciationResult === 'fail' && <XCircle className="w-8 h-8 text-red-400" />}
          {!pronunciationResult && <div className="w-8 h-8" />}
          <p className="text-xl font-bold text-slate-100">{card.phrase.nativePhrase}</p>
        </div>
      )}

      {pronunciationResult && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg text-slate-400">{card.phrase.translation}</p>
          <button onClick={onNext} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-4 rounded-2xl transition-colors mt-2">
            Continue
          </button>
        </div>
      )}
    </>
  );
}

function AudioCloze({ card, audioPlayed, onPlayAudio, selectedAnswer, answerRevealed, onSelect, onNext }: {
  card: SessionCard;
  audioPlayed: boolean;
  onPlayAudio: () => void;
  selectedAnswer: string | null;
  answerRevealed: boolean;
  onSelect: (word: string) => void;
  onNext: () => void;
}) {
  const cloze = card.clozeData;
  if (!cloze) {
    return (
      <>
        <p className="text-2xl sm:text-3xl font-extrabold text-slate-100 leading-tight">{card.phrase.nativePhrase}</p>
        <p className="text-lg text-slate-400">{card.phrase.translation}</p>
        <button onClick={onNext} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-4 rounded-2xl transition-colors mt-2">
          Skip
        </button>
      </>
    );
  }

  return (
    <>
      <button onClick={onPlayAudio} className="p-5 mx-auto rounded-full transition-transform active:scale-95 flex flex-col items-center border shadow-inner text-indigo-400 bg-indigo-900/30 hover:bg-indigo-900/50 border-indigo-500/20">
        <PlayCircle className="w-12 h-12 mb-1" />
        <span className="text-xs font-bold tracking-wider">PLAY</span>
      </button>

      <div className="flex flex-col gap-3">
        <p className="text-2xl sm:text-3xl font-extrabold text-slate-100 leading-tight">
          {cloze.blankedPhrase.split(' ').map((word, i) => (
            <span key={i}>
              {word === '___' ? (
                <span className={`inline-block min-w-[3ch] border-b-2 px-1 ${
                  answerRevealed
                    ? selectedAnswer === cloze.correctWord
                      ? 'border-emerald-500 text-emerald-300'
                      : 'border-red-500 text-red-300'
                    : 'border-indigo-500 text-indigo-300'
                }`}>
                  {answerRevealed ? cloze.correctWord : (selectedAnswer || '\u00A0')}
                </span>
              ) : (
                <>{word} </>
              )}
            </span>
          ))}
        </p>
        {answerRevealed && <p className="text-lg text-slate-400">{card.phrase.translation}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 w-full">
        {cloze.options.map((option, i) => {
          const isCorrect = option === cloze.correctWord;
          const isSelected = selectedAnswer === option;
          let style = 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700';
          if (answerRevealed) {
            if (isCorrect) style = 'bg-emerald-900/30 border-emerald-500/40 text-emerald-300';
            else if (isSelected) style = 'bg-red-900/30 border-red-500/40 text-red-300';
            else style = 'bg-slate-800/50 border-slate-700/50 text-slate-500';
          }
          return (
            <button
              key={i}
              onClick={() => onSelect(option)}
              disabled={answerRevealed}
              className={`p-4 rounded-2xl border font-bold text-lg transition-all ${style}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {answerRevealed && (
        <button onClick={onNext} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-4 rounded-2xl transition-colors mt-2">
          Continue
        </button>
      )}
    </>
  );
}
