/* motoai_v41_messenger_ultimate.js
 ✅ UPDATE v41: MESSENGER UI CLONE + MARKDOWN FIX + AUTO DODGE
 
 [CORE FEATURES - GIỮ NGUYÊN]:
 - AutoLearn (Sitemap/Crawl), BM25, QA Extraction, Price Learning.
 
 [NEW UI/UX v41]:
 - Messenger Clone: Header trắng, Input dạng viên thuốc (Pill shape), Icon xanh chuẩn Meta.
 - Markdown Parser: Hỗ trợ **đậm**, *nghiêng*, [link], - list.
 - Smart Dodge: Tự động phát hiện Footer/QuickCall để đôn vị trí nút chat lên.
 - Safe Input: Chống XSS khi render HTML.
*/
(function(){
if (window.MotoAI_v41_LOADED) return;
window.MotoAI_v41_LOADED = true;

/* ====== CONFIG ====== */
const DEF = {
  brand: "Hỗ Trợ Viên", // Tên hiển thị chuẩn Messenger
  phone: "0942467674",
  zalo:  "",
  map:   "",
  avatar: "https://cdn-icons-png.flaticon.com/512/6024/6024190.png", // Icon mặc định đẹp hơn
  themeColor: "#0084FF", // Messenger Blue

  autolearn: true,
  viOnly: true,
  deepContext: true,
  maxContextTurns: 5,

  extraSites: [location.origin],
  crawlDepth: 1,
  refreshHours: 24,
  maxPagesPerDomain: 80,
  maxTotalPages: 300,

  fetchTimeoutMs: 10000,
  fetchPauseMs: 160,
  disableQuickMap: false,
  
  // UI Config
  bottomOffset: 0, // Khoảng cách đệm thêm từ đáy (nếu cần chỉnh tay)

  smart: {
    semanticSearch: true,
    extractiveQA:   true,
    autoPriceLearn: true
  },
  debug: true
};
const ORG = (window.MotoAI_CONFIG||{});
if(!ORG.zalo && (ORG.phone||DEF.phone)) ORG.zalo = 'https://zalo.me/' + String(ORG.phone||DEF.phone).replace(/\s+/g,'');
const CFG = Object.assign({}, DEF, ORG);
CFG.smart = Object.assign({}, DEF.smart, (ORG.smart||{}));

/* ====== HELPERS ====== */
const $  = s => document.querySelector(s);
const safe = s => { try{ return JSON.parse(s); }catch{ return null; } };
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const nowSec = ()=> Math.floor(Date.now()/1000);
const pick = a => a[Math.floor(Math.random()*a.length)];
const nfVND = n => (n||0).toLocaleString('vi-VN');
const clamp = (n,min,max)=> Math.max(min, Math.min(max,n));
const sameHost = (u, origin)=> { try{ return new URL(u).host.replace(/^www\./,'') === new URL(origin).host.replace(/^www\./,''); }catch{ return false; } };

/* --- Markdown & Text Process --- */
function naturalize(t){
  if(!t) return t;
  let s = " "+t+" ";
  s = s.replace(/\s+ạ([.!?,\s]|$)/gi, "$1").replace(/\s+nhé([.!?,\s]|$)/gi, "$1").replace(/\s+nha([.!?,\s]|$)/gi, "$1");
  s = s.replace(/\s{2,}/g," ").trim(); if(!/[.!?]$/.test(s)) s+="."; return s.replace(/\.\./g,".");
}
function looksVN(s){
  if(/[ăâêôơưđà-ỹ]/i.test(s)) return true;
  const hits = (s.match(/\b(xe|thuê|giá|liên hệ|hà nội|cọc|giấy tờ)\b/gi)||[]).length;
  return hits >= 2;
}

// ✅ NEW: Simple Markdown Parser (Bold, Italic, Link, List, Break)
function renderMarkdown(text) {
  if (!text) return '';
  // 1. Sanitize HTML tags (Anti XSS)
  let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  
  // 2. Format Syntax
  html = html
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')       // Bold
    .replace(/__(.*?)__/g, '<u>$1</u>')                    // Underline
    .replace(/\*(.*?)\*/g, '<em>$1</em>')                  // Italic
    .replace(/`(.*?)`/g, '<code>$1</code>')                // Code inline
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>') // Link
    .replace(/\n\s*-\s+(.*)/g, '<br>• $1')                 // Bullet list
    .replace(/\n/g, '<br>');                               // Line break
    
  return html;
}

/* ====== STORAGE KEYS ====== */
const K = {
  sess:  "MotoAI_v41_session",
  ctx:   "MotoAI_v41_ctx",
  learn: "MotoAI_v41_learn",      
  autoprices: "MotoAI_v41_auto_prices",
  stamp: "MotoAI_v41_learnStamp",
  clean: "MotoAI_v41_lastClean",
  dbg:   "MotoAI_v41_debug_stats"
};

/* ====== UI STYLE - MESSENGER CLONE ====== */
const CSS = `
:root{
  --mta-z: 2147483647;
  --m-blue: ${CFG.themeColor};
  --m-bg: #FFFFFF;
  --m-head-bg: #FFFFFF;
  --m-head-text: #050505;
  --m-text: #050505;
  --m-gray-bg: #F0F2F5;
  --m-bubble-user: ${CFG.themeColor};
  --m-bubble-bot: #F0F2F5;
  --m-text-bot: #050505;
  --m-text-user: #FFFFFF;
  --m-input-bg: #F0F2F5;
  --m-shadow: 0 4px 12px rgba(0,0,0,0.15);
  
  /* Input sizing: 16px is CRITICAL for iOS to prevent auto-zoom */
  --m-in-h: 36px;
  --m-in-fs: 16px;
  --m-vv-height: 100vh;
  --m-safe-bottom: env(safe-area-inset-bottom);
}

@media(prefers-color-scheme:dark){
  :root{
    --m-bg: #18191A; /* FB Dark BG */
    --m-head-bg: #18191A;
    --m-head-text: #E4E6EB;
    --m-text: #E4E6EB;
    --m-gray-bg: #242526;
    --m-bubble-bot: #242526; /* FB Dark Bubble */
    --m-text-bot: #E4E6EB;
    --m-input-bg: #3A3B3C;
    --m-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }
}

#mta-root {
  position: fixed; right: 24px; bottom: 24px;
  z-index: var(--mta-z);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  transition: bottom 0.3s ease; /* For Auto-Dodge */
}

/* Bubble Button - Messenger Style */
#mta-bubble {
  width: 60px; height: 60px; border: none; border-radius: 50%;
  background: var(--m-blue);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 132, 255, 0.4);
  cursor: pointer; transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
}
#mta-bubble svg { width: 32px; height: 32px; fill: #fff; }
#mta-bubble:hover { transform: scale(1.08); }
#mta-bubble:active { transform: scale(0.95); }

/* Main Card */
#mta-card {
  position: fixed;
  right: 24px; bottom: 96px;
  width: 360px; max-width: calc(100vw - 32px);
  height: 600px; max-height: calc(80vh - 20px);
  background: var(--m-bg); color: var(--m-text);
  border-radius: 16px;
  box-shadow: var(--m-shadow);
  display: flex; flex-direction: column; overflow: hidden;
  transform: translateY(15px) scale(0.95); opacity: 0; pointer-events: none;
  transition: all 0.2s cubic-bezier(0.1, 0.9, 0.2, 1);
  transform-origin: bottom right;
  border: 1px solid rgba(0,0,0,0.08);
}
@media(prefers-color-scheme:dark){ #mta-card { border: 1px solid #333; } }
#mta-card.open { transform: translateY(0) scale(1); opacity: 1; pointer-events: auto; }

/* Header - Clean FB Style */
#mta-header { 
  background: var(--m-head-bg); color: var(--m-head-text); 
  flex-shrink: 0; padding: 12px 16px; 
  display: flex; align-items: center; gap: 12px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.06); z-index: 2;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}
#mta-header .avatar { 
  width: 40px; height: 40px; border-radius: 50%; overflow: hidden; position: relative;
  background: #eee;
}
#mta-header .avatar img { width: 100%; height: 100%; object-fit: cover; }
#mta-header .avatar::after {
  content:''; position: absolute; bottom: 2px; right: 2px; width: 10px; height: 10px;
  background: #31A24C; border: 2px solid var(--m-head-bg); border-radius: 50%;
}
#mta-header .info { flex: 1; min-width: 0; }
#mta-header .name { font-weight: 700; font-size: 16px; line-height: 1.2; }
#mta-header .status { font-size: 13px; opacity: 0.7; margin-top: 2px; }
#mta-close { 
  background: var(--m-gray-bg); width: 32px; height: 32px; border-radius: 50%; border:none;
  display: flex; align-items: center; justify-content: center;
  color: var(--m-text); font-size: 20px; cursor: pointer; transition: 0.2s;
}
#mta-close:hover { filter: brightness(0.95); }

/* Chat Body */
#mta-body {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  background: var(--m-bg);
  padding: 16px 12px;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}
.m-msg { 
  max-width: 75%; margin: 4px 0; padding: 8px 12px; 
  border-radius: 18px; font-size: 15px; line-height: 1.4; 
  position: relative; word-wrap: break-word;
  animation: mta-slide 0.2s ease-out;
}
@keyframes mta-slide { from{ opacity:0; transform: translateY(8px); } to{ opacity:1; transform:translateY(0); } }
.m-msg.bot { 
  background: var(--m-bubble-bot); color: var(--m-text-bot); 
  border-bottom-left-radius: 4px; margin-right: auto; 
}
.m-msg.user { 
  background: var(--m-bubble-user); color: var(--m-text-user); 
  border-bottom-right-radius: 4px; margin-left: auto; 
}
/* Link in chat */
.m-msg a { color: inherit; text-decoration: underline; font-weight: 500; }

/* Tags */
#mta-tags { padding: 8px 12px; display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
#mta-tags::-webkit-scrollbar { display: none; }
#mta-tags button { 
  white-space: nowrap; background: var(--m-input-bg); color: var(--m-text);
  border: none; border-radius: 16px; padding: 6px 12px; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: 0.2s;
}
#mta-tags button:active { opacity: 0.7; transform: scale(0.98); }

/* Footer Input - Messenger Style */
#mta-footer {
  padding: 12px; padding-bottom: calc(12px + var(--m-safe-bottom));
  background: var(--m-bg); border-top: 1px solid rgba(0,0,0,0.05);
  display: flex; align-items: center; gap: 8px;
}
#mta-input-wrap {
  flex: 1; height: 36px; background: var(--m-input-bg);
  border-radius: 18px; display: flex; align-items: center; padding: 0 12px;
  transition: 0.2s;
}
#mta-input-wrap:focus-within { background: rgba(0,0,0,0.05); }
@media(prefers-color-scheme:dark){ #mta-input-wrap:focus-within { background: rgba(255,255,255,0.1); } }
#mta-in {
  flex: 1; background: transparent; border: none; outline: none;
  font-size: var(--m-in-fs); color: var(--m-text);
  padding: 0; margin: 0; height: 100%;
}
#mta-send {
  background: none; border: none; cursor: pointer; color: var(--m-blue);
  font-weight: 600; font-size: 15px; padding: 4px 8px;
  opacity: 0.5; pointer-events: none; transition: 0.2s;
}
#mta-in:not(:placeholder-shown) + #mta-send { opacity: 1; pointer-events: auto; }

/* Mobile Adapt */
@media (max-width: 480px) {
  #mta-root { right: 16px; bottom: 16px; }
  #mta-card {
    right: 0; left: 0; bottom: 0; width: 100%; max-width: 100%;
    border-radius: 16px 16px 0 0; border: none;
    transform: translateY(100%);
    height: var(--m-vv-height); max-height: 85vh;
  }
  #mta-card.open { transform: translateY(0); }
  body.mta-kb-open #mta-card { height: var(--m-vv-height); border-radius: 0; }
  /* Backdrop */
  #mta-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: calc(var(--mta-z) - 1);
    opacity: 0; pointer-events: none; transition: 0.2s;
  }
  #mta-backdrop.show { opacity: 1; pointer-events: auto; }
}`;

const HTML = `
<div id="mta-root" aria-live="polite">
  <button id="mta-bubble" aria-label="Chat">
    <svg viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.145 2 11.25c0 2.91 1.458 5.518 3.75 7.25.137.104.225.263.225.438v2.793c0 .546.64.84 1.05.52l3.078-2.4a.735.735 0 0 1 .458-.16c.47.045.952.07 1.439.07 5.523 0 10-4.145 10-9.25S17.523 2 12 2zm1 13.5l-2.5-2.75-4.5 2.75 5-5.25 2.5 2.75 4.5-2.75-5 5.25z"/></svg>
  </button>
  <div id="mta-backdrop"></div>
  <section id="mta-card" role="dialog" aria-hidden="true">
    <header id="mta-header">
      <div class="avatar"><img src="${CFG.avatar}" alt="Bot"></div>
      <div class="info">
        <div class="name">${CFG.brand}</div>
        <div class="status">Thường trả lời ngay</div>
      </div>
      <button id="mta-close">×</button>
    </header>
    <main id="mta-body"></main>
    <div id="mta-tags">
      <button data-q="Giá thuê xe">💰 Giá thuê</button>
      <button data-q="Thủ tục thế nào?">📄 Thủ tục</button>
      <button data-q="Có giao tận nơi không?">🚚 Giao xe</button>
      <button data-q="Tư vấn xe ga">🛵 Xe ga</button>
    </div>
    <footer id="mta-footer">
      <div id="mta-input-wrap">
        <input id="mta-in" placeholder="Nhắn tin..." autocomplete="off" inputmode="text" />
        <button id="mta-send">Gửi</button>
      </div>
    </footer>
  </section>
</div>`;

/* ====== SESSION / CONTEXT ====== */
const MAX_MSG = 15;
function getSess(){ const arr = safe(localStorage.getItem(K.sess))||[]; return Array.isArray(arr)?arr:[]; }
function saveSess(a){ try{ localStorage.setItem(K.sess, JSON.stringify(a.slice(-MAX_MSG))); }catch{} }

function scrollToBottom(){
   const body=$("#mta-body");
   if(body) setTimeout(() => body.scrollTop = body.scrollHeight, 50);
}

// ✅ UPDATED: Render Markdown & HTML Safe
function addMsg(role, rawText){
  if(!rawText) return;
  const body=$("#mta-body"); if(!body) return;
  
  const div = document.createElement("div");
  div.className = "m-msg " + (role==="user"?"user":"bot");
  
  // Render HTML tu Markdown Parser
  div.innerHTML = renderMarkdown(rawText);
  
  body.appendChild(div);
  scrollToBottom();
  
  const arr=getSess(); 
  arr.push({role, text: rawText, t:Date.now()}); 
  saveSess(arr);
}

function renderSess(){
  const body=$("#mta-body"); body.innerHTML="";
  const arr=getSess();
  if(arr.length) arr.forEach(m=> addMsg(m.role, m.text));
  else addMsg("bot", naturalize(`Xin chào! Em là trợ lý ảo của ${CFG.brand}. Em có thể giúp gì cho anh/chị ạ?`));
}

function getCtx(){ return safe(localStorage.getItem(K.ctx)) || {turns:[]}; }
function pushCtx(delta){
  try{
    const ctx=getCtx(); ctx.turns.push(Object.assign({t:Date.now()}, delta||{}));
    ctx.turns = ctx.turns.slice(-clamp(CFG.maxContextTurns||5,3,8));
    localStorage.setItem(K.ctx, JSON.stringify(ctx));
  }catch{}
}

/* ====== NLP & PRICE ENGINE (CORE KEPT 100%) ====== */
const TYPE_MAP = [
  {k:'xe số',     re:/xe số|wave|blade|sirius|jupiter|future|dream/i, canon:'xe số'},
  {k:'xe ga',     re:/xe ga|vision|air\s*blade|lead|liberty|vespa|grande|janus|sh\b/i, canon:'xe ga'},
  {k:'air blade', re:/air\s*blade|airblade|ab\b/i, canon:'air blade'},
  {k:'vision',    re:/vision/i, canon:'vision'},
  {k:'xe điện',   re:/xe điện|vinfast|yadea|dibao|klara|evo/i, canon:'xe điện'},
  {k:'50cc',      re:/50\s*cc|xe 50/i, canon:'50cc'},
  {k:'xe côn tay',re:/côn tay|tay côn|exciter|winner|raider|cb150|cbf190|w175|msx/i, canon:'xe côn tay'}
];
function detectType(t){ for(const it of TYPE_MAP){ if(it.re.test(t)) return it.canon; } return null; }
function detectQty(t){
  const m=(t||"").match(/(\d+)\s*(ngày|day|tuần|tuan|week|tháng|thang|month)?/i);
  if(!m) return null; const n=parseInt(m[1],10); if(!n) return null;
  let unit="ngày"; if(m[2]){ if(/tuần|tuan|week/i.test(m[2])) unit="tuần"; else if(/tháng|thang|month/i.test(m[2])) unit="tháng"; }
  return {n,unit};
}
function detectIntent(t){
  return {
    needPrice:   /(giá|bao nhiêu|thuê|tính tiền|cost|price)/i.test(t),
    needDocs:    /(thủ tục|giấy tờ|cccd|passport|hộ chiếu)/i.test(t),
    needContact: /(liên hệ|zalo|gọi|hotline|sđt|sdt|phone)/i.test(t),
    needDelivery:/(giao|ship|tận nơi|đưa xe|mang xe)/i.test(t),
    needReturn:  /(trả xe|gia hạn|đổi xe|kết thúc thuê)/i.test(t),
    needPolicy:  /(điều kiện|chính sách|bảo hiểm|hư hỏng|sự cố|đặt cọc|cọc)/i.test(t)
  };
}

/* ====== PRICE TABLE + Auto-Price Learn ====== */
const PRICE_TABLE = {
  'xe số':      { day:[150000],          week:[600000,700000], month:[850000,1200000] },
  'xe ga':      { day:[150000,200000],   week:[600000,1000000], month:[1100000,2000000] },
  'air blade':  { day:[200000],          week:[800000], month:[1600000,1800000] },
  'vision':     { day:[200000],          week:[700000,850000], month:[1400000,1900000] },
  'xe điện':    { day:[170000],          week:[800000], month:[1600000] },
  '50cc':       { day:[200000],          week:[800000], month:[1700000] },
  'xe côn tay': { day:[300000],          week:[1200000], month:null }
};
function baseFor(type,unit){
  const it=PRICE_TABLE[type]; if(!it) return null;
  const key = unit==="tuần"?"week":(unit==="tháng"?"month":"day");
  const arr=it[key]; if(!arr) return null; return Array.isArray(arr)?arr[0]:arr;
}
function extractPricesFromText(txt){
  const clean = String(txt||'');
  const lines = clean.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').split(/[\n\.•\-–]|<br\s*\/?>/i);
  const out = [];
  const reNum = /(\d{2,3}(?:[\.\,]\d{3})+|\d{5,})(?:\s*(?:vnđ|vnd|đ|d|k))?/i;
  const models = [
    {key:/\bvision\b/i,                   type:'vision'},
    {key:/air\s*blade|airblade|\bab\b/i,  type:'air blade'},
    {key:/\b50\s*cc\b|\b50cc\b/i,         type:'50cc'},
    {key:/côn\s*tay|tay\s*côn/i,          type:'xe côn tay'},
    {key:/xe\s*điện|vinfast|yadea|dibao|gogo|klara/i, type:'xe điện'},
    {key:/wave|sirius|blade|jupiter|xe\s*số/i, type:'xe số'},
    {key:/xe\s*ga|vision|lead|vespa|liberty|grande|janus/i, type:'xe ga'}
  ];
  for(const raw of lines){
    const line = String(raw||'');
    const found = models.find(m=> m.key.test(line));
    if(!found) continue;
    const m = line.match(reNum);
    if(!m) continue;
    let val = m[1].replace(/[^\d]/g,'');
    if(/k\b/i.test(line) && parseInt(val,10)<10000) val = String(parseInt(val,10)*1000);
    const price = parseInt(val,10);
    if(price && price<5000000){ out.push({type:found.type, unit:'day', price}); }
  }
  return out;
}

/* ====== INDEX + BM25 ====== */
function tk(s){ return (s||"").toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}\s]+/gu,' ').split(/\s+/).filter(Boolean); }
function loadLearn(){ return safe(localStorage.getItem(K.learn)) || {}; }
function saveLearn(o){ try{ localStorage.setItem(K.learn, JSON.stringify(o)); }catch{} }
function getIndexFlat(){
  const cache=loadLearn(); const out=[];
  Object.keys(cache).forEach(key=>{ (cache[key].pages||[]).forEach(pg=> out.push(Object.assign({source:key}, pg))); });
  return out;
}
function buildBM25(docs){
  const k1=1.5,b=0.75; const df=new Map(), tf=new Map(); let total=0;
  docs.forEach(d=>{
    const toks=tk(d.text); total+=toks.length;
    const map=new Map(); toks.forEach(t=> map.set(t,(map.get(t)||0)+1));
    tf.set(d.id,map); new Set(toks).forEach(t=> df.set(t,(df.get(t)||0)+1));
  });
  const N=docs.length||1, avgdl=total/Math.max(1,N); const idf=new Map();
  df.forEach((c,t)=> idf.set(t, Math.log(1 + (N - c + .5)/(c + .5))));
  function score(query, docId, docLen){
    const qToks=new Set(tk(query)); const map=tf.get(docId)||new Map(); let s=0;
    qToks.forEach(t=>{ const f=map.get(t)||0; if(!f) return; const idfv=idf.get(t)||0;
      s += idfv*(f*(k1+1))/(f + k1*(1 - b + b*(docLen/avgdl)));
    });
    return s;
  }
  return {score, tf, avgdl};
}
function searchIndex(query, k=3){
  const idx = getIndexFlat(); if(!idx.length) return [];
  const docs = idx.map((it,i)=>({id:String(i), text:((it.title||'')+' '+(it.text||'')), meta:it}));
  const bm = CFG.smart.semanticSearch ? buildBM25(docs) : null;
  const scored = bm
    ? docs.map(d=>({score: bm.score(query, d.id, tk(d.text).length||1), meta:d.meta}))
            .filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,k).map(x=>x.meta)
    : idx.map(it=> Object.assign({score: tk(it.title+" "+it.text).filter(t=> tk(query).includes(t)).length}, it))
         .filter(x=>x.score>0).sort((a,b)=>b.score-a-score).slice(0,k);
  return scored;
}
function bestSentences(text, query, k=2){
  const sents = String(text||'').replace(/\s+/g,' ').split(/(?<=[\.\!\?])\s+/).slice(0,80);
  const qToks=new Set(tk(query)); const scored = sents.map(s=>{
    const toks=tk(s); let hit=0; qToks.forEach(t=>{ if(toks.includes(t)) hit++; });
    const lenp = Math.max(0.5, 12/Math.max(12, toks.length));
    return {s, score: hit*lenp};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
  return scored.slice(0,k).map(x=>x.s);
}

/* ====== FETCH / CRAWL ====== */
async function fetchText(url){
  const ctl = new AbortController(); const id = setTimeout(()=>ctl.abort(), CFG.fetchTimeoutMs);
  try{
    const res = await fetch(url, {signal: ctl.signal, mode:'cors', credentials:'omit'});
    clearTimeout(id); if(!res.ok) return null;
    return await res.text();
  }catch(e){ clearTimeout(id); return null; }
}
function parseXML(t){ try{ return (new DOMParser()).parseFromString(t,'text/xml'); }catch{ return null; } }
function parseHTML(t){ try{ return (new DOMParser()).parseFromString(t,'text/html'); }catch{ return null; } }
function newDomainStats(domain){
  return { domain, startedAt: Date.now(), durationMs: 0, urlsSeen: 0, pagesKept: 0, txtPages: 0, htmlPages: 0, nonVNSkipped: 0, noindexSkipped: 0, autoPriceHits: 0 };
}
function finishStats(st){ st.durationMs = Date.now() - st.startedAt; return st; }
function saveStatsAll(all){ try{ localStorage.setItem(K.dbg, JSON.stringify(all)); }catch{} }
function loadStatsAll(){ return safe(localStorage.getItem(K.dbg)) || {}; }

async function readSitemap(url){
  const xml = await fetchText(url); if(!xml) return [];
  const doc = parseXML(xml); if(!doc) return [];
  const items = Array.from(doc.getElementsByTagName('item'));
  if(items.length){ return items.map(it=> it.getElementsByTagName('link')[0]?.textContent?.trim()).filter(Boolean); }
  const sm = Array.from(doc.getElementsByTagName('sitemap')).map(x=> x.getElementsByTagName('loc')[0]?.textContent?.trim()).filter(Boolean);
  if(sm.length){
    const all=[]; for(const loc of sm){ try{ const child = await readSitemap(loc); if(child && child.length) all.push(...child); }catch{} }
    return Array.from(new Set(all));
  }
  const urls = Array.from(doc.getElementsByTagName('url')).map(u=> u.getElementsByTagName('loc')[0]?.textContent?.trim()).filter(Boolean);
  return urls;
}
async function fallbackCrawl(origin){
  const start = origin.endsWith('/')? origin : origin + '/';
  const html = await fetchText(start); if(!html) return [start];
  const doc = parseHTML(html); if(!doc) return [start];
  const links = Array.from(doc.querySelectorAll('a[href]')).map(a=> a.getAttribute('href')).filter(Boolean);
  const set = new Set([start]);
  for(const href of links){
    try{ const u = new URL(href, start).toString().split('#')[0]; if(sameHost(u, origin)) set.add(u); if(set.size>=40) break; }catch{}
  }
  return Array.from(set);
}
async function pullPages(urls, stats){
  const out=[]; stats.urlsSeen += urls.length;
  for(const u of urls.slice(0, CFG.maxPagesPerDomain)){
    const txt = await fetchText(u); if(!txt) continue;
    if (/\bname=(?:"|')robots(?:"|')[^>]*content=(?:"|')[^"']*noindex/i.test(txt)) { stats.noindexSkipped++; continue; }
    let title = (txt.match(/<title[^>]*>([^<]+)<\/title>/i)||[])[1]||""; title = title.replace(/\s+/g,' ').trim();
    let desc = (txt.match(/<meta[^>]+name=(?:"|')description(?:"|')[^>]+content=(?:"|')([\s\S]*?)(?:"|')/i)||[])[1]||"";
    if(!desc){ desc = txt.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,600); }
    const sample = (title+' '+desc).toLowerCase();
    if(CFG.viOnly && !looksVN(sample)) { stats.nonVNSkipped++; await sleep(CFG.fetchPauseMs); continue; }
    if(CFG.smart.autoPriceLearn){
      try{ const autos = extractPricesFromText(txt);
        if(autos && autos.length){ stats.autoPriceHits += autos.length; const stash = safe(localStorage.getItem(K.autoprices))||[]; stash.push(...autos.map(a=> Object.assign({url:u}, a))); localStorage.setItem(K.autoprices, JSON.stringify(stash.slice(-500))); }
      }catch{}
    }
    stats.htmlPages++; out.push({url:u, title, text:desc}); stats.pagesKept++; await sleep(CFG.fetchPauseMs);
  }
  return out;
}
function loadLearnCache(){ return loadLearn(); }
function saveLearnCache(obj){ saveLearn(obj); }
function isExpired(ts, hrs){ if(!ts) return true; return ((nowSec()-ts)/3600) >= (hrs||CFG.refreshHours); }

async function learnOneOrigin(origin, stats){
  try{
    const key = new URL(origin).origin;
    const candidatesJSON = [ key + "/moto_sitemap.json", location.origin + (location.pathname.replace(/\/[^\/]*$/,'') || '') + "/moto_sitemap.json" ];
    for(const j of Array.from(new Set(candidatesJSON))){
      try{
        const r = await fetch(j);
        if(r && r.ok){
          const json = await r.json(); const ds = [ ...(json.categories?.datasets?.list || []), ...(json.categories?.pages?.list || []) ];
          const pages = []; stats.urlsSeen += ds.length;
          for(const u of ds){
            const txt = await fetchText(u); if(!txt) continue;
            if(/\.txt($|\?)/i.test(u)){ const title = u.split("/").slice(-1)[0]; const text = txt.replace(/\s+/g," ").trim().slice(0,2000); pages.push({url:u,title,text}); stats.txtPages++; stats.pagesKept++; }
            else{
              let title=(txt.match(/<title[^>]*>([^<]+)<\/title>/i)||[])[1]||""; title=title.replace(/\s+/g,' ').trim();
              let desc=(txt.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"]+)["']/i)||[])[1]||"";
              if(!desc) desc = txt.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,600);
              const sample=(title+' '+desc).toLowerCase();
              if(CFG.viOnly && !looksVN(sample)) { stats.nonVNSkipped++; continue; }
              if(CFG.smart.autoPriceLearn){ const autos = extractPricesFromText(txt); if(autos && autos.length){ stats.autoPriceHits += autos.length; const stash = safe(localStorage.getItem(K.autoprices))||[]; stash.push(...autos.map(a=> Object.assign({url:u}, a))); localStorage.setItem(K.autoprices, JSON.stringify(stash.slice(-500))); } }
              pages.push({url:u,title,text:desc}); stats.htmlPages++; stats.pagesKept++;
            }
            if(pages.length >= CFG.maxPagesPerDomain) break; await sleep(CFG.fetchPauseMs);
          }
          if(pages.length) return {domain:j, ts: nowSec(), pages};
        }
      }catch{}
    }
    let urls=[]; const smc = [key+'/sitemap.xml', key+'/sitemap_index.xml'];
    for(const c of smc){ try{ const u=await readSitemap(c); if(u && u.length){ urls=u; break; } }catch{} }
    if(!urls.length) urls = await fallbackCrawl(key);
    const uniq = Array.from(new Set(urls.map(u=>{ try{ return new URL(u).toString().split('#')[0]; }catch{ return null; } }).filter(Boolean).filter(u=> sameHost(u, key))));
    const pages = await pullPages(uniq, stats);
    return {domain:key, ts: nowSec(), pages};
  }catch(e){ return null; }
}

async function learnSites(origins, force){
  const list = Array.from(new Set(origins||[])).slice(0, 12); const cache = loadLearnCache(); const results = {}; let total=0; const allStats = loadStatsAll();
  for(const origin of list){
    try{
      const key = new URL(origin).origin; const stats = newDomainStats(key); const cached = cache[key];
      if(!force && cached && !isExpired(cached.ts, CFG.refreshHours) && cached.pages?.length){
        results[key] = cached; total += cached.pages.length; stats.pagesKept = cached.pages.length; finishStats(stats); allStats[key] = stats; saveStatsAll(allStats);
        if(total>=CFG.maxTotalPages) break; continue;
      }
      const data = await learnOneOrigin(origin, stats); finishStats(stats); allStats[key] = stats; saveStatsAll(allStats);
      if(data && data.pages?.length){ cache[key] = data; try{ saveLearnCache(cache); } catch(e){ const ks=Object.keys(cache); if(ks.length) delete cache[ks[0]]; saveLearnCache(cache); } results[key] = data; total += data.pages.length; }
      if(total >= CFG.maxTotalPages) break;
    }catch(e){}
    await sleep(CFG.fetchPauseMs);
  }
  if(CFG.debug) console.table(Object.values(allStats));
  localStorage.setItem(K.stamp, Date.now()); return results;
}

/* ====== ANSWER ENGINE ====== */
const PREFIX = ["Chào anh/chị,","Xin chào 👋,","Em chào anh/chị,","Em ở "+CFG.brand+" đây,"];
function polite(s){ s = s || "em chưa rõ câu hỏi, anh/chị nhắn lại nhé."; return naturalize(`${pick(PREFIX)} ${s}`); }

function composePrice(type, qty){
  if(!type) type = 'xe số';
  if(!qty)  return naturalize(`Anh/chị thuê **${type}** theo ngày hay theo tháng ạ?`);
  const base = baseFor(type, qty.unit);
  if(!base)  return naturalize(`Giá thuê **${type}** theo **${qty.unit}** cần kiểm tra. Anh/chị gọi em số ${CFG.phone} nhé.`);
  const total = base * qty.n;
  const label = qty.unit==="ngày"?"ngày":(qty.unit==="tuần"?"tuần":"tháng");
  let text = qty.n===1 ? `Giá thuê **${type}** 1 ${label} khoảng **${nfVND(base)}đ**` : `Giá thuê **${type}** ${qty.n} ${label} khoảng **${nfVND(total)}đ**`;
  if(qty.unit==="ngày" && qty.n>=3) text += " Thuê tuần sẽ rẻ hơn ạ.";
  return naturalize(`${text}. Anh/chị cần giữ xe thì nhắn Zalo [Tại đây](${CFG.zalo}) cho em nhé.`);
}

async function deepAnswer(userText){
  const q = (userText||"").trim(); const intents = detectIntent(q); let type = detectType(q); const qty  = detectQty(q);
  if(CFG.deepContext){ const ctx = getCtx(); for(let i=ctx.turns.length-1;i>=0;i--){ const t = ctx.turns[i]; if(!type && t.type) type=t.type; if(!qty && t.qty) return composePrice(type||t.type, t.qty); if(type && qty) break; } }
  if(intents.needContact) return polite(`Hotline bên em: **${CFG.phone}**\nZalo: [Nhắn Zalo](${CFG.zalo||CFG.phone})`);
  if(intents.needDocs)    return polite(`Thủ tục đơn giản: **CCCD/Hộ chiếu** + cọc. Nếu đủ giấy tờ có thể giảm cọc ạ.`);
  if(intents.needPolicy)  return polite(`Cọc tham khảo: Xe số 2-3tr, Xe ga 2-5tr. Hoàn cọc ngay khi trả xe.`);
  if(intents.needDelivery)return polite(`Thuê tuần/tháng bên em giao tận nơi (20-100k tuỳ xa gần).`);
  if(intents.needReturn)  return polite(`Trả xe tại cửa hàng hoặc tận nơi (có phí). Anh/chị báo trước 30p nhé.`);
  if(intents.needPrice)   return composePrice(type, qty);

  try{
    const top = searchIndex(q, 3);
    if(top && top.length){
      const t0 = top[0];
      if(CFG.smart.extractiveQA){ const sn = bestSentences((t0.title? (t0.title+'. ') : '') + (t0.text||''), q, 2).join(' '); if(sn) return naturalize(`${sn}\n\n👉 Chi tiết: [Xem thêm](${t0.url})`); }
      const fallback = ((t0.title? (t0.title+' — ') : '') + (t0.text||'')).slice(0,180);
      return polite(`${fallback}...\n\n👉 [Xem chi tiết](${t0.url})`);
    }
  }catch(e){}
  if(/(chào|xin chào|hello|hi|alo)/i.test(q)) return polite(`Em hỗ trợ được gì cho anh/chị? Em có Xe số, Xe ga, Xe 50cc, Côn tay...`);
  return polite(`Anh/chị muốn thuê loại xe nào (Vision, Wave, 50cc...) và đi mấy ngày ạ?`);
}

function mergeAutoPrices(){
  if(!CFG.smart.autoPriceLearn) return;
  try{ const autos = safe(localStorage.getItem(K.autoprices))||[]; if(!autos.length) return;
    const byType = autos.reduce((m,a)=>{ (m[a.type]||(m[a.type]=[])).push(a.price); return m; },{});
    Object.keys(byType).forEach(t=>{
      const arr = byType[t].sort((a,b)=>a-b); const p25 = arr[Math.floor(arr.length*0.25)]; const p50 = arr[Math.floor(arr.length*0.50)];
      if(PRICE_TABLE[t]){ const dayRange = [p25, p50].filter(Boolean); if(dayRange.length) PRICE_TABLE[t].day = dayRange; }
    });
  }catch{}
}

/* ====== LOGIC & EVENT HANDLERS ====== */
let isOpen=false, sending=false;
function showTyping(){
  const body=$("#mta-body"); if(!body) return;
  const box=document.createElement("div"); box.id="mta-typing"; 
  // Typing animation dot style
  box.innerHTML=`<div class="m-msg bot" style="width:40px;height:24px;display:flex;align-items:center;justify-content:center;gap:3px">
   <span style="width:4px;height:4px;background:#999;border-radius:50%;animation:mta-blink 1s infinite"></span>
   <span style="width:4px;height:4px;background:#999;border-radius:50%;animation:mta-blink 1s infinite .2s"></span>
   <span style="width:4px;height:4px;background:#999;border-radius:50%;animation:mta-blink 1s infinite .4s"></span>
  </div>`;
  const st=document.createElement("style"); st.textContent="@keyframes mta-blink{0%,100%{opacity:.3}50%{opacity:1}}";
  box.appendChild(st); body.appendChild(box); scrollToBottom();
}
function hideTyping(){ const t=$("#mta-typing"); if(t) t.remove(); }

async function sendUser(text){
  if(sending) return; const v=(text||"").trim(); if(!v) return;
  sending=true; addMsg("user", v);
  if(window.innerWidth < 480) $("#mta-tags")?.classList.add("hidden");
  pushCtx({from:"user", raw:v, type:detectType(v), qty:detectQty(v)});
  const isMobile = window.innerWidth < 480; const wait = (isMobile? 1000 : 1500) + Math.random()*500;
  showTyping(); await sleep(wait);
  const ans = await deepAnswer(v);
  hideTyping(); addMsg("bot", ans); pushCtx({from:"bot", raw:ans});
  sending=false;
}

function handleViewport(){
   if(!window.visualViewport) return;
   const vv = window.visualViewport; const root = $("#mta-root");
   root.style.setProperty('--m-vv-height', vv.height + 'px');
   if(window.innerWidth < 480 && (vv.height < window.innerHeight * 0.85)){
       document.body.classList.add('mta-kb-open'); setTimeout(scrollToBottom, 100);
   } else { document.body.classList.remove('mta-kb-open'); }
}

// ✅ NEW: Auto Dodge (Tự né Footer/Quick Call)
function autoDodge(){
  if(window.innerWidth > 480) return; // Chỉ chạy trên Mobile
  const root = $("#mta-root"); if(!root) return;
  
  // Tìm các phần tử "dính" ở đáy thường gặp
  const obstacles = document.querySelectorAll('.footer-nav, .quick-call, .call-now, [class*="bottom-nav"], [id*="footer-bar"]');
  let maxH = 0;
  
  obstacles.forEach(el => {
    const rect = el.getBoundingClientRect();
    // Nếu phần tử đang hiện và dính ở đáy màn hình
    if(rect.height > 0 && rect.bottom >= window.innerHeight - 10){
      maxH = Math.max(maxH, rect.height);
    }
  });

  const baseBottom = 16;
  // Set bottom offset an toàn
  root.style.bottom = (baseBottom + maxH + CFG.bottomOffset) + "px";
}

function openChat(){
  if(isOpen) return; $("#mta-card").classList.add("open"); $("#mta-backdrop").classList.add("show");
  $("#mta-bubble").style.transform="scale(0)"; isOpen=true; renderSess();
  if(window.innerWidth > 480) setTimeout(()=>$("#mta-in").focus(), 160);
  handleViewport();
}
function closeChat(){
  if(!isOpen) return; $("#mta-card").classList.remove("open"); $("#mta-backdrop").classList.remove("show");
  $("#mta-bubble").style.transform="scale(1)"; isOpen=false; hideTyping(); document.activeElement?.blur();
}

function bindEvents(){
  $("#mta-bubble").addEventListener("click", openChat);
  $("#mta-backdrop").addEventListener("click", closeChat);
  $("#mta-close").addEventListener("click", closeChat);
  $("#mta-send").addEventListener("click", ()=>{ const i=$("#mta-in"); const v=i.value.trim(); if(v){ i.value=""; sendUser(v); i.focus(); } });
  $("#mta-in").addEventListener("keydown", e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); const v=e.target.value.trim(); if(v){ e.target.value=""; sendUser(v); } } });
  
  if(window.visualViewport){ window.visualViewport.addEventListener("resize", handleViewport); window.visualViewport.addEventListener("scroll", handleViewport); }
  window.addEventListener("resize", handleViewport);
  
  // Chạy Auto Dodge khi load và resize
  autoDodge(); window.addEventListener("resize", autoDodge);

  const track=$("#mta-tags");
  if(track){ track.querySelectorAll("button").forEach(btn=> btn.addEventListener("click", ()=>{ sendUser(btn.dataset.q||btn.textContent); })); }
}

function ready(fn){ if(document.readyState==="complete"||document.readyState==="interactive") fn(); else document.addEventListener("DOMContentLoaded", fn); }

ready(async ()=>{
  const lastClean = parseInt(localStorage.getItem(K.clean)||0);
  if(!lastClean || (Date.now()-lastClean) > 7*24*3600*1000){ localStorage.removeItem(K.ctx); localStorage.setItem(K.clean, Date.now()); }
  const wrap=document.createElement("div"); wrap.innerHTML=HTML; document.body.appendChild(wrap.firstElementChild);
  const st=document.createElement("style"); st.textContent=CSS; document.head.appendChild(st);
  bindEvents(); mergeAutoPrices();
  if(CFG.autolearn){ try{ const origins = Array.from(new Set([location.origin, ...(CFG.extraSites||[])])); const last = parseInt(localStorage.getItem(K.stamp)||0); if(!last || (Date.now()-last) >= CFG.refreshHours*3600*1000){ await learnSites(origins, false); } }catch(e){} }
});

window.MotoAI_v41 = {
  open: openChat, close: closeChat, send: (t)=> sendUser(t),
  learnNow: async (sites, force)=>{ const list = Array.isArray(sites)&&sites.length?sites:([location.origin, ...(CFG.extraSites||[])]); return await learnSites(Array.from(new Set(list)), !!force); },
  getIndex: getIndexFlat,
  clearLearnCache: ()=> { try{ localStorage.removeItem(K.learn); localStorage.removeItem(K.autoprices); localStorage.removeItem(K.dbg);}catch{} },
  debugDump: ()=> ({stats: loadStatsAll(), indexSize: getIndexFlat().length})
};
})();
