# Internal User Sharing System

This guide covers the internal user-to-user sharing system that allows registered users to share files and folders with other specific users by email address, similar to Google Drive.

## Overview

The internal sharing system allows users to:
- Share files and folders with other registered users by entering their email addresses
- Grant view-only permissions (edit permissions prepared for future)
- See who has access to their resources
- Remove access from users they've shared with
- View all files and folders that others have shared with them in a "Shared with Me" tab
- Access shared folders as if they were their own (with permission checking)

This is different from the existing public share links which give anonymous access via URL.

## Architecture

### Database

**Table: `shares`**
- `id`: UUID primary key
- `resource_type`: ENUM('file', 'folder') - Type of resource being shared
- `resource_id`: UUID - ID of the file or folder
- `owner_id`: UUID - User who owns the resource
- `shared_with_id`: UUID - User the resource is shared with
- `permission`: ENUM('view', 'edit') - Access level (currently only 'view')
- `created_at`: Timestamp

### Backend APIs

**1. `public/api/shares.php`**
- `POST`: Create shares
  - Body: `{ resource_type, resource_id, emails[], permission }`
  - Finds users by email and creates shares for each
  - Returns success count and array of errors for failed emails
  - Prevents self-sharing and duplicate shares
  
- `GET`: List shares for a resource
  - Params: `resource_type`, `resource_id`
  - Returns array of users who have access with their details
  - Only resource owner can list shares
  
- `DELETE`: Remove a share
  - Params: `id`
  - Removes access from a user
  - Both owner and recipient can delete a share

**2. `public/api/shared_with_me.php`**
- `GET`: List all resources shared with current user
  - Returns two arrays: `shared_files` and `shared_folders`
  - Each includes owner information, permission level, and share timestamp
  - Folders include file count

**3. `public/api/folders.php` (Updated)**
- Added `hasAccessToFolder()` helper function
  - Checks if user owns folder OR has been granted access via shares table
- Updated all folder access checks to use this helper
- Ensures shared folders are accessible to recipients

### Frontend Components

**1. `src/components/ShareModal.tsx`**
- Modal dialog for sharing files and folders
- Email input with validation and add/remove functionality
- Displays current shares with remove buttons
- Handles multiple email addresses at once
- Shows success/error messages

**2. `src/components/SharedWithMe.tsx`**
- New tab view for resources shared with the user
- Separate sections for folders and files
- Grid view for folders with click-to-open
- Table view for files with download buttons
- Shows owner info, permission level, and share date
- Empty state when nothing is shared

**3. `src/components/FolderView.tsx` (Updated)**
- Added "Users" button (purple) next to folders and files
- Opens ShareModal for internal user sharing
- Existing "Share2" button (green) still available for public link sharing
- Both sharing methods work independently

**4. `src/App.tsx` (Updated)**
- Added "Shared with Me" tab for all users (not just admins)
- Tab navigation: My Files | Shared with Me | User Management (admin only)
- Renders SharedWithMe component when tab is active

## Deployment Steps

### 1. Database Setup

Run the SQL migration to create the `shares` table:

```bash
# In phpMyAdmin or MySQL client
# Navigate to: origincreativeagency.com/phpMyAdmin
# Database: ozgtvnee_cloud
# Run: public/api/create_shares.sql
```

Or manually:

```sql
CREATE TABLE shares (
    id VARCHAR(36) PRIMARY KEY,
    resource_type ENUM('file', 'folder') NOT NULL,
    resource_id VARCHAR(36) NOT NULL,
    owner_id VARCHAR(36) NOT NULL,
    shared_with_id VARCHAR(36) NOT NULL,
    permission ENUM('view', 'edit') NOT NULL DEFAULT 'view',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_share (resource_type, resource_id, shared_with_id),
    INDEX idx_owner (owner_id),
    INDEX idx_shared_with (shared_with_id),
    INDEX idx_resource (resource_type, resource_id)
);
```

### 2. Backend Files

Upload the following new and updated API files to `public/api/`:

**New Files:**
- `create_shares.sql` - Database migration
- `shares.php` - Sharing management API
- `shared_with_me.php` - View shared resources API

**Updated Files:**
- `folders.php` - Added shared access checking

Upload these to: `origincreativeagency.com/newcloud/api/`

### 3. Frontend Files

Build and upload the frontend:

```bash
# Build the frontend
npm run build

# Upload the dist folder contents to:
# origincreativeagency.com/newcloud/
```

Upload these files from `dist/`:
- `index.html`
- `assets/` (all CSS and JS files)

### 4. Verify Deployment

1. **Test Share Creation:**
   - Log in as a user
   - Navigate to My Files
   - Click the Users icon (purple) on a folder or file
   - Enter another user's email address
   - Click "Share"
   - Verify success message

2. **Test Shared Access:**
   - Log in as the user who received the share
   - Click "Shared with Me" tab
   - Verify the resource appears with owner info
   - For folders: Click to open and verify contents load
   - For files: Click download and verify file downloads

3. **Test Access Removal:**
   - As the owner: Open ShareModal, click trash icon next to a user
   - Verify share is removed
   - As recipient: Verify resource disappears from "Shared with Me"

4. **Test Edge Cases:**
   - Try sharing with non-existent email (should show error)
   - Try sharing with yourself (should show error)
   - Try sharing twice with same user (should prevent duplicate)

## Usage Guide

### For Users

**To Share a File or Folder:**
1. Navigate to "My Files"
2. Find the file or folder you want to share
3. Click the purple **Users** icon
4. Enter email address(es) of users you want to share with
5. Click "Add" for each email
6. Click "Share with X people"
7. The resource is now accessible to those users

**To View Items Shared With You:**
1. Click the "Shared with Me" tab
2. Browse folders (click to open) and files
3. Download files or navigate into shared folders

**To Remove Access:**
1. Open the ShareModal (click Users icon)
2. Find the user in "People with access"
3. Click the red trash icon next to their name
4. Confirm removal

### For Admins

- All standard user features apply
- The admin "User Management" tab is still available for managing accounts
- Admins can share just like regular users

## Technical Notes

### Security

- All API endpoints require authentication via Bearer token
- Share creation verifies resource ownership
- Folder access checks include both ownership AND share grants
- Users cannot share resources they don't own
- Users cannot share with themselves
- Cascading deletes remove shares when users are deleted

### Permissions

- Currently only 'view' permission is implemented
- 'edit' permission structure is in place for future expansion
- Files can only be downloaded, not modified through sharing
- Shared folders allow navigation but not deletion of contents

### Performance

- Indexed on owner_id, shared_with_id, and (resource_type, resource_id)
- Unique constraint prevents duplicate shares
- Efficient JOIN queries in shared_with_me.php

### Future Enhancements

Potential improvements:
- Edit permissions (allow shared users to modify/delete)
- Bulk sharing from CSV or user list
- Share expiration dates
- Email notifications when something is shared
- Share history/audit log
- Folder-level permissions inheritance
- Share groups (share with multiple users at once by group name)

## Troubleshooting

### "User not found" error
- Email address doesn't match any registered user
- Check spelling and case (email lookup is case-insensitive)

### Cannot access shared folder
- Verify the share exists in database
- Check that `hasAccessToFolder()` is implemented in folders.php
- Ensure foreign keys are properly set up

### Shares not appearing in "Shared with Me"
- Check that shared_with_me.php is deployed
- Verify shares table has records
- Check browser console for API errors

### Permission denied errors
- Verify user is authenticated (valid session token)
- Check that user owns resource (for creating shares)
- Verify share record exists (for accessing shared resources)

## Files Modified/Created

### New Files
- `src/components/ShareModal.tsx` - Share dialog component
- `src/components/SharedWithMe.tsx` - Shared resources view
- `public/api/shares.php` - Sharing API endpoints
- `public/api/shared_with_me.php` - List shared resources
- `public/api/create_shares.sql` - Database migration

### Modified Files
- `src/App.tsx` - Added Shared with Me tab
- `src/components/FolderView.tsx` - Added internal share buttons
- `public/api/folders.php` - Added shared access checking

## Support

For issues or questions:
1. Check browser console for API errors
2. Verify API responses in Network tab
3. Check database for share records
4. Review server logs at: origincreativeagency.com hosting panel
