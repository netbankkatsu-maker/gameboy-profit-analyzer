// Simple test script for Phase 1
// Run with: node test-analyze.js

const analyzeController = require('./controllers/analyzeController');

async function testAnalysis() {
  const testPayload = {
    yahooId: 'l123456',
    title: 'ゲームボーイまとめ売り 20個セット',
    askingPrice: 15000,
    imageUrls: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg'
    ],
    listingUrl: 'https://fril.jp/item/l123456',
    createdAt: new Date().toISOString()
  };

  console.log('[Test] Starting analysis test...\n');
  console.log('Payload:', JSON.stringify(testPayload, null, 2));
  console.log('\n---\n');

  try {
    const result = await analyzeController.analyzeGameboyListing(testPayload);
    console.log('[Test] ✓ Analysis complete!\n');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('[Test] ✗ Error:', error.message);
  }
}

testAnalysis();
