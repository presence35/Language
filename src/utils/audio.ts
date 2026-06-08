let currentPlaybackId = 0;
const activeAudios = new Set<HTMLAudioElement>();

export const stopAllAudio = (): void => {
  currentPlaybackId++; // Invalidate any ongoing asynchronous loads
  
  activeAudios.forEach((audio) => {
    try {
      audio.pause();
      audio.src = ""; // Stop buffering and loading completely
    } catch (e) {
      console.error("Error stopping audio:", e);
    }
  });
  activeAudios.clear();

  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.error("Error stopping voice synthesis:", e);
    }
  }
};

export const playAudioUrl = async (url: string): Promise<void> => {
  stopAllAudio();
  const myPlaybackId = currentPlaybackId;

  return new Promise((resolve) => {
    const audio = new Audio(url);
    activeAudios.add(audio);
    
    audio.onended = () => {
      activeAudios.delete(audio);
      resolve();
    };
    
    audio.onerror = () => {
      activeAudios.delete(audio);
      resolve();
    };
    
    if (myPlaybackId !== currentPlaybackId) {
      activeAudios.delete(audio);
      resolve();
      return;
    }

    audio.play().catch(e => {
      console.error("Audio play blocked:", e);
      activeAudios.delete(audio);
      resolve();
    });
  });
};

export const playAudioWithLang = async (text: string, lang: string = 'ru', slow: boolean = false): Promise<void> => {
  stopAllAudio();
  const myPlaybackId = currentPlaybackId;

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, slow, lang }),
    });
    
    // If we've been superseded by a newer click during the network fetch, stop!
    if (myPlaybackId !== currentPlaybackId) {
      return;
    }

    if (!res.ok) {
      throw new Error("Failed to fetch audio from server");
    }

    const data = await res.json();
    if (myPlaybackId !== currentPlaybackId) {
      return;
    }

    if (data.audio && data.mimeType) {
      return new Promise((resolve) => {
        const audio = new Audio(`data:${data.mimeType};base64,${data.audio}`);
        activeAudios.add(audio);
        if (slow) {
          audio.playbackRate = 0.6; // Slow down audio playback
        }
        audio.onended = () => {
          activeAudios.delete(audio);
          resolve();
        };
        audio.onerror = (e) => {
          console.error("Audio playback error:", e);
          activeAudios.delete(audio);
          if (myPlaybackId === currentPlaybackId) {
            fallbackWebSpeech(text, lang, slow).then(resolve);
          } else {
            resolve();
          }
        };
        
        if (myPlaybackId !== currentPlaybackId) {
          activeAudios.delete(audio);
          resolve();
          return;
        }

        audio.play().catch(e => {
          console.error("Audio play blocked:", e);
          activeAudios.delete(audio);
          if (myPlaybackId === currentPlaybackId) {
            fallbackWebSpeech(text, lang, slow).then(resolve);
          } else {
            resolve();
          }
        });
      });
    }
  } catch (error) {
    // Silently fallback to Web Speech API when backend is missing (e.g. static hosting)
    if (myPlaybackId === currentPlaybackId) {
      await fallbackWebSpeech(text, lang, slow);
    }
  }
};

const fallbackWebSpeech = (text: string, lang: string, slow: boolean): Promise<void> => {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }
    
    // Clear any stuck synthesis
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    if (lang === 'en') {
      utterance.lang = 'en-US';
    } else if (lang === 'es') {
      utterance.lang = 'es-ES';
    } else if (lang === 'fr') {
      utterance.lang = 'fr-FR';
    } else if (lang === 'de') {
      utterance.lang = 'de-DE';
    } else {
      utterance.lang = 'ru-RU';
    }
    
    // Set to slower rate if needed
    if (slow) {
      utterance.rate = 0.5;
    } else {
      utterance.rate = 0.9;
    }
    
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    
    window.speechSynthesis.speak(utterance);
    
    // Hard fallback timeout
    setTimeout(resolve, 8000);
  });
};

