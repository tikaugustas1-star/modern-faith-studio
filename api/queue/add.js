const {getSession} = require('../tiktok/session');
const {accountKey, saveAccount, supabaseRequest} = require('../_lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed.'});
  const session = getSession(req);
  if (!session?.access_token) return res.status(401).json({error: 'Connect TikTok first.'});
  const {batch_label: batchLabel, photo_images: rawImages, description = '', privacy_level: privacyLevel, scheduled_for: scheduledFor} = req.body || {};
  const photoImages = Array.isArray(rawImages) ? rawImages.map(value => String(value).trim()).filter(Boolean) : [];
  const when = new Date(scheduledFor || Date.now());
  if (!batchLabel || photoImages.length < 1 || photoImages.length > 35) return res.status(400).json({error: 'Provide a batch label and 1–35 photo URLs.'});
  if (photoImages.some(url => !/^https:\/\//i.test(url))) return res.status(400).json({error: 'Every photo URL must begin with https://'});
  if (Number.isNaN(when.getTime())) return res.status(400).json({error: 'scheduled_for must be a valid date.'});
  try {
    await saveAccount(session);
    const rows = await supabaseRequest('post_queue', {method: 'POST', headers: {'Prefer': 'return=representation'}, body: JSON.stringify({account_key: accountKey(session), batch_label: String(batchLabel).slice(0, 160), photo_images: photoImages, description: String(description).slice(0, 2200), privacy_level: privacyLevel || null, scheduled_for: when.toISOString(), status: 'queued'})});
    return res.status(201).json({item: rows?.[0] || rows});
  } catch (error) {
    return res.status(503).json({error: error.message});
  }
};
