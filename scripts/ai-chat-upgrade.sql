-- AI聊天功能升级数据库迁移脚本
-- 版本: 2.0
-- 功能: 支持会话管理、文件上传、图片识别

-- ============================================================================
-- 1. 创建AI会话表 (ai_chat_sessions) - 独立管理会话
-- ============================================================================
CREATE TABLE IF NOT EXISTS `ai_chat_sessions` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '会话ID',
  `session_id` varchar(100) NOT NULL DEFAULT '' COMMENT '会话唯一标识',
  `user_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '用户ID',
  `title` varchar(200) NOT NULL DEFAULT '新对话' COMMENT '会话标题',
  `last_message` text COMMENT '最后一条消息内容（预览用）',
  `message_count` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '消息数量',
  `is_archived` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否归档：0-否, 1-是',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_session_id` (`session_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI聊天会话表';

-- ============================================================================
-- 2. 升级AI对话记录表 (ai_chat_logs) - 添加附件支持
-- ============================================================================
-- 添加附件相关字段（如果不存在）
ALTER TABLE `ai_chat_logs` 
ADD COLUMN IF NOT EXISTS `attachments` JSON DEFAULT NULL COMMENT '附件列表JSON [{type, url, name, size}]',
ADD COLUMN IF NOT EXISTS `token_count` int(11) unsigned NOT NULL DEFAULT 0 COMMENT 'Token消耗数量';

-- ============================================================================
-- 3. 创建AI聊天附件表 (ai_chat_attachments)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `ai_chat_attachments` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '附件ID',
  `session_id` varchar(100) NOT NULL DEFAULT '' COMMENT '会话ID',
  `message_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '消息ID（关联ai_chat_logs.id）',
  `user_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '上传用户ID',
  `file_name` varchar(500) NOT NULL DEFAULT '' COMMENT '文件名',
  `file_type` varchar(50) NOT NULL DEFAULT '' COMMENT '文件类型：image-图片, document-文档, audio-音频',
  `mime_type` varchar(100) NOT NULL DEFAULT '' COMMENT 'MIME类型',
  `file_url` varchar(1000) NOT NULL DEFAULT '' COMMENT '文件URL',
  `file_size` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '文件大小（字节）',
  `thumbnail_url` varchar(1000) NOT NULL DEFAULT '' COMMENT '缩略图URL（图片用）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_message_id` (`message_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI聊天附件表';

-- ============================================================================
-- 4. 迁移现有会话数据到新会话表
-- ============================================================================
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
GROUP BY session_id, user_id;

-- ============================================================================
-- 完成
-- ============================================================================
