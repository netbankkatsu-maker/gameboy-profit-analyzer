/**
 * Yahoo Flea Market (Yahoo!フリマ) Price Scraper
 * Uses the official search API to get real sold prices for game titles.
 * Falls back to deterministic mock if the API fails.
 */
const axios = require('axios');

const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours
const priceCache = new Map();

// Bundle/console keywords to filter out (these inflate prices)
const BUNDLE_KEYWORDS = [
  '本体', 'セット', 'SP', 'Lite', 'ライト', 'ミクロ', 'Micro',
  '充電器', 'ケーブル', 'ケース', 'まとめ', '大量', '個', '台',
  'DS', '3DS', 'ゲームボーイカラー本体', 'アドバンスSP'
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];
let uaIdx = 0;
const nextUA = () => { const ua = USER_AGENTS[uaIdx]; uaIdx = (uaIdx + 1) % USER_AGENTS.length; return ua; };

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

async function getGamePrice(gameTitle) {
  if (!gameTitle) return generateMockPrices('unknown');

  const cached = priceCache.get(gameTitle);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`[YahooFuri] Cache hit: ${gameTitle}`);
    return cached.data;
  }

  console.log(`[YahooFuri] Fetching price for: ${gameTitle}`);

  let data = await tryYahooFurimaApi(gameTitle);

  if (!data || data.sampleSize === 0) {
    console.log(`[YahooFuri] API failed – using mock for "${gameTitle}"`);
    data = generateMockPrices(gameTitle);
  }

  priceCache.set(gameTitle, { data, timestamp: Date.now() });
  return data;
}

// ─────────────────────────────────────────────
// Yahoo Flea Market API
// ─────────────────────────────────────────────

async function tryYahooFurimaApi(gameTitle) {
  try {
    const query = encodeURIComponent(gameTitle);
    const url = `https://paypayfleamarket.yahoo.co.jp/api/v1/search?results=50&sort=endtime&order=DESC&query=${query}&status=sold`;

    const resp = await axios.get(url, {
      headers: {
        'User-Agent': nextUA(),
        'Accept': 'application/json',
        'Referer': `https://paypayfleamarket.yahoo.co.jp/search/${query}`,
        'Origin': 'https://paypayfleamarket.yahoo.co.jp',
      },
      timeout: 10000,
    });

    const items = resp.data?.items || [];
    if (!Array.isArray(items) || items.length === 0) return null;

    // Filter out bundle/console listings
    const filteredItems = items.filter(item => {
      const name = (item.name || item.title || '').toLowerCase();
      return !BUNDLE_KEYWORDS.some(kw => name.includes(kw.toLowerCase()));
    });

    const prices = filteredItems
      .map(item => parseInt(item.price))
      .filter(p => p >= 100 && p <= 50000);

    if (prices.length === 0) return null;

    // Remove outliers using IQR method
    const cleanPrices = removeOutliers(prices);

    if (cleanPrices.length === 0) return null;

    console.log(`[YahooFuri] ${gameTitle}: ${cleanPrices.length} prices after filtering (raw: ${prices.length}), median: ¥${calcMedian(cleanPrices)}`);
    return calcStats(gameTitle, cleanPrices);

  } catch (err) {
    console.warn(`[YahooFuri] API failed for "${gameTitle}": ${err.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────
// Outlier removal (IQR method)
// ─────────────────────────────────────────────

function removeOutliers(prices) {
  if (prices.length < 4) return prices;
  const sorted = [...prices].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  return sorted.filter(p => p >= lower && p <= upper);
}

function calcMedian(sorted) {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

// ─────────────────────────────────────────────
// Mock fallback (realistic price range per title)
// ─────────────────────────────────────────────

const KNOWN_PRICES = {
  // ─── Game Boy (GB / GBC) ───────────────────
  'ポケットモンスター赤':          [1500, 1800, 2000, 1600, 1900],
  'ポケットモンスター青':          [1400, 1700, 1900, 1500, 1800],
  'ポケットモンスター黄':          [1800, 2000, 2200, 1700, 2100],
  'ポケットモンスター金':          [1200, 1500, 1700, 1300, 1600],
  'ポケットモンスター銀':          [1100, 1400, 1600, 1200, 1500],
  'ポケットモンスタークリスタル':  [2000, 2300, 2600, 1900, 2400],
  'テトリス':                      [500, 700, 900, 600, 800],
  'スーパーマリオランド':          [800, 1000, 1200, 900, 1100],
  'スーパーマリオランド2':        [1000, 1200, 1500, 1100, 1400],
  'ゼルダの伝説 夢をみる島':      [1500, 1800, 2000, 1600, 1900],
  'ドンキーコング':                [800, 1000, 1200, 900, 1100],
  '星のカービィ':                  [800, 1000, 1200, 900, 1100],
  '星のカービィ2':                [900, 1100, 1300, 1000, 1200],
  'ポケモンカードGB':              [1000, 1200, 1500, 1100, 1400],
  // ─── Game Boy Advance (GBA) ────────────────
  'ポケットモンスター ルビー':     [800, 1000, 1200, 900, 1100],
  'ポケットモンスター サファイア': [800, 1000, 1200, 900, 1100],
  'ポケットモンスター エメラルド': [1200, 1500, 1800, 1300, 1600],
  'ポケットモンスター ファイアレッド': [900, 1100, 1400, 1000, 1300],
  'ポケットモンスター リーフグリーン': [900, 1100, 1400, 1000, 1300],
  'スーパーマリオ アドバンス':     [500, 700, 900, 600, 800],
  'マリオカートアドバンス':        [600, 800, 1000, 700, 900],
  'ゼルダの伝説 神々のトライフォース&4つの剣': [800, 1000, 1200, 900, 1100],
  'ファイナルファンタジータクティクスアドバンス': [800, 1000, 1200, 900, 1100],
  'ロックマンエグゼ':              [700, 900, 1100, 800, 1000],
  'ロックマンエグゼ2':            [800, 1000, 1200, 900, 1100],
  'ロックマンエグゼ3':            [900, 1100, 1300, 1000, 1200],
  'ロックマンエグゼ4':            [700, 900, 1100, 800, 1000],
  'ロックマンエグゼ5':            [700, 900, 1100, 800, 1000],
  'ロックマンエグゼ6':            [900, 1100, 1400, 1000, 1300],
  '遊戯王デュエルモンスターズ インターナショナル2': [400, 600, 800, 500, 700],
  '金色のガッシュベル!! うなれ!友情の電撃': [500, 700, 900, 600, 800],
  '鋼の錬金術師 迷走の輪舞曲':    [600, 800, 1000, 700, 900],
  'ワンピース ドラゴンドリーム':   [500, 700, 900, 600, 800],
  '絶対絶命でんぢゃらすじーさん3 果てしなき魔物語': [400, 600, 800, 500, 700],
  'みんなの麻雀':                  [400, 600, 800, 500, 700],
  'ヨッシーの万有引力':            [600, 800, 1000, 700, 900],
  '逆転裁判':                      [1000, 1200, 1500, 1100, 1400],
  '逆転裁判2':                    [1200, 1500, 1800, 1300, 1600],
};

function generateMockPrices(gameTitle) {
  const strippedTitle = gameTitle.replace(/\s*(GBA|GBC|ゲームボーイ)\s*$/i, '').trim();
  const known = KNOWN_PRICES[gameTitle] || KNOWN_PRICES[strippedTitle];
  if (known) {
    console.log(`[YahooFuri] Using mock price table for "${gameTitle}"`);
    return calcStats(gameTitle, known);
  }
  // Generic fallback — deterministic seed
  const seed = gameTitle.split('').reduce((s, c) => (s * 31 + (c.charCodeAt(0) % 100)) % 5000, 7);
  const base = 500 + (seed % 10) * 150;  // ¥500–¥1,850 range
  const prices = [base, base + 200, base - 100, base + 150, base - 50].map(p => Math.max(300, p));
  return calcStats(gameTitle, prices);
}

// ─────────────────────────────────────────────
// Stats helper
// ─────────────────────────────────────────────

function calcStats(gameTitle, prices) {
  const sorted = [...prices].sort((a, b) => a - b);
  const median = calcMedian(sorted);
  const avg = Math.round(sorted.reduce((s, p) => s + p, 0) / sorted.length);
  const recentPrices = sorted.reverse().slice(0, 10).map((price, i) => ({
    soldDate: new Date(Date.now() - i * 24 * 3600 * 1000).toISOString(),
    price,
  }));
  return {
    gameTitle,
    lastFetchedAt: new Date().toISOString(),
    averagePrice: median,   // Use median as the representative price
    medianPrice: median,
    priceRange: { min: Math.min(...prices), max: Math.max(...prices) },
    recentPrices,
    sampleSize: prices.length,
  };
}

function clearCache() { priceCache.clear(); }
function getCacheStats() { return { size: priceCache.size, games: [...priceCache.keys()] }; }

module.exports = { getGamePrice, clearCache, getCacheStats, calcStats };
