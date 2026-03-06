<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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
$isAdmin = isset($user['is_admin']) && $user['is_admin'] == 1;

try {
    // Admin: System-wide analytics
    if ($isAdmin) {
        // Total users
        $stmt = $conn->query("SELECT COUNT(*) as count FROM users");
        $totalUsers = $stmt->fetch()['count'];
        
        // Total files
        $stmt = $conn->query("SELECT COUNT(*) as count FROM files WHERE deleted_at IS NULL");
        $totalFiles = $stmt->fetch()['count'];
        
        // Total storage used
        $stmt = $conn->query("SELECT COALESCE(SUM(file_size), 0) as total FROM files WHERE deleted_at IS NULL");
        $totalStorage = $stmt->fetch()['total'];
        
        // Total downloads
        $stmt = $conn->query("SELECT COALESCE(SUM(download_count), 0) as total FROM files WHERE deleted_at IS NULL");
        $totalDownloads = $stmt->fetch()['total'];
        
        // Active users (logged in last 30 days)
        $stmt = $conn->query("SELECT COUNT(*) as count FROM users WHERE last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY)");
        $activeUsers = $stmt->fetch()['count'];
        
        // Files uploaded this month
        $stmt = $conn->query("SELECT COUNT(*) as count FROM files WHERE uploaded_at >= DATE_FORMAT(NOW(), '%Y-%m-01') AND deleted_at IS NULL");
        $filesThisMonth = $stmt->fetch()['count'];
        
        // Top file types
        $stmt = $conn->query("
            SELECT mime_type, COUNT(*) as count 
            FROM files 
            WHERE deleted_at IS NULL 
            GROUP BY mime_type 
            ORDER BY count DESC 
            LIMIT 10
        ");
        $topTypes = $stmt->fetchAll();
        
        // Recent activity (last 50 actions)
        $stmt = $conn->query("
            SELECT a.*, u.name as user_name, u.email 
            FROM audit_logs a 
            JOIN users u ON a.user_id = u.id 
            ORDER BY a.created_at DESC 
            LIMIT 50
        ");
        $recentActivity = $stmt->fetchAll();
        
        http_response_code(200);
        echo json_encode([
            'system' => [
                'total_users' => (int)$totalUsers,
                'active_users' => (int)$activeUsers,
                'total_files' => (int)$totalFiles,
                'files_this_month' => (int)$filesThisMonth,
                'total_storage' => (int)$totalStorage,
                'total_downloads' => (int)$totalDownloads
            ],
            'top_file_types' => $topTypes,
            'recent_activity' => $recentActivity
        ]);
        
    } else {
        // Regular user: Personal analytics
        
        // Total files
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM files WHERE user_id = ? AND deleted_at IS NULL");
        $stmt->execute([$userId]);
        $totalFiles = $stmt->fetch()['count'];
        
        // Total folders
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM folders WHERE user_id = ? AND deleted_at IS NULL");
        $stmt->execute([$userId]);
        $totalFolders = $stmt->fetch()['count'];
        
        // Storage used
        $stmt = $conn->prepare("SELECT COALESCE(SUM(file_size), 0) as total FROM files WHERE user_id = ? AND deleted_at IS NULL");
        $stmt->execute([$userId]);
        $storageUsed = $stmt->fetch()['total'];
        
        // Total downloads
        $stmt = $conn->prepare("SELECT COALESCE(SUM(download_count), 0) as total FROM files WHERE user_id = ? AND deleted_at IS NULL");
        $stmt->execute([$userId]);
        $totalDownloads = $stmt->fetch()['total'];
        
        // Files shared by me
        $stmt = $conn->prepare("SELECT COUNT(DISTINCT resource_id) as count FROM shares WHERE owner_id = ? AND resource_type = 'file'");
        $stmt->execute([$userId]);
        $sharedFiles = $stmt->fetch()['count'];
        
        // Files shared with me
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM shares WHERE shared_with_id = ? AND resource_type = 'file'");
        $stmt->execute([$userId]);
        $sharedWithMe = $stmt->fetch()['count'];
        
        // Files uploaded this month
        $stmt = $conn->prepare("
            SELECT COUNT(*) as count 
            FROM files 
            WHERE user_id = ? 
            AND uploaded_at >= DATE_FORMAT(NOW(), '%Y-%m-01') 
            AND deleted_at IS NULL
        ");
        $stmt->execute([$userId]);
        $filesThisMonth = $stmt->fetch()['count'];
        
        // My file types
        $stmt = $conn->prepare("
            SELECT mime_type, COUNT(*) as count 
            FROM files 
            WHERE user_id = ? AND deleted_at IS NULL 
            GROUP BY mime_type 
            ORDER BY count DESC 
            LIMIT 10
        ");
        $stmt->execute([$userId]);
        $myFileTypes = $stmt->fetchAll();
        
        http_response_code(200);
        echo json_encode([
            'personal' => [
                'total_files' => (int)$totalFiles,
                'total_folders' => (int)$totalFolders,
                'storage_used' => (int)$storageUsed,
                'total_downloads' => (int)$totalDownloads,
                'files_this_month' => (int)$filesThisMonth,
                'shared_by_me' => (int)$sharedFiles,
                'shared_with_me' => (int)$sharedWithMe
            ],
            'file_types' => $myFileTypes
        ]);
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
