<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config.php';

$conn = getDbConnection();
$user = getCurrentUser($conn);

if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit;
}

$userId = $user['user_id'];

try {
    // GET: List versions for a file or download specific version
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $fileId = isset($_GET['file_id']) ? $_GET['file_id'] : null;
        $versionId = isset($_GET['version_id']) ? $_GET['version_id'] : null;
        
        if (!$fileId) {
            http_response_code(400);
            echo json_encode(['error' => 'file_id is required']);
            exit;
        }
        
        // Verify file access
        $stmt = $conn->prepare("SELECT user_id, filename FROM files WHERE id = ?");
        $stmt->execute([$fileId]);
        $file = $stmt->fetch();
        
        if (!$file || $file['user_id'] !== $userId) {
            http_response_code(403);
            echo json_encode(['error' => 'Access denied']);
            exit;
        }
        
        if ($versionId) {
            // Download specific version
            $stmt = $conn->prepare("
                SELECT v.*, u.name as uploaded_by_name
                FROM file_versions v
                JOIN users u ON v.uploaded_by = u.id
                WHERE v.id = ? AND v.file_id = ?
            ");
            $stmt->execute([$versionId, $fileId]);
            $version = $stmt->fetch();
            
            if (!$version) {
                http_response_code(404);
                echo json_encode(['error' => 'Version not found']);
                exit;
            }
            
            $uploadDir = __DIR__ . '/../uploads/versions/';
            $filePath = $uploadDir . $version['stored_filename'];
            
            if (!file_exists($filePath)) {
                http_response_code(404);
                echo json_encode(['error' => 'Version file not found on server']);
                exit;
            }
            
            // Return file for download
            header('Content-Type: application/octet-stream');
            header('Content-Disposition: attachment; filename="' . $file['filename'] . '_v' . $version['version_number'] . '"');
            header('Content-Length: ' . filesize($filePath));
            readfile($filePath);
            exit;
            
        } else {
            // List all versions
            $stmt = $conn->prepare("
                SELECT v.*, u.name as uploaded_by_name, u.email as uploaded_by_email
                FROM file_versions v
                JOIN users u ON v.uploaded_by = u.id
                WHERE v.file_id = ?
                ORDER BY v.version_number DESC
            ");
            $stmt->execute([$fileId]);
            $versions = $stmt->fetchAll();
            
            http_response_code(200);
            echo json_encode($versions);
            exit;
        }
    }
    
    // POST: Create new version (handle file upload)
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $fileId = isset($_POST['file_id']) ? $_POST['file_id'] : null;
        $comment = isset($_POST['comment']) ? $_POST['comment'] : null;
        
        if (!$fileId) {
            http_response_code(400);
            echo json_encode(['error' => 'file_id is required']);
            exit;
        }
        
        if (!isset($_FILES['file'])) {
            http_response_code(400);
            echo json_encode(['error' => 'No file uploaded']);
            exit;
        }
        
        // Verify file ownership
        $stmt = $conn->prepare("SELECT user_id, filename FROM files WHERE id = ?");
        $stmt->execute([$fileId]);
        $file = $stmt->fetch();
        
        if (!$file || $file['user_id'] !== $userId) {
            http_response_code(403);
            echo json_encode(['error' => 'Access denied']);
            exit;
        }
        
        $uploadedFile = $_FILES['file'];
        
        if ($uploadedFile['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['error' => 'File upload error']);
            exit;
        }
        
        // Get next version number
        $stmt = $conn->prepare("SELECT MAX(version_number) as max_version FROM file_versions WHERE file_id = ?");
        $stmt->execute([$fileId]);
        $result = $stmt->fetch();
        $nextVersion = ($result['max_version'] ?? 0) + 1;
        
        // Store file in versions directory
        $uploadDir = __DIR__ . '/../uploads/versions/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        $storedFilename = uniqid() . '_' . basename($uploadedFile['name']);
        $targetPath = $uploadDir . $storedFilename;
        
        if (!move_uploaded_file($uploadedFile['tmp_name'], $targetPath)) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save file']);
            exit;
        }
        
        // Create version record
        $versionId = generateUUID();
        $stmt = $conn->prepare("
            INSERT INTO file_versions (id, file_id, version_number, stored_filename, file_size, uploaded_by, comment) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $versionId,
            $fileId,
            $nextVersion,
            $storedFilename,
            $uploadedFile['size'],
            $userId,
            $comment
        ]);
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'version_id' => $versionId,
            'version_number' => $nextVersion
        ]);
        exit;
    }
    
    // DELETE: Delete old versions (keep recent N versions)
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $fileId = isset($_GET['file_id']) ? $_GET['file_id'] : null;
        $versionId = isset($_GET['version_id']) ? $_GET['version_id'] : null;
        $keepCount = isset($_GET['keep']) ? intval($_GET['keep']) : 5;
        
        if (!$fileId) {
            http_response_code(400);
            echo json_encode(['error' => 'file_id is required']);
            exit;
        }
        
        // Verify file ownership
        $stmt = $conn->prepare("SELECT user_id FROM files WHERE id = ?");
        $stmt->execute([$fileId]);
        $file = $stmt->fetch();
        
        if (!$file || $file['user_id'] !== $userId) {
            http_response_code(403);
            echo json_encode(['error' => 'Access denied']);
            exit;
        }
        
        if ($versionId) {
            // Delete specific version
            $stmt = $conn->prepare("SELECT stored_filename FROM file_versions WHERE id = ? AND file_id = ?");
            $stmt->execute([$versionId, $fileId]);
            $version = $stmt->fetch();
            
            if ($version) {
                // Delete file from disk
                $filePath = __DIR__ . '/../uploads/versions/' . $version['stored_filename'];
                if (file_exists($filePath)) {
                    unlink($filePath);
                }
                
                // Delete version record
                $stmt = $conn->prepare("DELETE FROM file_versions WHERE id = ?");
                $stmt->execute([$versionId]);
            }
            
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Version deleted']);
        } else {
            // Delete old versions, keep recent N
            $stmt = $conn->prepare("
                SELECT id, stored_filename FROM file_versions 
                WHERE file_id = ? 
                ORDER BY version_number DESC 
                LIMIT 999 OFFSET ?
            ");
            $stmt->execute([$fileId, $keepCount]);
            $oldVersions = $stmt->fetchAll();
            
            $deletedCount = 0;
            foreach ($oldVersions as $version) {
                // Delete file from disk
                $filePath = __DIR__ . '/../uploads/versions/' . $version['stored_filename'];
                if (file_exists($filePath)) {
                    unlink($filePath);
                }
                
                // Delete version record
                $stmt = $conn->prepare("DELETE FROM file_versions WHERE id = ?");
                $stmt->execute([$version['id']]);
                $deletedCount++;
            }
            
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'deleted_count' => $deletedCount,
                'message' => "Deleted $deletedCount old version(s)"
            ]);
        }
        exit;
    }
    
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?>
