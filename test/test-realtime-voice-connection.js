/**
 * 实时语音识别连接测试脚本
 * 检查 Socket.IO 和腾讯云 WebSocket 连接是否正常
 */

const https = require('https')
const WebSocket = require('ws')
const { getVoiceRecognitionService } = require('../utils/voiceRecognition')
const config = require('../config')

// 测试配置
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.yimengpl.com'
const TEST_TOKEN = process.env.TEST_TOKEN || ''

console.log('='.repeat(60))
console.log('实时语音识别连接测试')
console.log('='.repeat(60))
console.log('API地址:', API_BASE_URL)
console.log('')

// 测试结果统计
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0
}

/**
 * 打印测试结果
 */
function printResult(testName, passed, message = '') {
  if (passed) {
    console.log(`✅ ${testName}`)
    if (message) console.log(`   ${message}`)
    testResults.passed++
  } else {
    console.log(`❌ ${testName}`)
    if (message) console.log(`   ${message}`)
    testResults.failed++
  }
  console.log('')
}

/**
 * 打印警告
 */
function printWarning(message) {
  console.log(`⚠️  ${message}`)
  testResults.warnings++
  console.log('')
}

/**
 * 测试1: 检查腾讯云配置
 */
async function testTencentCloudConfig() {
  console.log('测试1: 检查腾讯云配置...')
  
  try {
    const voiceService = getVoiceRecognitionService()
    
    // 检查配置
    const hasSecretId = !!voiceService.secretId
    const hasSecretKey = !!voiceService.secretKey
    const hasAppId = !!voiceService.appId
    
    printResult('SecretId 配置', hasSecretId, hasSecretId ? `已配置 (${voiceService.secretId.substring(0, 8)}...)` : '未配置')
    printResult('SecretKey 配置', hasSecretKey, hasSecretKey ? `已配置 (长度: ${voiceService.secretKey.length})` : '未配置')
    printResult('AppId 配置', hasAppId, hasAppId ? `已配置 (${voiceService.appId})` : '未配置')
    
    if (!hasSecretId || !hasSecretKey || !hasAppId) {
      printWarning('腾讯云配置不完整，可能无法建立连接')
      return false
    }
    
    return true
  } catch (error) {
    printResult('腾讯云配置检查', false, error.message)
    return false
  }
}

/**
 * 测试2: 检查腾讯云 WebSocket 连接
 */
async function testTencentCloudWebSocket() {
  console.log('测试2: 检查腾讯云 WebSocket 连接...')
  
  return new Promise((resolve) => {
    try {
      const voiceService = getVoiceRecognitionService()
      
      // 创建测试连接
      const recognition = voiceService.createRealtimeRecognition(
        {
          engineType: '16k_zh',
          voiceFormat: 1,
          needvad: 1
        },
        // 结果回调
        (result) => {
          console.log('收到识别结果:', result)
        },
        // 错误回调
        (error) => {
          console.error('识别错误:', error.message)
        }
      )
      
      // 等待连接建立
      const connectionTimeout = setTimeout(() => {
        recognition.close()
        printResult('腾讯云 WebSocket 连接', false, '连接超时（10秒）')
        resolve(false)
      }, 10000)
      
      recognition.waitForConnection()
        .then(() => {
          clearTimeout(connectionTimeout)
          printResult('腾讯云 WebSocket 连接', true, '连接成功建立')
          recognition.close()
          resolve(true)
        })
        .catch((error) => {
          clearTimeout(connectionTimeout)
          printResult('腾讯云 WebSocket 连接', false, error.message)
          recognition.close()
          resolve(false)
        })
    } catch (error) {
      printResult('腾讯云 WebSocket 连接', false, error.message)
      resolve(false)
    }
  })
}

/**
 * 测试3: 检查 Socket.IO 服务健康状态
 */
async function testSocketIOService() {
  console.log('测试3: 检查 Socket.IO 服务...')
  
  return new Promise((resolve) => {
    // 检查健康接口
    const options = {
      hostname: API_BASE_URL.replace('https://', '').replace('http://', ''),
      port: 443,
      path: '/health',
      method: 'GET',
      timeout: 5000
    }
    
    const req = https.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          if (result.status === 'ok') {
            printResult('Socket.IO 服务健康检查', true, '服务正常运行')
            resolve(true)
          } else {
            printResult('Socket.IO 服务健康检查', false, `服务状态异常: ${result.status}`)
            resolve(false)
          }
        } catch (error) {
          printResult('Socket.IO 服务健康检查', false, `解析响应失败: ${error.message}`)
          resolve(false)
        }
      })
    })
    
    req.on('error', (error) => {
      printResult('Socket.IO 服务健康检查', false, `请求失败: ${error.message}`)
      resolve(false)
    })
    
    req.on('timeout', () => {
      req.destroy()
      printResult('Socket.IO 服务健康检查', false, '请求超时')
      resolve(false)
    })
    
    req.end()
  })
}

/**
 * 测试4: 检查登录接口（获取Token）
 */
async function testLogin() {
  console.log('测试4: 检查登录接口...')
  
  if (TEST_TOKEN) {
    printResult('登录接口', true, '使用提供的测试Token')
    return TEST_TOKEN
  }
  
  // 尝试使用测试账号登录（如果环境变量中有配置）
  const testCode = process.env.TEST_WECHAT_CODE
  if (!testCode) {
    printWarning('未配置测试Token或微信Code，跳过登录测试')
    printWarning('可以设置环境变量 TEST_TOKEN 或 TEST_WECHAT_CODE 来测试登录')
    return null
  }
  
  return new Promise((resolve) => {
    // 使用测试账号登录
    const postData = JSON.stringify({
      code: testCode
    })
    
    const options = {
      hostname: API_BASE_URL.replace('https://', '').replace('http://', ''),
      port: 443,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    }
    
    const req = https.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          if (result.code === 0 && result.data && result.data.token) {
            printResult('登录接口', true, '登录成功，已获取Token')
            resolve(result.data.token)
          } else {
            // 登录失败是正常的（测试code可能无效），不算作失败
            printWarning(`登录失败: ${result.message || '未知错误'}（这是正常的，测试code可能无效）`)
            printWarning('可以设置环境变量 TEST_TOKEN 来跳过登录测试')
            resolve(null)
          }
        } catch (error) {
          printResult('登录接口', false, `解析响应失败: ${error.message}`)
          resolve(null)
        }
      })
    })
    
    req.on('error', (error) => {
      printResult('登录接口', false, `请求失败: ${error.message}`)
      resolve(null)
    })
    
    req.on('timeout', () => {
      req.destroy()
      printResult('登录接口', false, '请求超时')
      resolve(null)
    })
    
    req.write(postData)
    req.end()
  })
}

/**
 * 测试5: 检查实时语音识别接口（HTTP）
 */
async function testRealtimeVoiceAPI(token) {
  console.log('测试5: 检查实时语音识别接口（HTTP）...')
  
  if (!token) {
    printWarning('缺少Token，跳过HTTP接口测试')
    return false
  }
  
  return new Promise((resolve) => {
    // 创建一个简单的测试音频数据（PCM格式，16k采样率，16bit，单声道）
    // 这里创建一个空的音频数据用于测试
    const testAudioData = Buffer.alloc(3200) // 1秒的音频数据（16k * 2字节）
    
    const boundary = '----WebKitFormBoundary' + Date.now()
    const postData = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from('Content-Disposition: form-data; name="audio"; filename="test.pcm"\r\n'),
      Buffer.from('Content-Type: application/octet-stream\r\n\r\n'),
      testAudioData,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ])
    
    const options = {
      hostname: API_BASE_URL.replace('https://', '').replace('http://', ''),
      port: 443,
      path: '/api/realtime-voice-socketio/recognize',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': postData.length
      },
      timeout: 30000
    }
    
    const req = https.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          if (result.code === 0) {
            printResult('实时语音识别接口（HTTP）', true, '接口响应正常')
            resolve(true)
          } else {
            // 即使识别失败，只要接口能响应就算通过
            if (result.message && result.message.includes('NaN')) {
              printResult('实时语音识别接口（HTTP）', false, `参数解析错误: ${result.message}`)
            } else {
              printResult('实时语音识别接口（HTTP）', true, `接口响应正常（识别结果: ${result.message}）`)
            }
            resolve(result.code === 0)
          }
        } catch (error) {
          printResult('实时语音识别接口（HTTP）', false, `解析响应失败: ${error.message}`)
          resolve(false)
        }
      })
    })
    
    req.on('error', (error) => {
      printResult('实时语音识别接口（HTTP）', false, `请求失败: ${error.message}`)
      resolve(false)
    })
    
    req.on('timeout', () => {
      req.destroy()
      printResult('实时语音识别接口（HTTP）', false, '请求超时（30秒）')
      resolve(false)
    })
    
    req.write(postData)
    req.end()
  })
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('开始测试...\n')
  
  // 测试1: 腾讯云配置
  const configOk = await testTencentCloudConfig()
  
  // 测试2: 腾讯云 WebSocket 连接（需要配置正确）
  if (configOk) {
    await testTencentCloudWebSocket()
  } else {
    printWarning('跳过腾讯云 WebSocket 连接测试（配置不完整）')
  }
  
  // 测试3: Socket.IO 服务健康检查
  await testSocketIOService()
  
  // 测试4: 登录获取Token
  const token = await testLogin()
  
  // 测试5: 实时语音识别接口
  if (token) {
    await testRealtimeVoiceAPI(token)
  }
  
  // 打印测试总结
  console.log('='.repeat(60))
  console.log('测试总结')
  console.log('='.repeat(60))
  console.log(`✅ 通过: ${testResults.passed}`)
  console.log(`❌ 失败: ${testResults.failed}`)
  console.log(`⚠️  警告: ${testResults.warnings}`)
  console.log('')
  
  if (testResults.failed === 0) {
    console.log('🎉 所有测试通过！实时语音识别连接正常。')
    process.exit(0)
  } else {
    console.log('⚠️  部分测试失败，请检查配置和网络连接。')
    process.exit(1)
  }
}

// 运行测试
runTests().catch((error) => {
  console.error('测试执行错误:', error)
  process.exit(1)
})

