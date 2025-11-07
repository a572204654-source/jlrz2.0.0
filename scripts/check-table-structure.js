/**
 * 检查 supervision_logs 表结构
 */

require('dotenv').config()
const mysql = require('mysql2/promise')

const dbConfig = {
  host: process.env.DB_HOST_EXTERNAL,
  port: process.env.DB_PORT_EXTERNAL,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
}

async function checkTableStructure() {
  let connection
  
  try {
    connection = await mysql.createConnection(dbConfig)
    console.log('✅ 数据库连接成功\n')
    
    // 查看 supervision_logs 表结构
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📋 supervision_logs 表结构')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    const [columns] = await connection.query('DESCRIBE supervision_logs')
    
    console.log('字段列表：\n')
    columns.forEach(col => {
      console.log(`  ${col.Field.padEnd(20)} ${col.Type.padEnd(20)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`)
    })
    
    // 检查是否有 status 字段
    const hasStatus = columns.some(col => col.Field === 'status')
    
    if (hasStatus) {
      console.log('\n✅ 有 status 字段')
    } else {
      console.log('\n❌ 缺少 status 字段！')
      console.log('\n💡 需要添加 status 字段，SQL：')
      console.log('   ALTER TABLE supervision_logs ADD COLUMN status TINYINT DEFAULT 1 COMMENT "状态:1=正常,2=已删除";')
    }
    
    // 查看所有日志
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📋 所有监理日志')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    const [logs] = await connection.query('SELECT * FROM supervision_logs')
    
    if (logs.length === 0) {
      console.log('⚠️  没有任何日志数据')
    } else {
      console.log(`找到 ${logs.length} 条日志：\n`)
      
      logs.forEach((log, index) => {
        console.log(`${index + 1}. ID: ${log.id}`)
        console.log(`   标题: ${log.title || '无标题'}`)
        console.log(`   用户ID: ${log.user_id}`)
        console.log(`   项目ID: ${log.project_id || '无'}`)
        console.log(`   工程ID: ${log.work_id || '无'}`)
        console.log(`   日期: ${log.log_date || '无'}`)
        console.log(`   创建时间: ${log.created_at}`)
        console.log('')
      })
    }
    
    // 检查其他关联表
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📋 检查关联表')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    const [projects] = await connection.query('SELECT COUNT(*) as total FROM projects')
    console.log(`✅ projects 表: ${projects[0].total} 条数据`)
    
    const [works] = await connection.query('SELECT COUNT(*) as total FROM works')
    console.log(`✅ works 表: ${works[0].total} 条数据`)
    
    const [users] = await connection.query('SELECT COUNT(*) as total FROM users')
    console.log(`✅ users 表: ${users[0].total} 条数据`)
    
    const [attachments] = await connection.query('SELECT COUNT(*) as total FROM attachments')
    console.log(`✅ attachments 表: ${attachments[0].total} 条数据`)
    
  } catch (error) {
    console.error('❌ 错误:', error.message)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

checkTableStructure()

