const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { fileName, fileSize, expiryDays } = req.body;
  if (!fileName || !fileSize) return res.status(400).json({ error: 'fileName and fileSize are required' });

  const fileId = uuidv4();
  const ext = fileName.includes('.') ? fileName.split('.').pop() : 'bin';
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'bin';
  const storagePath = `${fileId}/file.${safeExt}`;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (parseInt(expiryDays) || 7));

  const { error } = await supabase.from('file_records').insert({
    id: fileId,
    original_name: fileName,
    storage_path: storagePath,
    size: parseInt(fileSize),
    expires_at: expiresAt.toISOString(),
    status: 'pending',
  });

  if (error) return res.status(500).json({ error: error.message });

  res.json({ fileId, uploadPath: storagePath });
};
