const { get, post, del, paginate } = require('./client');

const CAMPAIGN_FIELDS =
  'id,name,status,objective,buying_type,daily_budget,lifetime_budget,budget_remaining,start_time,stop_time,created_time,updated_time,spend_cap';

async function listCampaigns(accountId, { status } = {}) {
  const params = { fields: CAMPAIGN_FIELDS };
  if (status) params.effective_status = JSON.stringify([status]);
  return paginate(`/${accountId}/campaigns`, params);
}

async function getCampaign(campaignId) {
  return get(`/${campaignId}`, { fields: CAMPAIGN_FIELDS });
}

async function createCampaign(accountId, { name, objective, status = 'PAUSED', dailyBudget, lifetimeBudget, spendCap, buyingType = 'AUCTION' }) {
  const params = { name, objective, status, buying_type: buyingType };
  if (dailyBudget) params.daily_budget = dailyBudget;
  if (lifetimeBudget) params.lifetime_budget = lifetimeBudget;
  if (spendCap) params.spend_cap = spendCap;
  return post(`/${accountId}/campaigns`, params);
}

async function updateCampaign(campaignId, updates) {
  const allowed = ['name', 'status', 'daily_budget', 'lifetime_budget', 'spend_cap', 'stop_time'];
  const params = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) params[key] = updates[key];
  }
  return post(`/${campaignId}`, params);
}

async function deleteCampaign(campaignId) {
  return del(`/${campaignId}`);
}

// Valid objectives for reference
const OBJECTIVES = [
  'APP_INSTALLS',
  'BRAND_AWARENESS',
  'CONVERSIONS',
  'EVENT_RESPONSES',
  'LEAD_GENERATION',
  'LINK_CLICKS',
  'LOCAL_AWARENESS',
  'MESSAGES',
  'OFFER_CLAIMS',
  'OUTCOME_APP_PROMOTION',
  'OUTCOME_AWARENESS',
  'OUTCOME_ENGAGEMENT',
  'OUTCOME_LEADS',
  'OUTCOME_SALES',
  'OUTCOME_TRAFFIC',
  'PAGE_LIKES',
  'POST_ENGAGEMENT',
  'PRODUCT_CATALOG_SALES',
  'REACH',
  'STORE_VISITS',
  'VIDEO_VIEWS',
];

module.exports = { listCampaigns, getCampaign, createCampaign, updateCampaign, deleteCampaign, OBJECTIVES };
