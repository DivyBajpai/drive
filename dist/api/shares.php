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
    // POST: Share file/folder with user(s)
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['resource_type']) || !isset($input['resource_id']) || !isset($input['emails'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Resource type, resource ID, and emails are required']);
            exit;
        }
        
        $resourceType = $input['resource_type']; // 'file' or 'folder'
        $resourceId = $input['resource_id'];
        $emails = $input['emails']; // Array of email addresses
        $permission = isset($input['permission']) ? $input['permission'] : 'view';
        
        // Validate resource type
        if (!in_array($resourceType, ['file', 'folder'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid resource type']);
            exit;
        }
        
        // Verify ownership
        $table = $resourceType === 'file' ? 'files' : 'folders';
        $stmt = $conn->prepare("SELECT user_id FROM $table WHERE id = ?");
        $stmt->execute([$resourceId]);
        $resource = $stmt->fetch();
        
        if (!$resource || $resource['user_id'] !== $userId) {
            http_response_code(403);
            echo json_encode(['error' => 'Access denied - you do not own this resource']);
            exit;
        }
        
        $successCount = 0;
        $errors = [];
        
        foreach ($emails as $email) {
            $email = trim($email);
            
            // Find user by email
            $stmt = $conn->prepare("SELECT id, name FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $targetUser = $stmt->fetch();
            
            if (!$targetUser) {
                $errors[] = "User not found: $email";
                continue;
            }
            
            // Don't share with yourself
            if ($targetUser['id'] === $userId) {
                $errors[] = "Cannot share with yourself";
                continue;
            }
            
            // Check if already shared
            $stmt = $conn->prepare("
                SELECT id FROM shares 
                WHERE resource_type = ? AND resource_id = ? AND shared_with_id = ?
            ");
            $stmt->execute([$resourceType, $resourceId, $targetUser['id']]);
            
            if ($stmt->fetch()) {
                $errors[] = "Already shared with: $email";
                continue;
            }
            
            // Create share
            $shareId = generateUUID();
            $stmt = $conn->prepare("
                INSERT INTO shares (id, resource_type, resource_id, owner_id, shared_with_id, permission) 
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$shareId, $resourceType, $resourceId, $userId, $targetUser['id'], $permission]);
            $successCount++;
        }
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'shared_with' => $successCount,
            'errors' => $errors
        ]);
        exit;
    }
    
    // GET: List shares for a resource
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $resourceType = isset($_GET['resource_type']) ? $_GET['resource_type'] : null;
        $resourceId = isset($_GET['resource_id']) ? $_GET['resource_id'] : null;
        
        if (!$resourceType || !$resourceId) {
            http_response_code(400);
            echo json_encode(['error' => 'Resource type and ID are required']);
            exit;
        }
        
        // Verify ownership
        $table = $resourceType === 'file' ? 'files' : 'folders';
        $stmt = $conn->prepare("SELECT user_id FROM $table WHERE id = ?");
        $stmt->execute([$resourceId]);
        $resource = $stmt->fetch();
        
        if (!$resource || $resource['user_id'] !== $userId) {
            http_response_code(403);
            echo json_encode(['error' => 'Access denied']);
            exit;
        }
        
        // Get all shares
        $stmt = $conn->prepare("
            SELECT s.id, s.permission, s.created_at, u.id as user_id, u.email, u.name
            FROM shares s
            JOIN users u ON s.shared_with_id = u.id
            WHERE s.resource_type = ? AND s.resource_id = ?
            ORDER BY s.created_at DESC
        ");
        $stmt->execute([$resourceType, $resourceId]);
        $shares = $stmt->fetchAll();
        
        http_response_code(200);
        echo json_encode($shares);
        exit;
    }
    
    // DELETE: Remove share
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $shareId = isset($_GET['id']) ? $_GET['id'] : null;
        
        if (!$shareId) {
            http_response_code(400);
            echo json_encode(['error' => 'Share ID is required']);
            exit;
        }
        
        // Verify you own the resource or you are the one being shared with
        $stmt = $conn->prepare("
            SELECT owner_id, shared_with_id FROM shares WHERE id = ?
        ");
        $stmt->execute([$shareId]);
        $share = $stmt->fetch();
        
        if (!$share || ($share['owner_id'] !== $userId && $share['shared_with_id'] !== $userId)) {
            http_response_code(403);
            echo json_encode(['error' => 'Access denied']);
            exit;
        }
        
        // Delete share
        $stmt = $conn->prepare("DELETE FROM shares WHERE id = ?");
        $stmt->execute([$shareId]);
        
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Share removed']);
        exit;
    }
    
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?>
