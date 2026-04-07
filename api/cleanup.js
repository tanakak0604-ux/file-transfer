const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  // Vercel Cron の認証
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 期限切れレコードを取得
  const { data: expiredFiles, error: fetchError } = await supabase
    .from('file_records')
    .select('id, storage_path')
    .lt('expires_at', new Date().toISOString());

  if (fetchError) return res.status(500).json({ error: fetchError.message });
  if (!expiredFiles || expiredFiles.length === 0) {
    return res.json({ deleted: 0, message: 'No expired files' });
  }

  // Storageからファイルを削除
  const paths = expiredFiles.map((f) => f.storage_path);
  const { error: storageError } = await supabase.storage.from('files').remove(paths);
  if (storageError) return res.status(500).json({ error: storageError.message });

  // DBレコードを削除
  const ids = expiredFiles.map((f) => f.id);
  const { error: dbError } = await supabase
    .from('file_records')
    .delete()
    .in('id', ids);

  if (dbError) return res.status(500).json({ error: dbError.message });

  // 関連する download_tokens も削除（残存している場合）
  await supabase.from('download_tokens').delete().in('file_id', ids);

  res.json({ deleted: expiredFiles.length });
};
