<?php
require_once dirname(__DIR__) . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(['error' => 'Method not allowed'], 405);

$fileId     = $_POST['fileId'] ?? '';
$chunkIndex = isset($_POST['chunkIndex']) ? intval($_POST['chunkIndex']) : -1;

if (!$fileId || $chunkIndex < 0) json_response(['error' => 'Invalid parameters'], 400);

if (!isset($_FILES['chunk']) || $_FILES['chunk']['error'] !== UPLOAD_ERR_OK) {
    json_response(['error' => 'Chunk upload failed'], 400);
}

$tmpDir = UPLOAD_DIR . '/tmp/' . $fileId;
if (!is_dir($tmpDir)) json_response(['error' => 'Upload session not found'], 404);

move_uploaded_file($_FILES['chunk']['tmp_name'], $tmpDir . '/chunk_' . $chunkIndex);

json_response(['success' => true]);
