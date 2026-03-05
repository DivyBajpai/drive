<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

if (!isset($_GET['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing filename']);
    exit;
}

$storedFilename = basename($_GET['file']);
$uploadDir = __DIR__ . '/../uploads/';
$filePath = $uploadDir . $storedFilename;

if (file_exists($filePath)) {
    if (unlink($filePath)) {
        http_response_code(200);
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete file']);
    }
} else {
    http_response_code(404);
    echo json_encode(['error' => 'File not found']);
}
?>
