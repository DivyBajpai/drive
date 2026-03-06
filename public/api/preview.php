<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config.php';
require_once 'activity.php';

$conn = getDbConnection();
$user = getCurrentUser($conn);

if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit;
}

if (!isset($_GET['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'File ID is required']);
    exit;
}

$fileId = $_GET['id'];
$userId = $user['user_id'];

// Get file info
$stmt = $conn->prepare("SELECT filename, stored_filename, mime_type, user_id, folder_id FROM files WHERE id = ?");
$stmt->execute([$fileId]);
$file = $stmt->fetch();

if (!$file) {
    http_response_code(404);
    echo json_encode(['error' => 'File not found']);
    exit;
}

// Check if user owns the file OR has access via share
$hasAccess = false;

if ($file['user_id'] === $userId) {
    $hasAccess = true;
} else {
    // Check if file is shared with user
    $stmt = $conn->prepare("
        SELECT id FROM shares 
        WHERE resource_type = 'file' AND resource_id = ? AND shared_with_id = ?
    ");
    $stmt->execute([$fileId, $userId]);
    if ($stmt->fetch()) {
        $hasAccess = true;
    }
    
    // Check if parent folder is shared with user (recursively)
    if (!$hasAccess && $file['folder_id']) {
        $currentFolderId = $file['folder_id'];
        
        while ($currentFolderId && !$hasAccess) {
            $stmt = $conn->prepare("
                SELECT id FROM shares 
                WHERE resource_type = 'folder' AND resource_id = ? AND shared_with_id = ?
            ");
            $stmt->execute([$currentFolderId, $userId]);
            if ($stmt->fetch()) {
                $hasAccess = true;
                break;
            }
            
            // Get parent folder
            $stmt = $conn->prepare("SELECT parent_folder_id FROM folders WHERE id = ?");
            $stmt->execute([$currentFolderId]);
            $parent = $stmt->fetch();
            $currentFolderId = $parent ? $parent['parent_folder_id'] : null;
        }
    }
}

if (!$hasAccess) {
    http_response_code(403);
    echo json_encode(['error' => 'Access denied']);
    exit;
}

$uploadDir = __DIR__ . '/../uploads/';
$filePath = $uploadDir . $file['stored_filename'];

if (!file_exists($filePath)) {
    http_response_code(404);
    echo json_encode(['error' => 'File not found on server']);
    exit;
}

// Set appropriate content type for preview
$mimeType = $file['mime_type'] ?: 'application/octet-stream';
header('Content-Type: ' . $mimeType);

// For inline viewing (not download)
header('Content-Disposition: inline; filename="' . $file['filename'] . '"');

// Cache control for better performance
header('Cache-Control: private, max-age=3600');
header('Content-Length: ' . filesize($filePath));

// Log activity
logActivity($conn, $userId, 'preview', 'file', $fileId, $file['filename'], null);

// Output file
readfile($filePath);
exit;
?>
