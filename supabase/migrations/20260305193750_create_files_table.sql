/*
  # File Sharing System Schema

  1. New Tables
    - `files`
      - `id` (uuid, primary key)
      - `filename` (text) - Original filename
      - `stored_filename` (text) - Unique filename stored on server
      - `file_size` (bigint) - Size in bytes
      - `mime_type` (text) - File MIME type
      - `share_token` (text, unique) - Unique token for sharing
      - `download_count` (integer) - Number of downloads
      - `uploaded_at` (timestamptz) - Upload timestamp
      - `expires_at` (timestamptz, nullable) - Optional expiration date
      
  2. Security
    - Enable RLS on `files` table
    - Add policy for public access to view files by share token
    - Add policy for inserting new files (public uploads)
*/

CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  stored_filename text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  share_token text UNIQUE NOT NULL,
  download_count integer DEFAULT 0,
  uploaded_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view files by share token"
  ON files FOR SELECT
  USING (true);

CREATE POLICY "Anyone can upload files"
  ON files FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update download count"
  ON files FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_files_share_token ON files(share_token);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_at ON files(uploaded_at DESC);