-- Add storage quota management to users table
ALTER TABLE users 
ADD COLUMN storage_quota BIGINT DEFAULT 5368709120 AFTER is_admin, -- 5GB default
ADD COLUMN storage_used BIGINT DEFAULT 0 AFTER storage_quota;

-- Create audit_logs table for tracking all actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(20),
  resource_id VARCHAR(36),
  resource_name VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at DESC),
  INDEX idx_action (action),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add trash/soft delete functionality
ALTER TABLE files 
ADD COLUMN deleted_at TIMESTAMP NULL AFTER expires_at,
ADD COLUMN deleted_by VARCHAR(36) NULL AFTER deleted_at,
ADD INDEX idx_deleted_at (deleted_at);

ALTER TABLE folders 
ADD COLUMN deleted_at TIMESTAMP NULL AFTER created_at,
ADD COLUMN deleted_by VARCHAR(36) NULL AFTER deleted_at,
ADD INDEX idx_deleted_at (deleted_at);

-- Create teams/groups table
CREATE TABLE IF NOT EXISTS teams (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created_by (created_by),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create team members table
CREATE TABLE IF NOT EXISTS team_members (
  id VARCHAR(36) PRIMARY KEY,
  team_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  role ENUM('member', 'admin') DEFAULT 'member',
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_team_member (team_id, user_id),
  INDEX idx_team_id (team_id),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
