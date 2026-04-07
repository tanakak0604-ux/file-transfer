const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
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

  const { fileId } = req.query;
  const { password } = req.body;

  const { data: file, error } = await supabase
    .from('file_records')
    .select('*')
    .eq('id', fileId)
    .eq('status', 'active')
    .single();

  if (error || !file) return res.status(404).json({ error: 'File not found' });
  if (new Date() > new Date(file.expires_at)) return res.status(410).json({ error: 'File has expired' });

  if (file.has_password) {
    if (!password) return res.status(401).json({ error: 'Password required' });
    const valid = await bcrypt.compare(password, file.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });
  }

  const token = uuidv4();
  await supabase.from('download_tokens').insert({ token, file_id: fileId });

  res.json({ token });
};
