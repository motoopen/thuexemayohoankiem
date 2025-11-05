/* MotoAI v39 UI100 Centered + AutoSitemap + Dynamic Pricing
   - UI khung chat giữa màn hình, 8 tag thông minh
   - Học HTML + TXT từ moto_sitemap.json, sitemap.xml hoặc fallback crawl
   - Tính giá theo thời gian người dùng nhập (1 ngày => 1 ngày, 2 tuần => 2 tuần)
   - Delay trả lời tự nhiên 3.5–6.0s
*/
(function(){
  if (window.MotoAI_v39_FULL_LOADED) return;
  window.MotoAI_v39_FULL_LOADED = true;

  /* ===== CONFIG (có thể override bằng window.MotoAI_CONFIG trước khi nhúng) ===== */
  const DEF = {
    brand: "Nguyễn Tú",
    phone: "0942467674",
    zalo: "https://zalo.me/0942467674",
    themeColor: "#0084FF",
    // AutoLearn
    refreshHours: 72,
    maxPagesPerDomain: 60,
    maxTotalPages: 180,
    fetchTimeoutMs: 10000,
    fetchPauseMs: 160,
    // Session
    keepMessages: 10
  };
  const CFG = Object.assign({}, DEF, (window.MotoAI_CONFIG||{}));

  /* ===== KEYS ===== */
  const K = {
    sess: 'MotoAI_v39_session',
    learn:'MotoAI_v39_learn', // cache: {origin:{ts,pages:[{url,title,text}]}}
    last:'MotoAI_v39_lastLearn'
  };

  /* ===== UI (chat giữa màn hình) ===== */
  const UI = `
  <div id="mta-root" aria-live="polite">
    <button id="mta-bubble" aria-label="Mở chat" title="Chat">
      <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="${CFG.themeColor}"></circle>
        <path d="M20 36l9-11 6 6 9-9-9 14-6-6-9 6z" fill="#fff"></path>
      </svg>
    </button>
    <div id="mta-backdrop"></div>
    <section id="mta-card" role="dialog" aria-label="MotoAI Chat" aria-hidden="true">
      <header id="mta-header">
        <div class="brand">
          <span class="b-name">${CFG.brand}</span>
          <nav class="quick">
            <a class="q" href="tel:${CFG.phone}" title="Gọi">📞</a>
            <a class="q" href="${CFG.zalo}" target="_blank" rel="noopener" title="Zalo">Z</a>
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
    </section>
  </div>`;

  const CSS = `
  :root { --mta-blue:${CFG.themeColor}; --mta-bg:#fff; --mta-text:#0b1220; --mta-line:rgba(0,0,0,.08); --mta-z:2147483647 }
  #mta-root{position:fixed;left:0;right:0;bottom:calc(18px + env(safe-area-inset-bottom,0));z-index:var(--mta-z);
    display:flex;justify-content:center;font-family:-apple-system,system-ui,Segoe UI,Roboto,"Helvetica Neue",Arial}
  #mta-bubble{width:64px;height:64px;border:none;border-radius:18px;background:#e6f2ff;display:flex;align-items:center;justify-content:center;
    cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.18)}
  #mta-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.1);opacity:0;pointer-events:none;transition:.2s}
  #mta-backdrop.show{opacity:1;pointer-events:auto}
  #mta-card{position:fixed;left:50%;transform:translateX(-50%) translateY(110%);bottom:0;width:min(900px,calc(100% - 24px));height:70vh;max-height:720px;
    background:var(--mta-bg);color:var(--mta-text);border-radius:16px 16px 0 0;box-shadow:0 -12px 30px rgba(0,0,0,.18);
    display:flex;flex-direction:column;overflow:hidden;transition:transform .25s ease-out}
  #mta-card.open{transform:translateX(-50%) translateY(0)}
  #mta-header{border-bottom:1px solid var(--mta-line);padding:8px 12px;background:#fff;display:flex;align-items:center;justify-content:space-between}
  .b-name{font-weight:800;color:var(--mta-blue)}
  .quick{display:flex;gap:6px}
  .q{width:30px;height:30px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;background:#f2f6ff;border:1px solid var(--mta-line);text-decoration:none}
  #mta-body{flex:1;overflow:auto;padding:10px 12px;font-size:15px;background:#fff}
  .m-msg{margin:8px 0;padding:10px 12px;border-radius:14px;max-width:84%;line-height:1.45;box-shadow:0 1px 2px rgba(0,0,0,.05)}
  .m-msg.user{background:#e9f3ff;margin-left:auto;border:1px solid rgba(0,132,255,.2)}
  .m-msg.bot{background:#f9fafb;border:1px solid rgba(0,0,0,.06)}
  #mta-sugs{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;border-top:1px solid var(--mta-line);padding:6px;background:#fff}
  #mta-sugs button{border:1px solid var(--mta-line);background:#f6f9ff;padding:7px 10px;border-radius:10px;cursor:pointer;font-weight:700}
  #mta-input{display:flex;gap:8px;padding:10px;border-top:1px solid var(--mta-line);background:#fff}
  #mta-in{flex:1;padding:10px;border-radius:10px;border:1px solid rgba(0,0,0,.12)}
  #mta-send{background:var(--mta-blue);color:#fff;border:none;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer}
  #mta-close{background:none;border:none;font-size:20px;color:var(--mta-blue);cursor:pointer}
  @media(prefers-color-scheme:dark){
    :root{--mta-bg:#1b1c1f; --mta-text:#e9eef6; --mta-line:rgba(255,255,255,.12)}
    #mta-body{background:#1b1c1f}
    .m-msg.bot{background:#23262b;border:1px solid rgba(255,255,255,.08)}
    .m-msg.user{background:#20324a;border:1px solid rgba(0,132,255,.35)}
    #mta-sugs,#mta-input,#mta-header{background:#202226;border-color:var(--mta-line)}
    #mta-in{background:#16181c;color:#eef4ff;border:1px solid rgba(255,255,255,.15)}
    .q{background:#2a2d33;border:1px solid rgba(255,255,255,.12);color:#e9eef6}
  }`;

  function $(s){ return document.querySelector(s); }
  function safe(s){ try{return JSON.parse(s)}catch{return null} }
  const sleep = ms => new Promise(r=>setTimeout(r,ms));

  function injectUI(){
    const wrap = document.createElement('div'); wrap.innerHTML = UI; document.body.appendChild(wrap.firstElementChild);
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  }

  /* ===== Session ===== */
  function addMsg(role,text){
    if(!text) return;
    const el = document.createElement('div'); el.className = 'm-msg '+(role==='user'?'user':'bot'); el.textContent = text;
    $('#mta-body').appendChild(el); $('#mta-body').scrollTop = $('#mta-body').scrollHeight;
    try{
      const arr = safe(localStorage.getItem(K.sess))||[];
      arr.push({role,text,t:Date.now()});
      localStorage.setItem(K.sess, JSON.stringify(arr.slice(-(CFG.keepMessages||10))));
    }catch(e){}
  }
  function renderSess(){
    const body=$('#mta-body'); body.innerHTML='';
    const arr = safe(localStorage.getItem(K.sess))||[];
    if(arr.length) arr.forEach(m=> addMsg(m.role,m.text));
    else addMsg('bot', `Xin chào 👋, em là nhân viên hỗ trợ của ${CFG.brand}. Anh/chị muốn xem 🏍️ Xe số, 🛵 Xe ga, 🔋 Xe điện, 50cc, 📄 Thủ tục hay 🚚 Giao xe?`);
  }

  /* ===== Pricing logic (theo dữ liệu bạn đã cung cấp) ===== */
  const nfVND = n => (n||0).toLocaleString('vi-VN')+'đ';

  // Bảng cơ sở (mức tối thiểu/tối đa)
  const PRICE = {
    'xe số':      { day:[150000,150000], week:[600000,700000], month:[850000,1200000] },
    'xe ga':      { day:[150000,200000], week:[600000,1000000], month:[1100000,2000000] },
    'xe điện':    { day:[170000,170000], week:[800000,800000], month:[1600000,1600000] },
    '50cc':       { day:[200000,200000], week:[800000,800000], month:[1700000,1700000] },
    'xe côn tay': { day:[300000,300000], week:[1200000,1200000], month:[null,null] } // tháng: liên hệ
  };

  function detectType(t){
    const s=(t||'').toLowerCase();
    if(/côn tay|tay côn|côn\b/.test(s)) return 'xe côn tay';
    if(/50cc|xe 50/.test(s)) return '50cc';
    if(/xe điện|vinfast|yadea|dibao|gogo/.test(s)) return 'xe điện';
    if(/xe ga|vision|air\s*blade|lead|vespa|ab\b/.test(s)) return 'xe ga';
    if(/xe số|wave|blade|sirius|jupiter/.test(s)) return 'xe số';
    return null;
  }
  function detectQty(t){
    const m = (t||'').match(/(\d+)\s*(ngày|day|tuần|tuan|week|tháng|thang|month)?/i);
    if(!m) return null;
    const n = parseInt(m[1],10); if(!n||n<=0) return null;
    let unit = 'day';
    if(m[2]){
      if(/tuần|tuan|week/i.test(m[2])) unit='week';
      else if(/tháng|thang|month/i.test(m[2])) unit='month';
    }
    return {n, unit};
  }
  function multRange([lo,hi], n){
    if(lo==null && hi==null) return null;
    const L = (lo==null?null:lo*n), H = (hi==null?null:hi*n);
    return (L!=null&&H!=null)? [L,H] : (L!=null?[L,L]:(H!=null?[H,H]:null));
  }
  function rangeText(r){
    if(!r) return null;
    const [a,b]=r;
    return a===b ? nfVND(a) : (nfVND(a)+'–'+nfVND(b));
  }
  function summariseType(type){
    const it=PRICE[type]; if(!it) return '';
    const d=it.day && rangeText(it.day);
    const w=it.week && rangeText(it.week);
    const m=it.month && (it.month[0]==null&&it.month[1]==null ? 'liên hệ' : rangeText(it.month));
    const bits=[]; if(d) bits.push(d+'/ngày'); if(w) bits.push(w+'/tuần'); if(m) bits.push(m+'/tháng');
    return bits.join(', ');
  }

  function estimate(text){
    const t = detectType(text)||'xe số';
    const q = detectQty(text);
    if(!q){
      return `Anh/chị thuê ${t} trong bao lâu (vd: 1 ngày, 3 ngày, 1 tuần, 1 tháng) để em tính chính xác ạ.`;
    }
    const it = PRICE[t];
    const base = it[q.unit];
    if(!base || (base[0]==null&&base[1]==null)){
      const unitTxt = q.unit==='day'?'ngày':q.unit==='week'?'tuần':'tháng';
      return `Giá ${t} theo ${unitTxt} cần kiểm tra thêm. Anh/chị nhắn Zalo ${CFG.phone} để em báo theo mẫu cụ thể ạ.`;
    }
    const totalRange = multRange(base, q.n);
    const label = q.unit==='day'?`${q.n} ngày`:q.unit==='week'?`${q.n} tuần`:`${q.n} tháng`;
    const priceTxt = rangeText(totalRange);
    return `Ước tính thuê ${t} ${label} khoảng ${priceTxt}. Anh/chị có muốn em gửi ảnh xe đang sẵn để chọn không? (Zalo ${CFG.phone})`;
  }

  /* ===== Tags (8 thanh) ===== */
  const TAGS = [
    {q:'Xe số', label:'🏍️ Xe số'},
    {q:'Xe ga', label:'🛵 Xe ga'},
    {q:'Xe điện', label:'🔋 Xe điện'},
    {q:'50cc', label:'50cc'},
    {q:'Bảng giá', label:'💰 Bảng giá'},
    {q:'Giao xe', label:'🚚 Giao xe'},
    {q:'Thủ tục', label:'📄 Thủ tục'},
    {q:'Liên hệ', label:'☎️ Liên hệ'}
  ];
  function buildTags(){
    const box = $('#mta-sugs'); box.innerHTML='';
    TAGS.forEach(s=>{
      const b=document.createElement('button'); b.type='button'; b.textContent=s.label;
      b.addEventListener('click', ()=>{
        openChat();
        addMsg('user', s.q);
        // Hỏi ngược theo tag
        let follow='';
        if(/xe số/i.test(s.q)) follow='Anh/chị thuê xe số mấy ngày hay mấy tuần ạ?';
        else if(/xe ga/i.test(s.q)) follow='Anh/chị thuê xe ga mấy ngày hay mấy tuần ạ?';
        else if(/xe điện/i.test(s.q)) follow='Anh/chị muốn thuê xe điện trong bao lâu ạ?';
        else if(/50cc/i.test(s.q)) follow='Anh/chị thuê xe 50cc mấy ngày ạ?';
        else if(/bảng giá/i.test(s.q)) follow='Anh/chị muốn xem theo ngày, tuần hay tháng ạ? (vd: xe ga 2 ngày)';
        else if(/giao xe/i.test(s.q)) follow='Bên em giao nội thành 20k–100k tuỳ quận. Thuê 1–4 ngày vui lòng đến địa chỉ để chọn xe, thuê tuần/tháng em sẽ nhận giao. Anh/chị thuê bao lâu ạ?';
        else if(/thủ tục/i.test(s.q)) follow='Thủ tục: 1 giấy tờ + cọc tuỳ xe (xe số 2–3tr, xe ga 2–5tr, 50cc 4tr). Không cọc giấy tờ thì thêm 500k thay giấy tờ. Anh/chị dự định thuê xe nào và bao lâu ạ?';
        else if(/liên hệ/i.test(s.q)) follow=`Anh/chị nhắn Zalo ${CFG.phone} để xem ảnh xe & giữ xe nhanh giúp em nhé.`;
        setTimeout(()=> addMsg('bot', follow), 600);
      });
      box.appendChild(b);
    });
  }

  /* ===== AutoLearn (moto_sitemap.json, sitemap.xml, fallback crawl, + đọc TXT) ===== */
  function loadLearn(){ return safe(localStorage.getItem(K.learn))||{} }
  function saveLearn(o){ try{ localStorage.setItem(K.learn, JSON.stringify(o)); }catch(e){} }
  function nowSec(){ return Math.floor(Date.now()/1000); }
  function expired(ts){ if(!ts) return true; return (nowSec()-ts)/3600 >= CFG.refreshHours; }

  async function fetchText(url){
    const ctl = new AbortController(); const id=setTimeout(()=>ctl.abort(), CFG.fetchTimeoutMs);
    try{
      const res = await fetch(url, {signal:ctl.signal, credentials:'omit', mode:'cors'});
      clearTimeout(id);
      if(!res.ok) return null;
      return await res.text();
    }catch(e){ clearTimeout(id); return null; }
  }
  async function fetchJSON(url){
    const t = await fetchText(url); if(!t) return null;
    try{ return JSON.parse(t); }catch(e){ return null; }
  }
  function parseXML(t){ try{ return (new DOMParser()).parseFromString(t,'text/xml'); }catch(e){ return null; } }
  function parseHTML(t){ try{ return (new DOMParser()).parseFromString(t,'text/html'); }catch(e){ return null; } }

  async function readCustomSitemapJSON(origin){
    // /moto_sitemap.json hoặc /ai_sitemap.json
    const cand = [origin+'/moto_sitemap.json', origin+'/ai_sitemap.json', origin+'/sitemap.json'];
    for(const u of cand){
      const data = await fetchJSON(u);
      if(data && data.categories){
        const pages = (data.categories.pages?.list||[]).filter(Boolean);
        const txts  = (data.categories.datasets?.list||[]).filter(Boolean);
        return {pages, txts};
      }
    }
    return null;
  }
  async function readSitemapXML(url){
    const xml = await fetchText(url); if(!xml) return [];
    const doc = parseXML(xml); if(!doc) return [];
    const sitemaps = Array.from(doc.getElementsByTagName('sitemap')).map(x=> x.getElementsByTagName('loc')[0]?.textContent?.trim()).filter(Boolean);
    let urls=[];
    if(sitemaps.length){
      for(const loc of sitemaps){
        const child = await readSitemapXML(loc);
        urls.push(...child);
      }
      return Array.from(new Set(urls));
    }
    urls = Array.from(doc.getElementsByTagName('url')).map(u=> u.getElementsByTagName('loc')[0]?.textContent?.trim()).filter(Boolean);
    return urls;
  }
  async function fallbackCrawl(origin){
    const start = origin.endsWith('/')?origin:origin+'/';
    const html = await fetchText(start); if(!html) return [start];
    const doc = parseHTML(html); if(!doc) return [start];
    const links = Array.from(doc.querySelectorAll('a[href]')).map(a=>a.getAttribute('href')).filter(Boolean);
    const set = new Set([start]);
    for(const h of links){
      let u; try{ u = new URL(h, start).toString(); }catch(e){ continue; }
      if(u.startsWith(start)) set.add(u.split('#')[0]);
      if(set.size>=40) break;
    }
    return Array.from(set);
  }
  async function pullPages(urls){
    const out=[];
    for(const u of urls.slice(0, CFG.maxPagesPerDomain)){
      const t = await fetchText(u); if(!t) continue;
      let title = (t.match(/<title[^>]*>([^<]+)<\/title>/i)||[])[1]||'';
      title = title.replace(/\s+/g,' ').trim();
      let desc = (t.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"]+)["']/i)||[])[1]||'';
      if(!desc){
        const text = t.replace(/<script[\s\S]*?<\/script>/gi,' ')
                      .replace(/<style[\s\S]*?<\/style>/gi,' ')
                      .replace(/<[^>]+>/g,' ')
                      .replace(/\s+/g,' ')
                      .trim();
        desc = text.slice(0,600);
      }
      out.push({url:u, title, text:desc});
      await sleep(CFG.fetchPauseMs);
    }
    return out;
  }
  async function pullTXTs(urls){
    const out=[];
    for(const u of urls.slice(0, 100)){
      const txt = await fetchText(u); if(!txt) continue;
      const snip = txt.replace(/\s+/g,' ').trim().slice(0,600);
      out.push({url:u, title:u.split('/').pop(), text:snip});
      await sleep(60);
    }
    return out;
  }
  async function learnOrigin(origin){
    try{
      const cache = loadLearn();
      const cached = cache[origin];
      if(cached && cached.pages?.length && !expired(cached.ts)) return cached;

      // 1) custom sitemap json
      let pages=[], txts=[];
      const smj = await readCustomSitemapJSON(origin);
      if(smj){
        pages = smj.pages||[];
        txts  = smj.txts ||[];
      } else {
        // 2) sitemap.xml / sitemap_index.xml
        const cands=[origin+'/sitemap.xml', origin+'/sitemap_index.xml'];
        for(const c of cands){
          const urls = await readSitemapXML(c);
          if(urls && urls.length){ pages = urls; break; }
        }
        // 3) fallback crawl
        if(!pages.length) pages = await fallbackCrawl(origin);
      }

      // Lấy HTML
      const htmlPages = await pullPages(pages);
      // Lấy TXT (ưu tiên /du-lieu/*.txt nếu chưa có)
      if(!txts.length){
        // đoán sẵn folder /du-lieu/
        txts = [
          origin + '/du-lieu/thuengay.txt',
          origin + '/du-lieu/tuan.txt',
          origin + '/du-lieu/thang.txt',
          origin + '/du-lieu/thutuc.txt',
          origin + '/du-lieu/dieukien.txt',
          origin + '/du-lieu/giaoxenmay.txt'
        ];
      }
      const txtPages = await pullTXTs(txts);

      const pagesAll = [...htmlPages, ...txtPages].slice(0, CFG.maxTotalPages);
      const data = {domain:origin, ts:nowSec(), pages:pagesAll};
      cache[origin] = data; saveLearn(cache);
      return data;
    }catch(e){ return null; }
  }

  /* ===== Tiny Retrieval (dựa vào index đã học) ===== */
  function getIndexFlat(){
    const cache = loadLearn(); const out=[];
    Object.keys(cache).forEach(dom=>{
      (cache[dom].pages||[]).forEach(pg=> out.push(Object.assign({domain:dom}, pg)));
    });
    return out;
  }
  function tk(s){ return (s||'').toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu,' ').split(/\s+/).filter(Boolean); }
  function searchIndex(query,k=3){
    const idx = getIndexFlat(); const qtok = tk(query); if(!qtok.length) return [];
    return idx.map(it=>{
      const txt = ((it.title||'')+' '+(it.text||'')+' '+(it.url||'')).toLowerCase();
      let score=0; qtok.forEach(t=>{ if(txt.includes(t)) score++; });
      return Object.assign({score}, it);
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,k);
  }

  /* ===== Compose ===== */
  const HELLO = [
    "Xin chào 👋, em là nhân viên hỗ trợ.",
    "Em sẵn sàng hỗ trợ báo giá & thủ tục.",
    "Anh/chị cần thuê loại xe nào và trong bao lâu ạ?"
  ];
  function pick(a){ return a[Math.floor(Math.random()*a.length)]; }

  function route(q){
    const s=q.toLowerCase();
    // Liên hệ
    if(/(liên hệ|zalo|gọi|hotline|sđt|sdt)/i.test(q)) {
      return `Anh/chị nhắn Zalo ${CFG.phone} hoặc gọi trực tiếp ${CFG.phone} để em giữ xe nhé.`;
    }
    // Thủ tục
    if(/(thủ tục|giấy tờ|cọc|đặt cọc|cccd|passport)/i.test(q)){
      return "Thủ tục nhanh: 1 giấy tờ + tiền cọc theo xe (xe số 2–3tr, xe ga 2–5tr, 50cc 4tr). Không cọc giấy tờ thì thêm 500k thay giấy tờ.";
    }
    // Giao xe
    if(/(giao xe|ship xe|đem xe)/i.test(q)){
      return "Giao xe nội thành từ 20k–100k tuỳ quận. Thuê 1–4 ngày: vui lòng đến cửa hàng để chọn xe. Thuê tuần/tháng: bên em nhận giao tận nơi.";
    }
    // Bảng giá (gọn, không liệt kê hàng loạt)
    if(/(bảng giá|bang gia)/i.test(q)){
      return `Giá tham khảo: xe số ${summariseType('xe số')}. Anh/chị nói rõ loại xe và thời gian (vd: xe ga 2 ngày) để em tính chính xác.`;
    }

    // Có số ngày/tuần/tháng => tính luôn
    const qty = detectQty(q);
    const type = detectType(q);
    if(qty || type) return estimate(q);

    // Không rõ => thử retrieval
    const hits = searchIndex(q, 3);
    if(hits.length){
      const lines = hits.map(h=>`• ${(h.title||h.url||'').slice(0,80)} — ${(h.text||'').slice(0,120)}…`);
      return `Em tìm thấy vài nội dung liên quan:\n${lines.join('\n')}\nAnh/chị hỏi cụ thể (vd: xe ga 3 ngày) để em báo ngay.`;
    }

    // Mặc định: hỏi thêm
    return pick(HELLO);
  }

  /* ===== Open/Close/Send ===== */
  let isOpen=false, sending=false;

  function openChat(){
    if(isOpen) return;
    $('#mta-card').classList.add('open');
    $('#mta-backdrop').classList.add('show');
    $('#mta-bubble').style.display='none';
    isOpen=true; renderSess();
    setTimeout(()=>{ try{$('#mta-in').focus()}catch{} }, 140);
  }
  function closeChat(){
    if(!isOpen) return;
    $('#mta-card').classList.remove('open');
    $('#mta-backdrop').classList.remove('show');
    $('#mta-bubble').style.display='flex';
    isOpen=false;
  }

  async function sendUser(text){
    if(sending) return; sending=true;
    const v=(text||'').trim(); if(!v){ sending=false; return; }
    addMsg('user', v);

    // giả lập gõ: 3.5–6.0s
    const wait = 3500 + Math.random()*2500;
    await sleep(wait);

    let ans;
    try{ ans = route(v); }catch(e){ ans = "Xin lỗi, có lỗi khi trả lời. Anh/chị nhắn Zalo giúp em nhé."; }
    addMsg('bot', ans);
    sending=false;
  }

  /* ===== Boot & Events ===== */
  document.addEventListener('DOMContentLoaded', async ()=>{
    injectUI(); buildTags();
    // Nút
    $('#mta-bubble').addEventListener('click', openChat);
    $('#mta-backdrop').addEventListener('click', closeChat);
    $('#mta-close').addEventListener('click', closeChat);
    $('#mta-send').addEventListener('click', ()=>{ const v=$('#mta-in').value.trim(); if(!v) return; $('#mta-in').value=''; sendUser(v); });
    $('#mta-in').addEventListener('keydown', e=>{
      if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); const v=$('#mta-in').value.trim(); if(!v) return; $('#mta-in').value=''; sendUser(v); }
    });

    // AutoLearn từ origin hiện tại
    const origin = location.origin.replace(/\/+$/,'');
    try{ await learnOrigin(origin); }catch(e){}
  });

})();
