<?php
// Prevent any output before headers
error_reporting(E_ALL);
ini_set('display_errors', 0);

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
require_once 'activity.php';

$conn = getDbConnection();
$user = getCurrentUser($conn);

if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit;
}

$userId = $user['user_id'];

try {
    // GET: List all favorites
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get favorite files
        $stmt = $conn->prepare("
            SELECT id, filename, file_size as filesize, mime_type as mimetype, 
                   share_token as shared_token, uploaded_at, folder_id, is_favorite
            FROM files 
            WHERE user_id = ? AND is_favorite = 1 
            ORDER BY uploaded_at DESC
        ");
        $stmt->execute([$userId]);
        $files = $stmt->fetchAll();
        
        // Get favorite folders
        $stmt = $conn->prepare("
            SELECT id, name, parent_folder_id, shared_token, created_at, is_favorite
            FROM folders 
            WHERE user_id = ? AND is_favorite = 1 
            ORDER BY name ASC
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
    
    // POST: Toggle favorite status
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['resource_type']) || !isset($input['resource_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'resource_type and resource_id are required']);
            exit;
        }
        
        $resourceType = $input['resource_type'];
        $resourceId = $input['resource_id'];
        $isFavorite = isset($input['is_favorite']) ? (bool)$input['is_favorite'] : null;
        
        if ($resourceType === 'file') {
            // Verify file ownership
            $stmt = $conn->prepare("SELECT user_id, filename, is_favorite FROM files WHERE id = ?");
            $stmt->execute([$resourceId]);
            $resource = $stmt->fetch();
            
            if (!$resource || $resource['user_id'] !== $userId) {
                http_response_code(403);
                echo json_encode(['error' => 'Access denied']);
                exit;
            }
            
            // Toggle or set favorite status
            $newStatus = $isFavorite !== null ? ($isFavorite ? 1 : 0) : ($resource['is_favorite'] ? 0 : 1);
            
            $stmt = $conn->prepare("UPDATE files SET is_favorite = ? WHERE id = ?");
            $stmt->execute([$newStatus, $resourceId]);
            
            // Log activity (optional)
            try {
                $action = $newStatus ? 'favorite' : 'unfavorite';
                logActivity($conn, $userId, $action, 'file', $resourceId, $resource['filename'], null);
            } catch (Exception $e) {
                error_log("Activity log failed: " . $e->getMessage());
            }
            
        } else if ($resourceType === 'folder') {
            // Verify folder ownership
            $stmt = $conn->prepare("SELECT user_id, name, is_favorite FROM folders WHERE id = ?");
            $stmt->execute([$resourceId]);
            $resource = $stmt->fetch();
            
            if (!$resource || $resource['user_id'] !== $userId) {
                http_response_code(403);
                echo json_encode(['error' => 'Access denied']);
                exit;
            }
            
            // Toggle or set favorite status
            $newStatus = $isFavorite !== null ? ($isFavorite ? 1 : 0) : ($resource['is_favorite'] ? 0 : 1);
            
            $stmt = $conn->prepare("UPDATE folders SET is_favorite = ? WHERE id = ?");
            $stmt->execute([$newStatus, $resourceId]);
            
            // Log activity (optional)
            try {
                $action = $newStatus ? 'favorite' : 'unfavorite';
                logActivity($conn, $userId, $action, 'folder', $resourceId, $resource['name'], null);
            } catch (Exception $e) {
                error_log("Activity log failed: " . $e->getMessage());
            }
            
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid resource_type']);
            exit;
        }
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'is_favorite' => (bool)$newStatus
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
