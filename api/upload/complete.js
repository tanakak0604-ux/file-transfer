const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

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

  const { fileId, password } = req.body;
  if (!fileId) return res.status(400).json({ error: 'fileId is required' });

  let passwordHash = null;
  if (password) passwordHash = await bcrypt.hash(password, 10);

  const { error } = await supabase
    .from('file_records')
    .update({ status: 'active', has_password: !!password, password_hash: passwordHash })
    .eq('id', fileId);

  if (error) return res.status(500).json({ error: error.message });

  const { data: file } = await supabase
    .from('file_records')
    .select('expires_at')
    .eq('id', fileId)
    .single();

  res.json({ expiresAt: file.expires_at });
};
