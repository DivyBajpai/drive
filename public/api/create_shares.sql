-- Create shares table for user-to-user file/folder sharing
CREATE TABLE IF NOT EXISTS shares (
    id VARCHAR(36) PRIMARY KEY,
    resource_type ENUM('file', 'folder') NOT NULL,
    resource_id VARCHAR(36) NOT NULL,
    owner_id VARCHAR(36) NOT NULL,
    shared_with_id VARCHAR(36) NOT NULL,
    permission ENUM('view', 'edit') DEFAULT 'view',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_share (resource_type, resource_id, shared_with_id),
    INDEX idx_shared_with (shared_with_id),
    INDEX idx_owner (owner_id),
    INDEX idx_resource (resource_type, resource_id)
);
