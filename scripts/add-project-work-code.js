/**
 * 数据库迁移脚本 - 添加单项工程编号字段
 * 运行命令: node scripts/add-project-work-code.js
 */
const mysql = require('mysql2/promise')

async function migrate() {
  const connection = await mysql.createConnection({
    host: 'sh-cynosdbmysql-grp-goudlu7k.sql.tencentcdb.com',
    port: 22087,
    user: 'a572204654',
    password: '572204654aA',
    database: 'jlzr1101-5g9kplxza13a780d'
  })

  try {
    console.log('🔌 数据库连接成功')

    // 检查字段是否已存在
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = 'jlzr1101-5g9kplxza13a780d' 
       AND TABLE_NAME = 'works' 
       AND COLUMN_NAME = 'project_work_code'`
    )

    if (columns.length > 0) {
      console.log('✅ project_work_code 字段已存在，跳过添加')
    } else {
      // 添加 project_work_code 字段
      await connection.execute(`
        ALTER TABLE works 
        ADD COLUMN project_work_code VARCHAR(100) DEFAULT NULL COMMENT '单项工程编号' 
        AFTER work_name
      `)
      console.log('✅ 已添加 project_work_code 字段')

      // 添加索引
      await connection.execute(`
        CREATE INDEX idx_project_work_code ON works (project_work_code)
      `)
      console.log('✅ 已添加 idx_project_work_code 索引')
    }

    // 显示更新后的表结构
    const [tableInfo] = await connection.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'jlzr1101-5g9kplxza13a780d' AND TABLE_NAME = 'works'
      ORDER BY ORDINAL_POSITION
    `)

    console.log('\n📋 works 表当前结构:')
    console.table(tableInfo)

    console.log('\n🎉 数据库迁移完成!')

  } catch (error) {
    console.error('❌ 迁移失败:', error.message)
    throw error
  } finally {
    await connection.end()
    console.log('🔌 数据库连接已关闭')
  }
}

migrate()
