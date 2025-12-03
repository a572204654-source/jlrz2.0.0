/**
 * 压力测试脚本 - 使用 k6
 * 
 * 安装 k6: 
 *   Windows: choco install k6  或  winget install k6
 *   macOS: brew install k6
 *   Linux: https://k6.io/docs/getting-started/installation/
 * 
 * 运行测试:
 *   k6 run scripts/load-test.js
 * 
 * 逐步增加压力:
 *   k6 run --vus 50 --duration 30s scripts/load-test.js
 *   k6 run --vus 100 --duration 60s scripts/load-test.js
 *   k6 run --vus 200 --duration 60s scripts/load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// 自定义指标
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');

// 配置
const BASE_URL = 'https://api.yimengpl.com';

// 测试配置 - 阶梯式压力测试
export const options = {
  // 阶段性增加压力
  stages: [
    { duration: '30s', target: 10 },   // 预热：30秒内增加到10个用户
    { duration: '1m', target: 50 },    // 第一阶段：1分钟保持50个用户
    { duration: '1m', target: 100 },   // 第二阶段：1分钟保持100个用户
    { duration: '1m', target: 200 },   // 第三阶段：1分钟保持200个用户
    { duration: '30s', target: 0 },    // 冷却：30秒内降到0
  ],
  
  // 性能阈值
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95%请求应在2秒内完成
    http_req_failed: ['rate<0.1'],       // 错误率低于10%
    errors: ['rate<0.1'],
  },
};

// 测试场景
export default function () {
  // 1. 健康检查接口（轻量）
  group('健康检查', () => {
    const res = http.get(`${BASE_URL}/health`);
    const success = check(res, {
      '状态码200': (r) => r.status === 200,
      '响应时间<500ms': (r) => r.timings.duration < 500,
    });
    errorRate.add(!success);
    apiLatency.add(res.timings.duration);
  });

  sleep(0.5);

  // 2. API根路径
  group('API信息', () => {
    const res = http.get(`${BASE_URL}/api`);
    const success = check(res, {
      '状态码200': (r) => r.status === 200,
      '返回JSON': (r) => r.headers['Content-Type'].includes('application/json'),
    });
    errorRate.add(!success);
    apiLatency.add(res.timings.duration);
  });

  sleep(0.5);

  // 3. 天气接口（如果可访问）
  group('天气查询', () => {
    const res = http.get(`${BASE_URL}/api/weather/current?location=广州`);
    const success = check(res, {
      '状态码2xx或4xx': (r) => r.status < 500,  // 不考虑认证问题
      '响应时间<3000ms': (r) => r.timings.duration < 3000,
    });
    errorRate.add(!success);
    apiLatency.add(res.timings.duration);
  });

  sleep(1);
}

// 测试完成后的汇总
export function handleSummary(data) {
  const summary = {
    '测试时间': new Date().toISOString(),
    '总请求数': data.metrics.http_reqs.values.count,
    '平均响应时间': `${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`,
    'P95响应时间': `${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`,
    'P99响应时间': `${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms`,
    '最大响应时间': `${data.metrics.http_req_duration.values.max.toFixed(2)}ms`,
    '请求成功率': `${((1 - data.metrics.http_req_failed.values.rate) * 100).toFixed(2)}%`,
    'RPS(每秒请求)': data.metrics.http_reqs.values.rate.toFixed(2),
    '虚拟用户峰值': data.metrics.vus_max.values.value,
  };
  
  console.log('\n============================================');
  console.log('           压力测试结果汇总');
  console.log('============================================');
  Object.entries(summary).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
  });
  console.log('============================================\n');
  
  return {
    'stdout': JSON.stringify(summary, null, 2),
    'scripts/load-test-result.json': JSON.stringify(data, null, 2),
  };
}
