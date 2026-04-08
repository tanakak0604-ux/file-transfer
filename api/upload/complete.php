<?php
require_once dirname(__DIR__) . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(['error' => 'Method not allowed'], 405);

$body     = json_decode(file_get_contents('php://input'), true);
$fileId   = $body['fileId'] ?? '';
$password = $body['password'] ?? null;

if (!$fileId) json_response(['error' => 'fileId is required'], 400);

// DBからファイル情報を取得
$result = supabase('GET', 'file_records', 'id=eq.' . urlencode($fileId) . '&select=storage_path');
if (empty($result['data'])) json_response(['error' => 'File not found'], 404);

$storagePath = $result['data'][0]['storage_path'];

// チャンクをアセンブル
set_time_limit(300);
$tmpDir  = UPLOAD_DIR . '/tmp/' . $fileId;
$finalDir = UPLOAD_DIR . '/' . $fileId;
if (!is_dir($finalDir)) mkdir($finalDir, 0755, true);

$finalPath = UPLOAD_DIR . '/' . $storagePath;
$out = fopen($finalPath, 'wb');
$i = 0;
while (file_exists($tmpDir . '/chunk_' . $i)) {
    $chunk = file_get_contents($tmpDir . '/chunk_' . $i);
    fwrite($out, $chunk);
    unlink($tmpDir . '/chunk_' . $i);
    $i++;
}
fclose($out);
@rmdir($tmpDir);

// パスワードハッシュ
$passwordHash = null;
$hasPassword  = false;
if ($password) {
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $hasPassword  = true;
}

// DBを更新
supabase('PATCH', 'file_records', 'id=eq.' . urlencode($fileId), [
    'status'        => 'active',
    'has_password'  => $hasPassword,
    'password_hash' => $passwordHash,
]);

$updated = supabase('GET', 'file_records', 'id=eq.' . urlencode($fileId) . '&select=expires_at');
json_response(['expiresAt' => $updated['data'][0]['expires_at']]);
