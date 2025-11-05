/* motoai_v37_6_ui20low_fix2_full.js
   UI thấp kiểu v20 (ổn định mobile) + Logic thông minh 37.6 + Fix bàn phím che nút gửi
   - Auto learn moto_sitemap.json (ưu tiên TXT) + fallback crawl sitemap.xml/index
   - Pricing chính xác theo thời lượng (không liệt kê loạn)
   - 8 tag: Xe số, Xe ga, Xe điện, 50cc, Côn tay, Giao xe, Thủ tục, Bảng giá
   - Delay 3.5–6.0s tự nhiên
   - Keep 10 messages, deep context 5 turns
*/
(function(){
  if (window.MotoAI_v37_6_UI20LOW_LOADED) return;
  window.MotoAI_v37_6_UI20LOW_LOADED = true;

  /* ====== CONFIG ====== */
  const DEF = {
    brand: "Nguyen Tu",
    phone: "0942467674",
    zalo: "https://zalo.me/0942467674",
    map: "https://maps.app.goo.gl/SR1hcwnCQjPkAvDh7",
    avatar: "🛵",
    themeColor: "#0084FF",
    autolearn: true,
    deepContext: true,
    maxContextTurns: 5,
    viOnly: true,
    extraSites: [location.origin],
    crawlDepth: 1,
    refreshHours: 24,         // học lại sau mỗi 24h
    maxPagesPerDomain: 60,
    maxTotalPages: 200,
    fetchTimeoutMs: 10000,
    fetchPauseMs: 160,
    disableQuickMap: false,
    keepMessages: 10,
    // tốc độ phản hồi
    replyMinMs: 3500,
    replyMaxMs: 6000
  };
  const ORG = (window.MotoAI_CONFIG || {});
  const CFG = Object.assign({}, DEF, ORG);

  /* ====== KEYS ====== */
  const K = {
    sess : "MotoAI_v37_6_ui20low_session",
    ctx  : "MotoAI_v37_6_ui20low_ctx",
    learn: "MotoAI_v37_6_ui20low_learn",
    stamp: "MotoAI_v37_6_ui20low_learnStamp",
    clean: "MotoAI_v37_6_ui20low_lastClean"
  };

  /* ====== UTILS ====== */
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const safeJSON = s => { try { return JSON.parse(s); } catch(e){ return null; } };
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const nowSec = ()=> Math.floor(Date.now()/1000);
  const pick = a => a[Math.floor(Math.random()*a.length)];
  function nf(n){ return (n||0).toLocaleString("vi-VN"); }

  // Làm câu Việt tự nhiên + chỉ thêm dấu nếu thiếu
  function naturalize(t){
    if(!t) return t;
    let s = " " + t + " ";
    s = s.replace(/\s+ạ([.!?,\s]|$)/gi, "$1")
         .replace(/\s+nhé([.!?,\s]|$)/gi, "$1")
         .replace(/\s+nha([.!?,\s]|$)/gi, "$1")
         .replace(/\s{2,}/g," ")
         .trim();
    if(!/[.!?…]$/.test(s)) s += ".";
    return s.replace(/\.\./g,".");
  }

  /* ====== UI ====== */
  const CSS = `
  :root {
    --mta-z: 2147483647;
    --m-blue: ${CFG.themeColor};
    --m-bg: #ffffff;
    --m-text: #0b1220;
    --m-line: rgba(0,0,0,.08);
    --vh: 1vh;
  }
  #mta-root{
    position:fixed;
    left:16px;
    bottom:calc(18px + env(safe-area-inset-bottom,0));
    z-index:var(--mta-z);
    font-family:-apple-system,system-ui,Segoe UI,Roboto,"Helvetica Neue",Arial,sans-serif;
    transition:bottom .22s ease,right .22s ease;
  }
  #mta-bubble{
    width:56px;height:56px;border:none;border-radius:14px;
    background:#e6f2ff;display:flex;align-items:center;justify-content:center;
    cursor:pointer;box-shadow:0 10px 24px rgba(0,0,0,.18);
    outline:1px solid rgba(0,0,0,.06);
  }
  #mta-bubble svg{display:block}
  #mta-backdrop{
    position:fixed;inset:0;background:rgba(0,0,0,.15);
    opacity:0;pointer-events:none;transition:opacity .15s ease;
  }
  #mta-backdrop.show{opacity:1;pointer-events:auto;}

  #mta-card{
    position:fixed;left:0;right:0;bottom:0;margin:auto;
    width:min(900px,calc(100% - 24px));
    height:calc(var(--vh,1vh) * 64);
    max-height:720px;
    background:var(--m-bg);color:var(--m-text);
    border-radius:16px 16px 0 0;
    box-shadow:0 -12px 30px rgba(0,0,0,.18);
    transform:translateY(110%);
    display:flex;flex-direction:column;overflow:hidden;
    transition:transform .22s cubic-bezier(.22,1,.36,1);
  }
  #mta-card.open{transform:translateY(0);}

  #mta-header{
    border-bottom:1px solid var(--m-line);
    background:#fff;
  }
  #mta-header .brand{
    display:flex;align-items:center;gap:8px;justify-content:space-between;
    padding:8px 10px;
  }
  .b-left{display:flex;align-items:center;gap:10px}
  .avatar{
    width:28px;height:28px;border-radius:50%;
    background:rgba(0,132,255,.10);display:flex;align-items:center;justify-content:center;font-size:14px;
  }
  .info .name{font-weight:800;line-height:1;color:var(--m-blue);font-size:14px}
  .info .sub{font-size:12px;opacity:.8}
  .quick{display:flex;gap:6px;margin-left:auto;margin-right:6px}
  .q{
    width:28px;height:28px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;
    text-decoration:none;font-size:12px;font-weight:800;background:#f2f5f8;color:#111;border:1px solid var(--m-line)
  }
  #mta-close{background:none;border:none;font-size:20px;color:var(--m-blue);cursor:pointer}

  #mta-body{
    flex:1;overflow:auto;padding:10px 12px;font-size:15px;background:#fff;
  }
  .m-msg{
    margin:8px 0;padding:9px 12px;border-radius:16px;max-width:84%;
    line-height:1.45;box-shadow:0 1px 2px rgba(0,0,0,.06);
    word-break:break-word;
  }
  .m-msg.bot{background:#f9fafb;color:#0b1220;border:1px solid rgba(0,0,0,.06)}
  .m-msg.user{background:#e9f3ff;color:#0b1220;margin-left:auto;border:1px solid rgba(0,132,255,.22)}

  #mta-typing{display:inline-flex;gap:6px;align-items:center}
  #mta-typing .dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#999;animation:mblink .9s infinite alternate}
  #mta-typing .dot:nth-child(2){animation-delay:.15s}
  #mta-typing .dot:nth-child(3){animation-delay:.3s}
  @keyframes mblink { from{opacity:.3; transform:translateY(0)} to{opacity:1; transform:translateY(-2px)} }

  /* TAGS (8 tag) */
  #mta-tags{
    position:relative;background:#fff;border-top:1px solid var(--m-line);
    transition:max-height .22s ease, opacity .18s ease;
  }
  #mta-tags.hidden{max-height:0; opacity:0; overflow:hidden;}
  #mta-tags .track{
    display:block;overflow-x:auto;white-space:nowrap;padding:8px 10px 10px 10px;scroll-behavior:smooth;
  }
  #mta-tags button{
    display:inline-block;margin-right:8px;padding:7px 12px;border:none;border-radius:999px;
    background:#f6f9ff;color:#0b1220;box-shadow:0 1px 2px rgba(0,0,0,.06);border:1px solid rgba(0,0,0,.08);
    font-weight:700;cursor:pointer
  }
  #mta-tags button:active{transform:scale(.98)}

  /* INPUT */
  #mta-input{
    display:flex;gap:8px;padding:10px;background:#fff;border-top:1px solid var(--m-line);
    padding-bottom:calc(10px + env(safe-area-inset-bottom,0));
  }
  #mta-in{
    flex:1;padding:11px 12px;border-radius:18px;border:1px solid rgba(0,0,0,.12);font-size:15px;background:#F6F8FB
  }
  #mta-send{
    width:44px;height:44px;border:none;border-radius:50%;
    background:linear-gradient(90deg,#0084FF,#00B2FF);color:#fff;font-weight:800;cursor:pointer;
    box-shadow:0 6px 18px rgba(0,132,255,.30)
  }
  #mta-clear{
    position:absolute;top:8px;right:46px;background:none;border:none;font-size:16px;opacity:.85;cursor:pointer
  }

  @media(prefers-color-scheme:dark){
    :root{--m-bg:#1b1c1f; --m-text:#f3f6fb; --m-line:rgba(255,255,255,.1)}
    #mta-card{background:var(--m-bg);color:var(--m-text)}
    #mta-header{background:linear-gradient(180deg, rgba(0,132,255,.08), rgba(0,132,255,0));border-bottom:1px solid var(--m-line)}
    #mta-body{background:#1b1c1f}
    .m-msg.bot{background:#23262b;color:#f3f6fb;border:1px solid rgba(255,255,255,.08)}
    .m-msg.user{background:#20324a;color:#eaf4ff;border:1px solid rgba(0,132,255,.35)}
    #mta-tags,#mta-input{background:#202226;border-top:1px solid var(--m-line)}
    #mta-in{background:#16181c;color:#f0f3f7;border:1px solid rgba(255,255,255,.15)}
    .q{background:#2a2d33;color:#f3f6f8;border:1px solid rgba(255,255,255,.12)}
  }

  @media(max-width:520px){
    #mta-card{width:calc(100% - 16px);height:calc(var(--vh,1vh) * 70)}
    .q{width:28px;height:28px}
  }
  `;

  const HTML = `
  <div id="mta-root" aria-live="polite">
    <button id="mta-bubble" aria-label="Mở chat" title="Chat">
      <svg viewBox="0 0 64 64" width="28" height="28" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="#0084ff"></circle>
        <path d="M20 36l9-11 6 6 9-9-9 14-6-6-9 6z" fill="#fff"></path>
      </svg>
    </button>
    <div id="mta-backdrop"></div>
    <section id="mta-card" role="dialog" aria-label="Chat ${CFG.brand}" aria-hidden="true">
      <header id="mta-header">
        <div class="brand">
          <div class="b-left">
            <div class="avatar">${CFG.avatar}</div>
            <div class="info">
              <div class="name">${CFG.brand}</div>
              <div class="sub">Hỗ trợ trực tuyến</div>
            </div>
          </div>
          <nav class="quick">
            ${CFG.phone?`<a class="q" href="tel:${CFG.phone}" title="Gọi">📞</a>`:""}
            ${CFG.zalo?`<a class="q" href="${CFG.zalo}" target="_blank" rel="noopener" title="Zalo">Z</a>`:""}
            ${CFG.map?`<a class="q q-map" href="${CFG.map}" target="_blank" rel="noopener" title="Bản đồ">📍</a>`:""}
          </nav>
          <button id="mta-close" title="Đóng" aria-label="Đóng">✕</button>
        </div>
      </header>

      <main id="mta-body" role="log"></main>

      <div id="mta-tags" role="toolbar" aria-label="Gợi ý nhanh">
        <div class="track" id="mta-tag-track">
          <button data-tag="xe số">🏍️ Xe số</button>
          <button data-tag="xe ga">🛵 Xe ga</button>
          <button data-tag="xe điện">⚡ Xe điện</button>
          <button data-tag="50cc">🚲 50cc</button>
          <button data-tag="xe côn tay">🏍️ Côn tay</button>
          <button data-tag="giao xe">🚚 Giao xe</button>
          <button data-tag="thủ tục">📄 Thủ tục</button>
          <button data-tag="bảng giá">💰 Bảng giá</button>
        </div>
      </div>

      <footer id="mta-input">
        <input id="mta-in" placeholder="Nhắn cho ${CFG.brand}..." autocomplete="off" />
        <button id="mta-send" aria-label="Gửi">➤</button>
      </footer>
      <button id="mta-clear" title="Xóa hội thoại" aria-label="Xóa hội thoại">🗑</button>
    </section>
  </div>
  `;

  /* ====== SESSION ====== */
  function getSess(){
    const arr = safeJSON(localStorage.getItem(K.sess)) || [];
    return Array.isArray(arr) ? arr : [];
  }
  function saveSess(arr){
    try{ localStorage.setItem(K.sess, JSON.stringify(arr.slice(-(CFG.keepMessages||10)))); }catch{}
  }
  function addMsg(role, text){
    if(!text) return;
    const body = $("#mta-body"); if(!body) return;
    const el = document.createElement("div");
    el.className = "m-msg " + (role === "user" ? "user" : "bot");
    el.textContent = text;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;

    const arr = getSess(); arr.push({role, text, t: Date.now()}); saveSess(arr);
  }
  function renderSess(){
    const body = $("#mta-body"); if(!body) return;
    body.innerHTML = "";
    const arr = getSess();
    if (arr.length) arr.forEach(m => addMsg(m.role, m.text));
    else addMsg("bot", naturalize(`Xin chào 👋, em là nhân viên của ${CFG.brand}. Anh/chị chọn Xe số / Xe ga / Xe điện / 50cc / Côn tay — em báo giá theo số ngày cụ thể ạ.`));
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

  /* ====== NLP ====== */
  const TYPE_MAP = [
    {k:'xe số',     re:/\b(xe số|wave|blade|sirius|jupiter|future|dream)\b/i, canon:'xe số'},
    {k:'xe ga',     re:/\b(xe ga|vision|air\s*blade|lead|liberty|vespa|grande|janus|sh)\b/i, canon:'xe ga'},
    {k:'air blade', re:/\b(air\s*blade|airblade|ab)\b/i, canon:'air blade'},
    {k:'vision',    re:/\bvision\b/i, canon:'vision'},
    {k:'xe điện',   re:/\b(xe điện|vinfast|yadea|dibao|klara|evo)\b/i, canon:'xe điện'},
    {k:'50cc',      re:/\b(50\s*cc|xe 50)\b/i, canon:'50cc'},
    {k:'xe côn tay',re:/\b(côn tay|tay côn|exciter|winner|raider|cb150|cbf190|w175|msx)\b/i, canon:'xe côn tay'}
  ];
  function detectType(t){
    for(const it of TYPE_MAP){ if(it.re.test(t)) return it.canon; }
    return null;
  }
  function detectQty(t){
    const m = (t||"").match(/(\d+)\s*(ngày|day|tuần|tuan|week|tháng|thang|month)?/i);
    if(!m) return null;
    const n = parseInt(m[1],10); if(!n) return null;
    let unit = "ngày";
    if(m[2]){
      if(/tuần|tuan|week/i.test(m[2])) unit="tuần";
      else if(/tháng|thang|month/i.test(m[2])) unit="tháng";
    }
    return {n, unit};
  }
  function detectIntent(t){
    const s=(t||"").toLowerCase();
    return {
      needPrice:   /(giá|bao nhiêu|thuê|tính tiền|cost|price)/i.test(s),
      needDocs:    /(thủ tục|giấy tờ|cccd|passport|hộ chiếu)/i.test(s),
      needContact: /(liên hệ|zalo|gọi|hotline|sđt|sdt|phone)/i.test(s),
      needDelivery:/(giao|ship|tận nơi|đưa xe|mang xe|giao xe)/i.test(s),
      needReturn:  /(trả xe|gia hạn|đổi xe|kết thúc thuê)/i.test(s),
      needPolicy:  /(điều kiện|chính sách|bảo hiểm|hư hỏng|sự cố|đặt cọc|cọc)/i.test(s)
    };
  }

  /* ====== PRICING (theo dữ liệu bạn cung cấp) ====== */
  const PRICE_TABLE = {
    'xe số':      { day:[150000],          week:[600000,700000],    month:[850000,1200000] },
    'xe ga':      { day:[150000,200000],   week:[600000,1000000],   month:[1100000,2000000] },
    'air blade':  { day:[200000],          week:[800000],           month:[1600000,1800000] }, // tham chiếu
    'vision':     { day:[200000],          week:[700000,850000],    month:[1400000,1900000] },
    'xe điện':    { day:[170000],          week:[800000],           month:[1600000] },
    '50cc':       { day:[200000],          week:[800000],           month:[1700000] },
    'xe côn tay': { day:[300000],          week:[1200000],          month:null } // tháng: liên hệ
  };
  function baseFor(type,unit){
    const it=PRICE_TABLE[type]; if(!it) return null;
    const key=unit==="tuần"?"week":(unit==="tháng"?"month":"day");
    const arr=it[key]; if(!arr) return null;
    return Array.isArray(arr)?arr[0]:arr;
  }

  /* ====== SIMPLE RETRIEVAL INDEX ====== */
  function tk(s){ return (s||"").toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu,' ').split(/\s+/).filter(Boolean); }
  function loadLearn(){ return safeJSON(localStorage.getItem(K.learn)) || {}; }
  function saveLearn(o){ try{ localStorage.setItem(K.learn, JSON.stringify(o)); }catch{} }
  function getIndexFlat(){
    const cache = loadLearn();
    const out = [];
    Object.keys(cache).forEach(key=>{ (cache[key].pages||[]).forEach(pg=> out.push(Object.assign({source:key}, pg))); });
    return out;
  }
  function searchIndex(query, k=3){
    const qtok = tk(query); if(!qtok.length) return [];
    const idx = getIndexFlat();
    return idx.map(it=>{
      const txt = ((it.title||"")+" "+(it.text||"")+" "+(it.url||"")).toLowerCase();
      let score=0; qtok.forEach(t=>{ if(txt.includes(t)) score++; });
      return Object.assign({score}, it);
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,k);
  }
  function mkSnippet(text,q,max=200){
    if(!text) return "";
    const t = text.replace(/\s+/g," ").trim();
    if(t.length<=max) return t;
    const tokens = tk(q);
    for(const tok of tokens){
      const p = t.toLowerCase().indexOf(tok);
      if(p>=0){ const start = Math.max(0, p-50); return (start>0?"...":"")+t.slice(start,start+max)+"..."; }
    }
    return t.slice(0,max)+"...";
  }

  /* ====== FETCH / CRAWL ====== */
  async function fetchText(url){
    const ctl = new AbortController();
    const id = setTimeout(()=>ctl.abort(), CFG.fetchTimeoutMs);
    try{
      const res = await fetch(url, {signal:ctl.signal, credentials:'omit', mode:'cors'});
      clearTimeout(id);
      if(!res.ok) return null;
      return await res.text();
    }catch(e){ clearTimeout(id); return null; }
  }
  function parseXML(t){ try{return (new DOMParser()).parseFromString(t,"text/xml");}catch{return null;} }
  function parseHTML(t){ try{return (new DOMParser()).parseFromString(t,"text/html");}catch{return null;} }
  async function readSitemap(url){
    const xml = await fetchText(url); if(!xml) return [];
    const doc = parseXML(xml); if(!doc) return [];
    const sm = Array.from(doc.getElementsByTagName("sitemap"))
      .map(x=>x.getElementsByTagName("loc")[0]?.textContent?.trim()).filter(Boolean);
    if(sm.length){
      const all=[]; for(const loc of sm){ try{ const child = await readSitemap(loc); all.push(...child); }catch{} }
      return all;
    }
    const urls = Array.from(doc.getElementsByTagName("url"))
      .map(u=>u.getElementsByTagName("loc")[0]?.textContent?.trim()).filter(Boolean);
    return urls;
  }
  async function fallbackCrawl(root){
    const start = root.endsWith("/")?root:root+"/";
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
  function looksVN(s){
    if(/[ăâêôơưđà-ỹ]/i.test(s)) return true;
    const hits = (s.match(/\b(xe|thuê|giá|cọc|liên hệ|hà nội)\b/gi)||[]).length;
    return hits>=2;
  }
  async function pullPages(urls){
    const out=[];
    for(const u of urls.slice(0,CFG.maxPagesPerDomain)){
      const txt = await fetchText(u); if(!txt) continue;
      if (/\.txt($|\?)/i.test(u)) {
        const title = u.split("/").slice(-1)[0];
        const text = txt.replace(/\s+/g," ").trim().slice(0,2000);
        out.push({url:u,title,text});
      } else {
        let title = (txt.match(/<title[^>]*>([^<]+)<\/title>/i)||[])[1]||"";
        title = title.replace(/\s+/g," ").trim();
        let desc = (txt.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"]+)["']/i)||[])[1]||"";
        if(!desc){
          desc = txt.replace(/<script[\s\S]*?<\/script>/gi," ")
                    .replace(/<style[\s\S]*?<\/style>/gi," ")
                    .replace(/<[^>]+>/g," ")
                    .replace(/\s+/g," ")
                    .trim()
                    .slice(0,600);
        }
        const sample = (title+" "+desc).toLowerCase();
        if(CFG.viOnly && !looksVN(sample)) { await sleep(CFG.fetchPauseMs); continue; }
        out.push({url:u,title,text:desc});
      }
      await sleep(CFG.fetchPauseMs);
    }
    return out;
  }

  /* ====== AUTO-LEARN ưu tiên moto_sitemap.json ====== */
  async function learnFromSitemapOrSite(){
    const last = parseInt(localStorage.getItem(K.stamp)||0);
    if (last && (Date.now()-last) < CFG.refreshHours*3600*1000) return loadLearn();

    const cache = loadLearn();
    let total=0;

    // 1) moto_sitemap.json (ưu tiên datasets trước)
    const smUrl = location.origin + "/moto_sitemap.json";
    try{
      const r = await fetch(smUrl);
      if (r.ok) {
        const json = await r.json();
        const list = [
          ...(json.categories?.datasets?.list || []), // txt trước
          ...(json.categories?.pages?.list || [])     // html sau
        ];
        const pages = [];
        for (const u of list){
          const txt = await fetchText(u);
          if(!txt) continue;
          if(/\.txt($|\?)/i.test(u)){
            pages.push({url:u, title:u.split("/").slice(-1)[0], text: txt.replace(/\s+/g," ").trim().slice(0,2000)});
          }else{
            let title = (txt.match(/<title[^>]*>([^<]+)<\/title>/i)||[])[1]||"";
            title = title.replace(/\s+/g," ").trim();
            let desc = (txt.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"]+)["']/i)||[])[1]||"";
            if(!desc){
              desc = txt.replace(/<script[\s\S]*?<\/script>/gi," ")
                        .replace(/<style[\s\S]*?<\/style>/gi," ")
                        .replace(/<[^>]+>/g," ")
                        .replace(/\s+/g," ").trim().slice(0,600);
            }
            const sample = (title+" "+desc).toLowerCase();
            if(CFG.viOnly && !looksVN(sample)) continue;
            pages.push({url:u,title,text:desc});
          }
          total++; if(total>=CFG.maxTotalPages) break;
          await sleep(CFG.fetchPauseMs);
        }
        if(pages.length){
          cache["sitemap-json"] = {domain: smUrl, ts: nowSec(), pages};
          saveLearn(cache);
          localStorage.setItem(K.stamp, Date.now());
          return cache;
        }
      }
    }catch(e){ /* ignore */ }

    // 2) fallback: sitemap.xml / crawl
    try{
      const origin = location.origin;
      let urls=[];
      const candidates=[origin+"/sitemap.xml", origin+"/sitemap_index.xml"];
      for(const c of candidates){
        try{ const u = await readSitemap(c); if(u && u.length){ urls=u; break; } }catch{}
      }
      if(!urls.length) urls = await fallbackCrawl(origin);
      const pages = await pullPages(urls);
      if(pages?.length){
        cache[origin] = {domain:origin, ts: nowSec(), pages};
        saveLearn(cache);
      }
      localStorage.setItem(K.stamp, Date.now());
    }catch(e){}
    return cache;
  }

  /* ====== ANSWER ENGINE ====== */
  const PREFIX = ["Chào anh/chị,","Xin chào 👋,","Em chào anh/chị,","Em ở Nguyễn Tú đây,"];
  function polite(s){ s = s || "em chưa nhận được câu hỏi, anh/chị nhập lại giúp em."; return naturalize(`${pick(PREFIX)} ${s}`); }

  // Chỉ trả đúng theo lượng — nếu chưa có lượng thì hỏi
  function composePrice(type, qty){
    if(!type) type="xe số";
    if(!qty){
      return naturalize(`Anh/chị thuê ${type} bao nhiêu ngày (hoặc tuần/tháng) để em tính đúng giá nhé?`);
    }
    const base = baseFor(type, qty.unit);
    if(!base){
      return naturalize(`Giá thuê ${type} theo ${qty.unit} cần kiểm tra. Nhắn Zalo ${CFG.phone} để em chốt theo mẫu xe cụ thể ạ.`);
    }
    const total = base * qty.n;
    const unitLabel = qty.unit==="ngày"?"ngày":qty.unit==="tuần"?"tuần":"tháng";
    const text = qty.n===1
      ? `Giá thuê ${type} 1 ${unitLabel} khoảng ${nf(base)}đ`
      : `Giá thuê ${type} ${qty.n} ${unitLabel} khoảng ${nf(total)}đ`;
    let hint = "";
    if (qty.unit==="ngày" && qty.n>=3) hint = " Thuê theo tuần sẽ tiết kiệm hơn.";
    return naturalize(`${text}. Em có giữ xe và gửi ảnh xe qua Zalo ${CFG.phone} cho anh/chị xem không?${hint}`);
  }

  function quickReplyForTag(tag){
    switch(tag){
      case 'xe số':
      case 'xe ga':
      case 'xe điện':
      case '50cc':
      case 'xe côn tay':
        return naturalize(`Anh/chị thuê ${tag} mấy ngày (hoặc theo tuần/tháng) ạ? Ví dụ: "3 ngày", "1 tuần", "1 tháng".`);
      case 'giao xe':
        return polite(`Thuê 1–4 ngày vui lòng đến cửa hàng để chọn xe. Thuê tuần/tháng em giao tận nơi. Phí nội thành 20–100k tùy quận. Nhắn Zalo ${CFG.phone} để em sắp lịch.`);
      case 'thủ tục':
        return polite(`Thủ tục gọn: CCCD/hộ chiếu + đặt cọc tuỳ xe. Không để giấy tờ có thể thêm 500k thay giấy tờ. Cọc tham khảo: xe số 2–3 triệu; xe ga 2–5 triệu; 50cc: 4 triệu.`);
      case 'bảng giá':
        return polite(`Anh/chị cho em biết loại xe và số ngày (hoặc tuần/tháng) để em báo đúng — ví dụ: "xe số 2 ngày" hoặc "xe ga 1 tuần".`);
      default:
        return polite(`Anh/chị cho em biết nhu cầu cụ thể để em tính chính xác.`);
    }
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
        // nếu câu trước đã có qty mà câu này chưa có -> dùng lại ngay để trả giá
        if(!qty && t.qty) return composePrice(type||t.type, t.qty);
        if(type && qty) break;
      }
    }

    if(intents.needContact)
      return polite(`anh/chị gọi ${CFG.phone} hoặc Zalo ${CFG.zalo||CFG.phone} là có người nhận ngay.`);
    if(intents.needDocs)
      return polite(`Thủ tục: CCCD/hộ chiếu + cọc theo xe. Không để giấy tờ thì thêm 500k thay giấy tờ. 50cc: 200k/ngày • 800k/tuần • 1.700k/tháng.`);
    if(intents.needPolicy)
      return polite(`Đặt cọc tham khảo: xe số 2–3 triệu; xe ga 2–5 triệu; 50cc: 4 triệu. Liên hệ Zalo ${CFG.phone} để chốt theo mẫu xe.`);
    if(intents.needDelivery)
      return polite(`Thuê 1–4 ngày: đến cửa hàng chọn xe. Thuê tuần/tháng: em giao tận nơi. Phí nội thành 20–100k.`);
    if(intents.needReturn)
      return polite(`Trả xe tại cửa hàng hoặc hẹn trả tận nơi (thoả thuận). Báo trước 30 phút để sắp xếp, hoàn cọc nhanh.`);

    if(intents.needPrice || type || qty) return composePrice(type, qty);

    // Retrieval khi câu hỏi dạng nội dung
    try{
      const top = searchIndex(q, 3);
      if(top && top.length){
        const lines = top.map(t=>{
          const sn = mkSnippet(t.title||t.text||"", q, 140);
          let dom = t.source || "nguồn";
          try{ if(t.url) dom = new URL(t.url).hostname.replace(/^www\./,""); }catch{}
          return `• ${sn} (${dom})`;
        });
        return naturalize(`Em tìm được vài nội dung liên quan:\n${lines.join("\n")}\nAnh/chị muốn em tóm tắt mục nào không?`);
      }
    }catch(e){}

    return polite(`Anh/chị chọn loại xe (xe số, xe ga, xe điện, 50cc, côn tay) và thuê mấy ngày để em báo đúng giá.`);
  }

  /* ====== TYPING ====== */
  function showTyping(){
    const body = $("#mta-body"); if(!body) return;
    const box = document.createElement("div");
    box.id = "mta-typing"; box.className="m-msg bot";
    box.innerHTML = `<span style="margin-right:6px;">Đang nhập</span><span class="dot"></span><span class="dot"></span><span class="dot"></span>`;
    body.appendChild(box); body.scrollTop = body.scrollHeight;
  }
  function hideTyping(){ const t=$("#mta-typing"); if(t) t.remove(); }

  /* ====== SEND ====== */
  let isOpen=false, sending=false;
  async function sendUser(text){
    if(sending) return;
    const v = (text||"").trim(); if(!v) return;
    sending = true;
    addMsg("user", v);
    pushCtx({from:"user",raw:v,type:detectType(v),qty:detectQty(v)});

    const wait = CFG.replyMinMs + Math.random()*(Math.max(0, CFG.replyMaxMs - CFG.replyMinMs));
    showTyping(); await sleep(wait);

    const ans = await deepAnswer(v);
    hideTyping();
    addMsg("bot", ans);
    pushCtx({from:"bot",raw:ans});
    sending = false;
  }

  /* ====== OPEN/CLOSE ====== */
  function openChat(){
    if(isOpen) return;
    $("#mta-card").classList.add("open");
    $("#mta-backdrop").classList.add("show");
    $("#mta-bubble").style.display="none";
    isOpen = true;
    renderSess();
    setTimeout(()=>{ const i=$("#mta-in"); if(i) i.focus();}, 160);
    ensureSendVisible();
  }
  function closeChat(){
    if(!isOpen) return;
    $("#mta-card").classList.remove("open");
    $("#mta-backdrop").classList.remove("show");
    $("#mta-bubble").style.display="flex";
    isOpen = false;
    hideTyping();
  }
  function clearChat(){
    try{ localStorage.removeItem(K.sess); localStorage.removeItem(K.ctx); }catch(e){}
    $("#mta-body").innerHTML=''; addMsg('bot', polite('đã xóa hội thoại'));
  }

  /* ====== Mobile keyboard fixes (giữ nút Gửi luôn hiện) ====== */
  function setVH(){
    const vv = window.visualViewport;
    const vh = vv ? vv.height * 0.01 : window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
  function ensureSendVisible(){
    const input = $("#mta-input"), sendBtn=$("#mta-send");
    if(!input || !sendBtn) return;
    // đẩy khung khi bàn phím mở
    const vv = window.visualViewport;
    if(vv){
      const onVV = ()=>{
        setVH();
        // giữ input + send trong vùng nhìn
        const iRect = input.getBoundingClientRect();
        const needScroll = iRect.bottom > vv.height;
        if(needScroll){
          const delta = iRect.bottom - vv.height + 12;
          window.scrollBy({top: delta, left: 0, behavior:'smooth'});
        }
      };
      vv.removeEventListener?.('resize', onVV);
      vv.addEventListener('resize', onVV, {passive:true});
      onVV();
    }else{
      setVH();
    }
  }

  function autoAvoid(){
    const root = $("#mta-root"); if(!root) return;
    let bottom = 'calc(18px + env(safe-area-inset-bottom,0))';
    const blockers = document.querySelector('.bottom-appbar, .quick-call, #quick-call, .qca, #quickcall, .bottom-app');
    if(blockers){
      const r = blockers.getBoundingClientRect();
      const space = window.innerHeight - r.top;
      if(space < 120) bottom = (space + 70) + 'px';
    }
    if(window.visualViewport){
      const vv = window.visualViewport;
      if(vv.height < window.innerHeight - 120) bottom = '110px';
    }
    root.style.bottom = bottom;
    root.style.right = 'auto';
    root.style.left = '16px';
  }

  /* ====== BIND ====== */
  function bindEvents(){
    $("#mta-bubble").addEventListener("click", openChat);
    $("#mta-backdrop").addEventListener("click", closeChat);
    $("#mta-close").addEventListener("click", closeChat);
    $("#mta-clear").addEventListener("click", clearChat);
    $("#mta-send").addEventListener("click", ()=>{
      const inp=$("#mta-in"); const v=(inp.value||"").trim(); if(!v) return; inp.value=""; sendUser(v);
    });
    $("#mta-in").addEventListener("keydown", e=>{
      if(e.key==="Enter" && !e.shiftKey){
        e.preventDefault();
        const v=e.target.value.trim(); if(!v) return; e.target.value=""; sendUser(v);
      }
    });
    const track = $("#mta-tag-track");
    if(track){
      track.querySelectorAll("button").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          const t = (btn.getAttribute('data-tag')||'').toLowerCase();
          if(['xe số','xe ga','xe điện','50cc','xe côn tay'].includes(t)){
            addMsg('bot', quickReplyForTag(t));
            pushCtx({from:'bot',intent:'ask_duration',type:t});
          } else {
            sendUser(t);
          }
        });
      });
    }
    window.addEventListener("resize", autoAvoid, {passive:true});
    window.addEventListener("scroll", autoAvoid, {passive:true});
    if(window.visualViewport) window.visualViewport.addEventListener("resize", ()=>{ setVH(); ensureSendVisible(); }, {passive:true});
    const input = $("#mta-in");
    if(input){
      const tags = $("#mta-tags");
      input.addEventListener("focus", ()=> tags && tags.classList.add('hidden'));
      input.addEventListener("blur",  ()=> { if(!input.value.trim() && tags) tags.classList.remove('hidden'); });
      input.addEventListener("input", ()=> { if(tags){ if(input.value.trim().length>0) tags.classList.add('hidden'); else tags.classList.remove('hidden'); } });
    }
  }

  function maybeDisableQuickMap(){
    if(!CFG.disableQuickMap) return;
    const m = document.querySelector(".q-map, #mta-header .q-map");
    if(m){ m.removeAttribute("href"); m.style.opacity=".4"; m.style.pointerEvents="none"; }
  }

  function ready(fn){
    if(document.readyState==="complete"||document.readyState==="interactive") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  /* ====== BOOT ====== */
  ready(async ()=>{
    // clean cache 7 ngày/lần
    const lastClean = parseInt(localStorage.getItem(K.clean)||0);
    if (!lastClean || (Date.now()-lastClean) > 7*24*3600*1000){
      localStorage.removeItem(K.learn);
      localStorage.removeItem(K.ctx);
      localStorage.setItem(K.clean, Date.now());
      console.log("MotoAI v37.6 ui20low: cache cleaned");
    }

    // Inject UI
    const wrap = document.createElement("div");
    wrap.innerHTML = HTML;
    document.body.appendChild(wrap.firstElementChild);
    const st = document.createElement("style");
    st.textContent = CSS;
    document.head.appendChild(st);

    // Bind + layout
    setVH(); bindEvents(); autoAvoid(); maybeDisableQuickMap(); ensureSendVisible();

    // AutoLearn
    if(CFG.autolearn){
      try{
        await learnFromSitemapOrSite();
        console.log("%cMotoAI v37.6 ui20low — learned from sitemap/site","color:"+CFG.themeColor+";font-weight:bold;");
      }catch(e){ console.warn("MotoAI autoLearn err",e); }
    }
  });

  // Public API
  window.MotoAI_v37_6_UI20LOW = {
    open: ()=>{ try{ openChat(); }catch(e){} },
    close: ()=>{ try{ closeChat(); }catch(e){} },
    send: (t)=>{ try{ sendUser(t); }catch(e){} },
    learnNow: ()=> learnFromSitemapOrSite(),
    getIndex: getIndexFlat
  };
})();
