// Phase 3: Mercari Scraper Service
// Currently returns mock data - will implement Puppeteer scraping in Phase 3

const mercariPriceCache = new Map();

/**
 * Get average price and history for a game title
 * @param {string} gameTitle - Game title to search for
 * @returns {Promise<Object>} Price data including average and history
 */
async function getGamePrice(gameTitle) {
  try {
    console.log(`[MercariScraper] Fetching price for: ${gameTitle}`);

    // Check cache first
    if (mercariPriceCache.has(gameTitle)) {
      console.log(`[MercariScraper] Cache hit for ${gameTitle}`);
      return mercariPriceCache.get(gameTitle);
    }

    // TODO: Phase 3
    // 1. Launch Puppeteer browser
    // 2. Navigate to Mercari search: https://jp.mercari.com/search?keyword={gameTitle}
    // 3. Extract sold listings
    // 4. Parse prices from completed sales
    // 5. Calculate average and statistics

    // Mock implementation for now
    const mockPrice = {
      gameTitle,
      lastFetchedAt: new Date().toISOString(),
      averagePrice: Math.floor(Math.random() * 5000) + 5000, // 5000-10000
      priceRange: {
        min: 4500,
        max: 12000
      },
      recentPrices: [
        { soldDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), price: 8500 },
        { soldDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), price: 8200 },
        { soldDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), price: 8800 }
      ]
    };

    // Cache for 24 hours
    mercariPriceCache.set(gameTitle, mockPrice);

    return mockPrice;
  } catch (error) {
    console.error('[MercariScraper] Error:', error);
    throw error;
  }
}

/**
 * Scrape a single Mercari search page
 * To be implemented in Phase 3 with Puppeteer
 */
async function scrapeMercariPage(keyword) {
  try {
    // TODO: Phase 3 - Puppeteer implementation
    // const puppeteer = require('puppeteer');
    // const browser = await puppeteer.launch();
    // const page = await browser.newPage();
    // await page.goto(`https://jp.mercari.com/search?keyword=${encodeURIComponent(keyword)}`);
    // // Extract prices from sold items
    // const prices = await page.$$eval('.price', elements => elements.map(el => parseInt(el.textContent)));
    // await browser.close();
    // return prices;

    console.log('[MercariScraper] Scraping - Phase 3 placeholder');
    return [];
  } catch (error) {
    console.error('[MercariScraper] Scrape error:', error);
    throw error;
  }
}

/**
 * Clear cache (useful for testing)
 */
function clearCache() {
  mercariPriceCache.clear();
}

module.exports = {
  getGamePrice,
  scrapeMercariPage,
  clearCache
};
