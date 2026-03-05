<?php
require_once 'config.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    $conn = getDbConnection();
    
    // Check if getting a single file by share token
    if (isset($_GET['share_token'])) {
        $stmt = $conn->prepare("SELECT * FROM files WHERE share_token = :share_token LIMIT 1");
        $stmt->execute([':share_token' => $_GET['share_token']]);
        $file = $stmt->fetch();
        
        if ($file) {
            http_response_code(200);
            echo json_encode([$file]);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'File not found']);
        }
    } else {
        // Get all files, ordered by upload date
        $stmt = $conn->query("SELECT * FROM files ORDER BY uploaded_at DESC");
        $files = $stmt->fetchAll();
        
        http_response_code(200);
        echo json_encode($files);
    }
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
