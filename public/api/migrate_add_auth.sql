-- Migration script to add authentication to existing files table

-- Add user_id column to files table
ALTER TABLE files 
ADD COLUMN user_id VARCHAR(36) NULL AFTER id;

-- Add index for user_id
ALTER TABLE files
ADD INDEX idx_files_user_id (user_id);

-- Optional: Add foreign key constraint (uncomment if you want strict referential integrity)
-- ALTER TABLE files
-- ADD CONSTRAINT fk_files_user_id 
-- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Clean up old files without user_id (uncomment if you want to delete them)
-- DELETE FROM files WHERE user_id IS NULL;

-- Or assign old files to a specific user (uncomment and replace 'USER_ID_HERE')
-- UPDATE files SET user_id = 'USER_ID_HERE' WHERE user_id IS NULL;
