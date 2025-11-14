-- 监理日志小程序数据库初始化脚本
-- 数据库版本: MySQL 5.7+
-- 字符集: utf8mb4
-- 生成时间: 2024-11-07

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `jlzr1101-5g9kplxza13a780d` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `jlzr1101-5g9kplxza13a780d`;

-- 临时关闭外键约束，避免清表时因依赖关系失败
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- 1. 用户表 (users)
-- ============================================================================
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `openid` varchar(100) NOT NULL DEFAULT '' COMMENT '微信OpenID',
  `unionid` varchar(100) NOT NULL DEFAULT '' COMMENT '微信UnionID',
  `nickname` varchar(100) NOT NULL DEFAULT '' COMMENT '用户昵称',
  `avatar` varchar(500) NOT NULL DEFAULT '' COMMENT '用户头像URL',
  `organization` varchar(200) NOT NULL DEFAULT '' COMMENT '所属监理机构',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_openid` (`openid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ============================================================================
-- 2. 项目表 (projects)
-- ============================================================================
DROP TABLE IF EXISTS `projects`;
CREATE TABLE `projects` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '项目ID',
  `project_name` varchar(200) NOT NULL DEFAULT '' COMMENT '项目名称',
  `project_code` varchar(100) NOT NULL DEFAULT '' COMMENT '项目编号',
  `organization` varchar(200) NOT NULL DEFAULT '' COMMENT '监理机构',
  `chief_engineer` varchar(50) NOT NULL DEFAULT '' COMMENT '总监理工程师',
  `description` text COMMENT '项目描述',
  `address` varchar(500) NOT NULL DEFAULT '' COMMENT '项目地址',
  `start_date` date DEFAULT NULL COMMENT '项目开始日期',
  `end_date` date DEFAULT NULL COMMENT '项目结束日期',
  `creator_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '创建人ID',
  `is_pinned` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否置顶：0-未置顶, 1-已置顶',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_code` (`project_code`),
  KEY `idx_is_pinned` (`is_pinned`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目表';

-- ============================================================================
-- 3. 单项工程表 (works)
-- ============================================================================
DROP TABLE IF EXISTS `works`;
CREATE TABLE `works` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '工程ID',
  `project_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '所属项目ID',
  `work_name` varchar(200) NOT NULL DEFAULT '' COMMENT '工程名称',
  `work_code` varchar(100) NOT NULL DEFAULT '' COMMENT '工程编号',
  `unit_work` varchar(100) NOT NULL DEFAULT '' COMMENT '单位工程',
  `start_date` date DEFAULT NULL COMMENT '监理日志开始时间',
  `end_date` date DEFAULT NULL COMMENT '监理日志结束时间',
  `color` varchar(20) NOT NULL DEFAULT '#0d9488' COMMENT '工程标识颜色',
  `description` text COMMENT '工程描述',
  `creator_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '创建人ID',
  `is_pinned` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否置顶：0-未置顶, 1-已置顶',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_work_code` (`work_code`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_is_pinned` (`is_pinned`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='单项工程表';

-- ============================================================================
-- 4. 监理日志表 (supervision_logs)
-- ============================================================================
DROP TABLE IF EXISTS `supervision_logs`;
CREATE TABLE `supervision_logs` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `project_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '所属项目ID',
  `work_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '所属工程ID',
  `user_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '填写人ID',
  `log_date` date NOT NULL COMMENT '日志日期',
  `weather` varchar(100) NOT NULL DEFAULT '' COMMENT '气象情况',
  `project_dynamics` text COMMENT '工程动态',
  `supervision_work` text COMMENT '监理工作情况',
  `safety_work` text COMMENT '安全监理工作情况',
  `recorder_name` varchar(50) NOT NULL DEFAULT '' COMMENT '记录人姓名',
  `recorder_date` date DEFAULT NULL COMMENT '记录日期',
  `reviewer_name` varchar(50) NOT NULL DEFAULT '' COMMENT '审核人姓名',
  `reviewer_date` date DEFAULT NULL COMMENT '审核日期',
  `is_pinned` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否置顶：0-未置顶, 1-已置顶',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_work_id` (`work_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_log_date` (`log_date`),
  KEY `idx_is_pinned` (`is_pinned`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='监理日志表';

-- ============================================================================
-- 5. AI对话记录表 (ai_chat_logs)
-- ============================================================================
DROP TABLE IF EXISTS `ai_chat_logs`;
CREATE TABLE `ai_chat_logs` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `user_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '用户ID',
  `session_id` varchar(100) NOT NULL DEFAULT '' COMMENT '会话ID',
  `message_type` varchar(20) NOT NULL DEFAULT 'user' COMMENT '消息类型：user-用户消息, ai-AI回复',
  `content` text COMMENT '消息内容',
  `api_provider` varchar(50) NOT NULL DEFAULT 'doubao' COMMENT 'API提供商：doubao-豆包',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI对话记录表';

-- ============================================================================
-- 6. 系统配置表 (system_configs)
-- ============================================================================
DROP TABLE IF EXISTS `system_configs`;
CREATE TABLE `system_configs` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '配置ID',
  `config_key` varchar(100) NOT NULL DEFAULT '' COMMENT '配置键',
  `config_value` text COMMENT '配置值',
  `config_type` varchar(20) NOT NULL DEFAULT 'string' COMMENT '配置类型：string-字符串, number-数字, json-JSON对象',
  `description` varchar(500) NOT NULL DEFAULT '' COMMENT '配置描述',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';

-- ============================================================================
-- 7. 附件表 (attachments)
-- ============================================================================
DROP TABLE IF EXISTS `attachments`;
CREATE TABLE `attachments` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '附件ID',
  `related_type` varchar(50) NOT NULL DEFAULT 'log' COMMENT '关联类型：log-监理日志, project-项目, work-工程',
  `related_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '关联ID',
  `file_name` varchar(500) NOT NULL DEFAULT '' COMMENT '文件名',
  `file_type` varchar(50) NOT NULL DEFAULT '' COMMENT '文件类型：image-图片, document-文档, video-视频',
  `file_url` varchar(1000) NOT NULL DEFAULT '' COMMENT '文件URL',
  `file_size` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '文件大小（字节）',
  `upload_user_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '上传人ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_related` (`related_type`, `related_id`),
  KEY `idx_upload_user_id` (`upload_user_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='附件表';

-- ============================================================================
-- 初始化完成
-- ============================================================================

-- 重新开启外键约束
SET FOREIGN_KEY_CHECKS = 1;
