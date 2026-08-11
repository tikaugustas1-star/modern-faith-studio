const {getSession} = require('./session');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed.'});
  const session = getSession(req);
  const publish_id = String(req.body?.publish_id || '').trim();
  if (!session?.access_token) return res.status(401).json({error: 'Connect TikTok first.'});
  if (!publish_id) return res.status(400).json({error: 'publish_id is required.'});

  try {
    const response = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {method: 'POST', headers: {Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json'}, body: JSON.stringify({publish_id})});
    const data = await response.json();
    if (!response.ok || (data.error?.code && data.error.code !== 'ok')) return res.status(400).json(data);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({error: error.message});
  }
};
