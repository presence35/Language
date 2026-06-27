import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // TTS proxy via unauthenticated Google Translate API to bypass Free Tier limits
  app.post('/apps/language/api/tts', async (req, res) => {
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Determine directory in a way that works for both ESM (tsx) and CJS (esbuild output)
    const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
    // When running from dist/server.cjs, __dirname is the dist folder. 
    // If it's the dist folder, use it. Otherwise, assume we are at root and use dist/.
    const isDist = currentDir.endsWith('dist') || currentDir.endsWith('dist/') || currentDir.endsWith('dist\\');
    const distPath = isDist ? currentDir : path.join(currentDir, 'dist');

    // Serve static assets without base paths affecting fallback routes
    app.use('/apps/language', express.static(distPath)); // In case they use /language prefix
    app.use(express.static(distPath));
    
    app.use('/server.cjs', (req, res) => res.status(404).send('Not found'));
    app.use('/server.cjs.map', (req, res) => res.status(404).send('Not found'));
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
