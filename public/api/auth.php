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

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    $conn = getDbConnection();
    $user = getCurrentUser($conn);
    
    if ($user) {
        // Get is_admin status
        $stmt = $conn->prepare("SELECT is_admin FROM users WHERE id = ?");
        $stmt->execute([$user['user_id']]);
        $userInfo = $stmt->fetch();
        
        http_response_code(200);
        echo json_encode([
            'authenticated' => true,
            'user' => [
                'id' => $user['user_id'],
                'email' => $user['email'],
                'name' => $user['name'],
                'is_admin' => isset($userInfo['is_admin']) ? (bool)$userInfo['is_admin'] : false
            ]
        ]);
    } else {
        http_response_code(200);
        echo json_encode(['authenticated' => false]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Authentication check failed']);
}
?>
