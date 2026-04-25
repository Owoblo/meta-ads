const { get, paginate } = require('./client');

async function getMe() {
  return get('/me', { fields: 'id,name,email' });
}

async function listAdAccounts() {
  return paginate('/me/adaccounts', {
    fields: 'id,name,account_status,currency,timezone_name,amount_spent,balance',
  });
}

async function getAdAccount(accountId) {
  return get(`/${accountId}`, {
    fields: 'id,name,account_status,currency,timezone_name,amount_spent,balance,spend_cap,business',
  });
}

// account_status codes
const ACCOUNT_STATUS = {
  1: 'ACTIVE',
  2: 'DISABLED',
  3: 'UNSETTLED',
  7: 'PENDING_RISK_REVIEW',
  8: 'PENDING_SETTLEMENT',
  9: 'IN_GRACE_PERIOD',
  100: 'PENDING_CLOSURE',
  101: 'CLOSED',
  201: 'ANY_ACTIVE',
  202: 'ANY_CLOSED',
};

function statusLabel(code) {
  return ACCOUNT_STATUS[code] || `UNKNOWN(${code})`;
}

module.exports = { getMe, listAdAccounts, getAdAccount, statusLabel };
