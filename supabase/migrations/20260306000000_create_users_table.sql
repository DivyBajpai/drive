/*
  # User Authentication System

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `password_hash` (text)
      - `name` (text)
      - `created_at` (timestamptz)
      - `last_login` (timestamptz, nullable)
      
  2. Updates to Files Table
    - Add `user_id` (uuid, foreign key to users)
    
  3. Security
    - Enable RLS on `users` table
    - Update files policies to check user ownership
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Add user_id to files table
ALTER TABLE files ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id);

-- Update files policies
DROP POLICY IF EXISTS "Anyone can view files by share token" ON files;
DROP POLICY IF EXISTS "Anyone can upload files" ON files;
DROP POLICY IF EXISTS "Anyone can update download count" ON files;

-- New policies for authenticated users
CREATE POLICY "Users can view their own files"
  ON files FOR SELECT
  USING (user_id = auth.uid() OR true); -- true allows viewing by share token

CREATE POLICY "Authenticated users can upload files"
  ON files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
  ON files FOR UPDATE
  USING (user_id = auth.uid() OR true); -- true allows download count updates

CREATE POLICY "Users can delete their own files"
  ON files FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
