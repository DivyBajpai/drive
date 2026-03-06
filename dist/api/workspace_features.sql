-- Add version history, activity log, tags, and favorites

-- 1. File Versions Table
CREATE TABLE IF NOT EXISTS file_versions (
    id VARCHAR(36) COLLATE utf8mb4_unicode_ci PRIMARY KEY,
    file_id VARCHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
    version_number INT NOT NULL,
    stored_filename VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_by VARCHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comment TEXT COLLATE utf8mb4_unicode_ci,
    
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_file_id (file_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Activity Log Table
CREATE TABLE IF NOT EXISTS activity_log (
    id VARCHAR(36) COLLATE utf8mb4_unicode_ci PRIMARY KEY,
    user_id VARCHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
    action_type ENUM('upload', 'download', 'preview', 'share', 'delete', 'rename', 'move', 'create_folder', 'delete_folder', 'rename_folder', 'favorite', 'unfavorite', 'tag', 'untag') NOT NULL,
    resource_type ENUM('file', 'folder') NOT NULL,
    resource_id VARCHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
    resource_name VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    details TEXT COLLATE utf8mb4_unicode_ci,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_created_at (created_at),
    INDEX idx_action_type (action_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tags Table
CREATE TABLE IF NOT EXISTS tags (
    id VARCHAR(36) COLLATE utf8mb4_unicode_ci PRIMARY KEY,
    user_id VARCHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
    name VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
    color VARCHAR(7) COLLATE utf8mb4_unicode_ci DEFAULT '#3B82F6',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_tag (user_id, name),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. File Tags (Many-to-Many)
CREATE TABLE IF NOT EXISTS file_tags (
    file_id VARCHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
    tag_id VARCHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (file_id, tag_id),
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    INDEX idx_tag_id (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Add favorites column to files
ALTER TABLE files 
ADD COLUMN is_favorite TINYINT(1) DEFAULT 0 AFTER mime_type,
ADD INDEX idx_favorite (user_id, is_favorite);

-- 6. Add favorites column to folders
ALTER TABLE folders 
ADD COLUMN is_favorite TINYINT(1) DEFAULT 0 AFTER shared_token,
ADD INDEX idx_favorite (user_id, is_favorite);
