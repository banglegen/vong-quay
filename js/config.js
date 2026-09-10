const SUPABASE_URL = "https://yoalbkrfqwbbhqyeywns.supabase.co/rest/v1/";
const SUPABASE_KEY = "sb_publishable_O5QTQnlLlPoVHAe46-kRlg_ST8itddP";

const REST = SUPABASE_URL.replace(/\/+$/, "") + "/rest/v1";

function apiHeaders(extra) {
  return Object.assign({
    apikey: SUPABASE_KEY,
    Authorization: "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json"
  }, extra || {});
}

async function rest(path, options) {
  requireConfig();
  var r = await fetch(REST + path, Object.assign({headers: apiHeaders()}, options || {}));
  if (!r.ok) throw new Error(await r.text());
  if (r.status === 204) return null;
  return r.json();
}

async function rpc(name, args) {
  requireConfig();
  var r = await fetch(REST + "/rpc/" + name, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify(args || {})
  });
  var text = await r.text();
  var data = text ? JSON.parse(text) : null;
  if (!r.ok) throw new Error(data && (data.message || data.error_description || data.hint) || text || "RPC error");
  return data;
}

function requireConfig() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Chưa điền Supabase URL và Publishable key trong js/config.js");
  }
}
