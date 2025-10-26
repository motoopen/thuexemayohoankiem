(function(){
  if (window.MotoAI_v20_LOADED) return; window.MotoAI_v20_LOADED = true;

  // ===== CONFIG =====
  const DEF = {
    brand: "AI Assistant",
    phone: "0942467674",
    zalo:  "https://zalo.me/0942467674",
    whatsapp: "https://wa.me/84942467674",
    map: "https://maps.app.goo.gl/2icTBTxAToyvKTE78",
    sitemapCandidates: ["/moto_sitemap.json","/ai_sitemap.json","/sitemap.json"],
    minSentenceLen: 22,
    maxItems: 1200,
    maxInternalPages: 20,
    refreshHours: 24,
    sessionDays: 7
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

  // ===== UI (UI100 compact, dark-ready, no blur, slide-up) =====
  const ui = `
  <div id="mta-root" aria-live="polite">
    <button id="mta-bubble" aria-label="Mở chat" title="Chat">
      <!-- Messenger-like bubble -->
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
    // expire sessions > sessionDays
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

  // ===== BUILD CORPUS =====
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
      console.log('📚 v20: DOM corpus =', corpus.length);
    }catch(e){ console.warn(e); }
  }

  // ===== LEARN (sitemap + internal) =====
  async function fetchTextOrHtml(url){
    try{
      const r=await fetch(url,{cache:'no-store'}); if(!r.ok) return '';
      const ct=(r.headers.get('content-type')||'').toLowerCase();
      if(ct.includes('text/plain')) return await r.text();
      const html=await r.text(); const tmp=document.createElement('div'); tmp.innerHTML=html;
      const nodes=tmp.querySelectorAll('p,h1,h2,h3,li');
      return Array.from(nodes).map(n=>(n.textContent||'').trim()).filter(t=>t.length>=CFG.minSentenceLen).join('\n');
    }catch(e){ return ''; }
  }
  async function discoverSitemaps(){
    const urls = uniq(CFG.sitemapCandidates.map(u=> u.startsWith('http')?u:(location.origin+u)));
    const found=[];
    for(const u of urls){
      try{
        const r=await fetch(u,{cache:'no-store'}); if(!r.ok) continue;
        const ct=(r.headers.get('content-type')||'').toLowerCase();
        if(ct.includes('json') || u.endsWith('.json')) found.push(u);
        else { const t=await r.text(); try{ JSON.parse(t); found.push(u);}catch(e){} }
      }catch(e){}
    }
    return found;
  }
  async function learnFromSitemaps(maps){
    let list=[];
    for(const s of maps){
      try{ const r=await fetch(s,{cache:'no-store'}); if(!r.ok) continue; const data=await r.json(); if(Array.isArray(data.pages)) list=list.concat(data.pages); }catch(e){}
    }
    list=uniq(list).slice(0,CFG.maxItems*2);
    let added=0;
    for(const p of list){
      const txt = await fetchTextOrHtml(p); if(!txt) continue;
      const lines = txt.split(/\n+/).map(x=>x.trim()).filter(x=>x.length>=CFG.minSentenceLen);
      for(const l of lines){
        if(!ext.includes(l)){ ext.push(l); added++; }
        if(ext.length>=CFG.maxItems) break;
      }
      if(ext.length>=CFG.maxItems) break;
      await sleep(60);
    }
    if(added){ save(); console.log(`🧠 Sitemap learn +${added}, ext=${ext.length}`); }
  }
  function internalLinks(){
    const list = $$('a[href]').map(a=>a.getAttribute('href')).filter(Boolean)
      .map(h=>{ try{ return new URL(h,location.href).href }catch(e){ return null }})
      .filter(Boolean).filter(u=>u.startsWith(location.origin))
      .filter(u=>!/\.(png|jpe?g|gif|webp|svg|pdf|zip|rar|7z|mp4|mp3|ico)(\?|$)/i.test(u))
      .filter(u=>!u.includes('#')).filter(u=>u!==location.href);
    return uniq(list).slice(0,CFG.maxInternalPages);
  }
  async function learnInternal(){
    const pages = internalLinks(); if(!pages.length) return;
    let added=0;
    for(const url of pages){
      const txt = await fetchTextOrHtml(url); if(!txt) continue;
      const lines = txt.split(/\n+/).map(x=>x.trim()).filter(x=>x.length>=CFG.minSentenceLen);
      for(const l of lines){
        if(!ext.includes(l)){ ext.push(l); added++; }
        if(ext.length>=CFG.maxItems) break;
      }
      if(ext.length>=CFG.maxItems) break;
      await sleep(180);
    }
    if(added){ save(); console.log(`✅ Internal learn +${added}, ext=${ext.length}`); }
  }
  async function checkAndLearn(){
    const maps = await discoverSitemaps();
    if(!maps.length){ await learnInternal(); return; }
    let combined='';
    for(const s of maps){ try{ const r=await fetch(s,{cache:'no-store'}); if(!r.ok) continue; combined+=await r.text(); }catch(e){} }
    const h = hashText(combined);
    const old = localStorage.getItem(K.mapH)||'';
    if(h!==old){ localStorage.setItem(K.mapH,h); await learnFromSitemaps(maps); }
    else { await learnInternal(); }
  }
  async function schedule(force=false){
    const now=Date.now(); const last=parseInt(localStorage.getItem(K.last)||'0',10)||0;
    const need = force || !last || (now-last) > CFG.refreshHours*3600*1000;
    if(!need) return;
    await checkAndLearn(); localStorage.setItem(K.last,String(Date.now()));
  }

  // ===== ANSWER COMPOSER =====
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
    {re:/(bảng giá|gia|giá|bao nhiêu|bang gia)/i, ans:[
      "đây là mục Bảng giá. Bạn nói rõ sản phẩm/dịch vụ để mình báo chi tiết.",
      "bạn cần mức giá theo ngày/tuần/tháng hay theo gói dịch vụ?"
    ]},
    {re:/(dịch vụ|dich vu|service)/i, ans:[
      "bọn mình có nhiều gói dịch vụ. Bạn mô tả nhu cầu để mình gợi ý gói phù hợp.",
      "bạn muốn hỗ trợ giao nhận, bảo dưỡng hay tư vấn lựa chọn sản phẩm?"
    ]},
    {re:/(sản phẩm|san pham|xe ga|xe số|xe so|50cc|vision|lead|air blade|vespa|winner|exciter)/i, ans:[
      "bạn cho mình biết nhu cầu sử dụng (đi phố, đi xa, tiết kiệm xăng…) để mình tư vấn phù hợp.",
      "mình có thể tóm tắt ưu/nhược điểm từng mẫu để bạn so sánh nhanh."
    ]},
    {re:/(liên hệ|lien he|zalo|hotline|sđt|sdt|gọi|dien thoai)/i, ans:[
      `bạn liên hệ nhanh qua 📞 ${CFG.phone} hoặc Zalo để được tư vấn trực tiếp.`,
      `nếu cần gấp, bạn gọi ${CFG.phone} — mình phản hồi ngay.`
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
  function compose(q){
    const m=(q||'').trim(); if(!m) return polite("bạn thử bấm gợi ý: 💰 Bảng giá, ⚙️ Dịch vụ, 🏍️ Sản phẩm hoặc ☎️ Liên hệ");
    const r1=rule(m); if(r1) return r1;
    const r2=retrieve(m); if(r2) return r2;
    return polite("mình chưa tìm được thông tin trùng khớp. Bạn mô tả cụ thể hơn giúp mình với");
  }

  // ===== OPEN/CLOSE =====
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

  // ===== SEND (typing delay tự nhiên 1.8–4.8s tuỳ câu) =====
  async function sendUser(text){
    if(sending) return; sending=true;
    addMsg('user', text); showTyping();
    const base = 1800 + Math.random()*1800;
    const extra = Math.min(2000, Math.max(0, (text||'').length*25)); // dài -> chờ lâu hơn chút
    await sleep(base + extra*0.3);
    let ans; try{ ans = compose(text); }catch(e){ ans = null; }
    hideTyping(); addMsg('bot', ans || polite('xin lỗi, có lỗi khi trả lời. Bạn thử lại giúp mình'));
    sending=false;
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
    // Bind
    $('#mta-bubble').addEventListener('click', ()=>{ buildFromDOM(); openChat(); });
    $('#mta-backdrop').addEventListener('click', closeChat);
    $('#mta-close').addEventListener('click', closeChat);
    $('#mta-clear').addEventListener('click', clearChat);
    $('#mta-send').addEventListener('click', ()=>{ const v=($('#mta-in').value||'').trim(); if(!v) return; $('#mta-in').value=''; sendUser(v); });
    $('#mta-in').addEventListener('keydown',(e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); const v=($('#mta-in').value||'').trim(); if(!v) return; $('#mta-in').value=''; sendUser(v); }});

    // Mobile keyboard safe height
    setVH();
    window.addEventListener('resize', setVH);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', setVH);

    // Auto-learn (nhẹ, mỗi 24h hoặc khi sitemap đổi)
    schedule(false); setInterval(()=> schedule(false), 6*60*60*1000);

    // Watchdog
    setTimeout(()=>{ if(!$('#mta-bubble')) injectUI(); }, 2000);
  });

  // ===== EXPOSE =====
  window.MotoAI_v20 = {
    open: openChat, close: closeChat, learnNow: ()=>schedule(true),
    getCorpus: ()=>({dom: (corpus||[]).slice(0,200), ext:(ext||[]).slice(0,200)}),
    clearCorpus: ()=>{ corpus=[]; ext=[]; save(); console.log('🧹 Cleared corpus'); },
    version: 'v20-ui100-compact'
  };
})();
