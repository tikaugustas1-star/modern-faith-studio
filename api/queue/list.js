const {getSession} = require('../tiktok/session');
const {accountKey, supabaseRequest} = require('../_lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({error: 'Method not allowed.'});
  const session = getSession(req);
  if (!session?.access_token) return res.status(401).json({error: 'Connect TikTok first.'});
  try {
    const rows = await supabaseRequest(`post_queue?account_key=eq.${encodeURIComponent(accountKey(session))}&select=*&order=scheduled_for.asc`);
    return res.status(200).json({items: rows || []});
  } catch (error) {
    return res.status(503).json({error: error.message});
  }
};
