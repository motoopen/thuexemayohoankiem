/* =================================================================
   MOTOAI v38.2 FULL RELEASE (Brain v38.1 + UI v38.2)
   =================================================================
   1. LOGIC (Giữ nguyên v38.1):
      - AutoLearn Multi-site (Sitemap + BFS Crawl)
      - BM25 Search + Extractive QA
      - Auto-Price Learn (Trích xuất giá từ HTML)
      - Deep Context (Ghi nhớ ngữ cảnh hội thoại)
      - Debug Counters & Console.table

   2. UI/UX (Nâng cấp v38.2):
      - Fix Input Zoom iOS (Font 16px)
      - VisualViewport Logic (Chống bàn phím che input)
      - Auto Dark/Light Mode (System aware)
      - Bottom Sheet Animation (Mobile friendly)
   ================================================================= */

(function(){
  if (window.MotoAI_v38_LOADED) return;
  window.MotoAI_v38_LOADED = true;

  /* ================= CONFIGURATION ================= */
  const DEF = {
    brand: "Nguyen Tu",
    phone: "0942467674",
    zalo:  "",
    map:   "",
    avatar: "👩‍💼",
    themeColor: "#0084FF", // Màu chủ đạo

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

    smart: {
      semanticSearch: true,   // BM25
      extractiveQA:   true,   // Trích xuất câu trả lời
      autoPriceLearn: true    // Học giá tự động
    },

    debug: true
  };
  const ORG = (window.MotoAI_CONFIG||{});
  if(!ORG.zalo && (ORG.phone||DEF.phone)) ORG.zalo = 'https://zalo.me/' + String(ORG.phone||DEF.phone).replace(/\s+/g,'');
  const CFG = Object.assign({}, DEF, ORG);
  CFG.smart = Object.assign({}, DEF.smart, (ORG.smart||{}));


  /* ================= HELPERS ================= */
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

  /* ================= STORAGE KEYS ================= */
  const K = {
    sess:  "MotoAI_v38_session",
    ctx:   "MotoAI_v38_ctx",
    learn: "MotoAI_v38_learn",
    autoprices: "MotoAI_v38_auto_prices",
    stamp: "MotoAI_v38_learnStamp",
    clean: "MotoAI_v38_lastClean",
    dbg:   "MotoAI_v38_debug_stats"
  };

  /* ================= UI / UX (NEW v38.2) ================= */
  const CSS = `
  :root {
    --m-primary: ${CFG.themeColor};
    --m-bg: #ffffff;
    --m-text: #1f2937;
    --m-sub-text: #6b7280;
    --m-input-bg: #f3f4f6;
    --m-input-text: #111827;
    --m-border: #e5e7eb;
    --m-msg-bot: #f3f4f6;
    --m-msg-bot-text: #1f2937;
    --m-msg-user: var(--m-primary);
    --m-msg-user-text: #ffffff;
    --m-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    --m-z: 2147483647;
  }

  /* Dark Mode Support */
  @media (prefers-color-scheme: dark) {
    :root {
      --m-bg: #1f2937;
      --m-text: #f9fafb;
      --m-sub-text: #9ca3af;
      --m-input-bg: #374151;
      --m-input-text: #f9fafb;
      --m-border: #374151;
      --m-msg-bot: #374151;
      --m-msg-bot-text: #f3f4f6;
    }
  }

  #mta-root { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; z-index: var(--m-z); position: relative; }
  
  /* Bubble Button */
  #mta-bubble {
    position: fixed; right: 20px; bottom: 20px; width: 56px; height: 56px;
    background: linear-gradient(135deg, var(--m-primary), #00B2FF);
    border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 26px; z-index: var(--m-z); transition: transform 0.2s;
  }
  #mta-bubble:active { transform: scale(0.95); }

  /* Main Card (Responsive) */
  #mta-card {
    position: fixed; right: 20px; bottom: 20px;
    width: 380px; max-width: calc(100vw - 32px);
    height: 600px; max-height: 80vh;
    background: var(--m-bg); border-radius: 16px;
    box-shadow: var(--m-shadow);
    display: flex; flex-direction: column;
    z-index: var(--m-z);
    transform: translateY(120%); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    border: 1px solid var(--m-border); overflow: hidden;
  }
  #mta-card.open { transform: translateY(0); }

  /* Mobile: Bottom Sheet Style */
  @media (max-width: 480px) {
    #mta-bubble { right: 16px; bottom: 16px; }
    #mta-card {
      right: 0; left: 0; bottom: 0;
      width: 100%; max-width: 100%;
      height: 100%; /* Sẽ được VisualViewport override */
      max-height: none; border-radius: 16px 16px 0 0;
      border: none; border-top: 1px solid var(--m-border);
    }
  }

  /* Header */
  #mta-header {
    padding: 12px 16px; background: var(--m-bg);
    border-bottom: 1px solid var(--m-border);
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0;
  }
  .m-head-info { display: flex; align-items: center; gap: 10px; }
  .m-avatar { width: 32px; height: 32px; background: rgba(0,0,0,0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; }
  .m-title h3 { margin: 0; font-size: 15px; font-weight: 600; color: var(--m-text); }
  .m-title span { font-size: 11px; color: #10b981; display: block; margin-top: 2px; }
  .m-actions { display: flex; gap: 8px; }
  .m-btn-icon { width: 30px; height: 30px; border-radius: 50%; background: var(--m-input-bg); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--m-text); text-decoration: none; font-size: 14px; transition: background 0.2s; }
  .m-btn-icon:hover { background: var(--m-border); }

  /* Body */
  #mta-body {
    flex: 1; padding: 16px; overflow-y: auto; overflow-x: hidden;
    background: var(--m-bg); scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  }
  .m-msg { max-width: 80%; padding: 10px 14px; margin-bottom: 10px; border-radius: 18px; font-size: 14px; line-height: 1.5; word-wrap: break-word; }
  .m-msg.bot { background: var(--m-msg-bot); color: var(--m-msg-bot-text); border-bottom-left-radius: 4px; align-self: flex-start; }
  .m-msg.user { background: var(--m-msg-user); color: var(--m-msg-user-text); border-bottom-right-radius: 4px; margin-left: auto; }
  #mta-typing { font-size: 12px; color: var(--m-sub-text); margin-left: 10px; margin-bottom: 10px; font-style: italic; }

  /* Tags */
  #mta-tags { padding: 8px 16px; background: var(--m-bg); white-space: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; border-top: 1px solid var(--m-border); display: none; }
  #mta-tags.show { display: block; }
  #mta-tags::-webkit-scrollbar { display: none; }
  .m-tag { display: inline-block; padding: 6px 12px; margin-right: 8px; background: var(--m-input-bg); color: var(--m-text); border-radius: 99px; font-size: 13px; border: 1px solid transparent; cursor: pointer; user-select: none; }
  .m-tag:active { background: var(--m-border); }

  /* Input Area - Anti Zoom 16px */
  #mta-footer {
    padding: 10px 16px; background: var(--m-bg);
    border-top: 1px solid var(--m-border);
    display: flex; gap: 8px; align-items: center;
    flex-shrink: 0;
    padding-bottom: max(10px, env(safe-area-inset-bottom));
  }
  #mta-input-wrap {
    flex: 1; position: relative; display: flex; align-items: center;
    background: var(--m-input-bg); border-radius: 24px;
    border: 1px solid transparent; transition: border-color 0.2s;
  }
  #mta-input-wrap:focus-within { border-color: var(--m-primary); }
  
  #mta-in {
    width: 100%; border: none; background: transparent;
    padding: 10px 14px; 
    font-size: 16px; /* CRITICAL FOR IOS NO-ZOOM */
    line-height: 20px;
    color: var(--m-input-text); border-radius: 24px;
    outline: none; -webkit-appearance: none; margin: 0;
  }
  #mta-in::placeholder { color: var(--m-sub-text); opacity: 0.7; }
  
  #mta-send {
    width: 36px; height: 36px; border-radius: 50%; border: none;
    background: var(--m-primary); color: #fff;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; flex-shrink: 0; font-size: 16px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  }

  /* Backdrop */
  #mta-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 2147483646; opacity: 0; pointer-events: none; transition: opacity 0.3s; backdrop-filter: blur(1px); }
  #mta-backdrop.show { opacity: 1; pointer-events: auto; }
  `;

  const HTML = `
  <div id="mta-root">
    <button id="mta-bubble" aria-label="Chat">💬</button>
    <div id="mta-backdrop"></div>
    <div id="mta-card">
      <div id="mta-header">
        <div class="m-head-info">
          <div class="m-avatar">${CFG.avatar}</div>
          <div class="m-title">
            <h3>${CFG.brand}</h3>
            <span>● Trực tuyến</span>
          </div>
        </div>
        <div class="m-actions">
          ${CFG.phone ? `<a href="tel:${CFG.phone}" class="m-btn-icon" title="Gọi">📞</a>` : ''}
          ${CFG.zalo ? `<a href="${CFG.zalo}" target="_blank" class="m-btn-icon" title="Zalo">Z</a>` : ''}
          <button id="mta-close" class="m-btn-icon" title="Đóng">✕</button>
        </div>
      </div>
      <div id="mta-body"></div>
      <div id="mta-tags" class="show">
        <span class="m-tag" data-q="Giá thuê xe máy">💰 Giá thuê</span>
        <span class="m-tag" data-q="Thủ tục">📄 Thủ tục</span>
        <span class="m-tag" data-q="Thuê xe ga">🛵 Xe ga</span>
        <span class="m-tag" data-q="Thuê xe số">🏍 Xe số</span>
        <span class="m-tag" data-q="Giao xe tận nơi">🚚 Giao xe</span>
      </div>
      <div id="mta-footer">
        <div id="mta-input-wrap">
          <input id="mta-in" type="text" placeholder="Nhắn tin..." autocomplete="off">
        </div>
        <button id="mta-send">➤</button>
      </div>
    </div>
  </div>`;

  /* ================= SESSION & CONTEXT LOGIC ================= */
  const MAX_MSG = 15;
  function getSess(){ const arr = safe(localStorage.getItem(K.sess))||[]; return Array.isArray(arr)?arr:[]; }
  function saveSess(a){ try{ localStorage.setItem(K.sess, JSON.stringify(a.slice(-MAX_MSG))); }catch{} }
  
  function addMsg(role,text){
    if(!text) return;
    const body=$("#mta-body"); if(!body) return;
    const el=document.createElement("div"); 
    el.className="m-msg "+(role==="user"?"user":"bot"); 
    el.innerHTML=text.replace(/\n/g,"<br>");
    body.appendChild(el); body.scrollTop=body.scrollHeight;
    
    const arr=getSess(); arr.push({role,text,t:Date.now()}); saveSess(arr);
  }
  
  function renderSess(){
    const body=$("#mta-body"); body.innerHTML="";
    const arr=getSess();
    if(arr.length) arr.forEach(m=> addMsg(m.role,m.text));
    else addMsg("bot", naturalize(`Xin chào 👋, em là AI hỗ trợ của ${CFG.brand}. Anh/chị cần thuê xe số, xe ga hay tư vấn thủ tục ạ?`));
  }

  function getCtx(){ return safe(localStorage.getItem(K.ctx)) || {turns:[]}; }
  function pushCtx(delta){
    try{
      const ctx=getCtx(); ctx.turns.push(Object.assign({t:Date.now()}, delta||{}));
      ctx.turns = ctx.turns.slice(-clamp(CFG.maxContextTurns||5,3,8));
      localStorage.setItem(K.ctx, JSON.stringify(ctx));
    }catch{}
  }

  /* ================= CORE LOGIC: NLP, PRICING, CRAWL (From v38.1) ================= */
  
  /* --- NLP --- */
  const TYPE_MAP = [
    {k:'xe số',     re:/xe số|wave|blade|sirius|jupiter|future|dream/i},
    {k:'xe ga',     re:/xe ga|vision|air\s*blade|lead|liberty|vespa|grande|janus|sh\b/i},
    {k:'air blade', re:/air\s*blade|airblade|ab\b/i},
    {k:'vision',    re:/vision/i},
    {k:'xe điện',   re:/xe điện|vinfast|yadea|dibao|klara|evo/i},
    {k:'50cc',      re:/50\s*cc|xe 50/i},
    {k:'xe côn tay',re:/côn tay|tay côn|exciter|winner|raider/i}
  ];
  function detectType(t){ for(const it of TYPE_MAP){ if(it.re.test(t)) return it.k; } return null; }
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

  /* --- PRICE TABLE & LEARNING --- */
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
      {key:/\bvision\b/i, type:'vision'}, {key:/air\s*blade|airblade|\bab\b/i, type:'air blade'},
      {key:/\b50\s*cc\b|\b50cc\b/i, type:'50cc'}, {key:/côn\s*tay|tay\s*côn/i, type:'xe côn tay'},
      {key:/xe\s*điện|vinfast|yadea|dibao/i, type:'xe điện'},
      {key:/wave|sirius|blade|jupiter|xe\s*số/i, type:'xe số'},
      {key:/xe\s*ga|vision|lead|vespa|liberty/i, type:'xe ga'}
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

  /* --- CRAWLER & SEARCH INDEX --- */
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

  /* --- DATA FETCHING --- */
  async function fetchText(url){
    const ctl = new AbortController(); const id = setTimeout(()=>ctl.abort(), CFG.fetchTimeoutMs);
    try{ const res = await fetch(url, {signal: ctl.signal, mode:'cors', credentials:'omit'}); clearTimeout(id); if(!res.ok) return null; return await res.text(); }
    catch(e){ clearTimeout(id); return null; }
  }
  function parseXML(t){ try{ return (new DOMParser()).parseFromString(t,'text/xml'); }catch{ return null; } }
  function parseHTML(t){ try{ return (new DOMParser()).parseFromString(t,'text/html'); }catch{ return null; } }
  
  /* Debug Stats Helpers */
  function newDomainStats(domain){ return { domain, startedAt: Date.now(), durationMs: 0, urlsSeen: 0, pagesKept: 0, txtPages: 0, htmlPages: 0, nonVNSkipped: 0, noindexSkipped: 0, autoPriceHits: 0 }; }
  function saveStatsAll(all){ try{ localStorage.setItem(K.dbg, JSON.stringify(all)); }catch{} }
  function loadStatsAll(){ return safe(localStorage.getItem(K.dbg)) || {}; }

  async function readSitemap(url){
    const xml = await fetchText(url); if(!xml) return [];
    const doc = parseXML(xml); if(!doc) return [];
    const items = Array.from(doc.getElementsByTagName('item')).map(it=> it.getElementsByTagName('link')[0]?.textContent?.trim()).filter(Boolean);
    if(items.length) return items;
    const sm = Array.from(doc.getElementsByTagName('sitemap')).map(x=> x.getElementsByTagName('loc')[0]?.textContent?.trim()).filter(Boolean);
    if(sm.length){
      const all=[]; for(const loc of sm){ try{ const child = await readSitemap(loc); if(child && child.length) all.push(...child); }catch{} }
      return Array.from(new Set(all));
    }
    return Array.from(doc.getElementsByTagName('url')).map(u=> u.getElementsByTagName('loc')[0]?.textContent?.trim()).filter(Boolean);
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
        try{ const autos = extractPricesFromText(txt); if(autos.length){ stats.autoPriceHits += autos.length; const stash = safe(localStorage.getItem(K.autoprices))||[]; stash.push(...autos.map(a=> Object.assign({url:u}, a))); localStorage.setItem(K.autoprices, JSON.stringify(stash.slice(-500))); } }catch{}
      }
      stats.htmlPages++; out.push({url:u, title, text:desc}); stats.pagesKept++; await sleep(CFG.fetchPauseMs);
    }
    return out;
  }

  async function learnSites(origins, force){
    const list = Array.from(new Set(origins||[])).slice(0, 12);
    const cache = loadLearn(); const results = {}; let total=0; const allStats = loadStatsAll();

    for(const origin of list){
      try{
        const key = new URL(origin).origin;
        const stats = newDomainStats(key);
        const cached = cache[key];
        if(!force && cached && ((nowSec()-cached.ts)/3600) < CFG.refreshHours && cached.pages?.length){
          results[key] = cached; total += cached.pages.length; continue;
        }
        
        // 1. Try moto_sitemap.json first, then 2. sitemap.xml, then 3. crawl
        let urls=[];
        try{
           const jRes = await fetch(key + "/moto_sitemap.json");
           if(jRes.ok){
             const json = await jRes.json();
             urls = [...(json.categories?.datasets?.list||[]), ...(json.categories?.pages?.list||[])];
           }
        }catch{}
        
        if(!urls.length){
          const smc = [key+'/sitemap.xml', key+'/sitemap_index.xml'];
          for(const c of smc){ try{ const u=await readSitemap(c); if(u && u.length){ urls=u; break; } }catch{} }
        }
        
        if(!urls.length){ // Fallback crawl
          const html = await fetchText(key+'/');
          if(html){
            const doc = parseHTML(html);
            if(doc) urls = Array.from(doc.querySelectorAll('a[href]')).map(a=>a.getAttribute('href')).filter(h=> !h.startsWith('#') && !h.startsWith('javascript'));
          }
        }

        const uniq = Array.from(new Set(urls.map(u=>{ try{ return new URL(u, key).toString().split('#')[0]; }catch{ return null; } }).filter(Boolean).filter(u=> sameHost(u, key))));
        const pages = await pullPages(uniq, stats);
        stats.durationMs = Date.now() - stats.startedAt;
        
        if(pages.length){ cache[key] = {domain:key, ts:nowSec(), pages}; results[key]=cache[key]; total+=pages.length; }
        allStats[key] = stats; saveStatsAll(allStats);
        if(total >= CFG.maxTotalPages) break;
      }catch(e){}
    }
    try{ saveLearn(cache); }catch{} localStorage.setItem(K.stamp, Date.now());
    
    if(CFG.debug) {
      console.groupCollapsed("%cMotoAI v38.2 Learn Stats", "color:green"); console.table(Object.values(allStats)); console.groupEnd();
    }
    return results;
  }

  /* --- ANSWER ENGINE --- */
  const PREFIX = ["Chào anh/chị,","Xin chào 👋,","Em chào anh/chị,"];
  function polite(s){ s = s || "em chưa nhận được câu hỏi, anh/chị nhập lại giúp em."; return naturalize(`${pick(PREFIX)} ${s}`); }

  function composePrice(type, qty){
    if(!type) type = 'xe số';
    if(!qty)  return naturalize(`Anh/chị thuê ${type} theo ngày, tuần hay tháng để em báo đúng giá nhé.`);
    const base = baseFor(type, qty.unit);
    if(!base)  return naturalize(`Giá thuê ${type} theo ${qty.unit} cần kiểm tra. Anh/chị nhắn Zalo ${CFG.phone} để em chốt theo mẫu xe.`);
    const total = base * qty.n;
    const label = qty.unit==="ngày"?"ngày":(qty.unit==="tuần"?"tuần":"tháng");
    let text = qty.n===1 ? `Giá thuê ${type} 1 ${label} khoảng ${nfVND(base)}đ` : `Giá thuê ${type} ${qty.n} ${label} khoảng ${nfVND(total)}đ`;
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
    if(intents.needDelivery)return polite(`thuê tuần/tháng em giao tận nơi. Phí nội thành 20–100k tuỳ quận.`);
    if(intents.needPrice)   return composePrice(type, qty);

    // Semantic retrieval
    try{
      const top = searchIndex(q, 3);
      if(top && top.length){
        const t0 = top[0];
        if(CFG.smart.extractiveQA){
          const sn = bestSentences((t0.title? (t0.title+'. ') : '') + (t0.text||''), q, 2).join(' ');
          if(sn) return naturalize(`${sn} <br>👉 Xem thêm: <a href="${t0.url}" target="_blank">Chi tiết</a>`);
        }
        return polite(`${t0.text.slice(0,180)}... <a href="${t0.url}">Xem tiếp</a>`);
      }
    }catch(e){}
    return polite(`anh/chị quan tâm loại xe nào (xe số, Vision, Air Blade, 50cc, côn tay…) và thuê mấy ngày để em báo giá phù hợp.`);
  }

  /* ================= UI CONTROLLER (NEW v38.2) ================= */
  let isOpen = false;
  let sending = false;

  function showTyping(){
    const body=$("#mta-body"); if(!body) return;
    const box=document.createElement("div"); box.id="mta-typing"; box.textContent="Đang nhập...";
    body.appendChild(box); body.scrollTop=body.scrollHeight;
  }
  function hideTyping(){ const t=$("#mta-typing"); if(t) t.remove(); }

  /* VisualViewport Handler: Fix iOS Keyboard covering input */
  function handleViewport(){
    const card = $("#mta-card");
    if(!card || !isOpen) return;
    
    if(window.visualViewport){
      const vv = window.visualViewport;
      // Chỉ áp dụng logic này trên màn hình nhỏ (Mobile)
      if(window.innerWidth <= 480){
        // Set chiều cao card = chiều cao vùng nhìn thấy (trừ bàn phím)
        card.style.height = `${vv.height}px`;
        // Đảm bảo card dính đáy viewport hiện tại
        card.style.bottom = `0px`; 
      }
    }
  }

  function openChat(){
    isOpen = true;
    $("#mta-card").classList.add("open");
    $("#mta-backdrop").classList.add("show");
    $("#mta-bubble").style.transform = "scale(0)";
    renderSess();
    
    setTimeout(()=>{ 
      const inp = $("#mta-in"); if(inp) inp.focus(); 
    }, 300);
    
    if(window.visualViewport) window.visualViewport.addEventListener('resize', handleViewport);
    handleViewport();
  }

  function closeChat(){
    isOpen = false;
    $("#mta-card").classList.remove("open");
    $("#mta-backdrop").classList.remove("show");
    $("#mta-bubble").style.transform = "scale(1)";
    if(window.visualViewport) window.visualViewport.removeEventListener('resize', handleViewport);
  }

  async function sendUser(text){
    if(sending) return;
    const v=(text||"").trim(); if(!v) return;
    
    const inp=$("#mta-in"); if(inp) inp.value="";
    $("#mta-tags").classList.remove("show");
    
    sending=true; 
    addMsg("user", v);
    pushCtx({from:"user", raw:v, type:detectType(v), qty:detectQty(v)});
    
    showTyping();
    const wait = 600 + Math.random()*1200; 
    await sleep(wait);
    
    const ans = await deepAnswer(v);
    hideTyping(); 
    addMsg("bot", ans); 
    pushCtx({from:"bot", raw:ans});
    
    sending=false;
    // Scroll to bottom
    const body=$("#mta-body"); if(body) body.scrollTop = body.scrollHeight;
  }

  function bindEvents(){
    $("#mta-bubble").onclick = openChat;
    $("#mta-close").onclick = closeChat;
    $("#mta-backdrop").onclick = closeChat;
    
    $("#mta-send").onclick = ()=>{ const i=$("#mta-in"); sendUser(i.value); };
    $("#mta-in").onkeydown = (e)=>{ 
      if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); sendUser(e.target.value); } 
    };

    document.querySelectorAll(".m-tag").forEach(b => {
      b.onclick = function(){ 
        const inp=$("#mta-in"); inp.value = this.dataset.q; 
        sendUser(this.dataset.q); 
      }
    });
  }

  /* ================= INIT ================= */
  function init(){
    // Inject CSS & HTML
    const div = document.createElement("div"); div.innerHTML = HTML; document.body.appendChild(div);
    const sty = document.createElement("style"); sty.textContent = CSS; document.head.appendChild(sty);
    
    bindEvents();
    mergeAutoPrices(); // Load saved prices to table

    // AutoLearn Trigger
    if(CFG.autolearn){
      const last = parseInt(localStorage.getItem(K.stamp)||0);
      if(!last || (Date.now()-last) >= CFG.refreshHours*3600*1000){
        setTimeout(()=>{ learnSites([location.origin, ...CFG.extraSites], false); }, 2000);
      }
    }
  }

  if(document.readyState==="complete") init();
  else window.addEventListener("load", init);

  /* Public API */
  window.MotoAI_v38 = {
    open: openChat, close: closeChat,
    send: sendUser,
    learnNow: (s)=> learnSites(s||[location.origin], true),
    clearCache: ()=> { try{localStorage.removeItem(K.learn); localStorage.removeItem(K.autoprices);}catch{} }
  };

})();
