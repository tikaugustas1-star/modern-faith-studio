const {getSession} = require('./session');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed.'});
  const session = getSession(req);
  if (!session?.access_token) return res.status(401).json({error: 'Connect TikTok first.'});

  try {
    const response = await fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', {
      method: 'POST',
      headers: {Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json'}
    });
    const data = await response.json();
    if (data.error?.code && data.error.code !== 'ok') return res.status(400).json(data);
    return res.status(200).json(data.data || data);
  } catch (error) {
    return res.status(500).json({error: error.message});
  }
};
