const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const { fileId } = req.query;

  const { data: file, error } = await supabase
    .from('file_records')
    .select('id, original_name, size, uploaded_at, expires_at, has_password, download_count')
    .eq('id', fileId)
    .eq('status', 'active')
    .single();

  if (error || !file) return res.status(404).json({ error: 'File not found' });
  if (new Date() > new Date(file.expires_at)) return res.status(410).json({ error: 'File has expired' });

  res.json({
    id: file.id,
    originalName: file.original_name,
    size: file.size,
    uploadedAt: file.uploaded_at,
    expiresAt: file.expires_at,
    hasPassword: file.has_password,
    downloadCount: file.download_count,
  });
};
