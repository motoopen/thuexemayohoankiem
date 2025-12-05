/* motoai_v38_4_stable.js
   ✅ SEARCH UPGRADE:
      + Query Expansion: Domain "Thuê xe máy" (xe ga -> vision, ab...)
      + Algo: BM25+ (Improved scoring for long/short docs)
      + Safety: tk() fallback for legacy browsers

   ✅ UI/UX & LINK SAFETY: v38.4
      + Link Guard: ONLY send links present in HTML Menu/Anchor (same host)
      + Block: .txt, .json, internal datasets
      + Format: Auto convert links to "tại đây" / Zalo link formatting
      + HTML Rendering: Bot allowed to render <a> tags
*/

(function(){
  if (window.MotoAI_v38_LOADED) return;
  window.MotoAI_v38_LOADED = true;

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
  
  function naturalize(t){
    if(!t) return t;
    let s = " "+t+" ";
    s = s.replace(/\s+ạ([.!?,\s]|$)/gi, "$1").replace(/\s+nhé([.!?,\s]|$)/gi, "$1").replace(/\s+nha([.!?,\s]|$)/gi, "$1");
    s = s.replace(/\s{2,}/g," ").trim(); if(!/[.!?]$/.test(s)) s+="."; return s.replace(/\.\./g,".");
  }

  // 🔹 CORE: Hàm làm sạch Markdown (Giữ lại thẻ HTML <a> nếu có)
  function stripMarkdown(s){
    if(!s) return s;
    let o = String(s);
    // **bold**, __bold__
    o = o.replace(/\*\*(.*?)\*\*/g, '$1');
    o = o.replace(/__(.*?)__/g, '$1');
    // inline code `code`
    o = o.replace(/`([^`]+)`/g, '$1');
    // tiêu đề markdown: #, ##, ###
    o = o.replace(/^\s{0,3}#{1,6}\s+/gm, '');
    // bullet "- " hoặc "* " đầu dòng
    o = o.replace(/^\s{0,3}[-*+]\s+/gm, '');
    // image ![alt](url) → bỏ luôn
    o = o.replace(/!\[[^\]]*]\([^)]+\)/g, '');
    // link markdown [text](url) → "text - url" (HTML <a> của bot tự tạo sẽ không bị ảnh hưởng vì cú pháp khác)
    o = o.replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1 - $2');
    // dọn khoảng trắng
    o = o.replace(/\s{2,}/g, ' ').trim();
    return o;
  }

  function looksVN(s){
    if(/[ăâêôơưđà-ỹ]/i.test(s)) return true;
    const hits = (s.match(/\b(xe|thuê|giá|liên hệ|hà nội|cọc|giấy tờ)\b/gi)||[]).length;
    return hits >= 2;
  }

  /* ====== LINK SAFETY HELPERS (v38.4) ====== */
  const ALLOWED_LINKS = [];

  function normalizeUrl(u){
    try {
      return new URL(u, location.origin).toString().split('#')[0];
    } catch(e){
      return null;
    }
  }

  // Khởi tạo danh sách link cho phép từ HTML (menu, anchor)
  function initAllowedLinks(){
    try{
      const set = new Set();
      document.querySelectorAll('a[href]').forEach(a=>{
        const href = a.getAttribute('href');
        if(!href) return;
        try{
          const u = new URL(href, location.href).toString().split('#')[0];
          // Cùng host và không phải .txt/.json
          if(sameHost(u, location.origin) && !/\.(txt|json)(\?|$)/i.test(u)){
            set.add(u);
          }
        }catch{}
      });
      ALLOWED_LINKS.length = 0;
      ALLOWED_LINKS.push(...Array.from(set));
      if(CFG.debug) console.log("MotoAI v38.4: allowed links = ", ALLOWED_LINKS);
    }catch(e){}
  }

  // Chọn link an toàn để gửi cho user
  function pickSafeLink(url){
    if(!url) return null;
    const clean = normalizeUrl(url);
    if(!clean) return null;

    // Cấm .txt & .json
    if(/\.(txt|json)(\?|$)/i.test(clean)) return null;

    // Chỉ cùng host
    if(!sameHost(clean, location.origin)) return null;

    if(!ALLOWED_LINKS.length) return null;

    // So sánh cả dạng có / và không có / cuối
    const base = clean.replace(/\/+$/,'');
    const found = ALLOWED_LINKS.find(x => x === clean || x.replace(/\/+$/,'') === base);
    return found || null;
  }

  function formatZaloLink(){
    const raw = CFG.zalo || ('https://zalo.me/' + String(CFG.phone||'').replace(/\s+/g,''));
    const url = normalizeUrl(raw);
    if(!url) return 'Zalo';
    return `Zalo (nhắn <a href="${url}" target="_blank" rel="noopener noreferrer">tại đây</a>)`;
  }

  /* ====== STORAGE KEYS ====== */
  const K = {
    sess:  "MotoAI_v38_session",
    ctx:   "MotoAI_v38_ctx",
    learn: "MotoAI_v38_learn",
    autoprices: "MotoAI_v38_auto_prices",
    stamp: "MotoAI_v38_learnStamp",
    clean: "MotoAI_v38_lastClean",
    dbg:   "MotoAI_v38_debug_stats"
  };

  /* ====== UI v38.3 ====== */
  const CSS = `
  :root {
    --mta-z: 2147483647;
    --m-blue: ${CFG.themeColor};
    /* Light Mode Default */
    --m-bg: #ffffff;
    --m-bg-sec: #f4f6f8;
    --m-text: #0b1220;
    --m-text-sub: #64748b;
    --m-border: rgba(0,0,0,0.08);
    --m-bubble-bg: linear-gradient(135deg, var(--m-blue), #00B2FF);
    --m-user-bg: var(--m-blue);
    --m-bot-bg: #fff;
    --m-bot-bd: rgba(0,0,0,0.06);
    
    /* Input config */
    --m-in-h: 36px;
    --m-in-fs: 16px; /* iOS requires 16px */
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --m-bg: #1e1e1e;
      --m-bg-sec: #2c2c2e;
      --m-text: #e0e0e0;
      --m-text-sub: #a0a0a0;
      --m-border: rgba(255,255,255,0.12);
      --m-bot-bg: #2c2c2e;
      --m-bot-bd: rgba(255,255,255,0.08);
    }
  }

  #mta-root {
    position: fixed; right: 20px; bottom: 20px; z-index: var(--mta-z);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }

  #mta-bubble {
    width: 58px; height: 58px; border: none; border-radius: 50%;
    background: var(--m-bubble-bg);
    box-shadow: 0 8px 24px rgba(0, 132, 255, 0.3);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: #fff; font-size: 26px;
    transition: transform 0.2s;
  }
  #mta-bubble:hover { transform: scale(1.05); }

  #mta-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.3);
    opacity: 0; pointer-events: none; transition: opacity 0.2s ease;
    backdrop-filter: blur(2px);
  }
  #mta-backdrop.show { opacity: 1; pointer-events: auto; }

  #mta-card {
    position: fixed; right: 20px; bottom: 20px;
    width: 380px; height: 70vh; max-height: 720px;
    background: var(--m-bg); color: var(--m-text);
    border-radius: 20px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.2);
    display: flex; flex-direction: column; overflow: hidden;
    transform: translateY(120%) scale(0.95);
    transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
    opacity: 0; pointer-events: none;
  }
  #mta-card.open { transform: translateY(0) scale(1); opacity: 1; pointer-events: auto; }

  #mta-header {
    background: var(--m-bubble-bg); color: #fff; padding: 12px 16px;
    display: flex; align-items: center; gap: 10px;
    flex-shrink: 0;
  }
  #mta-header .avatar {
    width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.2);
    display: flex; align-items: center; justify-content: center; font-size: 16px;
  }
  #mta-header .info { flex: 1; min-width: 0; }
  #mta-header .name { font-weight: 600; font-size: 15px; margin-bottom: 2px; }
  #mta-header .status { font-size: 12px; opacity: 0.9; display: flex; align-items: center; gap: 4px; }
  #mta-header .status::before { content: ""; width: 6px; height: 6px; background: #4ade80; border-radius: 50%; }
  #mta-header .close-btn {
    background: none; border: none; color: #fff; font-size: 24px; cursor: pointer; padding: 0 4px;
  }

  #mta-body {
    flex: 1; overflow-y: auto; overflow-x: hidden;
    padding: 16px; background: var(--m-bg-sec);
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  }
  .m-msg {
    max-width: 80%; margin-bottom: 10px; padding: 10px 14px;
    border-radius: 18px; font-size: 15px; line-height: 1.4; word-wrap: break-word;
  }
  .m-msg.bot { background: var(--m-bot-bg); color: var(--m-text); border: 1px solid var(--m-bot-bd); border-bottom-left-radius: 4px; }
  .m-msg.user { background: var(--m-user-bg); color: #fff; margin-left: auto; border-bottom-right-radius: 4px; }
  /* Link style in bot msg */
  .m-msg.bot a { color: var(--m-blue); text-decoration: none; font-weight: 500; }
  .m-msg.bot a:hover { text-decoration: underline; }

  #mta-tags {
    background: var(--m-bg); border-top: 1px solid var(--m-border);
    padding: 8px 0; overflow-x: auto; white-space: nowrap;
    display: flex; gap: 8px; padding-left: 12px;
    transition: max-height 0.2s, opacity 0.2s;
  }
  #mta-tags.hidden { max-height: 0; opacity: 0; padding: 0; overflow: hidden; border: none; }
  #mta-tags::-webkit-scrollbar { display: none; }
  #mta-tags button {
    background: var(--m-bg-sec); color: var(--m-text);
    border: 1px solid var(--m-border); border-radius: 16px;
    padding: 6px 12px; font-size: 13px; cursor: pointer;
    flex-shrink: 0;
  }

  #mta-footer {
    background: var(--m-bg); padding: 10px 12px;
    border-top: 1px solid var(--m-border);
    display: flex; gap: 8px; align-items: center;
    padding-bottom: calc(10px + env(safe-area-inset-bottom, 0));
  }
  #mta-in {
    flex: 1; height: var(--m-in-h);
    border: 1px solid var(--m-border); border-radius: 20px;
    padding: 0 16px; font-size: var(--m-in-fs);
    background: var(--m-bg-sec); color: var(--m-text);
    outline: none; transition: border-color 0.2s;
    appearance: none; -webkit-appearance: none;
  }
  #mta-in:focus { border-color: var(--m-blue); }
  #mta-send {
    width: 36px; height: 36px; border: none; border-radius: 50%;
    background: var(--m-blue); color: #fff;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; font-size: 16px;
  }

  #mta-typing { font-size: 12px; color: var(--m-text-sub); margin-bottom: 8px; margin-left: 4px; font-style: italic; }

  @media (max-width: 480px) {
    #mta-card {
      right: 0; left: 0; bottom: 0; width: 100%;
      height: 85vh; max-height: none;
      border-radius: 20px 20px 0 0;
      transform: translateY(100%);
    }
    #mta-card.open { transform: translateY(0); }
    #mta-footer { padding-bottom: calc(10px + env(safe-area-inset-bottom, 0)); }
  }
  `;

  const HTML = `
  <div id="mta-root">
    <button id="mta-bubble" aria-label="Chat">💬</button>
    <div id="mta-backdrop"></div>
    <div id="mta-card">
      <header id="mta-header">
        <div class="avatar">${CFG.avatar}</div>
        <div class="info">
          <div class="name">${CFG.brand}</div>
          <div class="status">Sẵn sàng hỗ trợ</div>
        </div>
        <button class="close-btn" id="mta-close">×</button>
      </header>
      <main id="mta-body"></main>
      <div id="mta-tags">
        <button data-q="Giá thuê xe máy">💰 Giá thuê</button>
        <button data-q="Thuê xe ga">🛵 Xe ga</button>
        <button data-q="Thuê xe số">🏍 Xe số</button>
        <button data-q="Thủ tục">📄 Thủ tục</button>
        <button data-q="Liên hệ">📞 Liên hệ</button>
      </div>
      <footer id="mta-footer">
        <input id="mta-in" type="text" placeholder="Nhập tin nhắn..." autocomplete="off">
        <button id="mta-send">➤</button>
      </footer>
    </div>
  </div>`;

  /* ====== SESSION / CONTEXT ====== */
  const MAX_MSG = 10;
  function getSess(){ const arr = safe(localStorage.getItem(K.sess))||[]; return Array.isArray(arr)?arr:[]; }
  function saveSess(a){ try{ localStorage.setItem(K.sess, JSON.stringify(a.slice(-MAX_MSG))); }catch{} }
  
  // 🔹 FIXED v38.4: Bot render HTML (để hiển thị link), User render Text
  function appendMsgDOM(role, text) {
    if(!text) return;
    const body=$("#mta-body"); if(!body) return;
    const el=document.createElement("div");
    el.className="m-msg "+(role==="user"?"user":"bot");

    if (role === "bot") {
      // Bot được phép render HTML (do mình tạo <a> an toàn)
      const out = stripMarkdown(String(text));
      el.innerHTML = out;
    } else {
      // User message vẫn luôn text thuần
      el.textContent = String(text);
    }
    
    body.appendChild(el); 
    body.scrollTop=body.scrollHeight;
  }

  function addMsg(role, text) {
    appendMsgDOM(role, text);
    const arr=getSess();
    arr.push({role,text,t:Date.now()});
    saveSess(arr);
  }

  function renderSess(){
    const body=$("#mta-body"); body.innerHTML="";
    const arr=getSess();
    if(arr.length) arr.forEach(m=> appendMsgDOM(m.role,m.text));
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

  /* ====== LOGIC CHATBOT ====== */
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

  /* ====== SIMPLE INDEX + BM25+ & QUERY EXPANSION ====== */
  // 🔹 FIXED v38.4: Safe Tokenization
  function tk(s){
    const raw = String(s || "").toLowerCase();
    try {
      // Trình duyệt hiện đại
      const re = new RegExp('[^\\p{L}\\p{N}\\s]+', 'gu');
      return raw.normalize('NFC').replace(re, ' ').split(/\s+/).filter(Boolean);
    } catch (e) {
      // Fallback cho WebView/Browser đời cũ
      return raw.replace(/[^a-z0-9\u00C0-\u017F\u1EA0-\u1EFF\s]+/gi, ' ').split(/\s+/).filter(Boolean);
    }
  }

  // QUERY EXPANSION
  const QUERY_EXPANSION_RULES = [
    { re: /\b(xe ga|tay ga|scooter)\b/i, add: ["vision","air blade","airblade","lead","vespa","liberty","scooter","tay ga"] },
    { re: /\b(xe số|số sàn|underbone)\b/i, add: ["wave","sirius","blade","jupiter","future","dream","underbone","xe so"] },
    { re: /\b(50\s*cc|50cc|xe 50)\b/i, add: ["xe 50cc","học sinh","sinh viên","không cần bằng lái"] },
    { re: /\b(air\s*blade|airblade|ab\b)\b/i, add: ["xe ga","honda","ab 125","ab 150"] },
    { re: /\bvision\b/i, add: ["honda vision","xe ga","xe ga nhỏ gọn"] },
    { re: /\b(xe điện|vinfast|yadea|dibao|klara|gogo)\b/i, add: ["xe điện","electric scooter","vinfast","yadea","dibao","klara"] },
    { re: /\b(côn tay|tay côn|exciter|winner)\b/i, add: ["xe côn tay","exciter","winner","underbone thể thao"] },
    { re: /\b(giá|bao nhiêu|thuê|price|cost|bảng giá)\b/i, add: ["bảng giá thuê xe","giá thuê theo ngày","giá thuê theo tuần","giá thuê theo tháng"] },
    { re: /\b(địa chỉ|ở đâu|map|bản đồ|chỉ đường|location)\b/i, add: ["địa chỉ cửa hàng","bản đồ google maps","chỉ đường đến cửa hàng"] }
  ];

  function expandQuery(q){
    const base = String(q || "");
    const lower = base.toLowerCase();
    const extra = new Set();
    QUERY_EXPANSION_RULES.forEach(rule => { if (rule.re.test(lower)) (rule.add || []).forEach(w => extra.add(w)); });
    if (!extra.size) return base;
    return base + " " + Array.from(extra).join(" ");
  }

  function loadLearn(){ return safe(localStorage.getItem(K.learn)) || {}; }
  function saveLearn(o){ try{ localStorage.setItem(K.learn, JSON.stringify(o)); }catch{} }
  function getIndexFlat(){
    const cache=loadLearn(); const out=[];
    Object.keys(cache).forEach(key=>{ (cache[key].pages||[]).forEach(pg=> out.push(Object.assign({source:key}, pg))); });
    return out;
  }

  // BM25+
  function buildBM25(docs){
    const k1 = 1.5; const b = 0.75; const delta = 0.5;
    const df = new Map(); const tf = new Map(); let totalLen = 0;
    docs.forEach(d => {
      const toks = tk(d.text); totalLen += toks.length;
      const fmap = new Map(); toks.forEach(t => fmap.set(t, (fmap.get(t) || 0) + 1));
      tf.set(d.id, fmap); new Set(toks).forEach(t => df.set(t, (df.get(t) || 0) + 1));
    });
    const N = docs.length || 1; const avgdl = totalLen / Math.max(1, N);
    const idf = new Map();
    df.forEach((c, t) => { const val = Math.log( (N - c + 0.5) / (c + 0.5) + 1 ); idf.set(t, val > 0 ? val : 0); });
    function score(query, docId, docLen){
      const qToks = new Set(tk(query)); const fmap = tf.get(docId) || new Map(); let s = 0;
      qToks.forEach(t => {
        const f = fmap.get(t) || 0; if (!f) return; const idfv = idf.get(t) || 0; if (!idfv) return;
        s += idfv * ( ((f * (k1 + 1)) / (f + k1 * (1 - b + b * (docLen / avgdl)))) + delta );
      });
      return s;
    }
    return { score, tf, avgdl };
  }

  function searchIndex(query, k=3){
    const idx = getIndexFlat(); if (!idx.length) return [];
    const qExpanded = expandQuery(query || "");
    const docs = idx.map((it, i) => ({ id: String(i), text: ((it.title || "") + " " + (it.text || "")), meta: it }));
    const bm = CFG.smart.semanticSearch ? buildBM25(docs) : null;
    if (bm) {
      return docs.map(d => ({ score: bm.score(qExpanded, d.id, tk(d.text).length || 1), meta: d.meta }))
        .filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, k).map(x => x.meta);
    } else {
      const qTokens = tk(qExpanded);
      return idx.map(it => {
          const docTokens = tk((it.title || "") + " " + (it.text || ""));
          const hits = docTokens.filter(t => qTokens.includes(t)).length;
          return Object.assign({ score: hits }, it);
        }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
    }
  }

  // 🔹 FIXED v38.4: Use expanded query for better extraction
  function bestSentences(text, query, k=2){
    const sents = String(text||'').replace(/\s+/g,' ').split(/(?<=[\.\!\?])\s+/).slice(0,80);
    const qExpanded = expandQuery(query || "");
    const qToks = new Set(tk(qExpanded));
    const scored = sents.map(s=>{
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
      domain, startedAt: Date.now(), durationMs: 0,
      urlsSeen: 0, pagesKept: 0, txtPages: 0, htmlPages: 0,
      nonVNSkipped: 0, noindexSkipped: 0, autoPriceHits: 0
    };
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
    return Array.from(doc.getElementsByTagName('url')).map(u=> u.getElementsByTagName('loc')[0]?.textContent?.trim()).filter(Boolean);
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
      stats.htmlPages++; out.push({url:u, title, text:desc}); stats.pagesKept++;
      await sleep(CFG.fetchPauseMs);
    }
    return out;
  }

  /* ====== AUTOLEARN ====== */
  async function learnOneOrigin(origin, stats){
    try{
      const key = new URL(origin).origin;
      const candidatesJSON = [ key + "/moto_sitemap.json", location.origin + (location.pathname.replace(/\/[^\/]*$/,'') || '') + "/moto_sitemap.json" ];
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
                const title = u.split("/").slice(-1)[0]; const text = txt.replace(/\s+/g," ").trim().slice(0,2000);
                pages.push({url:u,title,text}); stats.txtPages++; stats.pagesKept++;
              }else{
                let title=(txt.match(/<title[^>]*>([^<]+)<\/title>/i)||[])[1]||""; title=title.replace(/\s+/g,' ').trim();
                let desc=(txt.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"]+)["']/i)||[])[1]||"";
                if(!desc){ desc = txt.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,600); }
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

  function isExpired(ts, hrs){ if(!ts) return true; return ((nowSec()-ts)/3600) >= (hrs||CFG.refreshHours); }

  async function learnSites(origins, force){
    const list = Array.from(new Set(origins||[])).slice(0, 12);
    const cache = loadLearn(); const results = {}; let total=0;
    const allStats = loadStatsAll();
    for(const origin of list){
      try{
        const key = new URL(origin).origin;
        const stats = newDomainStats(key);
        const cached = cache[key] || cache["sitemap-json"];
        if(!force && cached && !isExpired(cached.ts, CFG.refreshHours) && cached.pages?.length){
          results[key] = cached; total += cached.pages.length;
          stats.pagesKept = cached.pages.length; finishStats(stats); allStats[key] = stats; saveStatsAll(allStats);
          if(total>=CFG.maxTotalPages) break; continue;
        }
        const t0 = performance.now();
        const data = await learnOneOrigin(origin, stats);
        const t1 = performance.now();
        stats.durationMs = Math.round(t1 - t0);
        if(data && data.pages?.length){
          cache[key] = data;
          try{ saveLearn(cache); } catch(e){ const ks = Object.keys(cache); if(ks.length){ delete cache[ks[0]]; try{ saveLearn(cache); }catch{} } }
          results[key] = data; total += data.pages.length;
        }
        allStats[key] = finishStats(stats); saveStatsAll(allStats);
        if(total >= CFG.maxTotalPages) break;
      }catch(e){}
      await sleep(CFG.fetchPauseMs);
    }
    if(CFG.debug){
      try{
        const rows = Object.values(loadStatsAll());
        if(rows.length){
          console.groupCollapsed("%cMotoAI v38.4 — Learn Summary","color:"+CFG.themeColor+";font-weight:bold");
          console.table(rows.map(r=>({
            domain: r.domain, 'urlsSeen': r.urlsSeen, 'pagesKept': r.pagesKept, 'autoPriceHits': r.autoPriceHits, 'durationMs': r.durationMs
          })));
          console.groupEnd();
        }
      }catch{}
    }
    try{ saveLearn(cache); }catch{}
    try{ localStorage.setItem(K.stamp, Date.now()); }catch{}
    return results;
  }

  /* ====== ANSWER ENGINE ====== */
  const PREFIX = ["Chào anh/chị,","Xin chào 👋,","Em chào anh/chị,","Em ở "+CFG.brand+" đây,"];
  function polite(s){ s = s || "em chưa nhận được câu hỏi, anh/chị nhập lại giúp em."; return naturalize(`${pick(PREFIX)} ${s}`); }

  function composePrice(type, qty){
    if(!type) type = 'xe số';
    if(!qty)  return naturalize(`Anh/chị thuê ${type} theo ngày, tuần hay tháng để em báo đúng giá nhé.`);
    const base = baseFor(type, qty.unit);
    if(!base)  return naturalize(`Giá thuê ${type} theo ${qty.unit} cần kiểm tra. Anh/chị nhắn ${formatZaloLink()} để em chốt theo mẫu xe.`);
    const total = base * qty.n;
    const label = qty.unit==="ngày"?"ngày":(qty.unit==="tuần"?"tuần":"tháng");
    let text = qty.n===1 ? `Giá thuê ${type} 1 ${label} khoảng ${nfVND(base)}đ` : `Giá thuê ${type} ${qty.n} ${label} khoảng ${nfVND(total)}đ`;
    if(qty.unit==="ngày" && qty.n>=3) text += " Nếu thuê theo tuần sẽ tiết kiệm hơn";
    return naturalize(`${text}. Anh/chị cần em giữ xe và gửi ảnh xe qua ${formatZaloLink()} không?`);
  }

  async function deepAnswer(userText){
    const q = (userText||"").trim();
    const intents = detectIntent(q);
    let type = detectType(q);
    const qty  = detectQty(q);
    if(CFG.deepContext){
      const ctx = getCtx();
      for(let i=ctx.turns.length-1;i>=0;i--){
        const t = ctx.turns[i];
        if(!type && t.type) type=t.type;
        if(!qty && t.qty)   return composePrice(type||t.type, t.qty);
        if(type && qty) break;
      }
    }
    if(intents.needContact) return polite(`anh/chị gọi ${CFG.phone} hoặc ${formatZaloLink()} là có người nhận ngay.`);
    if(intents.needDocs)    return polite(`thủ tục gọn: CCCD/hộ chiếu + cọc theo xe. Có phương án giảm cọc khi đủ giấy tờ.`);
    if(intents.needPolicy)  return polite(`đặt cọc tham khảo: xe số 2–3 triệu; xe ga 2–5 triệu; 50cc khoảng 4 triệu. Liên hệ ${formatZaloLink()} để chốt theo mẫu xe.`);
    if(intents.needDelivery)return polite(`thuê 1–4 ngày vui lòng đến cửa hàng chọn xe; thuê tuần/tháng em giao tận nơi. Phí nội thành 20–100k tuỳ quận. Nhắn ${formatZaloLink()} để em set lịch.`);
    if(intents.needReturn)  return polite(`trả xe tại cửa hàng hoặc hẹn trả tận nơi (thoả thuận). Báo trước 30 phút để em sắp xếp, hoàn cọc nhanh.`);
    if(intents.needPrice)   return composePrice(type, qty);
    
    // 🔹 FIXED v38.4: Logic Search Link Safe
    try{
      const top = searchIndex(q, 3);
      if(top && top.length){
        const t0 = top[0];
        // Chỉ lấy link an toàn (có trong Menu HTML), không .txt/.json
        const safeLink = pickSafeLink(t0.url); 

        if(CFG.smart.extractiveQA){
          const sn = bestSentences((t0.title? (t0.title+'. ') : '') + (t0.text||''), q, 2).join(' ');
          if(sn){
            if(safeLink) return naturalize(`${sn} — Xem thêm <a href="${safeLink}" target="_blank" rel="noopener noreferrer">tại đây</a>`);
            return naturalize(sn);
          }
        }
        
        const fallback = ((t0.title? (t0.title+' — ') : '') + (t0.text||'')).slice(0,180);
        if(safeLink) return polite(`${fallback} ... Xem thêm <a href="${safeLink}" target="_blank" rel="noopener noreferrer">tại đây</a>`);
        return polite(fallback);
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
        const p25 = arr[Math.floor(arr.length*0.25)]; const p50 = arr[Math.floor(arr.length*0.50)];
        if(PRICE_TABLE[t]){ const dayRange = [p25, p50].filter(Boolean); if(dayRange.length) PRICE_TABLE[t].day = dayRange; }
      });
    }catch{}
  }

  /* ====== SEND / UI CONTROL ====== */
  let isOpen=false, sending=false;
  function showTyping(){
    const body=$("#mta-body"); if(!body) return;
    const box=document.createElement("div"); box.id="mta-typing"; box.innerHTML=`<span>Đang nhập...</span>`;
    body.appendChild(box); body.scrollTop=body.scrollHeight;
  }
  function hideTyping(){ const t=$("#mta-typing"); if(t) t.remove(); }
  function ensureInputVisible(){
    const body=$("#mta-body"); if(body) body.scrollTop = body.scrollHeight;
  }

  async function sendUser(text){
    if(sending) return;
    const v=(text||"").trim(); if(!v) return;
    sending=true; addMsg("user", v);
    pushCtx({from:"user", raw:v, type:detectType(v), qty:detectQty(v)});
    const isMobile = window.innerWidth < 480; const wait = (isMobile? 1600 + Math.random()*1200 : 2400 + Math.random()*2200);
    showTyping(); await sleep(wait);
    
    const rawAns = await deepAnswer(v);
    
    hideTyping();
    addMsg("bot", rawAns);
    pushCtx({from:"bot", raw:rawAns});
    sending=false;
  }
    
  function openChat(){
    if(isOpen) return;
    $("#mta-card").classList.add("open");
    $("#mta-backdrop").classList.add("show");
    $("#mta-bubble").style.transform = "scale(0)";
    isOpen=true; renderSess();
    setTimeout(()=>{ const i=$("#mta-in"); if(i) i.focus(); }, 300);
  }
  function closeChat(){
    if(!isOpen) return;
    $("#mta-card").classList.remove("open");
    $("#mta-backdrop").classList.remove("show");
    $("#mta-bubble").style.transform = "scale(1)";
    isOpen=false; hideTyping();
  }

  /* Visual Viewport Auto Avoid */
  function autoAvoid(){
    if (!isOpen) return;
    const card = $("#mta-card");
    if (!card) return;
    if (window.visualViewport && window.innerWidth < 600) {
      const vh = window.visualViewport.height;
      const offsetTop = window.visualViewport.offsetTop;
      const bottom = window.innerHeight - (vh + offsetTop);
      
      if (vh < window.innerHeight - 100) {
        card.style.bottom = `${Math.max(0, bottom)}px`;
        card.style.height = `${vh}px`; 
        card.style.borderRadius = "0"; 
      } else {
        card.style.bottom = "0";
        card.style.height = "85vh"; 
        card.style.borderRadius = "20px 20px 0 0";
      }
    }
  }

  function maybeDisableQuickMap(){
    if(!CFG.disableQuickMap) return;
    const m=$(".q-map"); if(m){ m.removeAttribute("href"); m.style.opacity=".4"; m.style.pointerEvents="none"; }
  }
  function bindEvents(){
    $("#mta-bubble").addEventListener("click", openChat);
    $("#mta-backdrop").addEventListener("click", closeChat);
    $("#mta-close").addEventListener("click", closeChat);
    $("#mta-send").addEventListener("click", ()=>{
      const inp=$("#mta-in"); const v=inp.value.trim(); if(!v) return; inp.value=""; sendUser(v);
    });
    $("#mta-in").addEventListener("keydown", e=>{
      if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); const v=e.target.value.trim(); if(!v) return; e.target.value=""; sendUser(v); }
      const tags=$("#mta-tags"); if(tags){ if(e.target.value.trim().length>0) tags.classList.add('hidden'); else tags.classList.remove('hidden'); }
    });
    const track=$("#mta-tags");
    if(track){ track.querySelectorAll("button").forEach(btn=> btn.addEventListener("click", ()=> sendUser(btn.dataset.q||btn.textContent))); }
    if(window.visualViewport){
      window.visualViewport.addEventListener("resize", autoAvoid);
      window.visualViewport.addEventListener("scroll", autoAvoid);
    }
  }

  function ready(fn){ if(document.readyState==="complete"||document.readyState==="interactive") fn(); else document.addEventListener("DOMContentLoaded", fn); }

  /* ====== BOOT ====== */
  ready(async ()=>{
    const lastClean = parseInt(localStorage.getItem(K.clean)||0);
    if(!lastClean || (Date.now()-lastClean) > 7*24*3600*1000){
      localStorage.removeItem(K.ctx); 
      try{ localStorage.setItem(K.clean, Date.now()); }catch{}
    }

    const wrap=document.createElement("div"); wrap.innerHTML=HTML; document.body.appendChild(wrap.firstElementChild);
    const st=document.createElement("style"); st.textContent=CSS; document.head.appendChild(st);
    
    // 🔹 FIXED v38.4: Init Allowed Links (for Safety)
    initAllowedLinks();

    bindEvents(); maybeDisableQuickMap();
    mergeAutoPrices();

    if(CFG.autolearn){
      try{
        const origins = Array.from(new Set([location.origin, ...(CFG.extraSites||[])]));
        const last = parseInt(localStorage.getItem(K.stamp)||0);
        if(!last || (Date.now()-last) >= CFG.refreshHours*3600*1000){
          if(CFG.debug) console.log("MotoAI v38.4: AutoLearn start...");
          await learnSites(origins, false);
        }
      }catch(e){ console.warn("MotoAI autolearn error", e); }
    }
  });

  /* ====== PUBLIC API ====== */
  window.MotoAI_v38 = {
    open: openChat, close: closeChat, send: (t)=> sendUser(t),
    learnNow: async (sites, force)=>{
      const list = Array.isArray(sites)&&sites.length?sites:([location.origin, ...(CFG.extraSites||[])]);
      return await learnSites(Array.from(new Set(list)), !!force);
    },
    getIndex: getIndexFlat,
    clearLearnCache: ()=> { try{ localStorage.removeItem(K.learn); localStorage.removeItem(K.autoprices); localStorage.removeItem(K.dbg);}catch{} },
    debugDump: ()=> ({stats: loadStatsAll(), indexSize: getIndexFlat().length, priceSamples:(safe(localStorage.getItem(K.autoprices))||[]).length})
  };
})();
