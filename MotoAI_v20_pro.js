(function(){
  if (window.MotoAI_v20_LOADED) return; window.MotoAI_v20_LOADED = true;

  // ===== CONFIG (DEFAULTS) =====
  const DEF = {
    brand: "AI Assistant",
    phone: "0942467674",
    zalo:  "https://zalo.me/0942467674",
    whatsapp: "https://wa.me/84942467674",
    map: "https://maps.app.goo.gl/2icTBTxAToyvKTE78",

    // Auto-learn inputs (bạn có thể override từ window.MotoAI_CONFIG)
    extendedSitemapUrl: "",                   // ví dụ: https://motoopen.github.io/thuexemayohoankiem/ai_sitemap.json
    repoManifestUrl: "",                      // ví dụ: https://raw.githubusercontent.com/.../ai_repo_manifest.json

    minSentenceLen: 22,
    maxItems: 2000,
    maxInternalPages: 20,
    refreshHours: 72,                         // 72h ~ 3 ngày
    sessionDays: 7                            // giữ log UI
  };
  const CFG = Object.assign({}, DEF, (window.MotoAI_CONFIG||{}));
  const HOSTKEY = (location.host||"site").replace(/[^a-z0-9.-]/gi,"_");

  // ===== KEYS =====
  const K = {
    corpus: `MotoAI_v20_${HOSTKEY}_corpus`,
    ext:    `MotoAI_v20_${HOSTKEY}_corpus_ext`,
    last:   `MotoAI_v20_${HOSTKEY}_lastLearn`,
    mapH:   `MotoAI_v20_${HOSTKEY}_lastMapHash`,
    sess:   `MotoAI_v20_${HOSTKEY}_session`
  };

  // ===== UTILS =====
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const uniq = a => Array.from(new Set(a));
  const safe = s => { try{return JSON.parse(s)}catch(e){return null} };
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const tokenize = t => (t||"").toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu," ").split(/\s+/).filter(Boolean);
  const hashText = (str)=>{ try{return btoa(unescape(encodeURIComponent(str))).slice(0,60);}catch(e){let h=0;for(let i=0;i<str.length;i++){h=(h*31+str.charCodeAt(i))|0}return String(h)} };
  const pick = a => a[Math.floor(Math.random()*a.length)];

  // ===== UI (UI100 compact, dark-ready) =====
  const ui = `
  <div id="mta-root" aria-live="polite">
    <button id="mta-bubble" aria-label="Mở chat" title="Chat">
      <svg viewBox="0 0 64 64" width="28" height="28" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="#0084ff"></circle>
        <path d="M20 36l9-11 6 6 9-9-9 14-6-6-9 6z" fill="#fff"></path>
      </svg>
    </button>
    <div id="mta-backdrop"></div>
    <section id="mta-card" role="dialog" aria-label="AI chat" aria-hidden="true">
      <header id="mta-header">
        <div class="brand">
          <span class="b-name">${CFG.brand}</span>
          <nav class="quick" aria-label="Liên hệ nhanh">
            <a class="q" href="tel:${CFG.phone}" title="Gọi"><span>📞</span></a>
            <a class="q" href="${CFG.zalo}" target="_blank" rel="noopener" title="Zalo">Z</a>
            <a class="q" href="${CFG.whatsapp}" target="_blank" rel="noopener" title="WhatsApp">WA</a>
            <a class="q" href="${CFG.map}" target="_blank" rel="noopener" title="Bản đồ">📍</a>
          </nav>
          <button id="mta-close" title="Đóng" aria-label="Đóng">✕</button>
        </div>
      </header>
      <main id="mta-body"></main>
      <div id="mta-sugs" role="toolbar" aria-label="Gợi ý nhanh"></div>
      <footer id="mta-input">
        <input id="mta-in" placeholder="Nhập câu hỏi..." autocomplete="off" />
        <button id="mta-send" aria-label="Gửi">Gửi</button>
      </footer>
      <button id="mta-clear" title="Xóa hội thoại" aria-label="Xóa hội thoại">🗑</button>
    </section>
  </div>`;

  const css = `
  :root { --mta-blue:#0084ff; --mta-bg:#ffffff; --mta-text:#0b1220; --mta-line:rgba(0,0,0,.08); --mta-z:2147483647; --vh:1vh }
  #mta-root{position:fixed;left:16px;bottom:calc(18px + env(safe-area-inset-bottom,0));z-index:var(--mta-z);font-family:-apple-system,system-ui,Segoe UI,Roboto,"Helvetica Neue",Arial}
  #mta-bubble{width:56px;height:56px;border:none;border-radius:14px;background:#e6f2ff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 10px 24px rgba(0,0,0,.18);outline:1px solid rgba(0,0,0,.06)}
  #mta-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.10);opacity:0;pointer-events:none;transition:opacity .15s}
  #mta-backdrop.show{opacity:1;pointer-events:auto}
  #mta-card{position:fixed;left:0;right:0;bottom:0;margin:auto;width:min(900px,calc(100% - 24px));
    height:calc(var(--vh,1vh)*64);max-height:720px;background:var(--mta-bg);color:var(--mta-text);
    border-radius:16px 16px 0 0;box-shadow:0 -12px 30px rgba(0,0,0,.18);
    transform:translateY(110%);display:flex;flex-direction:column;overflow:hidden;transition:transform .2s ease-out}
  #mta-card.open{transform:translateY(0)}
  #mta-header{border-bottom:1px solid var(--mta-line);background:#fff}
  #mta-header .brand{display:flex;align-items:center;gap:8px;justify-content:space-between;padding:8px 10px}
  .b-name{font-weight:800;color:var(--mta-blue)}
  .quick{display:flex;gap:6px;margin-left:6px;margin-right:auto}
  .q{width:30px;height:30px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;font-size:12px;font-weight:800;background:#f2f5f8;color:#111;border:1px solid var(--mta-line)}
  #mta-close{background:none;border:none;font-size:20px;color:var(--mta-blue);cursor:pointer}
  #mta-body{flex:1;overflow:auto;padding:10px 12px;font-size:15px;background:#fff}
  .m-msg{margin:8px 0;padding:10px 12px;border-radius:14px;max-width:84%;line-height:1.45;box-shadow:0 2px 6px rgba(0,0,0,.06)}
  .m-msg.user{background:#e9f3ff;color:#0b1220;margin-left:auto;border:1px solid rgba(0,132,255,.2)}
  .m-msg.bot{background:#f9fafb;color:#0b1220;border:1px solid rgba(0,0,0,.06)}
  #mta-sugs{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;padding:6px 8px;border-top:1px solid var(--mta-line);background:#fff}
  #mta-sugs button{border:1px solid var(--mta-line);background:#f6f9ff;color:#0b1220;padding:7px 10px;border-radius:10px;cursor:pointer;font-weight:700}
  #mta-input{display:flex;gap:8px;padding:10px;border-top:1px solid var(--mta-line);background:#fff}
  #mta-in{flex:1;padding:10px;border-radius:10px;border:1px solid rgba(0,0,0,.12);font-size:15px}
  #mta-send{background:var(--mta-blue);color:#fff;border:none;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer}
  #mta-clear{position:absolute;top:8px;right:44px;background:none;border:none;font-size:16px;opacity:.85;cursor:pointer}
  @media(prefers-color-scheme:dark){
    :root{--mta-bg:#1b1c1f; --mta-text:#f3f6fb; --mta-line:rgba(255,255,255,.1)}
    #mta-card{background:var(--mta-bg);color:var(--mta-text)}
    #mta-header{background:linear-gradient(180deg, rgba(255,45,85,.14), rgba(255,45,85,0)), #202226;border-bottom:1px solid var(--mta-line)}
    #mta-body{background:#1b1c1f}
    .m-msg.bot{background:#23262b;color:#f3f6fb;border:1px solid rgba(255,255,255,.08)}
    .m-msg.user{background:#20324a;color:#eaf4ff;border:1px solid rgba(0,132,255,.35)}
    #mta-sugs,#mta-input{background:#202226;border-top:1px solid var(--mta-line)}
    #mta-in{background:#16181c;color:#f0f3f7;border:1px solid rgba(255,255,255,.15)}
    .q{background:#2a2d33;color:#f3f6f8;border:1px solid rgba(255,255,255,.12)}
  }
  @media(max-width:520px){
    #mta-card{width:calc(100% - 16px);height:calc(var(--vh,1vh)*70)}
    .q{width:28px;height:28px}
  }`;

  function injectUI(){
    if ($('#mta-root')) return;
    const wrap = document.createElement('div'); wrap.innerHTML = ui; document.body.appendChild(wrap.firstElementChild);
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  }
  function ready(fn){
    if(document.readyState==="complete"||document.readyState==="interactive"){ fn(); }
    else document.addEventListener("DOMContentLoaded", fn);
  }

  // ===== STATE =====
  let isOpen=false, sending=false;
  let corpus=[], ext=[];
  let typingBlinkTimer=null;

  // ===== STORAGE =====
  function load(){
    try{ corpus = safe(localStorage.getItem(K.corpus))||[]; }catch(e){}
    try{ ext    = safe(localStorage.getItem(K.ext))||[]; }catch(e){}
    try{
      const arr = safe(localStorage.getItem(K.sess))||[];
      const now = Date.now(), keep = arr.filter(m => now - (m.t||now) < CFG.sessionDays*24*3600*1000);
      if (keep.length !== arr.length) localStorage.setItem(K.sess, JSON.stringify(keep));
    }catch(e){}
  }
  function save(){ try{ localStorage.setItem(K.corpus, JSON.stringify(corpus)); }catch(e){} try{ localStorage.setItem(K.ext, JSON.stringify(ext)); }catch(e){} }

  // ===== UI HELPERS =====
  function addMsg(role,text){
    if(!text) return;
    const el = document.createElement('div'); el.className = 'm-msg '+(role==='user'?'user':'bot'); el.textContent = text;
    $('#mta-body').appendChild(el); $('#mta-body').scrollTop = $('#mta-body').scrollHeight;
    try{
      const arr = safe(localStorage.getItem(K.sess))||[];
      arr.push({role,text,t:Date.now()}); localStorage.setItem(K.sess, JSON.stringify(arr.slice(-200)));
    }catch(e){}
  }
  function renderSess(){
    const body = $('#mta-body'); body.innerHTML='';
    const arr = safe(localStorage.getItem(K.sess))||[];
    if(arr.length){ arr.forEach(m=> addMsg(m.role,m.text)); }
    else addMsg('bot', 'Chào bạn, mình là AI Assistant. Bạn muốn xem 💰 Bảng giá, ⚙️ Dịch vụ, 🏍️ Sản phẩm hay ☎️ Liên hệ?');
  }
  function showTyping(){
    const d=document.createElement('div'); d.id='mta-typing'; d.className='m-msg bot'; d.textContent='Đang nhập';
    const dot=document.createElement('span'); dot.id='mta-typing-dots'; dot.textContent='…';
    d.appendChild(document.createTextNode(' ')); d.appendChild(dot);
    $('#mta-body').appendChild(d); $('#mta-body').scrollTop=$('#mta-body').scrollHeight;
    let i=0; typingBlinkTimer = setInterval(()=>{ dot.textContent='.'.repeat((i++%3)+1); }, 420);
  }
  function hideTyping(){
    const d=$('#mta-typing'); if(d) d.remove();
    if(typingBlinkTimer){ clearInterval(typingBlinkTimer); typingBlinkTimer=null; }
  }

  // ===== BUILD CORPUS (DOM basic) =====
  function buildFromDOM(){
    try{
      let nodes = $$('#main, main, article, section'); if(!nodes.length) nodes=[document.body];
      let texts=[];
      nodes.forEach(n=>{
        n.querySelectorAll('h1,h2,h3').forEach(h=>{ const t=h.innerText?.trim(); if(t && t.length>12) texts.push(t); });
        n.querySelectorAll('p,li').forEach(p=>{ const t=p.innerText?.trim(); if(t && t.length>=CFG.minSentenceLen) texts.push(t); });
      });
      if(!texts.length){ const m=document.querySelector('meta[name="description"]'); if(m?.content) texts.push(m.content); }
      texts=uniq(texts).slice(0,CFG.maxItems);
      corpus = texts.map((t,i)=>({id:i,text:t,tokens:tokenize(t)}));
      save();
    }catch(e){}
  }

  // ===== TEXT EXTRACTORS =====
  function extractTextFromHTML(html){
    const tmp = document.createElement('div');
    tmp.innerHTML = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style[^>]*>[\s\S]*?<\/style>/gi,'');
    const meta = tmp.querySelector('meta[name="description"]');
    const nodes = tmp.querySelectorAll('h1,h2,h3,article,p,li,th,td');
    const arr = [];
    if (meta?.content) arr.push(meta.content.trim());
    nodes.forEach(n=>{
      const t=(n.textContent||'').trim();
      if(t && t.length>=CFG.minSentenceLen) arr.push(t);
    });
    return uniq(arr).join('\n');
  }
  function flattenJsonToText(jsonStr){
    try{
      const obj = JSON.parse(jsonStr);
      const acc = [];
      (function walk(x){
        if (x==null) return;
        if (typeof x === 'string'){
          const t = x.trim();
          if (t.length >= CFG.minSentenceLen) acc.push(t);
        } else if (Array.isArray(x)){
          x.forEach(walk);
        } else if (typeof x === 'object'){
          Object.values(x).forEach(walk);
        }
      })(obj);
      return uniq(acc).join('\n');
    }catch(e){ return ''; }
  }
  async function fetchAnyText(url){
    try{
      const r = await fetch(url,{cache:'no-store'}); if(!r.ok) return '';
      const ct=(r.headers.get('content-type')||'').toLowerCase();
      const raw=await r.text();
      if (ct.includes('text/html') || /<\/(html|body|p|h1|h2|h3|li|article|td|th)>/i.test(raw)) return extractTextFromHTML(raw);
      if (ct.includes('application/json') || raw.trim().startsWith('{') || raw.trim().startsWith('[')) return flattenJsonToText(raw);
      return raw;
    }catch(e){ return ''; }
  }
  function pushToExtByLines(bigText){
    const lines = bigText.split(/\n+/).map(x=>x.trim()).filter(x=>x.length>=CFG.minSentenceLen);
    let added = 0;
    for (const l of lines){
      if (!ext.includes(l)){ ext.push(l); added++; }
      if (ext.length >= CFG.maxItems) break;
    }
    return added;
  }

  // ===== SITEMAP (extended JSON) =====
  async function learnFromExtendedSitemap(url){
    try{
      const r = await fetch(url, {cache:'no-store'}); if(!r.ok) return 0;
      const data = await r.json();
      let urls = [];
      const cats = data?.categories || {};
      if (cats.pages?.list?.length) urls.push(...cats.pages.list);
      if (cats.datasets?.list?.length) urls.push(...cats.datasets.list);
      urls = uniq(urls).slice(0, CFG.maxItems*2);
      let added=0;
      for (const u of urls){
        const txt = await fetchAnyText(u); if(!txt) continue;
        added += pushToExtByLines(txt);
        if (ext.length >= CFG.maxItems) break;
        await sleep(20);
      }
      if (added) save();
      return added;
    }catch(e){ return 0; }
  }

  // ===== INTERNAL LINKS LEARN (fallback nhẹ) =====
  function internalLinks(){
    const list = $$('a[href]').map(a=>a.getAttribute('href')).filter(Boolean)
      .map(h=>{ try{ return new URL(h,location.href).href }catch(e){ return null }})
      .filter(Boolean).filter(u=>u.startsWith(location.origin))
      .filter(u=>!/\.(png|jpe?g|gif|webp|svg|pdf|zip|rar|7z|mp4|mp3|ico)(\?|$)/i.test(u))
      .filter(u=>!u.includes('#')).filter(u=>u!==location.href);
    return uniq(list).slice(0,CFG.maxInternalPages);
  }
  async function learnInternal(){
    const pages = internalLinks(); if(!pages.length) return 0;
    let added=0;
    for(const url of pages){
      const txt = await fetchAnyText(url); if(!txt) continue;
      added += pushToExtByLines(txt);
      if(ext.length>=CFG.maxItems) break;
      await sleep(60);
    }
    if (added) save();
    return added;
  }

  // ===== REPO MANIFEST (Option B – FULL) =====
  async function learnFromRepoManifest(){
    const url = CFG.repoManifestUrl || (window.MotoAI_CONFIG && window.MotoAI_CONFIG.repoManifestUrl);
    if (!url) return 0;

    const CACHE_KEY = "MotoAI_v20_manifest_cache";
    const cached = safe(localStorage.getItem(CACHE_KEY)) || null;
    const now = Date.now();
    const H = (CFG.refreshHours || 72) * 3600 * 1000;

    let files;
    if (cached && now - (cached.ts||0) < H){
      files = cached.files;
    } else {
      try{
        const r = await fetch(url, {cache:'no-store'}); if(!r.ok) return 0;
        const m = await r.json();
        const base = url.replace(/\/[^/]+$/, "");
        const includeExt = (m.includeExt && Array.isArray(m.includeExt)) ? m.includeExt : [".md",".txt",".html",".json",".markdown"];
        files = (m.files||[]).filter(Boolean).map(p => {
          const raw = p.startsWith("http") ? p : `${base}/${p}`;
          return { path: p, url: raw, includeExt };
        });
        localStorage.setItem(CACHE_KEY, JSON.stringify({ts: now, files}));
      }catch(e){ return 0; }
    }

    let added = 0;
    for (const f of files){
      const lower = (f.path||"").toLowerCase();
      if (!f.includeExt.some(ext => lower.endsWith(ext))) continue;
      try{
        const txt = await fetchAnyText(f.url);
        if (!txt) continue;
        added += pushToExtByLines(txt);
        if (ext.length >= CFG.maxItems) break;
        await sleep(25);
      }catch(e){}
    }
    if (added) save();
    return added;
  }

  // ===== “BRAIN”: SMART PRICING + CLARIFY + MEMORY =====
  // --- Giá trung bình theo dữ liệu bạn cấp ---
  const PRICE_DAY = {
    "xe số": 150000, "dream": 180000,
    "xe ga": 180000, "vision": 200000, "air blade": 170000, "lead": 180000,
    "vespa": 300000, "sh mode": 200000, "sh": 300000,
    "xe côn": 300000,
    "xe điện": 170000,
    "xe 50cc": 200000
  };
  const PRICE_WEEK = {
    "xe số": 650000, "dream": 700000,
    "xe ga": 800000, "vespa": 1000000,
    "xe côn": 1200000,
    "xe điện": 800000,
    "xe 50cc": 800000
  };
  const PRICE_MONTH = {
    "xe số": 1000000, "dream": 1200000,
    "xe ga": 1500000, "vespa": 2000000,
    "xe côn": 3000000,
    "xe điện": 1600000,
    "xe 50cc": 1700000
  };
  function getVisionDayPrice(days){
    if(days === 1) return 200000;
    if(days === 2) return 180000;
    if(days >= 3 && days < 7) return 175000;
    if(days >= 7) return 170000;
    return 200000;
  }
  function applyLongRentDiscount(amount, qty, unit){
    let disc = 0;
    if (unit==='day' && qty>=3) disc = 0.10;
    if (unit==='week' && qty>=2) disc = 0.05;
    if (unit==='month' && qty>=2) disc = 0.10;
    return Math.round(amount * (1 - disc));
  }
  function detectType(q){
    const keys = ["vision","air blade","lead","vespa","sh mode","sh","dream","xe 50cc","xe điện","xe ga","xe số","xe côn"];
    const found = keys.find(k=> q.includes(k));
    if (found) return found;
    if (/50\s*cc/.test(q)) return "xe 50cc";
    if (/điện/.test(q)) return "xe điện";
    if (/côn/.test(q)) return "xe côn";
    if (/ga/.test(q)) return "xe ga";
    return "xe số";
  }
  function parseDuration(q){
    const m = q.match(/(\d+)\s*(ngày|ngay|tuần|tháng)/i);
    if (!m) return { qty:1, unit:"day" };
    const qty = parseInt(m[1],10) || 1;
    const u = m[2].toLowerCase();
    const unit = /tuần/.test(u) ? "week" : /tháng/.test(u) ? "month" : "day";
    return { qty, unit };
  }
  function quotePrice(userText){
    const q = (userText||"").toLowerCase();
    const type = detectType(q);
    const { qty, unit } = parseDuration(q);

    let base;
    if (unit==='day'){
      if (type==='vision') base = getVisionDayPrice(qty);
      else base = PRICE_DAY[type] || PRICE_DAY["xe số"];
    } else if (unit==='week'){
      base = PRICE_WEEK[type] || PRICE_WEEK["xe ga"];
    } else {
      base = PRICE_MONTH[type] || PRICE_MONTH["xe ga"];
    }

    let total = base * qty;
    total = applyLongRentDiscount(total, qty, unit);

    const totalStr = total.toLocaleString('vi-VN');
    const baseStr  = base.toLocaleString('vi-VN');
    const unitVi   = unit==='day'?'ngày':(unit==='week'?'tuần':'tháng');

    if (type==='vision' && unit==='day'){
      const perDay = getVisionDayPrice(qty).toLocaleString('vi-VN');
      return `Vision ${qty} ${unitVi} khoảng ${totalStr}đ (${perDay}đ/ngày cho gói này). Thuê dài hơn sẽ còn 170–180k/ngày. Giao tận nơi miễn phí quanh Hoàn Kiếm.`;
    }
    if (qty===1 && unit==='day'){
      return `Thuê ${type} 1 ngày khoảng ${baseStr}đ, đã gồm 2 mũ và áo mưa, giao tận nơi Hoàn Kiếm.`;
    }
    return `Thuê ${type} ${qty} ${unitVi} khoảng ${totalStr}đ (đã áp dụng giá ưu đãi theo thời gian).`;
  }

  // MEMORY (3 ngày)
  const CHAT_KEY = "MotoAI_session_memory";
  function loadMemory(){
    const data = safe(localStorage.getItem(CHAT_KEY)) || {};
    if(!data || !data.timestamp) return {};
    const days = (Date.now() - data.timestamp) / (1000*60*60*24);
    if (days > 3){ localStorage.removeItem(CHAT_KEY); return {}; }
    return data;
  }
  function saveMemory(m){ m.timestamp = Date.now(); localStorage.setItem(CHAT_KEY, JSON.stringify(m)); }
  let memory = loadMemory();

  // Clarify
  function askForClarification(input){
    const t = (input||"").toLowerCase();
    const known = ["xe","ngày","tuần","tháng","giá","thuê","cọc","thủ tục","điện","ga","số","vision","lead","wave","vespa","sh"];
    const matched = known.some(k => t.includes(k));
    if (!matched){
      const prompts = [
        "Bạn muốn thuê xe loại nào nhỉ — xe số, xe ga hay xe điện?",
        "Bạn định thuê mấy ngày để mình báo giá chính xác hơn ạ?",
        "Bạn cần thuê theo ngày, tuần hay tháng?",
        "Mình có nhiều dòng xe, bạn cho mình biết loại bạn quan tâm nha?",
        "Bạn nói giúp thời gian thuê là bao lâu để mình tính chuẩn?"
      ];
      return pick(prompts);
    }
    return null;
  }

  // ===== RULES + RETRIEVE (giữ nguyên tinh thần bản gốc) =====
  const PREFIX = ["Chào bạn,","Mình ở đây để hỗ trợ,","Mình sẵn sàng giúp,"];
  const SUFFIX = [" bạn nhé."," cảm ơn bạn."," nếu cần thêm thông tin cứ nói nhé."];
  function polite(t){
    t=(t||"").trim();
    if(!t) return "Mình chưa nhận được câu hỏi, bạn thử nhập lại nhé.";
    return /[.!?…]$/.test(t)? `${pick(PREFIX)} ${t} ${pick(SUFFIX)}` : `${pick(PREFIX)} ${t}${pick(SUFFIX)}`;
  }
  const RULES = [
    {re:/(chào|xin chào|hello|hi|alo)/i, ans:[
      "mình là AI Assistant. Bạn muốn xem 💰 Bảng giá, ⚙️ Dịch vụ, 🏍️ Sản phẩm hay ☎️ Liên hệ?",
      "mình có thể giúp tra giá, giới thiệu dịch vụ và sản phẩm. Bạn đang quan tâm điều gì?"
    ]},
    {re:/(bảng giá|gia|giá|bao nhiêu|bang gia|thuê)/i, ans:[
      "bạn nói rõ loại xe và thời gian (ngày/tuần/tháng) để mình tính chuẩn nhé.",
      "bạn cần mức giá theo ngày, tuần hay tháng để mình báo nhanh?"
    ]},
    {re:/(thủ tục|cọc|giấy tờ)/i, ans:[
      "thủ tục nhanh: chỉ cần CCCD hoặc hộ chiếu và cọc 2–3 triệu (xe số) đến 5 triệu (xe ga). Không để giấy tờ thì tăng cọc thêm 500k.",
      "mình làm thủ tục 5–10 phút, có giao xe tận nơi quanh Hoàn Kiếm."
    ]}
  ];
  function rule(q){ for(const r of RULES){ if(r.re.test(q)) return polite(pick(r.ans)); } return null; }
  function retrieve(q){
    const qt = tokenize(q).filter(t=>t.length>1); if(!qt.length) return null;
    let best = { s:0, t:null };
    const pool = (corpus||[]).concat(ext||[]);
    for(const it of pool){
      const line = typeof it==='string' ? it : it.text;
      const low = (line||'').toLowerCase();
      let s = 0; for(const w of qt){ if(low.includes(w)) s++; }
      if(s > best.s) best = { s, t: line };
    }
    return best.s > 0 ? polite(best.t) : null;
  }

  // AI Reply tổng hợp
  function aiReply(userInput){
    const t = (userInput||"").toLowerCase();

    // ghi nhớ
    const typeMatch = t.match(/(vision|air blade|lead|vespa|sh mode|sh|dream|xe 50cc|xe điện|xe ga|xe số|xe côn)/);
    if (typeMatch){ memory.vehicle = typeMatch[0]; saveMemory(memory); }
    const durMatch = t.match(/(\d+)\s*(ngày|ngay|tuần|tháng)/i);
    if (durMatch){ memory.duration = `${durMatch[1]} ${durMatch[2]}`; saveMemory(memory); }

    // đủ dữ kiện → báo giá + reset vòng
    if (memory.vehicle && memory.duration){
      const msg = quotePrice(`${memory.vehicle} ${memory.duration}`);
      memory = {}; saveMemory(memory);
      return msg;
    }

    // giá/thuê → ưu tiên báo giá (nếu thiếu hỏi lại)
    if (/(giá|thuê|bao nhiêu|mấy tiền)/i.test(t)){
      const clarify = askForClarification(userInput);
      if (clarify) return clarify;
      return quotePrice(userInput);
    }

    // thủ tục/cọc/giấy tờ
    if (/(thủ tục|cọc|giấy tờ)/i.test(t)){
      return "Thủ tục nhanh: CCCD hoặc hộ chiếu và cọc 2–3 triệu (xe số) đến 5 triệu (xe ga). Có thể thuê nhanh không để giấy tờ, chỉ cần tăng cọc thêm 500k. Giao xe tận nơi quanh Hoàn Kiếm.";
    }

    // không rõ → hỏi lại
    const clarify = askForClarification(userInput);
    if (clarify) return clarify;

    return null; // cho phép rơi về rule/retrieve/polite
  }

  // ===== CHECK & LEARN (pipeline 72h) =====
  async function checkAndLearn(){
    // 1) Extended Sitemap
    try{
      const url = CFG.extendedSitemapUrl || (window.MotoAI_CONFIG && window.MotoAI_CONFIG.extendedSitemapUrl);
      if (url){ await learnFromExtendedSitemap(url); }
    }catch(e){}
    // 2) Internal (nhẹ)
    try{ await learnInternal(); }catch(e){}
    // 3) Repo manifest (Option B – full)
    try{ await learnFromRepoManifest(); }catch(e){}
  }
  async function schedule(force=false){
    const now=Date.now(); const last=parseInt(localStorage.getItem(K.last)||'0',10)||0;
    const need = force || !last || (now-last) > CFG.refreshHours*3600*1000;
    if(!need) return;
    await checkAndLearn(); localStorage.setItem(K.last,String(Date.now()));
  }

  // ===== SUGGESTIONS =====
  const SUGS = [
    {q:'Bảng giá', label:'💰 Bảng giá'},
    {q:'Dịch vụ', label:'⚙️ Dịch vụ'},
    {q:'Sản phẩm', label:'🏍️ Sản phẩm'},
    {q:'Liên hệ', label:'☎️ Liên hệ'}
  ];
  function buildSugs(){
    const box=$('#mta-sugs'); box.innerHTML='';
    SUGS.forEach(s=>{
      const b=document.createElement('button'); b.type='button'; b.textContent=s.label;
      b.addEventListener('click',()=>{ if(!isOpen) openChat(); setTimeout(()=> sendUser(s.q),80); });
      box.appendChild(b);
    });
  }

  // ===== SEND (giữ nguyên UX, ưu tiên não mới) =====
  async function sendUser(text){
    if(sending) return; sending=true;
    addMsg('user', text); showTyping();
    const base = 1800 + Math.random()*1800;
    const extra = Math.min(2000, Math.max(0, (text||'').length*25));
    await sleep(base + extra*0.3);

    let ans=null;
    try{
      ans = aiReply(text);
      if (!ans){ const r1 = rule(text); if (r1) ans = r1; }
      if (!ans){ const r2 = retrieve(text); if (r2) ans = r2; }
      if (!ans){ ans = polite("mình chưa rõ ý bạn, bạn nói cụ thể hơn giúp mình nhé"); }
    }catch(e){
      ans = polite('xin lỗi, có lỗi khi trả lời. Bạn thử lại giúp mình');
    }

    hideTyping(); addMsg('bot', ans);
    sending=false;
  }

  // ===== OPEN/CLOSE/CLEAR =====
  function openChat(){
    if(isOpen) return;
    $('#mta-card').classList.add('open');
    $('#mta-backdrop').classList.add('show');
    $('#mta-bubble').style.display='none';
    isOpen=true; renderSess();
    setTimeout(()=>{ try{$('#mta-in').focus()}catch(e){} },120);
  }
  function closeChat(){
    if(!isOpen) return;
    $('#mta-card').classList.remove('open');
    $('#mta-backdrop').classList.remove('show');
    $('#mta-bubble').style.display='flex';
    isOpen=false; hideTyping();
  }
  function clearChat(){
    try{ localStorage.removeItem(K.sess); }catch(e){}
    $('#mta-body').innerHTML=''; addMsg('bot', polite('đã xóa hội thoại'));
  }

  // ===== BOOT =====
  function setVH(){
    if (window.visualViewport) {
      const vh = window.visualViewport.height * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    } else {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
  }
  ready(async ()=>{
    injectUI(); load(); if(!corpus.length) buildFromDOM(); buildSugs();

    // Bind UI
    $('#mta-bubble').addEventListener('click', ()=>{ buildFromDOM(); openChat(); });
    $('#mta-backdrop').addEventListener('click', closeChat);
    $('#mta-close').addEventListener('click', closeChat);
    $('#mta-clear').addEventListener('click', clearChat);
    $('#mta-send').addEventListener('click', ()=>{ const v=($('#mta-in').value||'').trim(); if(!v) return; $('#mta-in').value=''; sendUser(v); });
    $('#mta-in').addEventListener('keydown',(e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); const v=($('#mta-in').value||'').trim(); if(!v) return; $('#mta-in').value=''; sendUser(v); }});

    // Mobile safe height
    setVH();
    window.addEventListener('resize', setVH);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', setVH);

    // Auto-learn (mỗi 72h hoặc khi chưa học)
    schedule(false); setInterval(()=> schedule(false), 6*60*60*1000);

    // Watchdog
    setTimeout(()=>{ if(!$('#mta-bubble')) injectUI(); }, 2000);
  });

  // ===== EXPOSE =====
  window.MotoAI_v20 = {
    open: openChat, close: closeChat, learnNow: ()=>schedule(true),
    getCorpus: ()=>({dom: (corpus||[]).slice(0,200), ext:(ext||[]).slice(0,200)}),
    clearCorpus: ()=>{ corpus=[]; ext=[]; save(); console.log('🧹 Cleared corpus'); },
    version: 'v20-pro'
  };
})();
