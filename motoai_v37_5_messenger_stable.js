/* motoai_v37_5_messenger_stable.js
   Messenger-style UI • delay 3.5–6.5s • keep 10 messages • deep context + retrieval
   Brand: Nguyen Tu
*/
(function(){
  if (window.MotoAI_v37_5_LOADED) return; 
  window.MotoAI_v37_5_LOADED = true;

  /* ====== CONFIG ====== */
  const DEF = {
    brand: "Nguyen Tu",
    phone: "0942467674",
    zalo: "https://zalo.me/0942467674",
    map: "https://maps.app.goo.gl/SR1hcwnCQjPkAvDh7",
    avatar: "👩‍💼",
    themeColor: "#0084FF",
    autolearn: true,
    deepContext: true,
    maxContextTurns: 5,
    viOnly: true,
    extraSites: [location.origin],
    crawlDepth: 1,
    refreshHours: 24,
    maxPagesPerDomain: 50,
    maxTotalPages: 180,
    fetchTimeoutMs: 9000,
    fetchPauseMs: 170,
    disableQuickMap: false
  };
  const ORG = (window.MotoAI_CONFIG || {});
  const CFG = Object.assign({}, DEF, ORG);
  const MAX_MSG = 10; // << bạn yêu cầu: chỉ giữ 10 tin gần nhất

  /* ====== HELPERS ====== */
  const $ = s => document.querySelector(s);
  const safeJSON = s => { try{return JSON.parse(s);}catch{return null;} };
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const nowSec = ()=>Math.floor(Date.now()/1000);

  // tự nhiên tiếng Việt, bỏ “ạ/nhé/nha”
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
  const K = {
    sess: "MotoAI_v37_5_session",
    ctx: "MotoAI_v37_5_ctx",
    learn: "MotoAI_v37_5_learn"
  };

  /* ====== UI ====== */
  const CSS = `
  :root{
    --mta-z:2147483647;
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
  }
  #mta-bubble{
    width:56px;height:56px;border:none;border-radius:999px;
    background:linear-gradient(150deg,var(--m-blue),#00B2FF);
    display:flex;align-items:center;justify-content:center;
    cursor:pointer;box-shadow:0 10px 28px rgba(0,0,0,.18);
    color:#fff;font-size:22px;
  }
  #mta-backdrop{
    position:fixed;inset:0;background:rgba(0,0,0,.2);
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
  #mta-header .name{
    font-weight:700;font-size:14px;line-height:1.1;
  }
  #mta-header .status{
    font-size:12px;opacity:.9;display:flex;align-items:center;gap:4px;
  }
  #mta-header .status-dot{
    width:8px;height:8px;border-radius:50%;background:#3fff6c;
  }
  #mta-header .actions{
    margin-left:auto;display:flex;gap:6px;align-items:center;
  }
  #mta-header .act{
    width:28px;height:28px;border-radius:999px;
    background:rgba(255,255,255,.16);
    border:1px solid rgba(255,255,255,.25);
    display:flex;align-items:center;justify-content:center;
    color:#fff;font-size:13px;text-decoration:none;
  }
  #mta-close{
    background:none;border:none;color:#fff;
    font-size:20px;cursor:pointer;
  }

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
  .m-msg.bot{
    background:#fff;color:#0d1117;
    border:1px solid rgba(0,0,0,.03);
  }
  .m-msg.user{
    background:#0084FF;color:#fff;
    margin-left:auto;border-bottom-right-radius:3px;
  }
  #mta-typing{
    display:inline-flex;gap:6px;align-items:center;margin:6px 0;
  }
  #mta-typing span{background:#fff;padding:6px 8px;border-radius:999px;font-size:12px;}
  #mta-tags{
    background:#f6f7f9;border-top:1px solid rgba(0,0,0,.05);
    transition:max-height .2s ease,opacity .2s ease;
  }
  #mta-tags.hidden{max-height:0;opacity:0;overflow:hidden;}
  #mta-tags .track{
    display:block;white-space:nowrap;overflow-x:auto;
    padding:8px 10px 10px;
  }
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
    padding:9px 10px 9px 12px;
    background:#F2F4F7;
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
    <button id="mta-bubble" aria-label="Mở chat cùng Nguyen Tu">
      💬
    </button>
    <div id="mta-backdrop"></div>
    <section id="mta-card" role="dialog" aria-label="Chat Nguyen Tu" aria-hidden="true">
      <header id="mta-header">
        <div class="bar">
          <div class="avatar">${CFG.avatar}</div>
          <div class="info">
            <div class="name">Nguyen Tu — Đang hoạt động</div>
            <div class="status"><span class="status-dot"></span>Trực tuyến</div>
          </div>
          <div class="actions">
            ${CFG.phone?`<a class="act" href="tel:${CFG.phone}" title="Gọi nhanh">📞</a>`:""}
            ${CFG.zalo?`<a class="act" href="${CFG.zalo}" target="_blank" rel="noopener" title="Zalo">Z</a>`:""}
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
        <input id="mta-in" placeholder="Nhắn cho Nguyen Tu..." autocomplete="off" />
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
      // chỉ giữ 10 tin gần nhất
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
      addMsg("bot", naturalize(`Xin chào 👋, em là nhân viên hỗ trợ của ${CFG.brand}. Anh/chị cần thuê xe số, xe ga hay theo tháng ạ?`));
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
    {k:'xe số',re:/xe số|wave|blade|sirius|jupiter/i, canon:'xe số'},
    {k:'xe ga',re:/xe ga|vision|air\s*blade|lead|scoopy/i, canon:'xe ga'},
    {k:'air blade',re:/air\s*blade|airblade|ab\b/i, canon:'air blade'},
    {k:'vision',re:/vision/i, canon:'vision'},
    {k:'xe điện',re:/xe điện|vinfast|yadea|dibao/i, canon:'xe điện'},
    {k:'50cc',re:/50\s*cc|xe 50/i, canon:'50cc'},
    {k:'xe côn tay',re:/côn tay|tay côn/i, canon:'xe côn tay'}
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
    return {
      needPrice: /(giá|bao nhiêu|thuê|thuê xe|tính tiền|cost|price)/i.test(t),
      needDocs: /(thủ tục|giấy tờ|cọc|đặt cọc|cccd|passport)/i.test(t),
      needContact: /(liên hệ|zalo|gọi|hotline|sđt|sdt)/i.test(t)
    };
  }

  /* ====== BẢNG GIÁ ====== */
  const PRICE_TABLE = {
    'xe số':      { day:[140000,150000], week:[600000], month:[1000000,1200000] },
    'xe ga':      { day:[180000,220000], week:[750000,900000], month:[1500000,2000000] },
    'air blade':  { day:[200000,230000], week:[800000], month:[1800000] },
    'vision':     { day:[200000], week:[850000], month:[1900000] },
    'xe điện':    { day:[200000], week:[800000], month:[1500000] },
    '50cc':       { day:[180000], week:[750000], month:[1500000] },
    'xe côn tay': { day:[350000], week:[1200000], month:[2500000] }
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
      return naturalize(`Giá ${type} khoảng ${priceSummary(type)}. Anh/chị thuê mấy ngày để em tính luôn?`);
    }
    const base = baseFor(type, qty.unit);
    if(!base){
      return naturalize(`Giá theo ${qty.unit} của ${type} cần kiểm tra. Anh/chị nhắn Zalo ${CFG.phone} giúp em để chốt mẫu xe.`);
    }
    const total = base * qty.n;
    const label = qty.unit==="ngày"?`${qty.n} ngày`:qty.unit==="tuần"?`${qty.n} tuần`:`${qty.n} tháng`;
    return naturalize(`Ước tính thuê ${type} ${label} khoảng ${nf(total)}đ. Em có giữ xe và giao tận nơi được.`);
  }

  /* ====== RETRIEVAL CƠ BẢN (GIỮ NGUYÊN Ý TƯỞNG) ====== */
  function tk(s){ return (s||"").toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu,' ').split(/\s+/).filter(Boolean); }
  function loadLearn(){ return safeJSON(localStorage.getItem(K.learn)) || {}; }
  function saveLearn(o){ try{ localStorage.setItem(K.learn, JSON.stringify(o)); }catch{} }
  function getIndexFlat(){
    const cache = loadLearn();
    const out = [];
    Object.keys(cache).forEach(key=>{
      (cache[key].pages||[]).forEach(pg=>{
        out.push(Object.assign({source:key}, pg));
      });
    });
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
  function mkSnippet(text,q,max=200){
    if(!text) return "";
    const t = text.replace(/\s+/g," ").trim();
    if(t.length<=max) return t;
    const tokens = tk(q);
    for(const tok of tokens){
      const p = t.toLowerCase().indexOf(tok);
      if(p>=0){
        const start = Math.max(0, p-50);
        return (start>0?"...":"")+t.slice(start,start+max)+"...";
      }
    }
    return t.slice(0,max)+"...";
  }
  async function fetchText(url){
    const ctl = new AbortController();
    const id = setTimeout(()=>ctl.abort(), CFG.fetchTimeoutMs);
    try{
      const res = await fetch(url, {signal:ctl.signal});
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
    const items = Array.from(doc.getElementsByTagName("item"));
    if(items.length){
      return items.map(it=>it.getElementsByTagName("link")[0]?.textContent?.trim()).filter(Boolean);
    }
    const sm = Array.from(doc.getElementsByTagName("sitemap")).map(x=>x.getElementsByTagName("loc")[0]?.textContent?.trim()).filter(Boolean);
    if(sm.length){
      const all=[]; for(const loc of sm){ try{ const child = await readSitemap(loc); all.push(...child); }catch{} }
      return all;
    }
    const urls = Array.from(doc.getElementsByTagName("url")).map(u=>u.getElementsByTagName("loc")[0]?.textContent?.trim()).filter(Boolean);
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
      await sleep(CFG.fetchPauseMs);
    }
    return out;
  }
  async function learnOne(base){
    try{
      if(/\.xml($|\?)/i.test(base)){
        const urls = await readSitemap(base);
        const pages = await pullPages(urls);
        return {domain:base, ts:nowSec(), pages};
      }
      const origin = base.endsWith("/")?base:base+"/";
      let urls=[];
      const candidates = [origin+"sitemap.xml", origin+"sitemap_index.xml"];
      for(const c of candidates){
        try{
          const u = await readSitemap(c);
          if(u && u.length){ urls=u; break; }
        }catch{}
      }
      if(!urls.length) urls = await fallbackCrawl(origin);
      const pages = await pullPages(urls);
      return {domain:origin, ts:nowSec(), pages};
    }catch(e){ return null; }
  }
  async function learnSites(list, force=false){
    if(!Array.isArray(list)) list=[list];
    const cache = loadLearn();
    const results = {};
    let total=0;
    for(const site of list){
      const key=site;
      const old=cache[key];
      if(!force && old && old.pages?.length && (nowSec()-old.ts)/3600 < CFG.refreshHours){
        results[key]=old; total+=old.pages.length; continue;
      }
      const data = await learnOne(site);
      if(data && data.pages?.length){
        cache[key]=data; saveLearn(cache);
        results[key]=data; total+=data.pages.length;
      }
      if(total>=CFG.maxTotalPages) break;
    }
    saveLearn(cache);
    return results;
  }

  /* ====== ANSWER ENGINE ====== */
  const PREFIX = ["Chào anh/chị,","Xin chào 👋,","Em chào anh/chị,","Em ở Nguyễn Tú đây,"];
  const pick = a => a[Math.floor(Math.random()*a.length)];
  function polite(s){
    s = s || "em chưa nhận được câu hỏi, anh/chị nhập lại giúp em.";
    return naturalize(`${pick(PREFIX)} ${s}`);
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
    if(intents.needDocs) return polite(`thủ tục gọn: CCCD/hộ chiếu + cọc nhẹ theo xe. Trong khu Hoàn Kiếm – phố cổ có thể giảm cọc.`);
    if(intents.needPrice) return composePrice(type, qty);

    // thử retrieval
    try{
      const top = searchIndex(q, 3);
      if(top && top.length){
        const lines = top.map(t=>{
          const sn = mkSnippet(t.title||t.text||"", q, 140);
          let dom = t.source || "nguồn";
          try{ if(t.url) dom = new URL(t.url).hostname.replace(/^www\./,""); }catch{}
          return `• ${sn} (${dom})`;
        });
        return naturalize(`em tìm được vài nội dung liên quan:\n${lines.join("\n")}\nAnh/chị muốn em tóm tắt cụ thể mục nào không?`);
      }
    }catch(e){}

    return polite(`anh/chị muốn thuê xe loại nào (xe số, xe ga, xe điện) và thuê bao nhiêu ngày để em báo đúng giá.`);
  }

  /* ====== SEND / UI CONTROL ====== */
  let isOpen = false;
  let sending = false;
  let typingTimer = null;

  function showTyping(){
    const body = $("#mta-body");
    if(!body) return;
    const box = document.createElement("div");
    box.id = "mta-typing";
    box.innerHTML = `<span>Đang nhập</span>`;
    body.appendChild(box);
    body.scrollTop = body.scrollHeight;
  }
  function hideTyping(){
    const t = $("#mta-typing");
    if(t) t.remove();
    if(typingTimer){ clearInterval(typingTimer); typingTimer=null; }
  }

  async function sendUser(text){
    if(sending) return;
    const v = (text||"").trim();
    if(!v) return;
    sending = true;
    addMsg("user", v);
    pushCtx({from:"user",raw:v,type:detectType(v),qty:detectQty(v)});

    // delay 3.5s – 6.5s
    showTyping();
    const wait = 3500 + Math.random()*3000;
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

  // tránh đè với quick call / bottom bar
  function autoAvoid(){
    const root = $("#mta-root");
    if(!root) return;
    let bottom = 16;
    const blockers = document.querySelector(".qca, #quickcall, .bottom-appbar");
    if(blockers){
      const r = blockers.getBoundingClientRect();
      const gap = window.innerHeight - r.top;
      if(gap < 140) bottom = gap + 72;
    }
    if(window.visualViewport && window.visualViewport.height < window.innerHeight - 120){
      bottom = 110;
    }
    root.style.bottom = bottom + "px";
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
    window.addEventListener("resize", autoAvoid, {passive:true});
    window.addEventListener("scroll", autoAvoid, {passive:true});
    if(window.visualViewport) window.visualViewport.addEventListener("resize", autoAvoid, {passive:true});
  }

  function maybeDisableQuickMap(){
    if(!CFG.disableQuickMap) return;
    const m = document.querySelector(".q-map, #mta-header .q-map");
    if(m){
      m.removeAttribute("href");
      m.style.opacity=".4";
      m.style.pointerEvents="none";
    }
  }

  function ready(fn){
    if(document.readyState==="complete"||document.readyState==="interactive") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(async ()=>{
    injectUI();
    bindEvents();
    autoAvoid();
    maybeDisableQuickMap();

    // autolearn
    if(CFG.autolearn){
      try{
        await learnSites(Array.from(new Set(CFG.extraSites||[location.origin])), false);
      }catch(e){ console.warn("MotoAI autoLearn err",e); }
    }

    console.log("%cMotoAI v37.5 Messenger Stable — ready","color:"+CFG.themeColor+";font-weight:bold;");
  });

  // Public API
  window.MotoAI_v37_5 = {
    open: openChat,
    close: closeChat,
    send: sendUser,
    learnNow: (sites,force)=>learnSites(sites,force),
    getIndex: getIndexFlat
  };

})();
