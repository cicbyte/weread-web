-- WeRead Plus MySQL 初始化脚本
-- 包含所有表的 CREATE 语句，不含示例数据
-- 执行: mysql -u root -p weread_plus < init.sql

-- ============================================================
-- 1. users 用户表
-- ============================================================
CREATE TABLE IF NOT EXISTS `users` (
    `vid` VARCHAR(64) NOT NULL COMMENT '微信读书用户ID',
    `nickname` VARCHAR(255) DEFAULT NULL COMMENT '昵称',
    `avatar_url` VARCHAR(512) DEFAULT NULL COMMENT '头像URL',
    `regist_time` BIGINT UNSIGNED DEFAULT 0 COMMENT '微信读书注册时间戳(稳定账户标识)',
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`vid`),
    UNIQUE KEY `idx_regist_time` (`regist_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ============================================================
-- 2. api_keys API Key 表
-- ============================================================
CREATE TABLE IF NOT EXISTS `api_keys` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `vid` VARCHAR(64) NOT NULL COMMENT '用户ID',
    `api_key` VARCHAR(255) NOT NULL COMMENT 'API Key（加密存储）',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否有效: 0-无效, 1-有效',
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `last_used` TIMESTAMP NULL DEFAULT NULL COMMENT '最后使用时间',
    `expires_at` TIMESTAMP NULL DEFAULT NULL COMMENT '过期时间',
    PRIMARY KEY (`id`),
    KEY `idx_vid` (`vid`),
    KEY `idx_api_key` (`api_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API Key表';

-- ============================================================
-- 3. shelf_books 书架缓存表
-- ============================================================
CREATE TABLE IF NOT EXISTS `shelf_books` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `vid` VARCHAR(64) NOT NULL COMMENT '用户ID',
    `book_id` VARCHAR(64) NOT NULL COMMENT '书籍ID',
    `title` VARCHAR(512) DEFAULT NULL COMMENT '书名',
    `author` VARCHAR(255) DEFAULT NULL COMMENT '作者',
    `cover` VARCHAR(512) DEFAULT NULL COMMENT '封面URL',
    `category` VARCHAR(128) DEFAULT NULL COMMENT '分类',
    `is_album` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否有声书',
    `secret` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否私密',
    `is_top` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否置顶',
    `finish_reading` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否读完',
    `read_update_time` BIGINT DEFAULT 0 COMMENT '最近阅读时间戳',
    `synced_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT '同步时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_vid_book` (`vid`, `book_id`),
    KEY `idx_vid` (`vid`),
    KEY `idx_vid_category` (`vid`, `category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='书架缓存表';

-- ============================================================
-- 4. reading_progress 阅读进度快照表
-- ============================================================
CREATE TABLE IF NOT EXISTS `reading_progress` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `vid` VARCHAR(64) NOT NULL COMMENT '用户ID',
    `book_id` VARCHAR(64) NOT NULL COMMENT '书籍ID',
    `progress` INT NOT NULL DEFAULT 0 COMMENT '进度百分比(0-100)',
    `chapter_uid` BIGINT DEFAULT NULL COMMENT '章节UID',
    `chapter_offset` INT NOT NULL DEFAULT 0 COMMENT '章节内偏移',
    `read_time` INT NOT NULL DEFAULT 0 COMMENT '累计阅读时长(秒)',
    `update_time` BIGINT NOT NULL DEFAULT 0 COMMENT '最后阅读时间戳',
    `snapshot_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT '快照时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_vid_book` (`vid`, `book_id`),
    KEY `idx_vid_snapshot` (`vid`, `snapshot_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='阅读进度快照表';

-- ============================================================
-- 5. notes 笔记缓存表
-- ============================================================
CREATE TABLE IF NOT EXISTS `notes` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `vid` VARCHAR(64) NOT NULL COMMENT '用户ID',
    `book_id` VARCHAR(64) NOT NULL COMMENT '书籍ID',
    `note_type` VARCHAR(32) NOT NULL COMMENT '笔记类型: highlight/review/bookmark',
    `source_id` VARCHAR(128) DEFAULT NULL COMMENT '原始ID',
    `chapter_uid` BIGINT DEFAULT NULL COMMENT '章节UID',
    `content` TEXT DEFAULT NULL COMMENT '笔记内容',
    `range_pos` VARCHAR(128) DEFAULT NULL COMMENT '划线位置范围',
    `created_at` TIMESTAMP NULL DEFAULT NULL COMMENT '原始创建时间',
    `synced_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT '同步时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_vid_source_type` (`vid`, `source_id`, `note_type`),
    KEY `idx_vid_book` (`vid`, `book_id`),
    KEY `idx_vid_type` (`vid`, `note_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='笔记缓存表';

-- ============================================================
-- 6. reading_stats 阅读统计快照表
-- ============================================================
CREATE TABLE IF NOT EXISTS `reading_stats` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `vid` VARCHAR(64) NOT NULL COMMENT '用户ID',
    `mode` VARCHAR(32) NOT NULL COMMENT '统计维度: weekly/monthly/annually/overall',
    `base_time` BIGINT NOT NULL DEFAULT 0 COMMENT '基准时间戳',
    `total_read_time` INT NOT NULL DEFAULT 0 COMMENT '总阅读时长(秒)',
    `read_days` INT NOT NULL DEFAULT 0 COMMENT '阅读天数',
    `raw_data` JSON DEFAULT NULL COMMENT '原始统计数据(JSON)',
    `snapshot_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT '快照时间',
    PRIMARY KEY (`id`),
    KEY `idx_vid_mode` (`vid`, `mode`),
    KEY `idx_vid_snapshot` (`vid`, `snapshot_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='阅读统计快照表';

-- ============================================================
-- 7. sync_logs 同步任务记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS `sync_logs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `vid` VARCHAR(64) NOT NULL COMMENT '用户ID',
    `sync_type` VARCHAR(32) NOT NULL COMMENT '同步类型: full/shelf/notes/progress/stats',
    `status` VARCHAR(32) NOT NULL COMMENT '状态: running/success/failed',
    `started_at` TIMESTAMP NULL DEFAULT NULL COMMENT '开始时间',
    `finished_at` TIMESTAMP NULL DEFAULT NULL COMMENT '结束时间',
    `items_count` INT NOT NULL DEFAULT 0 COMMENT '同步条目数',
    `error_msg` TEXT DEFAULT NULL COMMENT '错误信息',
    PRIMARY KEY (`id`),
    KEY `idx_vid` (`vid`),
    KEY `idx_vid_status` (`vid`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='同步任务记录表';

-- ============================================================
-- 8. sync_config 同步配置表
-- ============================================================
CREATE TABLE IF NOT EXISTS `sync_config` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `vid` VARCHAR(64) NOT NULL COMMENT '用户ID',
    `enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
    `frequency` VARCHAR(32) NOT NULL DEFAULT 'daily' COMMENT '频率: hourly/every6h/every12h/daily/weekly',
    `sync_scope` VARCHAR(32) NOT NULL DEFAULT 'full' COMMENT '范围: full/shelf/notes/progress',
    `sync_time` VARCHAR(8) NOT NULL DEFAULT '02:00' COMMENT '每日同步时间(HH:MM)',
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_vid` (`vid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='同步配置表';
