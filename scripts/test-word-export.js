/**
 * 测试Word导出功能
 */

require('dotenv').config()
const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')

const dbConfig = {
  host: process.env.DB_HOST_EXTERNAL,
  port: process.env.DB_PORT_EXTERNAL,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
}

async function testWordExport() {
  let connection
  
  try {
    connection = await mysql.createConnection(dbConfig)
    console.log('✅ 数据库连接成功\n')
    
    const logId = 1 // 测试日志ID
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`🧪 测试导出日志 ID: ${logId}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    // 执行与后端完全相同的查询
    console.log('1. 查询日志数据...')
    const [logs] = await connection.query(`
      SELECT 
        sl.*,
        p.project_name,
        p.project_code,
        w.work_name,
        w.work_code,
        u.nickname as user_name
      FROM supervision_logs sl
      LEFT JOIN projects p ON sl.project_id = p.id
      LEFT JOIN works w ON sl.work_id = w.id
      LEFT JOIN users u ON sl.user_id = u.id
      WHERE sl.id = ?
    `, [logId])
    
    if (logs.length === 0) {
      console.log('❌ 日志不存在')
      return
    }
    
    console.log('✅ 日志查询成功\n')
    
    const logData = logs[0]
    
    console.log('日志数据：')
    console.log(`  ID: ${logData.id}`)
    console.log(`  标题: ${logData.title}`)
    console.log(`  日期: ${logData.log_date}`)
    console.log(`  天气: ${logData.weather}`)
    console.log(`  温度: ${logData.temperature || '未填写'}`)
    console.log(`  项目: ${logData.project_name}`)
    console.log(`  工程: ${logData.work_name}`)
    console.log(`  用户: ${logData.user_name}`)
    console.log('')
    
    // 查询附件
    console.log('2. 查询附件...')
    const [attachments] = await connection.query(`
      SELECT 
        file_name,
        file_type,
        file_size
      FROM attachments
      WHERE related_type = 'log' AND related_id = ?
      ORDER BY created_at ASC
    `, [logId])
    
    console.log(`✅ 找到 ${attachments.length} 个附件\n`)
    
    logData.attachments = attachments
    
    // 尝试生成Word
    console.log('3. 测试Word生成...')
    console.log('   使用 docx 库直接生成（无需模板）\n')
    
    try {
      const { generateSupervisionLogWord } = require('../utils/wordGenerator')
      
      const wordBuffer = await generateSupervisionLogWord(logData)
      
      // 保存到临时文件
      const outputPath = path.join(__dirname, '测试导出.docx')
      fs.writeFileSync(outputPath, wordBuffer)
      
      console.log('✅ Word生成成功！')
      console.log(`📁 文件已保存到: ${outputPath}`)
      console.log(`📊 文件大小: ${(wordBuffer.length / 1024).toFixed(2)} KB\n`)
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🎉 测试成功！')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      
      console.log('现在可以：')
      console.log('  1. 在小程序中使用日志ID: 1 进行测试')
      console.log('  2. 确保登录用户ID是: 1')
      console.log('  3. 测试导出功能\n')
      
    } catch (error) {
      console.log('❌ Word生成失败:', error.message)
      console.log('\n详细错误:')
      console.error(error)
      
      console.log('\n💡 可能的原因：')
      console.log('   1. Word模板格式错误')
      console.log('   2. docxtemplater 配置问题')
      console.log('   3. 数据格式不匹配\n')
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    console.error('\n详细错误:', error)
  } finally {
    if (connection) {
      await connection.end()
      console.log('🔌 数据库连接已关闭')
    }
  }
}

testWordExport()
