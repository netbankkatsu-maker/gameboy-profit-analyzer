/**
 * Seed realistic demo data into the in-memory DB.
 * Called on server start so the dashboard shows meaningful numbers.
 */

const { v4: uuidv4 } = require('uuid');

// Realistic Game Boy bundle listings with analysed profit data
const DEMO_LISTINGS = [
  {
    yahooId: 'fril-demo-001',
    title: 'ゲームボーイソフト まとめ売り 10本 ポケモン赤青他',
    askingPrice: 3500,
    imageUrls: [
      'https://stat.ameba.jp/user_images/sample-gameboy-bundle-01.jpg'
    ],
    listingUrl: 'https://fril.jp/item/demo001',
    games: [
      { gameName: 'ポケットモンスター赤', confidence: 0.94, averagePrice: 8500, priceRange: { min: 6000, max: 12000 } },
      { gameName: 'ポケットモンスター青', confidence: 0.91, averagePrice: 8200, priceRange: { min: 5800, max: 11500 } },
      { gameName: 'テトリス', confidence: 0.97, averagePrice: 3200, priceRange: { min: 2000, max: 4500 } },
      { gameName: 'スーパーマリオランド', confidence: 0.89, averagePrice: 4500, priceRange: { min: 3000, max: 6500 } }
    ]
  },
  {
    yahooId: 'fril-demo-002',
    title: 'ゲームボーイアドバンス ソフト 7本セット レトロゲーム',
    askingPrice: 2800,
    imageUrls: [
      'https://stat.ameba.jp/user_images/sample-gameboy-bundle-02.jpg'
    ],
    listingUrl: 'https://fril.jp/item/demo002',
    games: [
      { gameName: 'ゼルダの伝説', confidence: 0.88, averagePrice: 9800, priceRange: { min: 7000, max: 14000 } },
      { gameName: 'ドンキーコング', confidence: 0.85, averagePrice: 5600, priceRange: { min: 3500, max: 8000 } },
      { gameName: 'ボンバーマン', confidence: 0.82, averagePrice: 3800, priceRange: { min: 2500, max: 5500 } }
    ]
  },
  {
    yahooId: 'fril-demo-003',
    title: 'ゲームボーイカラー ソフト大量 15本 まとめて',
    askingPrice: 4200,
    imageUrls: [
      'https://stat.ameba.jp/user_images/sample-gameboy-bundle-03.jpg'
    ],
    listingUrl: 'https://fril.jp/item/demo003',
    games: [
      { gameName: 'ポケットモンスター金', confidence: 0.93, averagePrice: 9200, priceRange: { min: 7000, max: 13000 } },
      { gameName: 'メトロイド', confidence: 0.79, averagePrice: 7400, priceRange: { min: 5000, max: 11000 } },
      { gameName: 'パックマン', confidence: 0.90, averagePrice: 2800, priceRange: { min: 1800, max: 4000 } },
      { gameName: 'テトリス', confidence: 0.96, averagePrice: 3200, priceRange: { min: 2000, max: 4500 } },
      { gameName: 'スーパーマリオランド', confidence: 0.87, averagePrice: 4500, priceRange: { min: 3000, max: 6500 } }
    ]
  },
  {
    yahooId: 'fril-demo-004',
    title: 'GBソフト 5本 ゼルダ ポケモン レア品あり',
    askingPrice: 5000,
    imageUrls: [
      'https://stat.ameba.jp/user_images/sample-gameboy-bundle-04.jpg'
    ],
    listingUrl: 'https://fril.jp/item/demo004',
    games: [
      { gameName: 'ゼルダの伝説', confidence: 0.92, averagePrice: 9800, priceRange: { min: 7000, max: 14000 } },
      { gameName: 'ポケットモンスター赤', confidence: 0.88, averagePrice: 8500, priceRange: { min: 6000, max: 12000 } }
    ]
  },
  {
    yahooId: 'fril-demo-005',
    title: 'ゲームボーイ 動作未確認 ソフト 20本 ジャンク扱い',
    askingPrice: 1500,
    imageUrls: [
      'https://stat.ameba.jp/user_images/sample-gameboy-bundle-05.jpg'
    ],
    listingUrl: 'https://fril.jp/item/demo005',
    games: [
      { gameName: 'テトリス', confidence: 0.95, averagePrice: 3200, priceRange: { min: 2000, max: 4500 } },
      { gameName: 'ドンキーコング', confidence: 0.83, averagePrice: 5600, priceRange: { min: 3500, max: 8000 } },
      { gameName: 'パックマン', confidence: 0.88, averagePrice: 2800, priceRange: { min: 1800, max: 4000 } },
      { gameName: 'ボンバーマン', confidence: 0.80, averagePrice: 3800, priceRange: { min: 2500, max: 5500 } },
      { gameName: 'メトロイド', confidence: 0.75, averagePrice: 7400, priceRange: { min: 5000, max: 11000 } }
    ]
  }
];

function buildSeedRecords() {
  const now = Date.now();
  const listings = [];
  const recognizedGames = [];
  const profitAnalysis = [];

  DEMO_LISTINGS.forEach((demo, index) => {
    const id = uuidv4();
    // Spread across past 7 days so the trend chart has multi-day data
    const daysTable = [6, 4, 3, 1, 0];
    const daysAgo = daysTable[index] !== undefined ? daysTable[index] : index;
    const createdAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    // Listing record
    listings.push({
      id,
      yahooId: demo.yahooId,
      title: demo.title,
      askingPrice: demo.askingPrice,
      imageUrls: demo.imageUrls,
      listingUrl: demo.listingUrl,
      analyzed: true,
      analyzedAt: createdAt,
      createdAt,
      updatedAt: createdAt
    });

    // Recognized games
    demo.games.forEach(g => {
      recognizedGames.push({
        id: uuidv4(),
        listingId: demo.yahooId,
        gameName: g.gameName,
        confidence: g.confidence,
        averagePrice: g.averagePrice,
        priceRange: g.priceRange,
        recognizedAt: createdAt
      });
    });

    // Profit analysis
    const estimatedIndividualValue = demo.games.reduce((s, g) => s + g.averagePrice, 0);
    const estimatedProfit = Math.max(0, estimatedIndividualValue - demo.askingPrice);
    const profitMargin = demo.askingPrice > 0
      ? parseFloat(((estimatedProfit / demo.askingPrice) * 100).toFixed(1))
      : 0;

    profitAnalysis.push({
      id: uuidv4(),
      listingId: demo.yahooId,
      totalAskingPrice: demo.askingPrice,
      gamesCount: demo.games.length,
      estimatedIndividualValue,
      estimatedProfit,
      profitMargin,
      details: demo.games,
      createdAt
    });
  });

  return { listings, recognizedGames, profitAnalysis };
}

/**
 * Inject seed data directly into the memoryDB object.
 * Called from server.js at startup.
 */
function seedMemoryDB(memoryDB) {
  // Skip if already seeded
  if (memoryDB.yahooFrilListings.length > 0) return;

  const { listings, recognizedGames, profitAnalysis } = buildSeedRecords();
  memoryDB.yahooFrilListings.push(...listings);
  memoryDB.recognizedGames.push(...recognizedGames);
  memoryDB.profitAnalysis.push(...profitAnalysis);

  console.log(`[Seed] Injected ${listings.length} demo listings, ${recognizedGames.length} games, ${profitAnalysis.length} analyses`);
}

module.exports = { seedMemoryDB, buildSeedRecords };
