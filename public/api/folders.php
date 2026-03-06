<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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

// Helper function to check if user has access to a folder
function hasAccessToFolder($conn, $folderId, $userId) {
    // Check if user owns the folder
    $stmt = $conn->prepare("SELECT user_id FROM folders WHERE id = ?");
    $stmt->execute([$folderId]);
    $folder = $stmt->fetch();
    
    if ($folder && $folder['user_id'] === $userId) {
        return true;
    }
    
    // Check if folder is shared with user
    $stmt = $conn->prepare("
        SELECT id FROM shares 
        WHERE resource_type = 'folder' AND resource_id = ? AND shared_with_id = ?
    ");
    $stmt->execute([$folderId, $userId]);
    
    return $stmt->fetch() !== false;
}

try {
    // GET: List folders and files in a specific folder (or root)
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $folderId = isset($_GET['folder_id']) ? $_GET['folder_id'] : null;
        
        // Get folders in current location
        if ($folderId) {
            // Verify user has access to this folder
            if (!hasAccessToFolder($conn, $folderId, $userId)) {
                http_response_code(403);
                echo json_encode(['error' => 'Access denied']);
                exit;
            }
            
            $stmt = $conn->prepare("SELECT * FROM folders WHERE parent_folder_id = ? AND user_id = ? ORDER BY name ASC");
            $stmt->execute([$folderId, $userId]);
        } else {
            // Root level folders
            $stmt = $conn->prepare("SELECT * FROM folders WHERE parent_folder_id IS NULL AND user_id = ? ORDER BY name ASC");
            $stmt->execute([$userId]);
        }
        
        $folders = $stmt->fetchAll();
        
        // Get files in current location
        if ($folderId) {
            $stmt = $conn->prepare("
                SELECT id, filename, file_size as filesize, mime_type as mimetype, share_token as shared_token, uploaded_at 
                FROM files 
                WHERE folder_id = ? AND user_id = ? 
                ORDER BY uploaded_at DESC
            ");
            $stmt->execute([$folderId, $userId]);
        } else {
            // Root level files (no folder)
            $stmt = $conn->prepare("
                SELECT id, filename, file_size as filesize, mime_type as mimetype, share_token as shared_token, uploaded_at 
                FROM files 
                WHERE folder_id IS NULL AND user_id = ? 
                ORDER BY uploaded_at DESC
            ");
            $stmt->execute([$userId]);
        }
        
        $files = $stmt->fetchAll();
        
        // Get breadcrumb path
        $breadcrumbs = [];
        if ($folderId) {
            $currentId = $folderId;
            while ($currentId) {
                $stmt = $conn->prepare("SELECT id, name, parent_folder_id FROM folders WHERE id = ?");
                $stmt->execute([$currentId]);
                $folder = $stmt->fetch();
                if ($folder) {
                    array_unshift($breadcrumbs, [
                        'id' => $folder['id'],
                        'name' => $folder['name']
                    ]);
                    $currentId = $folder['parent_folder_id'];
                } else {
                    break;
                }
            }
        }
        
        http_response_code(200);
        echo json_encode([
            'folders' => $folders,
            'files' => $files,
            'breadcrumbs' => $breadcrumbs,
            'current_folder_id' => $folderId
        ]);
        exit;
    }
    
    // POST: Create new folder
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['name']) || trim($input['name']) === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Folder name is required']);
            exit;
        }
        
        $folderName = trim($input['name']);
        $parentFolderId = isset($input['parent_folder_id']) ? $input['parent_folder_id'] : null;
        
        // Verify parent folder if specified
        if ($parentFolderId) {
            $stmt = $conn->prepare("SELECT user_id FROM folders WHERE id = ?");
            $stmt->execute([$parentFolderId]);
            $parent = $stmt->fetch();
            
            if (!$parent || $parent['user_id'] !== $userId) {
                http_response_code(403);
                echo json_encode(['error' => 'Invalid parent folder']);
                exit;
            }
        }
        
        // Check for duplicate folder name in same location
        if ($parentFolderId) {
            $stmt = $conn->prepare("SELECT id FROM folders WHERE name = ? AND parent_folder_id = ? AND user_id = ?");
            $stmt->execute([$folderName, $parentFolderId, $userId]);
        } else {
            $stmt = $conn->prepare("SELECT id FROM folders WHERE name = ? AND parent_folder_id IS NULL AND user_id = ?");
            $stmt->execute([$folderName, $userId]);
        }
        
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'A folder with this name already exists']);
            exit;
        }
        
        // Create folder
        $folderId = generateUUID();
        $stmt = $conn->prepare("INSERT INTO folders (id, name, user_id, parent_folder_id) VALUES (?, ?, ?, ?)");
        $stmt->execute([$folderId, $folderName, $userId, $parentFolderId]);
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'folder' => [
                'id' => $folderId,
                'name' => $folderName,
                'parent_folder_id' => $parentFolderId
            ]
        ]);
        exit;
    }
    
    // PUT: Rename folder
    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['id']) || !isset($input['name'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Folder ID and name are required']);
            exit;
        }
        
        $folderId = $input['id'];
        $newName = trim($input['name']);
        
        if ($newName === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Folder name cannot be empty']);
            exit;
        }
        
        // Verify ownership
        $stmt = $conn->prepare("SELECT user_id, parent_folder_id FROM folders WHERE id = ?");
        $stmt->execute([$folderId]);
        $folder = $stmt->fetch();
        
        if (!$folder || $folder['user_id'] !== $userId) {
            http_response_code(403);
            echo json_encode(['error' => 'Access denied']);
            exit;
        }
        
        // Check for duplicate name
        if ($folder['parent_folder_id']) {
            $stmt = $conn->prepare("SELECT id FROM folders WHERE name = ? AND parent_folder_id = ? AND user_id = ? AND id != ?");
            $stmt->execute([$newName, $folder['parent_folder_id'], $userId, $folderId]);
        } else {
            $stmt = $conn->prepare("SELECT id FROM folders WHERE name = ? AND parent_folder_id IS NULL AND user_id = ? AND id != ?");
            $stmt->execute([$newName, $userId, $folderId]);
        }
        
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'A folder with this name already exists']);
            exit;
        }
        
        // Rename folder
        $stmt = $conn->prepare("UPDATE folders SET name = ? WHERE id = ?");
        $stmt->execute([$newName, $folderId]);
        
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Folder renamed successfully']);
        exit;
    }
    
    // DELETE: Delete folder and all contents
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $folderId = isset($_GET['id']) ? $_GET['id'] : null;
        
        if (!$folderId) {
            http_response_code(400);
            echo json_encode(['error' => 'Folder ID is required']);
            exit;
        }
        
        // Verify ownership
        $stmt = $conn->prepare("SELECT user_id FROM folders WHERE id = ?");
        $stmt->execute([$folderId]);
        $folder = $stmt->fetch();
        
        if (!$folder || $folder['user_id'] !== $userId) {
            http_response_code(403);
            echo json_encode(['error' => 'Access denied']);
            exit;
        }
        
        // Get all files in this folder and subfolders to delete physical files
        function getAllFilesInFolder($conn, $folderId) {
            $allFiles = [];
            
            // Get files directly in this folder
            $stmt = $conn->prepare("SELECT stored_filename FROM files WHERE folder_id = ?");
            $stmt->execute([$folderId]);
            $files = $stmt->fetchAll();
            foreach ($files as $file) {
                // Construct full path to uploaded file
                $filepath = __DIR__ . '/../uploads/' . $file['stored_filename'];
                $allFiles[] = $filepath;
            }
            
            // Get subfolders
            $stmt = $conn->prepare("SELECT id FROM folders WHERE parent_folder_id = ?");
            $stmt->execute([$folderId]);
            $subfolders = $stmt->fetchAll();
            
            foreach ($subfolders as $subfolder) {
                $allFiles = array_merge($allFiles, getAllFilesInFolder($conn, $subfolder['id']));
            }
            
            return $allFiles;
        }
        
        $filesToDelete = getAllFilesInFolder($conn, $folderId);
        
        // Delete physical files
        foreach ($filesToDelete as $filepath) {
            if (file_exists($filepath)) {
                unlink($filepath);
            }
        }
        
        // Delete folder (CASCADE will handle files and subfolders in DB)
        $stmt = $conn->prepare("DELETE FROM folders WHERE id = ?");
        $stmt->execute([$folderId]);
        
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Folder deleted successfully']);
        exit;
    }
    
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?>
