require('dotenv').config();
const { GoogleAuth } = require('google-auth-library');
const path = require('path');

const auth = new GoogleAuth({
  keyFile: path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './service-account.json'),
  scopes: ['https://www.googleapis.com/auth/adwords'],
});

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry - 60000) return cachedToken;
  const client = await auth.getClient();
  const result = await client.getAccessToken();
  cachedToken = result.token;
  tokenExpiry = Date.now() + 3600000;
  return cachedToken;
}

module.exports = { getAccessToken };
