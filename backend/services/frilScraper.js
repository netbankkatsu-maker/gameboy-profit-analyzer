/**
 * Yahoo Flea Market (Yahoo!フリマ / paypayfleamarket.yahoo.co.jp) Bundle Listing Scraper
 * Replaced former fril.jp / Rakuma scraper — CSS selectors on fril.jp no longer work.
 * Uses the Yahoo Flea Market search API (same host used by mercariScraper).
 */
const axios = require('axios');

const SEARCH_BASE = 'https://paypayfleamarket.yahoo.co.jp/api/v1/search';
const ITEM_BASE   = 'https://paypayfleamarket.yahoo.co.jp/item';
const REQUEST_DELAY_MS = 1000;

// Search queries for GameBoy bundle listings (active listings only — no status=sold)
const BUNDLE_SEARCH_QUERIES = [
  'ゲームボーイ まとめ売り',
  'ゲームボーイ ソフト セット',
  'GBA まとめ',
  'ゲームボーイアドバンス まとめ売り',
  'ゲームボーイ ソフト まとめ',
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];
let uaIdx = 0;
const nextUA = () => { const ua = USER_AGENTS[uaIdx]; uaIdx = (uaIdx + 1) % USER_AGENTS.length; return ua; };

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─────────────────────────────────────────────
// Search
// ─────────────────────────────────────────────

/**
 * Call the Yahoo Flea Market search API and return raw item objects.
 */
async function searchYahooFuri(query, results = 100) {
  const q = encodeURIComponent(query);
  const url = `${SEARCH_BASE}?results=${results}&sort=endtime&order=DESC&query=${q}`;

  console.log(`[YahooFuriScraper] GET "${query}"`);

  const resp = await axios.get(url, {
    headers: {
      'User-Agent': nextUA(),
      'Accept': 'application/json',
      'Referer': `https://paypayfleamarket.yahoo.co.jp/search/${q}`,
      'Origin': 'https://paypayfleamarket.yahoo.co.jp',
    },
    timeout: 12000,
  });

  return resp.data?.items || [];
}

// ─────────────────────────────────────────────
// Normalise raw API item → standard listing shape
// ─────────────────────────────────────────────

function normalizeItem(item) {
  // Item ID — API uses various field names
  const itemId = item.id || item.itemId || item.itemNo
              || item.auction_id || String(item.no || '');
  if (!itemId) return null;

  // Title
  const title = item.name || item.title || '';
  if (!title) return null;

  // Price
  const price = parseInt(item.price) || 0;
  if (price <= 0) return null;

  // Images — probe several possible field names
  const imageUrls = [];
  const push = (v) => { if (v && typeof v === 'string' && v.startsWith('http')) imageUrls.push(v); };
  push(item.thumbnailUrl);
  push(item.imageUrl);
  push(item.image);
  push(item.thumb);
  if (Array.isArray(item.images)) {
    item.images.forEach(img => push(typeof img === 'string' ? img : (img.url || img.src || '')));
  }
  if (Array.isArray(item.imageUrls)) item.imageUrls.forEach(push);

  const uniqueImages = [...new Set(imageUrls)];
  const url = `${ITEM_BASE}/${itemId}`;

  return { itemId: String(itemId), title, price, imageUrls: uniqueImages, url };
}

// ─────────────────────────────────────────────
// Public: scrapeFrilListings
// ─────────────────────────────────────────────

/**
 * Search Yahoo Flea Market for GameBoy bundle listings.
 * Returns up to maxListings items shaped as { itemId, title, price, imageUrls, url }.
 */
async function scrapeFrilListings(maxListings = 20, userQuery = '') {
  console.log('[YahooFuriScraper] Starting Yahoo Flea Market bundle search...');

  // ユーザー指定クエリがあればそれだけ使う。なければデフォルト一覧を使う
  const queries = userQuery ? [userQuery] : BUNDLE_SEARCH_QUERIES;

  const seen   = new Set();
  const all    = [];

  for (const query of queries) {
    if (all.length >= maxListings * 3) break; // gather extras before filtering

    try {
      const rawItems = await searchYahooFuri(query);
      console.log(`[YahooFuriScraper] "${query}" → ${rawItems.length} raw items`);

      for (const raw of rawItems) {
        const listing = normalizeItem(raw);
        if (!listing || seen.has(listing.itemId)) continue;
        seen.add(listing.itemId);
        all.push(listing);
      }
    } catch (err) {
      console.warn(`[YahooFuriScraper] Error for "${query}": ${err.message}`);
    }

    if (all.length < maxListings) await sleep(REQUEST_DELAY_MS);
  }

  // Prefer listings that look like bundles
  const bundleKws = ['まとめ', 'セット', 'セット売り', '本', '個', 'ソフト'];
  const bundled   = all.filter(l => bundleKws.some(kw => l.title.includes(kw)));
  const result    = (bundled.length >= maxListings ? bundled : all).slice(0, maxListings);

  console.log(`[YahooFuriScraper] Returning ${result.length} listings (total gathered: ${all.length})`);
  return result;
}

// ─────────────────────────────────────────────
// Public: scrapeFrilDescription
// Called by analyzeController to get the game list from a bundle's description.
// ─────────────────────────────────────────────

/**
 * Fetch a Yahoo Flea Market item page and extract description text + hashtags.
 */
async function scrapeFrilDescription(listingUrl) {
  if (!listingUrl) return { description: '', hashtags: [] };

  const itemId = listingUrl.split('/').pop().split('?')[0];

  // ── Strategy A: item detail JSON API ──
  try {
    const apiUrl = `https://paypayfleamarket.yahoo.co.jp/api/v1/item/${itemId}`;
    const resp = await axios.get(apiUrl, {
      headers: {
        'User-Agent': nextUA(),
        'Accept': 'application/json',
        'Referer': listingUrl,
        'Origin': 'https://paypayfleamarket.yahoo.co.jp',
      },
      timeout: 10000,
    });

    const data = resp.data;
    const desc = data?.item?.description || data?.description || '';
    if (desc) {
      const hashtags = extractHashtags(desc);
      console.log(`[YahooFuriScraper] API description: ${desc.length} chars, ${hashtags.length} tags`);
      return { description: desc, hashtags };
    }
  } catch (apiErr) {
    console.warn(`[YahooFuriScraper] Item API failed (${apiErr.message}), trying HTML...`);
  }

  // ── Strategy B: scrape the HTML item page ──
  try {
    const resp = await axios.get(listingUrl, {
      headers: {
        'User-Agent': nextUA(),
        'Accept': 'text/html,application/xhtml+xml',
        'Referer': 'https://paypayfleamarket.yahoo.co.jp/',
        'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8',
      },
      timeout: 12000,
    });
    const html = resp.data;

    let descText = '';

    // 1) JSON-LD structured data
    for (const m of html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        const d = JSON.parse(m[1]);
        if (d.description) { descText = d.description; break; }
        if (d['@graph']) {
          const node = d['@graph'].find(n => n.description);
          if (node) { descText = node.description; break; }
        }
      } catch { /* skip malformed */ }
    }

    // 2) __NEXT_DATA__ JSON (Next.js SSR)
    if (!descText) {
      const nd = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
      if (nd) {
        try {
          const nextData = JSON.parse(nd[1]);
          const item = nextData?.props?.pageProps?.item
                    || nextData?.props?.pageProps?.initialData?.item;
          if (item?.description) descText = item.description;
        } catch { /* skip */ }
      }
    }

    // 3) og:description meta tag
    if (!descText) {
      const m = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]{10,})"/i)
             || html.match(/<meta[^>]+content="([^"]{10,})"[^>]+property="og:description"/i);
      if (m) descText = m[1];
    }

    // Decode HTML entities & collapse whitespace
    descText = descText
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/\s+/g, ' ').trim();

    const hashtags = extractHashtags(html); // extract from full HTML (more reliable)
    console.log(`[YahooFuriScraper] HTML description: ${descText.length} chars, ${hashtags.length} tags`);
    return { description: descText, hashtags };

  } catch (err) {
    console.warn('[YahooFuriScraper] Description fetch failed:', err.message);
    return { description: '', hashtags: [] };
  }
}

// ─────────────────────────────────────────────
// Public: scrapeFrilListingDetail  (kept for API compatibility)
// ─────────────────────────────────────────────

async function scrapeFrilListingDetail(listingUrl) {
  try {
    const itemId = listingUrl.split('/').pop().split('?')[0];
    const apiUrl = `https://paypayfleamarket.yahoo.co.jp/api/v1/item/${itemId}`;

    const resp = await axios.get(apiUrl, {
      headers: {
        'User-Agent': nextUA(),
        'Accept': 'application/json',
        'Referer': listingUrl,
        'Origin': 'https://paypayfleamarket.yahoo.co.jp',
      },
      timeout: 10000,
    });

    const data = resp.data;
    const item = data?.item || data;
    const images = [];
    const push   = (v) => { if (v && typeof v === 'string' && v.startsWith('http')) images.push(v); };
    push(item?.thumbnailUrl);
    push(item?.imageUrl);
    if (Array.isArray(item?.images)) item.images.forEach(img => push(typeof img === 'string' ? img : img?.url));

    return { imageUrls: [...new Set(images)].slice(0, 10) };
  } catch (err) {
    console.warn('[YahooFuriScraper] Detail fetch failed:', err.message);
    return { imageUrls: [] };
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function extractHashtags(text) {
  const jpCharRe = /[ぁ-んァ-ン一-龥]/;
  const raw = [...text.matchAll(/#([ぁ-んァ-ン一-龥ーa-zA-Z0-9・\w]{2,30})/g)].map(m => m[1]);
  return [...new Set(raw.filter(t => jpCharRe.test(t)))];
}

module.exports = { scrapeFrilListings, scrapeFrilListingDetail, scrapeFrilDescription };
