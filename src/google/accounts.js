const { get, MCC_ID } = require('./client');

async function listChildAccounts() {
  const data = await get(`customers/${MCC_ID}/listAccessibleCustomers`);
  return data.resourceNames || [];
}

async function getCustomer(customerId) {
  const id = customerId.replace(/-/g, '').replace('customers/', '');
  const data = await get(`customers/${id}`);
  return data;
}

module.exports = { listChildAccounts, getCustomer };
