require('dotenv').config();
const axios = require('axios');

const BASE_URL = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v21.0'}`;

const client = axios.create({
  baseURL: BASE_URL,
  params: { access_token: process.env.META_ACCESS_TOKEN },
});

client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.error?.message || err.message;
    const code = err.response?.data?.error?.code;
    const error = new Error(`Meta API error${code ? ` [${code}]` : ''}: ${msg}`);
    error.code = code;
    error.raw = err.response?.data?.error;
    return Promise.reject(error);
  }
);

async function get(path, params = {}) {
  return client.get(path, { params });
}

async function post(path, data = {}) {
  return client.post(path, null, { params: data });
}

async function del(path, params = {}) {
  return client.delete(path, { params });
}

async function paginate(path, params = {}) {
  const results = [];
  let url = path;
  let isFirst = true;
  while (url) {
    const res = isFirst
      ? await get(url, params)
      : await axios.get(url, { params: { access_token: process.env.META_ACCESS_TOKEN } }).then((r) => r.data);
    isFirst = false;
    if (res.data) results.push(...res.data);
    url = res.paging?.next || null;
  }
  return results;
}

module.exports = { get, post, del, paginate };
