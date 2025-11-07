/**
 * 修复 supervision_logs 表结构
 * 添加缺失的字段
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

async function fixTable() {
  let connection
  
  try {
    connection = await mysql.createConnection(dbConfig)
    console.log('✅ 数据库连接成功\n')
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔧 开始修复 supervision_logs 表')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    // 1. 添加 status 字段
    console.log('1. 添加 status 字段...')
    try {
      await connection.query(`
        ALTER TABLE supervision_logs 
        ADD COLUMN status TINYINT DEFAULT 1 COMMENT '状态:1=正常,2=已删除'
      `)
      console.log('   ✅ status 字段添加成功\n')
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('   ℹ️  status 字段已存在，跳过\n')
      } else {
        throw error
      }
    }
    
    // 2. 添加 title 字段（标题）
    console.log('2. 添加 title 字段...')
    try {
      await connection.query(`
        ALTER TABLE supervision_logs 
        ADD COLUMN title VARCHAR(200) DEFAULT '' COMMENT '日志标题'
        AFTER user_id
      `)
      console.log('   ✅ title 字段添加成功\n')
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('   ℹ️  title 字段已存在，跳过\n')
      } else {
        throw error
      }
    }
    
    // 3. 添加 content 字段（日志内容）
    console.log('3. 添加 content 字段...')
    try {
      await connection.query(`
        ALTER TABLE supervision_logs 
        ADD COLUMN content TEXT COMMENT '日志内容'
        AFTER title
      `)
      console.log('   ✅ content 字段添加成功\n')
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('   ℹ️  content 字段已存在，跳过\n')
      } else {
        throw error
      }
    }
    
    // 4. 添加 temperature 字段（温度）
    console.log('4. 添加 temperature 字段...')
    try {
      await connection.query(`
        ALTER TABLE supervision_logs 
        ADD COLUMN temperature VARCHAR(50) DEFAULT '' COMMENT '温度'
        AFTER weather
      `)
      console.log('   ✅ temperature 字段添加成功\n')
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('   ℹ️  temperature 字段已存在，跳过\n')
      } else {
        throw error
      }
    }
    
    // 5. 修改 project_id 和 work_id 允许 NULL
    console.log('5. 修改 project_id 和 work_id 允许 NULL...')
    try {
      await connection.query(`
        ALTER TABLE supervision_logs 
        MODIFY COLUMN project_id INT UNSIGNED NULL COMMENT '项目ID'
      `)
      await connection.query(`
        ALTER TABLE supervision_logs 
        MODIFY COLUMN work_id INT UNSIGNED NULL COMMENT '工程ID'
      `)
      console.log('   ✅ 字段修改成功\n')
    } catch (error) {
      console.log('   ⚠️  字段修改失败:', error.message)
      console.log('   这是正常的，可能字段已经允许NULL了\n')
    }
    
    // 6. 查看修复后的表结构
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📋 修复后的表结构')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    const [columns] = await connection.query('DESCRIBE supervision_logs')
    
    console.log('字段列表：\n')
    columns.forEach(col => {
      const nullable = col.Null === 'YES' ? 'NULL' : 'NOT NULL'
      const defaultVal = col.Default !== null ? `默认: ${col.Default}` : ''
      console.log(`  ${col.Field.padEnd(25)} ${col.Type.padEnd(20)} ${nullable.padEnd(10)} ${defaultVal}`)
    })
    
    // 7. 为现有数据设置默认值
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔄 更新现有数据')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    // 为没有标题的日志生成标题
    await connection.query(`
      UPDATE supervision_logs 
      SET title = CONCAT('监理日志 ', DATE_FORMAT(log_date, '%Y-%m-%d'))
      WHERE title IS NULL OR title = ''
    `)
    console.log('✅ 为现有日志生成了标题')
    
    // 设置所有日志状态为正常
    await connection.query(`
      UPDATE supervision_logs 
      SET status = 1
      WHERE status IS NULL OR status = 0
    `)
    console.log('✅ 设置所有日志状态为正常')
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ 修复完成！')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    console.log('现在可以：')
    console.log('  1. 重新运行后端服务')
    console.log('  2. 测试Word导出功能')
    console.log('  3. 使用日志ID: 1 进行测试\n')
    
  } catch (error) {
    console.error('❌ 修复失败:', error.message)
    console.error('详细错误:', error)
  } finally {
    if (connection) {
      await connection.end()
      console.log('🔌 数据库连接已关闭')
    }
  }
}

fixTable()

