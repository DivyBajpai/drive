<?php
// Prevent any output before JSON
error_reporting(E_ALL);
ini_set('display_errors', 0);

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

// Get file info first and check ownership
$stmt = $conn->prepare("SELECT id, filename, stored_filename, file_size, user_id FROM files WHERE id = ?");
$stmt->execute([$_GET['id']]);
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

// Delete file from database
$stmt = $conn->prepare("DELETE FROM files WHERE id = ?");
$success = $stmt->execute([$_GET['id']]);

if (!$success) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to delete file from database']);
    exit;
}

// Try to delete physical file
$uploadDir = __DIR__ . '/../uploads/';
$filePath = $uploadDir . $file['stored_filename'];
if (file_exists($filePath)) {
    @unlink($filePath); // Suppress errors if file can't be deleted
}

// Update storage_used if column exists
try {
    $stmt = $conn->prepare("UPDATE users SET storage_used = storage_used - ? WHERE id = ?");
    $stmt->execute([$file['file_size'], $user['user_id']]);
} catch (Exception $e) {
    // Column doesn't exist, ignore
}

// Log activity (optional)
try {
    logActivity($conn, $user['user_id'], 'delete', 'file', $file['id'], $file['filename'], null);
} catch (Exception $e) {
    // Activity logging failed, ignore
}

http_response_code(200);
echo json_encode(['success' => true, 'message' => 'File deleted successfully']);
?>
