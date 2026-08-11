const crypto = require('crypto');
const {encrypt, decrypt} = require('../tiktok/session');

function requireConfig() {
  const url = String(process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '').trim();
  if (!url || !key) throw new Error('Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.');
  return {url, key};
}

async function supabaseRequest(path, options = {}) {
  const {url, key} = requireConfig();
  const headers = {'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', ...(options.headers || {})};
  const response = await fetch(`${url}/rest/v1/${path}`, {...options, headers});
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = {message: text}; }
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${data?.message || data?.error || text || 'request failed'}`);
  return data;
}

function accountKey(session) {
  if (session?.open_id) return String(session.open_id);
  return crypto.createHash('sha256').update(String(session?.access_token || '')).digest('hex').slice(0, 40);
}

async function saveAccount(session, tokenPayload = session) {
  const payload = {
    access_token: tokenPayload.access_token,
    refresh_token: tokenPayload.refresh_token || '',
    expires_at: Number(tokenPayload.expires_at || 0)
  };
  return supabaseRequest('tiktok_accounts?on_conflict=account_key', {
    method: 'POST',
    headers: {'Prefer': 'resolution=merge-duplicates,return=representation'},
    body: JSON.stringify({account_key: accountKey(session), token_ciphertext: encrypt(payload), updated_at: new Date().toISOString()})
  });
}

async function getAccount(key) {
  const rows = await supabaseRequest(`tiktok_accounts?account_key=eq.${encodeURIComponent(key)}&select=*`);
  return rows?.[0] || null;
}

function readTokens(account) {
  if (!account?.token_ciphertext) return null;
  return decrypt(account.token_ciphertext);
}

module.exports = {supabaseRequest, accountKey, saveAccount, getAccount, readTokens};
