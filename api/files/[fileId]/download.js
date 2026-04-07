const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TOKEN_TTL_MS = 5 * 60 * 1000;

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { fileId, token } = req.query;
  if (!token) return res.status(401).json({ error: 'Token required' });

  const { data: tokenData, error: tokenError } = await supabase
    .from('download_tokens')
    .select('*')
    .eq('token', token)
    .eq('file_id', fileId)
    .single();

  if (tokenError || !tokenData) return res.status(401).json({ error: 'Invalid token' });

  if (new Date() - new Date(tokenData.created_at) > TOKEN_TTL_MS) {
    await supabase.from('download_tokens').delete().eq('token', token);
    return res.status(401).json({ error: 'Token expired' });
  }

  const { data: file } = await supabase
    .from('file_records')
    .select('*')
    .eq('id', fileId)
    .single();

  if (!file) return res.status(404).json({ error: 'File not found' });

  await supabase.from('download_tokens').delete().eq('token', token);
  await supabase.from('file_records').update({ download_count: file.download_count + 1 }).eq('id', fileId);

  const { data: signedData, error: signError } = await supabase.storage
    .from('files')
    .createSignedUrl(file.storage_path, 60, { download: file.original_name });

  if (signError) return res.status(500).json({ error: 'Failed to create download URL' });

  res.redirect(signedData.signedUrl);
};
