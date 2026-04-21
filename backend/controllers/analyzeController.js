const imageRecognitionService = require('../services/imageRecognition');
const mercariScraperService = require('../services/mercariScraper');
const firebaseService = require('../services/firebaseDB');
const { scrapeFrilDescription } = require('../services/frilScraper');

// Platform / generic tags that appear as hashtags but are NOT game titles
const NON_GAME_TAGS = new Set([
  'ゲームボーイ', 'ゲームボーイアドバンス', 'ゲームボーイカラー',
  'GBA', 'GB', 'GBC', 'GBASP', 'ゲームボーイSP',
  'Nintendo', 'ニンテンドー', '任天堂',
  'まとめ', 'セット', 'まとめ売り', 'まとめ買い',
  '送料無料', '値下げ', '値下げ交渉', '即購入可', '早い者勝ち',
  'ゲームソフト', 'レトロゲーム', 'カセット',
]);

/**
 * Detect console platform from listing title / description text.
 * Returns 'GBA' | 'GBC' | 'GB'
 */
function detectPlatform(title, description) {
  const text = (title + ' ' + description).toLowerCase();
  if (/アドバンス|advance|gba/.test(text)) return 'GBA';
  if (/カラー|color|colour|gbc/.test(text)) return 'GBC';
  return 'GB';
}

/**
 * Build a Mercari search term that includes platform context.
 * e.g. "ポケットモンスター赤" + GB → "ポケットモンスター赤 ゲームボーイ"
 */
function buildMercariSearchTerm(gameName, platform) {
  const suffix = { GBA: ' GBA', GBC: ' GBC', GB: ' ゲームボーイ' };
  // Only append platform if the name doesn't already contain it
  const already = /GBA|GBC|ゲームボーイ/i.test(gameName);
  return already ? gameName : gameName + (suffix[platform] || '');
}

/**
 * Extract game titles from description text and hashtags.
 * Priority: numbered list in description > hashtags
 */
function extractGamesFromDescription(description, hashtags) {
  const games = [];
  const seen = new Set();

  const addGame = (name, confidence, source) => {
    // Normalise: strip section headers like【商品状態】and parenthetical notes like（赤カセット）
    name = name.replace(/\s*【[^】]*】.*$/, '')           // remove trailing 【section】 and beyond
               .replace(/[（(][^)）]{1,20}[)）]\s*$/, '') // remove trailing (note)
               .replace(/\s+/g, ' ').trim();
    if (name.length < 2 || seen.has(name)) return;
    seen.add(name);
    games.push({ name, confidence, source });
  };

  // Pattern 1: Numbered list — works for both newline-delimited and space-delimited text.
  // og:description collapses newlines to spaces, so we split on the list markers themselves.
  // e.g. "1. マリオパーティ アドバンス 2. ファミコンミニ..." → split at each "N. "
  const markerRe = /\d{1,2}[.、．:：]\s+/g;
  const markerMatches = [...description.matchAll(markerRe)];
  if (markerMatches.length >= 2) {
    // Extract text between consecutive markers
    for (let i = 0; i < markerMatches.length; i++) {
      const start = markerMatches[i].index + markerMatches[i][0].length;
      const end = i < markerMatches.length - 1 ? markerMatches[i + 1].index : description.length;
      const name = description.slice(start, end).trim();
      addGame(name, 0.95, 'description-numbered');
    }
  } else {
    // Also try newline-based pattern (for raw HTML descriptions with actual newlines)
    const numberedRe = /(?:^|\n)\s*(?:\d+[.、．:：]|[①-⑩])\s*([^\n\r]{2,60})/g;
    let m;
    while ((m = numberedRe.exec(description)) !== null) {
      addGame(m[1].trim(), 0.95, 'description-numbered');
    }
  }

  // Pattern 2: Bullet "・ゲーム名" or "- ゲーム名" (only if no numbered list found)
  if (games.length === 0) {
    const bulletRe = /(?:^|\n|。|　)\s*[・\-]\s*([^\n\r・\-]{2,60})/g;
    let m;
    while ((m = bulletRe.exec(description)) !== null) {
      addGame(m[1].trim(), 0.85, 'description-bullet');
    }
  }

  // Pattern 3: Hashtags (supplement if description games are few)
  if (games.length < 3) {
    for (const tag of hashtags) {
      if (!NON_GAME_TAGS.has(tag) && !/^[A-Za-z0-9\s]+$/.test(tag)) {
        addGame(tag, 0.70, 'hashtag');
      }
    }
  }

  // Pattern 4: 番号・記号なしで1行1タイトルの形式
  // 例: 改行で区切られたゲーム名リスト（番号も箇条書き記号もない）
  if (games.length === 0 && description.length > 5) {
    const jpRe = /[ぁ-んァ-ン一-龥]/;
    const lines = description.split(/\s{2,}|\n|。/).map(l => l.trim());
    for (const line of lines) {
      if (line.length < 2 || line.length > 40) continue;
      if (!jpRe.test(line)) continue;
      // ヘッダー・メタ情報っぽい行はスキップ
      if (/[：:\/]|円|¥|\d{4,}|送料|状態|動作|確認|評価|発送|支払|セット|まとめ|個|本/.test(line)) continue;
      if (NON_GAME_TAGS.has(line)) continue;
      addGame(line, 0.60, 'description-line');
    }
  }

  return games;
}

/**
 * タイトル文字列からゲーム名候補を抽出（最終フォールバック）
 */
function extractGamesFromTitle(title) {
  if (!title) return [];
  // 【】() などの装飾・数量・プラットフォーム名を除去
  let clean = title
    .replace(/【[^】]*】/g, ' ')
    .replace(/[（(][^)）]*[)）]/g, ' ')
    .replace(/\d+本|[0-9]+点|まとめ売り|まとめ|セット売り|セット|GBA|GB|GBC|ゲームボーイ(アドバンス|カラー|SP)?/gi, ' ')
    .replace(/\s+/g, ' ').trim();

  if (clean.length < 2) return [];

  // 「・」や「/」で複数タイトルが繋がっているケース
  const parts = clean.split(/[・\/&＆]/).map(p => p.trim()).filter(p => p.length >= 2 && p.length <= 40);
  if (parts.length >= 2) {
    return parts.map(name => ({ name, confidence: 0.50, source: 'title' }));
  }

  return [{ name: clean, confidence: 0.50, source: 'title' }];
}

async function analyzeGameboyListing(payload) {
  const { yahooId, title, askingPrice, imageUrls, listingUrl, createdAt } = payload;

  console.log(`[Analyze] Starting analysis for listing ${yahooId}`);
  // Detect platform early from title (refined further once description is fetched)
  let platform = detectPlatform(title, '');

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

  // Step 1: Try to extract games from the listing description page (most reliable)
  let descriptionGames = [];
  if (listingUrl) {
    console.log(`[Analyze] Fetching description from ${listingUrl}...`);
    try {
      const { description, hashtags } = await scrapeFrilDescription(listingUrl);
      if (description || hashtags.length > 0) {
        descriptionGames = extractGamesFromDescription(description, hashtags);
        console.log(`[Analyze] Extracted ${descriptionGames.length} games from description`);
        // Refine platform from the full description text
        platform = detectPlatform(title, description);
      }
    } catch (err) {
      console.warn('[Analyze] Description scrape failed (non-fatal):', err.message);
    }
  }

  // Step 2: Recognize games from images (OCR fallback / supplement)
  console.log(`[Analyze] Recognizing games from ${imageUrls.length} images...`);
  const ocrGames = [];

  for (const imageUrl of imageUrls) {
    try {
      const recognitionResults = await imageRecognitionService.recognizeGameFromImage(imageUrl);
      if (Array.isArray(recognitionResults) && recognitionResults.length > 0) {
        // Take top 5 per image (no artificial 3-game cap)
        recognitionResults.slice(0, 5).forEach(r => {
          if (r && !ocrGames.some(g => g.name === r.name)) {
            ocrGames.push(r);
          }
        });
      }
    } catch (error) {
      console.error(`[Analyze] Error recognizing game from ${imageUrl}:`, error);
    }
  }

  // Step 3: Merge — description games are primary.
  // Only supplement with OCR if description found fewer than 3 games
  // (hash-classifier always returns the same 3 names, so skip it when we have real data)
  const recognizedGames = [...descriptionGames];
  if (descriptionGames.length < 3) {
    for (const g of ocrGames) {
      if (!recognizedGames.some(d => d.name === g.name)) {
        recognizedGames.push(g);
      }
    }
  }

  // 最終フォールバック: タイトルからゲーム名を推測
  if (recognizedGames.length === 0) {
    const titleGames = extractGamesFromTitle(title);
    recognizedGames.push(...titleGames);
    if (titleGames.length > 0) {
      console.log(`[Analyze] Using title fallback: ${titleGames.map(g => g.name).join(', ')}`);
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

  // Step 4: Get price data for each recognized game
  console.log(`[Analyze] Platform detected: ${platform} | Fetching prices for ${recognizedGames.length} games...`);
  const gamesPriceData = [];

  for (const game of recognizedGames) {
    // Description games: 0.95; OCR games: >= 0.4; hash classifier: >= 0.65
    if (game.confidence >= 0.4) {
      // Build search term with platform context for better Mercari results
      const searchTerm = buildMercariSearchTerm(game.name, platform);
      try {
        const priceData = await mercariScraperService.getGamePrice(searchTerm);
        gamesPriceData.push({
          gameName: game.name,          // display name (clean)
          searchTerm,                   // what was searched on Mercari
          platform,                     // GB | GBC | GBA
          confidence: game.confidence,
          source: game.source || 'ocr',
          averagePrice: priceData.averagePrice || 0,
          priceRange: priceData.priceRange || { min: 0, max: 0 }
        });
      } catch (error) {
        console.error(`[Analyze] Error fetching price for ${searchTerm}:`, error);
        gamesPriceData.push({
          gameName: game.name,
          searchTerm,
          platform,
          confidence: game.confidence,
          source: game.source || 'ocr',
          averagePrice: 0,
          priceRange: { min: 0, max: 0 }
        });
      }
    }
  }

  // Step 5: Calculate profit
  const profitAnalysis = calculateProfit(askingPrice, gamesPriceData);

  console.log(`[Analyze] Analysis complete - Estimated profit: ¥${profitAnalysis.estimatedProfit}`);

  // Step 6: Store results in Firebase
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
