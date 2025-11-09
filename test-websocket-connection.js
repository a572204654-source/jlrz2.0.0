/**
 * WebSocket 连接诊断工具
 * 用于快速诊断 WebSocket 连接问题
 * 
 * 使用方法：
 * node test-websocket-connection.js
 */

const http = require('http')
const https = require('https')
const WebSocket = require('ws')

// 配置
const config = {
  // 本地测试
  local: {
    http: 'http://localhost/api/realtime-voice/stream',
    ws: 'ws://localhost/api/realtime-voice/stream'
  },
  // 云端测试
  cloud: {
    http: 'https://api.yimengpl.com/api/realtime-voice/stream',
    ws: 'wss://api.yimengpl.com/api/realtime-voice/stream'
  }
}

console.log('╔══════════════════════════════════════════════════════════╗')
console.log('║         WebSocket 连接诊断工具                           ║')
console.log('╚══════════════════════════════════════════════════════════╝\n')

/**
 * 测试1：检查本地服务是否运行
 */
async function testLocalService() {
  console.log('🧪 测试1: 检查本地服务')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  return new Promise((resolve) => {
    const req = http.get('http://localhost/health', (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ 本地服务运行正常')
          console.log('   响应:', data)
          resolve(true)
        } else {
          console.log('❌ 本地服务响应异常')
          console.log('   状态码:', res.statusCode)
          resolve(false)
        }
      })
    })
    
    req.on('error', (err) => {
      console.log('❌ 本地服务未运行')
      console.log('   错误:', err.message)
      console.log('   提示: 请先运行 npm start 启动服务')
      resolve(false)
    })
    
    req.end()
  })
}

/**
 * 测试2：检查本地 WebSocket 连接
 */
async function testLocalWebSocket() {
  console.log('\n🧪 测试2: 本地 WebSocket 连接')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(config.local.ws)
      
      const timeout = setTimeout(() => {
        console.log('❌ 连接超时（5秒）')
        ws.close()
        resolve(false)
      }, 5000)
      
      ws.on('open', () => {
        clearTimeout(timeout)
        console.log('✅ 本地 WebSocket 连接成功')
        console.log('   地址:', config.local.ws)
        
        // 发送测试消息
        ws.send(JSON.stringify({
          type: 'start',
          userId: 1,
          token: 'test_token',
          engineType: '16k_zh'
        }))
        
        setTimeout(() => {
          ws.close()
          resolve(true)
        }, 1000)
      })
      
      ws.on('error', (err) => {
        clearTimeout(timeout)
        console.log('❌ 本地 WebSocket 连接失败')
        console.log('   错误:', err.message)
        resolve(false)
      })
      
      ws.on('message', (data) => {
        console.log('📩 收到服务端消息:', data.toString())
      })
      
    } catch (error) {
      console.log('❌ 创建 WebSocket 连接失败')
      console.log('   错误:', error.message)
      resolve(false)
    }
  })
}

/**
 * 测试3：检查云端服务是否可访问
 */
async function testCloudService() {
  console.log('\n🧪 测试3: 检查云端服务')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  return new Promise((resolve) => {
    const req = https.get('https://api.yimengpl.com/health', (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ 云端服务运行正常')
          console.log('   响应:', data)
          resolve(true)
        } else {
          console.log('❌ 云端服务响应异常')
          console.log('   状态码:', res.statusCode)
          resolve(false)
        }
      })
    })
    
    req.on('error', (err) => {
      console.log('❌ 云端服务无法访问')
      console.log('   错误:', err.message)
      console.log('   提示: 请检查云托管服务是否正常运行')
      resolve(false)
    })
    
    req.setTimeout(10000, () => {
      console.log('❌ 连接超时（10秒）')
      req.destroy()
      resolve(false)
    })
    
    req.end()
  })
}

/**
 * 测试4：检查云端 WebSocket 连接
 */
async function testCloudWebSocket() {
  console.log('\n🧪 测试4: 云端 WebSocket 连接')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(config.cloud.ws)
      
      const timeout = setTimeout(() => {
        console.log('❌ 连接超时（10秒）')
        console.log('   可能原因:')
        console.log('   1. 云托管环境不支持 WebSocket')
        console.log('   2. 防火墙或负载均衡器阻止了 WebSocket 连接')
        console.log('   3. SSL 证书问题')
        ws.close()
        resolve(false)
      }, 10000)
      
      ws.on('open', () => {
        clearTimeout(timeout)
        console.log('✅ 云端 WebSocket 连接成功')
        console.log('   地址:', config.cloud.ws)
        console.log('   提示: 如果小程序仍连接失败，请检查微信小程序后台的 socket 合法域名配置')
        
        // 发送测试消息
        ws.send(JSON.stringify({
          type: 'start',
          userId: 1,
          token: 'test_token',
          engineType: '16k_zh'
        }))
        
        setTimeout(() => {
          ws.close()
          resolve(true)
        }, 2000)
      })
      
      ws.on('error', (err) => {
        clearTimeout(timeout)
        console.log('❌ 云端 WebSocket 连接失败')
        console.log('   错误:', err.message)
        console.log('   可能原因:')
        console.log('   1. 云托管环境未正确配置 WebSocket 支持')
        console.log('   2. SSL/TLS 证书问题')
        console.log('   3. 端口或协议配置错误')
        resolve(false)
      })
      
      ws.on('message', (data) => {
        console.log('📩 收到服务端消息:', data.toString())
      })
      
    } catch (error) {
      console.log('❌ 创建 WebSocket 连接失败')
      console.log('   错误:', error.message)
      resolve(false)
    }
  })
}

/**
 * 测试5：检查依赖包
 */
async function testDependencies() {
  console.log('\n🧪 测试5: 检查依赖包')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  try {
    const packageJson = require('./package.json')
    const dependencies = packageJson.dependencies || {}
    
    // 检查 WebSocket 相关依赖
    const requiredDeps = {
      'ws': 'WebSocket 客户端库',
      'express-ws': 'Express WebSocket 中间件'
    }
    
    let allInstalled = true
    
    for (const [dep, desc] of Object.entries(requiredDeps)) {
      if (dependencies[dep]) {
        console.log(`✅ ${dep} (${desc})`)
        console.log(`   版本: ${dependencies[dep]}`)
      } else {
        console.log(`❌ ${dep} (${desc}) - 未安装`)
        allInstalled = false
      }
    }
    
    if (!allInstalled) {
      console.log('\n   提示: 运行 npm install 安装缺失的依赖')
    }
    
    return allInstalled
    
  } catch (error) {
    console.log('❌ 无法读取 package.json')
    console.log('   错误:', error.message)
    return false
  }
}

/**
 * 主函数
 */
async function main() {
  // 检查依赖
  await testDependencies()
  
  // 测试本地环境
  const localServiceOk = await testLocalService()
  if (localServiceOk) {
    await testLocalWebSocket()
  }
  
  // 测试云端环境
  const cloudServiceOk = await testCloudService()
  if (cloudServiceOk) {
    await testCloudWebSocket()
  }
  
  // 总结
  console.log('\n╔══════════════════════════════════════════════════════════╗')
  console.log('║         诊断完成                                          ║')
  console.log('╚══════════════════════════════════════════════════════════╝\n')
  
  console.log('📋 小程序配置建议:\n')
  
  if (localServiceOk) {
    console.log('✅ 本地开发环境')
    console.log('   在小程序 app.js 中设置:')
    console.log('   globalData: { apiUrl: \'http://localhost\' }\n')
    console.log('   微信开发者工具设置:')
    console.log('   ☑️ 不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书\n')
  }
  
  if (cloudServiceOk) {
    console.log('✅ 云端生产环境')
    console.log('   在小程序 app.js 中设置:')
    console.log('   globalData: { apiUrl: \'https://api.yimengpl.com\' }\n')
    console.log('   微信小程序后台配置:')
    console.log('   1. request 合法域名: https://api.yimengpl.com')
    console.log('   2. socket 合法域名: wss://api.yimengpl.com\n')
  }
  
  console.log('📚 查看详细解决方案:')
  console.log('   docs/WebSocket连接问题解决方案.md\n')
  
  console.log('🔧 常见问题:')
  console.log('   1. 小程序报 "未完成的操作" → 检查微信后台 socket 合法域名')
  console.log('   2. 本地测试失败 → 确保服务已启动 (npm start)')
  console.log('   3. 云端连接失败 → 检查云托管 WebSocket 支持配置')
  console.log('   4. SSL 证书错误 → 确保域名有有效的 HTTPS 证书\n')
}

// 运行诊断
main().catch((error) => {
  console.error('\n❌ 诊断工具执行失败:', error)
  process.exit(1)
})











