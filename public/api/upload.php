<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

if (!isset($_FILES['file']) || !isset($_POST['stored_filename'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing file or filename']);
    exit;
}

$uploadDir = __DIR__ . '/../uploads/';

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$storedFilename = basename($_POST['stored_filename']);
$targetPath = $uploadDir . $storedFilename;

if (move_uploaded_file($_FILES['file']['tmp_name'], $targetPath)) {
    http_response_code(200);
    echo json_encode(['success' => true, 'filename' => $storedFilename]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save file']);
}
?>
