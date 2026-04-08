<?php
require_once dirname(__DIR__) . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(['error' => 'Method not allowed'], 405);

$body     = json_decode(file_get_contents('php://input'), true);
$fileId   = $_GET['fileId'] ?? '';
$password = $body['password'] ?? null;

if (!$fileId) json_response(['error' => 'fileId is required'], 400);

$result = supabase('GET', 'file_records', 'id=eq.' . urlencode($fileId) . '&status=eq.active&select=*');
if (empty($result['data'])) json_response(['error' => 'File not found'], 404);

$file = $result['data'][0];
if (strtotime($file['expires_at']) < time()) json_response(['error' => 'File has expired'], 410);

if ($file['has_password']) {
    if (!$password) json_response(['error' => 'Password required'], 401);
    if (!password_verify($password, $file['password_hash'])) json_response(['error' => 'Invalid password'], 401);
}

$token = generate_uuid();
supabase('POST', 'download_tokens', '', ['token' => $token, 'file_id' => $fileId]);

json_response(['token' => $token]);
