<?php
if (!isset($_GET['file']) || !isset($_GET['name'])) {
    http_response_code(400);
    echo 'Missing parameters';
    exit;
}

$storedFilename = basename($_GET['file']);
$originalFilename = $_GET['name'];
$uploadDir = __DIR__ . '/../uploads/';
$filePath = $uploadDir . $storedFilename;

if (!file_exists($filePath)) {
    http_response_code(404);
    echo 'File not found';
    exit;
}

header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . $originalFilename . '"');
header('Content-Length: ' . filesize($filePath));
header('Cache-Control: must-revalidate');
header('Pragma: public');

readfile($filePath);
exit;
?>
