/*
 * motoai_v37_with_v20_ui.js
 * Phiên bản này kết hợp "Trí thông minh" (logic, học tập, trả lời) của v37.6
 * với "Giao diện" (HTML/CSS) ổn định của v20.
*/
(function(){
  if (window.MotoAI_v37_V20UI_LOADED) return;
  window.MotoAI_v37_V20UI_LOADED = true;

  /* ====== CONFIG (Từ v37) ====== */
  const DEF = {
    brand: "Nguyen Tu",
    phone: "0942467674",
    zalo: "https://zalo.me/0942467674",
    map: "https://maps.app.goo.gl/SR1hcwnCQjPkAvDh7",
    avatar: "🛵", // Avatar này sẽ không hiển thị trong UI v20
    themeColor: "#0084FF",
    autolearn: true,
    deepContext: true,
    maxContextTurns: 5,
    viOnly: true,
    extraSites: [location.origin],
    crawlDepth: 1,
    refreshHours: 24,
    maxPagesPerDomain: 60,
    maxTotalPages: 200,
    fetchTimeoutMs: 10000,
    fetchPauseMs: 160,
    disableQuickMap: false,
    keepMessages: 10,
    replyMinMs: 3500,
    replyMaxMs: 6000
  };
  const ORG = (window.MotoAI_CONFIG || {});
  const CFG = Object.assign({}, DEF, ORG);

  /* ====== KEYS (Từ v37, đã đổi tên) ====== */
  const K = {
    sess : "MotoAI_v37_v20ui_session",
    ctx  : "MotoAI_v37_v20ui_ctx",
    learn: "MotoAI_v37_v20ui_learn",
    stamp: "MotoAI_v37_v20ui_learnStamp",
    clean: "MotoAI_v37_v20ui_lastClean"
  };

  /* ====== UTILS (Từ v37) ====== */
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const safeJSON = s => { try { return JSON.parse(s); } catch(e){ return null; } };
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const nowSec = ()=> Math.floor(Date.now()/1000);
  const pick = a => a[Math.floor(Math.random()*a.length)];
  function nf(n){ return (n||0).toLocaleString("vi-VN"); }

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

  /* ====== UI (Từ v20) ====== */
  const CSS = `
  :root {
    --mta-blue:${CFG.themeColor}; --mta-bg:#ffffff; --mta-text:#0b1220;
    --mta-line:rgba(0,0,0,.08); --mta-z:2147483647; --vh:1vh
  }
  #mta-root{position:fixed;left:16px;bottom:calc(18px + env(safe-area-inset-bottom,0));z-index:var(--mta-z);font-family:-apple-system,system-ui,Segoe UI,Roboto,"Helvetica Neue",Arial}
  #mta-bubble{width:56px;height:56px;border:none;border-radius:14px;background:#e6f2ff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 10px 24px rgba(0,0,0,.18);outline:1px solid rgba(0,0,0,.06)}
  #mta-bubble svg{display:block}
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
  .m-msg{margin:8px 0;padding:10px 12px;border-radius:14px;max-width:84%;line-height:1.45;box-shadow:0 2px 6px rgba(0,0,0,.06); word-break:break-word;}
  .m-msg.user{background:#e9f3ff;color:#0b1220;margin-left:auto;border:1px solid rgba(0,132,255,.2)}
  .m-msg.bot{background:#f9fafb;color:#0b1220;border:1px solid rgba(0,0,0,.06)}
  #mta-sugs{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;padding:6px 8px;border-top:1px solid var(--mta-line);background:#fff}
  #mta-sugs button{border:1px solid var(--mta-line);background:#f6f9ff;color:#0b1220;padding:7px 10px;border-radius:10px;cursor:pointer;font-weight:700}
  #mta-input{display:flex;gap:8px;padding:10px;border-top:1px solid var(--mta-line);background:#fff; padding-bottom:calc(10px + env(safe-area-inset-bottom,0));}
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

  // HTML (Từ v20, đã chỉnh sửa để dùng CFG của v37)
  const HTML = `
  <div id="mta-root" aria-live="polite">
    <button id="mta-bubble" aria-label="Mở chat" title="Chat">
      <svg viewBox="0 0 64 64" width="28" height="28" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="${CFG.themeColor}"></circle>
        <path d="M20 36l9-11 6 6 9-9-9 14-6-6-9 6z" fill="#fff"></path>
      </svg>
    </button>
    <div id="mta-backdrop"></div>
    <section id="mta-card" role="dialog" aria-label="AI chat" aria-hidden="true">
      <header id="mta-header">
        <div class="brand">
          <span class="b-name">${CFG.brand}</span>
          <nav class="quick" aria-label="Liên hệ nhanh">
            ${CFG.phone ? `<a class="q" href="tel:${CFG.phone}" title="Gọi"><span>📞</span></a>` : ''}
            ${CFG.zalo ? `<a class="q" href="${CFG.zalo}" target="_blank" rel="noopener" title="Zalo">Z</a>` : ''}
            ${CFG.map && !CFG.disableQuickMap ? `<a class="q q-map" href="${CFG.map}" target="_blank" rel="noopener" title="Bản đồ">📍</a>` : ''}
          </nav>
          <button id="mta-close" title="Đóng" aria-label="Đóng">✕</button>
        </div>
      </header>
      <main id="mta-body" role="log"></main>
      <div id="mta-sugs" role="toolbar" aria-label="Gợi ý nhanh"></div>
      <footer id="mta-input">
        <input id="mta-in" placeholder="Nhập câu hỏi..." autocomplete="off" />
        <button id="mta-send" aria-label="Gửi">Gửi</button>
      </footer>
      <button id="mta-clear" title="Xóa hội thoại" aria-label="Xóa hội thoại">🗑</button>
    </section>
  </div>
  `;

  /* ====== SESSION (Từ v37) ====== */
  function getSess(){
    const arr = safeJSON(localStorage.getItem(K.sess)) || [];
    return Array.isArray(arr) ? arr : [];
  }
  function saveSess(arr){
    try{ localStorage.setItem(K.sess, JSON.stringify(arr.slice(-(CFG.keepMessages||10)))); }catch{}
  }
  // Gần giống v20, nhưng dùng hàm getSess/saveSess của v37
  function addMsg(role, text){
    if(!text) return;
    const body = $("#mta-body"); if(!body) return;
    const el = document.createElement("div");
    el.className = "m-msg " + (role === "user" ? "user" : "bot");
    el.textContent = text;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;

    // Logic lưu session của v37
    const arr = getSess(); arr.push({role, text, t: Date.now()}); saveSess(arr);
  }
  // Gần giống v20, nhưng dùng hàm getSess của v37 và câu chào của v37
  function renderSess(){
    const body = $("#mta-body"); if(!body) return;
    body.innerHTML = "";
    const arr = getSess();
    if (arr.length) arr.forEach(m => {
        // Gọi lại addMsg_DOMOnly để tránh lưu lại session
        const el = document.createElement("div");
        el.className = "m-msg " + (m.role === "user" ? "user" : "bot");
        el.textContent = m.text;
        body.appendChild(el);
    });
    else addMsg("bot", naturalize(`Xin chào 👋, em là nhân viên của ${CFG.brand}. Anh/chị chọn Xe số / Xe ga / Xe điện / 50cc / Côn tay — em báo giá theo số ngày cụ thể ạ.`));
    body.scrollTop = body.scrollHeight;
  }

  /* ====== CONTEXT (Từ v37) ====== */
  function getCtx(){ return safeJSON(localStorage.getItem(K.ctx)) || {turns:[]}; }
  function pushCtx(delta){
    try{
      const ctx = getCtx();
      ctx.turns.push(Object.assign({t:Date.now()}, delta||{}));
      ctx.turns = ctx.turns.slice(-(CFG.maxContextTurns||5));
      localStorage.setItem(K.ctx, JSON.stringify(ctx));
    }catch{}
  }

  /* ====== NLP (Từ v37) ====== */
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

  /* ====== PRICING (Từ v37) ====== */
  const PRICE_TABLE = {
    'xe số':      { day:[150000],          week:[600000,700000],    month:[850000,1200000] },
    'xe ga':      { day:[150000,200000],   week:[600000,1000000],   month:[1100000,2000000] },
    'air blade':  { day:[200000],          week:[800000],           month:[1600000,1800000] },
    'vision':     { day:[200000],          week:[700000,850000],    month:[1400000,1900000] },
    'xe điện':    { day:[170000],          week:[800000],           month:[1600000] },
    '50cc':       { day:[200000],          week:[800000],           month:[1700000] },
    'xe côn tay': { day:[300000],          week:[1200000],          month:null }
  };
  function baseFor(type,unit){
    const it=PRICE_TABLE[type]; if(!it) return null;
    const key=unit==="tuần"?"week":(unit==="tháng"?"month":"day");
    const arr=it[key]; if(!arr) return null;
    return Array.isArray(arr)?arr[0]:arr;
  }

  /* ====== SIMPLE RETRIEVAL INDEX (Từ v37) ====== */
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

  /* ====== FETCH / CRAWL (Từ v37) ====== */
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

  /* ====== AUTO-LEARN (Từ v37) ====== */
  async function learnFromSitemapOrSite(){
    const last = parseInt(localStorage.getItem(K.stamp)||0);
    if (last && (Date.now()-last) < CFG.refreshHours*3600*1000) return loadLearn();

    const cache = loadLearn();
    let total=0;
    const smUrl = location.origin + "/moto_sitemap.json";
    try{
      const r = await fetch(smUrl);
      if (r.ok) {
        const json = await r.json();
        const list = [
          ...(json.categories?.datasets?.list || []),
          ...(json.categories?.pages?.list || [])
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

  /* ====== ANSWER ENGINE (Từ v37) ====== */
  const PREFIX = ["Chào anh/chị,","Xin chào 👋,","Em chào anh/chị,","Em ở Nguyễn Tú đây,"];
  function polite(s){ s = s || "em chưa nhận được câu hỏi, anh/chị nhập lại giúp em."; return naturalize(`${pick(PREFIX)} ${s}`); }

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
    // Hàm này được gọi bởi v20.buildSugs
    // Chúng ta sẽ dùng logic trả lời của v37
    const tagLower = (tag||'').toLowerCase();
    const type = detectType(tagLower); // "xe số", "xe ga", "bảng giá", etc.

    if(type){
      // 'xe số', 'xe ga', 'xe điện', '50cc', 'xe côn tay'
      return naturalize(`Anh/chị thuê ${type} mấy ngày (hoặc theo tuần/tháng) ạ? Ví dụ: "3 ngày", "1 tuần", "1 tháng".`);
    }
    if(/giao xe/i.test(tagLower)){
      return polite(`Thuê 1–4 ngày vui lòng đến cửa hàng để chọn xe. Thuê tuần/tháng em giao tận nơi. Phí nội thành 20–100k tùy quận. Nhắn Zalo ${CFG.phone} để em sắp lịch.`);
    }
    if(/thủ tục/i.test(tagLower)){
      return polite(`Thủ tục gọn: CCCD/hộ chiếu + đặt cọc tuỳ xe. Không để giấy tờ có thể thêm 500k thay giấy tờ. Cọc tham khảo: xe số 2–3 triệu; xe ga 2–5 triệu; 50cc: 4 triệu.`);
    }
    if(/bảng giá/i.test(tagLower)){
      return polite(`Anh/chị cho em biết loại xe và số ngày (hoặc tuần/tháng) để em báo đúng — ví dụ: "xe số 2 ngày" hoặc "xe ga 1 tuần".`);
    }
     if(/liên hệ/i.test(tagLower)){
      return polite(`anh/chị gọi ${CFG.phone} hoặc Zalo ${CFG.zalo||CFG.phone} là có người nhận ngay.`);
    }
    // Fallback cho bất kỳ tag nào khác từ v20
    return polite(`Anh/chị cho em biết nhu cầu cụ thể để em tính chính xác.`);
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

  /* ====== TYPING (Từ v20) ====== */
  let typingBlinkTimer=null;
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

  /* ====== SEND (Từ v37) ====== */
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

  /* ====== OPEN/CLOSE (Từ v37, chỉnh sửa cho v20) ====== */
  function openChat(){
    if(isOpen) return;
    $("#mta-card").classList.add("open");
    $("#mta-backdrop").classList.add("show");
    $("#mta-bubble").style.display="none";
    isOpen = true;
    renderSess();
    setTimeout(()=>{ const i=$("#mta-in"); if(i) i.focus();}, 160);
    ensureSendVisible(); // Giữ lại logic fix bàn phím của v37
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

  /* ====== Mobile keyboard fixes (Từ v37) ====== */
  function setVH(){
    const vv = window.visualViewport;
    const vh = vv ? vv.height * 0.01 : window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
  function ensureSendVisible(){
    const input = $("#mta-input");
    if(!input) return;
    const vv = window.visualViewport;
    if(vv){
      const onVV = ()=>{
        setVH();
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
  
  /* ====== SUGGESTIONS (Từ v20, đã chỉnh sửa) ====== */
  const SUGS = [
    {q:'Bảng giá', label:'💰 Bảng giá'},
    {q:'Thủ tục', label:'📄 Thủ tục'}, // Thay thế v20 'Dịch vụ' = v37 'Thủ tục'
    {q:'Xe ga', label:'🛵 Xe ga'}, // Thay thế v20 'Sản phẩm' = v37 'Xe ga'
    {q:'Liên hệ', label:'☎️ Liên hệ'}
  ];
  function buildSugs(){
    const box=$('#mta-sugs'); if(!box) return;
    box.innerHTML='';
    SUGS.forEach(s=>{
      const b=document.createElement('button'); b.type='button'; b.textContent=s.label;
      b.addEventListener('click',()=>{
        if(!isOpen) openChat();
        // Dùng logic thông minh của v37 để xử lý tag
        const tagLogic = quickReplyForTag(s.q);
        if(/mấy ngày|bao nhiêu ngày/i.test(tagLogic)){
          // Nếu là câu hỏi (ví dụ: "thuê mấy ngày"), hiển thị câu hỏi đó
          addMsg('bot', tagLogic);
          pushCtx({from:'bot',intent:'ask_duration',type:detectType(s.q)});
        } else {
          // Nếu là câu trả lời (ví dụ: "liên hệ"), gửi và nhận câu trả lời
          setTimeout(()=> sendUser(s.q), 80);
        }
      });
      box.appendChild(b);
    });
  }

  /* ====== BIND (Từ v37, đã chỉnh sửa) ====== */
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
    // KHÔNG BIND #mta-tags nữa
    
    window.addEventListener("resize", autoAvoid, {passive:true});
    window.addEventListener("scroll", autoAvoid, {passive:true});
    if(window.visualViewport) window.visualViewport.addEventListener("resize", ()=>{ setVH(); ensureSendVisible(); }, {passive:true});
    
    // KHÔNG BIND focus/blur cho #mta-tags nữa
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

  /* ====== BOOT (Từ v37, đã chỉnh sửa) ====== */
  ready(async ()=>{
    const lastClean = parseInt(localStorage.getItem(K.clean)||0);
    if (!lastClean || (Date.now()-lastClean) > 7*24*3600*1000){
      localStorage.removeItem(K.learn);
      localStorage.removeItem(K.ctx);
      localStorage.setItem(K.clean, Date.now());
      console.log("MotoAI v37_v20ui: cache cleaned");
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
    
    // Gọi buildSugs của v20
    buildSugs();

    // AutoLearn (từ v37)
    if(CFG.autolearn){
      try{
        await learnFromSitemapOrSite();
        console.log("%cMotoAI v37_v20ui — learned from sitemap/site","color:"+CFG.themeColor+";font-weight:bold;");
      }catch(e){ console.warn("MotoAI autoLearn err",e); }
    }
  });

  // Public API (từ v37)
  window.MotoAI_v37_V20UI = {
    open: ()=>{ try{ openChat(); }catch(e){} },
    close: ()=>{ try{ closeChat(); }catch(e){} },
    send: (t)=>{ try{ sendUser(t); }catch(e){} },
    learnNow: ()=> learnFromSitemapOrSite(),
    getIndex: getIndexFlat
  };
})();

