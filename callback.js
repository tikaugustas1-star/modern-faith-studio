const https = require('https');
const {setSession} = require('./session');

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
  if (!process.env.TIKTOK_CLIENT_KEY || !process.env.TIKTOK_CLIENT_SECRET || !process.env.TIKTOK_REDIRECT_URI || !process.env.TIKTOK_SESSION_SECRET) {
    return res.status(500).send('TikTok OAuth is not configured yet.');
  }

  try {
    const token = await postForm('https://open.tiktokapis.com/v2/oauth/token/', {
      client_key: process.env.TIKTOK_CLIENT_KEY.trim(),
      client_secret: process.env.TIKTOK_CLIENT_SECRET.trim(),
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.TIKTOK_REDIRECT_URI.trim()
    });
    if (!token.data || !token.data.access_token) {
      return res.status(400).send(`TikTok token exchange failed: ${JSON.stringify(token.data)}`);
    }
    setSession(res, {
      access_token: token.data.access_token,
      refresh_token: token.data.refresh_token || '',
      expires_at: Date.now() + Number(token.data.expires_in || 86400) * 1000
    });
    const sessionCookie = res.getHeader('Set-Cookie');
    res.setHeader('Set-Cookie', [
      'tiktok_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
      sessionCookie
    ].flat());
    return res.redirect('/?connected=1');
  } catch (error) {
    return res.status(500).send(`TikTok OAuth error: ${error.message}`);
  }
};
