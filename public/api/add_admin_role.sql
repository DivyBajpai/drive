-- Add admin functionality to users table

-- Add is_admin column to users table
ALTER TABLE users 
ADD COLUMN is_admin TINYINT(1) DEFAULT 0 AFTER name;

-- Create an admin user (update with your email after registration)
-- UPDATE users SET is_admin = 1 WHERE email = 'your-admin-email@example.com';
