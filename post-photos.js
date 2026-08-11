const {getSession} = require('./session');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed.'});
  const session = getSession(req);
  if (!session?.access_token) return res.status(401).json({error: 'Connect TikTok first.'});

  const {photo_images: rawImages, description = '', privacy_level: privacyLevel} = req.body || {};
  const photoImages = Array.isArray(rawImages)
    ? rawImages.map(url => String(url).trim()).filter(Boolean)
    : [];
  if (photoImages.length < 1 || photoImages.length > 35) {
    return res.status(400).json({error: 'Add between 1 and 35 public photo URLs.'});
  }
  if (photoImages.some(url => !/^https:\/\//i.test(url))) {
    return res.status(400).json({error: 'Every photo URL must begin with https://'});
  }

  try {
    const creatorResponse = await fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', {
      method: 'POST',
      headers: {Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json'}
    });
    const creator = await creatorResponse.json();
    const options = creator.data?.privacy_level_options || [];
    const selectedPrivacy = privacyLevel || options[0];
    if (!selectedPrivacy || !options.includes(selectedPrivacy)) {
      return res.status(400).json({error: 'Choose a privacy level returned by TikTok.', privacy_level_options: options});
    }

    const response = await fetch('https://open.tiktokapis.com/v2/post/publish/content/init/', {
      method: 'POST',
      headers: {Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json; charset=UTF-8'},
      body: JSON.stringify({
        post_info: {
          title: String(description).slice(0, 2200),
          description: String(description).slice(0, 2200),
          privacy_level: selectedPrivacy,
          disable_comment: false,
          auto_add_music: false
        },
        source_info: {source: 'PULL_FROM_URL', photo_images: photoImages, photo_cover_index: 0},
        post_mode: 'DIRECT_POST',
        media_type: 'PHOTO'
      })
    });
    const data = await response.json();
    if (data.error?.code && data.error.code !== 'ok') return res.status(400).json(data);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({error: error.message});
  }
};
