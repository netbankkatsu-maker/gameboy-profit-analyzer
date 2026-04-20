/**
 * Yahoo Fril / Rakuma (fril.jp) Scraper
 * Uses axios + cheerio (no browser/puppeteer required → Vercel-compatible).
 * fril.jp search results are server-side rendered.
 */
const axios = require('axios');
const cheerio = require('cheerio');

const FRIL_SEARCH_URL = 'https://fril.jp/s';
const SEARCH_QUERIES = [
  'ゲームボーイ まとめ ソフト',
  'ゲームボーイ セット',
  'GBソフト まとめ',
  'ゲームボーイアドバンス まとめ',
];
const REQUEST_DELAY_MS = 1500;

const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Fetch fril.jp search results page and extract listings.
 */
async function fetchSearchListings(query) {
  const url = `${FRIL_SEARCH_URL}?query=${encodeURIComponent(query)}&sort=new`;
  console.log(`[FrilScraper] GET "${query}" → ${url}`);

  const resp = await axios.get(url, { headers: HTTP_HEADERS, timeout: 15000 });
  const $ = cheerio.load(resp.data);
  const results = [];
  const seen = new Set();

  // Primary: .item-box cards
  $('.item-box, [class*="item-box"]').each((_, card) => {
    try {
      const $card = $(card);

      // Skip SOLD OUT items
      const cardText = $card.text();
      if (/sold\s*out|売り切れ/i.test(cardText)) return;

      // Item link
      const link = $card.find('a[href*="item.fril.jp"]').first();
      if (!link.length) return;

      const href = link.attr('href') || '';
      const itemId = href.split('/').pop().split('?')[0];
      if (!itemId || itemId.length < 5 || seen.has(itemId)) return;
      seen.add(itemId);

      // Title: prefer img alt, then link title
      const img = link.find('img').first();
      let title = '';
      if (img.length) {
        let alt = img.attr('alt') || '';
        // Remove trailing "(Category)" and strip "Brand(Brand)のTitle" prefix
        alt = alt.replace(/\([^)]*\)\s*$/, '').trim();
        const afterNo = alt.match(/^[^(（]+[（(][^)）]+[)）]の(.+)$/);
        title = afterNo ? afterNo[1].trim() : alt;
      }
      if (!title) {
        const lt = link.attr('title') || '';
        title = lt
          .replace(/の商品詳細ページへのリンク.*$/, '')
          .replace(/\s+エンタメ[/\/].*$/, '')          // strip "エンタメ/ホビー/..." breadcrumb
          .replace(/\s+ゲームソフト[/\/].*$/, '')       // strip "ゲームソフト/..." breadcrumb
          .replace(/\s+\S+[（(][^)）]+[)）]の.*$/, '') // strip "Brand(Brand)の..." suffix
          .trim();
      }
      if (!title) return;

      // Image: prefer data-src (lazy-loaded), fallback to src
      let imageUrl = img.attr('data-src') || img.attr('data-lazy') || img.attr('data-original') || '';
      if (!imageUrl) {
        const src = img.attr('src') || '';
        if (src && !src.includes('dummy') && !src.includes('placeholder') && src.startsWith('http')) {
          imageUrl = src;
        }
      }
      // If still no image, try noscript fallback inside the link
      if (!imageUrl) {
        const noscriptHtml = link.find('noscript').html() || '';
        const m = noscriptHtml.match(/src="([^"]+)"/);
        if (m) imageUrl = m[1];
      }

      // Price: from card text (price is outside <a>)
      const priceMatch = cardText.match(/¥\s*([\d,]+)/);
      const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : 0;
      if (price <= 0) return;

      results.push({
        itemId,
        title,
        price,
        imageUrls: imageUrl ? [imageUrl] : [],
        url: href,
      });
    } catch { /* skip malformed card */ }
  });

  // Fallback: any item.fril.jp links
  if (results.length === 0) {
    $('a[href*="item.fril.jp"]').each((_, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href') || '';
        const itemId = href.split('/').pop().split('?')[0];
        if (!itemId || itemId.length < 5 || seen.has(itemId)) return;

        let title = $el.attr('title') || '';
        if (!title) {
          const img = $el.find('img').first();
          title = (img.attr('alt') || '').replace(/\([^)]*\)\s*$/, '').trim();
        }
        if (!title) return;

        // Walk up to find price
        let price = 0;
        let node = el.parent;
        for (let i = 0; i < 4 && node; i++) {
          const text = $(node).text();
          const m = text.match(/¥\s*([\d,]+)/);
          if (m) { price = parseInt(m[1].replace(/,/g, ''), 10); break; }
          node = node.parent;
        }
        if (price <= 0) return;

        const img = $el.find('img').first();
        const imageUrl = img.attr('data-src') || img.attr('data-lazy') || '';

        seen.add(itemId);
        results.push({ itemId, title, price, imageUrls: imageUrl ? [imageUrl] : [], url: href });
      } catch { /* skip */ }
    });
  }

  return results;
}

/**
 * Scrape fril.jp search results for GameBoy bundle listings.
 */
async function scrapeFrilListings(maxListings = 20) {
  console.log('[FrilScraper] Starting axios-based scrape (no puppeteer)...');
  const allListings = [];

  for (const query of SEARCH_QUERIES) {
    if (allListings.length >= maxListings) break;
    try {
      const listings = await fetchSearchListings(query);
      console.log(`[FrilScraper] Found ${listings.length} listings for "${query}"`);

      // Prioritise bundle listings
      const bundleKeywords = ['まとめ', 'セット', '本', '個', 'ソフト'];
      const bundled = listings.filter(l => bundleKeywords.some(kw => l.title.includes(kw)));
      allListings.push(...(bundled.length > 0 ? bundled : listings));
    } catch (err) {
      console.warn(`[FrilScraper] Error for query "${query}":`, err.message);
    }

    if (allListings.length < maxListings) await sleep(REQUEST_DELAY_MS);
  }

  const unique = Array.from(
    new Map(allListings.map(l => [l.itemId, l])).values()
  ).slice(0, maxListings);

  console.log(`[FrilScraper] Total unique listings: ${unique.length}`);
  return unique;
}

/**
 * Fetch a Fril item page and extract the full image list.
 * (Kept for compatibility; now axios-based.)
 */
async function scrapeFrilListingDetail(listingUrl) {
  try {
    const resp = await axios.get(listingUrl, { headers: HTTP_HEADERS, timeout: 12000 });
    const $ = cheerio.load(resp.data);
    const imgs = [];
    $('img[src]').each((_, el) => {
      const src = $(el).attr('src') || '';
      if (src && src.startsWith('http') && !src.includes('avatar') && !src.includes('icon')) {
        imgs.push(src);
      }
    });
    return { imageUrls: [...new Set(imgs)].slice(0, 10) };
  } catch (err) {
    console.warn('[FrilScraper] Detail scrape failed:', err.message);
    return { imageUrls: [] };
  }
}

/**
 * Fetch a Fril item page via HTTP (SSR) and extract description text + hashtags.
 */
async function scrapeFrilDescription(listingUrl) {
  if (!listingUrl) return { description: '', hashtags: [] };
  try {
    const resp = await axios.get(listingUrl, { headers: HTTP_HEADERS, timeout: 12000 });
    const html = resp.data;

    // Strategy 1: JSON-LD structured data
    let descText = '';
    const jsonLdBlocks = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const block of jsonLdBlocks) {
      try {
        const data = JSON.parse(block[1]);
        if (data.description) { descText = data.description; break; }
        if (data['@graph']) {
          const product = data['@graph'].find(n => n.description);
          if (product) { descText = product.description; break; }
        }
      } catch { /* skip malformed JSON-LD */ }
    }

    // Strategy 2: og:description
    if (!descText) {
      const m = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]{10,})"/i) ||
                html.match(/<meta[^>]+content="([^"]{10,})"[^>]+property="og:description"/i);
      if (m) descText = m[1];
    }

    // Strategy 3: <pre> description block
    if (!descText) {
      const preMatch = html.match(/<pre[^>]*>([\s\S]{10,5000}?)<\/pre>/i);
      if (preMatch) descText = preMatch[1].replace(/<[^>]+>/g, ' ');
    }

    // Decode HTML entities
    descText = descText
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/\s+/g, ' ').trim();

    // Extract hashtags — only keep those with at least one Japanese character
    const jpCharRe = /[ぁ-んァ-ン一-龥]/;
    const rawHashtags = [...html.matchAll(/#([ぁ-んァ-ン一-龥ーa-zA-Z0-9・\w]{2,30})/g)].map(m => m[1]);
    const hashtags = [...new Set(rawHashtags.filter(t => jpCharRe.test(t)))];

    console.log(`[FrilScraper] Description length: ${descText.length}, hashtags: ${hashtags.length}`);
    return { description: descText, hashtags };

  } catch (err) {
    console.warn('[FrilScraper] Description fetch failed:', err.message);
    return { description: '', hashtags: [] };
  }
}

module.exports = { scrapeFrilListings, scrapeFrilListingDetail, scrapeFrilDescription };
