<?php
require_once 'config.php';

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
    $stmt = $conn->prepare("SELECT stored_filename, user_id FROM files WHERE id = :id");
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
    
    $storedFilename = basename($file['stored_filename']);
    $uploadDir = __DIR__ . '/../uploads/';
    $filePath = $uploadDir . $storedFilename;
    
    // Try to delete physical file (ignore if doesn't exist)
    if (file_exists($filePath)) {
        unlink($filePath);
    }
    
    // Delete from database
    $stmt = $conn->prepare("DELETE FROM files WHERE id = :id");
    $stmt->execute([':id' => $_GET['id']]);
    
    http_response_code(200);
    echo json_encode(['success' => true]);
    
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
