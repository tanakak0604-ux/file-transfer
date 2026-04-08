<?php
require_once dirname(__DIR__) . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') json_response(['error' => 'Method not allowed'], 405);

$fileId = $_GET['fileId'] ?? '';
if (!$fileId) json_response(['error' => 'fileId is required'], 400);

$result = supabase('GET', 'file_records',
    'id=eq.' . urlencode($fileId) .
    '&status=eq.active' .
    '&select=id,original_name,size,uploaded_at,expires_at,has_password,download_count'
);

if (empty($result['data'])) json_response(['error' => 'File not found'], 404);

$file = $result['data'][0];
if (strtotime($file['expires_at']) < time()) json_response(['error' => 'File has expired'], 410);

json_response([
    'id'            => $file['id'],
    'originalName'  => $file['original_name'],
    'size'          => $file['size'],
    'uploadedAt'    => $file['uploaded_at'],
    'expiresAt'     => $file['expires_at'],
    'hasPassword'   => $file['has_password'],
    'downloadCount' => $file['download_count'],
]);
