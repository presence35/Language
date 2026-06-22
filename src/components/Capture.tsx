import React, { useState, useRef, useEffect } from 'react';
import { useStorage } from '../hooks/useStorage';
import { Mic, Loader2, BookmarkPlus, Volume2, PlayCircle, X, Check, Trash2, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playAudioWithLang } from '../utils/audio';
import { LANGUAGE_FLAGS } from '../utils/language';

const DEBUG = false;

interface TranslationResult {
  id: string;
  transcription: string;
  russianPhrase: string;
  englishPhrase: string;
  sourceLanguage: 'en' | 'ru' | 'es';
  targetLanguage: 'en' | 'ru' | 'es';
  wordBreakdown: any[];
  timestamp: number;
  originalAudioBase64?: string;
  originalAudioMimeType?: string;
}

interface Animal {
  id: string;
  nameEn: string;
  nameRu: string;
  image: string;
}

const ANIMALS: Animal[] = [
  { id: 'bear',     nameEn: 'Bear',      nameRu: 'Мишка',         image: '/animals/bear.png' },
  { id: 'bird',     nameEn: 'Bird',      nameRu: 'Птичка',        image: '/animals/bird.png' },
  { id: 'bunny',    nameEn: 'Bunny',     nameRu: 'Зайчик',        image: '/animals/bunny.png' },
  { id: 'cat',      nameEn: 'Cat',       nameRu: 'Кошечка',       image: '/animals/cat.png' },
  { id: 'cow',      nameEn: 'Cow',       nameRu: 'Коровка',       image: '/animals/cow.png' },
  { id: 'croc',     nameEn: 'Crocodile', nameRu: 'Крокодил',      image: '/animals/croc.png' },
  { id: 'dog',      nameEn: 'Dog',       nameRu: 'Собачка',       image: '/animals/dog.png' },
  { id: 'duck',     nameEn: 'Duck',      nameRu: 'Уточка',        image: '/animals/duck.png' },
  { id: 'elephant', nameEn: 'Elephant',  nameRu: 'Слонёнок',      image: '/animals/elephant.png' },
  { id: 'ladybug',  nameEn: 'Ladybug',   nameRu: 'Божья коровка', image: '/animals/ladybug.png' },
  { id: 'monkey',   nameEn: 'Monkey',    nameRu: 'Обезьянка',     image: '/animals/monkey.png' },
  { id: 'pig',      nameEn: 'Pig',       nameRu: 'Свинка',        image: '/animals/pig.png' },
];

function pickSixAnimals(): Animal[] {
  const shuffled = [...ANIMALS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 6);
}

export function Capture() {
  const { addPhrase, phrases, deletePhrase, settings } = useStorage();
  const [loading, setLoading] = useState(false);
  const [selectedAnimals] = useState<Animal[]>(() => pickSixAnimals());
  
  const [resultsHistory, setResultsHistory] = useState<TranslationResult[]>(() => {
    try {
      const stored = localStorage.getItem('resultsHistory');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch(e) {}
    return [];
  });

  useEffect(() => {
    localStorage.setItem('resultsHistory', JSON.stringify(resultsHistory));
  }, [resultsHistory]);

  const validHistory = resultsHistory.filter((r, index) => {
    const isUnder30Mins = Date.now() - r.timestamp < 30 * 60 * 1000;
    const isAllowedBySetting = settings.showRecentTranslations || index === 0;
    return isUnder30Mins && isAllowedBySetting;
  });

  const [historyIndex, setHistoryIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState(1);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);

  const [playingAudio, setPlayingAudio] = useState(false);
  const [savedSuccesses, setSavedSuccesses] = useState<Record<string, boolean>>({});
  const [savedWords, setSavedWords] = useState<Record<string, boolean>>({});

  const [recording, setRecording] = useState(false);
  const [activeAnimal, setActiveAnimal] = useState<Animal | null>(null);
  const [hiddenRecents, setHiddenRecents] = useState<Record<string, boolean>>({});
  const [speechLanguage, setSpeechLanguage] = useState<'en' | 'ru' | 'es' | 'fr' | 'de'>(() => {
    return (localStorage.getItem('speech_language') as 'en' | 'ru' | 'es' | 'fr' | 'de') || 'ru';
  });

  useEffect(() => {
    if (!settings.enabledLanguages[speechLanguage]) {
      const fallback = settings.defaultTargetLanguage;
      if (settings.enabledLanguages[fallback]) {
        setSpeechLanguage(fallback);
        localStorage.setItem('speech_language', fallback);
      } else {
        const firstEnabled = (Object.keys(settings.enabledLanguages) as Array<keyof typeof settings.enabledLanguages>).find(k => settings.enabledLanguages[k]);
        if (firstEnabled) {
          setSpeechLanguage(firstEnabled);
          localStorage.setItem('speech_language', firstEnabled as string);
        }
      }
    }
  }, [settings.enabledLanguages, settings.defaultTargetLanguage, speechLanguage]);

  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const debugLog = (msg: string) => {
    if (!DEBUG) return;
    const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
    setDebugLogs(prev => [...prev.slice(-19), line]);
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const getWordBreakdownLocal = async (russianPhrase: string, sl: string) => {
    const cleanText = russianPhrase.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"«»’"']/g, "");
    const words = cleanText.split(/\s+/).map(w => w.trim()).filter(w => w.length > 0);
    const uniqueWords = Array.from(new Set(words));
    
    try {
      const promises = uniqueWords.map(async (word) => {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=en&dt=t&q=${encodeURIComponent(word)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const translation = data[0].map((item: any) => item[0]).join('').trim();
        return { word, translation };
      });
      return await Promise.all(promises);
    } catch (err) {
      return uniqueWords.map(word => ({ word, translation: "..." }));
    }
  };

  const processInput = async (text: string) => {
    debugLog(`processInput text="${text}" lang=${speechLanguage} defaultTarget=${settings.defaultTargetLanguage}`);
    setLoading(true);
    try {
      const sl = speechLanguage;
      let tl: string;
      if (sl === 'en') {
        tl = settings.defaultTargetLanguage;
      } else {
        tl = 'en';
      }

      debugLog(`Translating… sl=${sl} tl=${tl} q="${text}"`);

      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      if (!response.ok) {
        debugLog(`Translation HTTP ${response.status}`);
        throw new Error("Translation failed");
      }

      const json = await response.json();
      const translation = json[0].map((item: any) => item[0]).join('').trim();

      const ruPhrase = sl === 'en' ? translation : text;
      const enPhrase = sl === 'en' ? text : translation;

      debugLog(`Translation done ru="${ruPhrase}" en="${enPhrase}"`);

      const breakdown = await getWordBreakdownLocal(ruPhrase, sl === 'en' ? tl : sl);

      const newId = Date.now().toString();
      const newResult: TranslationResult = {
        id: newId,
        transcription: text,
        russianPhrase: ruPhrase,
        englishPhrase: enPhrase,
        sourceLanguage: sl,
        targetLanguage: tl as 'en' | 'ru' | 'es',
        wordBreakdown: breakdown,
        timestamp: Date.now()
      };

      setResultsHistory(prev => {
        const valid = prev.filter(r => Date.now() - r.timestamp < 42 * 60 * 1000);
        return [newResult, ...valid].slice(0, 5);
      });
      setHistoryIndex(0);
      setIsHistoryVisible(true);

      debugLog(`Playing TTS… "${ruPhrase}" (${sl})`);
      await playAudioWithLang(ruPhrase, sl);
      debugLog(`TTS done`);
    } catch (e: any) {
      console.error(e);
      debugLog(`Error: ${e.message || e}`);
      alert('Oops! Instant translation ran into a hitch, please try again.');
    } finally {
      setLoading(false);
      setRecording(false);
      setActiveAnimal(null);
    }
  };

  const speechRecoRef = useRef<any>(null);

  const processVoiceInput = async (text: string, audioBase64?: string, audioMimeType?: string) => {
    setLoading(true);
    setRecording(false);
    try {
      const sl = speechLanguage;
      const tl = sl === 'en' ? settings.defaultTargetLanguage : 'en';

      debugLog(`Translating sl=${sl} tl=${tl} text="${text}"`);

      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Translation failed");
      const json = await response.json();
      const translation = json[0].map((item: any) => item[0]).join('').trim();

      const ruPhrase = sl === 'en' ? translation : text;
      const enPhrase = sl === 'en' ? text : translation;

      debugLog(`Getting word breakdown for: "${ruPhrase}"`);
      let breakdown: any[] = [];
      try {
        breakdown = await getWordBreakdownLocal(ruPhrase, sl === 'en' ? tl : sl);
      } catch (e) {}

      const newResult: TranslationResult = {
        id: Date.now().toString(),
        transcription: text,
        russianPhrase: ruPhrase,
        englishPhrase: enPhrase,
        sourceLanguage: sl as 'en' | 'ru' | 'es',
        targetLanguage: tl as 'en' | 'ru' | 'es',
        wordBreakdown: breakdown,
        timestamp: Date.now(),
        originalAudioBase64: audioBase64,
        originalAudioMimeType: audioMimeType,
      };

      setResultsHistory(prev => {
        const valid = prev.filter(r => Date.now() - r.timestamp < 42 * 60 * 1000);
        return [newResult, ...valid].slice(0, 5);
      });
      setHistoryIndex(0);
      setIsHistoryVisible(true);

      debugLog(`Playing TTS… "${ruPhrase}" (${sl})`);
      try {
        await playAudioWithLang(ruPhrase, sl === 'en' ? tl : sl);
      } catch (e) {}
      debugLog('Done');
    } catch (err: any) {
      console.error(err);
      debugLog(`Error: ${err.message || err}`);
      alert(`Oops! Voice translation hit a snag: ${err.message || 'unknown error'}`);
    } finally {
      setLoading(false);
      setActiveAnimal(null);
    }
  };

  const handleAnimalClick = async (animal: Animal) => {
    const isAndroid = /android/i.test(navigator.userAgent);

    // ─── Android path: SpeechRecognition only (no MediaRecorder) ───
    if (isAndroid) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Your browser doesn't support speech recognition. Please use Chrome.");
        return;
      }

      if (speechRecoRef.current) {
        speechRecoRef.current.stop();
        speechRecoRef.current = null;
        return;
      }

      setActiveAnimal(animal);
      setRecording(true);

      const recognition = new SpeechRecognition();
      recognition.lang = speechLanguage === 'en' ? 'en-US' : speechLanguage === 'ru' ? 'ru-RU' : speechLanguage === 'es' ? 'es-ES' : speechLanguage === 'fr' ? 'fr-FR' : speechLanguage === 'de' ? 'de-DE' : speechLanguage;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      let resultReceived = false;

      recognition.onresult = (event: any) => {
        resultReceived = true;
        const transcript = event.results[0][0].transcript;
        debugLog(`Speech recognition result: ${transcript}`);
        speechRecoRef.current = null;
        processVoiceInput(transcript);
      };

      recognition.onerror = (e: any) => {
        debugLog(`Speech recognition error: ${e.error}`);
        setRecording(false);
        setActiveAnimal(null);
        speechRecoRef.current = null;
      };

      recognition.onend = () => {
        debugLog('Speech recognition ended');
        setRecording(false);
        speechRecoRef.current = null;
        if (!resultReceived) {
          const manual = prompt("Speech wasn't recognized. Type what you said (or Cancel to discard):");
          if (manual && manual.trim()) {
            processVoiceInput(manual.trim());
          } else {
            setActiveAnimal(null);
          }
        }
      };

      speechRecoRef.current = recognition;
      recognition.start();
      return;
    }

    // ─── Desktop path: MediaRecorder + SpeechRecognition ───
    const isCurrentlyRecording = mediaRecorderRef.current?.state === 'recording';
    debugLog(`handleAnimalClick animal=${animal.id} recording=${isCurrentlyRecording}`);

    if (isCurrentlyRecording) {
      debugLog('User stopped recording — finalizing');
      mediaRecorderRef.current?.stop();
      if (speechRecoRef.current) speechRecoRef.current.stop();
      return;
    }

    setActiveAnimal(animal);
    setRecording(true);

    if (!navigator.mediaDevices?.getUserMedia) {
      setRecording(false);
      setActiveAnimal(null);
      debugLog("MediaRecorder API not available — recording not supported");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
         alert("Your browser doesn't support free speech recognition. Please use Chrome for this feature.");
         setRecording(false);
         setActiveAnimal(null);
         stream.getTracks().forEach(track => track.stop());
         return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = speechLanguage === 'en' ? 'en-US' : speechLanguage === 'ru' ? 'ru-RU' : speechLanguage === 'es' ? 'es-ES' : speechLanguage === 'fr' ? 'fr-FR' : speechLanguage === 'de' ? 'de-DE' : speechLanguage;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      let finalTranscript = '';

      recognition.onresult = (event: any) => {
        finalTranscript = event.results[0][0].transcript;
        debugLog(`Speech recognition final: ${finalTranscript}`);
      };

      speechRecoRef.current = recognition;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const actualMimeType = recorder.mimeType || 'audio/webm';
        mediaRecorderRef.current = null;
        speechRecoRef.current = null;

        if (audioChunksRef.current.length === 0) {
          debugLog('No audio captured');
          setRecording(false);
          setActiveAnimal(null);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1];

          if (!finalTranscript || finalTranscript.trim() === '') {
              debugLog('No speech text recognized');
              const manual = prompt("Speech wasn't recognized. Type what you said (or Cancel to discard):");
              if (!manual || manual.trim() === '') {
                  setLoading(false);
                  setActiveAnimal(null);
                  return;
              }
              finalTranscript = manual.trim();
          }

          processVoiceInput(finalTranscript, base64data, actualMimeType);
        };
      };

      recorder.onerror = (event: any) => {
        debugLog(`MediaRecorder error: ${event.error?.name || 'unknown'}`);
        setRecording(false);
        setLoading(false);
        setActiveAnimal(null);
        mediaRecorderRef.current = null;
        if (speechRecoRef.current) speechRecoRef.current.stop();
        stream.getTracks().forEach(track => track.stop());
      };

      recognition.onerror = (e: any) => {
          debugLog(`Speech recognition error: ${e.error}`);
          if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop();
          }
      };

      recognition.onend = () => {
          debugLog('Speech recognition ended automatically');
          if (finalTranscript && mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop();
          }
      };

      recognition.start();
      recorder.start();
      debugLog('MediaRecorder and SpeechRecognition started');
    } catch (err: any) {
      debugLog(`getUserMedia/MediaRecorder error: ${err.name}: ${err.message || err}`);
      setRecording(false);
      setActiveAnimal(null);
    }
  };

  const playAudio = async (text: string, lang: string = 'ru') => {
    setPlayingAudio(true);
    await playAudioWithLang(text, lang);
    setPlayingAudio(false);
  };

  const handleSave = (res: TranslationResult) => {
    addPhrase({
      russianPhrase: res.russianPhrase,
      englishPhrase: res.englishPhrase,
      wordBreakdown: res.wordBreakdown || [],
      categories: ['Kids Zone'],
      targetLang: res.sourceLanguage === 'en' ? settings.defaultTargetLanguage : res.sourceLanguage,
    });
    setSavedSuccesses(prev => ({ ...prev, [res.id]: true }));
  };

  const handleSaveWord = (item: any, idx: number, res: TranslationResult) => {
    addPhrase({
      russianPhrase: item.word,
      englishPhrase: item.translation,
      wordBreakdown: [{ word: item.word, translation: item.translation }],
      categories: ['Kids Zone'],
      targetLang: res.sourceLanguage === 'en' ? settings.defaultTargetLanguage : res.sourceLanguage,
    });
    const key = `${res.id}_${idx}`;
    setSavedWords(prev => ({ ...prev, [key]: true }));
  };

  const getListeningText = (lang: string, animal: Animal | null, showAnimals: boolean) => {
    if (showAnimals && animal) {
      switch (lang) {
        case 'ru': return `${animal.nameRu} слушает!`;
        case 'es': return `¡${animal.nameEn} está escuchando!`;
        case 'fr': return `${animal.nameEn} écoute !`;
        case 'de': return `${animal.nameEn} hört zu!`;
        case 'en': 
        default: return `${animal.nameEn} is listening!`;
      }
    } else {
      switch (lang) {
        case 'ru': return 'Слушаю...';
        case 'es': return 'Escuchando...';
        case 'fr': return 'Écoute...';
        case 'de': return 'Hört zu...';
        case 'en': 
        default: return 'Listening...';
      }
    }
  };

  const getTranslatingText = (lang: string, animal: Animal | null, showAnimals: boolean) => {
    if (showAnimals && animal) {
      switch (lang) {
        case 'ru': return `${animal.nameRu} переводит...`;
        case 'es': return `${animal.nameEn} está traduciendo...`;
        case 'fr': return `${animal.nameEn} traduit...`;
        case 'de': return `${animal.nameEn} übersetzt...`;
        case 'en':
        default: return `${animal.nameEn} is translating...`;
      }
    } else {
      switch (lang) {
        case 'ru': return 'Перевожу...';
        case 'es': return 'Traduciendo...';
        case 'fr': return 'Traduction...';
        case 'de': return 'Übersetzen...';
        case 'en':
        default: return 'Translating...';
      }
    }
  };

  const handleCloseHistory = () => {
      setIsHistoryVisible(false);
  };

  return (
    <div className="p-4 flex flex-col space-y-6 flex-1 pb-24 select-none relative hide-scrollbar overflow-x-hidden w-full">
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      <div className="grid grid-cols-3 gap-2 sm:gap-3 pb-2 justify-items-center">
        {settings.showAnimals ? selectedAnimals.map((animal) => {
          const isActive = activeAnimal?.id === animal.id;
          const isRecordingOrLoading = (recording || loading) && activeAnimal;
          const shouldGrayscale = isRecordingOrLoading && !isActive;
          const isThisRecording = recording && isActive;
          const isThisLoading = loading && isActive;
          return (
            <button
              id={`animal_card_${animal.id}`}
              key={animal.id}
              onClick={() => handleAnimalClick(animal)}
              disabled={loading}
              className={`relative p-2 flex items-center justify-center transition-all duration-300 transform outline-none active:scale-95 ${
                isThisRecording 
                  ? 'ring-2 ring-red-300 ring-opacity-50 scale-105 rounded-xl' 
                  : isThisLoading
                  ? 'ring-2 ring-indigo-300 ring-opacity-50 scale-105 rounded-xl animate-bounce'
                  : isActive
                  ? 'scale-105 ring-2 ring-indigo-500 rounded-xl'
                  : 'opacity-95 hover:scale-105 rounded-xl'
              } ${shouldGrayscale ? 'grayscale opacity-50 scale-95' : ''}`}
            >
              <img src={animal.image} alt={animal.nameEn} className="w-20 h-20 sm:w-24 sm:h-24 object-contain pointer-events-none" />
            </button>
          );
        }) : (
           <div className="flex w-full justify-center pb-4 pt-4">
              <button 
                onClick={() => handleAnimalClick(selectedAnimals[0]!)}
                disabled={loading}
                className="w-24 h-24 rounded-full bg-slate-800 border-4 border-slate-700 hover:border-indigo-500/50 flex items-center justify-center text-slate-300 hover:text-white transition-all shadow-sm active:scale-95"
              >
                  <Mic className="w-10 h-10" />
              </button>
           </div>
        )}
      </div>

      {validHistory.length > 0 && !loading && !recording && (
        <div id="history-scroll-container" className="flex w-full overflow-x-auto snap-x snap-mandatory gap-8 pb-6 pt-6 hide-scrollbar">
          <AnimatePresence>
            {validHistory.map((res, index) => {
              const isHistorical = index > 0;
              const savedSuccess = savedSuccesses[res.id];
              return (
                <motion.div
                  key={'card_'+res.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, y: 200 }}
                  transition={{ duration: 0.2 }}
                  className={`w-full shrink-0 snap-center bg-slate-900 border text-left p-4 sm:p-6 rounded-3xl shadow-lg space-y-5 relative select-none ${isHistorical ? 'border-slate-800/80 bg-slate-900/95' : 'border-indigo-500/40'}`}
                >
                  <div className={`p-4 mt-0 sm:p-5 rounded-2xl border flex flex-col gap-4 relative transition-colors pointer-events-none ${isHistorical ? 'bg-slate-800/30 border-slate-700/40' : 'bg-indigo-900/30 border-indigo-500/30'}`}>
                    <div 
                      onClick={() => {
                        if (res.originalAudioBase64) {
                          const audio = new Audio(`data:${(res.originalAudioMimeType || 'audio/webm').split(';')[0]};base64,${res.originalAudioBase64}`);
                          audio.play();
                        } else {
                          const utterance = new SpeechSynthesisUtterance(res.transcription);
                          if (res.sourceLanguage === 'ru') utterance.lang = 'ru-RU';
                          else if (res.sourceLanguage === 'es') utterance.lang = 'es-ES';
                          else if (res.sourceLanguage === 'fr') utterance.lang = 'fr-FR';
                          else if (res.sourceLanguage === 'de') utterance.lang = 'de-DE';
                          else utterance.lang = 'en-US';
                          window.speechSynthesis.speak(utterance);
                        }
                      }}
                      className="flex flex-col gap-1 pr-8 relative cursor-pointer pointer-events-auto"
                    >
                      <div className={`flex items-center gap-2 font-extrabold text-xs uppercase tracking-wider mb-1 ${isHistorical ? 'text-slate-500' : 'text-indigo-400'}`}>
                        <img src={LANGUAGE_FLAGS[res.sourceLanguage]} alt={res.sourceLanguage} className="w-3.5 h-3.5 object-cover rounded shadow-sm opacity-80" />
                        <span>What you said</span>
                        <Volume2 className="w-4 h-4 shrink-0 opacity-80" />
                      </div>
                      
                      {res.sourceLanguage === 'ru' ? (
                         <p className={`text-2xl sm:text-3xl font-black leading-tight w-full pointer-events-auto ${isHistorical ? 'text-slate-300' : 'text-slate-100'}`}>{res.russianPhrase}</p>
                      ) : (
                         <p className={`text-lg italic font-medium w-full pointer-events-auto ${isHistorical ? 'text-slate-400' : 'text-indigo-200'}`}>"{res.transcription}"</p>
                      )}
                    </div>

                    {res.sourceLanguage === 'ru' ? (
                      <div 
                        onClick={() => { if (!playingAudio) playAudio(res.englishPhrase, 'en'); }}
                        className={`pt-4 border-t cursor-pointer ${isHistorical ? 'border-slate-700/50' : 'border-indigo-500/20'} pointer-events-auto`}
                      >
                          <div className={`flex items-center gap-2 font-extrabold text-xs uppercase tracking-wider mb-1 ${isHistorical ? 'text-slate-500' : 'text-indigo-400'}`}>
                            <img src={LANGUAGE_FLAGS['en']} alt="en" className="w-3.5 h-3.5 object-cover rounded shadow-sm opacity-80" />
                            <span>Translation</span>
                            <Volume2 className="w-4 h-4 shrink-0 opacity-80" />
                          </div>
                          <div className="flex items-center justify-start gap-3">
                            <p className={`text-xl sm:text-2xl font-bold leading-tight flex-1 ${isHistorical ? 'text-slate-300' : 'text-slate-100'}`}>{res.englishPhrase}</p>
                          </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => { if (!playingAudio) playAudio(res.russianPhrase, res.targetLanguage); }}
                        className={`pt-4 border-t cursor-pointer ${isHistorical ? 'border-slate-700/50' : 'border-indigo-500/20'} pointer-events-auto`}
                      >
                          <div className={`flex items-center gap-2 font-extrabold text-xs uppercase tracking-wider mb-1 ${isHistorical ? 'text-slate-500' : 'text-indigo-400'}`}>
                            <img src={LANGUAGE_FLAGS[res.targetLanguage]} alt={res.targetLanguage} className="w-3.5 h-3.5 object-cover rounded shadow-sm opacity-80" />
                            <span>Translation</span>
                            <Volume2 className="w-4 h-4 shrink-0 opacity-80" />
                          </div>
                         <div className="flex justify-start items-center gap-3">
                            <p className={`text-2xl sm:text-3xl font-black leading-tight flex-1 ${isHistorical ? 'text-slate-300' : 'text-slate-100'}`}>{res.russianPhrase}</p>
                          </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 px-1 sm:px-2 mt-4 pointer-events-auto">
                      <div className="flex w-full items-center gap-2">
                        <button 
                          onClick={() => {
                            setResultsHistory(prev => prev.filter(r => r.id !== res.id));
                          }} 
                          className="w-[56px] h-[56px] flex items-center justify-center bg-slate-900 border border-slate-800 rounded-xl text-red-500/80 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer flex-shrink-0"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>

                        {!phrases?.some(p => p.russianPhrase.toLowerCase() === res.russianPhrase.toLowerCase()) ? (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleSave(res); }} 
                            disabled={savedSuccess}
                            className={`flex-1 flex items-center justify-center gap-2 font-black h-[56px] px-4 rounded-xl transition-colors duration-300 shadow-sm outline-none active:scale-95 cursor-pointer ${savedSuccess ? 'bg-green-600/80 text-white' : isHistorical ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                          >
                            {savedSuccess ? (
                              <span className="flex items-center gap-1"> Saved 💖</span>
                            ) : (
                              <>
                                <span>Save</span>
                                <BookmarkPlus className="w-5 h-5"/>
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="flex-1 flex items-center justify-center gap-2 font-black h-[56px] px-4 rounded-xl transition-colors duration-300 shadow-sm bg-slate-800/50 text-slate-500 border border-slate-700/50">
                             <Check className="w-5 h-5" />
                             <span>Saved</span>
                          </div>
                        )}

                        {validHistory.length > 1 && (
                          <button 
                            onClick={() => {
                              const container = document.getElementById('history-scroll-container');
                              if (container) {
                                const cards = Array.from(container.querySelectorAll(':scope > div'));
                                const nextIndex = index + 1 < validHistory.length ? index + 1 : 0;
                                if (cards[nextIndex]) {
                                  cards[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                                }
                              }
                            }}
                            className="h-[56px] px-3 bg-slate-800 border border-slate-700 hover:bg-slate-700/80 rounded-xl flex items-center justify-center gap-1.5 shadow-sm shrink-0 cursor-pointer transition-colors active:scale-95 outline-none"
                          >
                             <History className="w-4 h-4 text-slate-400" />
                             <span className="text-xs font-bold text-slate-400">
                               {index + 1} / {validHistory.length}
                             </span>
                          </button>
                        )}
                      </div>

                    {res.wordBreakdown && res.wordBreakdown.length > 1 && (
                      <div className={`pt-3 border-t ${isHistorical ? 'border-slate-800/50' : 'border-slate-800'}`}>
                        <div className="flex flex-col gap-2">
                          {res.wordBreakdown.map((item: any, idx: number) => {
                            const isSaved = savedWords[`${res.id}_${idx}`] || phrases?.some(p => p.russianPhrase.toLowerCase() === item.word.toLowerCase());
                            return (
                            <div 
                              key={idx} 
                              className={`flex items-center justify-between border p-3 rounded-xl gap-2 transition-colors ${isHistorical ? 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/50' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
                            >
                              <button 
                                className="flex-1 text-left flex flex-col cursor-pointer outline-none active:scale-95 transition-transform"
                                onClick={(e) => { e.stopPropagation(); playAudioWithLang(item.word, res.sourceLanguage === 'en' ? res.targetLanguage : res.sourceLanguage); }}
                              >
                                <span className={`font-bold text-sm flex items-center gap-1 ${isHistorical ? 'text-slate-300' : 'text-slate-200'}`}>
                                  {item.word}
                                  <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                                </span>
                                <span className="text-[11px] text-slate-400 font-medium">{item.translation}</span>
                              </button>
                              {!isSaved && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSaveWord(item, idx, res); }}
                                  className={`border p-2 rounded-lg shrink-0 transition-colors outline-none active:scale-95 cursor-pointer ${isHistorical ? 'bg-slate-800/50 border-slate-700 text-slate-500 hover:text-slate-300' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-100'}`}
                                >
                                  <BookmarkPlus className="w-4 h-4" />
                                </button>
                              )}
                              {isSaved && (
                                 <div className="p-2 text-green-500/80">
                                   <Check className="w-4 h-4" />
                                 </div>
                              )}
                            </div>
                          )})}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {recording && activeAnimal && (
        <div 
          onClick={() => handleAnimalClick(activeAnimal)}
          className={`bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col items-center space-y-4 shadow-inner transition-all duration-300 cursor-pointer mt-2`}
        >
          <div className="text-center">
            <h3 className={`text-slate-100 font-black text-xl flex items-center justify-center gap-1`}>
              <span>{getListeningText(speechLanguage, activeAnimal, settings.showAnimals)}</span>
            </h3>
          </div>
          <div className="flex justify-center items-center gap-1.5 h-8">
            <span className="w-1 h-3 bg-red-500 rounded-full animate-pulse delay-100"></span>
            <span className="w-1 h-6 bg-red-500 rounded-full animate-pulse delay-200"></span>
            <span className="w-1 h-8 bg-red-500 rounded-full animate-pulse delay-300"></span>
            <span className="w-1 h-5 bg-red-500 rounded-full animate-pulse delay-75"></span>
            <span className="w-1 h-7 bg-red-500 rounded-full animate-pulse delay-150"></span>
            <span className="w-1 h-2 bg-red-500 rounded-full animate-pulse delay-200"></span>
          </div>
        </div>
      )}

      {loading && !recording && (
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl flex flex-col items-center justify-center space-y-4 shadow-sm transition-all duration-300 animate-pulse mt-2">
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
          <h3 className="text-slate-200 font-bold text-lg text-center">
            {getTranslatingText(speechLanguage, activeAnimal, settings.showAnimals)}
          </h3>
        </div>
      )}

      {!recording && !loading && (
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-3xl flex items-center gap-2 shadow-sm mt-2">
          <div className="flex flex-shrink-0 items-center justify-center bg-slate-800/50 p-1 rounded-full border border-slate-700">
            {[
              { id: 'en', flag: 'https://flagcdn.com/us.svg', name: 'English' },
              { id: 'ru', flag: 'https://flagcdn.com/ru.svg', name: 'Russian' },
              { id: 'es', flag: 'https://flagcdn.com/es.svg', name: 'Spanish' },
              { id: 'fr', flag: 'https://flagcdn.com/fr.svg', name: 'French' },
              { id: 'de', flag: 'https://flagcdn.com/de.svg', name: 'German' }
            ].filter(lang => settings.enabledLanguages[lang.id as keyof typeof settings.enabledLanguages]).map((lang) => {
              const isActive = speechLanguage === lang.id;
              return (
                <button
                  key={lang.id}
                  onClick={() => {
                    setSpeechLanguage(lang.id as any);
                    localStorage.setItem('speech_language', lang.id);
                  }}
                  title={lang.name}
                  className={`w-7 h-7 rounded-full overflow-hidden transition-all duration-300 transform outline-none active:scale-95 ${isActive ? 'scale-110 shadow-sm border-2 border-indigo-500' : 'opacity-40 grayscale hover:opacity-80 hover:grayscale-0'}`}
                >
                  <img 
                    src={lang.flag} 
                    alt={lang.name} 
                    className="w-full h-full object-cover"
                  />
                </button>
              )
            })}
          </div>
          <input
            type="text"
            placeholder={`Type anything in ${speechLanguage === 'en' ? 'English' : speechLanguage === 'es' ? 'Spanish' : speechLanguage === 'fr' ? 'French' : speechLanguage === 'de' ? 'German' : 'Russian'}...`}
            className="flex-1 bg-transparent w-full min-w-0 text-slate-100 text-sm focus:outline-none placeholder-slate-500 font-medium px-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                const val = e.currentTarget.value.trim();
                processInput(val);
                e.currentTarget.value = '';
              }
            }}
          />
          <button
            onClick={(e) => {
              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
              if (input && input.value.trim()) {
                processInput(input.value.trim());
                input.value = '';
              }
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-2xl transition-colors cursor-pointer"
          >
            Translate
          </button>
        </div>
      )}

      {!recording && !loading && phrases && phrases.length > 0 && settings.showRecentPhrases && (
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 px-1">Recent</h3>
          <div className="flex flex-col gap-2 overflow-hidden">
            <AnimatePresence>
              {phrases.slice(0, 5).filter(p => !hiddenRecents[p.id]).map((phrase) => (
                <motion.div
                  key={phrase.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, x: -100 }}
                  className="relative rounded-2xl overflow-hidden"
                >
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center shadow-sm w-full gap-3">
                    <div 
                      className="flex-1 cursor-pointer flex flex-col gap-1"
                      onClick={() => playAudio(phrase.russianPhrase, phrase.targetLang || 'ru')}
                    >
                      <div className="flex items-center gap-2">
                        <img src={LANGUAGE_FLAGS[phrase.targetLang || 'ru']} alt={phrase.targetLang} className="w-3.5 h-3.5 object-cover rounded shadow-sm opacity-80" />
                        <p className="text-lg font-bold text-slate-100">{phrase.russianPhrase}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <img src={LANGUAGE_FLAGS['en']} alt="en" className="w-3.5 h-3.5 object-cover rounded shadow-sm opacity-60" />
                        <p className="text-sm text-slate-400 font-medium">{phrase.englishPhrase}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        onClick={() => playAudio(phrase.russianPhrase, phrase.targetLang || 'ru')} 
                        disabled={playingAudio} 
                        className="text-indigo-400 p-2.5 bg-indigo-900/30 hover:bg-indigo-900/50 rounded-full transition-colors pointer-events-auto outline-none active:scale-95"
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => {
                          setHiddenRecents(prev => ({ ...prev, [phrase.id]: true }));
                          deletePhrase(phrase.id);
                        }}
                        className="text-red-400 p-2.5 bg-red-900/20 hover:bg-red-900/40 rounded-full transition-colors pointer-events-auto outline-none active:scale-95"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
