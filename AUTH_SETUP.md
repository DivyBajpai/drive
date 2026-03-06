# Authentication Setup Guide

## What Was Added

A complete login and registration system has been added to the file-sharing application with the following features:

### Backend (PHP API)
1. **Database Tables**:
   - `users` - stores user accounts (email, password_hash, name)
   - `sessions` - manages user sessions with tokens
   - Updated `files` table to include `user_id` for ownership

2. **API Endpoints**:
   - `api/register.php` - User registration
   - `api/login.php` - User login
   - `api/logout.php` - User logout
   - `api/auth.php` - Check authentication status

3. **Protected Endpoints**:
   - `api/upload.php` - Now requires authentication
   - `api/files.php` - Shows only user's files (requires auth)
   - `api/delete.php` - Checks file ownership before deletion

### Frontend (React/TypeScript)
1. **New Components**:
   - `Login.tsx` - Login form
   - `Register.tsx` - Registration form
   - `AuthContext.tsx` - Manages authentication state

2. **Updated Components**:
   - `App.tsx` - Shows login/register screens when not authenticated
   - `FileUpload.tsx` - Includes auth token in upload requests
   - `FileList.tsx` - Includes auth token in API requests

## Setup Instructions

### 1. Database Setup

Run the SQL setup script to create the required tables:

```bash
# Import the setup.sql file to your MySQL database
mysql -u ozgtvnee_admin -p ozgtvnee_cloud < public/api/setup.sql
```

Or execute the SQL manually:
- Open `public/api/setup.sql`
- Run it in phpMyAdmin or your MySQL client

### 2. Test the Application

1. **Start the development server** (if not already running):
   ```bash
   npm install
   npm run dev
   ```

2. **Create an account**:
   - Open the application in your browser
   - Click "Sign up" on the login screen
   - Fill in your name, email, and password (min 6 characters)
   - Click "Create Account"

3. **Login**:
   - After registration, you'll be automatically logged in
   - You can logout using the "Logout" button in the header
   - Login again using your email and password

4. **Upload files**:
   - Only authenticated users can upload files
   - Files are associated with the user who uploaded them
   - Each user can only see and manage their own files

5. **Share files**:
   - Share links still work publicly (no login required to download)
   - Anyone with a share link can download the file

## Security Features

- Passwords are hashed using PHP's `password_hash()` with bcrypt
- Session tokens are generated using secure random bytes
- Sessions expire after 30 days
- Files are protected by user ownership
- Authorization is checked via Bearer token in HTTP headers

## How It Works

1. **Registration/Login**: User provides credentials → Server validates → Creates session → Returns session token
2. **Session Storage**: Token is stored in browser's localStorage
3. **Authenticated Requests**: Token is sent in Authorization header for protected endpoints
4. **File Ownership**: When uploading, the file is associated with the authenticated user
5. **File Access**: Users can only view/edit/delete their own files

## API Authentication

All protected endpoints expect an Authorization header:

```
Authorization: Bearer <session_token>
```

The session token is automatically included by the frontend AuthContext.

## Troubleshooting

### Database Connection Issues
- Check `public/api/config.php` for correct database credentials
- Ensure the database exists and is accessible

### Session Issues
- Clear localStorage and login again
- Check browser console for errors
- Verify session tokens are being sent in requests

### Upload/Delete Fails
- Ensure you're logged in
- Check that the session token is in localStorage
- Verify the uploads directory has write permissions

## Next Steps (Optional Enhancements)

- Add email verification
- Implement password reset functionality
- Add user profile editing
- Add file sharing with specific users
- Implement file expiration
- Add file size limits per user
