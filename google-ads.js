#!/usr/bin/env node
require('dotenv').config();
const { Command } = require('commander');
const { runFullAudit, listAccessibleAccounts, getCampaigns, getKeywords, getAdGroups } = require('./src/google/audit');

const program = new Command();

program
  .name('google-ads')
  .description('Google Ads Manager CLI')
  .version('1.0.0');

program
  .command('audit')
  .description('Run a full audit across all linked Google Ads accounts')
  .action(async () => {
    await runFullAudit().catch((err) => {
      console.error('Fatal:', err.message);
      process.exit(1);
    });
  });

program
  .command('accounts')
  .description('List all accessible Google Ads accounts')
  .action(async () => {
    try {
      const accounts = await listAccessibleAccounts();
      console.log('Accessible accounts:');
      accounts.forEach((a) => console.log(' ', a));
    } catch (err) {
      console.error('Error:', err.response?.data ? JSON.stringify(err.response.data, null, 2) : err.message);
    }
  });

program
  .command('campaigns <customerId>')
  .description('List campaigns for a specific account (last 30 days)')
  .action(async (customerId) => {
    try {
      const rows = await getCampaigns(customerId);
      if (!rows.length) { console.log('No campaigns found.'); return; }
      for (const row of rows) {
        const c = row.campaign;
        const m = row.metrics;
        const cost = m?.costMicros ? `CA$${(Number(m.costMicros) / 1e6).toFixed(2)}` : 'CA$0';
        console.log(`[${c.status}] ${c.name} | Spend: ${cost} | Clicks: ${m?.clicks || 0} | Impr: ${m?.impressions || 0}`);
      }
    } catch (err) {
      console.error('Error:', err.response?.data ? JSON.stringify(err.response.data, null, 2) : err.message);
    }
  });

program
  .command('keywords <customerId>')
  .description('List top keywords for a specific account (last 30 days)')
  .action(async (customerId) => {
    try {
      const rows = await getKeywords(customerId);
      if (!rows.length) { console.log('No keywords found.'); return; }
      for (const row of rows) {
        const kw = row.adGroupCriterion?.keyword;
        const m = row.metrics;
        const cost = m?.costMicros ? `CA$${(Number(m.costMicros) / 1e6).toFixed(2)}` : 'CA$0';
        const cpc = m?.averageCpc ? `CA$${(Number(m.averageCpc) / 1e6).toFixed(2)}` : '—';
        console.log(`[${kw?.matchType}] "${kw?.text}" | Clicks: ${m?.clicks || 0} | Spend: ${cost} | Avg CPC: ${cpc}`);
      }
    } catch (err) {
      console.error('Error:', err.response?.data ? JSON.stringify(err.response.data, null, 2) : err.message);
    }
  });

program.parseAsync(process.argv).catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
