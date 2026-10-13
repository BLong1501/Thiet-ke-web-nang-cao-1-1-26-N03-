-- Migration 002: bo sung cot google_id, auth_provider cho bang users.
-- Can thiet cho DB duoc tao truoc khi init.sql co dang nhap Google
-- (neu thieu, moi truy van prisma.user.* deu loi 500: "column users.google_id does not exist").
-- Idempotent: MySQL khong co ADD COLUMN IF NOT EXISTS nen kiem tra information_schema.

SET @db = DATABASE();

SET @sql = IF(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = @db AND table_name = 'users' AND column_name = 'google_id'),
  'SELECT ''google_id da ton tai'' AS info',
  'ALTER TABLE `users` ADD COLUMN `google_id` VARCHAR(255) NULL AFTER `bio`'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = @db AND table_name = 'users' AND column_name = 'auth_provider'),
  'SELECT ''auth_provider da ton tai'' AS info',
  'ALTER TABLE `users` ADD COLUMN `auth_provider` ENUM(''LOCAL'', ''GOOGLE'') NOT NULL DEFAULT ''LOCAL'' AFTER `google_id`'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = @db AND table_name = 'users' AND index_name = 'idx_users_google_id'),
  'SELECT ''index da ton tai'' AS info',
  'ALTER TABLE `users` ADD UNIQUE INDEX `idx_users_google_id` (`google_id`)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
