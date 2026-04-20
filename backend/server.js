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
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// Import controllers
const analyzeController = require('./controllers/analyzeController');

// Initialize Firebase
const firebaseService = require('./services/firebaseDB');
firebaseService.initializeFirebase().catch(err => {
  console.warn('[Server] Firebase init warning:', err.message);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Backend service is running', timestamp: new Date().toISOString() });
});

// API Routes
app.post('/api/analyze', async (req, res) => {
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

app.get('/api/db-stats', (req, res) => {
  try {
    const stats = firebaseService.getMemoryDBStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/health`);
});
