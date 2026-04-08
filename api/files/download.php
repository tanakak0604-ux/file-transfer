<?php
require_once dirname(__DIR__) . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') json_response(['error' => 'Method not allowed'], 405);

$fileId = $_GET['fileId'] ?? '';
$token  = $_GET['token']  ?? '';
if (!$fileId || !$token) json_response(['error' => 'Invalid request'], 400);

// トークン検証
$tokenResult = supabase('GET', 'download_tokens',
    'token=eq.' . urlencode($token) . '&file_id=eq.' . urlencode($fileId)
);
if (empty($tokenResult['data'])) json_response(['error' => 'Invalid token'], 401);

$tokenData = $tokenResult['data'][0];
$TOKEN_TTL = 5 * 60; // 5分
if (time() - strtotime($tokenData['created_at']) > $TOKEN_TTL) {
    supabase('DELETE', 'download_tokens', 'token=eq.' . urlencode($token));
    json_response(['error' => 'Token expired'], 401);
}

// ファイル情報取得
$fileResult = supabase('GET', 'file_records', 'id=eq.' . urlencode($fileId) . '&select=*');
if (empty($fileResult['data'])) json_response(['error' => 'File not found'], 404);

$file = $fileResult['data'][0];
$filePath = UPLOAD_DIR . '/' . $file['storage_path'];

if (!file_exists($filePath)) json_response(['error' => 'File not found on disk'], 404);

// トークン削除 & ダウンロード数更新
supabase('DELETE', 'download_tokens', 'token=eq.' . urlencode($token));
supabase('PATCH', 'file_records', 'id=eq.' . urlencode($fileId), [
    'download_count' => intval($file['download_count']) + 1,
]);

// ファイルをストリーム送信
$fileName = $file['original_name'];
$fileSize = filesize($filePath);

header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . rawurlencode($fileName) . '"');
header('Content-Length: ' . $fileSize);
header('Cache-Control: no-cache');

set_time_limit(0);
readfile($filePath);
exit;
