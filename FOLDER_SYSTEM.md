# Folder System Deployment Guide

## ✅ What Was Added

A complete folder management system for organizing files with the following features:

### Folder Features
- **Create folders** - Organize files into folders and subfolders
- **Rename folders** - Change folder names
- **Delete folders** - Remove folders and all their contents
- **Navigate folders** - Browse through folder hierarchy with breadcrumbs
- **Share folders** - Generate share links for entire folders (all files inside)
- **Upload to folders** - Files can be uploaded directly into folders
- **Nested folders** - Support for unlimited folder depth

### File Organization
- Files can exist in folders or at root level
- Visual folder navigation with breadcrumb trail
- Separate display for folders and files
- Folder-aware file uploads

### Sharing
- Share entire folders with a single link
- Public folder view shows all files in folder (including subfolders)
- Individual files can still be shared separately

## 📦 Deployment Steps

### Step 1: Update Database Schema

Run this SQL in phpMyAdmin on your production database (`ozgtvnee_cloud`):

```sql
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
```

**Note:** The SQL file is also available at `public/api/create_folders.sql` for easy upload and execution.

### Step 2: Upload New API Files

Upload these **new** files to your server at `/public_html/newcloud/api/`:
- `folders.php` - Main folder CRUD operations
- `share_folder.php` - Folder sharing functionality

### Step 3: Update Existing API Files

Upload the **updated** `upload.php` from `public/api/` to replace the old one:
- Now supports `folder_id` parameter to upload files into folders

### Step 4: Upload New Frontend

Upload the entire `dist` folder contents to replace files at `/public_html/newcloud/`:
- `index.html` (replace)
- `assets/` folder (replace all files)
  - `index-RITxPKyo.css`
  - `index-CigJFXhu.js`

**Clean Up:** Delete old asset files (with different hashes) from the `assets/` folder.

## 🎨 User Interface Changes

### For All Users:

**New "My Files" Tab Layout:**
- **Breadcrumb navigation** - Shows current path (My Files > Folder Name > Subfolder)
- **"New Folder" button** - Create folders in current location
- **Folders section** - Displays folders with icons
- **Files section** - Displays files separately from folders
- **Folder actions** - Share, Rename, Delete (hover to see buttons)
- **File actions** - Share, Delete (same as before)

**Folder Navigation:**
- Click any folder to open it
- Click breadcrumb items to navigate back up
- Upload files directly into current folder

**Folder Sharing:**
- Click share icon on any folder
- Share link copied to clipboard automatically
- Recipients can view all files in folder (read-only)

### Folder Display:
- Yellow folder icons
- Folder name and creation date
- Hover actions: Share, Rename, Delete
- Click to navigate into folder

### File Display:
- Blue file icons (unchanged)
- File name, size, and upload date
- Actions: Share, Delete (same as before)

## 🔐 Security & Permissions

### Access Control:
- Users can only see and manage their own folders
- Folder ownership is tied to user accounts
- Nested folder permissions inherited from parent

### Cascade Deletions:
- Deleting a folder removes:
  - All files in the folder (database + physical files)
  - All subfolders recursively
  - All files in all subfolders
- Confirmation required before deletion

### Sharing:
- Shared folder links are public (anyone with link can view)
- Shared folders show all contained files recursively
- Users can download individual files from shared folders
- No modification allowed via shared links (read-only)

## 🧪 Testing the Folder System

### 1. Create Folders
1. Login to the app
2. Go to "My Files" tab
3. Click "New Folder" button
4. Enter folder name and click "Create"
5. Folder should appear in the list

### 2. Navigate Folders
1. Click on a folder to open it
2. Breadcrumb trail should show path
3. Click breadcrumb items to navigate back
4. Create nested folders by opening a folder first

### 3. Upload to Folders
1. Navigate into a folder
2. Upload files normally
3. Files should appear in the current folder
4. Navigate to root - files should not be there

### 4. Rename Folders
1. Hover over a folder
2. Click the edit (pencil) icon
3. Enter new name and click "Rename"
4. Folder name should update

### 5. Share Folders
1. Hover over a folder
2. Click the share icon
3. "Copied!" should show briefly
4. Open link in incognito/private window
5. All files in folder should be visible
6. Download should work for each file

### 6. Delete Folders
1. Hover over a folder
2. Click the trash icon
3. Confirm deletion
4. Folder and all contents should be removed

## 📋 API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `folders.php` | GET | List folders and files in current location |
| `folders.php` | POST | Create new folder |
| `folders.php` | PUT | Rename folder |
| `folders.php` | DELETE | Delete folder and contents |
| `share_folder.php` | GET | View shared folder (public) |
| `share_folder.php` | POST | Generate share link for folder |
| `upload.php` | POST | Upload file (now supports folder_id) |

## 🔄 Folder API Details

### List Folder Contents
```
GET /api/folders.php?folder_id={id}
```
Returns: folders, files, breadcrumbs, current_folder_id

Omit `folder_id` parameter to get root level contents.

### Create Folder
```
POST /api/folders.php
Body: { "name": "Folder Name", "parent_folder_id": "parent-id" }
```
Omit `parent_folder_id` to create at root level.

### Rename Folder
```
PUT /api/folders.php
Body: { "id": "folder-id", "name": "New Name" }
```

### Delete Folder
```
DELETE /api/folders.php?id={folder-id}
```
Cascades to all subfolders and files.

### Share Folder
```
POST /api/share_folder.php
Body: { "folder_id": "folder-id" }
```
Returns share token, generates if doesn't exist.

### View Shared Folder
```
GET /api/share_folder.php?token={share-token}
```
Public access, no authentication required.

## 🐛 Troubleshooting

### Folders not appearing
- Check database: `SELECT * FROM folders WHERE user_id = 'your-user-id'`
- Verify folders table was created
- Clear browser cache and refresh

### Can't create folders
- Check foreign key: users table must have matching id
- Verify user is authenticated
- Check browser console for errors

### Upload to folder fails
- Verify folder exists: `SELECT * FROM folders WHERE id = 'folder-id'`
- Check folder ownership matches user
- Ensure folder_id column exists in files table

### Shared folder link broken
- Verify shared_token is set in database
- Check share_folder.php file is uploaded
- Test with: `GET /api/share_folder.php?token={token}`

### Files not deleting with folder
- Check CASCADE delete is set on foreign keys
- Verify filepath column exists and is correct
- Check uploads folder permissions

## ✨ Features Comparison

| Feature | Before | After |
|---------|--------|-------|
| File organization | Flat list only | Folders + subfolders |
| Navigation | Scroll to find | Browse folders + breadcrumbs |
| Sharing | Individual files | Files + entire folders |
| Upload location | Root only | Any folder |
| File management | One level | Unlimited nesting |

## 🚀 Future Enhancements (Optional)

Ideas for extending the folder system:
- Drag and drop files between folders
- Move folders to different parent folders
- Bulk file operations (move, delete multiple)
- Folder permissions (share with specific users)
- Folder search and filtering
- Folder size calculation and quotas
- Folder thumbnail previews
- Zip folder download
- Folder templates
- Favorite folders

---

The folder system is now fully functional! 🎉

## 📝 Quick Start Commands

### Check folders exist:
```sql
SELECT f.name as folder_name, u.email as owner, COUNT(fi.id) as file_count
FROM folders f
LEFT JOIN users u ON f.user_id = u.id
LEFT JOIN files fi ON fi.folder_id = f.id
GROUP BY f.id, f.name, u.email;
```

### Find nested folder structure:
```sql
SELECT 
    f1.name as folder,
    f2.name as parent_folder,
    COUNT(fi.id) as files
FROM folders f1
LEFT JOIN folders f2 ON f1.parent_folder_id = f2.id
LEFT JOIN files fi ON fi.folder_id = f1.id
GROUP BY f1.id, f1.name, f2.name;
```

### Count files per folder:
```sql
SELECT 
    f.name as folder_name,
    COUNT(fi.id) as file_count,
    SUM(fi.file_size) as total_size
FROM folders f
LEFT JOIN files fi ON fi.folder_id = f.id
GROUP BY f.id, f.name;
```
