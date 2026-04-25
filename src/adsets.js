const { get, post, del, paginate } = require('./client');

const ADSET_FIELDS =
  'id,name,status,campaign_id,daily_budget,lifetime_budget,budget_remaining,start_time,end_time,targeting,billing_event,optimization_goal,bid_amount,bid_strategy,created_time,updated_time';

async function listAdSets(accountId, { campaignId, status } = {}) {
  const params = { fields: ADSET_FIELDS };
  if (status) params.effective_status = JSON.stringify([status]);
  if (campaignId) params.campaign_id = campaignId;
  return paginate(`/${accountId}/adsets`, params);
}

async function getAdSet(adsetId) {
  return get(`/${adsetId}`, { fields: ADSET_FIELDS });
}

async function createAdSet(accountId, {
  name,
  campaignId,
  dailyBudget,
  lifetimeBudget,
  startTime,
  endTime,
  billingEvent = 'IMPRESSIONS',
  optimizationGoal,
  bidAmount,
  bidStrategy = 'LOWEST_COST_WITHOUT_CAP',
  targeting,
  status = 'PAUSED',
}) {
  const params = {
    name,
    campaign_id: campaignId,
    billing_event: billingEvent,
    optimization_goal: optimizationGoal,
    bid_strategy: bidStrategy,
    targeting: JSON.stringify(targeting),
    status,
  };
  if (dailyBudget) params.daily_budget = dailyBudget;
  if (lifetimeBudget) params.lifetime_budget = lifetimeBudget;
  if (startTime) params.start_time = startTime;
  if (endTime) params.end_time = endTime;
  if (bidAmount) params.bid_amount = bidAmount;
  return post(`/${accountId}/adsets`, params);
}

async function updateAdSet(adsetId, updates) {
  const allowed = ['name', 'status', 'daily_budget', 'lifetime_budget', 'bid_amount', 'end_time', 'targeting'];
  const params = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      params[key] = key === 'targeting' ? JSON.stringify(updates[key]) : updates[key];
    }
  }
  return post(`/${adsetId}`, params);
}

async function deleteAdSet(adsetId) {
  return del(`/${adsetId}`);
}

module.exports = { listAdSets, getAdSet, createAdSet, updateAdSet, deleteAdSet };
