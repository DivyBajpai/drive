<?php
require_once 'config.php';
require_once 'activity.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Check authentication
$conn = getDbConnection();
$user = getCurrentUser($conn);

if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

if (!isset($_GET['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing file ID']);
    exit;
}

try {
    // Get file info first and check ownership
    $stmt = $conn->prepare("SELECT id, filename, stored_filename, file_size, user_id, deleted_at FROM files WHERE id = :id");
    $stmt->execute([':id' => $_GET['id']]);
    $file = $stmt->fetch();
    
    if (!$file) {
        http_response_code(404);
        echo json_encode(['error' => 'File not found in database']);
        exit;
    }
    
    // Check if user owns the file
    if ($file['user_id'] !== $user['user_id']) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden: You do not own this file']);
        exit;
    }
    
    // Soft delete - move to trash (don't delete physical file yet)
    $stmt = $conn->prepare("UPDATE files SET deleted_at = NOW(), deleted_by = ? WHERE id = ?");
    $stmt->execute([$user['user_id'], $_GET['id']]);
    
    // Update storage_used (file is still counted while in trash)
    // Storage will be freed when permanently deleted from trash
    
    // Log activity
    logActivity($conn, $user['user_id'], 'delete', 'file', $file['id'], $file['filename'], null);
    
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'File moved to trash']);
    
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
