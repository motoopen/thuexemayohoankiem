(function(){
  if (window.MotoAI_v37_6_UI20LOW_FULL) return;
  window.MotoAI_v37_6_UI20LOW_FULL = true;

  /* ================== CONFIG ================== */
  const DEF = {
    brand: "Nguyễn Tú",
    phone: "0942467674",
    zalo:  "https://zalo.me/0942467674",
    map:   "https://maps.app.goo.gl/SR1hcwnCQjPkAvDh7",
    avatar:"🛵",
    themeColor:"#0084FF",
    autolearn: true,
    deepContext: true,
    maxContextTurns: 5,
    viOnly: true,
    extraSites: [location.origin],
    refreshHours: 24,
    crawlDepth: 1,
    maxPagesPerDomain: 60,
    maxTotalPages: 200,
    fetchTimeoutMs: 9000,
    fetchPauseMs: 160
  };
  const ORG = (window.MotoAI_CONFIG||{});
  const CFG = Object.assign({}, DEF, ORG);

  /* ================== KEYS & HELPERS ================== */
  const K = {
    sess:  "MotoAI_v376_full_sess",
    ctx:   "MotoAI_v376_full_ctx",
    learn: "MotoAI_v376_full_learn",
    stamp: "MotoAI_v376_full_stamp",
    clean: "MotoAI_v376_full_clean"
  };
  const $  = s=>document.querySelector(s);
  const $$ = s=>Array.from(document.querySelectorAll(s));
  const safeJSON = s=>{ try{return JSON.parse(s);}catch{return null;} };
  const sleep = ms=>new Promise(r=>setTimeout(r,ms));
  const nowSec = ()=>Math.floor(Date.now()/1000);
  const nf = n => (n||0).toLocaleString("vi-VN");

  function naturalize(t){
    if(!t) return t;
    let s = " " + t + " ";
    s = s.replace(/\s+ạ([.!?,\s]|$)/gi,"$1")
         .replace(/\s+nhé([.!?,\s]|$)/gi,"$1")
         .replace(/\s+nha([.!?,\s]|$)/gi,"$1")
         .replace(/\s{2,}/g," ").trim();
    if(!/[.!?]$/.test(s)) s += ".";
    return s.replace(/\.\./g,".");
  }

  /* ================== UI (hạ thấp như v20, fixed input) ================== */
  const CSS = `
  :root{--mta-z:2147483647;--m-blue:${CFG.themeColor};--m-bg:#fff;--m-text:#0b1220;--vh:1vh}
  #mta-root{position:fixed;left:16px;right:auto;bottom:calc(18px + env(safe-area-inset-bottom,0));
    z-index:var(--mta-z);font-family:-apple-system,system-ui,Segoe UI,Roboto,"Helvetica Neue",Arial}
  #mta-bubble{width:56px;height:56px;border:none;border-radius:14px;background:#e6f2ff;
    display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 10px 24px rgba(0,0,0,.18)}
  #mta-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.12);opacity:0;pointer-events:none;transition:.15s}
  #mta-backdrop.show{opacity:1;pointer-events:auto}
  #mta-card{position:fixed;left:0;right:0;bottom:0;margin:auto;width:min(900px,calc(100% - 18px));
    height:calc(var(--vh,1vh)*64);max-height:650px;background:var(--m-bg);color:var(--m-text);
    border-radius:16px 16px 0 0;box-shadow:0 -12px 30px rgba(0,0,0,.18);
    transform:translateY(110%);display:flex;flex-direction:column;overflow:hidden;transition:transform .2s ease-out}
  #mta-card.open{transform:translateY(0)}
  #mta-header{background:linear-gradient(130deg,var(--m-blue),#00B2FF);color:#fff}
  #mta-header .bar{display:flex;align-items:center;gap:10px;padding:10px 12px}
  #mta-header .avatar{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.22);
    display:flex;align-items:center;justify-content:center}
  #mta-header .name{font-weight:800;font-size:14px}
  #mta-header .status{font-size:12px;opacity:.92}
  #mta-header .status-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#3fff6c;margin-right:4px}
  #mta-header .actions{margin-left:auto;display:flex;gap:6px}
  #mta-header .act{width:28px;height:28px;border-radius:10px;background:rgba(255,255,255,.16);
    border:1px solid rgba(255,255,255,.25);display:inline-flex;align-items:center;justify-content:center;color:#fff;text-decoration:none}
  #mta-close{background:none;border:none;color:#fff;font-size:18px;cursor:pointer}
  #mta-body{flex:1;overflow:auto;padding:12px 10px;background:linear-gradient(180deg,#E9EEF5 0%, #D7E0EC 100%)}
  .m-msg{max-width:84%;margin:7px 0;padding:9px 12px;border-radius:18px;line-height:1.45;box-shadow:0 1px 2px rgba(0,0,0,.06);font-size:14px}
  .m-msg.bot{background:#fff;color:#111;border:1px solid rgba(0,0,0,.04)}
  .m-msg.user{background:#0084FF;color:#fff;margin-left:auto;border:1px solid rgba(0,0,0,.05)}
  #mta-typing{display:inline-flex;gap:6px;align-items:center}
  #mta-typing span{background:#fff;padding:6px 8px;border-radius:999px;font-size:12px}
  #mta-tags{background:#f6f7f9;border-top:1px solid rgba(0,0,0,.06)}
  #mta-tags .track{display:block;white-space:nowrap;overflow-x:auto;padding:8px 10px 10px}
  #mta-tags button{display:inline-block;margin-right:8px;background:#fff;border:1px solid rgba(0,0,0,.06);
    border-radius:999px;padding:7px 12px;font-size:13px;cursor:pointer}
  #mta-input{display:flex;gap:8px;padding:8px 8px;border-top:1px solid rgba(0,0,0,.06);background:#fff;position:sticky;bottom:0}
  #mta-in{flex:1;border:1px solid rgba(0,0,0,.1);border-radius:14px;padding:10px 12px;background:#F2F4F7}
  #mta-send{width:42px;height:42px;border:none;border-radius:50%;background:linear-gradient(160deg,#0084FF,#00B2FF);
    color:#fff;cursor:pointer;box-shadow:0 6px 18px rgba(0,132,255,.35)}
  /* khi bàn phím mở (iOS/Android) giữ nút gửi luôn lộ */
  .kb-open #mta-input{padding-bottom:8px}
  @media(max-width:560px){
    #mta-card{width:calc(100% - 12px);height:calc(var(--vh,1vh)*68);max-height:none}
    .m-msg{max-width:90%}
  }
  @media(prefers-color-scheme:dark){
    :root{--m-bg:#1a1c20;--m-text:#ecf0f5}
    #mta-body{background:linear-gradient(180deg,#131416,#1a1c20)}
    .m-msg.bot{background:#23252a;color:#fff;border:1px solid rgba(255,255,255,.06)}
    #mta-input{background:#1a1c20;border-top:1px solid rgba(255,255,255,.06)}
    #mta-in{background:#121317;color:#fff;border:1px solid rgba(255,255,255,.12)}
    #mta-tags{background:#1c1e22;border-top:1px solid rgba(255,255,255,.06)}
    #mta-tags button{background:#22242a;color:#fff;border:1px solid rgba(255,255,255,.12)}
  }`;

  const HTML = `
  <div id="mta-root" aria-live="polite">
    <button id="mta-bubble" aria-label="Mở chat với ${CFG.brand}" title="Chat">
      <svg viewBox="0 0 64 64" width="26" height="26" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="${CFG.themeColor}"></circle>
        <path d="M20 36l9-11 6 6 9-9-9 14-6-6-9 6z" fill="#fff"></path>
      </svg>
    </button>
    <div id="mta-backdrop"></div>
    <section id="mta-card" role="dialog" aria-label="Chat ${CFG.brand}" aria-hidden="true">
      <header id="mta-header">
        <div class="bar">
          <div class="avatar">${CFG.avatar}</div>
          <div class="info">
            <div class="name">${CFG.brand} — Hỗ trợ trực tuyến</div>
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

      <!-- 8 TAGS: theo yêu cầu -->
      <div id="mta-tags" role="toolbar" aria-label="Gợi ý nhanh">
        <div class="track" id="mta-tag-track">
          <button data-tag="so">🏍 Xe số</button>
          <button data-tag="ga">🛵 Xe ga</button>
          <button data-tag="dien">⚡ Xe điện</button>
          <button data-tag="50">🚲 50cc</button>
          <button data-tag="con">🏍 Côn tay</button>
          <button data-tag="giaoxe">🚚 Giao xe</button>
          <button data-tag="thutuc">📄 Thủ tục</button>
          <button data-tag="banggia">💰 Bảng giá</button>
        </div>
      </div>

      <footer id="mta-input">
        <input id="mta-in" placeholder="Nhắn cho ${CFG.brand}..." autocomplete="off" />
        <button id="mta-send" aria-label="Gửi">➤</button>
      </footer>
    </section>
  </div>`;

  /* ================== SESSION ================== */
  const MAX_MSG = 10;
  function getSess(){ const a=safeJSON(localStorage.getItem(K.sess))||[]; return Array.isArray(a)?a:[]; }
  function saveSess(a){ try{ localStorage.setItem(K.sess, JSON.stringify(a.slice(-MAX_MSG))); }catch{} }
  function addMsg(role,text){
    if(!text) return;
    const body=$("#mta-body"); if(!body) return;
    const el=document.createElement("div");
    el.className="m-msg "+(role==="user"?"user":"bot");
    el.textContent=text;
    body.appendChild(el); body.scrollTop=body.scrollHeight;
    const arr=getSess(); arr.push({role,text,t:Date.now()}); saveSess(arr);
  }
  function renderSess(){
    const body=$("#mta-body"); body.innerHTML="";
    const arr=getSess();
    if(arr.length) arr.forEach(m=>addMsg(m.role,m.text));
    else addMsg("bot", naturalize(`Xin chào 👋, em là nhân viên hỗ trợ của ${CFG.brand}. Anh/chị chọn Xe số / Xe ga / Xe điện / 50cc / Côn tay… và cho em biết thuê mấy ngày để em báo đúng giá nhé`));
  }

  /* ================== CONTEXT ================== */
  function getCtx(){ return safeJSON(localStorage.getItem(K.ctx))||{turns:[]}; }
  function pushCtx(d){ try{ const c=getCtx(); c.turns.push(Object.assign({t:Date.now()},d||{})); c.turns=c.turns.slice(-(CFG.maxContextTurns||5)); localStorage.setItem(K.ctx, JSON.stringify(c)); }catch{} }

  /* ================== NLP & PRICING ================== */
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
    if(!m) return null;
    const n=parseInt(m[1],10); if(!n) return null;
    let unit="ngày";
    if(m[2]){ if(/tuần|tuan|week/i.test(m[2])) unit="tuần"; else if(/tháng|thang|month/i.test(m[2])) unit="tháng"; }
    return {n, unit};
  }
  function detectIntent(t){
    return {
      needPrice:   /(giá|bao nhiêu|thuê|tính tiền|cost|price)/i.test(t),
      needDocs:    /(thủ tục|giấy tờ|cccd|passport|hộ chiếu)/i.test(t),
      needContact: /(liên hệ|zalo|gọi|hotline|sđt|sdt|phone)/i.test(t),
      needDelivery:/(giao|ship|tận nơi|đưa xe|mang xe)/i.test(t),
      needPolicy:  /(điều kiện|chính sách|bảo hiểm|hư hỏng|sự cố|đặt cọc|cọc)/i.test(t)
    };
  }
  const PRICE_TABLE = {
    'xe số':      { day:[150000],          week:[600000,700000], month:[850000,1200000] },
    'xe ga':      { day:[150000,200000],   week:[600000,1000000], month:[1100000,2000000] },
    'air blade':  { day:[200000],          week:[800000],        month:[1600000,1800000] },
    'vision':     { day:[200000],          week:[700000,850000], month:[1400000,1900000] },
    'xe điện':    { day:[170000],          week:[800000],        month:[1600000] },
    '50cc':       { day:[200000],          week:[800000],        month:[1700000] },
    'xe côn tay': { day:[300000],          week:[1200000],       month:null }
  };
  function baseFor(type,unit){
    const it=PRICE_TABLE[type]; if(!it) return null;
    const key=unit==="tuần"?"week":(unit==="tháng"?"month":"day");
    const arr=it[key]; if(!arr) return null;
    return Array.isArray(arr)?arr[0]:arr;
  }
  function composePrice(type, qty){
    if(!type) type="xe số";
    if(!qty) return naturalize(`Anh/chị thuê ${type} theo ngày, tuần hay tháng — và bao nhiêu ${type==='xe số'?'ngày':''}? Cho em biết để báo đúng giá.`);
    const base=baseFor(type, qty.unit);
    if(!base) return naturalize(`Giá thuê ${type} theo ${qty.unit} cần kiểm tra. Anh/chị nhắn Zalo ${CFG.phone} để em chốt theo mẫu xe ạ.`);
    const total = base * qty.n;
    const unitLabel = qty.unit==="ngày"?"ngày":(qty.unit==="tuần"?"tuần":"tháng");
    const text = qty.n===1 ? `Giá thuê ${type} 1 ${unitLabel} khoảng ${nf(base)}đ` : `Giá thuê ${type} ${qty.n} ${unitLabel} khoảng ${nf(total)}đ`;
    let hint=""; if(qty.unit==="ngày" && qty.n>=3) hint=" Nếu thuê theo tuần sẽ tiết kiệm hơn.";
    return naturalize(`${text}. Em có thể giữ xe và gửi ảnh xe qua Zalo ${CFG.phone}.${hint}`);
  }

  /* ================== RETRIEVAL (auto-learn) ================== */
  function tk(s){ return (s||"").toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu,' ').split(/\s+/).filter(Boolean); }
  function loadLearn(){ return safeJSON(localStorage.getItem(K.learn))||{}; }
  function saveLearn(o){ try{ localStorage.setItem(K.learn, JSON.stringify(o)); }catch{} }
  function getIndexFlat(){
    const cache = loadLearn(), out=[];
    Object.keys(cache).forEach(key=>{ (cache[key].pages||[]).forEach(pg=> out.push(Object.assign({source:key},pg)));});
    return out;
  }
  function searchIndex(query,k=3){
    const qtok=tk(query); if(!qtok.length) return [];
    const idx=getIndexFlat();
    return idx.map(it=>{
      const txt=((it.title||"")+" "+(it.text||"")+" "+(it.url||"")).toLowerCase();
      let score=0; qtok.forEach(t=>{ if(txt.includes(t)) score++; });
      return Object.assign({score},it);
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,k);
  }
  async function fetchText(url){
    const ctl=new AbortController(); const id=setTimeout(()=>ctl.abort(), CFG.fetchTimeoutMs);
    try{ const r=await fetch(url,{signal:ctl.signal}); clearTimeout(id); if(!r.ok) return null; return await r.text(); }
    catch(e){ clearTimeout(id); return null; }
  }
  function parseXML(t){ try{return (new DOMParser()).parseFromString(t,"text/xml");}catch{return null;} }
  function parseHTML(t){ try{return (new DOMParser()).parseFromString(t,"text/html");}catch{return null;} }
  async function readSitemap(url){
    const xml=await fetchText(url); if(!xml) return [];
    const doc=parseXML(xml); if(!doc) return [];
    const items=Array.from(doc.getElementsByTagName("item"));
    if(items.length) return items.map(it=>it.getElementsByTagName("link")[0]?.textContent?.trim()).filter(Boolean);
    const sm = Array.from(doc.getElementsByTagName("sitemap")).map(x=>x.getElementsByTagName("loc")[0]?.textContent?.trim()).filter(Boolean);
    if(sm.length){ const all=[]; for(const loc of sm){ try{const child=await readSitemap(loc); all.push(...child);}catch{} } return all; }
    return Array.from(doc.getElementsByTagName("url")).map(u=>u.getElementsByTagName("loc")[0]?.textContent?.trim()).filter(Boolean);
  }
  async function fallbackCrawl(root){
    const start=root.endsWith("/")?root:root+"/";
    const html=await fetchText(start); if(!html) return [start];
    const doc=parseHTML(html); if(!doc) return [start];
    const links=Array.from(doc.querySelectorAll("a[href]"));
    const set=new Set([start]);
    links.forEach(a=>{ try{ const u=new URL(a.getAttribute("href"),start).toString().split("#")[0]; if(u.startsWith(start)) set.add(u);}catch{} });
    return Array.from(set).slice(0,40);
  }
  function looksVN(s){
    if(/[ăâêôơưđà-ỹ]/i.test(s)) return true;
    return ((s.match(/\b(xe|thuê|giá|cọc|liên hệ|hà nội)\b/gi)||[]).length)>=2;
  }
  async function pullPages(urls){
    const out=[];
    for(const u of urls.slice(0,CFG.maxPagesPerDomain)){
      const txt=await fetchText(u); if(!txt) continue;
      let title=(txt.match(/<title[^>]*>([^<]+)<\/title>/i)||[])[1]||""; title=title.replace(/\s+/g," ").trim();
      let desc=(txt.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"]+)["']/i)||[])[1]||"";
      if(!desc){
        desc = txt.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ")
                  .replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,600);
      }
      const sample=(title+" "+desc).toLowerCase();
      if(CFG.viOnly && !looksVN(sample)) { await sleep(CFG.fetchPauseMs); continue; }
      out.push({url:u,title,text:desc}); await sleep(CFG.fetchPauseMs);
    }
    return out;
  }
  async function learnFromSitemapOrSite(){
    const last=parseInt(localStorage.getItem(K.stamp)||0,10)||0;
    if(last && (Date.now()-last) < CFG.refreshHours*3600*1000) return loadLearn();
    const cache=loadLearn(); let total=0;

    // ưu tiên moto_sitemap.json
    const smUrl = location.origin + "/moto_sitemap.json";
    try{
      const r=await fetch(smUrl);
      if(r.ok){
        const json=await r.json();
        const urls=[...(json.categories?.datasets?.list||[]), ...(json.categories?.pages?.list||[])];
        const grouped=[]; 
        for(const u of urls){
          const txt=await fetchText(u); if(!txt) continue;
          if(/\.txt($|\?)/i.test(u)){
            const title=u.split("/").slice(-1)[0];
            const text=txt.replace(/\s+/g," ").trim().slice(0,2000);
            grouped.push({url:u,title,text});
          }else{
            let title=(txt.match(/<title[^>]*>([^<]+)<\/title>/i)||[])[1]||"";
            title=title.replace(/\s+/g," ").trim();
            let desc=(txt.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"]+)["']/i)||[])[1]||"";
            if(!desc) desc=txt.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ")
                              .replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,600);
            const sample=(title+" "+desc).toLowerCase();
            if(CFG.viOnly && !looksVN(sample)) continue;
            grouped.push({url:u,title,text:desc});
          }
          total++; if(total>=CFG.maxTotalPages) break; await sleep(CFG.fetchPauseMs);
        }
        if(grouped.length){
          cache["sitemap-json"]={domain:smUrl, ts:nowSec(), pages:grouped};
          saveLearn(cache); localStorage.setItem(K.stamp, String(Date.now()));
          return cache;
        }
      }
    }catch(e){ /* ignore */ }

    // fallback: sitemap.xml hoặc crawl
    try{
      const origin=location.origin;
      let urls=[];
      for(const c of [origin+"/sitemap.xml", origin+"/sitemap_index.xml"]){
        try{ const u=await readSitemap(c); if(u && u.length){ urls=u; break; } }catch{}
      }
      if(!urls.length) urls=await fallbackCrawl(origin);
      const pages=await pullPages(urls);
      if(pages?.length){ cache[origin]={domain:origin, ts:nowSec(), pages}; saveLearn(cache); }
      localStorage.setItem(K.stamp, String(Date.now()));
    }catch(e){}
    return cache;
  }

  /* ================== ANSWER ================== */
  const PREFIX = ["Chào anh/chị,","Xin chào 👋,","Em chào anh/chị,","Em ở Nguyễn Tú đây,"];
  const pick = a => a[Math.floor(Math.random()*a.length)];
  function polite(s){ s=s||"em chưa nhận được câu hỏi, anh/chị nhập lại giúp em."; return naturalize(`${pick(PREFIX)} ${s}`); }

  function deepCompose(userText){
    const q=(userText||"").trim();
    const intents=detectIntent(q);
    const type=detectType(q);
    const qty=detectQty(q);

    if(intents.needContact)  return polite(`anh/chị gọi ${CFG.phone} hoặc nhắn Zalo ${CFG.zalo||CFG.phone} ạ.`);
    if(intents.needDocs)     return polite(`thủ tục gọn: CCCD/hộ chiếu + cọc: xe số 2–3 triệu; xe ga 2–5 triệu; 50cc cọc 4 triệu. Không để giấy tờ thì thêm 500k thay giấy tờ.`);
    if(intents.needDelivery) return polite(`thuê 1–4 ngày: mời anh/chị đến cửa hàng để chọn xe; thuê tuần/tháng: em nhận giao tận nơi. Phí nội thành 20–100k tuỳ quận.`);
    if(intents.needPolicy)   return polite(`điều kiện & đặt cọc như trên; em hỗ trợ kiểm tra xe kỹ, hoàn cọc nhanh khi trả.`);

    if(intents.needPrice || type || qty) return composePrice(type, qty);

    // search index
    const hits = searchIndex(q,3);
    if(hits?.length){
      const lines = hits.map(t=>{
        const sn = ((t.title||"")+" — "+(t.text||"")).replace(/\s+/g," ").slice(0,160);
        let host="nguồn"; try{ if(t.url) host=new URL(t.url).hostname.replace(/^www\./,""); }catch{}
        return `• ${sn} (${host})`;
      });
      return polite(`em tìm được nội dung liên quan:\n${lines.join("\n")}\nAnh/chị muốn em tóm tắt mục nào không?`);
    }

    return polite(`anh/chị chọn loại xe (Xe số, Xe ga, Xe điện, 50cc, Côn tay) và thuê mấy ngày để em báo đúng giá.`);
  }

  /* ================== SEND / UI CONTROL ================== */
  let isOpen=false, sending=false;

  function showTyping(){
    const body=$("#mta-body"); if(!body) return;
    const box=document.createElement("div"); box.id="mta-typing"; box.innerHTML=`<span>Đang nhập</span>`;
    body.appendChild(box); body.scrollTop=body.scrollHeight;
  }
  function hideTyping(){ const t=$("#mta-typing"); if(t) t.remove(); }

  async function sendUser(text){
    if(sending) return;
    const v=(text||"").trim(); if(!v) return;
    sending=true; addMsg("user", v);
    pushCtx({from:"user",raw:v,type:detectType(v),qty:detectQty(v)});
    // DELAY 3.5–6.0s như bạn yêu cầu
    showTyping(); await sleep(3500 + Math.random()*2500);
    const ans = deepCompose(v); hideTyping(); addMsg("bot", ans);
    pushCtx({from:"bot",raw:ans}); sending=false;
  }

  function openChat(){
    if(isOpen) return;
    $("#mta-card").classList.add("open");
    $("#mta-backdrop").classList.add("show");
    $("#mta-bubble").style.display="none";
    isOpen=true; renderSess();
    setTimeout(()=>{ const i=$("#mta-in"); if(i) i.focus(); },130);
  }
  function closeChat(){
    if(!isOpen) return;
    $("#mta-card").classList.remove("open");
    $("#mta-backdrop").classList.remove("show");
    $("#mta-bubble").style.display="flex";
    isOpen=false; hideTyping();
  }

  // iOS/Android keyboard safe: giữ nút gửi luôn hiện
  function setVH(){
    const vh = (window.visualViewport? window.visualViewport.height : window.innerHeight) * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
  function bindKeyboardSafe(){
    setVH();
    const onVV = ()=>{
      setVH();
      // nếu bàn phím mở (viewport thấp hơn nhiều) -> thêm class kb-open
      const kb = window.visualViewport && (window.visualViewport.height < window.innerHeight - 120);
      document.body.classList.toggle('kb-open', !!kb);
    };
    window.addEventListener('resize', onVV, {passive:true});
    if(window.visualViewport) window.visualViewport.addEventListener('resize', onVV, {passive:true});
  }

  function bindEvents(){
    $("#mta-bubble").addEventListener("click", openChat);
    $("#mta-backdrop").addEventListener("click", closeChat);
    $("#mta-close").addEventListener("click", closeChat);
    $("#mta-send").addEventListener("click", ()=>{
      const inp=$("#mta-in"); const v=inp.value.trim(); if(!v) return;
      inp.value=""; sendUser(v);
    });
    $("#mta-in").addEventListener("keydown", e=>{
      if(e.key==="Enter" && !e.shiftKey){
        e.preventDefault();
        const v=e.target.value.trim(); if(!v) return;
        e.target.value=""; sendUser(v);
      }
    });

    // Tag behavior: hỏi “thuê mấy ngày?” chứ không liệt kê giá
    const track=$("#mta-tag-track");
    if(track){
      track.querySelectorAll("button").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          const t = btn.getAttribute("data-tag");
          const map = {
            "so":"Anh/chị muốn thuê xe số mấy ngày (1–2 ngày, 1 tuần, hay 1 tháng)?",
            "ga":"Anh/chị muốn thuê xe ga mấy ngày (1–2 ngày, 1 tuần, hay 1 tháng)?",
            "dien":"Anh/chị muốn thuê xe điện mấy ngày?",
            "50":"Anh/chị muốn thuê 50cc mấy ngày?",
            "con":"Anh/chị muốn thuê xe côn tay mấy ngày?",
            "giaoxe":"Anh/chị thuê theo tuần/tháng cần giao tận nơi ở quận nào? (phí nội thành 20–100k)",
            "thutuc":"Thủ tục: CCCD/hộ chiếu + cọc (xe số 2–3tr; xe ga 2–5tr; 50cc cọc 4tr). Không để giấy tờ có thể thêm 500k.",
            "banggia":"Anh/chị cho em loại xe + số ngày để báo đúng giá (vd: “xe ga 2 ngày”, “xe số 1 tuần”)."
          };
          sendUser(map[t] || btn.textContent);
        });
      });
    }
  }

  function ready(fn){ if(document.readyState==="complete"||document.readyState==="interactive") fn(); else document.addEventListener("DOMContentLoaded", fn); }

  ready(async ()=>{
    // inject UI
    const wrap=document.createElement("div"); wrap.innerHTML=HTML; document.body.appendChild(wrap.firstElementChild);
    const st=document.createElement("style"); st.textContent=CSS; document.head.appendChild(st);
    bindEvents(); bindKeyboardSafe();

    // clean cache mỗi 7 ngày
    const lastClean=parseInt(localStorage.getItem(K.clean)||0,10)||0;
    if(!lastClean || (Date.now()-lastClean) > 7*24*3600*1000){
      localStorage.removeItem(K.learn); localStorage.removeItem(K.ctx);
      localStorage.setItem(K.clean, String(Date.now()));
    }

    // autolearn
    if(CFG.autolearn){
      try{ await learnFromSitemapOrSite(); console.log("%cMotoAI: learned sitemap/site","color:"+CFG.themeColor+";font-weight:bold;"); }catch(e){}
    }
  });

  // Public API
  window.MotoAI_v37_6_full = {
    open: ()=>{ try{ $("#mta-bubble")?.click(); }catch{} },
    close: ()=>{ try{ $("#mta-close")?.click(); }catch{} },
    send: sendUser,
    learnNow: ()=>learnFromSitemapOrSite(),
    getIndex: getIndexFlat
  };
})();
