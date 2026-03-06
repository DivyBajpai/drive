<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config.php';

$conn = getDbConnection();
$user = getCurrentUser($conn);

if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit;
}

$userId = $user['user_id'];

try {
    // GET: List all files and folders shared with me
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        
        // Get shared files
        $stmt = $conn->prepare("
            SELECT 
                f.id,
                f.filename,
                f.file_size as filesize,
                f.mime_type as mimetype,
                f.share_token as shared_token,
                f.uploaded_at,
                u.name as owner_name,
                u.email as owner_email,
                s.permission,
                s.created_at as shared_at,
                'file' as resource_type
            FROM shares s
            JOIN files f ON s.resource_id = f.id
            JOIN users u ON s.owner_id = u.id
            WHERE s.shared_with_id = ? AND s.resource_type = 'file'
            ORDER BY s.created_at DESC
        ");
        $stmt->execute([$userId]);
        $sharedFiles = $stmt->fetchAll();
        
        // Get shared folders
        $stmt = $conn->prepare("
            SELECT 
                fo.id,
                fo.name,
                fo.created_at,
                u.name as owner_name,
                u.email as owner_email,
                s.permission,
                s.created_at as shared_at,
                'folder' as resource_type,
                (SELECT COUNT(*) FROM files WHERE folder_id = fo.id) as file_count
            FROM shares s
            JOIN folders fo ON s.resource_id = fo.id
            JOIN users u ON s.owner_id = u.id
            WHERE s.shared_with_id = ? AND s.resource_type = 'folder'
            ORDER BY s.created_at DESC
        ");
        $stmt->execute([$userId]);
        $sharedFolders = $stmt->fetchAll();
        
        http_response_code(200);
        echo json_encode([
            'shared_files' => $sharedFiles,
            'shared_folders' => $sharedFolders
        ]);
        exit;
    }
    
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?>
