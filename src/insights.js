const { get, post, paginate } = require('./client');

const DEFAULT_FIELDS = [
  'impressions',
  'reach',
  'clicks',
  'spend',
  'cpm',
  'cpc',
  'ctr',
  'frequency',
  'actions',
  'action_values',
  'cost_per_action_type',
  'video_p25_watched_actions',
  'video_p50_watched_actions',
  'video_p75_watched_actions',
  'video_p100_watched_actions',
];

async function getInsights(objectId, {
  fields = DEFAULT_FIELDS,
  datePreset,
  since,
  until,
  breakdown,
  level = 'ad',
  limit = 500,
} = {}) {
  const params = {
    fields: fields.join(','),
    level,
    limit,
  };
  if (datePreset) params.date_preset = datePreset;
  if (since && until) params.time_range = JSON.stringify({ since, until });
  if (breakdown) params.breakdowns = breakdown;
  return paginate(`/${objectId}/insights`, params);
}

async function getInsightsAsync(objectId, {
  fields = DEFAULT_FIELDS,
  datePreset = 'last_30d',
  since,
  until,
  breakdown,
  level = 'ad',
} = {}) {
  const params = {
    fields: fields.join(','),
    level,
  };
  if (datePreset) params.date_preset = datePreset;
  if (since && until) params.time_range = JSON.stringify({ since, until });
  if (breakdown) params.breakdowns = breakdown;

  const job = await post(`/${objectId}/insights`, params);
  return pollAsyncJob(job.report_run_id);
}

async function pollAsyncJob(reportRunId, maxWaitMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const status = await get(`/${reportRunId}`, {});
    if (status.async_status === 'Job Completed') {
      return paginate(`/${reportRunId}/insights`);
    }
    if (status.async_status === 'Job Failed') {
      throw new Error(`Insights job failed: ${status.async_error_message}`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error('Insights async job timed out');
}

const DATE_PRESETS = [
  'today',
  'yesterday',
  'this_week_mon_today',
  'this_week_sun_today',
  'last_week_mon_sun',
  'last_week_sun_sat',
  'last_3d',
  'last_7d',
  'last_14d',
  'last_28d',
  'last_30d',
  'last_90d',
  'this_month',
  'last_month',
  'this_quarter',
  'maximum',
  'data_maximum',
  'last_3_months',
  'last_year',
  'this_year',
];

const BREAKDOWNS = [
  'age',
  'gender',
  'country',
  'region',
  'impression_device',
  'publisher_platform',
  'platform_position',
  'device_platform',
];

module.exports = { getInsights, getInsightsAsync, DATE_PRESETS, BREAKDOWNS, DEFAULT_FIELDS };
