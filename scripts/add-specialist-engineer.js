/**
 * 添加专业监理工程师字段到 projects 表
 */
const { query } = require('../config/database')

async function migrate() {
  try {
    console.log('开始添加 specialist_engineer 字段...')
    
    await query(`
      ALTER TABLE projects 
      ADD COLUMN specialist_engineer VARCHAR(100) DEFAULT NULL COMMENT '专业监理工程师'
    `)
    
    console.log('✅ specialist_engineer 字段添加成功!')
    process.exit(0)
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('✅ specialist_engineer 字段已存在，无需添加')
      process.exit(0)
    }
    console.error('❌ 迁移失败:', error.message)
    process.exit(1)
  }
}

migrate()
