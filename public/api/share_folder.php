<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config.php';

$conn = getDbConnection();

try {
    // GET: Access shared folder
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $folderToken = isset($_GET['token']) ? $_GET['token'] : null;
        
        if (!$folderToken) {
            http_response_code(400);
            echo json_encode(['error' => 'Folder token is required']);
            exit;
        }
        
        // Get folder info
        $stmt = $conn->prepare("SELECT id, name, user_id FROM folders WHERE shared_token = ?");
        $stmt->execute([$folderToken]);
        $folder = $stmt->fetch();
        
        if (!$folder) {
            http_response_code(404);
            echo json_encode(['error' => 'Shared folder not found']);
            exit;
        }
        
        // Get all files in this folder (including subfolders recursively)
        function getAllFolderFiles($conn, $folderId) {
            $allFiles = [];
            
            // Get files directly in this folder
            $stmt = $conn->prepare("
                SELECT id, filename, filesize, mimetype, shared_token, uploaded_at 
                FROM files 
                WHERE folder_id = ? 
                ORDER BY uploaded_at DESC
            ");
            $stmt->execute([$folderId]);
            $files = $stmt->fetchAll();
            
            foreach ($files as $file) {
                $allFiles[] = $file;
            }
            
            // Get subfolders
            $stmt = $conn->prepare("SELECT id, name FROM folders WHERE parent_folder_id = ?");
            $stmt->execute([$folderId]);
            $subfolders = $stmt->fetchAll();
            
            foreach ($subfolders as $subfolder) {
                $subFiles = getAllFolderFiles($conn, $subfolder['id']);
                foreach ($subFiles as $file) {
                    $file['folder_path'] = $subfolder['name'] . (isset($file['folder_path']) ? '/' . $file['folder_path'] : '');
                    $allFiles[] = $file;
                }
            }
            
            return $allFiles;
        }
        
        $files = getAllFolderFiles($conn, $folder['id']);
        
        http_response_code(200);
        echo json_encode([
            'folder' => [
                'id' => $folder['id'],
                'name' => $folder['name']
            ],
            'files' => $files
        ]);
        exit;
    }
    
    // POST: Generate or update share token for folder
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $user = getCurrentUser($conn);
        
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required']);
            exit;
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['folder_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Folder ID is required']);
            exit;
        }
        
        $folderId = $input['folder_id'];
        
        // Verify ownership
        $stmt = $conn->prepare("SELECT user_id, shared_token FROM folders WHERE id = ?");
        $stmt->execute([$folderId]);
        $folder = $stmt->fetch();
        
        if (!$folder || $folder['user_id'] !== $user['user_id']) {
            http_response_code(403);
            echo json_encode(['error' => 'Access denied']);
            exit;
        }
        
        // Generate new share token if doesn't exist
        if (!$folder['shared_token']) {
            $shareToken = bin2hex(random_bytes(16));
            $stmt = $conn->prepare("UPDATE folders SET shared_token = ? WHERE id = ?");
            $stmt->execute([$shareToken, $folderId]);
        } else {
            $shareToken = $folder['shared_token'];
        }
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'share_token' => $shareToken
        ]);
        exit;
    }
    
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?>
