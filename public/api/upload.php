<?php
require_once 'config.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
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

// Check authentication
$conn = getDbConnection();
$user = getCurrentUser($conn);

if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

if (!isset($_FILES['file']) || !isset($_POST['stored_filename']) || !isset($_POST['share_token'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required parameters']);
    exit;
}

// Get folder_id if provided
$folderId = isset($_POST['folder_id']) && $_POST['folder_id'] !== '' ? $_POST['folder_id'] : null;

// Verify folder ownership if folder is specified
if ($folderId) {
    $stmt = $conn->prepare("SELECT user_id FROM folders WHERE id = ?");
    $stmt->execute([$folderId]);
    $folder = $stmt->fetch();
    
    if (!$folder || $folder['user_id'] !== $user['user_id']) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid folder or access denied']);
        exit;
    }
}

$uploadDir = __DIR__ . '/../uploads/';

if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create uploads directory']);
        exit;
    }
}

if (!is_writable($uploadDir)) {
    http_response_code(500);
    echo json_encode(['error' => 'Uploads directory is not writable', 'path' => $uploadDir]);
    exit;
}

$storedFilename = basename($_POST['stored_filename']);
$targetPath = $uploadDir . $storedFilename;

if (move_uploaded_file($_FILES['file']['tmp_name'], $targetPath)) {
    // File uploaded successfully, now save to database
    try {
        $stmt = $conn->prepare("
            INSERT INTO files (id, user_id, folder_id, filename, stored_filename, file_size, mime_type, share_token, download_count)
            VALUES (:id, :user_id, :folder_id, :filename, :stored_filename, :file_size, :mime_type, :share_token, 0)
        ");
        
        $id = generateUUID();
        $filename = $_FILES['file']['name'];
        $fileSize = $_FILES['file']['size'];
        $mimeType = $_FILES['file']['type'] ?: 'application/octet-stream';
        $shareToken = basename($_POST['share_token']);
        
        $stmt->execute([
            ':id' => $id,
            ':user_id' => $user['user_id'],
            ':folder_id' => $folderId,
            ':filename' => $filename,
            ':stored_filename' => $storedFilename,
            ':file_size' => $fileSize,
            ':mime_type' => $mimeType,
            ':share_token' => $shareToken
        ]);
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'filename' => $storedFilename,
            'id' => $id
        ]);
    } catch(PDOException $e) {
        // Database error - delete uploaded file
        unlink($targetPath);
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
} else {
    $error = error_get_last();
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save file', 'details' => $error, 'target' => $targetPath]);
}
?>
