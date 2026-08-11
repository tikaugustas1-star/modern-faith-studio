const crypto = require('crypto');

module.exports = (req, res) => {
  if (!process.env.TIKTOK_CLIENT_KEY || !process.env.TIKTOK_REDIRECT_URI) {
    return res.status(500).send('TikTok OAuth is not configured yet.');
  }

  const state = crypto.randomBytes(24).toString('hex');
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY.trim(),
    response_type: 'code',
    scope: 'user.info.basic,video.publish',
    redirect_uri: process.env.TIKTOK_REDIRECT_URI.trim(),
    state
  });

  res.setHeader('Set-Cookie', `tiktok_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  res.redirect(`https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`);
};
