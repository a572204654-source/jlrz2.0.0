/**
 * AI聊天功能升级 - 数据库迁移脚本
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')

async function runMigration() {
  console.log('开始执行AI聊天功能数据库迁移...\n')

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'sh-cynosdbmysql-grp-goudlu7k.sql.tencentcdb.com',
    port: parseInt(process.env.DB_PORT || '22087'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jlzr1101-5g9kplxza13a780d',
    multipleStatements: true
  })

  try {
    // 1. 创建会话表
    console.log('1. 创建 ai_chat_sessions 表...')
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ai_chat_sessions (
        id int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '会话ID',
        session_id varchar(100) NOT NULL DEFAULT '' COMMENT '会话唯一标识',
        user_id int(11) unsigned NOT NULL DEFAULT 0 COMMENT '用户ID',
        title varchar(200) NOT NULL DEFAULT '新对话' COMMENT '会话标题',
        last_message text COMMENT '最后一条消息内容（预览用）',
        message_count int(11) unsigned NOT NULL DEFAULT 0 COMMENT '消息数量',
        is_archived tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否归档：0-否, 1-是',
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (id),
        UNIQUE KEY uk_session_id (session_id),
        KEY idx_user_id (user_id),
        KEY idx_created_at (created_at),
        KEY idx_updated_at (updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI聊天会话表'
    `)
    console.log('   ✓ ai_chat_sessions 表创建成功\n')

    // 2. 创建附件表
    console.log('2. 创建 ai_chat_attachments 表...')
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ai_chat_attachments (
        id int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '附件ID',
        session_id varchar(100) NOT NULL DEFAULT '' COMMENT '会话ID',
        message_id int(11) unsigned NOT NULL DEFAULT 0 COMMENT '消息ID',
        user_id int(11) unsigned NOT NULL DEFAULT 0 COMMENT '上传用户ID',
        file_name varchar(500) NOT NULL DEFAULT '' COMMENT '文件名',
        file_type varchar(50) NOT NULL DEFAULT '' COMMENT '文件类型',
        mime_type varchar(100) NOT NULL DEFAULT '' COMMENT 'MIME类型',
        file_url varchar(1000) NOT NULL DEFAULT '' COMMENT '文件URL',
        file_size int(11) unsigned NOT NULL DEFAULT 0 COMMENT '文件大小（字节）',
        thumbnail_url varchar(1000) NOT NULL DEFAULT '' COMMENT '缩略图URL',
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        PRIMARY KEY (id),
        KEY idx_session_id (session_id),
        KEY idx_message_id (message_id),
        KEY idx_user_id (user_id),
        KEY idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI聊天附件表'
    `)
    console.log('   ✓ ai_chat_attachments 表创建成功\n')

    // 3. 检查并添加 ai_chat_logs 表的附件字段
    console.log('3. 检查 ai_chat_logs 表字段...')
    try {
      await connection.execute(`
        ALTER TABLE ai_chat_logs ADD COLUMN attachments JSON DEFAULT NULL COMMENT '附件列表JSON'
      `)
      console.log('   ✓ attachments 字段添加成功')
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('   - attachments 字段已存在，跳过')
      } else {
        throw e
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE ai_chat_logs ADD COLUMN token_count int(11) unsigned NOT NULL DEFAULT 0 COMMENT 'Token消耗数量'
      `)
      console.log('   ✓ token_count 字段添加成功\n')
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('   - token_count 字段已存在，跳过\n')
      } else {
        throw e
      }
    }

    // 4. 迁移现有会话数据
    console.log('4. 迁移现有会话数据...')
    const [existingSessions] = await connection.execute(`
      SELECT COUNT(DISTINCT session_id) as count FROM ai_chat_logs
    `)
    
    if (existingSessions[0].count > 0) {
      await connection.execute(`
        INSERT IGNORE INTO ai_chat_sessions (session_id, user_id, title, last_message, message_count, created_at, updated_at)
        SELECT 
          session_id,
          user_id,
          COALESCE(
            (SELECT SUBSTRING(content, 1, 50) FROM ai_chat_logs acl2 
             WHERE acl2.session_id = acl.session_id AND acl2.message_type = 'user' 
             ORDER BY created_at ASC LIMIT 1),
            '新对话'
          ) as title,
          (SELECT content FROM ai_chat_logs acl3 
           WHERE acl3.session_id = acl.session_id 
           ORDER BY created_at DESC LIMIT 1) as last_message,
          COUNT(*) as message_count,
          MIN(created_at) as created_at,
          MAX(created_at) as updated_at
        FROM ai_chat_logs acl
        GROUP BY session_id, user_id
      `)
      console.log(`   ✓ 已迁移 ${existingSessions[0].count} 个现有会话\n`)
    } else {
      console.log('   - 无现有会话数据需要迁移\n')
    }

    console.log('========================================')
    console.log('✓ 数据库迁移完成！')
    console.log('========================================')

  } catch (error) {
    console.error('迁移失败:', error.message)
    throw error
  } finally {
    await connection.end()
  }
}

runMigration().catch(err => {
  console.error('执行出错:', err)
  process.exit(1)
})
