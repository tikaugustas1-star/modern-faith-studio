const {getSession} = require('../tiktok/session');
const {accountKey, supabaseRequest} = require('../_lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed.'});
  const session = getSession(req);
  const id = String(req.body?.id || '').trim();
  if (!session?.access_token) return res.status(401).json({error: 'Connect TikTok first.'});
  if (!id) return res.status(400).json({error: 'Queue id is required.'});
  try {
    await supabaseRequest(`post_queue?id=eq.${encodeURIComponent(id)}&account_key=eq.${encodeURIComponent(accountKey(session))}&status=eq.queued`, {method: 'DELETE'});
    return res.status(204).end();
  } catch (error) {
    return res.status(503).json({error: error.message});
  }
};
