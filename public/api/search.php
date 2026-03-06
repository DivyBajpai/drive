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
    $query = isset($_GET['q']) ? trim($_GET['q']) : '';
    
    if (empty($query)) {
        http_response_code(200);
        echo json_encode([
            'files' => [],
            'folders' => []
        ]);
        exit;
    }
    
    $searchTerm = '%' . $query . '%';
    
    // Search files (owned by user OR shared with user)
    $stmt = $conn->prepare("
        SELECT DISTINCT f.id, f.filename, f.file_size as filesize, f.mime_type as mimetype, 
               f.share_token as shared_token, f.uploaded_at, f.folder_id,
               u.name as owner_name,
               CASE 
                   WHEN f.user_id = ? THEN 'owned'
                   ELSE 'shared'
               END as access_type
        FROM files f
        LEFT JOIN users u ON f.user_id = u.id
        WHERE f.deleted_at IS NULL
        AND f.filename LIKE ?
        AND (
            f.user_id = ?
            OR EXISTS (
                SELECT 1 FROM shares s 
                WHERE s.resource_type = 'file' 
                AND s.resource_id = f.id 
                AND s.shared_with_id = ?
            )
            OR f.folder_id IN (
                SELECT resource_id FROM shares 
                WHERE resource_type = 'folder' AND shared_with_id = ?
            )
        )
        ORDER BY f.uploaded_at DESC
        LIMIT 50
    ");
    $stmt->execute([$userId, $searchTerm, $userId, $userId, $userId]);
    $files = $stmt->fetchAll();
    
    // Search folders (owned by user OR shared with user)
    $stmt = $conn->prepare("
        SELECT DISTINCT fo.id, fo.name, fo.user_id, fo.parent_folder_id, 
               fo.shared_token, fo.created_at,
               u.name as owner_name,
               CASE 
                   WHEN fo.user_id = ? THEN 'owned'
                   ELSE 'shared'
               END as access_type
        FROM folders fo
        LEFT JOIN users u ON fo.user_id = u.id
        WHERE fo.deleted_at IS NULL
        AND fo.name LIKE ?
        AND (
            fo.user_id = ?
            OR EXISTS (
                SELECT 1 FROM shares s 
                WHERE s.resource_type = 'folder' 
                AND s.resource_id = fo.id 
                AND s.shared_with_id = ?
            )
        )
        ORDER BY fo.created_at DESC
        LIMIT 50
    ");
    $stmt->execute([$userId, $searchTerm, $userId, $userId]);
    $folders = $stmt->fetchAll();
    
    http_response_code(200);
    echo json_encode([
        'files' => $files,
        'folders' => $folders,
        'query' => $query
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
