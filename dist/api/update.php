<?php
require_once 'config.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['share_token'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing share_token']);
    exit;
}

try {
    $conn = getDbConnection();
    
    $stmt = $conn->prepare("
        UPDATE files 
        SET download_count = download_count + 1 
        WHERE share_token = :share_token
    ");
    
    $stmt->execute([':share_token' => $data['share_token']]);
    
    http_response_code(200);
    echo json_encode(['success' => true]);
    
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
