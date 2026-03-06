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
    // Get user's storage information
    $stmt = $conn->prepare("
        SELECT storage_quota, storage_used 
        FROM users 
        WHERE id = ?
    ");
    $stmt->execute([$userId]);
    $storage = $stmt->fetch();
    
    // Calculate actual storage used
    $stmt = $conn->prepare("
        SELECT COALESCE(SUM(file_size), 0) as total_used 
        FROM files 
        WHERE user_id = ? AND deleted_at IS NULL
    ");
    $stmt->execute([$userId]);
    $actual = $stmt->fetch();
    
    // Update storage_used if different
    if ($actual['total_used'] != $storage['storage_used']) {
        $stmt = $conn->prepare("UPDATE users SET storage_used = ? WHERE id = ?");
        $stmt->execute([$actual['total_used'], $userId]);
        $storage['storage_used'] = $actual['total_used'];
    }
    
    http_response_code(200);
    echo json_encode([
        'quota' => (int)$storage['storage_quota'],
        'used' => (int)$storage['storage_used'],
        'available' => (int)($storage['storage_quota'] - $storage['storage_used']),
        'percentage' => $storage['storage_quota'] > 0 
            ? round(($storage['storage_used'] / $storage['storage_quota']) * 100, 2) 
            : 0
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
