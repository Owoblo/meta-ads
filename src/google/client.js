require('dotenv').config();
const axios = require('axios');
const { getAccessToken } = require('./auth');

const BASE_URL = 'https://googleads.googleapis.com/v20';
const DEVELOPER_TOKEN = process.env.GOOGLE_DEVELOPER_TOKEN;
const MCC_ID = (process.env.GOOGLE_MCC_ID || '').replace(/-/g, '');

async function headers(loginCustomerId = MCC_ID) {
  const token = await getAccessToken();
  return {
    Authorization: `Bearer ${token}`,
    'developer-token': DEVELOPER_TOKEN,
    'login-customer-id': loginCustomerId,
    'Content-Type': 'application/json',
  };
}

async function search(customerId, query, loginCustomerId = MCC_ID) {
  const h = await headers(loginCustomerId);
  const id = customerId.replace(/-/g, '');
  const res = await axios.post(
    `${BASE_URL}/customers/${id}/googleAds:search`,
    { query },
    { headers: h }
  );
  return res.data.results || [];
}

async function get(path, loginCustomerId = MCC_ID) {
  const h = await headers(loginCustomerId);
  const res = await axios.get(`${BASE_URL}/${path}`, { headers: h });
  return res.data;
}

module.exports = { search, get, MCC_ID };
