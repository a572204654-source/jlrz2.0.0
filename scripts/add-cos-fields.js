/**
 * 数据库迁移脚本
 * 为 attachments 表添加 COS 相关字段
 * 
 * 运行: node scripts/add-cos-fields.js
 */

require('dotenv').config()
const { query, closePool } = require('../config/database')

async function migrate() {
  console.log('开始执行数据库迁移...\n')

  try {
    // 检查 cos_key 字段是否存在
    const columns = await query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'attachments' 
        AND COLUMN_NAME IN ('cos_key', 'storage_type')
    `)

    const existingColumns = columns.map(c => c.COLUMN_NAME)

    // 添加 cos_key 字段
    if (!existingColumns.includes('cos_key')) {
      console.log('添加 cos_key 字段...')
      await query(`
        ALTER TABLE attachments 
        ADD COLUMN cos_key VARCHAR(500) DEFAULT '' COMMENT 'COS文件Key，用于删除'
      `)
      console.log('✓ cos_key 字段添加成功')
    } else {
      console.log('✓ cos_key 字段已存在，跳过')
    }

    // 添加 storage_type 字段
    if (!existingColumns.includes('storage_type')) {
      console.log('添加 storage_type 字段...')
      await query(`
        ALTER TABLE attachments 
        ADD COLUMN storage_type VARCHAR(20) DEFAULT 'local' COMMENT '存储类型：local 或 cos'
      `)
      console.log('✓ storage_type 字段添加成功')
    } else {
      console.log('✓ storage_type 字段已存在，跳过')
    }

    // 为 ai_chat_attachments 表也添加相同字段（如果存在）
    try {
      const aiChatColumns = await query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'ai_chat_attachments' 
          AND COLUMN_NAME IN ('cos_key', 'storage_type')
      `)

      const existingAiChatColumns = aiChatColumns.map(c => c.COLUMN_NAME)

      if (!existingAiChatColumns.includes('cos_key')) {
        console.log('\n添加 ai_chat_attachments.cos_key 字段...')
        await query(`
          ALTER TABLE ai_chat_attachments 
          ADD COLUMN cos_key VARCHAR(500) DEFAULT '' COMMENT 'COS文件Key'
        `)
        console.log('✓ ai_chat_attachments.cos_key 字段添加成功')
      }

      if (!existingAiChatColumns.includes('storage_type')) {
        console.log('添加 ai_chat_attachments.storage_type 字段...')
        await query(`
          ALTER TABLE ai_chat_attachments 
          ADD COLUMN storage_type VARCHAR(20) DEFAULT 'local' COMMENT '存储类型'
        `)
        console.log('✓ ai_chat_attachments.storage_type 字段添加成功')
      }
    } catch (e) {
      console.log('\n(ai_chat_attachments 表不存在或已有字段，跳过)')
    }

    console.log('\n✅ 数据库迁移完成！')

  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message)
    process.exit(1)
  } finally {
    await closePool()
  }
}

migrate()
