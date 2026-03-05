# File Sharing Platform

A modern file sharing application designed for cPanel hosting with secure file storage and shareable links.

## Features

- **Drag & Drop Upload**: Easy file uploading with drag-and-drop support
- **Unique Share Links**: Each file gets a unique shareable link
- **Download Tracking**: Track how many times each file has been downloaded
- **File Management**: View, download, and delete uploaded files
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Secure Storage**: Files stored in protected directory on cPanel

## Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: PHP (for file operations)
- **Database**: Supabase (for file metadata)
- **Icons**: Lucide React

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── FileUpload.tsx    # Drag-and-drop file upload
│   │   ├── FileList.tsx      # Display and manage files
│   │   └── SharedFileView.tsx # Public file download page
│   ├── lib/
│   │   └── supabase.ts       # Supabase client config
│   └── App.tsx               # Main application
├── public/
│   ├── api/
│   │   ├── upload.php        # Handle file uploads
│   │   ├── download.php      # Handle file downloads
│   │   ├── delete.php        # Handle file deletion
│   │   └── .htaccess         # PHP configuration
│   └── uploads/
│       └── .htaccess         # Protect upload directory
└── DEPLOYMENT.md             # Deployment instructions
```

## How It Works

1. **Upload**: Users upload files through the web interface
2. **Storage**: Files are stored in the `uploads/` folder on cPanel
3. **Database**: File metadata (name, size, share token) is stored in Supabase
4. **Sharing**: Each file gets a unique share token for sharing
5. **Download**: Files can be downloaded via PHP script that tracks downloads

## Security Features

- Files stored in protected directory (not directly accessible)
- All downloads go through PHP script for tracking
- Unique share tokens prevent guessing file URLs
- Upload directory protected by .htaccess
- File size limits configurable via PHP settings

## Setup Instructions

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions for cPanel.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## License

MIT
