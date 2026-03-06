-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    parent_folder_id VARCHAR(36) DEFAULT NULL,
    shared_token VARCHAR(64) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_folder_id) REFERENCES folders(id) ON DELETE CASCADE,
    INDEX idx_user_folders (user_id),
    INDEX idx_parent_folder (parent_folder_id),
    INDEX idx_shared_token (shared_token)
);

-- Add folder_id column to files table
ALTER TABLE files 
ADD COLUMN folder_id VARCHAR(36) DEFAULT NULL AFTER user_id,
ADD FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE;

-- Add index for faster folder file lookups
ALTER TABLE files
ADD INDEX idx_folder_files (folder_id);
