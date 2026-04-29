require('dotenv').config();
const { search, MCC_ID } = require('./client');
const { getAccessToken } = require('./auth');
const axios = require('axios');

const BASE_URL = 'https://googleads.googleapis.com/v20';
const DEVELOPER_TOKEN = process.env.GOOGLE_DEVELOPER_TOKEN;

async function listAccessibleAccounts() {
  const token = await getAccessToken();
  const res = await axios.get(`${BASE_URL}/customers:listAccessibleCustomers`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'developer-token': DEVELOPER_TOKEN,
    },
  });
  return res.data.resourceNames || [];
}

async function getAccountDetails(customerId, loginId = MCC_ID) {
  const token = await getAccessToken();
  const id = customerId.replace(/-/g, '').replace('customers/', '');
  const loginCustomerId = (loginId || '').replace(/-/g, '');
  const res = await axios.get(`${BASE_URL}/customers/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'developer-token': DEVELOPER_TOKEN,
      'login-customer-id': loginCustomerId,
    },
  });
  return res.data;
}

async function getCampaigns(customerId, loginId = MCC_ID) {
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign.bidding_strategy_type,
      campaign_budget.amount_micros,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc
    FROM campaign
    WHERE segments.date DURING LAST_30_DAYS
    ORDER BY metrics.cost_micros DESC
  `;
  return search(customerId, query, loginId);
}

async function getAdGroups(customerId, loginId = MCC_ID) {
  const query = `
    SELECT
      ad_group.id,
      ad_group.name,
      ad_group.status,
      campaign.name,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.conversions
    FROM ad_group
    WHERE segments.date DURING LAST_30_DAYS
    ORDER BY metrics.cost_micros DESC
    LIMIT 50
  `;
  return search(customerId, query, loginId);
}

async function getKeywords(customerId, loginId = MCC_ID) {
  const query = `
    SELECT
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.status,
      ad_group.name,
      campaign.name,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.average_cpc,
      metrics.ctr
    FROM keyword_view
    WHERE segments.date DURING LAST_30_DAYS
      AND ad_group_criterion.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 50
  `;
  return search(customerId, query, loginId);
}

async function runFullAudit() {
  console.log('=== GOOGLE ADS ACCOUNT AUDIT ===\n');

  // Step 1: list accessible accounts
  console.log('Fetching accessible accounts...');
  let resourceNames;
  try {
    resourceNames = await listAccessibleAccounts();
  } catch (err) {
    handleError('listAccessibleAccounts', err);
    return;
  }

  console.log(`\nFound ${resourceNames.length} accessible account(s):\n`);

  for (const rn of resourceNames) {
    const id = rn.replace('customers/', '');
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Account: ${rn}`);

    // Get account details
    let details;
    try {
      details = await getAccountDetails(id);
      const desc = details.descriptiveName || '(no name)';
      const currency = details.currencyCode || '?';
      const tz = details.timeZone || '?';
      const isMgr = details.manager ? 'MANAGER' : 'CLIENT';
      console.log(`  Name:     ${desc}`);
      console.log(`  Type:     ${isMgr}`);
      console.log(`  Currency: ${currency}`);
      console.log(`  Timezone: ${tz}`);
    } catch (err) {
      console.log(`  [Could not fetch details: ${err.message}]`);
      continue;
    }

    if (details.manager) {
      console.log('  (Skipping campaign data for manager account)');
      continue;
    }

    // Get campaigns
    let campaigns;
    try {
      campaigns = await getCampaigns(id);
    } catch (err) {
      console.log(`  [Could not fetch campaigns: ${err.message}]`);
      continue;
    }

    if (!campaigns.length) {
      console.log('  Campaigns: None');
      continue;
    }

    console.log(`\n  Campaigns (last 30 days):`);
    console.log(`  ${'─'.repeat(55)}`);
    for (const row of campaigns) {
      const c = row.campaign;
      const b = row.campaignBudget;
      const m = row.metrics;
      const budget = b?.amountMicros ? `CA$${(Number(b.amountMicros) / 1e6).toFixed(2)}/day` : '—';
      const cost = m?.costMicros ? `CA$${(Number(m.costMicros) / 1e6).toFixed(2)}` : 'CA$0.00';
      const clicks = m?.clicks || 0;
      const impr = m?.impressions || 0;
      const conv = m?.conversions ? Number(m.conversions).toFixed(0) : '0';
      const ctr = m?.ctr ? `${(Number(m.ctr) * 100).toFixed(2)}%` : '0%';

      console.log(`\n  [${c.status}] ${c.name}`);
      console.log(`    Type:        ${c.advertisingChannelType}`);
      console.log(`    Bidding:     ${c.biddingStrategyType}`);
      console.log(`    Budget:      ${budget}`);
      console.log(`    Spend:       ${cost}`);
      console.log(`    Clicks:      ${clicks}  |  Impressions: ${impr}  |  CTR: ${ctr}  |  Conv: ${conv}`);

      // Flag issues
      const issues = [];
      if (c.status === 'PAUSED') issues.push('⚠ Campaign is PAUSED');
      if (Number(clicks) === 0 && Number(impr) > 0) issues.push('⚠ Impressions but zero clicks — check ad relevance');
      if (Number(impr) === 0) issues.push('⚠ Zero impressions — check budget, targeting, or approval status');
      if (issues.length) {
        for (const issue of issues) console.log(`    ${issue}`);
      }
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('Audit complete.');
}

function handleError(context, err) {
  const data = err.response?.data;
  const msg = data ? JSON.stringify(data, null, 2) : err.message;
  console.error(`\n[ERROR in ${context}]`);
  console.error(msg);

  if (err.response?.status === 403 || err.response?.status === 401) {
    console.error('\n ACTION NEEDED: The service account does not have access to Google Ads.');
    console.error('  Fix: In Google Ads → Admin → Access and Security → add this email as a user:');
    console.error('  saturn-star-gsc@sold2move.iam.gserviceaccount.com');
  }
}

module.exports = { runFullAudit, listAccessibleAccounts, getCampaigns, getKeywords, getAdGroups };
