/**
 * AI聊天功能测试脚本
 * 测试会话管理、消息发送、文件上传
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const FormData = require('form-data')

// 数据库配置
const DB_CONFIG = {
  host: 'sh-cynosdbmysql-grp-goudlu7k.sql.tencentcdb.com',
  port: 22087,
  user: 'a572204654',
  password: '572204654aA',
  database: 'jlzr1101-5g9kplxza13a780d'
}

const JWT_SECRET = 'supervision-log-jwt-secret-XyZ9@2024!Abc'

// 配置
const BASE_URL = 'http://localhost:3000'
const CLOUD_URL = 'https://api.yimengpl.com'

// 使用本地测试
const API_URL = BASE_URL

let authToken = null
let testSessionId = null
let uploadedAttachmentId = null

// 颜色输出
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`
}

async function request(method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${API_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }
    if (authToken) {
      config.headers['Authorization'] = `Bearer ${authToken}`
    }
    if (data) {
      config.data = data
    }
    const response = await axios(config)
    return response.data
  } catch (error) {
    if (error.response) {
      return error.response.data
    }
    throw error
  }
}

async function uploadFile(filePath) {
  const form = new FormData()
  form.append('files', fs.createReadStream(filePath))
  if (testSessionId) {
    form.append('sessionId', testSessionId)
  }

  try {
    const response = await axios.post(`${API_URL}/api/ai/chat/upload`, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${authToken}`
      }
    })
    return response.data
  } catch (error) {
    if (error.response) {
      return error.response.data
    }
    throw error
  }
}

// 测试函数
async function testLogin() {
  console.log(colors.cyan('\n===== 1. 生成测试Token ====='))
  
  const mysql = require('mysql2/promise')
  const jwt = require('jsonwebtoken')
  
  try {
    // 连接数据库获取一个现有用户
    const connection = await mysql.createConnection(DB_CONFIG)
    
    const [users] = await connection.execute(
      'SELECT id, nickname FROM users LIMIT 1'
    )
    await connection.end()
    
    if (users.length === 0) {
      console.log(colors.red('✗ 数据库中没有用户'))
      return false
    }
    
    const user = users[0]
    
    // 生成JWT Token
    authToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
    
    console.log(colors.green('✓ Token生成成功'))
    console.log('  用户ID:', user.id)
    console.log('  昵称:', user.nickname)
    return true
  } catch (error) {
    console.log(colors.red('✗ 生成Token失败:'), error.message)
    return false
  }
}

async function testCreateSession() {
  console.log(colors.cyan('\n===== 2. 测试创建会话 ====='))
  
  const result = await request('POST', '/api/ai/chat/sessions', {
    title: '测试会话 - ' + new Date().toLocaleTimeString()
  })
  
  if (result.code === 0) {
    testSessionId = result.data.sessionId
    console.log(colors.green('✓ 会话创建成功'))
    console.log('  会话ID:', testSessionId)
    console.log('  标题:', result.data.title)
    return true
  } else {
    console.log(colors.red('✗ 创建会话失败:'), result.message)
    return false
  }
}

async function testGetSessions() {
  console.log(colors.cyan('\n===== 3. 测试获取会话列表 ====='))
  
  const result = await request('GET', '/api/ai/chat/sessions?page=1&pageSize=10')
  
  if (result.code === 0) {
    console.log(colors.green('✓ 获取会话列表成功'))
    console.log('  总会话数:', result.data.total)
    console.log('  当前页数量:', result.data.list.length)
    if (result.data.list.length > 0) {
      console.log('  最新会话:', result.data.list[0].title)
    }
    return true
  } else {
    console.log(colors.red('✗ 获取会话列表失败:'), result.message)
    return false
  }
}

async function testFileUpload() {
  console.log(colors.cyan('\n===== 4. 测试文件上传 ====='))
  
  const testFile = path.join(__dirname, '../output/测试导出.docx')
  
  if (!fs.existsSync(testFile)) {
    console.log(colors.yellow('! 测试文件不存在，跳过上传测试'))
    return false
  }
  
  console.log('  上传文件:', testFile)
  const result = await uploadFile(testFile)
  
  if (result.code === 0) {
    console.log(colors.green('✓ 文件上传成功'))
    console.log('  文件数量:', result.data.count)
    if (result.data.files && result.data.files.length > 0) {
      const file = result.data.files[0]
      uploadedAttachmentId = file.id
      console.log('  文件名:', file.fileName)
      console.log('  文件类型:', file.fileType)
      console.log('  文件大小:', file.fileSize, 'bytes')
      console.log('  文件URL:', file.fileUrl)
    }
    return true
  } else {
    console.log(colors.red('✗ 文件上传失败:'), result.message)
    return false
  }
}

async function testSendMessage() {
  console.log(colors.cyan('\n===== 5. 测试发送消息（AI对话）====='))
  
  if (!testSessionId) {
    console.log(colors.yellow('! 没有会话ID，跳过'))
    return false
  }
  
  console.log('  发送消息: "你好，请介绍一下你自己"')
  console.log('  等待AI响应中...')
  
  const result = await request('POST', '/api/ai/chat/messages', {
    sessionId: testSessionId,
    content: '你好，请介绍一下你自己'
  })
  
  if (result.code === 0) {
    console.log(colors.green('✓ 消息发送成功'))
    console.log('  用户消息ID:', result.data.userMessage.id)
    console.log('  AI回复ID:', result.data.aiMessage.id)
    console.log('  AI回复内容:', result.data.aiMessage.content.substring(0, 100) + '...')
    return true
  } else {
    console.log(colors.red('✗ 发送消息失败:'), result.message)
    return false
  }
}

async function testSendMessageWithAttachment() {
  console.log(colors.cyan('\n===== 6. 测试发送带附件的消息 ====='))
  
  if (!testSessionId || !uploadedAttachmentId) {
    console.log(colors.yellow('! 没有会话ID或附件ID，跳过'))
    return false
  }
  
  console.log('  发送消息: "这是一份监理日志文件，请帮我简单描述一下"')
  console.log('  附件ID:', uploadedAttachmentId)
  console.log('  等待AI响应中...')
  
  const result = await request('POST', '/api/ai/chat/messages', {
    sessionId: testSessionId,
    content: '这是一份监理日志文件，请帮我简单描述一下',
    attachmentIds: [uploadedAttachmentId]
  })
  
  if (result.code === 0) {
    console.log(colors.green('✓ 带附件消息发送成功'))
    console.log('  附件数量:', result.data.userMessage.attachments.length)
    console.log('  AI回复:', result.data.aiMessage.content.substring(0, 100) + '...')
    return true
  } else {
    console.log(colors.red('✗ 发送消息失败:'), result.message)
    return false
  }
}

async function testGetMessages() {
  console.log(colors.cyan('\n===== 7. 测试获取消息历史 ====='))
  
  if (!testSessionId) {
    console.log(colors.yellow('! 没有会话ID，跳过'))
    return false
  }
  
  const result = await request('GET', `/api/ai/chat/messages?sessionId=${testSessionId}`)
  
  if (result.code === 0) {
    console.log(colors.green('✓ 获取消息历史成功'))
    console.log('  消息总数:', result.data.total)
    result.data.list.forEach((msg, i) => {
      console.log(`  [${i + 1}] ${msg.type}: ${msg.content.substring(0, 50)}...`)
    })
    return true
  } else {
    console.log(colors.red('✗ 获取消息历史失败:'), result.message)
    return false
  }
}

async function testRenameSession() {
  console.log(colors.cyan('\n===== 8. 测试重命名会话 ====='))
  
  if (!testSessionId) {
    console.log(colors.yellow('! 没有会话ID，跳过'))
    return false
  }
  
  const newTitle = 'AI功能测试会话 - 已完成'
  const result = await request('PUT', `/api/ai/chat/sessions/${testSessionId}`, {
    title: newTitle
  })
  
  if (result.code === 0) {
    console.log(colors.green('✓ 会话重命名成功'))
    console.log('  新标题:', result.data.title)
    return true
  } else {
    console.log(colors.red('✗ 重命名失败:'), result.message)
    return false
  }
}

async function checkDatabase() {
  console.log(colors.cyan('\n===== 9. 检查数据库数据 ====='))
  
  const mysql = require('mysql2/promise')
  
  const connection = await mysql.createConnection(DB_CONFIG)
  
  try {
    // 检查会话表
    const [sessions] = await connection.execute(
      'SELECT COUNT(*) as count FROM ai_chat_sessions'
    )
    console.log(colors.green('✓ ai_chat_sessions 表'))
    console.log('  总记录数:', sessions[0].count)
    
    // 检查消息表
    const [messages] = await connection.execute(
      'SELECT COUNT(*) as count FROM ai_chat_logs'
    )
    console.log(colors.green('✓ ai_chat_logs 表'))
    console.log('  总记录数:', messages[0].count)
    
    // 检查附件表
    const [attachments] = await connection.execute(
      'SELECT COUNT(*) as count FROM ai_chat_attachments'
    )
    console.log(colors.green('✓ ai_chat_attachments 表'))
    console.log('  总记录数:', attachments[0].count)
    
    // 检查最新会话
    const [latestSessions] = await connection.execute(
      'SELECT session_id, title, message_count, updated_at FROM ai_chat_sessions ORDER BY updated_at DESC LIMIT 3'
    )
    console.log('\n  最新3个会话:')
    latestSessions.forEach((s, i) => {
      console.log(`  [${i + 1}] ${s.title} (消息数: ${s.message_count})`)
    })
    
    return true
  } finally {
    await connection.end()
  }
}

// 主测试流程
async function runTests() {
  console.log('='.repeat(50))
  console.log('AI聊天功能测试')
  console.log('='.repeat(50))
  console.log('API地址:', API_URL)
  console.log('开始时间:', new Date().toLocaleString())
  
  const results = {
    passed: 0,
    failed: 0
  }
  
  try {
    // 1. 登录
    if (await testLogin()) results.passed++; else results.failed++
    
    // 2. 创建会话
    if (await testCreateSession()) results.passed++; else results.failed++
    
    // 3. 获取会话列表
    if (await testGetSessions()) results.passed++; else results.failed++
    
    // 4. 文件上传
    if (await testFileUpload()) results.passed++; else results.failed++
    
    // 5. 发送消息
    if (await testSendMessage()) results.passed++; else results.failed++
    
    // 6. 带附件消息（跳过，docx不是图片）
    // if (await testSendMessageWithAttachment()) results.passed++; else results.failed++
    
    // 7. 获取消息历史
    if (await testGetMessages()) results.passed++; else results.failed++
    
    // 8. 重命名会话
    if (await testRenameSession()) results.passed++; else results.failed++
    
    // 9. 检查数据库
    if (await checkDatabase()) results.passed++; else results.failed++
    
  } catch (error) {
    console.log(colors.red('\n测试过程出错:'), error.message)
  }
  
  // 测试结果汇总
  console.log('\n' + '='.repeat(50))
  console.log('测试结果汇总')
  console.log('='.repeat(50))
  console.log(colors.green(`通过: ${results.passed}`))
  console.log(colors.red(`失败: ${results.failed}`))
  console.log('结束时间:', new Date().toLocaleString())
}

runTests().catch(console.error)
