#!/usr/bin/env node

/**
 * WebSocket连接测试脚本
 * 用于验证修复后的WebSocket连接是否正常
 */

const WebSocket = require('ws')

// 从环境变量或命令行参数获取服务器地址
const serverUrl = process.argv[2] || process.env.WS_URL || 'ws://localhost:80'

// 测试接口路径
const testPath = '/api/realtime-voice/test'
const streamPath = '/api/realtime-voice/stream'

const fullTestUrl = `${serverUrl}${testPath}`
const fullStreamUrl = `${serverUrl}${streamPath}`

console.log('==================================')
console.log('WebSocket连接测试')
console.log('==================================')
console.log(`服务器地址: ${serverUrl}`)
console.log(`测试接口: ${fullTestUrl}`)
console.log(`识别接口: ${fullStreamUrl}`)
console.log('==================================\n')

// 测试1: 测试接口连接
function testConnection() {
  return new Promise((resolve, reject) => {
    console.log('📡 正在连接测试接口...')
    
    const ws = new WebSocket(fullTestUrl, {
      handshakeTimeout: 5000 // 5秒超时
    })
    
    let connected = false
    let receivedWelcome = false
    
    ws.on('open', () => {
      connected = true
      console.log('✅ WebSocket连接已建立')
      
      // 发送测试消息
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'test',
          message: 'Hello from test client'
        }))
      }, 100)
    })
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString())
        console.log('📨 收到消息:', JSON.stringify(message, null, 2))
        
        if (message.type === 'welcome') {
          receivedWelcome = true
          console.log('✅ 收到欢迎消息')
        } else if (message.type === 'echo') {
          console.log('✅ 消息回显正常')
          ws.close()
          resolve(true)
        }
      } catch (error) {
        console.error('❌ 解析消息失败:', error)
      }
    })
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket错误:', error.message)
      if (error.code === 'ECONNREFUSED') {
        console.error('   连接被拒绝，请检查服务器是否运行')
      } else if (error.code === 'ETIMEDOUT') {
        console.error('   连接超时，请检查网络和服务器地址')
      }
      reject(error)
    })
    
    ws.on('close', (code, reason) => {
      if (connected) {
        console.log(`🔌 连接已关闭 (code: ${code})`)
        if (reason) {
          console.log(`   原因: ${reason}`)
        }
      } else {
        console.log('❌ 连接未建立就关闭了')
        reject(new Error('连接未建立'))
      }
    })
    
    // 超时处理
    setTimeout(() => {
      if (!connected) {
        ws.terminate()
        reject(new Error('连接超时（5秒）'))
      } else if (!receivedWelcome) {
        ws.close()
        reject(new Error('未收到欢迎消息'))
      }
    }, 5000)
  })
}

// 测试2: 识别接口连接（不发送数据，只测试连接）
function testStreamConnection() {
  return new Promise((resolve, reject) => {
    console.log('\n📡 正在连接识别接口...')
    
    const ws = new WebSocket(fullStreamUrl, {
      handshakeTimeout: 5000
    })
    
    let connected = false
    
    ws.on('open', () => {
      connected = true
      console.log('✅ 识别接口连接已建立')
      
      // 不发送start消息，直接关闭（只测试连接）
      setTimeout(() => {
        ws.close()
        resolve(true)
      }, 500)
    })
    
    ws.on('error', (error) => {
      console.error('❌ 识别接口连接错误:', error.message)
      reject(error)
    })
    
    ws.on('close', () => {
      if (connected) {
        console.log('✅ 识别接口连接测试完成')
      }
    })
    
    // 超时处理
    setTimeout(() => {
      if (!connected) {
        ws.terminate()
        reject(new Error('识别接口连接超时'))
      }
    }, 5000)
  })
}

// 运行测试
async function runTests() {
  try {
    // 测试1: 测试接口
    await testConnection()
    console.log('\n✅ 测试接口连接正常\n')
    
    // 测试2: 识别接口
    await testStreamConnection()
    console.log('\n✅ 识别接口连接正常\n')
    
    console.log('==================================')
    console.log('✅ 所有测试通过！WebSocket连接正常')
    console.log('==================================')
    process.exit(0)
  } catch (error) {
    console.error('\n==================================')
    console.error('❌ 测试失败:', error.message)
    console.error('==================================')
    console.error('\n可能的原因:')
    console.error('1. 服务器未启动')
    console.error('2. express-ws 未正确初始化')
    console.error('3. 网络连接问题')
    console.error('4. 防火墙阻止连接')
    console.error('\n请检查:')
    console.error('- 服务器是否正在运行')
    console.error('- bin/www 中 express-ws 是否已初始化')
    console.error('- 服务器地址是否正确')
    process.exit(1)
  }
}

runTests()

