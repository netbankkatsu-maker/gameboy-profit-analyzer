const imageRecognitionService = require('../services/imageRecognition');
const mercariScraperService = require('../services/mercariScraper');
const firebaseService = require('../services/firebaseDB');

async function analyzeGameboyListing(payload) {
  const { yahooId, title, askingPrice, imageUrls, listingUrl, createdAt } = payload;

  console.log(`[Analyze] Starting analysis for listing ${yahooId}`);

  // Store listing record
  const listingRecord = {
    yahooId,
    title,
    askingPrice,
    imageUrls,
    listingUrl,
    createdAt,
    analyzed: true,
    analyzedAt: new Date().toISOString()
  };

  // Step 1: Recognize games from images
  console.log(`[Analyze] Recognizing games from ${imageUrls.length} images...`);
  const recognizedGames = [];

  for (const imageUrl of imageUrls) {
    try {
      const recognition = await imageRecognitionService.recognizeGameFromImage(imageUrl);
      recognizedGames.push(recognition);
    } catch (error) {
      console.error(`[Analyze] Error recognizing game from ${imageUrl}:`, error);
    }
  }

  if (recognizedGames.length === 0) {
    console.warn(`[Analyze] No games recognized for listing ${yahooId}`);
    return {
      yahooId,
      title,
      askingPrice,
      recognizedGames: [],
      profitAnalysis: null,
      status: 'no-games-recognized',
      message: 'Could not recognize any games from images. Manual review needed.'
    };
  }

  // Step 2: Get price data for each recognized game
  console.log(`[Analyze] Fetching price data for ${recognizedGames.length} games...`);
  const gamesPriceData = [];

  for (const game of recognizedGames) {
    if (game.confidence >= 0.7) {
      try {
        const priceData = await mercariScraperService.getGamePrice(game.name);
        gamesPriceData.push({
          gameName: game.name,
          confidence: game.confidence,
          averagePrice: priceData.averagePrice || 0,
          priceRange: priceData.priceRange || { min: 0, max: 0 }
        });
      } catch (error) {
        console.error(`[Analyze] Error fetching price for ${game.name}:`, error);
        // Continue with default values
        gamesPriceData.push({
          gameName: game.name,
          confidence: game.confidence,
          averagePrice: 0,
          priceRange: { min: 0, max: 0 }
        });
      }
    }
  }

  // Step 3: Calculate profit
  const profitAnalysis = calculateProfit(askingPrice, gamesPriceData);

  console.log(`[Analyze] Analysis complete - Estimated profit: ¥${profitAnalysis.estimatedProfit}`);

  // Step 4: Store results in Firebase (Phase 4)
  try {
    await firebaseService.saveListing(listingRecord);
    await firebaseService.saveRecognizedGames(yahooId, gamesPriceData);
    await firebaseService.saveProfitAnalysis(yahooId, profitAnalysis);
  } catch (error) {
    console.error(`[Analyze] Warning - Firebase storage failed:`, error);
    // Continue anyway, return results to extension
  }

  return {
    yahooId,
    title,
    askingPrice,
    recognizedGames: gamesPriceData,
    profitAnalysis,
    status: 'success'
  };
}

function calculateProfit(askingPrice, gamesPriceData) {
  const estimatedIndividualValue = gamesPriceData.reduce((sum, game) => {
    return sum + (game.averagePrice || 0);
  }, 0);

  const estimatedProfit = estimatedIndividualValue - askingPrice;
  const profitMargin = askingPrice > 0 ? ((estimatedProfit / askingPrice) * 100).toFixed(1) : 0;

  return {
    totalAskingPrice: askingPrice,
    gamesCount: gamesPriceData.length,
    estimatedIndividualValue,
    estimatedProfit: Math.max(0, estimatedProfit),
    profitMargin: Math.max(0, profitMargin),
    details: gamesPriceData
  };
}

module.exports = {
  analyzeGameboyListing
};
