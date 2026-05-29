-- WeRead Plus SQLite 初始化脚本
-- 包含所有表的 CREATE 语句，不含示例数据
-- 执行: sqlite3 weread_plus.db < init.sql

-- ============================================================
-- 1. users 用户表
-- ============================================================
CREATE TABLE IF NOT EXISTS `users` (
    `vid` TEXT PRIMARY KEY,
    `nickname` TEXT,
    `avatar_url` TEXT,
    `regist_time` INTEGER DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS `tr_users_updated_at`
AFTER UPDATE ON `users`
FOR EACH ROW
BEGIN
    UPDATE `users` SET `updated_at` = CURRENT_TIMESTAMP WHERE `vid` = NEW.`vid`;
END;

-- ============================================================
-- 2. api_keys API Key 表
-- ============================================================
CREATE TABLE IF NOT EXISTS `api_keys` (
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    `vid` TEXT NOT NULL,
    `api_key` TEXT NOT NULL,
    `is_active` INTEGER DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `last_used` DATETIME,
    `expires_at` DATETIME
);

CREATE INDEX IF NOT EXISTS `idx_api_keys_vid` ON `api_keys` (`vid`);
CREATE INDEX IF NOT EXISTS `idx_api_keys_api_key` ON `api_keys` (`api_key`);

-- ============================================================
-- 3. shelf_books 书架缓存表
-- ============================================================
CREATE TABLE IF NOT EXISTS `shelf_books` (
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    `vid` TEXT NOT NULL,
    `book_id` TEXT NOT NULL,
    `title` TEXT,
    `author` TEXT,
    `cover` TEXT,
    `category` TEXT,
    `is_album` INTEGER DEFAULT 0,
    `secret` INTEGER DEFAULT 0,
    `is_top` INTEGER DEFAULT 0,
    `finish_reading` INTEGER DEFAULT 0,
    `read_update_time` INTEGER DEFAULT 0,
    `synced_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(`vid`, `book_id`)
);

CREATE INDEX IF NOT EXISTS `idx_shelf_books_vid` ON `shelf_books` (`vid`);
CREATE INDEX IF NOT EXISTS `idx_shelf_books_category` ON `shelf_books` (`vid`, `category`);

-- ============================================================
-- 4. reading_progress 阅读进度快照表
-- ============================================================
CREATE TABLE IF NOT EXISTS `reading_progress` (
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    `vid` TEXT NOT NULL,
    `book_id` TEXT NOT NULL,
    `progress` INTEGER DEFAULT 0,
    `chapter_uid` INTEGER,
    `chapter_offset` INTEGER DEFAULT 0,
    `read_time` INTEGER DEFAULT 0,
    `update_time` INTEGER DEFAULT 0,
    `snapshot_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(`vid`, `book_id`)
);

CREATE INDEX IF NOT EXISTS `idx_reading_progress_vid_book` ON `reading_progress` (`vid`, `book_id`);
CREATE INDEX IF NOT EXISTS `idx_reading_progress_snapshot` ON `reading_progress` (`vid`, `snapshot_at`);

-- ============================================================
-- 5. notes 笔记缓存表
-- ============================================================
CREATE TABLE IF NOT EXISTS `notes` (
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    `vid` TEXT NOT NULL,
    `book_id` TEXT NOT NULL,
    `note_type` TEXT NOT NULL,
    `source_id` TEXT,
    `chapter_uid` INTEGER,
    `content` TEXT,
    `range_pos` TEXT,
    `created_at` DATETIME,
    `synced_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(`vid`, `source_id`, `note_type`)
);

CREATE INDEX IF NOT EXISTS `idx_notes_vid_book` ON `notes` (`vid`, `book_id`);
CREATE INDEX IF NOT EXISTS `idx_notes_type` ON `notes` (`vid`, `note_type`);

-- ============================================================
-- 6. reading_stats 阅读统计快照表
-- ============================================================
CREATE TABLE IF NOT EXISTS `reading_stats` (
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    `vid` TEXT NOT NULL,
    `mode` TEXT NOT NULL,
    `base_time` INTEGER DEFAULT 0,
    `total_read_time` INTEGER DEFAULT 0,
    `read_days` INTEGER DEFAULT 0,
    `raw_data` TEXT,
    `snapshot_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS `idx_reading_stats_vid_mode` ON `reading_stats` (`vid`, `mode`);
CREATE INDEX IF NOT EXISTS `idx_reading_stats_snapshot` ON `reading_stats` (`vid`, `snapshot_at`);

-- ============================================================
-- 7. sync_logs 同步任务记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS `sync_logs` (
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    `vid` TEXT NOT NULL,
    `sync_type` TEXT NOT NULL,
    `status` TEXT NOT NULL,
    `started_at` DATETIME,
    `finished_at` DATETIME,
    `items_count` INTEGER DEFAULT 0,
    `error_msg` TEXT
);

CREATE INDEX IF NOT EXISTS `idx_sync_logs_vid` ON `sync_logs` (`vid`);
CREATE INDEX IF NOT EXISTS `idx_sync_logs_status` ON `sync_logs` (`vid`, `status`);

-- ============================================================
-- 8. sync_config 同步配置表
-- ============================================================
CREATE TABLE IF NOT EXISTS `sync_config` (
    `id` INTEGER PRIMARY KEY AUTOINCREMENT,
    `vid` TEXT NOT NULL UNIQUE,
    `enabled` INTEGER DEFAULT 1,
    `frequency` TEXT DEFAULT 'daily',
    `sync_scope` TEXT DEFAULT 'full',
    `sync_time` TEXT DEFAULT '02:00',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS `tr_sync_config_updated_at`
AFTER UPDATE ON `sync_config`
FOR EACH ROW
BEGIN
    UPDATE `sync_config` SET `updated_at` = CURRENT_TIMESTAMP WHERE `id` = NEW.`id`;
END;
