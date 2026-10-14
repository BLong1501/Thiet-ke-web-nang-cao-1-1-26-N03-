-- ====================================================================
-- Hệ thống Gây quỹ Cộng đồng (Crowdfunding Platform) - CĐ09
-- Database DDL & Clean Initial Data (Không dữ liệu rác)
-- Duy nhất 1 tài khoản ADMIN1 - Mật khẩu: Password@123
-- ====================================================================

-- Tắt kiểm tra khóa ngoại tạm thời để khởi tạo
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `reports`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `comments`;
DROP TABLE IF EXISTS `community_posts`;
DROP TABLE IF EXISTS `community_members`;
DROP TABLE IF EXISTS `communities`;
DROP TABLE IF EXISTS `disbursements`;
DROP TABLE IF EXISTS `ledger_entries`;
DROP TABLE IF EXISTS `donations`;
DROP TABLE IF EXISTS `campaign_updates`;
DROP TABLE IF EXISTS `campaign_media`;
DROP TABLE IF EXISTS `campaigns`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `verifications`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------------------
-- 1. BẢNG USERS
-- --------------------------------------------------------------------
CREATE TABLE `users` (
    `id` VARCHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `phone_number` VARCHAR(20) NULL,
    `avatar_url` VARCHAR(500) NULL,
    `bio` TEXT NULL,
    `google_id` VARCHAR(255) NULL,
    `auth_provider` ENUM('LOCAL', 'GOOGLE') NOT NULL DEFAULT 'LOCAL',
    `role` ENUM('ADMIN', 'FUNDRAISER', 'USER') NOT NULL DEFAULT 'USER',
    `status` ENUM('ACTIVE', 'SUSPENDED', 'BANNED') NOT NULL DEFAULT 'ACTIVE',
    `is_email_verified` BOOLEAN NOT NULL DEFAULT FALSE,
    `email_verified_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE INDEX `idx_users_email` (`email`),
    UNIQUE INDEX `idx_users_phone_number` (`phone_number`),
    UNIQUE INDEX `idx_users_google_id` (`google_id`),
    INDEX `idx_users_role` (`role`),
    INDEX `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 2. BẢNG VERIFICATIONS (KYC)
-- --------------------------------------------------------------------
CREATE TABLE `verifications` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `id_card_number` VARCHAR(50) NOT NULL,
    `card_issued_date` DATE NULL,
    `card_issued_place` VARCHAR(200) NULL,
    `front_card_image` VARCHAR(500) NOT NULL,
    `back_card_image` VARCHAR(500) NOT NULL,
    `portrait_image` VARCHAR(500) NOT NULL,
    `supporting_documents` JSON NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `rejection_reason` TEXT NULL,
    `reviewed_by` VARCHAR(36) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE INDEX `idx_verifications_user_id` (`user_id`),
    INDEX `idx_verifications_status` (`status`),
    CONSTRAINT `fk_verifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_verifications_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 3. BẢNG CATEGORIES
-- --------------------------------------------------------------------
CREATE TABLE `categories` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `description` TEXT NULL,
    `icon_url` VARCHAR(500) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE INDEX `idx_categories_slug` (`slug`),
    INDEX `idx_categories_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 4. BẢNG CAMPAIGNS
-- --------------------------------------------------------------------
CREATE TABLE `campaigns` (
    `id` VARCHAR(36) NOT NULL,
    `fundraiser_id` VARCHAR(36) NOT NULL,
    `category_id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(280) NOT NULL,
    `short_description` VARCHAR(500) NOT NULL,
    `story` LONGTEXT NOT NULL,
    `cover_image_url` VARCHAR(500) NOT NULL,
    `target_amount` DECIMAL(15, 2) NOT NULL,
    `current_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `donor_count` INT UNSIGNED NOT NULL DEFAULT 0,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `status` ENUM('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'PAUSED', 'COMPLETED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `bank_account_number` VARCHAR(50) NOT NULL,
    `bank_name` VARCHAR(100) NOT NULL,
    `bank_account_name` VARCHAR(150) NOT NULL,
    `beneficiary_info` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE INDEX `idx_campaigns_slug` (`slug`),
    INDEX `idx_campaigns_fundraiser` (`fundraiser_id`),
    INDEX `idx_campaigns_category` (`category_id`),
    INDEX `idx_campaigns_status` (`status`),
    INDEX `idx_campaigns_dates` (`start_date`, `end_date`),
    INDEX `idx_campaigns_created_at` (`created_at`),
    CONSTRAINT `fk_campaigns_fundraiser` FOREIGN KEY (`fundraiser_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_campaigns_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 5. BẢNG CAMPAIGN_MEDIA
-- --------------------------------------------------------------------
CREATE TABLE `campaign_media` (
    `id` VARCHAR(36) NOT NULL,
    `campaign_id` VARCHAR(36) NOT NULL,
    `media_type` ENUM('IMAGE', 'VIDEO', 'DOCUMENT') NOT NULL DEFAULT 'IMAGE',
    `url` VARCHAR(500) NOT NULL,
    `caption` VARCHAR(255) NULL,
    `sort_order` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_campaign_media_campaign` (`campaign_id`),
    CONSTRAINT `fk_campaign_media_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 6. BẢNG CAMPAIGN_UPDATES
-- --------------------------------------------------------------------
CREATE TABLE `campaign_updates` (
    `id` VARCHAR(36) NOT NULL,
    `campaign_id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `attachments` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_campaign_updates_campaign` (`campaign_id`),
    CONSTRAINT `fk_campaign_updates_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 7. BẢNG DONATIONS
-- --------------------------------------------------------------------
CREATE TABLE `donations` (
    `id` VARCHAR(36) NOT NULL,
    `campaign_id` VARCHAR(36) NOT NULL,
    `donor_id` VARCHAR(36) NULL,
    `transaction_code` VARCHAR(64) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `donor_name` VARCHAR(150) NOT NULL,
    `donor_email` VARCHAR(255) NULL,
    `donor_phone` VARCHAR(20) NULL,
    `message` VARCHAR(500) NULL,
    `is_anonymous` BOOLEAN NOT NULL DEFAULT FALSE,
    `payment_method` ENUM('BANK_TRANSFER', 'VNPAY', 'MOMO', 'STRIPE') NOT NULL DEFAULT 'BANK_TRANSFER',
    `payment_status` ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `paid_at` DATETIME(3) NULL,
    `payment_gateway_response` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE INDEX `idx_donations_transaction_code` (`transaction_code`),
    INDEX `idx_donations_campaign` (`campaign_id`),
    INDEX `idx_donations_donor` (`donor_id`),
    INDEX `idx_donations_status` (`payment_status`),
    INDEX `idx_donations_created_at` (`created_at`),
    CONSTRAINT `fk_donations_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_donations_donor` FOREIGN KEY (`donor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 8. BẢNG LEDGER_ENTRIES
-- --------------------------------------------------------------------
CREATE TABLE `ledger_entries` (
    `id` VARCHAR(36) NOT NULL,
    `donation_id` VARCHAR(36) NOT NULL,
    `kind` ENUM('RECEIPT', 'REFUND') NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `ledger_entries_donation_id_kind_key` (`donation_id`, `kind`),
    CONSTRAINT `fk_ledger_entries_donation` FOREIGN KEY (`donation_id`) REFERENCES `donations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 9. BẢNG DISBURSEMENTS
-- --------------------------------------------------------------------
CREATE TABLE `disbursements` (
    `id` VARCHAR(36) NOT NULL,
    `campaign_id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `disbursement_date` DATE NOT NULL,
    `proof_documents` JSON NOT NULL,
    `note` TEXT NULL,
    `created_by` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_disbursements_campaign` (`campaign_id`),
    CONSTRAINT `fk_disbursements_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_disbursements_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 10. BẢNG COMMUNITIES
-- --------------------------------------------------------------------
CREATE TABLE `communities` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `slug` VARCHAR(180) NOT NULL,
    `description` TEXT NULL,
    `avatar_url` VARCHAR(500) NULL,
    `cover_url` VARCHAR(500) NULL,
    `creator_id` VARCHAR(36) NOT NULL,
    `is_private` BOOLEAN NOT NULL DEFAULT FALSE,
    `member_count` INT UNSIGNED NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE INDEX `idx_communities_slug` (`slug`),
    INDEX `idx_communities_creator` (`creator_id`),
    CONSTRAINT `fk_communities_creator` FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 11. BẢNG COMMUNITY_MEMBERS
-- --------------------------------------------------------------------
CREATE TABLE `community_members` (
    `id` VARCHAR(36) NOT NULL,
    `community_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `role` ENUM('ADMIN', 'MODERATOR', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE INDEX `idx_community_user_unique` (`community_id`, `user_id`),
    INDEX `idx_community_members_user` (`user_id`),
    CONSTRAINT `fk_community_members_community` FOREIGN KEY (`community_id`) REFERENCES `communities` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_community_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 12. BẢNG COMMUNITY_POSTS
-- --------------------------------------------------------------------
CREATE TABLE `community_posts` (
    `id` VARCHAR(36) NOT NULL,
    `community_id` VARCHAR(36) NOT NULL,
    `author_id` VARCHAR(36) NOT NULL,
    `campaign_id` VARCHAR(36) NULL,
    `content` TEXT NOT NULL,
    `media_urls` JSON NULL,
    `like_count` INT UNSIGNED NOT NULL DEFAULT 0,
    `comment_count` INT UNSIGNED NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_community_posts_community` (`community_id`),
    INDEX `idx_community_posts_author` (`author_id`),
    INDEX `idx_community_posts_campaign` (`campaign_id`),
    CONSTRAINT `fk_community_posts_community` FOREIGN KEY (`community_id`) REFERENCES `communities` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_community_posts_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_community_posts_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 13. BẢNG POST_LIKES
-- --------------------------------------------------------------------
CREATE TABLE `post_likes` (
    `id` VARCHAR(36) NOT NULL,
    `post_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_post_likes_unique` (`post_id`, `user_id`),
    INDEX `idx_post_likes_user` (`user_id`),
    CONSTRAINT `fk_post_likes_post` FOREIGN KEY (`post_id`) REFERENCES `community_posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_post_likes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 14. BẢNG COMMENTS
-- --------------------------------------------------------------------
CREATE TABLE `comments` (
    `id` VARCHAR(36) NOT NULL,
    `post_id` VARCHAR(36) NULL,
    `campaign_id` VARCHAR(36) NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `parent_id` VARCHAR(36) NULL,
    `content` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_comments_post` (`post_id`),
    INDEX `idx_comments_campaign` (`campaign_id`),
    INDEX `idx_comments_user` (`user_id`),
    INDEX `idx_comments_parent` (`parent_id`),
    CONSTRAINT `fk_comments_post` FOREIGN KEY (`post_id`) REFERENCES `community_posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_comments_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_comments_parent` FOREIGN KEY (`parent_id`) REFERENCES `comments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 15. BẢNG AUDIT_LOGS
-- --------------------------------------------------------------------
CREATE TABLE `audit_logs` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity_name` VARCHAR(50) NOT NULL,
    `entity_id` VARCHAR(36) NOT NULL,
    `details` JSON NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_audit_logs_user` (`user_id`),
    INDEX `idx_audit_logs_action` (`action`),
    INDEX `idx_audit_logs_entity` (`entity_name`, `entity_id`),
    INDEX `idx_audit_logs_created_at` (`created_at`),
    CONSTRAINT `fk_audit_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 16. BẢNG REPORTS
-- --------------------------------------------------------------------
CREATE TABLE `reports` (
    `id` VARCHAR(36) NOT NULL,
    `reporter_id` VARCHAR(36) NOT NULL,
    `target_type` ENUM('CAMPAIGN', 'USER', 'POST', 'COMMENT') NOT NULL,
    `target_id` VARCHAR(36) NOT NULL,
    `reason` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `evidence_urls` JSON NULL,
    `status` ENUM('PENDING', 'RESOLVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `resolved_by` VARCHAR(36) NULL,
    `resolution_note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_reports_reporter` (`reporter_id`),
    INDEX `idx_reports_target` (`target_type`, `target_id`),
    INDEX `idx_reports_status` (`status`),
    CONSTRAINT `fk_reports_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_reports_resolver` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 17. BẢNG NOTIFICATIONS
-- --------------------------------------------------------------------
CREATE TABLE `notifications` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `link_url` VARCHAR(500) NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_notifications_user` (`user_id`, `is_read`),
    INDEX `idx_notifications_created_at` (`created_at`),
    CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- DỮ LIỆU BAN ĐẦU SẠCH (CHỈ GỒM CATEGORIES VÀ 1 TÀI KHOẢN ADMIN1)
-- ====================================================================

-- 1. Danh mục mặc định
INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `icon_url`, `is_active`)
VALUES 
    (UUID(), 'Y tế & Cứu trợ bệnh nhân', 'y-te-cuu-tro-benh-nhan', 'Hỗ trợ chi phí viện phí, mổ tim, điều trị bệnh hiểm nghèo', 'medical_services', TRUE),
    (UUID(), 'Giáo dục & Học sinh nghèo', 'giao-duc-hoc-sinh-ngheo', 'Trao học bổng, xây trường vùng cao, tặng sách vở và thiết bị học tập', 'school', TRUE),
    (UUID(), 'Cứu trợ Thiên tai & Khẩn cấp', 'cuu-tro-thien-tai-khan-cap', 'Hỗ trợ đồng bào lũ lụt, sạt lở, bão gió tái thiết cuộc sống', 'flood', TRUE),
    (UUID(), 'Trẻ em & Hoàn cảnh khó khăn', 'tre-em-hoan-canh-kho-khan', 'Chăm lo bữa ăn dinh dưỡng, áo ấm, bảo trợ trẻ em cơ nhỡ', 'child_care', TRUE),
    (UUID(), 'Bảo vệ Môi trường & Động vật', 'moi-truong-dong-vat', 'Trồng rừng, dọn rác bãi biển, cứu hộ chó mèo bị bỏ rơi', 'eco', TRUE);

-- 2. Duy nhất 1 tài khoản ADMIN1 (Mật khẩu: Password@123)
-- Hash bcrypt 10 rounds: $2b$10$tT3NyyOboVZ/i5WLJ1r9z.GL.43blMVC.GqYcOv847/RmRLDOqYdG
INSERT INTO `users` (
    `id`, `email`, `password_hash`, `full_name`, `phone_number`, `avatar_url`, `bio`, `role`, `status`, `is_email_verified`, `email_verified_at`, `created_at`, `updated_at`
) VALUES (
    UUID(),
    'admin1@crowdfunding.vn',
    '$2b$10$tT3NyyOboVZ/i5WLJ1r9z.GL.43blMVC.GqYcOv847/RmRLDOqYdG',
    'ADMIN1',
    '0901234567',
    'https://i.pravatar.cc/300?img=1',
    'Tài khoản Quản trị viên tối cao (ADMIN1)',
    'ADMIN',
    'ACTIVE',
    TRUE,
    NOW(),
    NOW(),
    NOW()
);
