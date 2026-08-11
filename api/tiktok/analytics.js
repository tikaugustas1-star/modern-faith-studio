const {getSession} = require('./session');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({error: 'Method not allowed.'});
  const session = getSession(req);
  if (!session?.access_token) return res.status(401).json({error: 'Connect TikTok first.'});

  try {
    const fields = 'open_id,display_name,username,follower_count,following_count,likes_count,video_count';
    const userResponse = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${fields}`, {headers: {Authorization: `Bearer ${session.access_token}`}});
    const userData = await userResponse.json();
    if (!userResponse.ok || (userData.error?.code && userData.error.code !== 'ok')) return res.status(400).json(userData);

    const videoFields = 'id,create_time,cover_image_url,share_url,video_description,title,like_count,comment_count,share_count,view_count';
    const videoResponse = await fetch(`https://open.tiktokapis.com/v2/video/list/?fields=${videoFields}`, {method: 'POST', headers: {Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json'}, body: JSON.stringify({max_count: 20})});
    const videoData = await videoResponse.json();
    if (!videoResponse.ok || (videoData.error?.code && videoData.error.code !== 'ok')) return res.status(400).json(videoData);
    return res.status(200).json({user: userData.data?.user || {}, videos: videoData.data?.videos || []});
  } catch (error) {
    return res.status(500).json({error: error.message});
  }
};
