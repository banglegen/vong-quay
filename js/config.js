const SUPABASE_URL = "";
const SUPABASE_KEY = "";
const REST = SUPABASE_URL + "/rest/v1";
const AUTH = SUPABASE_URL + "/auth/v1";
function headers(token, extra={}){return Object.assign({apikey:SUPABASE_KEY,Authorization:"Bearer "+(token||SUPABASE_KEY),"Content-Type":"application/json"},extra)}
async function rest(path,opt={}){let r=await fetch(REST+path,Object.assign({headers:headers()},opt));if(!r.ok)throw Error(await r.text());return r.status===204?null:r.json()}
async function auth(path,opt={}){let r=await fetch(AUTH+path,Object.assign({headers:headers()},opt)),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error_description||d.msg||d.message||"Auth error");return d}
function requireConfig(){if(!SUPABASE_URL||!SUPABASE_KEY)throw Error("Chưa điền Supabase URL và Publishable key trong js/config.js")}
