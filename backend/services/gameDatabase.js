// Game Database - Reference list of popular Gameboy games
// Used for image recognition validation and fallback matching

const GAMEBOY_GAMES = [
  // Original Gameboy (monochrome)
  'テトリス',
  'ゲームボーイ スーパーマリオランド',
  'ゼルダの伝説 リンクの冒険',
  'メトロイドII',
  'ボンバーマン',
  'ドンキーコング',
  'スーパーマリオランド2 6つの金貨',
  'ワリオランド',
  'カービィのドリームコース',

  // Gameboy Color specific
  'ポケットモンスター赤',
  'ポケットモンスター青',
  'ポケットモンスター緑',
  'ポケットモンスター黄',
  'ポケットモンスター金',
  'ポケットモンスター銀',
  'ポケットモンスター水晶',
  'ポケットモンスター ピカチュウ',
  'ポケットモンスター ピカチュウバージョン',

  // Gameboy Advance
  'ポケットモンスター ルビー',
  'ポケットモンスター サファイア',
  'ポケットモンスター エメラルド',
  'ファイアーエムブレム',
  'ゼルダの伝説 ふしぎのぼうし',
  'マリオカート スーパーサーキット',
  'メトロイド フュージョン',
  'スターフォックス アドバンス',

  // Other popular titles
  'ヨッシー',
  'クイックス',
  'ピンボール',
  'スーパーマリオボール',
  'ロードランナー',
  'スターウォーズ',
  'バックストリート',
  '魔界村',
  'ファイナルファンタジー',
  'ドラゴンクエスト',
  '女神転生',
  'モンスターハンター',
  'パワプロクンポケット',
  'エースコンバット',
  'メタルマックス'
];

/**
 * Validate if a title is a known Gameboy game
 */
function isValidGameboyGame(title) {
  const normalized = title.toLowerCase().trim();
  return GAMEBOY_GAMES.some(game =>
    game.toLowerCase().includes(normalized) ||
    normalized.includes(game.toLowerCase())
  );
}

/**
 * Find best matching game title
 */
function findBestMatch(partialTitle) {
  const normalized = partialTitle.toLowerCase().trim();

  // Exact match first
  const exact = GAMEBOY_GAMES.find(game =>
    game.toLowerCase() === normalized
  );
  if (exact) return exact;

  // Partial match
  const partial = GAMEBOY_GAMES.find(game =>
    game.toLowerCase().includes(normalized) ||
    normalized.includes(game.toLowerCase())
  );
  if (partial) return partial;

  return null;
}

/**
 * Get all Gameboy games
 */
function getAllGames() {
  return GAMEBOY_GAMES;
}

module.exports = {
  GAMEBOY_GAMES,
  isValidGameboyGame,
  findBestMatch,
  getAllGames
};
