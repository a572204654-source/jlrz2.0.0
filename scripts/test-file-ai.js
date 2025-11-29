/**
 * 测试文件上传后AI是否能读取内容
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const FormData = require('form-data')
const mysql = require('mysql2/promise')
const jwt = require('jsonwebtoken')

// 配置
const DB_CONFIG = {
  host: 'sh-cynosdbmysql-grp-goudlu7k.sql.tencentcdb.com',
  port: 22087,
  user: 'a572204654',
  password: '572204654aA',
  database: 'jlzr1101-5g9kplxza13a780d'
}
const JWT_SECRET = 'supervision-log-jwt-secret-XyZ9@2024!Abc'
const API_URL = 'http://localhost:3000'

let authToken = null

async function getToken() {
  const connection = await mysql.createConnection(DB_CONFIG)
  const [users] = await connection.execute('SELECT id FROM users LIMIT 1')
  await connection.end()
  authToken = jwt.sign({ userId: users[0].id }, JWT_SECRET, { expiresIn: '7d' })
  console.log('✓ Token已生成\n')
}

async function uploadFile(filePath) {
  const form = new FormData()
  form.append('files', fs.createReadStream(filePath))

  const response = await axios.post(`${API_URL}/api/ai/chat/upload`, form, {
    headers: {
      ...form.getHeaders(),
      'Authorization': `Bearer ${authToken}`
    }
  })
  return response.data
}

async function sendMessage(sessionId, content, attachmentIds = []) {
  const response = await axios.post(`${API_URL}/api/ai/chat/messages`, {
    sessionId,
    content,
    attachmentIds
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    }
  })
  return response.data
}

async function createSession(title) {
  const response = await axios.post(`${API_URL}/api/ai/chat/sessions`, {
    title
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    }
  })
  return response.data
}

async function main() {
  console.log('=' .repeat(60))
  console.log('测试：上传文件后AI能否读取并回复相关信息')
  console.log('='.repeat(60))
  
  await getToken()
  
  // 1. 创建会话
  console.log('1. 创建测试会话...')
  const sessionResult = await createSession('文件读取测试')
  const sessionId = sessionResult.data.sessionId
  console.log('   会话ID:', sessionId)
  
  // 2. 上传文件
  const testFile = path.join(__dirname, '../output/测试导出.docx')
  console.log('\n2. 上传测试文件...')
  console.log('   文件:', testFile)
  
  const uploadResult = await uploadFile(testFile)
  if (uploadResult.code !== 0) {
    console.log('   ✗ 上传失败:', uploadResult.message)
    return
  }
  
  const file = uploadResult.data.files[0]
  console.log('   ✓ 上传成功')
  console.log('   - 文件名:', file.fileName)
  console.log('   - 类型:', file.fileType)
  console.log('   - 附件ID:', file.id)
  
  // 3. 发送消息询问文件内容
  console.log('\n3. 发送消息询问文件内容...')
  console.log('   问题: "我上传了一份监理日志文档，请帮我分析其中的主要内容"')
  console.log('   附件ID:', [file.id])
  console.log('   等待AI响应中...\n')
  
  try {
    const msgResult = await sendMessage(
      sessionId,
      '我上传了一份监理日志文档，请帮我分析其中的主要内容',
      [file.id]
    )
    
    if (msgResult.code === 0) {
      console.log('4. AI回复:')
      console.log('-'.repeat(60))
      console.log(msgResult.data.aiMessage.content)
      console.log('-'.repeat(60))
      
      // 检查回复是否包含文件相关内容
      const reply = msgResult.data.aiMessage.content
      if (reply.includes('无法') || reply.includes('抱歉') || reply.includes('看不到')) {
        console.log('\n⚠️ AI可能无法直接读取docx文件内容')
        console.log('   需要添加文档解析功能才能让AI读取文档')
      }
    } else {
      console.log('✗ 发送消息失败:', msgResult.message)
    }
  } catch (error) {
    console.log('✗ 请求错误:', error.response?.data?.message || error.message)
  }
}

main().catch(console.error)
