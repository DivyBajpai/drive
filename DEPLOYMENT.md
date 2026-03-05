# cPanel Deployment Guide

## Prerequisites
- cPanel hosting account with PHP support
- Node.js installed locally for building
- Supabase account configured

## Deployment Steps

### 1. Build the Project
```bash
npm install
npm run build
```

### 2. Upload Files to cPanel
Upload the following to your cPanel public_html directory (or subdomain folder):

- All files from the `dist/` folder (after build)
- The entire `public/api/` folder
- The `public/uploads/` folder (will be created automatically)

### 3. File Structure on cPanel
```
public_html/
├── index.html
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
├── api/
│   ├── .htaccess
│   ├── upload.php
│   ├── download.php
│   └── delete.php
└── uploads/
    └── .htaccess
```

### 4. Set Permissions
Using cPanel File Manager:
- Set `uploads/` directory to 755
- Set `api/` directory to 755
- Set all PHP files to 644

### 5. Configure Environment Variables
Create a `.env` file in your project root with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 6. PHP Configuration
The `.htaccess` file in the `api/` folder configures:
- Upload size limit: 100MB
- Execution timeout: 300 seconds
- Directory listing disabled

Adjust these values in `public/api/.htaccess` if needed.

### 7. Security Notes
- The `uploads/` folder is protected by `.htaccess` to prevent direct access
- Files can only be downloaded through the PHP script
- All uploads are tracked in the Supabase database

## Troubleshooting

### Upload Issues
- Check PHP upload_max_filesize in cPanel
- Verify folder permissions (755 for uploads/)
- Check PHP error logs in cPanel

### Database Issues
- Verify Supabase credentials in environment variables
- Check browser console for errors
- Ensure RLS policies are properly configured

### Download Issues
- Verify file exists in uploads/ folder
- Check file permissions (644)
- Review PHP error logs

## Features
- Drag and drop file upload
- Unique shareable links for each file
- Download tracking
- File management (delete)
- Responsive design
- Real-time file list updates
