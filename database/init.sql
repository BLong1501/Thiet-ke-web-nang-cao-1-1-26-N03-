-- ====================================================================
-- Hệ thống Gây quỹ Cộng đồng (Crowdfunding Platform) - CĐ09
-- Database DDL Initialization Script (MySQL 8.0)
-- Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ====================================================================

CREATE DATABASE IF NOT EXISTS `crowdfunding_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `crowdfunding_db`;

-- Tắt kiểm tra khóa ngoại tạm thời để khởi tạo
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `comments`;
DROP TABLE IF EXISTS `community_posts`;
DROP TABLE IF EXISTS `community_members`;
DROP TABLE IF EXISTS `communities`;
DROP TABLE IF EXISTS `disbursements`;
DROP TABLE IF EXISTS `donations`;
DROP TABLE IF EXISTS `campaign_updates`;
DROP TABLE IF EXISTS `campaign_media`;
DROP TABLE IF EXISTS `campaigns`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `verifications`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------------------
-- 1. BẢNG USERS (Người dùng hệ thống)
-- --------------------------------------------------------------------
CREATE TABLE `users` (
    `id` VARCHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `phone_number` VARCHAR(20) NULL,
    `avatar_url` VARCHAR(500) NULL,
    `bio` TEXT NULL,
    `role` ENUM('ADMIN', 'FUNDRAISER', 'USER') NOT NULL DEFAULT 'USER',
    `status` ENUM('ACTIVE', 'SUSPENDED', 'BANNED') NOT NULL DEFAULT 'ACTIVE',
    `is_email_verified` BOOLEAN NOT NULL DEFAULT FALSE,
    `email_verified_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE INDEX `idx_users_email` (`email`),
    INDEX `idx_users_role` (`role`),
    INDEX `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 2. BẢNG VERIFICATIONS (Hồ sơ xác minh danh tính - KYC)
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
    `supporting_documents` JSON NULL COMMENT 'Mảng URLs các tài liệu bảo trợ/chứng minh',
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
-- 3. BẢNG CATEGORIES (Danh mục chiến dịch)
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
-- 4. BẢNG CAMPAIGNS (Chiến dịch gây quỹ)
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
-- 5. BẢNG CAMPAIGN_MEDIA (Hình ảnh / Video minh chứng chiến dịch)
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
-- 6. BẢNG CAMPAIGN_UPDATES (Bản tin cập nhật tiến độ chiến dịch)
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
-- 7. BẢNG DONATIONS (Khoản quyên góp / Giao dịch thanh toán)
-- --------------------------------------------------------------------
CREATE TABLE `donations` (
    `id` VARCHAR(36) NOT NULL,
    `campaign_id` VARCHAR(36) NOT NULL,
    `donor_id` VARCHAR(36) NULL COMMENT 'Null nếu người dùng chưa đăng nhập hoặc ủng hộ ẩn danh hoàn toàn',
    `transaction_code` VARCHAR(64) NOT NULL COMMENT 'Mã đối soát giao dịch duy nhất',
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
-- 8. BẢNG DISBURSEMENTS (Minh bạch giải ngân & Các khoản chi)
-- --------------------------------------------------------------------
CREATE TABLE `disbursements` (
    `id` VARCHAR(36) NOT NULL,
    `campaign_id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `disbursement_date` DATE NOT NULL,
    `proof_documents` JSON NOT NULL COMMENT 'Danh sách link ảnh hóa đơn, sao kê thực tế',
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
-- 9. BẢNG COMMUNITIES (Cộng đồng / Nhóm thiện nguyện)
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
-- 10. BẢNG COMMUNITY_MEMBERS (Thành viên cộng đồng)
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
-- 11. BẢNG COMMUNITY_POSTS (Bài viết trong cộng đồng)
-- --------------------------------------------------------------------
CREATE TABLE `community_posts` (
    `id` VARCHAR(36) NOT NULL,
    `community_id` VARCHAR(36) NOT NULL,
    `author_id` VARCHAR(36) NOT NULL,
    `campaign_id` VARCHAR(36) NULL COMMENT 'Tùy chọn: Gắn thẻ chiến dịch cần lan tỏa trong bài viết',
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
-- 12. BẢNG COMMENTS (Bình luận bài viết & chiến dịch)
-- --------------------------------------------------------------------
CREATE TABLE `comments` (
    `id` VARCHAR(36) NOT NULL,
    `post_id` VARCHAR(36) NULL,
    `campaign_id` VARCHAR(36) NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `parent_id` VARCHAR(36) NULL COMMENT 'Bình luận lồng nhau (Replies)',
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
-- 13. BẢNG AUDIT_LOGS (Vết kiểm toán hệ thống - Append Only)
-- --------------------------------------------------------------------
CREATE TABLE `audit_logs` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NULL,
    `action` VARCHAR(100) NOT NULL COMMENT 'VD: APPROVE_CAMPAIGN, REJECT_KYC, REFUND_DONATION',
    `entity_name` VARCHAR(50) NOT NULL COMMENT 'VD: Campaign, Verification, Donation',
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

-- ====================================================================
-- SEED DATA BAN ĐẦU
-- ====================================================================

-- 1. Thêm danh mục mặc định
INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `icon_url`, `is_active`)
VALUES 
    (UUID(), 'Y tế & Cứu trợ bệnh nhân', 'y-te-cuu-tro-benh-nhan', 'Hỗ trợ chi phí viện phí, mổ tim, điều trị bệnh hiểm nghèo', 'medical_services', TRUE),
    (UUID(), 'Giáo dục & Học sinh nghèo', 'giao-duc-hoc-sinh-ngheo', 'Trao học bổng, xây trường vùng cao, tặng sách vở và thiết bị học tập', 'school', TRUE),
    (UUID(), 'Cứu trợ Thiên tai & Khẩn cấp', 'cuu-tro-thien-tai-khan-cap', 'Hỗ trợ đồng bào lũ lụt, sạt lở, bão gió tái thiết cuộc sống', 'flood', TRUE),
    (UUID(), 'Trẻ em & Hoàn cảnh khó khăn', 'tre-em-hoan-canh-kho-khan', 'Chăm lo bữa ăn dinh dưỡng, áo ấm, bảo trợ trẻ em cơ nhỡ', 'child_care', TRUE),
    (UUID(), 'Bảo vệ Môi trường & Động vật', 'moi-truong-dong-vat', 'Trồng rừng, dọn rác bãi biển, cứu hộ chó mèo bị bỏ rơi', 'eco', TRUE)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2. Thêm tài khoản Quản trị viên (Admin) mặc định
-- Mật khẩu mặc định: Admin@123456 (Hash bcrypt với salt round = 10: $2b$10$w099v7fW5g3yZ6Dk0JzG..Y6tO6i7f0c1lVqXUjLz9Yd5B2B8gXm6)
INSERT INTO `users` (`id`, `email`, `password_hash`, `full_name`, `phone_number`, `role`, `status`, `is_email_verified`)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'admin@crowdfunding.vn', '$2a$10$Zf8bL2c3a/9kU1D1O5t6uOPs1F4W5v1l7e8n3u6g9y0h1k2l3m4n5', 'Quản trị viên Hệ thống', '0901234567', 'ADMIN', 'ACTIVE', TRUE)
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);
