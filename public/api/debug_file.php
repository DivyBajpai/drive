<?php
// Temporary debug file - DELETE AFTER TESTING
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'config.php';

$conn = getDbConnection();
$user = getCurrentUser($conn);

if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

if (!isset($_GET['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'File ID required']);
    exit;
}

$fileId = $_GET['id'];

// Get file info from database
$stmt = $conn->prepare("SELECT * FROM files WHERE id = ?");
$stmt->execute([$fileId]);
$file = $stmt->fetch();

if (!$file) {
    echo json_encode(['error' => 'File not found in database', 'id' => $fileId]);
    exit;
}

// Check file paths
$uploadDir = __DIR__ . '/../uploads/';
$filePath = $uploadDir . $file['stored_filename'];

$debug = [
    'file_id' => $fileId,
    'database_record' => $file,
    'paths' => [
        '__DIR__' => __DIR__,
        'upload_dir' => $uploadDir,
        'upload_dir_realpath' => realpath($uploadDir),
        'file_path' => $filePath,
        'file_path_realpath' => realpath($filePath)
    ],
    'checks' => [
        'upload_dir_exists' => is_dir($uploadDir),
        'upload_dir_readable' => is_readable($uploadDir),
        'file_exists' => file_exists($filePath),
        'file_readable' => is_readable($filePath)
    ]
];

// List files in uploads directory
if (is_dir($uploadDir)) {
    $files = scandir($uploadDir);
    $debug['uploads_directory_contents'] = array_values(array_diff($files, ['.', '..']));
}

echo json_encode($debug, JSON_PRETTY_PRINT);
?>
