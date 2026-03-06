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
    // GET: List trashed files and folders
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get trashed files
        $stmt = $conn->prepare("
            SELECT id, filename, file_size as filesize, mime_type as mimetype, 
                   deleted_at, uploaded_at
            FROM files 
            WHERE user_id = ? AND deleted_at IS NOT NULL 
            ORDER BY deleted_at DESC
        ");
        $stmt->execute([$userId]);
        $files = $stmt->fetchAll();
        
        // Get trashed folders
        $stmt = $conn->prepare("
            SELECT id, name, deleted_at, created_at
            FROM folders 
            WHERE user_id = ? AND deleted_at IS NOT NULL 
            ORDER BY deleted_at DESC
        ");
        $stmt->execute([$userId]);
        $folders = $stmt->fetchAll();
        
        http_response_code(200);
        echo json_encode([
            'files' => $files,
            'folders' => $folders
        ]);
        exit;
    }
    
    // POST: Restore from trash
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['type']) || !isset($input['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Type and ID are required']);
            exit;
        }
        
        $type = $input['type']; // 'file' or 'folder'
        $id = $input['id'];
        
        if ($type === 'file') {
            $stmt = $conn->prepare("
                UPDATE files 
                SET deleted_at = NULL, deleted_by = NULL 
                WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL
            ");
            $stmt->execute([$id, $userId]);
        } else if ($type === 'folder') {
            $stmt = $conn->prepare("
                UPDATE folders 
                SET deleted_at = NULL, deleted_by = NULL 
                WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL
            ");
            $stmt->execute([$id, $userId]);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid type']);
            exit;
        }
        
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Item not found in trash']);
            exit;
        }
        
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Item restored']);
        exit;
    }
    
    // DELETE: Permanently delete from trash
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $type = isset($_GET['type']) ? $_GET['type'] : null;
        $id = isset($_GET['id']) ? $_GET['id'] : null;
        
        if (!$type || !$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Type and ID are required']);
            exit;
        }
        
        if ($type === 'file') {
            // Get file info for physical deletion
            $stmt = $conn->prepare("
                SELECT stored_filename 
                FROM files 
                WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL
            ");
            $stmt->execute([$id, $userId]);
            $file = $stmt->fetch();
            
            if (!$file) {
                http_response_code(404);
                echo json_encode(['error' => 'File not found in trash']);
                exit;
            }
            
            // Delete from database
            $stmt = $conn->prepare("DELETE FROM files WHERE id = ? AND user_id = ?");
            $stmt->execute([$id, $userId]);
            
            // Delete physical file
            $uploadDir = dirname(__DIR__) . '/uploads/';
            $filePath = $uploadDir . $file['stored_filename'];
            if (file_exists($filePath)) {
                unlink($filePath);
            }
            
        } else if ($type === 'folder') {
            // Check if folder is empty
            $stmt = $conn->prepare("
                SELECT COUNT(*) as count FROM files WHERE folder_id = ?
            ");
            $stmt->execute([$id]);
            $fileCount = $stmt->fetch()['count'];
            
            $stmt = $conn->prepare("
                SELECT COUNT(*) as count FROM folders WHERE parent_folder_id = ?
            ");
            $stmt->execute([$id]);
            $folderCount = $stmt->fetch()['count'];
            
            if ($fileCount > 0 || $folderCount > 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Folder must be empty to delete permanently']);
                exit;
            }
            
            // Delete folder
            $stmt = $conn->prepare("DELETE FROM folders WHERE id = ? AND user_id = ?");
            $stmt->execute([$id, $userId]);
            
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid type']);
            exit;
        }
        
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Item permanently deleted']);
        exit;
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
