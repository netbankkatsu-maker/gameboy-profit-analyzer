// Phase 4: Firebase Database Service
// Supports both Firebase Admin SDK and in-memory fallback for testing

const { v4: uuidv4 } = require('uuid');

let db = null;
let isFirebaseMode = false;

// In-memory database fallback (for testing/development)
const memoryDB = {
  yahooFrilListings: [],
  recognizedGames: [],
  profitAnalysis: []
};

/**
 * Initialize Firebase connection
 */
async function initializeFirebase() {
  try {
    const firebaseKeyPath = process.env.FIREBASE_KEY_PATH;

    if (firebaseKeyPath) {
      const admin = require('firebase-admin');
      const serviceAccount = require(firebaseKeyPath);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });

      db = admin.firestore();
      isFirebaseMode = true;
      console.log('[Firebase] Connected to Firebase Firestore');
    } else {
      console.log('[Firebase] Using in-memory database for development');
      isFirebaseMode = false;
    }

    return true;
  } catch (error) {
    console.warn('[Firebase] Firebase initialization failed, using in-memory DB:', error.message);
    isFirebaseMode = false;
    return true;
  }
}

/**
 * Save listing to Firebase / Memory DB
 * Collection: yahooFrilListings
 */
async function saveListing(listingData) {
  try {
    const id = uuidv4();
    const record = {
      id,
      ...listingData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log(`[Firebase] Saving listing: ${listingData.yahooId}`);

    if (isFirebaseMode && db) {
      const ref = await db.collection('yahooFrilListings').add(record);
      return ref.id;
    } else {
      memoryDB.yahooFrilListings.push(record);
      return id;
    }
  } catch (error) {
    console.error('[Firebase] Error saving listing:', error);
    throw error;
  }
}

/**
 * Save recognized games to Firebase / Memory DB
 * Collection: recognizedGames
 */
async function saveRecognizedGames(listingId, games) {
  try {
    console.log(`[Firebase] Saving ${games.length} recognized games for listing ${listingId}`);

    const gameRecords = games.map(game => ({
      id: uuidv4(),
      listingId,
      gameName: game.gameName,
      confidence: game.confidence,
      averagePrice: game.averagePrice,
      priceRange: game.priceRange,
      recognizedAt: new Date().toISOString()
    }));

    if (isFirebaseMode && db) {
      const batch = db.batch();
      for (const gameRecord of gameRecords) {
        const ref = db.collection('recognizedGames').doc();
        batch.set(ref, gameRecord);
      }
      await batch.commit();
    } else {
      memoryDB.recognizedGames.push(...gameRecords);
    }

    return games.length;
  } catch (error) {
    console.error('[Firebase] Error saving games:', error);
    throw error;
  }
}

/**
 * Save profit analysis to Firebase / Memory DB
 * Collection: profitAnalysis
 */
async function saveProfitAnalysis(listingId, analysisData) {
  try {
    const id = uuidv4();
    const record = {
      id,
      listingId,
      ...analysisData,
      createdAt: new Date().toISOString()
    };

    console.log(`[Firebase] Saving profit analysis for listing ${listingId}`);

    if (isFirebaseMode && db) {
      const ref = await db.collection('profitAnalysis').add(record);
      return ref.id;
    } else {
      memoryDB.profitAnalysis.push(record);
      return id;
    }
  } catch (error) {
    console.error('[Firebase] Error saving analysis:', error);
    throw error;
  }
}

/**
 * Fetch all listings from Firebase / Memory DB
 */
async function getListings(limit = 50) {
  try {
    console.log(`[Firebase] Fetching listings (limit: ${limit})`);

    let listings = [];

    if (isFirebaseMode && db) {
      const snapshot = await db.collection('yahooFrilListings')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      listings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } else {
      listings = memoryDB.yahooFrilListings
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);
    }

    return listings;
  } catch (error) {
    console.error('[Firebase] Error fetching listings:', error);
    throw error;
  }
}

/**
 * Get profit statistics
 */
async function getProfitStats(days = 30) {
  try {
    console.log(`[Firebase] Calculating profit stats for last ${days} days`);

    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let analyses = [];

    if (isFirebaseMode && db) {
      const snapshot = await db.collection('profitAnalysis')
        .where('createdAt', '>=', sinceDate.toISOString())
        .get();

      analyses = snapshot.docs.map(doc => doc.data());
    } else {
      analyses = memoryDB.profitAnalysis.filter(
        a => new Date(a.createdAt) >= sinceDate
      );
    }

    const stats = {
      totalAnalyzed: analyses.length,
      totalProfit: 0,
      totalIndividualValue: 0,
      averageProfitPerListing: 0,
      averageProfitMargin: 0
    };

    analyses.forEach(analysis => {
      stats.totalProfit += analysis.estimatedProfit || 0;
      stats.totalIndividualValue += analysis.estimatedIndividualValue || 0;
    });

    if (analyses.length > 0) {
      stats.averageProfitPerListing = Math.round(stats.totalProfit / analyses.length);
      const avgAskingPrice = analyses.reduce((sum, a) => sum + a.totalAskingPrice, 0) / analyses.length;
      stats.averageProfitMargin = avgAskingPrice > 0 ? ((stats.averageProfitPerListing / avgAskingPrice) * 100).toFixed(1) : 0;
    }

    return stats;
  } catch (error) {
    console.error('[Firebase] Error calculating stats:', error);
    throw error;
  }
}

/**
 * Get in-memory database stats (for testing)
 */
function getMemoryDBStats() {
  return {
    yahooFrilListings: memoryDB.yahooFrilListings.length,
    recognizedGames: memoryDB.recognizedGames.length,
    profitAnalysis: memoryDB.profitAnalysis.length,
    mode: isFirebaseMode ? 'Firebase' : 'In-Memory'
  };
}

module.exports = {
  initializeFirebase,
  saveListing,
  saveRecognizedGames,
  saveProfitAnalysis,
  getListings,
  getProfitStats,
  getMemoryDBStats
};
