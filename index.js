#!/usr/bin/env node
require('dotenv').config();
const { Command } = require('commander');
const { table } = require('table');
const accounts = require('./src/accounts');
const campaigns = require('./src/campaigns');
const adsets = require('./src/adsets');
const ads = require('./src/ads');
const insights = require('./src/insights');

const program = new Command();

program
  .name('meta-ads')
  .description('Meta Ads Manager CLI')
  .version('1.0.0');

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

function dollars(cents) {
  if (cents == null) return '—';
  return `$${(Number(cents) / 100).toFixed(2)}`;
}

function printTable(rows, headers) {
  if (!rows.length) {
    console.log('No results.');
    return;
  }
  console.log(table([headers, ...rows]));
}

function resolveAccount(opts) {
  const id = opts.account || process.env.META_AD_ACCOUNT_ID;
  if (!id) {
    console.error('Error: --account <act_ID> required (or set META_AD_ACCOUNT_ID in .env)');
    process.exit(1);
  }
  return id.startsWith('act_') ? id : `act_${id}`;
}

// ─── me ─────────────────────────────────────────────────────────────────────

program
  .command('me')
  .description('Show the authenticated user')
  .action(async () => {
    const me = await accounts.getMe().catch(die);
    printTable([[me.id, me.name, me.email || '—']], ['ID', 'Name', 'Email']);
  });

// ─── accounts ───────────────────────────────────────────────────────────────

program
  .command('accounts')
  .description('List all ad accounts')
  .action(async () => {
    const list = await accounts.listAdAccounts().catch(die);
    const rows = list.map((a) => [
      a.id,
      a.name,
      accounts.statusLabel(a.account_status),
      a.currency,
      a.timezone_name,
      dollars(a.amount_spent),
      dollars(a.balance),
    ]);
    printTable(rows, ['ID', 'Name', 'Status', 'Currency', 'Timezone', 'Spent', 'Balance']);
  });

// ─── campaigns ──────────────────────────────────────────────────────────────

const campaignsCmd = program.command('campaigns').description('Manage campaigns');

campaignsCmd
  .command('list')
  .description('List campaigns for an ad account')
  .requiredOption('-a, --account <act_ID>', 'Ad account ID', process.env.META_AD_ACCOUNT_ID)
  .option('-s, --status <STATUS>', 'Filter by status (ACTIVE|PAUSED|ARCHIVED)')
  .action(async (opts) => {
    const accountId = resolveAccount(opts);
    const list = await campaigns.listCampaigns(accountId, { status: opts.status }).catch(die);
    const rows = list.map((c) => [
      c.id,
      c.name,
      c.status,
      c.objective,
      c.buying_type,
      dollars(c.daily_budget),
      dollars(c.lifetime_budget),
      dollars(c.budget_remaining),
    ]);
    printTable(rows, ['ID', 'Name', 'Status', 'Objective', 'Buying', 'Daily Bgt', 'Lifetime Bgt', 'Remaining']);
  });

campaignsCmd
  .command('get <campaignId>')
  .description('Get a single campaign')
  .action(async (campaignId) => {
    const c = await campaigns.getCampaign(campaignId).catch(die);
    fmt(c);
  });

campaignsCmd
  .command('create')
  .description('Create a new campaign')
  .requiredOption('-a, --account <act_ID>', 'Ad account ID', process.env.META_AD_ACCOUNT_ID)
  .requiredOption('-n, --name <name>', 'Campaign name')
  .requiredOption('-o, --objective <objective>', `Objective (${campaigns.OBJECTIVES.join('|')})`)
  .option('-s, --status <STATUS>', 'Initial status', 'PAUSED')
  .option('--daily-budget <cents>', 'Daily budget in cents (e.g. 1000 = $10)')
  .option('--lifetime-budget <cents>', 'Lifetime budget in cents')
  .option('--spend-cap <cents>', 'Spend cap in cents')
  .option('--buying-type <type>', 'Buying type', 'AUCTION')
  .action(async (opts) => {
    const accountId = resolveAccount(opts);
    const result = await campaigns.createCampaign(accountId, {
      name: opts.name,
      objective: opts.objective,
      status: opts.status,
      dailyBudget: opts.dailyBudget,
      lifetimeBudget: opts.lifetimeBudget,
      spendCap: opts.spendCap,
      buyingType: opts.buyingType,
    }).catch(die);
    console.log(`Created campaign: ${result.id}`);
  });

campaignsCmd
  .command('pause <campaignId>')
  .description('Pause a campaign')
  .action(async (campaignId) => {
    await campaigns.updateCampaign(campaignId, { status: 'PAUSED' }).catch(die);
    console.log(`Paused campaign ${campaignId}`);
  });

campaignsCmd
  .command('activate <campaignId>')
  .description('Activate a campaign')
  .action(async (campaignId) => {
    await campaigns.updateCampaign(campaignId, { status: 'ACTIVE' }).catch(die);
    console.log(`Activated campaign ${campaignId}`);
  });

campaignsCmd
  .command('delete <campaignId>')
  .description('Delete a campaign')
  .action(async (campaignId) => {
    await campaigns.deleteCampaign(campaignId).catch(die);
    console.log(`Deleted campaign ${campaignId}`);
  });

// ─── adsets ─────────────────────────────────────────────────────────────────

const adsetsCmd = program.command('adsets').description('Manage ad sets');

adsetsCmd
  .command('list')
  .description('List ad sets')
  .requiredOption('-a, --account <act_ID>', 'Ad account ID', process.env.META_AD_ACCOUNT_ID)
  .option('-c, --campaign <campaignId>', 'Filter by campaign ID')
  .option('-s, --status <STATUS>', 'Filter by status')
  .action(async (opts) => {
    const accountId = resolveAccount(opts);
    const list = await adsets.listAdSets(accountId, { campaignId: opts.campaign, status: opts.status }).catch(die);
    const rows = list.map((s) => [
      s.id,
      s.name,
      s.status,
      s.campaign_id,
      s.optimization_goal,
      s.billing_event,
      dollars(s.daily_budget),
      dollars(s.lifetime_budget),
    ]);
    printTable(rows, ['ID', 'Name', 'Status', 'Campaign', 'Opt. Goal', 'Billing', 'Daily Bgt', 'Lifetime Bgt']);
  });

adsetsCmd
  .command('get <adsetId>')
  .description('Get a single ad set')
  .action(async (adsetId) => {
    const s = await adsets.getAdSet(adsetId).catch(die);
    fmt(s);
  });

adsetsCmd
  .command('pause <adsetId>')
  .description('Pause an ad set')
  .action(async (adsetId) => {
    await adsets.updateAdSet(adsetId, { status: 'PAUSED' }).catch(die);
    console.log(`Paused ad set ${adsetId}`);
  });

adsetsCmd
  .command('activate <adsetId>')
  .description('Activate an ad set')
  .action(async (adsetId) => {
    await adsets.updateAdSet(adsetId, { status: 'ACTIVE' }).catch(die);
    console.log(`Activated ad set ${adsetId}`);
  });

// ─── ads ────────────────────────────────────────────────────────────────────

const adsCmd = program.command('ads').description('Manage ads');

adsCmd
  .command('list')
  .description('List ads')
  .requiredOption('-a, --account <act_ID>', 'Ad account ID', process.env.META_AD_ACCOUNT_ID)
  .option('-s, --adset <adsetId>', 'Filter by ad set ID')
  .option('-c, --campaign <campaignId>', 'Filter by campaign ID')
  .option('--status <STATUS>', 'Filter by status')
  .action(async (opts) => {
    const accountId = resolveAccount(opts);
    const list = await ads.listAds(accountId, {
      adsetId: opts.adset,
      campaignId: opts.campaign,
      status: opts.status,
    }).catch(die);
    const rows = list.map((ad) => [
      ad.id,
      ad.name,
      ad.effective_status || ad.status,
      ad.adset_id,
      ad.campaign_id,
    ]);
    printTable(rows, ['ID', 'Name', 'Status', 'Ad Set', 'Campaign']);
  });

adsCmd
  .command('get <adId>')
  .description('Get a single ad')
  .action(async (adId) => {
    const ad = await ads.getAd(adId).catch(die);
    fmt(ad);
  });

adsCmd
  .command('pause <adId>')
  .description('Pause an ad')
  .action(async (adId) => {
    await ads.updateAd(adId, { status: 'PAUSED' }).catch(die);
    console.log(`Paused ad ${adId}`);
  });

adsCmd
  .command('activate <adId>')
  .description('Activate an ad')
  .action(async (adId) => {
    await ads.updateAd(adId, { status: 'ACTIVE' }).catch(die);
    console.log(`Activated ad ${adId}`);
  });

adsCmd
  .command('creatives')
  .description('List ad creatives')
  .requiredOption('-a, --account <act_ID>', 'Ad account ID', process.env.META_AD_ACCOUNT_ID)
  .action(async (opts) => {
    const accountId = resolveAccount(opts);
    const list = await ads.listCreatives(accountId).catch(die);
    const rows = list.map((c) => [c.id, c.name, c.title || '—', c.call_to_action_type || '—']);
    printTable(rows, ['ID', 'Name', 'Title', 'CTA']);
  });

// ─── insights ───────────────────────────────────────────────────────────────

const insightsCmd = program.command('insights').description('Pull performance insights');

insightsCmd
  .command('get <objectId>')
  .description('Get insights for an account, campaign, ad set, or ad')
  .option('-p, --preset <preset>', `Date preset (${insights.DATE_PRESETS.join('|')})`, 'last_30d')
  .option('--since <YYYY-MM-DD>', 'Start date (overrides preset)')
  .option('--until <YYYY-MM-DD>', 'End date (overrides preset)')
  .option('-l, --level <level>', 'Level: account|campaign|adset|ad', 'ad')
  .option('-b, --breakdown <breakdown>', `Breakdown (${insights.BREAKDOWNS.join('|')})`)
  .option('--fields <fields>', 'Comma-separated fields')
  .action(async (objectId, opts) => {
    const fields = opts.fields ? opts.fields.split(',') : undefined;
    const data = await insights.getInsights(objectId, {
      fields,
      datePreset: opts.since ? undefined : opts.preset,
      since: opts.since,
      until: opts.until,
      level: opts.level,
      breakdown: opts.breakdown,
    }).catch(die);
    if (!data.length) {
      console.log('No insight data for the selected period.');
      return;
    }
    // Build table from first row keys
    const keys = Object.keys(data[0]).filter((k) => k !== 'actions' && k !== 'action_values' && k !== 'cost_per_action_type');
    const rows = data.map((row) => keys.map((k) => {
      if (k === 'spend') return `$${Number(row[k] || 0).toFixed(2)}`;
      if (k === 'cpm' || k === 'cpc') return row[k] ? `$${Number(row[k]).toFixed(3)}` : '—';
      if (k === 'ctr') return row[k] ? `${Number(row[k]).toFixed(2)}%` : '—';
      return row[k] ?? '—';
    }));
    printTable(rows, keys);

    // Print actions separately if present
    const withActions = data.filter((r) => r.actions?.length);
    if (withActions.length) {
      console.log('\nActions:');
      const actionRows = [];
      for (const row of withActions) {
        for (const a of row.actions) {
          actionRows.push([row.campaign_name || row.adset_name || row.ad_name || row.account_id || '—', a.action_type, a.value]);
        }
      }
      printTable(actionRows, ['Name', 'Action Type', 'Value']);
    }
  });

// ─── error handler ──────────────────────────────────────────────────────────

function die(err) {
  console.error(`\nError: ${err.message}`);
  if (err.raw) console.error('Details:', JSON.stringify(err.raw, null, 2));
  process.exit(1);
}

program.parseAsync(process.argv).catch(die);
