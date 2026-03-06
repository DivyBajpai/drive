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
    // GET: List all tags or get tags for a specific file
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $fileId = isset($_GET['file_id']) ? $_GET['file_id'] : null;
        
        if ($fileId) {
            // Get tags for specific file
            $stmt = $conn->prepare("
                SELECT t.* FROM tags t
                JOIN file_tags ft ON t.id = ft.tag_id
                WHERE ft.file_id = ? AND t.user_id = ?
                ORDER BY t.name ASC
            ");
            $stmt->execute([$fileId, $userId]);
        } else {
            // Get all user's tags with file count
            $stmt = $conn->prepare("
                SELECT t.*, COUNT(ft.file_id) as file_count
                FROM tags t
                LEFT JOIN file_tags ft ON t.id = ft.tag_id
                WHERE t.user_id = ?
                GROUP BY t.id
                ORDER BY t.name ASC
            ");
            $stmt->execute([$userId]);
        }
        
        $tags = $stmt->fetchAll();
        
        http_response_code(200);
        echo json_encode($tags);
        exit;
    }
    
    // POST: Create new tag or assign tag to file
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Check if assigning tag to file
        if (isset($input['file_id']) && isset($input['tag_id'])) {
            $fileId = $input['file_id'];
            $tagId = $input['tag_id'];
            
            // Verify file ownership
            $stmt = $conn->prepare("SELECT user_id, filename FROM files WHERE id = ?");
            $stmt->execute([$fileId]);
            $file = $stmt->fetch();
            
            if (!$file || $file['user_id'] !== $userId) {
                http_response_code(403);
                echo json_encode(['error' => 'Access denied']);
                exit;
            }
            
            // Verify tag ownership
            $stmt = $conn->prepare("SELECT user_id, name FROM tags WHERE id = ?");
            $stmt->execute([$tagId]);
            $tag = $stmt->fetch();
            
            if (!$tag || $tag['user_id'] !== $userId) {
                http_response_code(403);
                echo json_encode(['error' => 'Invalid tag']);
                exit;
            }
            
            // Assign tag to file
            try {
                $stmt = $conn->prepare("INSERT INTO file_tags (file_id, tag_id) VALUES (?, ?)");
                $stmt->execute([$fileId, $tagId]);
                
                // Log activity
                $details = "Tagged with '{$tag['name']}'";
                logActivity($conn, $userId, 'tag', 'file', $fileId, $file['filename'], $details);
                
                http_response_code(201);
                echo json_encode(['success' => true, 'message' => 'Tag assigned']);
            } catch (PDOException $e) {
                if ($e->getCode() == 23000) {
                    http_response_code(200);
                    echo json_encode(['success' => true, 'message' => 'Tag already assigned']);
                } else {
                    throw $e;
                }
            }
            exit;
        }
        
        // Create new tag
        if (!isset($input['name']) || trim($input['name']) === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Tag name is required']);
            exit;
        }
        
        $tagName = trim($input['name']);
        $tagColor = isset($input['color']) ? $input['color'] : '#3B82F6';
        $tagId = generateUUID();
        
        try {
            $stmt = $conn->prepare("INSERT INTO tags (id, user_id, name, color) VALUES (?, ?, ?, ?)");
            $stmt->execute([$tagId, $userId, $tagName, $tagColor]);
            
            http_response_code(201);
            echo json_encode([
                'success' => true,
                'tag' => [
                    'id' => $tagId,
                    'name' => $tagName,
                    'color' => $tagColor
                ]
            ]);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                http_response_code(409);
                echo json_encode(['error' => 'Tag name already exists']);
            } else {
                throw $e;
            }
        }
        exit;
    }
    
    // PUT: Update tag
    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Tag ID is required']);
            exit;
        }
        
        $tagId = $input['id'];
        
        // Verify ownership
        $stmt = $conn->prepare("SELECT user_id FROM tags WHERE id = ?");
        $stmt->execute([$tagId]);
        $tag = $stmt->fetch();
        
        if (!$tag || $tag['user_id'] !== $userId) {
            http_response_code(403);
            echo json_encode(['error' => 'Access denied']);
            exit;
        }
        
        $updates = [];
        $params = [];
        
        if (isset($input['name']) && trim($input['name']) !== '') {
            $updates[] = "name = ?";
            $params[] = trim($input['name']);
        }
        
        if (isset($input['color'])) {
            $updates[] = "color = ?";
            $params[] = $input['color'];
        }
        
        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(['error' => 'No fields to update']);
            exit;
        }
        
        $params[] = $tagId;
        $stmt = $conn->prepare("UPDATE tags SET " . implode(', ', $updates) . " WHERE id = ?");
        $stmt->execute($params);
        
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Tag updated']);
        exit;
    }
    
    // DELETE: Remove tag or remove tag from file
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $tagId = isset($_GET['tag_id']) ? $_GET['tag_id'] : null;
        $fileId = isset($_GET['file_id']) ? $_GET['file_id'] : null;
        
        if (!$tagId) {
            http_response_code(400);
            echo json_encode(['error' => 'Tag ID is required']);
            exit;
        }
        
        // Verify tag ownership
        $stmt = $conn->prepare("SELECT user_id, name FROM tags WHERE id = ?");
        $stmt->execute([$tagId]);
        $tag = $stmt->fetch();
        
        if (!$tag || $tag['user_id'] !== $userId) {
            http_response_code(403);
            echo json_encode(['error' => 'Access denied']);
            exit;
        }
        
        if ($fileId) {
            // Get file info for activity log
            $stmt = $conn->prepare("SELECT filename FROM files WHERE id = ?");
            $stmt->execute([$fileId]);
            $file = $stmt->fetch();
            
            // Remove tag from specific file
            $stmt = $conn->prepare("DELETE FROM file_tags WHERE file_id = ? AND tag_id = ?");
            $stmt->execute([$fileId, $tagId]);
            
            // Log activity
            if ($file) {
                $details = "Removed tag '{$tag['name']}'";
                logActivity($conn, $userId, 'untag', 'file', $fileId, $file['filename'], $details);
            }
            
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Tag removed from file']);
        } else {
            // Delete tag completely
            $stmt = $conn->prepare("DELETE FROM tags WHERE id = ?");
            $stmt->execute([$tagId]);
            
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Tag deleted']);
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
