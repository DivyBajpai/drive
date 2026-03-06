<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check if downloading by ID (authenticated) or by file/name (legacy)
if (isset($_GET['id'])) {
    // Authenticated download by file ID
    require_once 'config.php';
    
    $conn = getDbConnection();
    $user = getCurrentUser($conn);
    
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Authentication required']);
        exit;
    }
    
    $fileId = $_GET['id'];
    $userId = $user['user_id'];
    
    // Get file info
    $stmt = $conn->prepare("SELECT filename, stored_filename, user_id, folder_id FROM files WHERE id = ?");
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
        
        // Check if parent folder is shared with user
        if (!$hasAccess && $file['folder_id']) {
            $stmt = $conn->prepare("
                SELECT id FROM shares 
                WHERE resource_type = 'folder' AND resource_id = ? AND shared_with_id = ?
            ");
            $stmt->execute([$file['folder_id'], $userId]);
            if ($stmt->fetch()) {
                $hasAccess = true;
            }
        }
    }
    
    if (!$hasAccess) {
        http_response_code(403);
        echo json_encode(['error' => 'Access denied']);
        exit;
    }
    
    $storedFilename = $file['stored_filename'];
    $originalFilename = $file['filename'];
    
} else if (isset($_GET['file']) && isset($_GET['name'])) {
    // Legacy non-authenticated download
    $storedFilename = basename($_GET['file']);
    $originalFilename = $_GET['name'];
} else {
    http_response_code(400);
    echo 'Missing parameters';
    exit;
}

$uploadDir = __DIR__ . '/../uploads/';
$filePath = $uploadDir . $storedFilename;

if (!file_exists($filePath)) {
    http_response_code(404);
    echo 'File not found';
    exit;
}

header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . $originalFilename . '"');
header('Content-Length: ' . filesize($filePath));
header('Cache-Control: must-revalidate');
header('Pragma: public');

readfile($filePath);
exit;
?>
