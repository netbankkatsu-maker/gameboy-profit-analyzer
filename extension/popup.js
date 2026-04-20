document.addEventListener('DOMContentLoaded', async () => {
  await initializeUI();
  setupEventListeners();
});

async function initializeUI() {
  const storage = await chrome.storage.local.get(['analysisHistory', 'lastRunAt', 'isRunning']);

  // Update status
  const statusEl = document.getElementById('status');
  if (storage.isRunning) {
    statusEl.innerHTML = '<span class="spinner"></span> 実行中';
  } else {
    statusEl.innerHTML = '✓ 準備完了';
  }

  // Update last run time
  if (storage.lastRunAt) {
    const lastRun = new Date(storage.lastRunAt);
    const hours = Math.floor((Date.now() - lastRun) / (1000 * 60 * 60));
    if (hours < 1) {
      document.getElementById('lastRun').textContent = '数分前';
    } else if (hours < 24) {
      document.getElementById('lastRun').textContent = `${hours}時間前`;
    } else {
      document.getElementById('lastRun').textContent = lastRun.toLocaleDateString('ja-JP');
    }
  }

  // Update analysis count
  const historyList = storage.analysisHistory || [];
  document.getElementById('analysisCount').textContent = historyList.length;

  // Display history
  const historyContainer = document.getElementById('historyList');
  if (historyList.length > 0) {
    historyContainer.innerHTML = historyList.slice(0, 5).map(item => `
      <div class="history-item">
        <span class="history-title-text">${item.title || 'N/A'}</span>
        <span class="history-profit">¥${item.estimatedProfit?.toLocaleString() || '0'}</span>
      </div>
    `).join('');
  }
}

function setupEventListeners() {
  document.getElementById('analyzeBtn').addEventListener('click', async () => {
    const btn = document.getElementById('analyzeBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> 分析中...';

    try {
      const response = await chrome.runtime.sendMessage({ action: 'manualTrigger' });

      if (response.success) {
        showFeedback('✓ 分析完了！ダッシュボードで結果を確認してください。', 'success');
        // Refresh UI after delay
        setTimeout(() => {
          initializeUI();
        }, 1000);
      } else {
        showFeedback(`✗ エラー: ${response.error}`, 'error');
      }
    } catch (error) {
      showFeedback(`✗ 分析に失敗しました: ${error.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '今すぐ分析';
    }
  });

  document.getElementById('dashboardBtn').addEventListener('click', () => {
    // Open web app dashboard (will implement in Phase 5)
    chrome.tabs.create({ url: 'http://localhost:3001' });
  });
}

function showFeedback(message, type) {
  const feedbackEl = document.getElementById('feedback');
  feedbackEl.textContent = message;
  feedbackEl.style.display = 'block';
  feedbackEl.style.borderLeftColor = type === 'success' ? '#4caf50' : '#f44336';

  setTimeout(() => {
    feedbackEl.style.display = 'none';
  }, 5000);
}
