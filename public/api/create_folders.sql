-- Create folders table (without self-referencing foreign key first)
CREATE TABLE IF NOT EXISTS folders (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    parent_folder_id VARCHAR(36) DEFAULT NULL,
    shared_token VARCHAR(64) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_folders (user_id),
    INDEX idx_parent_folder (parent_folder_id),
    INDEX idx_shared_token (shared_token),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add self-referencing foreign key after table exists
ALTER TABLE folders
ADD CONSTRAINT fk_parent_folder 
FOREIGN KEY (parent_folder_id) REFERENCES folders(id) ON DELETE CASCADE;

-- Add folder_id column to files table
ALTER TABLE files 
ADD COLUMN folder_id VARCHAR(36) DEFAULT NULL AFTER user_id;

-- Add index for folder_id
ALTER TABLE files
ADD INDEX idx_folder_files (folder_id);

-- Add foreign key for folder_id
ALTER TABLE files
ADD CONSTRAINT fk_file_folder
FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE;
