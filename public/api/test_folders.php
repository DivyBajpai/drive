<?php
// Temporary debug file - DELETE AFTER TESTING
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    require_once 'config.php';
    
    $conn = getDbConnection();
    $user = getCurrentUser($conn);
    
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized', 'debug' => 'No valid session']);
        exit;
    }
    
    // Test if folders table exists
    $stmt = $conn->query("SHOW TABLES LIKE 'folders'");
    $tableExists = $stmt->rowCount() > 0;
    
    if (!$tableExists) {
        http_response_code(500);
        echo json_encode(['error' => 'folders table does not exist', 'debug' => 'Run create_folders.sql']);
        exit;
    }
    
    // Test insert
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['name'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing folder name']);
            exit;
        }
        
        $folderId = generateUUID();
        $folderName = $input['name'];
        $userId = $user['user_id'];
        $parentFolderId = isset($input['parent_folder_id']) ? $input['parent_folder_id'] : null;
        
        $stmt = $conn->prepare("INSERT INTO folders (id, name, user_id, parent_folder_id) VALUES (?, ?, ?, ?)");
        $stmt->execute([$folderId, $folderName, $userId, $parentFolderId]);
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Folder created successfully',
            'folder' => [
                'id' => $folderId,
                'name' => $folderName,
                'parent_folder_id' => $parentFolderId
            ]
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Server error',
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
}
?>
