const BACKEND_URL = 'http://localhost:3000';
const ALARM_NAME = 'dailyGameAnalysis';
const CHECK_INTERVAL = 24 * 60; // 24 hours in minutes

// Initialize alarm when extension loads
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Extension] Installed - Setting up daily alarm');
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: CHECK_INTERVAL });

  // Initialize storage
  chrome.storage.local.set({
    analysisHistory: [],
    lastRunAt: null,
    isRunning: false
  });
});

// Handle periodic alarm
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log('[Extension] Alarm triggered - Starting analysis');
    await performGameboyAnalysis();
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'manualTrigger') {
    console.log('[Extension] Manual trigger from popup');
    performGameboyAnalysis().then(result => {
      sendResponse({ success: true, result });
    }).catch(error => {
      console.error('[Extension] Error:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open for async response
  }
});

async function performGameboyAnalysis() {
  const storage = await chrome.storage.local.get(['isRunning']);

  if (storage.isRunning) {
    console.log('[Extension] Analysis already running, skipping');
    return;
  }

  try {
    // Set running flag
    await chrome.storage.local.set({ isRunning: true });

    console.log('[Extension] Fetching Yahoo Fril gameboy listings...');
    const listings = await fetchYahooFrilListings();

    if (listings.length === 0) {
      console.log('[Extension] No new listings found');
      return;
    }

    console.log(`[Extension] Found ${listings.length} listings, sending to backend...`);

    // Send each listing to backend for analysis
    for (const listing of listings) {
      try {
        const analysisResult = await analyzeListingAtBackend(listing);
        console.log(`[Extension] Analysis complete for listing ${listing.yahooId}:`, analysisResult);

        // Store result in local storage
        const history = await chrome.storage.local.get(['analysisHistory']);
        const updated = [analysisResult, ...(history.analysisHistory || [])].slice(0, 100); // Keep last 100
        await chrome.storage.local.set({ analysisHistory: updated });
      } catch (error) {
        console.error(`[Extension] Error analyzing listing ${listing.yahooId}:`, error);
      }
    }

    // Update last run timestamp
    await chrome.storage.local.set({ lastRunAt: new Date().toISOString() });

  } catch (error) {
    console.error('[Extension] Analysis failed:', error);
  } finally {
    // Clear running flag
    await chrome.storage.local.set({ isRunning: false });
  }
}

async function fetchYahooFrilListings() {
  try {
    // Query Yahoo Fril search page
    // This would normally open/scrape the page, but for now return mock data
    // In production, use Puppeteer in backend instead

    return [
      {
        yahooId: 'l123456',
        title: 'ゲームボーイまとめ売り 20個',
        askingPrice: 15000,
        imageUrls: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg'
        ],
        createdAt: new Date().toISOString(),
        url: 'https://fril.jp/item/l123456'
      }
    ];
  } catch (error) {
    console.error('[Extension] Error fetching listings:', error);
    return [];
  }
}

async function analyzeListingAtBackend(listing) {
  const payload = {
    yahooId: listing.yahooId,
    title: listing.title,
    askingPrice: listing.askingPrice,
    imageUrls: listing.imageUrls,
    listingUrl: listing.url,
    createdAt: listing.createdAt
  };

  const response = await fetch(`${BACKEND_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`);
  }

  return response.json();
}
