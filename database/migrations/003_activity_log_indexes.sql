-- Additive, rerunnable migration; preserves all existing audit records.
SET @db = DATABASE();

SET @sql = IF(EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = @db AND table_name = 'audit_logs' AND index_name = 'idx_audit_created_id'), 'SELECT 1', 'ALTER TABLE `audit_logs` ADD INDEX `idx_audit_created_id` (`created_at`, `id`)');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = @db AND table_name = 'audit_logs' AND index_name = 'idx_audit_user_created_id'), 'SELECT 1', 'ALTER TABLE `audit_logs` ADD INDEX `idx_audit_user_created_id` (`user_id`, `created_at`, `id`)');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = @db AND table_name = 'audit_logs' AND index_name = 'idx_audit_action_created_id'), 'SELECT 1', 'ALTER TABLE `audit_logs` ADD INDEX `idx_audit_action_created_id` (`action`, `created_at`, `id`)');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
