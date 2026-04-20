# 📊 負荷テストガイド

**目標**: 100+ 同時接続での動作確認  
**テスト対象**: バックエンド API + Firestore

---

## セットアップ

### 1. Apache JMeter インストール

```bash
# macOS
brew install jmeter

# Windows
# https://jmeter.apache.org/download_jmeter.cgi からダウンロード

# Linux
sudo apt-get install jmeter
```

### 2. テストプラン作成

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan">
      <elementProp name="TestPlan.user_defined_variables" elementType="Arguments"/>
      <stringProp name="TestPlan.name">GameboyAnalyzer Load Test</stringProp>
    </TestPlan>
    
    <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup">
      <elementProp name="ThreadGroup.main_controller" elementType="LoopController">
        <stringProp name="LoopController.loops">1</stringProp>
      </elementProp>
      <stringProp name="ThreadGroup.num_threads">100</stringProp>
      <stringProp name="ThreadGroup.ramp_time">30</stringProp>
      <stringProp name="ThreadGroup.duration">300</stringProp>
    </ThreadGroup>
    
    <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy">
      <elementProp name="HTTPsampler.Arguments" elementType="Arguments"/>
      <stringProp name="HTTPSampler.domain">localhost</stringProp>
      <stringProp name="HTTPSampler.port">3000</stringProp>
      <stringProp name="HTTPSampler.path">/api/listings</stringProp>
      <stringProp name="HTTPSampler.method">GET</stringProp>
    </HTTPSamplerProxy>
    
    <ResultCollector guiclass="SimpleDataWriter" testclass="ResultCollector">
      <stringProp name="filename">results.jtl</stringProp>
    </ResultCollector>
  </hashTree>
</jmeterTestPlan>
```

---

## テスト実行

### Node.js 簡易負荷テスト

```javascript
// backend/load-test.js
const http = require('http');

const loadTest = async () => {
  const concurrentUsers = 100;
  const requestsPerUser = 10;
  const apiUrl = 'http://localhost:3000/api/listings';
  
  console.log(`🚀 Starting load test: ${concurrentUsers} users × ${requestsPerUser} requests`);
  
  const results = {
    success: 0,
    failed: 0,
    totalTime: 0,
    responseTimes: []
  };
  
  const makeRequest = () => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      http.get(apiUrl, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const duration = Date.now() - startTime;
          results.responseTimes.push(duration);
          results.totalTime += duration;
          
          if (res.statusCode === 200) {
            results.success++;
          } else {
            results.failed++;
          }
          
          resolve();
        });
      }).on('error', () => {
        results.failed++;
        resolve();
      });
    });
  };
  
  // 負荷テスト実行
  const startTime = Date.now();
  const promises = [];
  
  for (let i = 0; i < concurrentUsers * requestsPerUser; i++) {
    promises.push(makeRequest());
  }
  
  await Promise.all(promises);
  const totalTime = Date.now() - startTime;
  
  // 結果分析
  const sortedTimes = results.responseTimes.sort((a, b) => a - b);
  const avgTime = results.totalTime / results.success;
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
  
  console.log('\n📊 Load Test Results:');
  console.log(`Total Time: ${totalTime}ms`);
  console.log(`Success: ${results.success} | Failed: ${results.failed}`);
  console.log(`Success Rate: ${(results.success / (results.success + results.failed) * 100).toFixed(2)}%`);
  console.log(`\n⏱️  Response Times:`);
  console.log(`Average: ${avgTime.toFixed(2)}ms`);
  console.log(`P50 (median): ${p50}ms`);
  console.log(`P95: ${p95}ms`);
  console.log(`P99: ${p99}ms`);
  console.log(`Min: ${sortedTimes[0]}ms | Max: ${sortedTimes[sortedTimes.length - 1]}ms`);
  
  // パフォーマンス基準判定
  const pass = results.failed === 0 && avgTime < 200 && p99 < 500;
  console.log(`\n${pass ? '✅ PASS' : '❌ FAIL'}`);
  
  process.exit(pass ? 0 : 1);
};

loadTest().catch(err => {
  console.error('Load test error:', err);
  process.exit(1);
});
```

### 実行方法

```bash
# バックエンド起動
npm start

# 別ターミナルで負荷テスト実行
node load-test.js
```

---

## 期待値

| メトリクス | 目標 | 実際 | ステータス |
|----------|------|------|----------|
| Success Rate | 99.9% | ? | TBD |
| P50 Response | < 100ms | ? | TBD |
| P95 Response | < 200ms | ? | TBD |
| P99 Response | < 500ms | ? | TBD |
| Max Response | < 1000ms | ? | TBD |
| Error Rate | < 0.1% | ? | TBD |

---

## トラブルシューティング

### メモリリーク検出

```javascript
// heap snapshot 取得
const heapdump = require('heapdump');
heapdump.writeSnapshot('./heap-' + Date.now() + '.heapsnapshot');
```

### CPU プロファイリング

```bash
node --prof server.js
node --prof-process isolate-*.log > profile.txt
```

### Node.js メモリ制限増加

```bash
node --max-old-space-size=4096 server.js
```

---

## Docker でのスケーリング テスト

```bash
# 3つのバックエンド インスタンス起動
docker-compose up -d --scale backend=3

# ロードバランサー経由でテスト
ab -n 1000 -c 100 http://localhost:3000/api/listings
```

---

## 結論

負荷テスト実行後、結果を分析して本番環境対応の準備完了を判定します。
