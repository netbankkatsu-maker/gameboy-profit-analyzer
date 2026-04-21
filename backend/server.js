const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Firebase Admin (will configure in Phase 4)
// const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Allow: localhost dev, Chrome extension, and any Vercel/custom production domain
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:3001', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, extensions, server-to-server)
    if (!origin) return callback(null, true);
    // Allow if origin matches any configured domain or is a Vercel/localhost URL
    const ok = allowedOrigins.some(o => origin === o || o === '*') ||
                /\.vercel\.app$/.test(origin) ||
                /chrome-extension:\/\//.test(origin) ||
                /^http:\/\/localhost/.test(origin);
    callback(ok ? null : new Error('CORS blocked'), ok);
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb', charset: 'utf8' }));
app.use(express.urlencoded({ limit: '50mb', extended: true, charset: 'utf8' }));

// Set UTF-8 charset for all responses
app.use((req, res, next) => {
  res.charset = 'utf-8';
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// API Key authentication middleware (optional for development)
const apiKeyAuth = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    const validKey = process.env.API_KEY;

    if (!apiKey || apiKey !== validKey) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
    }
  }
  next();
};

// Import controllers
const analyzeController = require('./controllers/analyzeController');
const { scrapeFrilListings } = require('./services/frilScraper');
const { warmupOCR } = require('./services/imageRecognition');

// Initialize Firebase
const firebaseService = require('./services/firebaseDB');
const { seedMemoryDB } = require('./seed');

firebaseService.initializeFirebase().then(() => {
  if (!firebaseService.memoryDB) return;
  seedMemoryDB(firebaseService.memoryDB);
}).catch(err => {
  console.warn('[Server] Firebase init warning:', err.message);
});

// Warm up OCR engine in background (non-blocking)
warmupOCR();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Backend service is running', timestamp: new Date().toISOString() });
});

// API Routes
app.post('/api/analyze', apiKeyAuth, async (req, res) => {
  try {
    const result = await analyzeController.analyzeGameboyListing(req.body);
    res.json(result);
  } catch (error) {
    console.error('[Server] Error in /api/analyze:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/mercari-price', async (req, res) => {
  try {
    const { gameName } = req.query;
    if (!gameName) {
      return res.status(400).json({ error: 'gameName query parameter required' });
    }

    const mercariService = require('./services/mercariScraper');
    const priceData = await mercariService.getGamePrice(gameName);
    res.json(priceData);
  } catch (error) {
    console.error('[Server] Error in /api/mercari-price:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/listings', async (req, res) => {
  try {
    const limit = req.query.limit || 50;
    const listings = await firebaseService.getListings(parseInt(limit));
    res.json({ listings });
  } catch (error) {
    console.error('[Server] Error in /api/listings:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const days = req.query.days || 30;
    const stats = await firebaseService.getProfitStats(parseInt(days));
    res.json(stats || {
      totalAnalyzed: 0,
      totalProfit: 0,
      averageProfitPerListing: 0,
      averageProfitMargin: 0
    });
  } catch (error) {
    console.error('[Server] Error in /api/stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Yahoo Fril scan endpoint ───────────────────────────────────
// Scrapes real Fril listings then runs full analysis pipeline on each
app.post('/api/scan-fril', async (req, res) => {
  // Stream progress back as newline-delimited JSON
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  const send = (obj) => res.write(JSON.stringify(obj) + '\n');

  try {
    send({ stage: 'scraping', message: 'Yahoo Fril をスキャン中...' });
    const maxListings = parseInt(req.query.max) || 10;
    const listings = await scrapeFrilListings(maxListings);

    if (listings.length === 0) {
      send({ stage: 'done', success: false, message: 'Fril から出品が取得できませんでした。ネットワークを確認してください。' });
      return res.end();
    }

    send({ stage: 'analyzing', message: `${listings.length}件の出品を分析中...`, total: listings.length });

    const results = [];
    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      send({ stage: 'analyzing', current: i + 1, total: listings.length, yahooId: listing.itemId });
      try {
        const result = await analyzeController.analyzeGameboyListing({
          yahooId: listing.itemId,
          title: listing.title,
          askingPrice: listing.price,
          imageUrls: listing.imageUrls,
          listingUrl: listing.url,
          createdAt: new Date().toISOString(),
        });
        results.push(result);
      } catch (err) {
        console.error(`[scan-fril] Error analyzing ${listing.itemId}:`, err.message);
      }
    }

    send({ stage: 'done', success: true, analyzed: results.length, total: listings.length });
  } catch (err) {
    console.error('[scan-fril] Fatal:', err.message);
    send({ stage: 'error', message: err.message });
  }
  res.end();
});

// Re-seed demo data (clears existing in-memory records first)
app.post('/api/seed', (req, res) => {
  try {
    const mdb = firebaseService.memoryDB;
    mdb.yahooFrilListings.length = 0;
    mdb.recognizedGames.length = 0;
    mdb.profitAnalysis.length = 0;
    seedMemoryDB(mdb);
    res.json({ ok: true, message: `Seeded ${mdb.yahooFrilListings.length} listings` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/db-stats', (req, res) => {
  try {
    const stats = firebaseService.getMemoryDBStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Extension popup preview (Chrome API mocked)
app.get('/extension-preview', (req, res) => {
  const fs = require('fs');
  const popupHtmlPath = require('path').join(__dirname, '../extension/popup.html');
  const popupJsPath  = require('path').join(__dirname, '../extension/popup.js');
  const popupHtml = fs.readFileSync(popupHtmlPath, 'utf-8');
  const popupJs   = fs.readFileSync(popupJsPath,   'utf-8');

  // Inject Chrome API mock before popup.js runs
  const chromeMock = `
<script>
window.chrome = {
  storage: { local: {
    get: function(keys, cb) {
      var data = {
        analysisHistory: [
          { title: 'ゲームボーイソフト 10本セット', estimatedProfit: 20900 },
          { title: 'GBAソフト まとめ売り 7本', estimatedProfit: 16400 },
          { title: 'ゲームボーイカラー 15本', estimatedProfit: 22900 }
        ],
        lastRunAt: new Date(Date.now() - 3*3600*1000).toISOString(),
        isRunning: false
      };
      if (typeof cb === 'function') cb(data);
      else return Promise.resolve(data);
    }
  }},
  runtime: {
    sendMessage: function(msg) {
      return new Promise(function(resolve) {
        setTimeout(function(){ resolve({ success: true }); }, 1200);
      });
    }
  },
  tabs: { create: function(opts) { window.open(opts.url, '_blank'); } }
};
</script>`;

  // Replace <script src="popup.js"></script> with inline version + mock
  const preview = popupHtml
    .replace('<script src="popup.js"></script>',
             chromeMock + '<script>' + popupJs + '</script>');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(preview);
});

// Serve extension static files
app.use('/extension', require('express').static(
  require('path').join(__dirname, '../extension')
));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server (local dev only; Vercel uses module.exports)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/health`);
  });
}

module.exports = app;
