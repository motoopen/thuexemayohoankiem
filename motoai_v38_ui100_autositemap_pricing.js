/* MotoAI v38 UI100 — AutoSitemap + SmartPricing + 8 Tags
 * UI giữ kiểu “nằm dưới màn hình”, cao ~85% viewport, mượt mobile, không vướng bàn phím.
 * Học moto_sitemap.json + HTML/TXT; hiểu "1 ngày/2 tuần/tháng..." và báo giá ước tính gọn.
 * Tags: Xe số, Xe ga, Xe điện, 50cc, Bảng giá, Thủ tục, Giao xe, Liên hệ
 */
(function(){
  if (window.MotoAI_v38_UI100_LOADED) return; window.MotoAI_v38_UI100_LOADED = true;

  // ===== CONFIG
  const DEF = {
    brand: "AI Assistant",
    phone: "0000000000",
    zalo:  "",
    map:   "",
    avatar: "💬",
    themeColor: "#0084FF",
    autolearn: true,
    extraSites: [location.origin],
    sitemapJson: "/moto_sitemap.json",
    refreshHours: 24,
    maxItems: 1200,
    maxInternalPages: 30,
    minSentenceLen: 22,
    typingMinMs: 3500,
    typingMaxMs: 6000
  };
  const CFG = Object.assign({}, DEF, (window.MotoAI_CONFIG||{}));
  const HOSTKEY = (location.host||"site").replace(/[^a-z0-9.-]/gi,"_");

  // ===== KEYS
  const K = {
    sess: `MotoAI_v38_${HOSTKEY}_sess`,
    learn:`MotoAI_v38_${HOSTKEY}_learn`,      // {domain:{ts,pages:[{url,title,text}]}, datasets:[{url,text}]}
    last: `MotoAI_v38_${HOSTKEY}_lastLearn`,
    mapH: `MotoAI_v38_${HOSTKEY}_mapHash`
  };

  // ===== UTILS
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const safe = s => { try{return JSON.parse(s)}catch(e){return null} };
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const nowSec = ()=> Math.floor(Date.now()/1000);
  const uniq = a => Array.from(new Set(a));
  const pick = a => a[Math.floor(Math.random()*a.length)];
  const nfVND = n => (n||0).toLocaleString('vi-VN');

  // ===== UI (UI100, full-width bottom, 85% height)
  const ui = `
  <div id="mta-root" aria-live="polite">
    <button id="mta-bubble" aria-label="Mở chat" title="Chat">
      <svg viewBox="0 0 64 64" width="28" height="28" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="${CFG.themeColor||'#0084FF'}"></circle>
        <path d="M20 36l9-11 6 6 9-9-9 14-6-6-9 6z" fill="#fff"></path>
      </svg>
    </button>
    <div id="mta-backdrop"></div>
    <section id="mta-card" role="dialog" aria-label="Chat ${CFG.brand}" aria-hidden="true">
      <header id="mta-header">
        <div class="brand">
          <div class="left">
            <span class="avatar">${CFG.avatar||'💬'}</span>
            <div class="info">
              <div class="name">${CFG.brand}</div>
              <div class="sub">Hỗ trợ trực tuyến</div>
            </div>
          </div>
          <nav class="quick" aria-label="Liên hệ nhanh">
            ${CFG.phone?`<a class="q" href="tel:${CFG.phone}" title="Gọi">📞</a>`:""}
            ${CFG.zalo?`<a class="q" href="${CFG.zalo}" target="_blank" rel="noopener" title="Zalo">Z</a>`:""}
            ${CFG.map?`<a class="q" href="${CFG.map}" target="_blank" rel="noopener" title="Bản đồ">📍</a>`:""}
          </nav>
          <button id="mta-close" title="Đóng" aria-label="Đóng">✕</button>
        </div>
      </header>

      <main id="mta-body" role="log" aria-live="polite"></main>

      <!-- Tags: 8 nút -->
      <div id="mta-tags" role="toolbar" aria-label="Gợi ý nhanh (kéo ngang)">
        <div class="tag-track" id="tagTrack">
          <button data-q="Xe số">🏍️ Xe số</button>
          <button data-q="Xe ga">🛵 Xe ga</button>
          <button data-q="Xe điện">⚡ Xe điện</button>
          <button data-q="50cc">🚲 50cc</button>
          <button data-q="Bảng giá">💰 Bảng giá</button>
          <button data-q="Thủ tục">📑 Thủ tục</button>
          <button data-q="Giao xe">🛵 Giao xe</button>
          <button data-q="Liên hệ">📞 Liên hệ</button>
        </div>
        <div class="fade fade-left"></div>
        <div class="fade fade-right"></div>
      </div>

      <footer id="mta-input">
        <input id="mta-in" placeholder="Nhập câu hỏi cho ${CFG.brand}..." autocomplete="off" />
        <button id="mta-send" aria-label="Gửi">➤</button>
      </footer>
      <button id="mta-clear" title="Xóa hội thoại" aria-label="Xóa hội thoại">🗑</button>
    </section>
  </div>`;

  const css = `
  :root{--mta-blue:${CFG.themeColor||'#0084FF'};--mta-bg:#fff;--mta-text:#0b1220;--mta-line:rgba(0,0,0,.08);--mta-z:2147483647;--vh:1vh}
  #mta-root{position:fixed;right:16px;bottom:calc(18px + env(safe-area-inset-bottom,0));z-index:var(--mta-z);font-family:-apple-system,system-ui,Segoe UI,Roboto,Arial}
  #mta-bubble{width:56px;height:56px;border:none;border-radius:14px;background:#e6f2ff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 10px 24px rgba(0,0,0,.18);outline:1px solid rgba(0,0,0,.06)}
  #mta-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.14);opacity:0;pointer-events:none;transition:opacity .16s}
  #mta-backdrop.show{opacity:1;pointer-events:auto}
  #mta-card{
    position:fixed;left:0;right:0;bottom:0;margin:auto;width:min(900px,calc(100% - 24px));
    height:calc(var(--vh,1vh)*85);max-height:820px;background:var(--mta-bg);color:var(--mta-text);
    border-radius:16px 16px 0 0;box-shadow:0 -14px 36px rgba(0,0,0,.22);
    transform:translateY(112%);display:flex;flex-direction:column;overflow:hidden;transition:transform .22s ease-out;opacity:.999
  }
  #mta-card.open{transform:translateY(0)}
  #mta-header{border-bottom:1px solid var(--mta-line);background:#fff}
  #mta-header .brand{display:flex;align-items:center;justify-content:space-between;padding:8px 10px}
  #mta-header .left{display:flex;align-items:center;gap:10px}
  .avatar{width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,.06);display:flex;align-items:center;justify-content:center}
  .info .name{font-weight:800;color:var(--mta-blue);line-height:1}
  .info .sub{font-size:12px;opacity:.8}
  .quick{display:flex;gap:6px;margin-left:6px;margin-right:auto}
  .q{width:30px;height:30px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;font-size:12px;font-weight:800;background:#f2f5f8;color:#111;border:1px solid var(--mta-line)}
  #mta-close{background:none;border:none;font-size:20px;color:var(--mta-blue);cursor:pointer}

  #mta-body{flex:1;overflow:auto;padding:12px 12px 10px;background:#fff}
  .m-msg{margin:8px 0;padding:10px 12px;border-radius:14px;max-width:84%;line-height:1.5;box-shadow:0 2px 6px rgba(0,0,0,.06);word-break:break-word;white-space:pre-wrap}
  .m-msg.user{background:#e9f3ff;color:#0b1220;margin-left:auto;border:1px solid rgba(0,132,255,.2)}
  .m-msg.bot{background:#f9fafb;color:#0b1220;border:1px solid rgba(0,0,0,.06)}

  #mta-tags{position:relative;background:#fff;border-top:1px solid var(--mta-line)}
  #mta-tags .tag-track{display:block;white-space:nowrap;overflow-x:auto;padding:8px 10px 10px;scroll-behavior:smooth}
  #mta-tags button{display:inline-block;margin-right:8px;padding:8px 12px;border:none;border-radius:999px;background:#f6f9ff;box-shadow:0 1px 2px rgba(0,0,0,.06);border:1px solid rgba(0,0,0,.08);font-weight:700;cursor:pointer}
  #mta-tags .fade{position:absolute;top:0;bottom:0;width:22px;pointer-events:none}
  #mta-tags .fade-left{left:0;background:linear-gradient(90deg,#fff,rgba(255,255,255,0))}
  #mta-tags .fade-right{right:0;background:linear-gradient(270deg,#fff,rgba(255,255,255,0))}

  #mta-input{display:flex;gap:8px;padding:10px;background:#fff;border-top:1px solid var(--mta-line)}
  #mta-in{flex:1;padding:11px 12px;border-radius:12px;border:1px solid rgba(0,0,0,.12);font-size:15px;background:#F6F8FB}
  #mta-send{width:42px;height:42px;border:none;border-radius:50%;background:linear-gradient(90deg,var(--mta-blue),#00B2FF);color:#fff;font-weight:800;cursor:pointer;box-shadow:0 6px 18px rgba(0,132,255,.35)}
  #mta-clear{position:absolute;top:8px;right:46px;background:none;border:none;font-size:16px;opacity:.9;cursor:pointer}

  @media(prefers-color-scheme:dark){
    :root{--mta-bg:#1b1c1f;--mta-text:#f2f6fb;--mta-line:rgba(255,255,255,.08)}
    #mta-card{background:var(--mta-bg);color:var(--mta-text)}
    #mta-header{background:linear-gradient(180deg, rgba(0,132,255,.14), rgba(0,132,255,0)), #202226;border-bottom:1px solid var(--mta-line)}
    #mta-body{background:#1b1c1f}
    .m-msg.bot{background:#23262b;color:#f2f6fb;border:1px solid rgba(255,255,255,.08)}
    .m-msg.user{background:#20324a;color:#eaf4ff;border:1px solid rgba(0,132,255,.35)}
    #mta-tags{background:#202226;border-top:1px solid var(--mta-line)}
    #mta-tags button{background:#2a2d33;color:#f3f6f8;border:1px solid rgba(255,255,255,.12)}
    #mta-in{background:#16181c;color:#f0f3f7;border:1px solid rgba(255,255,255,.15)}
    .q{background:#2a2d33;color:#f3f6f8;border:1px solid rgba(255,255,255,.12)}
  }
  @media(max-width:520px){
    #mta-card{width:calc(100% - 16px)}
    .q{width:28px;height:28px}
  }`;

  // ===== Inject UI
  function injectUI(){
    if ($('#mta-root')) return;
    const wrap = document.createElement('div'); wrap.innerHTML = ui; document.body.appendChild(wrap.firstElementChild);
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  }
  function setVH(){
    const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const vh = h * 0.01; document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
  function ready(fn){
    if(document.readyState==="complete"||document.readyState==="interactive"){ fn(); }
    else document.addEventListener("DOMContentLoaded", fn);
  }

  // ===== SESSION
  function addMsg(role,text){
    if(!text) return;
    const el = document.createElement('div'); el.className = 'm-msg '+(role==='user'?'user':'bot'); el.textContent = text;
    const body = $('#mta-body'); if(!body) return;
    body.appendChild(el); body.scrollTop = body.scrollHeight;
    try{
      const arr = safe(localStorage.getItem(K.sess))||[];
      arr.push({role,text,t:Date.now()}); localStorage.setItem(K.sess, JSON.stringify(arr.slice(-200)));
    }catch(e){}
  }
  function renderSess(){
    const body = $('#mta-body'); if(!body) return; body.innerHTML='';
    const arr = safe(localStorage.getItem(K.sess))||[];
    if(arr.length) arr.forEach(m=> addMsg(m.role,m.text));
    else addMsg('bot', `Xin chào 👋, em là nhân viên hỗ trợ của ${CFG.brand}. Anh/chị muốn xem 🏍️ Xe số, 🛵 Xe ga, ⚡ Xe điện, 🚲 50cc, 💰 Bảng giá, 📑 Thủ tục hay 🛵 Giao xe?`);
  }

  // ===== Typing
  function randomTyping(){ return CFG.typingMinMs + Math.random()*(CFG.typingMaxMs-CFG.typingMinMs); }
  let typingEl=null, typingTimer=null;
  function showTyping(){
    if(typingEl) return;
    typingEl = document.createElement('div');
    typingEl.id='mta-typing'; typingEl.className='m-msg bot'; typingEl.textContent='Đang nhập';
    const dot=document.createElement('span'); dot.id='mta-typing-dots'; dot.textContent='…'; typingEl.appendChild(document.createTextNode(' ')); typingEl.appendChild(dot);
    $('#mta-body').appendChild(typingEl); $('#mta-body').scrollTop=$('#mta-body').scrollHeight;
    let i=0; typingTimer=setInterval(()=>{ dot.textContent='.'.repeat((i++%3)+1); }, 420);
  }
  function hideTyping(){
    if(typingTimer){ clearInterval(typingTimer); typingTimer=null; }
    if(typingEl){ typingEl.remove(); typingEl=null; }
  }

  // ===== Learn (sitemap + internal + txt)
  async function fetchText(url){
    try{
      const r = await fetch(url, {cache:'no-store'}); if(!r.ok) return '';
      const ct = (r.headers.get('content-type')||'').toLowerCase();
      const txt = await r.text();
      if(ct.includes('text/plain')) return txt;
      // crude HTML -> text
      const tmp=document.createElement('div'); tmp.innerHTML=txt;
      const nodes=tmp.querySelectorAll('p,h1,h2,h3,li,article,section');
      return Array.from(nodes).map(n=>(n.textContent||'').trim()).filter(t=>t.length>=CFG.minSentenceLen).join('\n');
    }catch(e){ return ''; }
  }
  async function readSitemapJSON(url){
    try{
      const r = await fetch(url, {cache:'no-store'}); if(!r.ok) return null;
      const data = await r.json(); return data;
    }catch(e){ return null; }
  }
  function looksVN(s){ return /[ăâêôơưđà-ỹ]/i.test(s) || /(thuê|xe|giá|cọc|hà nội|liên hệ)/i.test(s||''); }

  async function learnFromMap(map){
    const cache = safe(localStorage.getItem(K.learn))||{};
    const outPages=[]; const outDatasets=[];

    // pages
    const pageList = map?.categories?.pages?.list || [];
    for(const u of (pageList||[])){
      const t = await fetchText(u); if(!t) continue;
      if(!looksVN(t)) continue;
      outPages.push({url:u, title:u, text:t.slice(0,1200)});
      if(outPages.length>=CFG.maxInternalPages) break;
      await sleep(120);
    }

    // datasets (txt)
    const dsList = map?.categories?.datasets?.list || [];
    for(const u of (dsList||[])){
      const t = await fetchText(u); if(!t) continue;
      if(!looksVN(t)) continue;
      outDatasets.push({url:u, text:t});
      await sleep(80);
    }

    const pack = {
      ts: nowSec(),
      pages: outPages,
      datasets: outDatasets
    };
    try{
      cache['__learn__'] = pack;
      localStorage.setItem(K.learn, JSON.stringify(cache));
    }catch(e){}
    return pack;
  }

  async function fallbackInternal(){
    const anchors = $$('a[href]').map(a=> a.getAttribute('href')).filter(Boolean)
      .map(h=>{ try{ return new URL(h,location.href).href }catch(e){ return null }})
      .filter(Boolean).filter(u=>u.startsWith(location.origin))
      .filter(u=>!/\.(png|jpe?g|gif|webp|svg|pdf|zip|rar|7z|mp4|mp3|ico)(\?|$)/i.test(u))
      .filter(u=>!u.includes('#'));
    const uniqLinks = uniq(anchors).slice(0, CFG.maxInternalPages);
    const out = [];
    for(const u of uniqLinks){
      const t = await fetchText(u); if(!t) continue;
      if(!looksVN(t)) continue;
      out.push({url:u, title:u, text:t.slice(0,1200)});
      await sleep(120);
    }
    return {ts: nowSec(), pages: out, datasets: []};
  }

  async function scheduleLearn(force=false){
    try{
      const last = parseInt(localStorage.getItem(K.last)||'0',10)||0;
      const need = force || !last || (Date.now()-last) > CFG.refreshHours*3600*1000;
      if(!need) return safe(localStorage.getItem(K.learn))||{};
      let pack=null;
      if(CFG.autolearn && CFG.sitemapJson){
        const map = await readSitemapJSON(CFG.sitemapJson);
        if(map) pack = await learnFromMap(map);
      }
      if(!pack){
        pack = await fallbackInternal();
      }
      localStorage.setItem(K.last, String(Date.now()));
      return pack;
    }catch(e){ return null; }
  }

  function getLearn(){
    const cache = safe(localStorage.getItem(K.learn))||{};
    return cache['__learn__']||{pages:[],datasets:[],ts:0};
  }
  function findDataset(keyword){
    const bundle = getLearn();
    const low = (keyword||'').toLowerCase();
    let best=null, score=0;
    for(const it of (bundle.datasets||[])){
      const t=(it.text||'').toLowerCase();
      let s=0; if(/ngày|day/.test(low)) s++;
      if(/tuần|tuan|week/.test(low)) s++;
      if(/tháng|thang|month/.test(low)) s++;
      if(t.includes('thủ tục')||t.includes('giấy tờ')) if(/thủ tục|giấy tờ/.test(low)) s+=2;
      if(t.includes('giao xe')) if(/giao xe|giao|nhận/.test(low)) s+=2;
      if(s>score){ score=s; best=it; }
    }
    return best;
  }

  // ===== Smart Pricing (không liệt kê lan man)
  const PRICE_TABLE = {
    'xe số':      { day:[150000], week:[600000,700000], month:[850000,1200000] },
    'xe ga':      { day:[150000,200000], week:[600000,1000000], month:[1100000,2000000] },
    'xe điện':    { day:[170000], week:[800000], month:[1600000] },
    '50cc':       { day:[200000], week:[800000], month:[1700000] },
    'xe côn tay': { day:[300000], week:[1200000], month:[] }
  };
  const CANON = [
    {re:/xe số|wave|blade|sirius|jupiter/i, canon:'xe số'},
    {re:/xe ga|vision|lead|air\s*blade|ab\b|scoopy|vespa/i, canon:'xe ga'},
    {re:/xe điện|vinfast|yadea|dibao|gogo/i, canon:'xe điện'},
    {re:/50\s*cc|xe 50/i, canon:'50cc'},
    {re:/côn tay|tay côn|winner|exciter|gsx|raider/i, canon:'xe côn tay'}
  ];
  function detectType(t){
    for(const m of CANON){ if(m.re.test(t)) return m.canon; }
    return null;
  }
  function detectQty(t){
    const m = (t||'').match(/(\d+)\s*(ngày|day|tuần|tuan|week|tháng|thang|month)?/i);
    if(!m) return null;
    const n=parseInt(m[1],10); if(!n) return null;
    let unit='day';
    if(m[2]){ if(/tuần|tuan|week/i.test(m[2])) unit='week'; else if(/tháng|thang|month/i.test(m[2])) unit='month'; }
    return {n,unit};
  }
  function formatRange(a){ if(!a||!a.length) return null; return a.length===1? nfVND(a[0])+'đ' : nfVND(a[0])+'–'+nfVND(a[1])+'đ'; }
  function baseFor(type,unit){ const it=PRICE_TABLE[type]; if(!it) return null; const arr=it[unit]; return arr && arr.length ? arr[0] : null; }
  function summariseType(type){
    const it=PRICE_TABLE[type]; if(!it) return '';
    const d=formatRange(it.day), w=formatRange(it.week), m=formatRange(it.month);
    return [d&&`${d}/ngày`, w&&`${w}/tuần`, m&&`${m}/tháng`].filter(Boolean).join(', ');
  }
  function estimate(text){
    const t = detectType(text)||'xe số';
    const qty = detectQty(text);
    if(!qty) return `Giá ${t} khoảng ${summariseType(t)}. Liên hệ Zalo ${CFG.phone} để xem xe & chốt giá chính xác.`;
    const base = baseFor(t, qty.unit);
    if(!base) return `Giá theo ${qty.unit==='day'?'ngày':qty.unit==='week'?'tuần':'tháng'} của ${t} cần kiểm tra. Nhắn Zalo ${CFG.phone} để chốt mẫu xe.`;
    const total = base * qty.n;
    const label = qty.unit==='day'?`${qty.n} ngày`:qty.unit==='week'?`${qty.n} tuần`:`${qty.n} tháng`;
    return `Ước tính thuê ${t} ${label} ~ ${nfVND(total)}đ. Có lựa chọn xem xe trực tiếp hoặc tư vấn qua Zalo ${CFG.phone}.`;
  }

  // ===== Compose
  const PREFIX = ["Chào anh/chị,","Xin chào 👋,","Em chào anh/chị,"];
  function polite(s){
    s=(s||'').trim(); if(!s) s='em chưa nhận được câu hỏi, anh/chị nhập lại giúp em.';
    if(!/[.!?…]$/.test(s)) s+='.'; return `${pick(PREFIX)} ${s}`;
  }

  const RULES = [
    {re:/(thủ tục|thu tuc|giấy tờ|giay to|cọc|đặt cọc)/i, ans:()=> {
      const ds = findDataset('thủ tục')?.text || 'Thủ tục gọn: CCCD/hộ chiếu + đặt cọc theo xe. Trong khu trung tâm có thể linh hoạt. Liên hệ Zalo để chốt nhanh.';
      return polite(ds);
    }},
    {re:/(giao xe|giao|nhận|nhan xe)/i, ans:()=> {
      const ds = findDataset('giao xe')?.text || 'Giao xe nội thành ~20k–100k/chiều. Thuê 1–4 ngày vui lòng nhận tại cửa hàng; thuê tuần/tháng có hỗ trợ giao.';
      return polite(ds);
    }},
    {re:/(liên hệ|lien he|zalo|hotline|sđt|sdt|gọi)/i, ans:()=> polite(`anh/chị liên hệ nhanh qua Zalo ${CFG.phone} hoặc gọi ${CFG.phone} (${CFG.brand}).`)},
    {re:/(giá|bao nhiêu|tính tiền|thuê|cost|price)/i, ans:(q)=> polite(estimate(q))}
  ];

  function routeByTag(q){
    q=(q||'').toLowerCase();
    if(/xe số/.test(q))  return polite(estimate('xe số'));
    if(/xe ga/.test(q))  return polite(estimate('xe ga'));
    if(/xe điện/.test(q))return polite(estimate('xe điện'));
    if(/\b50cc\b/.test(q)) return polite(estimate('50cc'));
    if(/bảng giá|bang gia/.test(q)){
      // tổng hợp gọn
      const items = ['xe số','xe ga','xe điện','50cc'];
      const lines = items.map(t=> `• ${t}: ${summariseType(t)}`).join('\n');
      return polite(`Bảng giá tham khảo:\n${lines}\nAnh/chị nhắn số ngày/tuần/tháng để em tính nhanh.`);
    }
    if(/thủ tục|thu tuc/.test(q)){
      const ds = findDataset('thủ tục')?.text || 'CCCD/Hộ chiếu + cọc tuỳ xe. Có phương án thay giấy tờ bằng 500k khi cần (nếu đủ điều kiện).';
      return polite(ds);
    }
    if(/giao xe/.test(q)){
      const ds = findDataset('giao xe')?.text || 'Giao nội thành ~20k–100k/chiều; tuần/tháng có hỗ trợ giao. Thuê ngắn ngày vui lòng đến cửa hàng để chọn xe.';
      return polite(ds);
    }
    if(/liên hệ|lien he/.test(q)) return polite(`Zalo ${CFG.phone} • Gọi ${CFG.phone}${CFG.map?` • Bản đồ: ${CFG.map}`:''}`);
    return null;
  }

  function compose(q){
    const m=(q||'').trim();
    if(!m) return polite('anh/chị thử bấm: 🏍️ Xe số, 🛵 Xe ga, ⚡ Xe điện, 🚲 50cc, 💰 Bảng giá, 📑 Thủ tục, 🛵 Giao xe hoặc 📞 Liên hệ');
    // rules first
    for(const r of RULES){ if(r.re.test(m)) return typeof r.ans==='function' ? r.ans(m) : polite(r.ans); }
    // tag router
    const tagAns = routeByTag(m); if(tagAns) return tagAns;
    // pricing if mentions duration/type
    if(detectQty(m) || detectType(m)) return polite(estimate(m));
    // retrieval (very light): show first page snippet
    const learn = getLearn();
    const pool = (learn.pages||[]).slice(0,20);
    if(pool.length){
      const low = m.toLowerCase(); let best=null,score=0;
      for(const it of pool){
        const t=((it.title||'')+' '+(it.text||'')).toLowerCase();
        let s=0; low.split(/\s+/).forEach(w=>{ if(w && t.includes(w)) s++; });
        if(s>score){ score=s; best=it; }
      }
      if(best && score>0){
        const sn = (best.text||'').trim().slice(0,220).replace(/\s+/g,' ');
        return polite(`${sn} ... Xem thêm: ${best.url}`);
      }
    }
    return polite('anh/chị nói rõ loại xe và thời gian thuê (vd: xe ga 3 ngày) để em tính ngay.');
  }

  // ===== Open/Close/Send
  let isOpen=false, sending=false;
  function openChat(){ if(isOpen) return; $('#mta-card').classList.add('open'); $('#mta-backdrop').classList.add('show'); $('#mta-bubble').style.display='none'; isOpen=true; renderSess(); setTimeout(()=>{ try{$('#mta-in').focus()}catch(e){} },120); }
  function closeChat(){ if(!isOpen) return; $('#mta-card').classList.remove('open'); $('#mta-backdrop').classList.remove('show'); $('#mta-bubble').style.display='flex'; isOpen=false; hideTyping(); }
  function clearChat(){ try{ localStorage.removeItem(K.sess); }catch(e){}; const b=$('#mta-body'); if(b) b.innerHTML=''; addMsg('bot', polite('đã xóa hội thoại')); }
  async function sendUser(text){
    if(sending) return; sending=true;
    addMsg('user', text);
    showTyping();
    await sleep(randomTyping());
    let ans; try{ ans = compose(text); }catch(e){ ans = null; }
    hideTyping(); addMsg('bot', ans || polite(`xin lỗi, có lỗi khi trả lời. Anh/chị liên hệ Zalo ${CFG.phone} giúp em nhé.`));
    sending=false;
  }

  // ===== Bind UI
  function bindUI(){
    $('#mta-bubble').addEventListener('click', openChat);
    $('#mta-backdrop').addEventListener('click', closeChat);
    $('#mta-close').addEventListener('click', closeChat);
    $('#mta-clear').addEventListener('click', clearChat);
    $('#mta-send').addEventListener('click', ()=>{ const v=($('#mta-in').value||'').trim(); if(!v) return; $('#mta-in').value=''; sendUser(v); });
    $('#mta-in').addEventListener('keydown',(e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); const v=($('#mta-in').value||'').trim(); if(!v) return; $('#mta-in').value=''; sendUser(v); }});
    const track = $('#tagTrack'); if(track){ track.querySelectorAll('button').forEach(b=> b.addEventListener('click', ()=> sendUser(b.dataset.q))); }
    // Auto avoid keyboard/footer
    const root = $('#mta-root');
    function avoid(){
      if(!root) return;
      let bottom = 'calc(18px + env(safe-area-inset-bottom,0))';
      if(window.visualViewport){
        const vv = window.visualViewport;
        if(vv.height < window.innerHeight - 120) bottom = '110px';
      }
      root.style.bottom = bottom;
      root.style.right = '16px'; root.style.left = 'auto';
    }
    avoid();
    window.addEventListener('resize', ()=>{ setVH(); avoid(); }, {passive:true});
    if(window.visualViewport) window.visualViewport.addEventListener('resize', ()=>{ setVH(); avoid(); }, {passive:true});
  }

  // ===== Boot
  ready(async ()=>{
    injectUI(); setVH(); bindUI();
    // autolearn (non-blocking)
    try{ await scheduleLearn(false); }catch(e){}
    // watchdog
    setTimeout(()=>{ if(!$('#mta-bubble')) injectUI(); }, 2000);
    console.log('%cMotoAI v38 UI100 — ready','color:'+ (CFG.themeColor||'#0084FF') +';font-weight:bold;');
  });

  // Expose minimal API
  window.MotoAI_v38_UI100 = {
    open: ()=>{ try{ openChat(); }catch(e){} },
    close: ()=>{ try{ closeChat(); }catch(e){} },
    learnNow: ()=> scheduleLearn(true)
  };
})();
