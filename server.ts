import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // TTS proxy via unauthenticated Google Translate API to bypass Free Tier limits
  app.post('/api/tts', async (req, res) => {
    try {
      const { text, lang = 'ru' } = req.body;
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(text)}`;
      
      const response = await fetch(url, {
         headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
         }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch from TTS service');
      }

      const buffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(buffer).toString('base64');
      res.json({ audio: base64Audio, mimeType: 'audio/mpeg' });
    } catch (error) {
      console.error('Error generating audio:', error);
      res.status(500).json({ error: 'Failed to generate audio' });
    }
  });

  // STT proxy via Gemini API (handles audio blobs)
  app.post('/api/stt', async (req, res) => {
    try {
      const { audioBase64, mimeType, lang } = req.body;
      if (!audioBase64) return res.status(400).json({ error: 'No audio provided' });

      // Only init when needed so it doesn't crash if env var is missing during start
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
             role: 'user',
             parts: [
               { inlineData: { data: audioBase64, mimeType: mimeType || 'audio/webm' } },
               { text: `Transcribe this audio precisely. DO NOT TRANSLATE IT. Only output the transcription text in the original language (${lang === 'es' ? 'Spanish' : lang === 'fr' ? 'French' : lang === 'de' ? 'German' : lang === 'ru' ? 'Russian' : 'English'}). If no speech, return nothing.` }
             ]
          }
        ]
      });

      const transcript = response.text?.trim() || "";
      res.json({ transcript });
    } catch (error) {
      console.error('Error in STT:', error);
      res.status(500).json({ error: 'STT Failed' });
    }
  });


  // Combined STT + translation via Gemini
  app.post('/api/translate', async (req, res) => {
    try {
      const { audioBase64, mimeType, lang, targetLang } = req.body;
      if (!audioBase64) return res.status(400).json({ error: 'No audio provided' });
      if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const sourceLabel = lang === 'en' ? 'English' : lang === 'es' ? 'Spanish' : lang === 'fr' ? 'French' : lang === 'de' ? 'German' : 'Russian';
      const targetLabel = targetLang === 'en' ? 'English' : targetLang === 'es' ? 'Spanish' : targetLang === 'fr' ? 'French' : targetLang === 'de' ? 'German' : 'Russian';

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { data: audioBase64, mimeType: mimeType || 'audio/webm' } },
              { text: `Transcribe this audio precisely in ${sourceLabel}. Then translate it to ${targetLabel}. Respond ONLY with valid JSON like: {"transcription":"...","translation":"...","detectedLanguage":"${lang}"}` }
            ]
          }
        ]
      });

      const raw = response.text?.trim() || "";
      // Extract JSON from the response (Gemini sometimes wraps in markdown)
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : { transcription: raw, translation: "", detectedLanguage: lang };
      res.json(data);
    } catch (error) {
      console.error('Error in /api/translate:', error);
      res.status(500).json({ error: 'Translation failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use('/server.cjs', (req, res) => res.status(404).send('Not found'));
    app.use('/server.cjs.map', (req, res) => res.status(404).send('Not found'));
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
