const {getAccount, readTokens, saveAccount} = require('./supabase');

async function creatorInfo(accessToken) {
  const response = await fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', {method: 'POST', headers: {Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json'}});
  const data = await response.json();
  if (!response.ok || (data.error?.code && data.error.code !== 'ok')) throw new Error(data.error?.message || 'TikTok creator info request failed.');
  return data.data || data;
}

async function refreshToken(accountKey, account) {
  const tokens = readTokens(account);
  if (!tokens?.refresh_token) throw new Error('TikTok refresh token is missing. Reconnect TikTok.');
  const body = new URLSearchParams({client_key: String(process.env.TIKTOK_CLIENT_KEY || '').trim(), client_secret: String(process.env.TIKTOK_CLIENT_SECRET || '').trim(), grant_type: 'refresh_token', refresh_token: tokens.refresh_token}).toString();
  const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body});
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(data.error_description || 'TikTok token refresh failed.');
  const next = {open_id: accountKey, access_token: data.access_token, refresh_token: data.refresh_token || tokens.refresh_token, expires_at: Date.now() + Number(data.expires_in || 86400) * 1000};
  await saveAccount({open_id: accountKey}, next);
  return next;
}

async function usableTokens(accountKey, account) {
  const tokens = readTokens(account);
  if (!tokens?.access_token) throw new Error('TikTok access token is missing. Reconnect TikTok.');
  if (Number(tokens.expires_at || 0) > Date.now() + 5 * 60 * 1000) return tokens;
  return refreshToken(accountKey, account);
}

async function publishPhotos(accessToken, item) {
  const info = await creatorInfo(accessToken);
  const options = info.privacy_level_options || [];
  const privacy = item.privacy_level || options[0];
  if (!privacy || !options.includes(privacy)) throw new Error('The queued privacy setting is not available for this TikTok account.');
  const response = await fetch('https://open.tiktokapis.com/v2/post/publish/content/init/', {method: 'POST', headers: {Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=UTF-8'}, body: JSON.stringify({post_info: {title: String(item.description || '').slice(0, 90), description: String(item.description || '').slice(0, 2200), privacy_level: privacy, disable_comment: false, auto_add_music: false}, source_info: {source: 'PULL_FROM_URL', photo_images: item.photo_images, photo_cover_index: 0}, post_mode: 'DIRECT_POST', media_type: 'PHOTO'})});
  const data = await response.json();
  if (!response.ok || (data.error?.code && data.error.code !== 'ok')) throw new Error(data.error?.message || 'TikTok rejected the queued post.');
  return data.data || data;
}

module.exports = {creatorInfo, usableTokens, publishPhotos, getAccount};
