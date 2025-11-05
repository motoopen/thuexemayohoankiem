/* motoai_v38_stable_autositemap_pricing.js
   UI: Messenger-style (giữ nguyên look & feel của v37.x hiện tại)
   Core: AutoSitemap + TXT Learning như v37.6 • SmartPricing (trả đúng theo thời lượng hỏi)
   Delay: 3.5–6.0s • Deep context (5 turns) • Giữ 10 tin gần nhất • 7 tag (thêm "Đặt cọc")
   Float cố định: luôn nổi trên màn hình, z-index cực cao, không bị che khi cuộn

   Cấu hình qua window.MotoAI_CONFIG (brand, phone, zalo, themeColor, extraSites, autolearn...)
*/
(function(){
  if (window.MotoAI_v38_LOADED) return;
  window.MotoAI_v38_LOADED = true;

  /* ====== CONFIG ====== */
  const DEF = {
    brand: "Nguyễn Tú",
    phone: "0942467674",
    zalo: "https://zalo.me/0942467674",
    map: "https://maps.app.goo.gl/SR1hcwnCQjPkAvDh7",
    avatar: "🛵",
    themeColor: "#0084FF",
    autolearn: true,
    deepContext: true,
    maxContextTurns: 5,
    viOnly: true,
    extraSites: [location.origin],   // học đúng domain hiện tại (có thể thêm domain khác)
    crawlDepth: 1,
    refreshHours: 24,               // tự làm mới dữ liệu 24h/lần
    maxPagesPerDomain: 60,
    maxTotalPages: 180,
    fetchTimeoutMs: 10000,
    fetchPauseMs: 160,
    disableQuickMap: false
  };
  const ORG = (window.MotoAI_CONFIG || {});
  const CFG = Object.assign({}, DEF, ORG);

  const MAX_MSG = 10; // giữ 10 tin gần nhất
  const RESET_AFTER_DAYS = 7; // dọn cache sau 7 ngày

  /* ====== HELPERS ====== */
  const $ = s => document.querySelector(s);
  const safeJSON = s => { try{return JSON.parse(s);}catch{return null;} };
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const nowSec = ()=>Math.floor(Date.now()/1000);

  // tự nhiên tiếng Việt, bỏ “ạ/nhé/nha”, thêm dấu chấm cuối nếu cần
  function naturalize(t){
    if(!t) return t;
    let s = " " + t + " ";
    s = s.replace(/\s+ạ([.!?,\s]|$)/gi, "$1");
    s = s.replace(/\s+nhé([.!?,\s]|$)/gi, "$1");
    s = s.replace(/\s+nha([.!?,\s]|$)/gi, "$1");
    s = s.replace(/\s{2,}/g, " ").trim();
    if(/[a-zA-ZÀ-ỹ0-9)]$/.test(s)) s += ".";
    return s.replace(/\.\./g,".");
  }

  /* ====== STORAGE KEYS ====== */
  const HOSTKEY = (location.host||"site").replace(/[^a-z0-9.-]/gi,"_");
  const K = {
    sess: `MotoAI_v38_${HOSTKEY}_session`,
    ctx:  `MotoAI_v38_${HOSTKEY}_ctx`,
    learn:`MotoAI_v38_${HOSTKEY}_learn`,
    ts:   `MotoAI_v38_${HOSTKEY}_learn_ts`
  };

  /* ====== UI (Messenger-style, giữ nguyên UX, float cố định) ====== */
  const CSS = `
  :root{
    --mta-z:2147483647; /* nổi cao nhất */
    --m-blue:${CFG.themeColor};
    --m-bg:#fff;
    --m-text:#0b1220;
  }
  #mta-root{
    position:fixed;
    right:16px;
    bottom:calc(16px + env(safe-area-inset-bottom,0));
    z-index:var(--mta-z);
    font-family:-apple-system,system-ui,Segoe UI,Roboto,"Helvetica Neue",Arial,sans-serif;
    pointer-events:auto;
  }
  #mta-bubble{
    width:56px;height:56px;border:none;border-radius:999px;
    background:linear-gradient(150deg,var(--m-blue),#00B2FF);
    display:flex;align-items:center;justify-content:center;
    cursor:pointer;box-shadow:0 10px 28px rgba(0,0,0,.18);
    color:#fff;font-size:22px;
    position:fixed; right:16px; bottom:calc(16px + env(safe-area-inset-bottom,0));
  }
  #mta-backdrop{
    position:fixed;inset:0;background:rgba(0,0,0,.18);
    opacity:0;pointer-events:none;transition:opacity .15s ease;
  }
  #mta-backdrop.show{opacity:1;pointer-events:auto;}

  #mta-card{
    position:fixed;
    right:16px;bottom:16px;
    width:min(420px,calc(100% - 24px));
    height:70vh;max-height:740px;
    background:var(--m-bg);color:var(--m-text);
    border-radius:18px;
    box-shadow:0 12px 40px rgba(0,0,0,.25);
    display:flex;flex-direction:column;overflow:hidden;
    transform:translateY(110%);
    transition:transform .22s cubic-bezier(.22,1,.36,1);
  }
  #mta-card.open{transform:translateY(0);}

  #mta-header{
    background:linear-gradient(130deg,var(--m-blue),#00B2FF);
    color:#fff;
  }
  #mta-header .bar{
    display:flex;align-items:center;gap:10px;
    padding:11px 12px;
  }
  #mta-header .avatar{
    width:30px;height:30px;border-radius:50%;
    background:rgba(255,255,255,.25);
    display:flex;align-items:center;justify-content:center;
    font-size:15px;
  }
  #mta-header .info .name{font-weight:700;font-size:14px;line-height:1.1;}
  #mta-header .status{font-size:12px;opacity:.9;display:flex;align-items:center;gap:4px;}
  #mta-header .status-dot{width:8px;height:8px;border-radius:50%;background:#3fff6c;}
  #mta-header .actions{margin-left:auto;display:flex;gap:6px;align-items:center;}
  #mta-header .act{
    width:28px;height:28px;border-radius:999px;
    background:rgba(255,255,255,.16);
    border:1px solid rgba(255,255,255,.25);
    display:flex;align-items:center;justify-content:center;
    color:#fff;font-size:13px;text-decoration:none;
  }
  #mta-close{background:none;border:none;color:#fff;font-size:20px;cursor:pointer;}

  #mta-body{
    flex:1;overflow-y:auto;
    background:linear-gradient(180deg,#E9EEF5 0%, #D7E0EC 100%);
    padding:14px 10px 12px;
  }
  .m-msg{
    max-width:78%;margin:6px 0;
    padding:8px 11px;border-radius:20px;
    line-height:1.45;word-break:break-word;
    box-shadow:0 1px 1px rgba(0,0,0,.05);
    font-size:14px;
  }
  .m-msg.bot{background:#fff;color:#0d1117;border:1px solid rgba(0,0,0,.03);}
  .m-msg.user{
    background:#0084FF;color:#fff;
    margin-left:auto;border-bottom-right-radius:3px;
  }

  /* 7 TAG */
  #mta-tags{
    background:#f6f7f9;border-top:1px solid rgba(0,0,0,.05);
    transition:max-height .2s ease,opacity .2s ease;
  }
  #mta-tags.hidden{max-height:0;opacity:0;overflow:hidden;}
  #mta-tags .track{display:block;white-space:nowrap;overflow-x:auto;padding:8px 10px 10px;}
  #mta-tags button{
    display:inline-block;margin-right:8px;
    background:#fff;border:1px solid rgba(0,0,0,.05);
    border-radius:999px;padding:6px 12px;font-size:13px;
    cursor:pointer;
  }

  #mta-input{
    background:#fff;border-top:1px solid rgba(0,0,0,.05);
    padding:8px;display:flex;gap:8px;align-items:center;
  }
  #mta-in{
    flex:1;border:1px solid rgba(0,0,0,.1);border-radius:16px;
    padding:9px 10px 9px 12px;background:#F2F4F7;
  }
  #mta-send{
    width:40px;height:40px;border:none;border-radius:50%;
    background:linear-gradient(160deg,#0084FF,#00B2FF);
    color:#fff;cursor:pointer;box-shadow:0 6px 18px rgba(0,132,255,.4);
  }

  /* mobile */
  @media(max-width:520px){
    #mta-card{right:8px;left:8px;width:auto;height:70vh;}
    #mta-body{padding-bottom:8px;}
  }
  @media(prefers-color-scheme:dark){
    :root{--m-bg:#1a1c20;--m-text:#ecf0f5;}
    #mta-body{background:linear-gradient(180deg,#131416,#1a1c20);}
    .m-msg.bot{background:#23252a;color:#fff;border:1px solid rgba(255,255,255,.03);}
    #mta-input{background:#1a1c20;border-top:1px solid rgba(255,255,255,.04);}
    #mta-in{background:#121317;color:#fff;border:1px solid rgba(255,255,255,.1);}
    #mta-tags{background:#1c1e22;border-top:1px solid rgba(255,255,255,.05);}
    #mta-tags button{background:#22242a;color:#fff;border:1px solid rgba(255,255,255,.1);}
  }
  `;

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
            ${CFG.map?`<a class="act" href="${CFG.map}" target="_blank" rel="noopener" title="Bản đồ">📍</a>`:""}
          </div>
          <button id="mta-close" aria-label="Đóng">×</button>
        </div>
      </header>
      <main id="mta-body" role="log"></main>
      <div id="mta-tags" role="toolbar" aria-label="Gợi ý nhanh">
        <div class="track" id="mta-tag-track">
          <button data-q="Giá thuê">💰 Giá thuê</button>
          <button data-q="Thuê xe ga">🛵 Xe ga</button>
          <button data-q="Thuê xe số">🏍 Xe số</button>
          <button data-q="Thuê theo tháng">📆 Theo tháng</button>
          <button data-q="Giao xe tận nơi">🚚 Giao tận nơi</button>
          <button data-q="Thủ tục thuê">📄 Thủ tục</button>
          <button data-q="Đặt cọc">💸 Đặt cọc</button>
        </div>
      </div>
      <footer id="mta-input">
        <input id="mta-in" placeholder="Nhắn cho ${CFG.brand}..." autocomplete="off" />
        <button id="mta-send" aria-label="Gửi tin">➤</button>
      </footer>
    </section>
  </div>
  `;

  function injectUI(){
    if ($('#mta-root')) return;
    const wrap = document.createElement("div");
    wrap.innerHTML = HTML;
    document.body.appendChild(wrap.firstElementChild);
    const st = document.createElement("style");
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ====== SESSION ====== */
  function getSess(){
    const arr = safeJSON(localStorage.getItem(K.sess)) || [];
    return Array.isArray(arr) ? arr : [];
  }
  function saveSess(arr){
    try{
      localStorage.setItem(K.sess, JSON.stringify(arr.slice(-MAX_MSG)));
    }catch{}
  }
  function addMsg(role, text){
    if(!text) return;
    const body = $("#mta-body");
    if(!body) return;
    const el = document.createElement("div");
    el.className = "m-msg " + (role === "user" ? "user" : "bot");
    el.textContent = text;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;

    const arr = getSess();
    arr.push({role, text, t: Date.now()});
    saveSess(arr);
  }
  function renderSess(){
    const body = $("#mta-body");
    body.innerHTML = "";
    const arr = getSess();
    if (arr.length) {
      arr.forEach(m => addMsg(m.role, m.text));
    } else {
      addMsg("bot", naturalize(`Xin chào 👋, em là nhân viên hỗ trợ của ${CFG.brand}. Anh/chị cần thuê xe số, xe ga, theo tháng hay muốn biết thủ tục/đặt cọc?`));
    }
  }

  /* ====== CONTEXT ====== */
  function getCtx(){ return safeJSON(localStorage.getItem(K.ctx)) || {turns:[]}; }
  function pushCtx(delta){
    try{
      const ctx = getCtx();
      ctx.turns.push(Object.assign({t:Date.now()}, delta||{}));
      ctx.turns = ctx.turns.slice(-(CFG.maxContextTurns||5));
      localStorage.setItem(K.ctx, JSON.stringify(ctx));
    }catch{}
  }

  /* ====== NLP nhỏ ====== */
  const TYPE_MAP = [
    {k:'xe số',     re:/\b(xe\s*số|wave|blade|sirius|jupiter)\b/i, canon:'xe số'},
    {k:'xe ga',     re:/\b(xe\s*ga|vision|air\s*blade|lead|scoopy|vespa)\b/i, canon:'xe ga'},
    {k:'air blade', re:/\b(air\s*blade|airblade|ab)\b/i, canon:'air blade'},
    {k:'vision',    re:/\bvision\b/i, canon:'vision'},
    {k:'50cc',      re:/\b(50\s*cc|xe\s*50)\b/i, canon:'50cc'},
    {k:'xe điện',   re:/\b(xe\s*điện|vinfast|yadea|dibao|gogo)\b/i, canon:'xe điện'},
    {k:'xe côn tay',re:/\b(côn\s*tay|tay\s*côn|winner|exciter)\b/i, canon:'xe côn tay'}
  ];
  function detectType(t){
    for(const it of TYPE_MAP){ if(it.re.test(t)) return it.canon; }
    return null;
  }
  function detectQty(t){
    const m = t.match(/(\d+)\s*(ngày|day|tuần|tuan|week|tháng|thang|month)?/i);
    if(!m) return null;
    const n = parseInt(m[1],10);
    if(!n) return null;
    let unit = "ngày";
    if(m[2]){
      if(/tuần|tuan|week/i.test(m[2])) unit="tuần";
      else if(/tháng|thang|month/i.test(m[2])) unit="tháng";
    }
    return {n, unit};
  }
  function detectIntent(t){
    const low = (t||"").toLowerCase();
    return {
      needPrice: /(giá|bao nhiêu|thuê|tính tiền|cost|price)/i.test(low),
      needDocs: /(thủ tục|giấy tờ|cccd|passport|hộ chiếu)/i.test(low),
      needDeposit: /(đặt cọc|cọc|tiền cọc|coc)/i.test(low),
      needDelivery: /(giao xe|giao tận nơi|ship xe|vận chuyển)/i.test(low),
      needContact: /(liên hệ|zalo|gọi|hotline|sđt|sdt)/i.test(low)
    };
  }

  /* ====== BẢNG GIÁ (fallback khi chưa đọc TXT) ====== */
  const PRICE_TABLE = {
    'xe số':      { day:[150000], week:[600000,700000], month:[850000,1200000] },
    'xe ga':      { day:[150000,200000], week:[600000,1000000], month:[1100000,2000000] },
    'air blade':  { day:[200000,230000], week:[800000,900000], month:[1800000,2000000] },
    'vision':     { day:[200000], week:[850000,900000], month:[1900000,2000000] },
    'xe điện':    { day:[170000,200000], week:[800000], month:[1600000] },
    '50cc':       { day:[200000], week:[800000], month:[1700000] },
    'xe côn tay': { day:[300000,350000], week:[1200000], month:[2500000] }
  };
  function nf(n){ return (n||0).toLocaleString("vi-VN"); }
  function fmt(arr){ if(!arr||!arr.length) return null; return arr.length===1?nf(arr[0])+"đ":nf(arr[0])+"–"+nf(arr[1])+"đ"; }
  function priceSummary(type){
    const it=PRICE_TABLE[type]; if(!it) return "";
    const d=fmt(it.day), w=fmt(it.week), m=fmt(it.month);
    const parts=[]; if(d)parts.push(d+"/ngày"); if(w)parts.push(w+"/tuần"); if(m)parts.push(m+"/tháng");
    return parts.join(", ");
  }
  function baseFor(type,unit){
    const it=PRICE_TABLE[type]; if(!it) return null;
    const key=unit==="tuần"?"week":(unit==="tháng"?"month":"day");
    const arr=it[key]; if(!arr) return null;
    return arr[0];
  }
  function composePrice(type, qty){
    if(!type) type="xe số";
    if(!qty){
      return naturalize(`Giá ${type} khoảng ${priceSummary(type)}. Anh/chị thuê mấy ngày/tuần/tháng để em tính đúng giá?`);
    }
    const base = baseFor(type, qty.unit);
    if(!base){
      return naturalize(`Giá theo ${qty.unit} của ${type} cần kiểm tra. Anh/chị nhắn Zalo ${CFG.phone} giúp em để chốt mẫu xe.`);
    }
    const total = base * qty.n;
    const label = qty.unit==="ngày"?`${qty.n} ngày`:qty.unit==="tuần"?`${qty.n} tuần`:`${qty.n} tháng`;
    return naturalize(`Ước tính thuê ${type} ${label} khoảng ${nf(total)}đ. Nhắn Zalo ${CFG.phone} để em gửi hình xe và giữ xe.`);
  }

  /* ====== AUTO LEARN (JSON sitemap + HTML + TXT) ====== */
  function tk(s){ return (s||"").toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu,' ').split(/\s+/).filter(Boolean); }
  function loadLearn(){ return safeJSON(localStorage.getItem(K.learn)) || {pages:[], texts:[], ts:0}; }
  function saveLearn(o){ try{ localStorage.setItem(K.learn, JSON.stringify(o)); localStorage.setItem(K.ts, String(o.ts||nowSec())); }catch{} }
  function looksVN(s){
    if(/[ăâêôơưđà-ỹ]/i.test(s)) return true;
    const hits = (s.match(/\b(xe|thuê|giá|cọc|liên hệ|hà nội|hoàn kiếm)\b/gi)||[]).length;
    return hits>=2;
  }

  async function fetchText(url){
    const ctl = new AbortController();
    const id = setTimeout(()=>ctl.abort(), CFG.fetchTimeoutMs);
    try{
      const res = await fetch(url, {signal:ctl.signal, cache:'no-store', credentials:'omit'});
      clearTimeout(id);
      if(!res.ok) return null;
      return await res.text();
    }catch(e){ clearTimeout(id); return null; }
  }
  function parseXML(t){ try{return (new DOMParser()).parseFromString(t,"text/xml");}catch{return null;} }
  function parseHTML(t){ try{return (new DOMParser()).parseFromString(t,"text/html");}catch{return null;} }

  async function readSitemapJSON(base){
    // kỳ vọng cấu trúc như bạn đã làm trong moto_sitemap.json
    const url = base.replace(/\/+$/,'') + "/moto_sitemap.json";
    try{
      const txt = await fetchText(url);
      if(!txt) return null;
      const data = JSON.parse(txt);
      const pages = (data?.categories?.pages?.list)||[];
      const datasets = (data?.categories?.datasets?.list)||[];
      return {pages, datasets};
    }catch(e){ return null; }
  }

  async function readSitemapXML(base){
    const root = base.replace(/\/+$/,'');
    const cands = ["/sitemap.xml","/sitemap_index.xml"].map(p=>root+p);
    for(const c of cands){
      try{
        const xml = await fetchText(c); if(!xml) continue;
        const doc = parseXML(xml); if(!doc) continue;
        const sites = Array.from(doc.getElementsByTagName("sitemap")).map(x=>x.getElementsByTagName("loc")[0]?.textContent?.trim()).filter(Boolean);
        if(sites.length){
          const all=[]; for(const loc of sites){ try{ const child = await readSitemapXML((new URL(loc)).origin); all.push(...(child||[])); }catch{} }
          return all;
        }
        const urls = Array.from(doc.getElementsByTagName("url")).map(u=>u.getElementsByTagName("loc")[0]?.textContent?.trim()).filter(Boolean);
        if(urls.length) return urls;
      }catch(e){}
    }
    return null;
  }

  async function fallbackCrawl(base){
    const start = base.endsWith("/")?base:base+"/";
    const html = await fetchText(start); if(!html) return [start];
    const doc = parseHTML(html); if(!doc) return [start];
    const links = Array.from(doc.querySelectorAll("a[href]"));
    const set = new Set([start]);
    links.forEach(a=>{
      try{
        const u = new URL(a.getAttribute("href"), start).toString().split("#")[0];
        if(u.startsWith(start)) set.add(u);
      }catch{}
    });
    return Array.from(set).slice(0,40);
  }

  async function extractPage(url){
    const txt = await fetchText(url); if(!txt) return null;
    let title = (txt.match(/<title[^>]*>([^<]+)<\/title>/i)||[])[1]||"";
    title = title.replace(/\s+/g," ").trim();
    let desc = (txt.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"]+)["']/i)||[])[1]||"";
    if(!desc){
      desc = txt.replace(/<script[\s\S]*?<\/script>/gi," ")
                .replace(/<style[\s\S]*?<\/style>/gi," ")
                .replace(/<[^>]+>/g," ")
                .replace(/\s+/g," ")
                .trim()
                .slice(0,700);
    }
    const sample = (title+" "+desc).toLowerCase();
    if(CFG.viOnly && !looksVN(sample)) return null;
    return {url, title, text: desc};
  }

  async function pullPages(urls){
    const out=[];
    for(const u of urls.slice(0,CFG.maxPagesPerDomain)){
      const pg = await extractPage(u);
      if(pg) out.push(pg);
      await sleep(CFG.fetchPauseMs);
    }
    return out;
  }

  async function pullTxt(urls){
    const out=[];
    for(const u of urls){
      if(!/\.txt(\?|$)/i.test(u)) continue;
      const t = await fetchText(u); if(!t) continue;
      const clean = t.replace(/\s+/g," ").trim();
      if(clean) out.push({url:u, text: clean});
      await sleep(60);
    }
    return out;
  }

  async function learnDomain(origin){
    const base = origin.replace(/\/+$/,'') + "/";
    let pages=[], datasets=[];
    // ưu tiên JSON sitemap của bạn
    const j = await readSitemapJSON(base);
    if(j){
      pages = await pullPages(j.pages||[]);
      const txts = await pullTxt(j.datasets||[]);
      return {pages, texts: txts};
    }
    // nếu không có JSON sitemap: thử XML
    const xmlUrls = await readSitemapXML(base);
    if(xmlUrls && xmlUrls.length){
      pages = await pullPages(xmlUrls);
    }else{
      // fallback crawl
      const urls = await fallbackCrawl(base);
      pages = await pullPages(urls);
    }
    // đoán thư mục du-lieu/
    const guessTxt = [
      "thuengay.txt","tuan.txt","thang.txt","thutuc.txt","dieukien.txt","giaoxenmay.txt","hoidap.txt","huongdanthue.txt"
    ].map(n=> base + "du-lieu/" + n);
    const txts = await pullTxt(guessTxt);
    return {pages, texts: txts};
  }

  async function learnSites(list, force=false){
    const cache = loadLearn();
    const out = {pages:[], texts:[], ts: nowSec()};
    const now = Date.now();
    const lastTs = parseInt(localStorage.getItem(K.ts)||"0",10)*1000 || 0;
    const expired = !lastTs || (now - lastTs) > (CFG.refreshHours*3600*1000);
    const resetTooOld = !lastTs || (now - lastTs) > (RESET_AFTER_DAYS*24*3600*1000);

    if(!force && !expired && cache.pages?.length){
      return cache; // dùng cache còn mới
    }
    if(resetTooOld){ try{ localStorage.removeItem(K.learn); }catch{} }

    let total=0;
    for(const site of Array.from(new Set(list||[]))){
      const res = await learnDomain(site);
      if(res.pages?.length) out.pages.push(...res.pages);
      if(res.texts?.length) out.texts.push(...res.texts);
      total += (res.pages?.length||0);
      if(total >= CFG.maxTotalPages) break;
    }
    saveLearn(out);
    return out;
  }

  function getIndexFlat(){
    const cache = loadLearn();
    const out=[];
    (cache.pages||[]).forEach(pg=> out.push(Object.assign({source:"html"}, pg)));
    (cache.texts||[]).forEach(tx=> out.push(Object.assign({source:"txt", title:"TXT Dataset", text:tx.text, url:tx.url})));
    return out;
  }

  function searchIndex(query, k=3){
    const qtok = tk(query);
    if(!qtok.length) return [];
    const idx = getIndexFlat();
    return idx.map(it=>{
      const txt = ((it.title||"")+" "+(it.text||"")+" "+(it.url||"")).toLowerCase();
      let score=0; qtok.forEach(t=>{ if(txt.includes(t)) score++; });
      return Object.assign({score}, it);
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,k);
  }

  /* ====== ANSWER ENGINE ====== */
  const PREFIX = ["Chào anh/chị,","Xin chào 👋,","Em chào anh/chị,","Em ở Nguyễn Tú đây,"];
  const pick = a => a[Math.floor(Math.random()*a.length)];
  function polite(s){
    s = s || "em chưa nhận được câu hỏi, anh/chị nhập lại giúp em.";
    return naturalize(`${pick(PREFIX)} ${s}`);
  }

  function snippetFromLearn(q, intentHint){
    const top = searchIndex(q + " " + (intentHint||""), 3);
    if(top && top.length){
      const t = top[0];
      const sn = (t.text||"").replace(/\s+/g," ").trim().slice(0,260);
      return {snippet: sn, url: t.url};
    }
    return null;
  }

  function answerDocs(){
    // ưu tiên TXT nếu có
    const s = snippetFromLearn("thủ tục giấy tờ cccd passport đặt cọc", "thủ tục");
    if(s && s.snippet){
      return naturalize(s.snippet + (s.url?` (nguồn: ${s.url})`:""));
    }
    // fallback nhanh theo bạn cung cấp
    return naturalize("Thủ tục gọn: CCCD/hộ chiếu + cọc theo xe. Không đặt cọc giấy tờ thì thêm 500k thay giấy tờ. Khu Hoàn Kiếm – phố cổ có thể giảm cọc. Cần chi tiết liên hệ Zalo "+CFG.phone+".");
  }
  function answerDeposit(){
    const s = snippetFromLearn("đặt cọc tiền cọc xe số xe ga xe 50cc", "đặt cọc");
    if(s && s.snippet){
      return naturalize(s.snippet + (s.url?` (nguồn: ${s.url})`:""));
    }
    // fallback theo dữ liệu bạn đưa
    return naturalize("Cọc tham khảo: xe số 2–3 triệu; xe ga 2–5 triệu; 50cc khoảng 4 triệu. Có phương án giảm cọc khi đủ giấy tờ. Liên hệ Zalo "+CFG.phone+" để chốt theo mẫu xe.");
  }
  function answerDelivery(){
    const s = snippetFromLearn("giao xe máy phí giao xe nội thành 20k 100k điều kiện", "giao xe");
    if(s && s.snippet){
      return naturalize(s.snippet + (s.url?` (nguồn: ${s.url})`:""));
    }
    // fallback theo bạn cung cấp
    return naturalize("Phí giao xe nội thành 20k–100k. Thuê 1–4 ngày: mời đến cửa hàng chọn xe; thuê theo tuần/tháng: có nhận giao xe. Vì là mô hình gia đình (không công ty) nên giá qua Zalo có thể rẻ hơn. Zalo "+CFG.phone+".");
  }

  async function deepAnswer(userText){
    const q = (userText||"").trim();
    const intents = detectIntent(q);
    let type = detectType(q);
    const qty = detectQty(q);

    if(CFG.deepContext){
      const ctx = getCtx();
      for(let i=ctx.turns.length-1;i>=0;i--){
        const t = ctx.turns[i];
        if(!type && t.type) type=t.type;
        if(!qty && t.qty) return composePrice(type||t.type, t.qty);
        if(type && qty) break;
      }
    }

    if(intents.needContact) return polite(`anh/chị gọi ${CFG.phone} hoặc Zalo ${CFG.zalo||CFG.phone} là có người nhận ngay.`);
    if(intents.needDeposit) return answerDeposit();
    if(intents.needDelivery) return answerDelivery();
    if(intents.needDocs) return answerDocs();
    if(intents.needPrice) return composePrice(type, qty);

    // thử retrieval khi hỏi chung chung
    try{
      const top = searchIndex(q, 3);
      if(top && top.length){
        const lines = top.map(t=>{
          const sn = (t.text||"").replace(/\s+/g," ").trim().slice(0,140);
          let dom = t.source || "nguồn";
          try{ if(t.url) dom = new URL(t.url).hostname.replace(/^www\./,""); }catch{}
          return `• ${sn}${t.url?` (${dom})`:""}`;
        });
        return naturalize(`Em tìm được vài nội dung liên quan:\n${lines.join("\n")}\nAnh/chị muốn em tóm tắt cụ thể mục nào không?`);
      }
    }catch(e){}

    return polite(`anh/chị muốn thuê xe loại nào (xe số, xe ga, xe điện, 50cc, côn tay) và thuê bao nhiêu ngày để em báo đúng giá.`);
  }

  /* ====== SEND / UI CONTROL ====== */
  let isOpen = false;
  let sending = false;

  function showTyping(){
    const body = $("#mta-body");
    if(!body) return;
    const box = document.createElement("div");
    box.id = "mta-typing";
    box.className = "m-msg bot";
    box.textContent = "Đang nhập…";
    body.appendChild(box);
    body.scrollTop = body.scrollHeight;
  }
  function hideTyping(){
    const t = $("#mta-typing");
    if(t) t.remove();
  }

  async function sendUser(text){
    if(sending) return;
    const v = (text||"").trim();
    if(!v) return;
    sending = true;
    addMsg("user", v);
    pushCtx({from:"user",raw:v,type:detectType(v),qty:detectQty(v)});

    // delay 3.5s – 6.0s (như yêu cầu)
    showTyping();
    const wait = 3500 + Math.random()*2500;
    await sleep(wait);

    const ans = await deepAnswer(v);
    hideTyping();
    addMsg("bot", ans);
    pushCtx({from:"bot",raw:ans});
    sending = false;
  }

  function openChat(){
    if(isOpen) return;
    $("#mta-card").classList.add("open");
    $("#mta-backdrop").classList.add("show");
    $("#mta-bubble").style.display="none";
    isOpen = true;
    renderSess();
    setTimeout(()=>{ const i=$("#mta-in"); if(i) i.focus();}, 160);
  }
  function closeChat(){
    if(!isOpen) return;
    $("#mta-card").classList.remove("open");
    $("#mta-backdrop").classList.remove("show");
    $("#mta-bubble").style.display="flex";
    isOpen = false;
    hideTyping();
  }

  function bindEvents(){
    $("#mta-bubble").addEventListener("click", openChat);
    $("#mta-backdrop").addEventListener("click", closeChat);
    $("#mta-close").addEventListener("click", closeChat);
    $("#mta-send").addEventListener("click", ()=>{
      const inp=$("#mta-in");
      const v=inp.value.trim();
      if(!v) return;
      inp.value="";
      sendUser(v);
    });
    $("#mta-in").addEventListener("keydown", e=>{
      if(e.key==="Enter" && !e.shiftKey){
        e.preventDefault();
        const v=e.target.value.trim();
        if(!v) return;
        e.target.value="";
        sendUser(v);
      }
    });
    const track = $("#mta-tag-track");
    if(track){
      track.querySelectorAll("button").forEach(btn=>{
        btn.addEventListener("click", ()=> sendUser(btn.dataset.q||btn.textContent));
      });
    }
  }

  function ready(fn){
    if(document.readyState==="complete"||document.readyState==="interactive") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(async ()=>{
    injectUI();
    bindEvents();

    // Autolearn: học HTML + TXT từ moto_sitemap.json (nếu có) hoặc fallback crawl
    if(CFG.autolearn){
      try{
        const sites = Array.from(new Set(CFG.extraSites||[location.origin]));
        await learnSites(sites, false);
      }catch(e){ console.warn("MotoAI v38 autolearn err",e); }
    }

    console.log("%cMotoAI v38 Stable — UI=Messenger, Core=37.6, delay=3.5–6s","color:"+CFG.themeColor+";font-weight:bold;");
  });

  // Public API
  window.MotoAI_v38 = {
    open: openChat,
    close: closeChat,
    send: sendUser,
    learnNow: (sites,force)=>learnSites(sites,force),
    getIndex: getIndexFlat
  };

})();
