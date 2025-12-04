/* motoai_v40_full_mobile.js
 ✅ UPDATE v40: FULL FEATURES + MOBILE UI FIX
 
 [CORE FEATURES - GIỮ NGUYÊN TỪ V38]:
 - AutoLearn: ưu tiên moto_sitemap.json; fallback sitemap.xml / crawl nông (BFS)
 - Học NHIỀU site (extraSites) + cache per-domain (localStorage)
 - BM25 mini + Extractive QA (chích câu “đinh”)
 - Auto-Price Learn (trích giá từ HTML) + nhập về PRICE_TABLE (percentile)
 
 [UI/UX UPGRADE - MOBILE FIRST]:
 - iOS Fix: Input font-size 16px (chống zoom tự động).
 - VisualViewport: Tính toán chiều cao thực tế khi bàn phím bật để không che input/header.
 - Bottom Sheet: Giao diện dính đáy, full width trên mobile.
 
 Public API: window.MotoAI_v40.{open,close,send,learnNow,getIndex,clearLearnCache,debugDump}
*/
(function(){
if (window.MotoAI_v40_LOADED) return;
window.MotoAI_v40_LOADED = true;

/* ====== CONFIG ====== */
const DEF = {
  brand: "Nguyen Tu",
  phone: "0942467674",
  zalo:  "",
  map:   "",
  avatar: "👩‍💼",
  themeColor: "#0084FF",

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

  // Smart flags
  smart: {
    semanticSearch: true,   // BM25
    extractiveQA:   true,   // chích câu “đinh”
    autoPriceLearn: true    // trích giá từ HTML
  },

  // Debug / profiling
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

/* ====== STORAGE KEYS ====== */
const K = {
  sess:  "MotoAI_v40_session",
  ctx:   "MotoAI_v40_ctx",
  learn: "MotoAI_v40_learn",      
  autoprices: "MotoAI_v40_auto_prices",
  stamp: "MotoAI_v40_learnStamp",
  clean: "MotoAI_v40_lastClean",
  dbg:   "MotoAI_v40_debug_stats"
};

/* ====== UI UPGRADE (MOBILE OPTIMIZED) ====== */
const CSS = `
:root{
  --mta-z: 2147483647;
  --m-blue: ${CFG.themeColor};
  --m-bg: #fff;
  --m-text: #0b1220;

  /* Input sizing: 16px is CRITICAL for iOS to prevent auto-zoom */
  --m-in-h: 44px;
  --m-in-fs: 16px;
  --m-send-size: 38px;

  /* Dynamic Viewport Variables */
  --m-vv-height: 100vh;
  --m-vv-offset: 0px;
}

#mta-root {
  position: fixed; right: 20px; bottom: 20px;
  z-index: var(--mta-z);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* Bubble Button */
#mta-bubble {
  width: 60px; height: 60px; border: none; border-radius: 50%;
  background: linear-gradient(135deg, var(--m-blue), #00B2FF);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 24px rgba(0, 132, 255, 0.35);
  cursor: pointer; transition: transform 0.2s;
  font-size: 28px; color: #fff;
}
#mta-bubble:hover { transform: scale(1.05); }
#mta-bubble:active { transform: scale(0.95); }

/* Backdrop */
#mta-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.3);
  opacity: 0; pointer-events: none; transition: opacity 0.25s ease;
  backdrop-filter: blur(2px);
  z-index: -1;
}
#mta-backdrop.show { opacity: 1; pointer-events: auto; }

/* Main Card - Desktop Default */
#mta-card {
  position: fixed;
  right: 20px; bottom: 90px;
  width: 380px; max-width: calc(100vw - 40px);
  height: 650px; max-height: calc(85vh - 20px);
  background: var(--m-bg); color: var(--m-text);
  border-radius: 20px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.2);
  display: flex; flex-direction: column; overflow: hidden;
  transform: translateY(20px) scale(0.95); opacity: 0; pointer-events: none;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: bottom right;
}
#mta-card.open { transform: translateY(0) scale(1); opacity: 1; pointer-events: auto; }

/* Header */
#mta-header { background: linear-gradient(135deg, var(--m-blue), #00B2FF); color: #fff; flex-shrink: 0; }
#mta-header .bar { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
#mta-header .avatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 18px; }
#mta-header .info { flex: 1; min-width: 0; }
#mta-header .name { font-weight: 700; font-size: 15px; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#mta-header .status { font-size: 12px; opacity: 0.9; display: flex; align-items: center; gap: 4px; }
#mta-header .status-dot { width: 7px; height: 7px; border-radius: 50%; background: #4bff7d; box-shadow: 0 0 4px rgba(75, 255, 125, 0.6); }
#mta-header .actions { display: flex; gap: 8px; }
#mta-header .act { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; color: #fff; text-decoration: none; font-size: 16px; transition: background 0.2s; }
#mta-header .act:hover { background: rgba(255,255,255,0.3); }
#mta-close { background: none; border: none; color: #fff; font-size: 24px; cursor: pointer; padding: 0 4px; opacity: 0.8; }
#mta-close:hover { opacity: 1; }

/* Chat Body */
#mta-body {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  background: #f4f6f9;
  padding: 16px 12px;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}
.m-msg { max-width: 80%; margin: 6px 0; padding: 10px 14px; border-radius: 18px; font-size: 15px; line-height: 1.5; word-wrap: break-word; position: relative; animation: mta-pop 0.2s ease-out; }
@keyframes mta-pop { from{ opacity: 0; transform: translateY(5px); } to{ opacity: 1; transform: translateY(0); } }
.m-msg.bot { background: #fff; color: #1d1d1d; border-bottom-left-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.m-msg.user { background: var(--m-blue); color: #fff; margin-left: auto; border-bottom-right-radius: 4px; box-shadow: 0 1px 4px rgba(0,132,255,0.3); }

/* Tags */
#mta-tags { background: #fff; border-top: 1px solid #eee; flex-shrink: 0; transition: max-height 0.2s, opacity 0.2s; max-height: 60px; overflow: hidden; opacity: 1; }
#mta-tags.hidden { max-height: 0; opacity: 0; padding: 0; margin: 0; pointer-events: none; }
#mta-tags .track { display: flex; overflow-x: auto; padding: 10px; gap: 8px; scrollbar-width: none; }
#mta-tags .track::-webkit-scrollbar { display: none; }
#mta-tags button { white-space: nowrap; background: #f0f2f5; border: 1px solid transparent; border-radius: 16px; padding: 6px 14px; font-size: 13px; color: #444; cursor: pointer; transition: all 0.2s; }
#mta-tags button:active { background: #e4e6eb; transform: scale(0.96); }

/* Input Area */
#mta-input {
  background: #fff; padding: 10px; border-top: 1px solid #f0f0f0;
  display: flex; gap: 8px; align-items: center; flex-shrink: 0;
  /* An toan tren iPhone X+ */
  padding-bottom: max(10px, env(safe-area-inset-bottom));
}
#mta-in {
  flex: 1; height: var(--m-in-h); border-radius: 22px; border: 1px solid #ddd;
  padding: 0 16px; font-size: var(--m-in-fs); background: #f9f9f9; outline: none;
  transition: border-color 0.2s; color: #333;
}
#mta-in:focus { border-color: var(--m-blue); background: #fff; }
#mta-send {
  width: var(--m-send-size); height: var(--m-send-size); border-radius: 50%; border: none;
  background: var(--m-blue); color: #fff; font-size: 16px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: transform 0.2s;
}
#mta-send:active { transform: scale(0.9); }

/* Typing Indicator */
#mta-typing { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; background: #fff; border-radius: 14px; margin-bottom: 8px; font-size: 12px; color: #888; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
#mta-typing span { width: 4px; height: 4px; background: #bbb; border-radius: 50%; animation: mta-blink 1.4s infinite both; }
#mta-typing span:nth-child(2) { animation-delay: 0.2s; }
#mta-typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes mta-blink { 0%, 80%, 100% { opacity: 0; } 40% { opacity: 1; } }

/* ====== MOBILE SPECIFIC (WIDTH < 480px) ====== */
@media (max-width: 480px) {
  #mta-root {
    right: 0; left: 0; bottom: 0;
  }
  #mta-bubble {
    position: absolute; right: 16px; bottom: calc(16px + env(safe-area-inset-bottom));
  }
 
  /* Card chuyen thanh Bottom Sheet */
  #mta-card {
    right: 0; left: 0; bottom: 0;
    width: 100%; max-width: 100%;
    border-radius: 16px 16px 0 0;
    transform: translateY(100%);
   
    /* QUAN TRONG: Chieu cao dua tren Visual Viewport de tranh ban phim che */
    height: var(--m-vv-height);
    max-height: 85vh;
  }
 
  #mta-card.open {
    transform: translateY(0);
  }

  /* Khi ban phim mo, Card se full chieu cao Visual Viewport */
  body.mta-kb-open #mta-card {
     max-height: none;
     height: var(--m-vv-height);
     border-radius: 0;
  }
  #mta-close { font-size: 28px; padding: 4px 12px; }
}

@media(prefers-color-scheme:dark){
  :root{--m-bg:#1a1c20;--m-text:#ecf0f5}
  #mta-card{border:1px solid #333}
  #mta-body{background:#111}
  .m-msg.bot{background:#262626;color:#fff}
  #mta-tags{background:#1a1c20;border-top:1px solid #333}
  #mta-tags button{background:#2a2a2a;color:#ddd}
  #mta-input{background:#1a1c20;border-top:1px solid #333}
  #mta-in{background:#2a2a2a;border-color:#444;color:#fff}
}`;

const HTML = `
<div id="mta-root" aria-live="polite">
  <button id="mta-bubble" aria-label="Mở chat cùng ${CFG.brand}">💬</button>
  <div id="mta-backdrop"></div>
  <section id="mta-card" role="dialog" aria-label="Chat ${CFG.brand}" aria-hidden="true">
    <header id="mta-header">
      <div class="bar">
        <div class="avatar">${CFG.avatar||"👩‍💼"}</div>
        <div class="info">
          <div class="name">${CFG.brand} — Đang hoạt động</div>
          <div class="status"><span class="status-dot"></span>Trực tuyến</div>
        </div>
        <div class="actions">
          ${CFG.phone?`<a class="act" href="tel:${CFG.phone}" title="Gọi nhanh">📞</a>`:""}
          ${CFG.zalo?`<a class="act" href="${CFG.zalo}" target="_blank" rel="noopener" title="Zalo">Z</a>`:""}
          ${CFG.map?`<a class="act q-map" href="${CFG.map}" target="_blank" rel="noopener" title="Bản đồ">📍</a>`:""}
        </div>
        <button id="mta-close" aria-label="Đóng">×</button>
      </div>
    </header>
    <main id="mta-body" role="log"></main>
    <div id="mta-tags" role="toolbar" aria-label="Gợi ý nhanh">
      <div class="track" id="mta-tag-track">
        <button data-q="Giá thuê xe máy">💰 Giá thuê</button>
        <button data-q="Thuê xe ga">🛵 Xe ga</button>
        <button data-q="Thuê xe số">🏍 Xe số</button>
        <button data-q="Thuê theo tháng">📆 Theo tháng</button>
        <button data-q="Giao xe tận nơi">🚚 Giao tận nơi</button>
        <button data-q="Thủ tục">📄 Thủ tục</button>
      </div>
    </div>
    <footer id="mta-input">
      <input id="mta-in" placeholder="Nhắn cho ${CFG.brand}..." autocomplete="off" />
      <button id="mta-send" aria-label="Gửi tin">➤</button>
    </footer>
  </section>
</div>`;

/* ====== SESSION / CONTEXT ====== */
const MAX_MSG = 10;
function getSess(){ const arr = safe(localStorage.getItem(K.sess))||[]; return Array.isArray(arr)?arr:[]; }
function saveSess(a){ try{ localStorage.setItem(K.sess, JSON.stringify(a.slice(-MAX_MSG))); }catch{} }

function scrollToBottom(){
   const body=$("#mta-body");
   if(body) setTimeout(() => body.scrollTop = body.scrollHeight, 50);
}

function addMsg(role,text){
  if(!text) return;
  const body=$("#mta-body"); if(!body) return;
  const el=document.createElement("div"); el.className="m-msg "+(role==="user"?"user":"bot"); el.textContent=text;
  body.appendChild(el);
  scrollToBottom();
  const arr=getSess(); arr.push({role,text,t:Date.now()}); saveSess(arr);
}

function renderSess(){
  const body=$("#mta-body"); body.innerHTML="";
  const arr=getSess();
  if(arr.length) arr.forEach(m=> addMsg(m.role,m.text));
  else addMsg("bot", naturalize(`Xin chào 👋, em là nhân viên hỗ trợ của ${CFG.brand}. Anh/chị cần thuê xe số, xe ga hay theo tháng?`));
}

function getCtx(){ return safe(localStorage.getItem(K.ctx)) || {turns:[]}; }
function pushCtx(delta){
  try{
    const ctx=getCtx(); ctx.turns.push(Object.assign({t:Date.now()}, delta||{}));
    ctx.turns = ctx.turns.slice(-clamp(CFG.maxContextTurns||5,3,8));
    localStorage.setItem(K.ctx, JSON.stringify(ctx));
  }catch{}
}

/* ====== NLP (loại xe / số ngày) ====== */
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

/* ====== SIMPLE INDEX + BM25 mini ====== */
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

/* ====== FETCH / PARSE ====== */
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

/* ====== DEBUG COUNTERS ====== */
function newDomainStats(domain){
  return {
    domain, startedAt: Date.now(), durationMs: 0, urlsSeen: 0, pagesKept: 0, txtPages: 0, htmlPages: 0, nonVNSkipped: 0, noindexSkipped: 0, autoPriceHits: 0
  };
}
function finishStats(st){ st.durationMs = Date.now() - st.startedAt; return st; }
function saveStatsAll(all){ try{ localStorage.setItem(K.dbg, JSON.stringify(all)); }catch{} }
function loadStatsAll(){ return safe(localStorage.getItem(K.dbg)) || {}; }

async function readSitemap(url){
  const xml = await fetchText(url); if(!xml) return [];
  const doc = parseXML(xml); if(!doc) return [];
  const items = Array.from(doc.getElementsByTagName('item'));
  if(items.length){
    return items.map(it=> it.getElementsByTagName('link')[0]?.textContent?.trim()).filter(Boolean);
  }
  const sm = Array.from(doc.getElementsByTagName('sitemap'))
    .map(x=> x.getElementsByTagName('loc')[0]?.textContent?.trim()).filter(Boolean);
  if(sm.length){
    const all=[]; for(const loc of sm){ try{ const child = await readSitemap(loc); if(child && child.length) all.push(...child); }catch{} }
    return Array.from(new Set(all));
  }
  const urls = Array.from(doc.getElementsByTagName('url'))
    .map(u=> u.getElementsByTagName('loc')[0]?.textContent?.trim()).filter(Boolean);
  return urls;
}

async function fallbackCrawl(origin){
  const start = origin.endsWith('/')? origin : origin + '/';
  const html = await fetchText(start); if(!html) return [start];
  const doc = parseHTML(html); if(!doc) return [start];
  const links = Array.from(doc.querySelectorAll('a[href]')).map(a=> a.getAttribute('href')).filter(Boolean);
  const set = new Set([start]);
  for(const href of links){
    try{
      const u = new URL(href, start).toString().split('#')[0];
      if(sameHost(u, origin)) set.add(u);
      if(set.size>=40) break;
    }catch{}
  }
  return Array.from(set);
}

async function pullPages(urls, stats){
  const out=[];
  stats.urlsSeen += urls.length;
  for(const u of urls.slice(0, CFG.maxPagesPerDomain)){
    const txt = await fetchText(u); if(!txt) continue;
    if (/\bname=(?:"|')robots(?:"|')[^>]*content=(?:"|')[^"']*noindex/i.test(txt)) { stats.noindexSkipped++; continue; }
   
    let title = (txt.match(/<title[^>]*>([^<]+)<\/title>/i)||[])[1]||"";
    title = title.replace(/\s+/g,' ').trim();
    let desc = (txt.match(/<meta[^>]+name=(?:"|')description(?:"|')[^>]+content=(?:"|')([\s\S]*?)(?:"|')/i)||[])[1]||"";
    if(!desc){
      desc = txt.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ')
                .replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,600);
    }
    const sample = (title+' '+desc).toLowerCase();
    if(CFG.viOnly && !looksVN(sample)) { stats.nonVNSkipped++; await sleep(CFG.fetchPauseMs); continue; }

    if(CFG.smart.autoPriceLearn){
      try{
        const autos = extractPricesFromText(txt);
        if(autos && autos.length){
          stats.autoPriceHits += autos.length;
          const stash = safe(localStorage.getItem(K.autoprices))||[];
          stash.push(...autos.map(a=> Object.assign({url:u}, a)));
          localStorage.setItem(K.autoprices, JSON.stringify(stash.slice(-500)));
        }
      }catch{}
    }

    stats.htmlPages++;
    out.push({url:u, title, text:desc});
    stats.pagesKept++;
    await sleep(CFG.fetchPauseMs);
  }
  return out;
}

/* ====== AUTOLEARN ====== */
function loadLearnCache(){ return loadLearn(); }
function saveLearnCache(obj){ saveLearn(obj); }
function isExpired(ts, hrs){ if(!ts) return true; return ((nowSec()-ts)/3600) >= (hrs||CFG.refreshHours); }

async function learnOneOrigin(origin, stats){
  try{
    const key = new URL(origin).origin;
    // 1) moto_sitemap.json
    const candidatesJSON = [
      key + "/moto_sitemap.json",
      location.origin + (location.pathname.replace(/\/[^\/]*$/,'') || '') + "/moto_sitemap.json"
    ];
    for(const j of Array.from(new Set(candidatesJSON))){
      try{
        const r = await fetch(j);
        if(r && r.ok){
          const json = await r.json();
          const ds = [ ...(json.categories?.datasets?.list || []), ...(json.categories?.pages?.list || []) ];
          const pages = []; stats.urlsSeen += ds.length;
          for(const u of ds){
            const txt = await fetchText(u); if(!txt) continue;
            if(/\.txt($|\?)/i.test(u)){
              const title = u.split("/").slice(-1)[0];
              const text  = txt.replace(/\s+/g," ").trim().slice(0,2000);
              pages.push({url:u,title,text}); stats.txtPages++; stats.pagesKept++;
            }else{
              let title=(txt.match(/<title[^>]*>([^<]+)<\/title>/i)||[])[1]||""; title=title.replace(/\s+/g,' ').trim();
              let desc=(txt.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"]+)["']/i)||[])[1]||"";
              if(!desc) desc = txt.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,600);
              const sample=(title+' '+desc).toLowerCase();
              if(CFG.viOnly && !looksVN(sample)) { stats.nonVNSkipped++; continue; }
              if(CFG.smart.autoPriceLearn){
                const autos = extractPricesFromText(txt);
                if(autos && autos.length){
                  stats.autoPriceHits += autos.length;
                  const stash = safe(localStorage.getItem(K.autoprices))||[];
                  stash.push(...autos.map(a=> Object.assign({url:u}, a)));
                  localStorage.setItem(K.autoprices, JSON.stringify(stash.slice(-500)));
                }
              }
              pages.push({url:u,title,text:desc}); stats.htmlPages++; stats.pagesKept++;
            }
            if(pages.length >= CFG.maxPagesPerDomain) break;
            await sleep(CFG.fetchPauseMs);
          }
          if(pages.length) return {domain:j, ts: nowSec(), pages};
        }
      }catch{}
    }
    // 2) Sitemap XML / Crawl
    let urls=[];
    const smc = [key+'/sitemap.xml', key+'/sitemap_index.xml'];
    for(const c of smc){ try{ const u=await readSitemap(c); if(u && u.length){ urls=u; break; } }catch{} }
    if(!urls.length) urls = await fallbackCrawl(key);
    const uniq = Array.from(new Set(urls.map(u=>{ try{ return new URL(u).toString().split('#')[0]; }catch{ return null; } }).filter(Boolean).filter(u=> sameHost(u, key))));
    const pages = await pullPages(uniq, stats);
    return {domain:key, ts: nowSec(), pages};
  }catch(e){ return null; }
}

async function learnSites(origins, force){
  const list = Array.from(new Set(origins||[])).slice(0, 12);
  const cache = loadLearnCache(); const results = {}; let total=0;
  const allStats = loadStatsAll();

  for(const origin of list){
    try{
      const key = new URL(origin).origin;
      const stats = newDomainStats(key);
      const cached = cache[key];
      if(!force && cached && !isExpired(cached.ts, CFG.refreshHours) && cached.pages?.length){
        results[key] = cached; total += cached.pages.length;
        stats.pagesKept = cached.pages.length; finishStats(stats); allStats[key] = stats; saveStatsAll(allStats);
        if(total>=CFG.maxTotalPages) break; continue;
      }
      const data = await learnOneOrigin(origin, stats);
      finishStats(stats); allStats[key] = stats; saveStatsAll(allStats);
      if(data && data.pages?.length){
        cache[key] = data;
        try{ saveLearnCache(cache); } catch(e){ const ks=Object.keys(cache); if(ks.length) delete cache[ks[0]]; saveLearnCache(cache); }
        results[key] = data; total += data.pages.length;
      }
      if(total >= CFG.maxTotalPages) break;
    }catch(e){}
    await sleep(CFG.fetchPauseMs);
  }
  if(CFG.debug) console.table(Object.values(allStats));
  localStorage.setItem(K.stamp, Date.now());
  return results;
}

/* ====== ANSWER ENGINE ====== */
const PREFIX = ["Chào anh/chị,","Xin chào 👋,","Em chào anh/chị,","Em ở "+CFG.brand+" đây,"];
function polite(s){ s = s || "em chưa nhận được câu hỏi, anh/chị nhập lại giúp em."; return naturalize(`${pick(PREFIX)} ${s}`); }

function composePrice(type, qty){
  if(!type) type = 'xe số';
  if(!qty)  return naturalize(`Anh/chị thuê ${type} theo ngày, tuần hay tháng để em báo đúng giá nhé.`);
  const base = baseFor(type, qty.unit);
  if(!base)  return naturalize(`Giá thuê ${type} theo ${qty.unit} cần kiểm tra. Anh/chị nhắn Zalo ${CFG.phone} để em chốt theo mẫu xe.`);
  const total = base * qty.n;
  const label = qty.unit==="ngày"?"ngày":(qty.unit==="tuần"?"tuần":"tháng");
  let text = qty.n===1 ? `Giá thuê ${type} 1 ${label} khoảng ${nfVND(base)}đ` : `Giá thuê ${type} ${qty.n} ${label} khoảng ${nfVND(total)}đ`;
  if(qty.unit==="ngày" && qty.n>=3) text += " Nếu thuê theo tuần sẽ tiết kiệm hơn";
  return naturalize(`${text}. Anh/chị cần em giữ xe và gửi ảnh xe qua Zalo ${CFG.phone} không?`);
}

async function deepAnswer(userText){
  const q = (userText||"").trim();
  const intents = detectIntent(q);
  let type = detectType(q);
  const qty  = detectQty(q);
  // Deep context
  if(CFG.deepContext){
    const ctx = getCtx();
    for(let i=ctx.turns.length-1;i>=0;i--){
      const t = ctx.turns[i];
      if(!type && t.type) type=t.type;
      if(!qty && t.qty)   return composePrice(type||t.type, t.qty);
      if(type && qty) break;
    }
  }
  if(intents.needContact) return polite(`anh/chị gọi ${CFG.phone} hoặc Zalo ${CFG.zalo||CFG.phone} là có người nhận ngay.`);
  if(intents.needDocs)    return polite(`thủ tục gọn: CCCD/hộ chiếu + cọc theo xe. Có phương án giảm cọc khi đủ giấy tờ.`);
  if(intents.needPolicy)  return polite(`đặt cọc tham khảo: xe số 2–3 triệu; xe ga 2–5 triệu; 50cc khoảng 4 triệu. Liên hệ Zalo ${CFG.phone} để chốt theo mẫu xe.`);
  if(intents.needDelivery)return polite(`thuê 1–4 ngày vui lòng đến cửa hàng chọn xe; thuê tuần/tháng em giao tận nơi. Phí nội thành 20–100k tuỳ quận. Nhắn Zalo ${CFG.phone} để em set lịch.`);
  if(intents.needReturn)  return polite(`trả xe tại cửa hàng hoặc hẹn trả tận nơi (thoả thuận). Báo trước 30 phút để em sắp xếp, hoàn cọc nhanh.`);
  if(intents.needPrice)   return composePrice(type, qty);

  // Semantic retrieval
  try{
    const top = searchIndex(q, 3);
    if(top && top.length){
      const t0 = top[0];
      if(CFG.smart.extractiveQA){
        const sn = bestSentences((t0.title? (t0.title+'. ') : '') + (t0.text||''), q, 2).join(' ');
        if(sn) return naturalize(`${sn} — Xem thêm: ${t0.url}`);
      }
      const fallback = ((t0.title? (t0.title+' — ') : '') + (t0.text||'')).slice(0,180);
      return polite(`${fallback} ... Xem thêm: ${t0.url}`);
    }
  }catch(e){}
  if(/(chào|xin chào|hello|hi|alo)/i.test(q)) return polite(`em là nhân viên hỗ trợ của ${CFG.brand}. Anh/chị muốn xem 🏍️ Xe số, 🛵 Xe ga, ⚡ Xe điện hay 📄 Thủ tục thuê xe?`);
  return polite(`anh/chị quan tâm loại xe nào (xe số, Vision, Air Blade, 50cc, côn tay…) và thuê mấy ngày để em báo giá phù hợp.`);
}

function mergeAutoPrices(){
  if(!CFG.smart.autoPriceLearn) return;
  try{
    const autos = safe(localStorage.getItem(K.autoprices))||[];
    if(!autos.length) return;
    const byType = autos.reduce((m,a)=>{ (m[a.type]||(m[a.type]=[])).push(a.price); return m; },{});
    Object.keys(byType).forEach(t=>{
      const arr = byType[t].sort((a,b)=>a-b);
      const p25 = arr[Math.floor(arr.length*0.25)];
      const p50 = arr[Math.floor(arr.length*0.50)];
      if(PRICE_TABLE[t]){
        const dayRange = [p25, p50].filter(Boolean);
        if(dayRange.length) PRICE_TABLE[t].day = dayRange;
      }
    });
  }catch{}
}

/* ====== SEND / UI CONTROL ====== */
let isOpen=false, sending=false;
function showTyping(){
  const body=$("#mta-body"); if(!body) return;
  const box=document.createElement("div"); box.id="mta-typing"; box.innerHTML=`<span></span><span></span><span></span>`;
  body.appendChild(box); scrollToBottom();
}
function hideTyping(){ const t=$("#mta-typing"); if(t) t.remove(); }
function ensureInputVisible(){
  const inp=$("#mta-in"); if(inp) try{ inp.scrollIntoView({block:'nearest', inline:'nearest'}); }catch{}
  scrollToBottom();
}

async function sendUser(text){
  if(sending) return;
  const v=(text||"").trim(); if(!v) return;
  sending=true; addMsg("user", v);
 
  // Hide tags on mobile if typing
  if(window.innerWidth < 480) $("#mta-tags")?.classList.add("hidden");

  pushCtx({from:"user", raw:v, type:detectType(v), qty:detectQty(v)});
  const isMobile = window.innerWidth < 480; const wait = (isMobile? 1200 : 1800) + Math.random()*500;
  showTyping(); await sleep(wait);
  const ans = await deepAnswer(v);
  hideTyping(); addMsg("bot", ans); pushCtx({from:"bot", raw:ans});
  sending=false; ensureInputVisible();
}

/* ====== MOBILE VIEWPORT HANDLE ====== */
function handleViewport(){
   if(!window.visualViewport) return;
   const vv = window.visualViewport;
   const root = $("#mta-root");
   
   // Set variable height thuc te
   root.style.setProperty('--m-vv-height', vv.height + 'px');
   root.style.setProperty('--m-vv-offset', vv.offsetTop + 'px');

   const isMobile = window.innerWidth < 480;
   const isKeyboardOpen = isMobile && (vv.height < window.innerHeight * 0.85);

   if(isKeyboardOpen){
       document.body.classList.add('mta-kb-open');
       setTimeout(scrollToBottom, 100);
   } else {
       document.body.classList.remove('mta-kb-open');
   }
}

function openChat(){
  if(isOpen) return;
  $("#mta-card").classList.add("open");
  $("#mta-backdrop").classList.add("show");
  $("#mta-bubble").style.transform="scale(0)";
  isOpen=true; renderSess();
 
  if(window.innerWidth > 480) setTimeout(()=>$("#mta-in").focus(), 160);
  handleViewport();
}
function closeChat(){
  if(!isOpen) return;
  $("#mta-card").classList.remove("open");
  $("#mta-backdrop").classList.remove("show");
  $("#mta-bubble").style.transform="scale(1)";
  isOpen=false; hideTyping();
  document.activeElement?.blur();
}

function bindEvents(){
  $("#mta-bubble").addEventListener("click", openChat);
  $("#mta-backdrop").addEventListener("click", closeChat);
  $("#mta-close").addEventListener("click", closeChat);
  $("#mta-send").addEventListener("click", ()=>{ const i=$("#mta-in"); const v=i.value.trim(); if(v){ i.value=""; sendUser(v); i.focus(); } });

  const inp = $("#mta-in");
  inp.addEventListener("keydown", e=>{
    if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); const v=e.target.value.trim(); if(v){ e.target.value=""; sendUser(v); } }
  });
 
  // iOS Visual Viewport hooks
  if(window.visualViewport){
    window.visualViewport.addEventListener("resize", handleViewport);
    window.visualViewport.addEventListener("scroll", handleViewport);
  }
  window.addEventListener("resize", handleViewport);

  const track=$("#mta-tag-track");
  if(track){
     track.querySelectorAll("button").forEach(btn=> btn.addEventListener("click", ()=>{
         sendUser(btn.dataset.q||btn.textContent);
     }));
  }
}

function maybeDisableQuickMap(){ if(CFG.disableQuickMap){ const m=$(".q-map"); if(m){ m.removeAttribute("href"); m.style.opacity=".4"; m.style.pointerEvents="none"; } } }
function ready(fn){ if(document.readyState==="complete"||document.readyState==="interactive") fn(); else document.addEventListener("DOMContentLoaded", fn); }

/* ====== BOOT ====== */
ready(async ()=>{
  const lastClean = parseInt(localStorage.getItem(K.clean)||0);
  if(!lastClean || (Date.now()-lastClean) > 7*24*3600*1000){
    localStorage.removeItem(K.ctx); localStorage.setItem(K.clean, Date.now());
  }
  const wrap=document.createElement("div"); wrap.innerHTML=HTML; document.body.appendChild(wrap.firstElementChild);
  const st=document.createElement("style"); st.textContent=CSS; document.head.appendChild(st);
  bindEvents(); maybeDisableQuickMap(); mergeAutoPrices();

  if(CFG.autolearn){
    try{
      const origins = Array.from(new Set([location.origin, ...(CFG.extraSites||[])]));
      const last = parseInt(localStorage.getItem(K.stamp)||0);
      if(!last || (Date.now()-last) >= CFG.refreshHours*3600*1000){
        if(CFG.debug) console.log("%cMotoAI v40: Learning...","color:orange");
        await learnSites(origins, false);
      }
    }catch(e){}
  }
});

window.MotoAI_v40 = {
  open: openChat, close: closeChat, send: (t)=> sendUser(t),
  learnNow: async (sites, force)=>{
    const list = Array.isArray(sites)&&sites.length?sites:([location.origin, ...(CFG.extraSites||[])]);
    return await learnSites(Array.from(new Set(list)), !!force);
  },
  getIndex: getIndexFlat,
  clearLearnCache: ()=> { try{ localStorage.removeItem(K.learn); localStorage.removeItem(K.autoprices); localStorage.removeItem(K.dbg);}catch{} },
  debugDump: ()=> ({stats: loadStatsAll(), indexSize: getIndexFlat().length})
};
})();
