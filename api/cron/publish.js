const {supabaseRequest, getAccount} = require('../_lib/supabase');
const {usableTokens, publishPhotos} = require('../_lib/tiktok');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({error: 'Method not allowed.'});
  const secret = String(process.env.CRON_SECRET || '').trim();
  if (secret && req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({error: 'Unauthorized cron request.'});
  const now = new Date().toISOString();
  const processed = [];
  try {
    const dueItems = await supabaseRequest(`post_queue?status=eq.queued&scheduled_for=lte.${encodeURIComponent(now)}&order=scheduled_for.asc&limit=5&select=*`);
    for (const item of dueItems || []) {
      const locked = await supabaseRequest(`post_queue?id=eq.${encodeURIComponent(item.id)}&status=eq.queued`, {method: 'PATCH', headers: {'Prefer': 'return=representation'}, body: JSON.stringify({status: 'processing', updated_at: now})});
      if (!locked?.length) continue;
      try {
        const account = await getAccount(item.account_key);
        const tokens = await usableTokens(item.account_key, account);
        const result = await publishPhotos(tokens.access_token, item);
        await supabaseRequest(`post_queue?id=eq.${encodeURIComponent(item.id)}`, {method: 'PATCH', body: JSON.stringify({status: 'submitted', publish_id: result.publish_id || null, error: null, updated_at: new Date().toISOString()})});
        processed.push({id: item.id, status: 'submitted', publish_id: result.publish_id || null});
      } catch (error) {
        await supabaseRequest(`post_queue?id=eq.${encodeURIComponent(item.id)}`, {method: 'PATCH', body: JSON.stringify({status: 'failed', error: error.message.slice(0, 500), updated_at: new Date().toISOString()})});
        processed.push({id: item.id, status: 'failed', error: error.message});
      }
    }
    return res.status(200).json({now, processed});
  } catch (error) {
    return res.status(503).json({error: error.message});
  }
};
