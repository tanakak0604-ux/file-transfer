<?php
require_once __DIR__ . '/config.php';

// Xserver cronから直接実行 or GETアクセス（Basic認証で保護）
$authUser = $_SERVER['PHP_AUTH_USER'] ?? '';
$authPass = $_SERVER['PHP_AUTH_PW']   ?? '';
if ($authUser !== 'andto' || $authPass !== getenv('CLEANUP_PASSWORD')) {
    header('WWW-Authenticate: Basic realm="Cleanup"');
    http_response_code(401);
    exit('Unauthorized');
}

// 期限切れファイルを取得
$result = supabase('GET', 'file_records',
    'expires_at=lt.' . urlencode(gmdate('Y-m-d\TH:i:s\Z')) . '&select=id,storage_path'
);
$expired = $result['data'] ?? [];

if (empty($expired)) {
    json_response(['deleted' => 0, 'message' => 'No expired files']);
}

$deleted = 0;
foreach ($expired as $file) {
    // Storageからファイルを削除
    $filePath = UPLOAD_DIR . '/' . $file['storage_path'];
    if (file_exists($filePath)) {
        unlink($filePath);
        @rmdir(dirname($filePath));
    }
    $deleted++;
}

// DBレコードを削除
$ids = array_map(fn($f) => $f['id'], $expired);
foreach ($ids as $id) {
    supabase('DELETE', 'download_tokens', 'file_id=eq.' . urlencode($id));
    supabase('DELETE', 'file_records', 'id=eq.' . urlencode($id));
}

json_response(['deleted' => $deleted]);
