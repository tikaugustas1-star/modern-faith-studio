const https = require('https');

function postForm(url, data) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(data).toString();
    const target = new URL(url);
    const request = https.request({
      hostname: target.hostname,
      path: target.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    }, response => {
      let text = '';
      response.on('data', chunk => { text += chunk; });
      response.on('end', () => {
        try { resolve({status: response.statusCode, data: JSON.parse(text)}); }
        catch { reject(new Error('TikTok returned an invalid response.')); }
      });
    });
    request.on('error', reject);
    request.write(body);
    request.end();
  });
}

module.exports = async (req, res) => {
  const {code, state, error, error_description: errorDescription} = req.query || {};
  if (error) return res.status(400).send(`TikTok authorization failed: ${errorDescription || error}`);

  const cookies = String(req.headers.cookie || '');
  const stateCookie = cookies.match(/(?:^|; )tiktok_oauth_state=([^;]+)/)?.[1];
  if (!code || !state || !stateCookie || state !== stateCookie) {
    return res.status(400).send('Invalid or expired TikTok OAuth state.');
  }
  if (!process.env.TIKTOK_CLIENT_KEY || !process.env.TIKTOK_CLIENT_SECRET || !process.env.TIKTOK_REDIRECT_URI) {
    return res.status(500).send('TikTok OAuth is not configured yet.');
  }

  try {
    const token = await postForm('https://open.tiktokapis.com/v2/oauth/token/', {
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.TIKTOK_REDIRECT_URI
    });
    if (!token.data || !token.data.access_token) {
      return res.status(400).send(`TikTok token exchange failed: ${JSON.stringify(token.data)}`);
    }
    res.setHeader('Set-Cookie', 'tiktok_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    return res.status(200).send('<!doctype html><meta charset="utf-8"><title>TikTok connected</title><style>body{font-family:Arial;max-width:640px;margin:80px auto;padding:24px;color:#10213f}h1{font-size:42px}</style><h1>TikTok connected.</h1><p>OAuth authorization completed successfully. The next step is adding the publishing review flow.</p>');
  } catch (error) {
    return res.status(500).send(`TikTok OAuth error: ${error.message}`);
  }
};
