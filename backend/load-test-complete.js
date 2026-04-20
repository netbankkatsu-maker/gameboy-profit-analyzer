#!/usr/bin/env node

/**
 * 完全負荷テストスイート
 * 100+ 同時接続のスケーラビリティテスト
 */

const http = require('http');

const config = {
  baseUrl: 'http://localhost:3000',
  concurrentUsers: 100,
  requestsPerUser: 10,
  warmupRequests: 10
};

class LoadTester {
  constructor() {
    this.results = {
      success: 0,
      failed: 0,
      totalTime: 0,
      responseTimes: [],
      endpoints: {}
    };
    this.startTime = null;
  }

  makeRequest(endpoint, method = 'GET', body = null) {
    return new Promise((resolve) => {
      const url = new URL(config.baseUrl + endpoint);
      const reqStartTime = Date.now();

      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LoadTest/1.0'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const duration = Date.now() - reqStartTime;
          this.results.responseTimes.push(duration);
          this.results.totalTime += duration;

          if (res.statusCode >= 200 && res.statusCode < 300) {
            this.results.success++;
          } else {
            this.results.failed++;
          }

          if (!this.results.endpoints[endpoint]) {
            this.results.endpoints[endpoint] = { count: 0, totalTime: 0 };
          }
          this.results.endpoints[endpoint].count++;
          this.results.endpoints[endpoint].totalTime += duration;

          resolve({ statusCode: res.statusCode, duration });
        });
      });

      req.on('error', () => {
        this.results.failed++;
        resolve({ statusCode: 0, duration: 0 });
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  async warmup() {
    console.log(`\n🔥 Warmup phase: ${config.warmupRequests} requests`);
    const promises = [];
    for (let i = 0; i < config.warmupRequests; i++) {
      promises.push(this.makeRequest('/health'));
    }
    await Promise.all(promises);
    console.log('✅ Warmup complete\n');
  }

  async runLoadTest() {
    console.log(`\n⚙️ Load Test Configuration:`);
    console.log(`   Concurrent Users: ${config.concurrentUsers}`);
    console.log(`   Requests per User: ${config.requestsPerUser}`);
    console.log(`   Total Requests: ${config.concurrentUsers * config.requestsPerUser}`);

    this.startTime = Date.now();
    const promises = [];

    const endpoints = [
      { path: '/api/listings', method: 'GET' },
      { path: '/api/stats', method: 'GET' },
      { path: '/health', method: 'GET' },
      {
        path: '/api/analyze',
        method: 'POST',
        body: {
          yahooFrilId: `test-${Date.now()}`,
          title: 'テスト出品',
          askingPrice: 10000,
          imageUrls: ['https://example.com/image.jpg']
        }
      }
    ];

    console.log(`\n🚀 Starting load test...`);

    for (let user = 0; user < config.concurrentUsers; user++) {
      for (let req = 0; req < config.requestsPerUser; req++) {
        const endpoint = endpoints[req % endpoints.length];
        promises.push(
          this.makeRequest(endpoint.path, endpoint.method, endpoint.body)
        );
      }
    }

    await Promise.all(promises);
    const totalTime = Date.now() - this.startTime;

    this.printResults(totalTime);
  }

  printResults(totalTime) {
    const sortedTimes = this.results.responseTimes.sort((a, b) => a - b);
    const avgTime = this.results.totalTime / this.results.success;
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.50)];
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];

    const successRate = (this.results.success / (this.results.success + this.results.failed) * 100).toFixed(2);

    console.log('\n' + '═'.repeat(60));
    console.log('📊 Load Test Results');
    console.log('═'.repeat(60));

    console.log('\n✅ Requests:');
    console.log(`   Total:   ${this.results.success + this.results.failed}`);
    console.log(`   Success: ${this.results.success} (${successRate}%)`);
    console.log(`   Failed:  ${this.results.failed}`);

    console.log('\n⏱️ Response Times:');
    console.log(`   Average:    ${avgTime.toFixed(2)}ms`);
    console.log(`   P50:        ${p50}ms (median)`);
    console.log(`   P95:        ${p95}ms`);
    console.log(`   P99:        ${p99}ms`);
    console.log(`   Min:        ${sortedTimes[0]}ms`);
    console.log(`   Max:        ${sortedTimes[sortedTimes.length - 1]}ms`);

    console.log('\n🔧 Endpoint Performance:');
    for (const [endpoint, stats] of Object.entries(this.results.endpoints)) {
      const avgEndpointTime = (stats.totalTime / stats.count).toFixed(2);
      console.log(`   ${endpoint}: ${stats.count} requests, avg ${avgEndpointTime}ms`);
    }

    console.log('\n📈 Overall:');
    console.log(`   Test Duration: ${totalTime}ms`);
    console.log(`   RPS: ${((this.results.success + this.results.failed) / (totalTime / 1000)).toFixed(2)}`);

    console.log('\n' + '═'.repeat(60));

    // Performance评价
    const pass =
      successRate >= 99.9 &&
      avgTime < 200 &&
      p95 < 500 &&
      p99 < 1000;

    if (pass) {
      console.log('🟢 PASS - Production Ready');
    } else {
      console.log('🟡 WARNING - Performance optimization needed');
      if (successRate < 99.9) console.log(`   ⚠️ Success rate ${successRate}% < 99.9%`);
      if (avgTime >= 200) console.log(`   ⚠️ Average response ${avgTime.toFixed(2)}ms >= 200ms`);
      if (p95 >= 500) console.log(`   ⚠️ P95 response ${p95}ms >= 500ms`);
      if (p99 >= 1000) console.log(`   ⚠️ P99 response ${p99}ms >= 1000ms`);
    }

    console.log('═'.repeat(60) + '\n');

    process.exit(pass ? 0 : 1);
  }
}

async function runTests() {
  const tester = new LoadTester();

  try {
    await tester.warmup();
    await tester.runLoadTest();
  } catch (error) {
    console.error('❌ Load test error:', error);
    process.exit(1);
  }
}

console.log('🧪 Load Test Suite Started');
console.log(`   Backend: ${config.baseUrl}`);

// Check if server is running
http.get(config.baseUrl + '/health', () => {
  runTests();
}).on('error', () => {
  console.error('❌ Backend not running. Start with: npm start');
  process.exit(1);
});
