const crypto = require('crypto');

const COOKIE_NAME = 'tiktok_session';
const MAX_AGE = 60 * 60 * 24 * 30;

function keyFromSecret() {
  const secret = String(process.env.TIKTOK_SESSION_SECRET || '').trim();
  if (secret.length < 32) throw new Error('TIKTOK_SESSION_SECRET must be at least 32 characters.');
  return crypto.createHash('sha256').update(secret).digest();
}

function encode(value) {
  return value.toString('base64url');
}

function decode(value) {
  return Buffer.from(value, 'base64url');
}

function encrypt(payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyFromSecret(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return [encode(iv), encode(cipher.getAuthTag()), encode(encrypted)].join('.');
}

function decrypt(value) {
  const [ivValue, tagValue, encryptedValue] = String(value).split('.');
  if (!ivValue || !tagValue || !encryptedValue) return null;
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyFromSecret(), decode(ivValue));
  decipher.setAuthTag(decode(tagValue));
  const decrypted = Buffer.concat([decipher.update(decode(encryptedValue)), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

function getSession(req) {
  const cookies = String(req.headers.cookie || '');
  const match = cookies.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  try { return decrypt(decodeURIComponent(match[1])); }
  catch { return null; }
}

function setSession(res, payload) {
  const value = encodeURIComponent(encrypt(payload));
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`);
}

module.exports = { getSession, setSession, encrypt, decrypt };
