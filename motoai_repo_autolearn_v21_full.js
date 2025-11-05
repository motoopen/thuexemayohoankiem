/* =========================================================
 * MotoAI v21 UI100 — giữ nguyên UI/UX cũ, nâng “não” mới
 * - Đọc moto_sitemap.json (HTML + TXT + MD + JSON)
 * - AutoLearn 72h, hỏi lại khi chưa hiểu
 * - Trả lời ngắn gọn (không liệt kê bảng giá)
 * - Tính giá theo ngày/tuần/tháng (Vision có quy tắc riêng)
 * - Lưu hội thoại & tự xoá sau 3 ngày
 * - Chạy 100% client-side, 1 dòng nhúng
 * © 2025 Motoopen — Nguyễn Tú
 * =========================================================
 */
(function(){
  if (window.MotoAI_v21_UI100_LOADED) return; window.MotoAI_v21_UI100_LOADED = true;

  // ===== CẤU HÌNH CỐ ĐỊNH (không cần nhúng config) =====
  const CFG = {
    brand: "AI Assistant",
    phone: "0942467674",
    zalo:  "https://zalo.me/0942467674",
    whatsapp: "https://wa.me/84942467674",
    map: "https://maps.app.goo.gl/2icTBTxAToyvKTE78",

    // đọc sitemap mở rộng
    sitemapUrl: "https://motoopen.github.io/thuexemayohoankiem/moto_sitemap.json",

    minSentenceLen: 22,
    maxItems: 2000,

    // học lại dữ liệu sau 72h
    refreshHours: 72,

    // xoá hội thoại sau 3 ngày
    sessionDays: 3
  };
  const HOSTKEY = (location.host||"site").replace(/[^a-z0-9.-]/gi,"_");

  // ===== KHÓA LƯU TRỮ =====
  const K = {
    corpus: `MotoAI_v21_${HOSTKEY}_corpus`,
    learned: `MotoAI_v21_${HOSTKEY}_learnedAt`,
    sess:   `MotoAI_v21_${HOSTKEY}_session`
  };

  // ===== UTIL =====
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const now = ()=>Date.now();
  const hoursSince = t => (now() - (t||0))/36e5;
  const daysSince  = t => (now() - (t||0))/(24*3600*1000);

  const stripHTML = html => (html||"")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi,"")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi,"")
    .replace(/<[^>]+>/g," ")
    .replace(/\s+/g," ").trim();

  const normalize = s => (s||"").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9\sđ]/g," ").replace(/\s+/g," ").trim();

  // ===== UI (UI100 gốc) =====
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

  // ===== BOOT UI =====
  function injectUI(){
    if ($('#mta-root')) return;
    const wrap = document.createElement('div'); wrap.innerHTML = ui; document.body.appendChild(wrap.firstElementChild);
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  }
  function setVH(){
    if (window.visualViewport) {
      const vh = window.visualViewport.height * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    } else {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
  }

  // ===== STATE + STORAGE =====
  let sending=false;
  function addMsg(role,text){
    if(!text) return;
    const el = document.createElement('div'); el.className = 'm-msg '+(role==='user'?'user':'bot'); el.textContent = text;
    $('#mta-body').appendChild(el); $('#mta-body').scrollTop = $('#mta-body').scrollHeight;
    try{
      const arr = JSON.parse(localStorage.getItem(K.sess)||'[]');
      arr.push({role,text,t:Date.now()});
      // cắt bớt
      localStorage.setItem(K.sess, JSON.stringify(arr.slice(-200)));
    }catch(e){}
  }
  function renderSess(){
    const body = $('#mta-body'); body.innerHTML='';
    const arr = JSON.parse(localStorage.getItem(K.sess)||'[]');
    // xoá hội thoại quá 3 ngày
    const keep = arr.filter(m => daysSince(m.t||now()) <= CFG.sessionDays);
    if (keep.length !== arr.length) localStorage.setItem(K.sess, JSON.stringify(keep));
    if(keep.length){ keep.forEach(m=> addMsg(m.role,m.text)); }
    else addMsg('bot', 'Chào bạn 👋 Mình là trợ lý Nguyễn Tú. Bạn muốn xem 💰 Bảng giá nhanh, ⚙️ Thủ tục, hay 🏍️ Chọn xe phù hợp ạ?');
  }

  // ===== GỢI Ý =====
  const SUGS = [
    {q:'Bảng giá', label:'💰 Bảng giá'},
    {q:'Thủ tục thuê xe', label:'⚙️ Thủ tục'},
    {q:'Thuê Vision 2 ngày', label:'🏍️ Vision 2 ngày'},
    {q:'Liên hệ', label:'☎️ Liên hệ'}
  ];
  function buildSugs(){
    const box=$('#mta-sugs'); box.innerHTML='';
    SUGS.forEach(s=>{
      const b=document.createElement('button'); b.type='button'; b.textContent=s.label;
      b.addEventListener('click',()=>{ if($('#mta-card').getAttribute('aria-hidden')==='true') openChat(); setTimeout(()=> sendUser(s.q),80); });
      box.appendChild(b);
    });
  }

  // ===== TYPING =====
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

  // ===== MỞ/ĐÓNG =====
  function openChat(){
    $('#mta-card').classList.add('open');
    $('#mta-backdrop').classList.add('show');
    $('#mta-bubble').style.display='none';
    $('#mta-card').setAttribute('aria-hidden','false');
    renderSess();
    setTimeout(()=>{ try{$('#mta-in').focus()}catch(e){} },120);
  }
  function closeChat(){
    $('#mta-card').classList.remove('open');
    $('#mta-backdrop').classList.remove('show');
    $('#mta-bubble').style.display='flex';
    $('#mta-card').setAttribute('aria-hidden','true');
    hideTyping();
  }
  function clearChat(){
    try{ localStorage.removeItem(K.sess); }catch(e){}
    $('#mta-body').innerHTML=''; addMsg('bot','Đã xoá hội thoại trong máy của bạn.');
  }

  // ===== HỌC DỮ LIỆU TỪ SITEMAP =====
  async function fetchTextOrHtml(url){
    try{
      const r=await fetch(url,{cache:'no-store'}); if(!r.ok) return '';
      const ct=(r.headers.get('content-type')||'').toLowerCase();
      if(ct.includes('text/plain') || /\.txt(\?|$)/.test(url) || /\.md(\?|$)/.test(url)){
        return (await r.text());
      }
      if(ct.includes('application/json') || /\.json(\?|$)/.test(url)){
        try{ const j=await r.json(); return JSON.stringify(j); }catch(e){ return await r.text(); }
      }
      // HTML
      const html=await r.text(); return stripHTML(html);
    }catch(e){ return ''; }
  }

  async function learnFromSitemap(){
    addMsg('bot','⏳ Đang nạp nội dung từ website...');
    let links=[];
    try{
      const res=await fetch(CFG.sitemapUrl,{cache:'no-store'});
      const js=await res.json();
      links = Object.values(js.categories||{}).flatMap(c=>Array.isArray(c.list)?c.list:[]);
    }catch(e){
      // fallback vài trang cơ bản
      links = [
        "https://motoopen.github.io/thuexemayohoankiem/",
        "https://motoopen.github.io/thuexemayohoankiem/ngay.html",
        "https://motoopen.github.io/thuexemayohoankiem/tuan.html",
        "https://motoopen.github.io/thuexemayohoankiem/thang.html",
        "https://motoopen.github.io/thuexemayohoankiem/thutuc.html"
      ];
    }

    const texts=[];
    for(const u of links.slice(0, CFG.maxItems)){
      try{
        const t = await fetchTextOrHtml(u);
        if(t && t.trim().length >= CFG.minSentenceLen) texts.push(t);
        await sleep(180);
      }catch(e){}
    }
    const corpus = texts.join("\n\n");
    localStorage.setItem(K.corpus, JSON.stringify(corpus));
    localStorage.setItem(K.learned, String(now()));
    addMsg('bot','✅ Đã nạp dữ liệu xong. Bạn hỏi gì mình hỗ trợ ngay!');
    return corpus;
  }

  async function ensureCorpus(){
    const last = parseInt(localStorage.getItem(K.learned)||'0',10)||0;
    const cache = localStorage.getItem(K.corpus);
    if(cache && last && hoursSince(last) < CFG.refreshHours){
      return JSON.parse(cache);
    }
    return await learnFromSitemap();
  }

  // ===== HIỂU Ý & TÍNH GIÁ =====
  function detectDuration(text){
    const t=normalize(text);
    if(/thang|30 ?ngay|month/.test(t)) return {unit:"month",value:1};
    if(/tuan|7 ?ngay|week/.test(t)) return {unit:"week",value:1};
    const m=t.match(/(\d+)\s*ngay/); if(m) return {unit:"day",value:+m[1]};
    if(/ngay/.test(t)) return {unit:"day",value:1};
    return null;
  }
  function detectVehicle(text){
    const t=normalize(text);
    if(/vision/.test(t)) return "vision";
    if(/wave|future|blade|sirius|dream|jupiter/.test(t)) return "xe so";
    if(/lead|air|sh|vespa|grande|janus|att|ga/.test(t)) return "xe ga";
    if(/exciter|winner|con|tay|raider|cbf|cb150r|w175|msx/.test(t)) return "xe con tay";
    if(/dien|klara|yadea|dibao|mbigo|evo/.test(t)) return "xe dien";
    if(/50 ?cc/.test(t)) return "xe 50cc";
    return null;
  }
  function formatMoney(v){ return (Math.round(v/1000)*1000).toLocaleString('vi-VN')+'đ'; }

  function estimatePrice(vehicle, dur){
    // Đơn giá nền (tham chiếu) — nói ngắn gọn, không liệt kê bảng
    const base = {
      "vision":200000,     // Vision: 200k/ngày, 3+ ngày ~170–180k/ngày
      "xe so":150000,      // xe số phổ thông
      "xe ga":180000,      // ga phổ thông (Lead/AirBlade… sẽ dao động)
      "xe dien":170000,    // điện
      "xe con tay":350000, // côn tay trung bình
      "xe 50cc":200000
    }[vehicle] || 180000;

    if(!dur){
      if(vehicle==="vision")
        return `Vision đi 1 ngày khoảng ${formatMoney(200000)}; từ 3 ngày còn tầm 170–180k/ngày. Bạn dự định mấy ngày ạ?`;
      return `Giá ${vehicle||'xe'} trung bình khoảng ${formatMoney(base)} / ngày. Bạn thuê mấy ngày để mình chốt giá gọn cho bạn?`;
    }

    // Quy tắc giảm giá
    if(dur.unit==="day"){
      let per = base;
      if(vehicle==="vision" && dur.value>=3) per = 175000; // 170–180k/ngày, chọn 175k làm mốc
      let total = per * dur.value;
      if(vehicle!=="vision" && dur.value>=3) total *= 0.9; // giảm 10% cho 3+ ngày các xe khác
      return `Thuê ${vehicle||'xe'} ${dur.value} ngày khoảng ${formatMoney(total)} tổng. Giao tận nơi miễn phí quanh Hoàn Kiếm.`;
    }
    if(dur.unit==="week"){
      let weekly;
      if(vehicle==="vision") weekly = 7*175000*0.95; // thêm ưu đãi nhẹ
      else if(vehicle==="xe con tay") weekly = 1200000; // mốc tuần côn tay (từ nội dung bạn cung cấp)
      else if(vehicle==="xe dien") weekly = 800000;
      else weekly = 7*base*0.8;
      return `Gói tuần cho ${vehicle||'xe'} khoảng ${formatMoney(weekly)} / tuần. Đi tuần sẽ rẻ hơn thuê lẻ từng ngày.`;
    }
    if(dur.unit==="month"){
      let monthly;
      if(vehicle==="vision") monthly = 30*175000*0.65;
      else if(vehicle==="xe 50cc") monthly = 1700000;
      else if(vehicle==="xe dien") monthly = 1600000;
      else if(vehicle==="xe so") monthly = 1000000; // 850k–1.2tr lấy mốc giữa
      else if(vehicle==="xe ga") monthly = 1500000; // 1.1–2tr lấy mốc giữa
      else monthly = 30*base*0.6;
      return `Thuê tháng ${vehicle||'xe'} khoảng ${formatMoney(monthly)} / tháng. Thuê dài hạn sẽ rẻ hơn nhiều so với thuê ngày.`;
    }
    return `Giá ${vehicle||'xe'} tuỳ thời gian. Bạn nói cụ thể mấy ngày/tuần/tháng để mình báo chính xác nhé.`;
  }

  function findFromCorpus(q, corpus){
    if(!corpus) return null;
    const lines = corpus.split(/\n+/).filter(x=>x.length>50);
    const key = normalize(q).split(' ')[0];
    return lines.find(l => normalize(l).includes(key)) || null;
  }

  async function composeAnswer(q, corpus){
    const txt = normalize(q);
    const veh = detectVehicle(txt);
    const dur = detectDuration(txt);

    // Hỏi giá -> trả lời ngắn gọn, không liệt kê
    if(veh || /gia|bao nhieu|bang gia|gia thue/.test(txt) || dur){
      return estimatePrice(veh||'xe ga', dur||null);
    }
    // Thủ tục
    if(/thu tuc|dat coc|giay to|cccd|ho chieu|bang lai/.test(txt)){
      return 'Thủ tục gọn: chỉ cần CCCD hoặc hộ chiếu, cọc tuỳ xe. Giao tận nơi 15 phút quanh Hoàn Kiếm. Bạn thuê xe gì và mấy ngày để mình giữ xe?';
    }
    // Liên hệ
    if(/lien he|zalo|so dien thoai|dia chi|o dau/.test(txt)){
      return 'Bạn liên hệ nhanh Zalo 0942 467 674 hoặc ghé 114 Nguyễn Văn Cừ – Long Biên. Bọn mình giao xe miễn phí quanh Hoàn Kiếm.';
    }
    // Tìm từ corpus học được
    const from = findFromCorpus(q, corpus);
    if(from) return from.slice(0, 320) + '…';

    // Hỏi lại nếu chưa hiểu
    return 'Mình chưa rõ nhu cầu của bạn. Bạn nói giúp: muốn thuê xe gì (Vision/xe số/xe ga/điện) và thời gian mấy ngày/tuần/tháng ạ?';
  }

  // ===== GỬI TIN =====
  async function sendUser(text){
    if(sending) return; sending=true;
    addMsg('user', text); showTyping();
    try{
      const cache = localStorage.getItem(K.corpus);
      const last  = parseInt(localStorage.getItem(K.learned)||'0',10)||0;
      let corpus = cache && last && hoursSince(last) < CFG.refreshHours ? JSON.parse(cache) : null;
      if(!corpus) corpus = await learnFromSitemap();
      const ans = await composeAnswer(text, corpus);
      hideTyping(); addMsg('bot', ans);
    }catch(e){
      hideTyping(); addMsg('bot', 'Xin lỗi, có lỗi khi trả lời. Bạn thử lại giúp mình nhé.');
    }
    sending=false;
  }

  // ===== SỰ KIỆN KHỞI ĐỘNG =====
  function ready(fn){
    if(document.readyState==="complete"||document.readyState==="interactive"){ fn(); }
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(async ()=>{
    injectUI(); setVH(); buildSugs();

    // bind
    $('#mta-bubble').addEventListener('click', ()=>{ openChat(); });
    $('#mta-backdrop').addEventListener('click', closeChat);
    $('#mta-close').addEventListener('click', closeChat);
    $('#mta-clear').addEventListener('click', clearChat);
    $('#mta-send').addEventListener('click', ()=>{ const v=($('#mta-in').value||'').trim(); if(!v) return; $('#mta-in').value=''; sendUser(v); });
    $('#mta-in').addEventListener('keydown',(e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); const v=($('#mta-in').value||'').trim(); if(!v) return; $('#mta-in').value=''; sendUser(v); }});

    window.addEventListener('resize', setVH);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', setVH);

    // mở lần đầu
    $('#mta-card').setAttribute('aria-hidden','true');
    renderSess();

    // auto-học lần đầu nếu chưa có
    const last = parseInt(localStorage.getItem(K.learned)||'0',10)||0;
    const cache = localStorage.getItem(K.corpus);
    if(!cache || !last || hoursSince(last) >= CFG.refreshHours){
      // nạp nền (không chặn UI)
      learnFromSitemap();
    }
  });

})();
