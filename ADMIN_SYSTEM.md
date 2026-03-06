# Admin System Deployment Guide

## ✅ What Was Added

A complete admin system for managing user accounts with the following features:

### Admin Features
- **View all users** - See all registered users with their stats
- **Create users** - Add new users with optional admin privileges
- **Edit users** - Update user details (name, email, admin status)
- **Reset passwords** - Change any user's password
- **Delete users** - Remove users and all their files
- **User statistics** - View file count and last login for each user

### UI Features
- Tab-based navigation (My Files / User Management)
- Modal dialogs for create/edit/reset operations
- Admin badge in header
- Role indicators (Admin/User badges)
- Responsive table layout

## 📦 Deployment Steps

### Step 1: Update Database Schema

Run this SQL in phpMyAdmin on your production database (`ozgtvnee_cloud`):

```sql
-- Add admin role to users table
ALTER TABLE users 
ADD COLUMN is_admin TINYINT(1) DEFAULT 0 AFTER name;
```

### Step 2: Make Your Account an Admin

After running the SQL above, make your account an admin:

```sql
-- Replace 'your-email@example.com' with YOUR email
UPDATE users SET is_admin = 1 WHERE email = 'your-email@example.com';
```

### Step 3: Upload New API File

Upload this file to your server:
- `public/api/admin_users.php` → Upload to `/public_html/newcloud/api/admin_users.php`

### Step 4: Update Existing API Files

Upload these **updated** files from `public/api/` to replace the old ones:
- `auth.php` (now returns is_admin status)
- `login.php` (now returns is_admin status)
- `register.php` (now returns is_admin status)

### Step 5: Upload New Frontend

Upload the entire `dist` folder contents to replace files at `/public_html/newcloud/`:
- `index.html` (replace)
- `assets/` folder (replace all files)
  - `index-DR9aCsj1.css`
  - `index-B7Guuz_Z.js`

## 🧪 Testing the Admin System

### 1. Login as Admin
1. Go to `https://origincreativeagency.com/newcloud/`
2. Login with your account (that you made admin)
3. You should see an **ADMIN** badge next to your name
4. You should see two tabs: **My Files** and **User Management**

### 2. Test Admin Features

**User Management Tab:**
- Click "User Management" tab
- You should see a table of all users
- Try creating a new user with the "Create User" button
- Test editing a user (change name/email/admin status)
- Test resetting a user's password
- Test deleting a user (careful!)

**Permissions:**
- Regular users will NOT see the admin tab
- Only users with `is_admin = 1` can access admin features
- Non-admin users trying to access admin API will get 403 Forbidden

## 🔐 Security Notes

### Admin Access Control
- Admin status is stored in the database (`is_admin` column)
- All admin API endpoints verify admin status before allowing operations
- Regular users cannot access admin endpoints
- Admins cannot delete their own account (safety check)

### Password Management
- All passwords are hashed with bcrypt
- Admins can reset any user's password
- Password reset requires minimum 6 characters

### Cascade Deletions
- Deleting a user also deletes:
  - All their uploaded files (database records)
  - All their physical files in uploads folder
  - All their active sessions

## 📋 Admin Capabilities Summary

| Action | What Happens |
|--------|-------------|
| **Create User** | Creates new user account with optional admin privileges |
| **Edit User** | Update name, email, admin status, optionally change password |
| **Reset Password** | Set new password for any user |
| **Delete User** | Removes user and ALL their files permanently |
| **View Stats** | See file count and last login for each user |

## 🎨 UI Features

### For Admin Users:
- Admin badge displayed in header
- Tab navigation between Files and User Management
- Color-coded role badges (Purple for Admin, Gray for User)
- Action buttons with icons (Edit, Reset Password, Delete)

### For Regular Users:
- Standard file management interface
- No admin tab or features visible
- Cannot see other users or admin panel

## 🚀 Quick Start Commands

### Make an existing user admin:
```sql
UPDATE users SET is_admin = 1 WHERE email = 'user@example.com';
```

### Remove admin privileges:
```sql
UPDATE users SET is_admin = 0 WHERE email = 'user@example.com';
```

### View all admins:
```sql
SELECT id, email, name, is_admin, created_at FROM users WHERE is_admin = 1;
```

### Count users by role:
```sql
SELECT 
  SUM(CASE WHEN is_admin = 1 THEN 1 ELSE 0 END) as admins,
  SUM(CASE WHEN is_admin = 0 THEN 1 ELSE 0 END) as regular_users
FROM users;
```

## 🐛 Troubleshooting

### Admin tab not showing
- Check database: `SELECT is_admin FROM users WHERE email = 'your@email.com'`
- Make sure it returns `1`
- Clear browser cache and refresh
- Check browser console for errors

### 403 Forbidden on admin endpoints
- Verify you're logged in
- Check if your account has `is_admin = 1` in database
- Clear session and login again

### Changes not reflecting
- Hard refresh browser (Ctrl+F5 or Cmd+Shift+R)
- Clear localStorage and login again
- Check if correct files were uploaded

## ✨ Future Enhancements (Optional)

Ideas for extending the admin system:
- User activity logs
- Bulk user operations
- User groups/roles
- File storage quotas per user
- Email notifications for password resets
- Two-factor authentication for admins
- User suspension (instead of deletion)
- Export user list to CSV

---

The admin system is now fully functional! 🎉
