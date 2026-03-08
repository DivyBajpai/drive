<?php
// Helper function to log activity - available for include
function logActivity($conn, $userId, $actionType, $resourceType, $resourceId, $resourceName, $details = null) {
    $activityId = generateUUID();
    $stmt = $conn->prepare("
        INSERT INTO activity_log (id, user_id, action_type, resource_type, resource_id, resource_name, details) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$activityId, $userId, $actionType, $resourceType, $resourceId, $resourceName, $details]);
}

// Only run endpoint logic if this file is accessed directly
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
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
    $user = getCurrentUser($conn);

    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Authentication required']);
        exit;
    }

    $userId = $user['user_id'];

    try {
        // GET: Retrieve activity feed
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
        $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
        $actionType = isset($_GET['action_type']) ? $_GET['action_type'] : null;
        $resourceType = isset($_GET['resource_type']) ? $_GET['resource_type'] : null;
        
        // Build query with filters
        $query = "
            SELECT a.*, u.name as user_name, u.email as user_email
            FROM activity_log a
            JOIN users u ON a.user_id = u.id
            WHERE 1=1
        ";
        
        $params = [];
        
        // Filter by action type
        if ($actionType) {
            $query .= " AND a.action_type = ?";
            $params[] = $actionType;
        }
        
        // Filter by resource type
        if ($resourceType) {
            $query .= " AND a.resource_type = ?";
            $params[] = $resourceType;
        }
        
        // Only show activities for resources user has access to
        // (owned by user OR shared with user)
        $query .= " AND (
            a.user_id = ? 
            OR EXISTS (
                SELECT 1 FROM shares s 
                WHERE s.resource_type = a.resource_type 
                AND s.resource_id = a.resource_id 
                AND s.shared_with_id = ?
            )
        )";
        $params[] = $userId;
        $params[] = $userId;
        
        $query .= " ORDER BY a.created_at DESC LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;
        
        $stmt = $conn->prepare($query);
        $stmt->execute($params);
        $activities = $stmt->fetchAll();
        
        // Get total count
        $countQuery = "SELECT COUNT(*) as total FROM activity_log WHERE user_id = ?";
        $stmt = $conn->prepare($countQuery);
        $stmt->execute([$userId]);
        $total = $stmt->fetch()['total'];
        
        http_response_code(200);
        echo json_encode([
            'activities' => $activities,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset
        ]);
        exit;
    }
    
    // POST: Log a new activity
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['action_type']) || !isset($input['resource_type']) || 
            !isset($input['resource_id']) || !isset($input['resource_name'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            exit;
        }
        
        $details = isset($input['details']) ? $input['details'] : null;
        
        logActivity(
            $conn, 
            $userId, 
            $input['action_type'], 
            $input['resource_type'], 
            $input['resource_id'], 
            $input['resource_name'],
            $details
        );
        
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Activity logged']);
        exit;
    }
    
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
} // End of direct access check
?>
