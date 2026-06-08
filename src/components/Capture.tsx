import React, { useState, useRef, useEffect } from 'react';
import { useStorage } from '../hooks/useStorage';
import { Mic, Loader2, BookmarkPlus, Volume2, PlayCircle, X, Check, Trash2, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playAudioWithLang, playAudioUrl } from '../utils/audio';
import { LANGUAGE_FLAGS } from '../utils/language';

interface TranslationResult {
  id: string;
  transcription: string;
  russianPhrase: string;
  englishPhrase: string;
  sourceLanguage: 'en' | 'ru' | 'es';
  targetLanguage: 'en' | 'ru' | 'es';
  wordBreakdown: any[];
  audioUrl?: string | null;
  timestamp: number;
}

interface Animal {
  id: string;
  nameEn: string;
  nameRu: string;
  bgClass: string;
  borderClass: string;
  recordingBg: string;
  pulseColor: string;
  svg: React.ReactNode;
}

const ANIMALS: Animal[] = [
  {
    id: 'bunny',
    nameEn: 'Bunny',
    nameRu: 'Зайчик',
    bgClass: 'bg-pink-50 hover:bg-pink-100',
    borderClass: 'border-pink-200',
    recordingBg: 'bg-pink-500',
    pulseColor: 'rgba(244, 114, 182, 0.4)',
    svg: (
      <svg viewBox="0 0 100 100" className="w-16 h-16 transform transition-transform hover:scale-105">
        <ellipse cx="38" cy="25" rx="8" ry="22" fill="#FCE7F3" stroke="#F472B6" strokeWidth="3" />
        <ellipse cx="38" cy="25" rx="4" ry="15" fill="#F472B6" />
        <ellipse cx="62" cy="25" rx="8" ry="22" fill="#FCE7F3" stroke="#F472B6" strokeWidth="3" />
        <ellipse cx="62" cy="25" rx="4" ry="15" fill="#F472B6" />
        <circle cx="50" cy="65" r="24" fill="#FFFFFF" stroke="#F472B6" strokeWidth="3" />
        <circle cx="36" cy="68" r="4" fill="#F472B6" opacity="0.6" />
        <circle cx="64" cy="68" r="4" fill="#F472B6" opacity="0.6" />
        <circle cx="42" cy="60" r="3.5" fill="#1F2937" />
        <circle cx="58" cy="60" r="3.5" fill="#1F2937" />
        <circle cx="43" cy="59" r="1" fill="#FFFFFF" />
        <circle cx="59" cy="59" r="1" fill="#FFFFFF" />
        <polygon points="50,66, 47,63, 53,63" fill="#F472B6" />
        <path d="M 47 69 Q 50 72 53 69" fill="none" stroke="#F472B6" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'elephant',
    nameEn: 'Elephant',
    nameRu: 'Слонёнок',
    bgClass: 'bg-sky-50 hover:bg-sky-100',
    borderClass: 'border-sky-200',
    recordingBg: 'bg-sky-500',
    pulseColor: 'rgba(56, 189, 248, 0.4)',
    svg: (
      <svg viewBox="0 0 100 100" className="w-16 h-16 transform transition-transform hover:scale-105">
        <ellipse cx="23" cy="50" rx="16" ry="18" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="3" />
        <ellipse cx="23" cy="50" rx="10" ry="11" fill="#BAE6FD" />
        <ellipse cx="77" cy="50" rx="16" ry="18" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="3" />
        <ellipse cx="77" cy="50" rx="10" ry="11" fill="#BAE6FD" />
        <circle cx="50" cy="52" r="22" fill="#F0F9FF" stroke="#38BDF8" strokeWidth="3" />
        <circle cx="38" cy="58" r="3" fill="#FDA4AF" opacity="0.6" />
        <circle cx="62" cy="58" r="3" fill="#FDA4AF" opacity="0.6" />
        <circle cx="42" cy="48" r="3.5" fill="#1F2937" />
        <circle cx="58" cy="48" r="3.5" fill="#1F2937" />
        <circle cx="43" cy="47" r="1" fill="#FFFFFF" />
        <circle cx="59" cy="47" r="1" fill="#FFFFFF" />
        <path d="M 50 56 Q 50 72 58 70 Q 61 68 59 66 Q 54 67 53 56" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="3.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'puppy',
    nameEn: 'Puppy',
    nameRu: 'Собачка',
    bgClass: 'bg-amber-50 hover:bg-amber-100',
    borderClass: 'border-amber-200',
    recordingBg: 'bg-amber-500',
    pulseColor: 'rgba(245, 158, 11, 0.4)',
    svg: (
      <svg viewBox="0 0 100 100" className="w-16 h-16 transform transition-transform hover:scale-105">
        <circle cx="50" cy="55" r="22" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="3" />
        <path d="M 22 42 Q 12 50 18 68 Q 28 68 28 48 Z" fill="#F59E0B" stroke="#D97706" strokeWidth="2.5" />
        <path d="M 78 42 Q 88 50 82 68 Q 72 68 72 48 Z" fill="#F59E0B" stroke="#D97706" strokeWidth="2.5" />
        <circle cx="36" cy="62" r="3" fill="#F87171" opacity="0.5" />
        <circle cx="64" cy="62" r="3" fill="#F87171" opacity="0.5" />
        <circle cx="40" cy="50" r="3.5" fill="#1F2937" />
        <circle cx="60" cy="50" r="3.5" fill="#1F2937" />
        <circle cx="41" cy="49" r="1" fill="#FFFFFF" />
        <circle cx="61" cy="49" r="1" fill="#FFFFFF" />
        <ellipse cx="50" cy="62" rx="7" ry="5" fill="#FFFBEB" stroke="#F59E0B" strokeWidth="2" />
        <ellipse cx="50" cy="59" rx="3.5" ry="2.5" fill="#1F2937" />
        <path d="M 47 64 Q 50 67 53 64" fill="none" stroke="#1F2937" strokeWidth="2.5" />
        <path d="M 48 64 Q 50 72 52 64 Z" fill="#EF4444" />
      </svg>
    ),
  },
  {
    id: 'kitten',
    nameEn: 'Kitten',
    nameRu: 'Кошечка',
    bgClass: 'bg-orange-50 hover:bg-orange-100',
    borderClass: 'border-orange-200',
    recordingBg: 'bg-orange-500',
    pulseColor: 'rgba(249, 115, 22, 0.4)',
    svg: (
      <svg viewBox="0 0 100 100" className="w-16 h-16 transform transition-transform hover:scale-105">
        <polygon points="26,45 15,18 42,34" fill="#FFEDD5" stroke="#F97316" strokeWidth="3" strokeLinejoin="round" />
        <polygon points="26,45 22,25 36,35" fill="#FED7AA" />
        <polygon points="74,45 85,18 58,34" fill="#FFEDD5" stroke="#F97316" strokeWidth="3" strokeLinejoin="round" />
        <polygon points="74,45 78,25 64,35" fill="#FED7AA" />
        <ellipse cx="50" cy="55" rx="24" ry="20" fill="#FFF7ED" stroke="#F97316" strokeWidth="3" />
        <circle cx="34" cy="62" r="3" fill="#FDA4AF" opacity="0.6" />
        <circle cx="66" cy="62" r="3" fill="#FDA4AF" opacity="0.6" />
        <ellipse cx="40" cy="48" rx="4" ry="5" fill="#10B981" />
        <ellipse cx="40" cy="48" rx="1.5" ry="4" fill="#1F2937" />
        <circle cx="39" cy="46" r="1.5" fill="#FFFFFF" />
        <ellipse cx="60" cy="48" rx="4" ry="5" fill="#10B981" />
        <ellipse cx="60" cy="48" rx="1.5" ry="4" fill="#1F2937" />
        <circle cx="59" cy="46" r="1.5" fill="#FFFFFF" />
        <polygon points="50,56 46,53 54,53" fill="#FDA4AF" />
        <path d="M 46 58 Q 50 61 54 58" fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="24" y1="58" x2="12" y2="56" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="24" y1="62" x2="10" y2="64" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="76" y1="58" x2="88" y2="56" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="76" y1="62" x2="90" y2="64" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'bear',
    nameEn: 'Bear Cub',
    nameRu: 'Мишка',
    bgClass: 'bg-stone-50 hover:bg-stone-100',
    borderClass: 'border-amber-200',
    recordingBg: 'bg-amber-700',
    pulseColor: 'rgba(180, 83, 9, 0.4)',
    svg: (
      <svg viewBox="0 0 100 100" className="w-16 h-16 transform transition-transform hover:scale-105">
        <circle cx="28" cy="35" r="10" fill="#D97706" stroke="#78350F" strokeWidth="3" />
        <circle cx="28" cy="35" r="5" fill="#FEF3C7" />
        <circle cx="72" cy="35" r="10" fill="#D97706" stroke="#78350F" strokeWidth="3" />
        <circle cx="72" cy="35" r="5" fill="#FEF3C7" />
        <circle cx="50" cy="55" r="23" fill="#B45309" stroke="#78350F" strokeWidth="3" />
        <circle cx="36" cy="62" r="3" fill="#F87171" opacity="0.4" />
        <circle cx="64" cy="62" r="3" fill="#F87171" opacity="0.4" />
        <circle cx="41" cy="48" r="3.5" fill="#1F2937" />
        <circle cx="59" cy="48" r="3.5" fill="#1F2937" />
        <circle cx="42" cy="47" r="1" fill="#FFFFFF" />
        <circle cx="60" cy="47" r="1" fill="#FFFFFF" />
        <ellipse cx="50" cy="61" rx="8" ry="6" fill="#FDE68A" />
        <ellipse cx="50" cy="58" rx="3.5" ry="2" fill="#1F2937" />
        <path d="M 47 62 Q 50 64 53 62" fill="none" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'panda',
    nameEn: 'Panda',
    nameRu: 'Панда',
    bgClass: 'bg-emerald-50 hover:bg-emerald-100',
    borderClass: 'border-emerald-200',
    recordingBg: 'bg-emerald-500',
    pulseColor: 'rgba(16, 185, 129, 0.4)',
    svg: (
      <svg viewBox="0 0 100 100" className="w-16 h-16 transform transition-transform hover:scale-105">
        <circle cx="30" cy="32" r="9" fill="#1F2937" />
        <circle cx="70" cy="32" r="9" fill="#1F2937" />
        <circle cx="50" cy="55" r="23" fill="#FFFFFF" stroke="#1F2937" strokeWidth="3" />
        <ellipse cx="40" cy="50" rx="6" ry="7" fill="#1F2937" transform="rotate(-15 40 50)" />
        <ellipse cx="60" cy="50" rx="6" ry="7" fill="#1F2937" transform="rotate(15 60 50)" />
        <circle cx="41" cy="49" r="2.5" fill="#FFFFFF" />
        <circle cx="41" cy="49" r="1" fill="#1F2937" />
        <circle cx="59" cy="49" r="2.5" fill="#FFFFFF" />
        <circle cx="59" cy="49" r="1" fill="#1F2937" />
        <circle cx="34" cy="62" r="3" fill="#F472B6" opacity="0.6" />
        <circle cx="66" cy="62" r="3" fill="#F472B6" opacity="0.6" />
        <ellipse cx="50" cy="59" rx="3" ry="1.5" fill="#1F2937" />
        <path d="M 47 62 Q 50 64 53 62" fill="none" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function Capture() {
  const { addPhrase, phrases, deletePhrase, settings } = useStorage();
  const [loading, setLoading] = useState(false);
  
  const [resultsHistory, setResultsHistory] = useState<TranslationResult[]>(() => {
    try {
      const stored = localStorage.getItem('resultsHistory');
      if (stored) return JSON.parse(stored);
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const canceledRef = useRef<boolean>(false);
  const recordingTimeoutRef = useRef<any>(null);
  
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const localRecognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (localRecognitionRef.current) {
        localRecognitionRef.current.abort();
      }
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
    };
  }, []);

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

  const processInput = async (text: string, audioUrlStr?: string | null) => {
    setLoading(true);
    try {
      const sl = speechLanguage;
      let tl: string;
      if (sl === 'en') {
        tl = settings.defaultTargetLanguage;
      } else {
        tl = 'en';
      }

      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Translation failed");

      const json = await response.json();
      const translation = json[0].map((item: any) => item[0]).join('').trim();

      const ruPhrase = sl === 'en' ? translation : text;
      const enPhrase = sl === 'en' ? text : translation;

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
        audioUrl: audioUrlStr || null,
        timestamp: Date.now()
      };

      setResultsHistory(prev => {
        const valid = prev.filter(r => Date.now() - r.timestamp < 42 * 60 * 1000);
        return [newResult, ...valid].slice(0, 5);
      });
      setHistoryIndex(0);
      setIsHistoryVisible(true);

      await playAudioWithLang(ruPhrase, sl);
    } catch (e) {
      console.error(e);
      alert('Oops! Instant translation ran into a hitch, please try again.');
    } finally {
      setLoading(false);
      setRecording(false);
      setActiveAnimal(null);
    }
  };

  const handleAnimalClick = async (animal: Animal) => {
    if (recording) {
      if (localRecognitionRef.current) {
        try { localRecognitionRef.current.stop(); } catch (e) {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
      return;
    }

    setActiveAnimal(animal);
    setRecording(true);
    canceledRef.current = false;

    if (!SpeechRecognition) {
       setRecording(false);
       setActiveAnimal(null);
       alert("Native speech recognition is not supported in this browser. Please try using Chrome for voice support.");
       return;
    }

    // Default flow: Use Web Speech API with MediaRecorder running concurrently
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = speechLanguage === 'en' ? 'en-US' : speechLanguage === 'es' ? 'es-ES' : speechLanguage === 'fr' ? 'fr-FR' : speechLanguage === 'de' ? 'de-DE' : 'ru-RU';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      let resultFired = false;
      recognition.onresult = async (event: any) => {
        resultFired = true;
        const transcript = event.results[0][0].transcript;
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (transcript) {
           await processInput(transcript);
        } else {
           setLoading(false);
           setActiveAnimal(null);
        }
      };

      recognition.onerror = (err: any) => {
        setRecording(false);
        setLoading(false);
        setActiveAnimal(null);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
      };

      recognition.onend = () => {
        setRecording(false);
        if (!resultFired) {
           setLoading(false);
           setActiveAnimal(null);
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
      };

      localRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setRecording(false);
      return;
    }

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        if (canceledRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
          if (canceledRef.current) return;
          if (audioChunksRef.current.length > 0) {
            const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            const url = URL.createObjectURL(audioBlob);
            // Link url to the latest result (which processInput just pushed)
            setTimeout(() => {
                setResultsHistory(prev => {
                    if (prev.length === 0) return prev;
                    const newArr = [...prev];
                    newArr[0] = { ...newArr[0], audioUrl: url };
                    return newArr;
                });
            }, 500); // give processInput time to state update
          }
        };
        mediaRecorder.start(200);
      }).catch(err => {
        // ignore
      });
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
      <div className="flex w-full justify-between items-center gap-1 sm:gap-2 pb-2">
        {settings.showAnimals ? ANIMALS.map((animal) => {
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
              className={`flex-1 max-w-[16%] p-1 relative rounded-xl flex flex-col items-center justify-center transition-all duration-300 transform outline-none active:scale-95 ${
                isThisRecording 
                  ? 'bg-red-50 ring-2 ring-red-300 ring-opacity-50 scale-105 shadow-md' 
                  : isThisLoading
                  ? 'bg-indigo-50 ring-2 ring-indigo-300 ring-opacity-50 scale-105 shadow-md animate-bounce'
                  : isActive
                  ? `scale-105 ${animal.bgClass}`
                  : `${animal.bgClass} opacity-95 hover:scale-105`
              } ${shouldGrayscale ? 'grayscale opacity-50 scale-95' : ''}`}
            >
              {isThisRecording && (
                <span className="absolute top-1 right-1 flex h-2.5 w-2.5 z-10">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
              )}
              
              <div className="flex-1 flex items-center justify-center pointer-events-none w-full">
                <div className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-auto">{animal.svg}</div>
              </div>
            </button>
          );
        }) : (
           <div className="flex w-full justify-center pb-4 pt-4">
              <button 
                onClick={() => handleAnimalClick(ANIMALS[0]!)}
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
                    <div className="flex flex-col gap-1 pr-8 relative">
                      <div className={`flex items-center gap-2 font-extrabold text-xs uppercase tracking-wider mb-1 ${isHistorical ? 'text-slate-500' : 'text-indigo-400'}`}>
                        <img src={LANGUAGE_FLAGS[res.sourceLanguage]} alt={res.sourceLanguage} className="w-3.5 h-3.5 object-cover rounded shadow-sm opacity-80" />
                        <span>What you said</span>
                        {res.audioUrl ? (
                          <button 
                            onClick={(e) => { e.stopPropagation(); playAudioUrl(res.audioUrl!); }}
                            className={`transition-colors flex items-center justify-center p-1 rounded w-6 h-6 shrink-0 cursor-pointer pointer-events-auto ${isHistorical ? 'text-slate-400 hover:text-slate-300 bg-slate-800/80' : 'text-indigo-400 hover:text-indigo-300 bg-indigo-900/40'}`}
                          >
                            <PlayCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                const utterance = new SpeechSynthesisUtterance(res.transcription);
                                utterance.lang = res.sourceLanguage === 'ru' ? 'ru-RU' : 'en-US';
                                window.speechSynthesis.speak(utterance);
                            }}
                            className={`transition-colors flex items-center justify-center p-1 rounded w-6 h-6 shrink-0 cursor-pointer pointer-events-auto ${isHistorical ? 'text-slate-400 hover:text-slate-300 bg-slate-800/80' : 'text-indigo-400 hover:text-indigo-300 bg-indigo-900/40'}`}
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      {res.sourceLanguage === 'ru' ? (
                         <p className={`text-2xl sm:text-3xl font-black leading-tight w-full pointer-events-auto ${isHistorical ? 'text-slate-300' : 'text-slate-100'}`}>{res.russianPhrase}</p>
                      ) : (
                         <p className={`text-lg italic font-medium w-full pointer-events-auto ${isHistorical ? 'text-slate-400' : 'text-indigo-200'}`}>"{res.transcription}"</p>
                      )}
                    </div>

                    {res.sourceLanguage === 'ru' ? (
                      <div className={`pt-4 border-t ${isHistorical ? 'border-slate-700/50' : 'border-indigo-500/20'} pointer-events-auto`}>
                         <div className="flex items-center gap-2 font-extrabold text-[10px] uppercase tracking-wider mb-2 text-slate-500">
                           <img src={LANGUAGE_FLAGS['en']} alt="en" className="w-3.5 h-3.5 object-cover rounded shadow-sm opacity-80" />
                           <span>Translation</span>
                         </div>
                         <div className="flex items-center justify-start gap-4">
                           <button 
                             onClick={(e) => { e.stopPropagation(); playAudio(res.englishPhrase, 'en') }} 
                             disabled={playingAudio} 
                             className={`p-3 rounded-full shrink-0 transition-colors shadow-sm cursor-pointer ${isHistorical ? 'text-slate-400 bg-slate-800/80 hover:bg-slate-700' : 'text-indigo-400 bg-indigo-900/50 hover:bg-indigo-800'}`}
                           >
                             <Volume2 className={`w-6 h-6 ${!isHistorical ? 'animate-pulse' : ''}`} />
                           </button>
                           <p className={`text-xl sm:text-2xl font-bold leading-tight ${isHistorical ? 'text-slate-300' : 'text-slate-100'}`}>{res.englishPhrase}</p>
                         </div>
                      </div>
                    ) : (
                      <div className={`pt-4 border-t ${isHistorical ? 'border-slate-700/50' : 'border-indigo-500/20'} pointer-events-auto`}>
                         <div className="flex items-center gap-2 font-extrabold text-[10px] uppercase tracking-wider mb-2 text-slate-500">
                           <img src={LANGUAGE_FLAGS[res.targetLanguage]} alt={res.targetLanguage} className="w-3.5 h-3.5 object-cover rounded shadow-sm opacity-80" />
                           <span>Translation</span>
                         </div>
                         <div className="flex justify-start items-center gap-4">
                           <button 
                             onClick={(e) => { e.stopPropagation(); playAudio(res.russianPhrase, res.targetLanguage) }} 
                             disabled={playingAudio} 
                             className={`p-3 rounded-full shrink-0 transition-colors shadow-sm cursor-pointer ${isHistorical ? 'text-slate-400 bg-slate-800/80 hover:bg-slate-700' : 'text-indigo-400 bg-indigo-900/50 hover:bg-indigo-800'}`}
                           >
                             <Volume2 className={`w-6 h-6 ${!isHistorical ? 'animate-pulse' : ''}`} />
                           </button>
                           <p className={`text-2xl sm:text-3xl font-black leading-tight ${isHistorical ? 'text-slate-300' : 'text-slate-100'}`}>{res.russianPhrase}</p>
                         </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 px-1 sm:px-2 mt-4 pointer-events-auto">
                      <div className="flex w-full items-center gap-2">
                        <button 
                          onClick={() => {
                            setResultsHistory(prev => prev.filter(r => r.id !== res.id));
                            const savedMatch = phrases?.find(p => p.russianPhrase.toLowerCase() === res.russianPhrase.toLowerCase());
                            if (savedMatch) deletePhrase(savedMatch.id);
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
          className={`${settings.showAnimals ? `bg-${activeAnimal.bgClass.split('bg-')[1].split(' ')[0]} border border-indigo-200` : 'bg-slate-800 border-slate-700'} p-6 rounded-3xl flex flex-col items-center space-y-4 shadow-inner transition-all duration-300 cursor-pointer mt-2`}
        >
          <div className="text-center">
            <h3 className={`${settings.showAnimals ? 'text-slate-900' : 'text-slate-100'} font-black text-xl flex items-center justify-center gap-1`}>
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
        <div className={activeAnimal && settings.showAnimals
          ? `${activeAnimal.bgClass.split(' ')[0]} ${activeAnimal.borderClass} border p-8 rounded-3xl flex flex-col items-center justify-center space-y-4 shadow-sm transition-all duration-300 animate-pulse mt-2`
          : "bg-slate-800 border border-slate-700 p-8 rounded-3xl flex flex-col items-center justify-center space-y-4 shadow-sm transition-all duration-300 animate-pulse mt-2"
        }>
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
          <h3 className={activeAnimal && settings.showAnimals ? "text-slate-900 font-black text-2xl text-center" : "text-slate-200 font-bold text-lg text-center"}>
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
