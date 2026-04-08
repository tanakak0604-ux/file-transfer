<?php
require_once dirname(__DIR__) . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(['error' => 'Method not allowed'], 405);

$body     = json_decode(file_get_contents('php://input'), true);
$fileName = $body['fileName'] ?? '';
$fileSize = $body['fileSize'] ?? 0;
$expiryDays = intval($body['expiryDays'] ?? 7);

if (!$fileName || !$fileSize) json_response(['error' => 'fileName and fileSize are required'], 400);

$fileId  = generate_uuid();
$ext     = preg_replace('/[^a-zA-Z0-9]/', '', strtolower(pathinfo($fileName, PATHINFO_EXTENSION))) ?: 'bin';
$storagePath = $fileId . '/file.' . $ext;
$expiresAt   = gmdate('Y-m-d\TH:i:s\Z', strtotime("+{$expiryDays} days"));

// チャンク一時保存ディレクトリを作成
$tmpDir = UPLOAD_DIR . '/tmp/' . $fileId;
if (!is_dir($tmpDir)) mkdir($tmpDir, 0755, true);

$result = supabase('POST', 'file_records', '', [
    'id'           => $fileId,
    'original_name'=> $fileName,
    'storage_path' => $storagePath,
    'size'         => intval($fileSize),
    'expires_at'   => $expiresAt,
    'status'       => 'pending',
]);

if ($result['status'] >= 400) json_response(['error' => 'Database error'], 500);

json_response(['fileId' => $fileId]);
