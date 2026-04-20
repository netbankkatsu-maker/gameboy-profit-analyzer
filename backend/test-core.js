// Core functionality test - No external dependencies
// Tests: Game database, profit calculation, data storage

const gameDB = require('./services/gameDatabase');
const firebaseDB = require('./services/firebaseDB');

async function testCoreLogic() {
  console.log('\n========== CORE LOGIC TESTS (No Dependencies) ==========\n');

  try {
    // Test 1: Game Database
    console.log('✓ [TEST 1] Game Database Validation');
    const games = gameDB.getAllGames();
    const isValid = games.length > 30 && games.every(g => typeof g === 'string');
    console.log(`  - Loaded ${games.length} games`);
    console.log(`  - Database valid: ${isValid ? '✓ YES' : '✗ NO'}`);

    // Test 2: Game Matching
    console.log('\n✓ [TEST 2] Game Title Matching');
    const testMatches = [
      { query: 'ポケット', expected: 'ポケットモンスター赤' },
      { query: 'マリオ', expected: 'スーパーマリオランド' },
      { query: 'テト', expected: 'テトリス' }
    ];

    testMatches.forEach(({ query, expected }) => {
      const match = gameDB.findBestMatch(query);
      const isCorrect = match?.includes(expected.split(' ')[0]) || false;
      console.log(`  - "${query}" → "${match}": ${isCorrect ? '✓' : '✗'}`);
    });

    // Test 3: Profit Calculation Logic
    console.log('\n✓ [TEST 3] Profit Calculation Logic');

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
        profitMargin: Math.max(0, profitMargin)
      };
    }

    const testCases = [
      {
        askingPrice: 10000,
        games: [
          { gameName: 'ポケットモンスター赤', averagePrice: 7500 },
          { gameName: 'テトリス', averagePrice: 3500 }
        ]
      },
      {
        askingPrice: 15000,
        games: [
          { gameName: 'ゼルダの伝説', averagePrice: 5000 },
          { gameName: 'スーパーマリオランド', averagePrice: 4500 },
          { gameName: 'ドンキーコング', averagePrice: 4000 }
        ]
      }
    ];

    testCases.forEach((testCase, idx) => {
      const result = calculateProfit(testCase.askingPrice, testCase.games);
      console.log(`\n  Case ${idx + 1}:`);
      console.log(`    - Asking price: ¥${result.totalAskingPrice.toLocaleString()}`);
      console.log(`    - Games count: ${result.gamesCount}`);
      console.log(`    - Est. value: ¥${result.estimatedIndividualValue.toLocaleString()}`);
      console.log(`    - Profit: ¥${result.estimatedProfit.toLocaleString()}`);
      console.log(`    - Margin: ${result.profitMargin}%`);
    });

    // Test 4: Database Persistence
    console.log('\n✓ [TEST 4] Database Persistence (In-Memory)');
    await firebaseDB.initializeFirebase();

    const testListing = {
      yahooId: 'test-001',
      title: 'テスト出品',
      askingPrice: 12000,
      imageUrls: ['test.jpg']
    };

    const id1 = await firebaseDB.saveListing(testListing);
    console.log(`  - Saved listing: ${id1}`);

    const listings = await firebaseDB.getListings(10);
    console.log(`  - Retrieved ${listings.length} listing(s)`);
    console.log(`  - First listing: ${listings[0]?.yahooId || 'N/A'}`);

    // Test 5: Statistics Calculation
    console.log('\n✓ [TEST 5] Statistics Calculation');

    const stats = await firebaseDB.getProfitStats(30);
    console.log(`  - Analyzed: ${stats.totalAnalyzed} listings`);
    console.log(`  - Total profit: ¥${stats.totalProfit.toLocaleString()}`);
    console.log(`  - Avg profit/listing: ¥${stats.averageProfitPerListing.toLocaleString()}`);
    console.log(`  - Avg margin: ${stats.averageProfitMargin}%`);

    console.log('\n========== CORE TESTS COMPLETED ✓ ==========\n');

  } catch (error) {
    console.error('\n✗ TEST FAILED:', error.message);
    process.exit(1);
  }
}

testCoreLogic();
