const { get, post, del, paginate } = require('./client');

const AD_FIELDS =
  'id,name,status,adset_id,campaign_id,creative,tracking_specs,created_time,updated_time,effective_status,bid_amount';

async function listAds(accountId, { adsetId, campaignId, status } = {}) {
  const params = { fields: AD_FIELDS };
  if (status) params.effective_status = JSON.stringify([status]);
  if (adsetId) params.adset_id = adsetId;
  if (campaignId) params.campaign_id = campaignId;
  return paginate(`/${accountId}/ads`, params);
}

async function getAd(adId) {
  return get(`/${adId}`, { fields: AD_FIELDS });
}

async function createAd(accountId, { name, adsetId, creativeId, status = 'PAUSED', trackingSpecs }) {
  const params = {
    name,
    adset_id: adsetId,
    creative: JSON.stringify({ creative_id: creativeId }),
    status,
  };
  if (trackingSpecs) params.tracking_specs = JSON.stringify(trackingSpecs);
  return post(`/${accountId}/ads`, params);
}

async function updateAd(adId, updates) {
  const allowed = ['name', 'status', 'bid_amount'];
  const params = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) params[key] = updates[key];
  }
  return post(`/${adId}`, params);
}

async function deleteAd(adId) {
  return del(`/${adId}`);
}

// Ad Creatives
async function listCreatives(accountId) {
  return paginate(`/${accountId}/adcreatives`, {
    fields: 'id,name,title,body,image_url,thumbnail_url,object_story_spec,call_to_action_type',
  });
}

async function createCreative(accountId, { name, pageId, message, link, imageHash, imageUrl, callToAction, videoId }) {
  const storySpec = { page_id: pageId };
  if (videoId) {
    storySpec.video_data = {
      video_id: videoId,
      message,
      call_to_action: callToAction ? { type: callToAction, value: { link } } : undefined,
    };
  } else {
    storySpec.link_data = {
      message,
      link,
      call_to_action: callToAction ? { type: callToAction, value: { link } } : undefined,
    };
    if (imageHash) storySpec.link_data.image_hash = imageHash;
    if (imageUrl) storySpec.link_data.picture = imageUrl;
  }
  return post(`/${accountId}/adcreatives`, {
    name,
    object_story_spec: JSON.stringify(storySpec),
  });
}

async function uploadImage(accountId, { url, filename }) {
  const params = { filename };
  if (url) params.url = url;
  return post(`/${accountId}/adimages`, params);
}

module.exports = { listAds, getAd, createAd, updateAd, deleteAd, listCreatives, createCreative, uploadImage };
