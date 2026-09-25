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

DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `reports`;
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
    UNIQUE INDEX `idx_users_google_id` (`google_id`),
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

-- --------------------------------------------------------------------
-- 14. BẢNG REPORTS (Báo cáo tố giác vi phạm)
-- --------------------------------------------------------------------
CREATE TABLE `reports` (
    `id` VARCHAR(36) NOT NULL,
    `reporter_id` VARCHAR(36) NOT NULL COMMENT 'Người gửi tố giác',
    `target_type` ENUM('CAMPAIGN', 'USER', 'POST', 'COMMENT') NOT NULL,
    `target_id` VARCHAR(36) NOT NULL COMMENT 'ID của chiến dịch/bài viết bị báo cáo',
    `reason` VARCHAR(255) NOT NULL COMMENT 'Lý do: Lừa đảo, giả mạo, hình ảnh phản cảm...',
    `description` TEXT NULL COMMENT 'Mô tả chi tiết bằng chứng',
    `evidence_urls` JSON NULL COMMENT 'Mảng link ảnh/video bằng chứng tố giác',
    `status` ENUM('PENDING', 'RESOLVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `resolved_by` VARCHAR(36) NULL COMMENT 'Admin xử lý',
    `resolution_note` TEXT NULL COMMENT 'Ghi chú giải quyết của Admin',
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
-- 15. BẢNG NOTIFICATIONS (Thông báo người dùng)
-- --------------------------------------------------------------------
CREATE TABLE `notifications` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL COMMENT 'Người nhận thông báo',
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `type` VARCHAR(50) NOT NULL COMMENT 'KYC_APPROVED, DONATION_SUCCESS, CAMPAIGN_UPDATE...',
    `link_url` VARCHAR(500) NULL COMMENT 'Link điều hướng khi click vào thông báo',
    `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_notifications_user` (`user_id`, `is_read`),
    INDEX `idx_notifications_created_at` (`created_at`),
    CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- SEED DATA BAN ĐẦU - KỊCH BẢN THỬ NGHIỆM ĐỒNG BỘ
-- Mật khẩu chung cho tất cả tài khoản mẫu: Password@123
-- Hash bcrypt: $2b$10$V..Aowez9GPQlsSOie0ZQO7Z23uhDj.LWBVBwYjd7H/KzhB2q5sYS
-- ====================================================================

-- 1. Danh mục chiến dịch chuẩn (5 Danh mục)
INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `icon_url`, `is_active`)
VALUES 
    ('b0000000-0000-0000-0000-000000000001', 'Y tế & Cứu trợ bệnh nhân', 'y-te-cuu-tro-benh-nhan', 'Hỗ trợ chi phí viện phí, mổ tim, điều trị bệnh hiểm nghèo', 'medical_services', TRUE),
    ('b0000000-0000-0000-0000-000000000002', 'Giáo dục & Học sinh nghèo', 'giao-duc-hoc-sinh-ngheo', 'Trao học bổng, xây trường vùng cao, tặng sách vở và thiết bị học tập', 'school', TRUE),
    ('b0000000-0000-0000-0000-000000000003', 'Cứu trợ Thiên tai & Khẩn cấp', 'cuu-tro-thien-tai-khan-cap', 'Hỗ trợ đồng bào lũ lụt, sạt lở, bão gió tái thiết cuộc sống', 'flood', TRUE),
    ('b0000000-0000-0000-0000-000000000004', 'Trẻ em & Hoàn cảnh khó khăn', 'tre-em-hoan-canh-kho-khan', 'Chăm lo bữa ăn dinh dưỡng, áo ấm, bảo trợ trẻ em cơ nhỡ', 'child_care', TRUE),
    ('b0000000-0000-0000-0000-000000000005', 'Bảo vệ Môi trường & Động vật', 'moi-truong-dong-vat', 'Trồng rừng, dọn rác bãi biển, cứu hộ chó mèo bị bỏ rơi', 'eco', TRUE)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2. Tài khoản người dùng mẫu theo kịch bản vai trò
INSERT INTO `users` (`id`, `email`, `password_hash`, `full_name`, `phone_number`, `avatar_url`, `bio`, `role`, `status`, `is_email_verified`, `email_verified_at`, `created_at`, `updated_at`)
VALUES 
    -- Kịch bản 1: Quản trị viên (Admin)
    ('a0000000-0000-0000-0000-000000000001', 'admin@crowdfunding.vn', '$2b$10$V..Aowez9GPQlsSOie0ZQO7Z23uhDj.LWBVBwYjd7H/KzhB2q5sYS', 'Quản trị viên Hệ thống', '0901234567', 'https://i.pravatar.cc/300?img=1', 'Quản trị viên phụ trách xét duyệt và an toàn quỹ', 'ADMIN', 'ACTIVE', TRUE, NOW(), NOW(), NOW()),
    
    -- Kịch bản 2: Người gây quỹ đã xác minh KYC (Verified Fundraiser)
    ('u0000000-0000-0000-0000-000000000002', 'fundraiser@gmail.com', '$2b$10$V..Aowez9GPQlsSOie0ZQO7Z23uhDj.LWBVBwYjd7H/KzhB2q5sYS', 'Lê Hoàng Nam (Tình nguyện viên)', '0912345678', 'https://i.pravatar.cc/300?img=12', 'Trưởng nhóm thiện nguyện Cầu Vồng Yêu Thương', 'FUNDRAISER', 'ACTIVE', TRUE, NOW(), NOW(), NOW()),
    
    -- Kịch bản 3: Người dùng nộp hồ sơ KYC đang chờ Admin duyệt (Pending KYC)
    ('u0000000-0000-0000-0000-000000000003', 'pending_kyc@gmail.com', '$2b$10$V..Aowez9GPQlsSOie0ZQO7Z23uhDj.LWBVBwYjd7H/KzhB2q5sYS', 'Phạm Thị Cúc', '0987654321', 'https://i.pravatar.cc/300?img=5', 'Cần gây quỹ hỗ trợ viện phí cho cháu gái', 'USER', 'ACTIVE', TRUE, NOW(), NOW(), NOW()),
    
    -- Kịch bản 4: Nhà hảo tâm tích cực (Donor 1)
    ('u0000000-0000-0000-0000-000000000004', 'donor1@gmail.com', '$2b$10$V..Aowez9GPQlsSOie0ZQO7Z23uhDj.LWBVBwYjd7H/KzhB2q5sYS', 'Nguyễn Văn An', '0933333333', 'https://i.pravatar.cc/300?img=60', 'Ủng hộ các hoàn cảnh trẻ em vùng cao', 'USER', 'ACTIVE', TRUE, NOW(), NOW(), NOW()),

    -- Kịch bản 5: Nhà hảo tâm 2 (Donor 2)
    ('u0000000-0000-0000-0000-000000000005', 'donor2@gmail.com', '$2b$10$V..Aowez9GPQlsSOie0ZQO7Z23uhDj.LWBVBwYjd7H/KzhB2q5sYS', 'Trần Thị Bình', '0944444444', 'https://i.pravatar.cc/300?img=47', 'Lan tỏa tinh thần tương thân tương ái', 'USER', 'ACTIVE', TRUE, NOW(), NOW(), NOW())
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`);

-- 3. Hồ sơ xác minh KYC (Verifications)
INSERT INTO `verifications` (`id`, `user_id`, `id_card_number`, `card_issued_date`, `card_issued_place`, `front_card_image`, `back_card_image`, `portrait_image`, `supporting_documents`, `status`, `reviewed_by`, `reviewed_at`, `created_at`, `updated_at`)
VALUES
    -- Hồ sơ 1: Đã được duyệt (APPROVED) -> Đã nâng user lên FUNDRAISER
    ('v0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000002', '001095012345', '2021-05-15', 'Cục Cảnh sát QLHC về TTXH', 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f', 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb', JSON_ARRAY('https://images.unsplash.com/photo-1584515979956-d9f6e5d09982'), 'APPROVED', 'a0000000-0000-0000-0000-000000000001', NOW(), NOW(), NOW()),

    -- Hồ sơ 2: Đang chờ duyệt (PENDING) -> Để Admin test chức năng duyệt / từ chối
    ('v0000000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000003', '079198054321', '2022-08-20', 'Cục Cảnh sát QLHC về TTXH', 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f', 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d', JSON_ARRAY('https://images.unsplash.com/photo-1584515979956-d9f6e5d09982'), 'PENDING', NULL, NULL, NOW(), NOW())
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- 4. Chiến dịch gây quỹ đa trạng thái (Campaigns)
INSERT INTO `campaigns` (`id`, `fundraiser_id`, `category_id`, `title`, `slug`, `short_description`, `story`, `cover_image_url`, `target_amount`, `current_amount`, `donor_count`, `start_date`, `end_date`, `status`, `bank_account_number`, `bank_name`, `bank_account_name`, `created_at`, `updated_at`)
VALUES
    -- Chiến dịch 1: Đang gây quỹ tích cực (ACTIVE) - Đã có 3 lượt đóng góp = 35.000.000 VNĐ
    ('c0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Chung tay phẫu thuật tim bẩm sinh cho bé Bắp 3 tuổi', 'phau-thuat-tim-be-bap-3-tuoi', 'Bé Bắp mắc chứng thông liên thất nặng cần mổ gấp tại Viện Tim TP.HCM.', 'Gia đình bé Bắp ở vùng sâu khó khăn, bố mẹ làm nông không có khả năng chi trả 100 triệu tiền phẫu thuật. Rất mong sự chung tay của cộng đồng.', 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7', 100000000.00, 35000000.00, 3, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_ADD(NOW(), INTERVAL 25 DAY), 'ACTIVE', '19034567890123', 'Techcombank', 'LE HOANG NAM', NOW(), NOW()),

    -- Chiến dịch 2: Đã hoàn thành mục tiêu (COMPLETED) - Đạt 105% mục tiêu
    ('c0000000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Xây 2 phòng học mới kiên cố cho học sinh điểm trường Tà Mung', 'xay-phong-hoc-ta-mung', 'Mang lại mái trường ấm áp mùa đông cho 60 em nhỏ Lai Châu.', 'Điểm trường cũ tạm bợ bằng nứa dột nát mỗi khi mưa bão. Dự án đã huy động thành công và chuẩn bị bàn giao.', 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6', 200000000.00, 210000000.00, 45, DATE_SUB(NOW(), INTERVAL 60 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY), 'COMPLETED', '19034567890123', 'Techcombank', 'LE HOANG NAM', NOW(), NOW()),

    -- Chiến dịch 3: Chờ duyệt (PENDING_APPROVAL) - Để Admin kiểm tra tính năng duyệt chiến dịch
    ('c0000000-0000-0000-0000-000000000003', 'u0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Ủng hộ viện phí ghép tủy cho bệnh nhi ung thư máu', 'ung-ho-vien-phi-ghep-tuy', 'Chiến dịch mới được tạo, đang chờ ban quản trị phê duyệt hồ sơ bệnh viện.', 'Chi tiết hồ sơ bệnh viện Truyền Máu Huyết Học đã được đính kèm đầy đủ.', 'https://images.unsplash.com/photo-1579684385127-1ef15d508118', 150000000.00, 0.00, 0, NOW(), DATE_ADD(NOW(), INTERVAL 45 DAY), 'PENDING_APPROVAL', '19034567890123', 'Techcombank', 'LE HOANG NAM', NOW(), NOW())
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- 5. Minh chứng ảnh & Nhật ký tiến độ
INSERT INTO `campaign_media` (`id`, `campaign_id`, `media_type`, `url`, `caption`, `sort_order`)
VALUES
    (UUID(), 'c0000000-0000-0000-0000-000000000001', 'IMAGE', 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7', 'Ảnh bé Bắp nằm điều trị tại phòng khám', 1),
    (UUID(), 'c0000000-0000-0000-0000-000000000001', 'IMAGE', 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982', 'Giấy chỉ định phẫu thuật của Bác sĩ', 2);

INSERT INTO `campaign_updates` (`id`, `campaign_id`, `title`, `content`, `created_at`, `updated_at`)
VALUES
    (UUID(), 'c0000000-0000-0000-0000-000000000001', 'Cập nhật ngày thứ 3: Bé Bắp đã hoàn tất xét nghiệm tiền phẫu', 'Cảm ơn các nhà hảo tâm đã ủng hộ được 35 triệu. Bé đã được nhập viện và đang chờ hội chẩn lịch mổ.', NOW(), NOW());

-- 6. Lịch sử đóng góp quyên góp (Donations)
INSERT INTO `donations` (`id`, `campaign_id`, `donor_id`, `transaction_code`, `amount`, `donor_name`, `donor_email`, `donor_phone`, `message`, `is_anonymous`, `payment_method`, `payment_status`, `paid_at`, `created_at`, `updated_at`)
VALUES
    -- Khoản 1: Người dùng đăng nhập (Donor 1) ủng hộ 20.000.000đ qua VNPay
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000004', 'TXN_VNP_20260920_0001', 20000000.00, 'Nguyễn Văn An', 'donor1@gmail.com', '0933333333', 'Chúc con sớm bình phục và khỏe mạnh nhé con!', FALSE, 'VNPAY', 'SUCCESS', DATE_SUB(NOW(), INTERVAL 3 DAY), NOW(), NOW()),

    -- Khoản 2: Người dùng đăng nhập (Donor 2) ủng hộ 10.000.000đ qua MOMO
    ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000005', 'TXN_MOM_20260921_0002', 10000000.00, 'Trần Thị Bình', 'donor2@gmail.com', '0944444444', 'Gia đình hãy cố gắng lên nhé!', FALSE, 'MOMO', 'SUCCESS', DATE_SUB(NOW(), INTERVAL 2 DAY), NOW(), NOW()),

    -- Khoản 3: Nhà hảo tâm vãng lai ỦNG HỘ ẨN DANH 5.000.000đ qua Chuyển khoản
    ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', NULL, 'TXN_BNK_20260922_0003', 5000000.00, 'Một nhà hảo tâm giấu tên', 'anonym@gmail.com', '0988888888', 'Cầu chúc mọi sự bình an đến với bé Bắp.', TRUE, 'BANK_TRANSFER', 'SUCCESS', DATE_SUB(NOW(), INTERVAL 1 DAY), NOW(), NOW())
ON DUPLICATE KEY UPDATE `amount` = VALUES(`amount`);

-- 7. Minh bạch chi tiêu / Sao kê giải ngân (Disbursements - Tính năng cốt lõi)
INSERT INTO `disbursements` (`id`, `campaign_id`, `title`, `amount`, `disbursement_date`, `proof_documents`, `note`, `created_by`, `created_at`, `updated_at`)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Đợt 1: Tạm ứng viện phí phẫu thuật tại Bệnh viện Tim', 30000000.00, CURDATE(), JSON_ARRAY('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c', 'https://images.unsplash.com/photo-1554224154-26032ffc0d07'), 'Đã nộp tạm ứng đợt 1 trực tiếp tại phòng tài vụ bệnh viện. Đính kèm hóa đơn đỏ và phiếu thu có dấu mộc.', 'u0000000-0000-0000-0000-000000000002', NOW(), NOW())
ON DUPLICATE KEY UPDATE `amount` = VALUES(`amount`);

-- 8. Tố giác vi phạm (Reports)
INSERT INTO `reports` (`id`, `reporter_id`, `target_type`, `target_id`, `reason`, `description`, `evidence_urls`, `status`, `created_at`, `updated_at`)
VALUES
    (UUID(), 'u0000000-0000-0000-0000-000000000004', 'CAMPAIGN', 'c0000000-0000-0000-0000-000000000003', 'Nghi ngờ trùng lặp nội dung hoàn cảnh', 'Ảnh bìa có dấu hiệu lấy từ chiến dịch cũ trên mạng, đề nghị admin kiểm tra kỹ bệnh án trước khi duyệt.', JSON_ARRAY('https://images.unsplash.com/photo-1589829545856-d10d557cf95f'), 'PENDING', NOW(), NOW());

-- 9. Thông báo người dùng (Notifications)
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `link_url`, `is_read`)
VALUES
    (UUID(), 'u0000000-0000-0000-0000-000000000002', 'Hồ sơ KYC đã được phê duyệt', 'Chúc mừng bạn! Hồ sơ xác minh danh tính của bạn đã được duyệt. Bạn hiện có thể tạo chiến dịch gây quỹ.', 'KYC_APPROVED', '/campaigns/create', TRUE),
    (UUID(), 'u0000000-0000-0000-0000-000000000002', 'Chiến dịch có khoản ủng hộ mới', 'Nhà hảo tâm Nguyễn Văn An vừa ủng hộ 20.000.000 VNĐ vào chiến dịch của bạn.', 'DONATION_SUCCESS', '/campaigns/phau-thuat-tim-be-bap-3-tuoi', FALSE);

-- 10. Vết kiểm toán (Audit Logs)
INSERT INTO `audit_logs` (`id`, `user_id`, `action`, `entity_name`, `entity_id`, `details`, `ip_address`)
VALUES
    (UUID(), 'a0000000-0000-0000-0000-000000000001', 'APPROVE_KYC', 'Verification', 'v0000000-0000-0000-0000-000000000001', JSON_OBJECT('result', 'APPROVED', 'note', 'CCCD hợp lệ, ảnh chân dung trùng khớp'), '127.0.0.1'),
    (UUID(), 'a0000000-0000-0000-0000-000000000001', 'APPROVE_CAMPAIGN', 'Campaign', 'c0000000-0000-0000-0000-000000000001', JSON_OBJECT('result', 'ACTIVE', 'note', 'Đầy đủ giấy chứng nhận bệnh án viện tim'), '127.0.0.1');
