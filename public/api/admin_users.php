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

// Check if user is admin
function isAdmin($conn) {
    $user = getCurrentUser($conn);
    if (!$user) {
        return false;
    }
    
    $stmt = $conn->prepare("SELECT is_admin FROM users WHERE id = ?");
    $stmt->execute([$user['user_id']]);
    $result = $stmt->fetch();
    
    return $result && $result['is_admin'] == 1;
}

$conn = getDbConnection();

// Verify admin access
if (!isAdmin($conn)) {
    http_response_code(403);
    echo json_encode(['error' => 'Admin access required']);
    exit;
}

try {
    // GET: List all users
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $conn->query("
            SELECT id, email, name, is_admin, created_at, last_login,
                   (SELECT COUNT(*) FROM files WHERE user_id = users.id) as file_count
            FROM users 
            ORDER BY created_at DESC
        ");
        $users = $stmt->fetchAll();
        
        http_response_code(200);
        echo json_encode($users);
        exit;
    }
    
    // POST: Create new user
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['email']) || !isset($input['password']) || !isset($input['name'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Email, password, and name are required']);
            exit;
        }
        
        $email = trim($input['email']);
        $password = $input['password'];
        $name = trim($input['name']);
        $isAdmin = isset($input['is_admin']) ? (int)$input['is_admin'] : 0;
        
        // Validate email
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid email format']);
            exit;
        }
        
        // Check if email already exists
        $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'Email already exists']);
            exit;
        }
        
        // Create user
        $userId = generateUUID();
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        
        $stmt = $conn->prepare("INSERT INTO users (id, email, password_hash, name, is_admin) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$userId, $email, $passwordHash, $name, $isAdmin]);
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $userId,
                'email' => $email,
                'name' => $name,
                'is_admin' => $isAdmin
            ]
        ]);
        exit;
    }
    
    // PUT: Update user
    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'User ID is required']);
            exit;
        }
        
        $userId = $input['id'];
        
        // Build update query dynamically
        $updates = [];
        $params = [];
        
        if (isset($input['name'])) {
            $updates[] = "name = ?";
            $params[] = trim($input['name']);
        }
        
        if (isset($input['email'])) {
            if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid email format']);
                exit;
            }
            $updates[] = "email = ?";
            $params[] = trim($input['email']);
        }
        
        if (isset($input['is_admin'])) {
            $updates[] = "is_admin = ?";
            $params[] = (int)$input['is_admin'];
        }
        
        if (isset($input['password']) && !empty($input['password'])) {
            $updates[] = "password_hash = ?";
            $params[] = password_hash($input['password'], PASSWORD_DEFAULT);
        }
        
        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(['error' => 'No fields to update']);
            exit;
        }
        
        $params[] = $userId;
        $sql = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'User updated successfully']);
        exit;
    }
    
    // DELETE: Delete user
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        if (!isset($_GET['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'User ID is required']);
            exit;
        }
        
        $userId = $_GET['id'];
        
        // Prevent deleting yourself
        $currentUser = getCurrentUser($conn);
        if ($currentUser['user_id'] === $userId) {
            http_response_code(400);
            echo json_encode(['error' => 'Cannot delete your own account']);
            exit;
        }
        
        // Delete user (cascading will delete their files and sessions)
        $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'User deleted successfully']);
        exit;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Operation failed: ' . $e->getMessage()]);
}
?>
