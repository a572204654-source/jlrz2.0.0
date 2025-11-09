/**
 * 诊断腾讯云 API 签名问题
 * 用于排查 "The provided credentials could not be validated" 错误
 */

require('dotenv').config()
const crypto = require('crypto')

console.log('\n🔍 腾讯云 API 签名问题诊断工具\n')
console.log('='.repeat(60))

// 1. 检查环境变量配置
console.log('\n[1] 检查环境变量配置:')
const secretId = process.env.TENCENTCLOUD_SECRET_ID || process.env.TENCENT_SECRET_ID
const secretKey = process.env.TENCENTCLOUD_SECRET_KEY || process.env.TENCENT_SECRET_KEY
const region = process.env.TENCENT_REGION || 'ap-guangzhou'

if (!secretId) {
  console.log('  ❌ TENCENTCLOUD_SECRET_ID 或 TENCENT_SECRET_ID 未设置')
} else {
  console.log('  ✅ SecretId 已配置')
  console.log(`     长度: ${secretId.length} 字符`)
  console.log(`     前8位: ${secretId.substring(0, 8)}...`)
}

if (!secretKey) {
  console.log('  ❌ TENCENTCLOUD_SECRET_KEY 或 TENCENT_SECRET_KEY 未设置')
} else {
  console.log('  ✅ SecretKey 已配置')
  console.log(`     长度: ${secretKey.length} 字符`)
  
  // SecretKey 通常为 40 个字符
  if (secretKey.length < 32) {
    console.log('  ⚠️  警告: SecretKey 长度异常（通常为40字符），可能导致签名验证失败')
  } else if (secretKey.length === 40) {
    console.log('  ✅ SecretKey 长度正常')
  } else {
    console.log('  ⚠️  注意: SecretKey 长度非标准（通常为40字符）')
  }
  console.log(`     前8位: ${secretKey.substring(0, 8)}...`)
}

// 2. 检查时区设置
console.log('\n[2] 检查时区设置:')
const now = new Date()
const localTime = now.toLocaleString('zh-CN', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })
const utcTime = now.toUTCString()
const localTimestamp = Math.floor(now.getTime() / 1000)
const utcTimestamp = Math.floor(Date.now() / 1000)

console.log(`  本地时间: ${localTime}`)
console.log(`  UTC 时间: ${utcTime}`)
console.log(`  本地时间戳: ${localTimestamp}`)
console.log(`  UTC 时间戳: ${utcTimestamp}`)

// 检查时区偏移
const timezoneOffset = now.getTimezoneOffset()
const offsetHours = Math.abs(timezoneOffset / 60)
const offsetSign = timezoneOffset > 0 ? '-' : '+'
console.log(`  时区偏移: UTC${offsetSign}${offsetHours}`)

if (timezoneOffset !== 0) {
  console.log('  ⚠️  注意: 系统时区不是 UTC，但代码已使用 UTC 时间戳，应该没问题')
}

// 3. 测试签名生成（使用 UTC 时区）
console.log('\n[3] 测试签名生成（UTC 时区）:')
if (!secretId || !secretKey) {
  console.log('  ❌ 无法测试签名（缺少密钥配置）')
} else {
  try {
    // 使用 UTC 时间戳
    const timestamp = Math.floor(Date.now() / 1000)
    
    // 使用 UTC 方法获取日期
    const date = new Date(timestamp * 1000)
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    console.log(`  时间戳: ${timestamp}`)
    console.log(`  日期字符串: ${dateStr}`)
    
    // 测试 WebSocket 签名
    const wsSignStr = `${secretId}${timestamp}`
    const wsSignature = crypto
      .createHmac('sha1', secretKey)
      .update(wsSignStr)
      .digest('base64')
    
    console.log('  ✅ WebSocket 签名生成成功')
    console.log(`     签名前20字符: ${wsSignature.substring(0, 20)}...`)
    
    // 测试 API 签名（简化版）
    const service = 'asr'
    const host = 'asr.tencentcloudapi.com'
    const action = 'SentenceRecognition'
    const version = '2019-06-14'
    
    const testPayload = {
      ProjectId: 0,
      SubServiceType: 2,
      EngineModelType: '16k_zh',
      VoiceFormat: 1,
      UsrAudioKey: 'test',
      Data: Buffer.from('test').toString('base64'),
      DataLen: 4
    }
    
    // 构建规范请求串
    const headers = {
      'content-type': 'application/json; charset=utf-8',
      'host': host,
      'x-tc-action': action.toLowerCase(),
      'x-tc-region': region.toLowerCase(),
      'x-tc-timestamp': timestamp.toString(),
      'x-tc-version': version
    }
    
    const sortedHeaderKeys = Object.keys(headers).sort()
    const canonicalHeaders = sortedHeaderKeys
      .map(key => `${key}:${headers[key]}`)
      .join('\n') + '\n'
    
    const signedHeaders = sortedHeaderKeys.join(';')
    const hashedRequestPayload = crypto
      .createHash('sha256')
      .update(JSON.stringify(testPayload))
      .digest('hex')
    
    const canonicalRequest = [
      'POST',
      '/',
      '',
      canonicalHeaders,
      signedHeaders,
      hashedRequestPayload
    ].join('\n')
    
    const credentialScope = `${dateStr}/${service}/tc3_request`
    const hashedCanonicalRequest = crypto
      .createHash('sha256')
      .update(canonicalRequest)
      .digest('hex')
    
    const stringToSign = [
      'TC3-HMAC-SHA256',
      timestamp.toString(),
      credentialScope,
      hashedCanonicalRequest
    ].join('\n')
    
    // 计算签名
    const kDate = crypto
      .createHmac('sha256', `TC3${secretKey}`)
      .update(dateStr)
      .digest()
    
    const kService = crypto
      .createHmac('sha256', kDate)
      .update(service)
      .digest()
    
    const kSigning = crypto
      .createHmac('sha256', kService)
      .update('tc3_request')
      .digest()
    
    const signature = crypto
      .createHmac('sha256', kSigning)
      .update(stringToSign)
      .digest('hex')
    
    console.log('  ✅ API 签名生成成功')
    console.log(`     签名前20字符: ${signature.substring(0, 20)}...`)
    console.log(`     日期字符串: ${dateStr}`)
    console.log(`     凭证范围: ${credentialScope}`)
    
  } catch (error) {
    console.log('  ❌ 签名生成失败:', error.message)
    console.error(error)
  }
}

// 4. 检查代理设置
console.log('\n[4] 检查代理设置:')
const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy
const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy

if (httpProxy) {
  console.log(`  ✅ HTTP_PROXY: ${httpProxy.replace(/:[^:@]+@/, ':****@')}`)
} else {
  console.log('  ℹ️  HTTP_PROXY 未设置')
}

if (httpsProxy) {
  console.log(`  ✅ HTTPS_PROXY: ${httpsProxy.replace(/:[^:@]+@/, ':****@')}`)
} else {
  console.log('  ℹ️  HTTPS_PROXY 未设置')
}

if (httpProxy || httpsProxy) {
  console.log('  ⚠️  注意: 如果使用代理，请确保代理配置正确，且不会修改请求头')
}

// 5. 常见问题排查建议
console.log('\n[5] 常见问题排查建议:')
console.log('  1. SecretKey 错误:')
console.log('     - 检查环境变量 TENCENTCLOUD_SECRET_KEY 是否正确')
console.log('     - 确认没有多余的空格或换行符')
console.log('     - 在腾讯云控制台重新生成密钥对')
console.log('')
console.log('  2. 时区问题:')
console.log('     - 代码已使用 UTC 时区，应该没问题')
console.log('     - 如果仍有问题，检查系统时间是否准确')
console.log('')
console.log('  3. 网络代理问题:')
console.log('     - 如果使用代理，确保代理不会修改请求头')
console.log('     - 尝试禁用代理测试')
console.log('     - 检查防火墙设置')
console.log('')
console.log('  4. 其他可能原因:')
console.log('     - 检查 SecretId 和 SecretKey 是否匹配')
console.log('     - 确认账户有语音识别服务的权限')
console.log('     - 检查 API 调用频率是否超限')

console.log('\n' + '='.repeat(60))
console.log('✅ 诊断完成\n')






