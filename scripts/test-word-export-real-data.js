/**
 * 使用真实数据库数据测试监理日志Word导出功能
 */
const path = require('path')
const fs = require('fs')
const mysql = require('mysql2/promise')

// 引入Word生成器
const { generateSupervisionLogWord } = require('../utils/wordGenerator')

// 数据库配置
const dbConfig = {
  host: 'sh-cynosdbmysql-grp-goudlu7k.sql.tencentcdb.com',
  port: 22087,
  user: 'a572204654',
  password: '572204654aA',
  database: 'jlzr1101-5g9kplxza13a780d'
}

async function testWithRealData() {
  console.log('='.repeat(50))
  console.log('使用真实数据库数据测试监理日志Word导出')
  console.log('='.repeat(50))
  
  let connection
  
  try {
    // 连接数据库
    console.log('\n正在连接数据库...')
    connection = await mysql.createConnection(dbConfig)
    console.log('✓ 数据库连接成功')
    
    // 查询最新的监理日志
    console.log('\n正在查询监理日志数据...')
    const [logs] = await connection.execute(`
      SELECT 
        sl.*,
        p.project_name,
        p.project_code,
        p.organization,
        p.chief_engineer,
        p.start_date as project_start_date,
        p.end_date as project_end_date,
        w.work_name,
        w.work_code,
        w.unit_work,
        u.nickname as user_name
      FROM supervision_logs sl
      LEFT JOIN projects p ON sl.project_id = p.id
      LEFT JOIN works w ON sl.work_id = w.id
      LEFT JOIN users u ON sl.user_id = u.id
      ORDER BY sl.created_at DESC
      LIMIT 1
    `)
    
    if (logs.length === 0) {
      console.log('✗ 未找到监理日志数据')
      return false
    }
    
    const logData = logs[0]
    console.log(`✓ 找到监理日志，ID: ${logData.id}`)
    console.log(`  项目名称: ${logData.project_name || '无'}`)
    console.log(`  日志日期: ${logData.log_date || '无'}`)
    console.log(`  天气: ${logData.weather || '无'}`)
    
    // 生成Word文档
    console.log('\n正在生成Word文档...')
    const wordBuffer = await generateSupervisionLogWord(logData)
    console.log(`✓ Word文档生成成功，大小: ${(wordBuffer.length / 1024).toFixed(2)} KB`)
    
    // 保存到output目录
    const outputDir = path.join(__dirname, '../output')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const outputPath = path.join(outputDir, `监理日志_真实数据_${timestamp}.docx`)
    
    fs.writeFileSync(outputPath, wordBuffer)
    console.log(`✓ 文件已保存: ${outputPath}`)
    
    console.log('\n' + '='.repeat(50))
    console.log('测试完成！')
    console.log('='.repeat(50))
    
    return true
  } catch (error) {
    console.error('\n✗ 测试失败:', error.message)
    console.error('详细错误:', error.stack)
    return false
  } finally {
    if (connection) {
      await connection.end()
      console.log('\n数据库连接已关闭')
    }
  }
}

// 运行测试
testWithRealData()
