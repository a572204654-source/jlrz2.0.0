/**
 * 压力测试脚本 - 使用 autocannon (Node.js原生)
 * 
 * 安装: npm install autocannon -g
 * 
 * 运行:
 *   node scripts/load-test-autocannon.js
 */

const autocannon = require('autocannon');

const BASE_URL = 'https://api.yimengpl.com';

// 测试配置
const testConfigs = [
  {
    name: '健康检查接口',
    url: `${BASE_URL}/health`,
    connections: 100,
    duration: 30,
  },
  {
    name: 'API根路径',
    url: `${BASE_URL}/api`,
    connections: 100,
    duration: 30,
  },
  {
    name: '天气接口',
    url: `${BASE_URL}/api/weather/current?location=广州`,
    connections: 50,
    duration: 30,
  }
];

async function runTest(config) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`开始测试: ${config.name}`);
  console.log(`URL: ${config.url}`);
  console.log(`并发连接: ${config.connections}`);
  console.log(`持续时间: ${config.duration}秒`);
  console.log('='.repeat(60));

  return new Promise((resolve) => {
    const instance = autocannon({
      url: config.url,
      connections: config.connections,
      duration: config.duration,
      pipelining: 1,
      timeout: 10,
    }, (err, result) => {
      if (err) {
        console.error('测试错误:', err);
        resolve(null);
        return;
      }
      
      console.log('\n📊 测试结果:');
      console.log(`  请求总数: ${result.requests.total}`);
      console.log(`  RPS(每秒请求): ${result.requests.average}`);
      console.log(`  吞吐量: ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/s`);
      console.log(`  平均延迟: ${result.latency.average.toFixed(2)}ms`);
      console.log(`  P50延迟: ${result.latency.p50}ms`);
      console.log(`  P95延迟: ${result.latency.p95}ms`);
      console.log(`  P99延迟: ${result.latency.p99}ms`);
      console.log(`  最大延迟: ${result.latency.max}ms`);
      console.log(`  2xx响应: ${result['2xx']}`);
      console.log(`  非2xx响应: ${result.non2xx}`);
      console.log(`  错误数: ${result.errors}`);
      console.log(`  超时数: ${result.timeouts}`);
      
      resolve(result);
    });

    // 实时进度
    autocannon.track(instance, { renderProgressBar: true });
  });
}

async function runAllTests() {
  console.log('\n🚀 开始压力测试 - 目标: ' + BASE_URL);
  console.log('时间: ' + new Date().toLocaleString());
  
  const results = [];
  
  for (const config of testConfigs) {
    const result = await runTest(config);
    if (result) {
      results.push({ name: config.name, ...result });
    }
    // 测试间隔，让服务器恢复
    await new Promise(r => setTimeout(r, 5000));
  }
  
  // 汇总报告
  console.log('\n\n' + '='.repeat(60));
  console.log('📋 压力测试汇总报告');
  console.log('='.repeat(60));
  
  results.forEach(r => {
    console.log(`\n【${r.name}】`);
    console.log(`  最大RPS: ${r.requests.max} | 平均RPS: ${r.requests.average}`);
    console.log(`  平均延迟: ${r.latency.average.toFixed(2)}ms | P99: ${r.latency.p99}ms`);
    console.log(`  成功率: ${((r['2xx'] / r.requests.total) * 100).toFixed(2)}%`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ 测试完成');
}

// 运行
runAllTests().catch(console.error);
