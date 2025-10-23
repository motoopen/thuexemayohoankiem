/* PART 1/3 of 3 — motoai_embed_v11_5_3_selflearn_full_left_safe_ui_patch.js (compact, ready-to-run)
   Paste PART 2/3 then PART 3/3 below this section to complete the file.
*/
(function(){
  if(window.MotoAI_v11_5_3_LOADED) return;
  window.MotoAI_v11_5_3_LOADED = true;
  const LOG = (...a)=>{ try{ console.log('[MotoAI v11.5.3]',...a); }catch(e){} };

  // ---------- AUTO-INIT ----------
  const MAX_RETRY = 40, RETRY_DELAY = 200;
  let retryCount = 0;
  if(!window.MotoAI_INIT_STARTED) window.MotoAI_INIT_STARTED = false;
  function waitForBodyAndInit(){
    try{
      if(document && document.body && document.body.clientHeight>0){
        if(window.MotoAI_INIT_STARTED) return;
        window.MotoAI_INIT_STARTED = true;
        LOG('Body ready — init MotoAI v11.5.3');
        setTimeout(initMotoAI,80);
        return;
      }
    }catch(e){ LOG('body check error',e); }
    retryCount++;
    if(retryCount<=MAX_RETRY) setTimeout(waitForBodyAndInit, RETRY_DELAY + retryCount*20);
    else LOG('Body not ready — aborting init.');
  }
  if(document.readyState==='complete' || document.readyState==='interactive') setTimeout(waitForBodyAndInit,60);
  else window.addEventListener('load', waitForBodyAndInit, {once:true});

  // ---------- MAIN INIT (PART 1: UI + STATE) ----------
  function initMotoAI(){
    if(document.getElementById('motoai-root')) { LOG('Already injected'); return; }
    LOG('Injecting MotoAI v11.5.3 UI & logic');

    const CFG = {
      version:'11.5.3-pro-selflearn',
      placement:'left',
      safeLeftOffset:28,
      maxCorpusSentences:1600,
      minSentenceLen:12,
      embedNgram:3,
      minScoreThreshold:0.06,
      maxSavedMessages:300,
      contextSize:4,
      suggestionTags:[
        {q:'Xe số',label:'🏍 Xe số'},
        {q:'Xe ga',label:'🛵 Xe ga'},
        {q:'Xe 50cc',label:'🚲 Xe 50cc'},
        {q:'Thủ tục',label:'📄 Thủ tục'}
      ],
      corpusKey:'MotoAI_v11_5_3_corpus_v1',
      sessionKey:'MotoAI_v11_5_3_session_v1',
      memoryKey:'MotoAI_v11_5_3_memory_v1',
      externalCorpusPath:'/moto_corpus.txt'
    };

    const html = '<div id="motoai-root" data-placement="'+CFG.placement+'" aria-hidden="false">'+
      '<div id="motoai-bubble" role="button" aria-label="Mở MotoAI" title="Mở MotoAI">🤖</div>'+
      '<div id="motoai-overlay" aria-hidden="true">'+
        '<div id="motoai-card" role="dialog" aria-modal="true" aria-hidden="true">'+
          '<div id="motoai-handle" aria-hidden="true"></div>'+
          '<header id="motoai-header"><div class="title">MotoAI Assistant</div><div class="tools">'+
            '<button id="motoai-clear" title="Xóa hội thoại">🗑</button><button id="motoai-close" title="Đóng">✕</button>'+
          '</div></header>'+
          '<main id="motoai-body" tabindex="0" role="log" aria-live="polite">'+
            '<div class="m-msg bot">👋 Xin chào! Mình là MotoAI — trợ lý thuê xe Hoàn Kiếm. Bạn muốn thuê xe số, xe ga hay xe 50cc ạ?</div>'+
          '</main>'+
          '<div id="motoai-suggestions" role="toolbar" aria-label="Gợi ý nhanh"></div>'+
          '<footer id="motoai-footer"><div id="motoai-typing" aria-hidden="true"></div>'+
            '<input id="motoai-input" placeholder="Nhập câu hỏi..." autocomplete="off" aria-label="Nhập câu hỏi" />'+
            '<button id="motoai-send" aria-label="Gửi">Gửi</button>'+
          '</footer>'+
        '</div>'+
      '</div>'+
    '</div>';
    document.body.insertAdjacentHTML('beforeend', html);

    const css = ':root{--m15-accent:#007aff;--m15-radius:16px;--m15-card-bg:rgba(255,255,255,0.94);--m15-blur:blur(10px) saturate(140%);--m15-vh:1vh}'+
    '#motoai-root{position:fixed;bottom:18px;z-index:2147483000;pointer-events:none;left:16px}'+
    '#motoai-root[data-placement="left"]{left:16px}#motoai-root[data-placement="right"]{right:16px;left:auto}'+
    '#motoai-bubble{pointer-events:auto;width:56px;height:56px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px;background:var(--m15-accent);color:#fff;cursor:pointer;box-shadow:0 10px 28px rgba(2,6,23,0.18);transition:transform .12s;user-select:none}'+
    '#motoai-bubble:active{transform:scale(.96)}'+
    '#motoai-overlay{position:fixed;inset:0;display:flex;align-items:flex-end;justify-content:center;padding:12px;pointer-events:none;transition:background .24s,padding-bottom .2s;z-index:2147482999}'+
    '#motoai-overlay.visible{background:rgba(0,0,0,0.18);pointer-events:auto}'+
    '#motoai-card{width:min(920px,calc(100% - 36px));max-width:920px;height:calc(var(--m15-vh,1vh)*72);min-height:320px;border-radius:var(--m15-radius) var(--m15-radius) 12px 12px;background:var(--m15-card-bg);backdrop-filter:var(--m15-blur);-webkit-backdrop-filter:var(--m15-blur);box-shadow:0 -18px 60px rgba(0,0,0,.22);display:flex;flex-direction:column;overflow:hidden;transform:translateY(110%);opacity:0;pointer-events:auto;transition:transform .36s cubic-bezier(.2,.9,.2,1),opacity .28s}'+
    '#motoai-overlay.visible #motoai-card{transform:translateY(0);opacity:1}#motoai-handle{width:64px;height:6px;background:rgba(160,160,160,.6);border-radius:6px;margin:10px auto}'+
    '#motoai-header{display:flex;align-items:center;justify-content:space-between;padding:8px 14px;font-weight:700;color:var(--m15-accent);border-bottom:1px solid rgba(0,0,0,0.06)}'+
    '#motoai-header .tools button{background:none;border:none;font-size:18px;cursor:pointer;padding:6px 8px;color:#888}'+
    '#motoai-body{flex:1;overflow:auto;padding:12px 16px;font-size:15px;-webkit-overflow-scrolling:touch}'+
    '.m-msg{margin:8px 0;padding:12px 14px;border-radius:16px;max-width:86%;line-height:1.4;word-break:break-word;box-shadow:0 4px 8px rgba(0,0,0,0.06)}'+
    '.m-msg.bot{background:rgba(255,255,255,.96);color:#111}.m-msg.user{background:linear-gradient(180deg,var(--m15-accent),#00b6ff);color:#fff;margin-left:auto}'+
    '#motoai-suggestions{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:8px 12px;border-top:1px solid rgba(0,0,0,0.04);background:rgba(255,255,255,0.6)}'+
    '#motoai-suggestions button{border:none;background:rgba(0,122,255,0.08);color:var(--m15-accent);padding:8px 12px;border-radius:12px;cursor:pointer;font-weight:600}'+
    '#motoai-footer{position:sticky;bottom:0;display:flex;align-items:center;padding:10px 12px;border-top:1px solid rgba(0,0,0,0.06);background:rgba(255,255,255,0.96);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:2}'+
    '#motoai-typing{width:0;height:20px;display:flex;align-items:center;justify-content:center;font-size:14px;color:rgba(0,0,0,0.5);transition:width .2s ease,margin-right .2s ease;overflow:hidden}'+
    '#motoai-typing span{width:6px;height:6px;background:rgba(0,0,0,0.3);border-radius:50%;margin:0 2px;animation:m15-dot 1.4s infinite}'+
    '@keyframes m15-dot{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}'+
    '#motoai-input{flex:1;min-width:0;padding:11px 12px;border-radius:14px;border:1px solid rgba(0,0,0,0.08);font-size:15px;background:rgba(255,255,255,0.9)}'+
    '#motoai-send{background:var(--m15-accent);color:#fff;border:none;border-radius:14px;padding:10px 16px;font-weight:700;cursor:pointer;margin-left:6px;box-shadow:0 2px 6px rgba(0,0,0,0.12)}'+
    'body.motoai-modal-open{overflow:hidden!important;touch-action:none!important}'+
    '@media (prefers-color-scheme:dark){#motoai-card{background:rgba(18,18,20,0.94)}#motoai-header{color:#fff;border-bottom:1px solid rgba(255,255,255,0.06)}.m-msg.bot{background:#2b2b2d;color:#eee}#motoai-footer{background:rgba(8,8,8,0.6);border-top:1px solid rgba(255,255,255,0.06)}#motoai-input{background:#2b2b2d;color:#fff;border:1px solid rgba(255,255,255,0.06)}}'+
    '@media (max-width:600px){#motoai-overlay{padding:0;align-items:flex-end}#motoai-card{width:100%;max-width:100%;height:calc(var(--m15-vh,1vh)*100 - 28px);max-height:calc(var(--m15-vh,1vh)*100 - 28px);min-height:200px;border-radius:var(--m15-radius) var(--m15-radius) 0 0;transform:translateY(100%)}#motoai-overlay.visible #motoai-card{transform:translateY(0)}}';

    const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

    // ELEMENTS
    const $root=document.getElementById('motoai-root');
    const $bubble=document.getElementById('motoai-bubble');
    const $overlay=document.getElementById('motoai-overlay');
    const $card=document.getElementById('motoai-card');
    const $body=document.getElementById('motoai-body');
    const $suggestions=document.getElementById('motoai-suggestions');
    const $typing=document.getElementById('motoai-typing');
    const $input=document.getElementById('motoai-input');
    const $send=document.getElementById('motoai-send');
    const $clear=document.getElementById('motoai-clear');
    const $close=document.getElementById('motoai-close');
    const $footer=document.getElementById('motoai-footer');

    // STATE
    let corpus=[]; let chatHistory=[]; let memory={}; let isCardOpen=false; let contextHistory=[]; let debugOpen=false;
    let corpusReady=false; let lastCorpusBuild=0; let rebuildDebounceTimer=null;

    // SAFE localStorage helpers
    function safeSetItem(k,v){ try{ localStorage.setItem(k,v); return true;}catch(e){ LOG('ls set failed',e&&e.message); try{ localStorage.removeItem(CFG.sessionKey); localStorage.setItem(k,v); return true;}catch(err){return false;} } }
    function safeGetItem(k){ try{ return localStorage.getItem(k);}catch(e){ return null; } }
    function safeRemoveItem(k){ try{ localStorage.removeItem(k);}catch(e){} }

    /* END OF PART 1/3 - continue with PART 2/3 (AI logic, embeddings, corpus build, external fetch) */
})();
/* PART 2/3 of 3 — motoai_embed_v11_5_3_selflearn_full_left_safe_ui_patch.js (compact, ready-to-run)
   Paste this directly after PART 1/3. Do NOT add or remove braces — PART 3/3 will finish the file.
*/

/* ---------- AI core: normalization, embeddings, similarity ---------- */
function normalizeTextForTokens(text){ return String(text||'').toLowerCase().replace(/[^\wÀ-ỹ0-9\s]/g,' ').replace(/\s+/g,' ').trim(); }
function generateEmbeddings(text){
  const map = new Map(), clean = normalizeTextForTokens(text);
  if(!clean) return map;
  const words = clean.split(' ').filter(w=>w.length>2);
  for(let i=0;i<words.length;i++){
    for(let n=1;n<=CFG.embedNgram && i+n<=words.length;n++){
      const token = words.slice(i,i+n).join(' ');
      map.set(token,(map.get(token)||0)+1);
    }
  }
  return map;
}
function dotProduct(a,b){ let s=0; for(const [k,v] of a) if(b.has(k)) s += v * b.get(k); return s; }
function magnitude(m){ let s=0; for(const v of m.values()) s += v*v; return Math.sqrt(s); }
function cosineSimilarity(a,b){ const ma=magnitude(a), mb=magnitude(b); if(ma===0||mb===0) return 0; return dotProduct(a,b)/(ma*mb); }

/* ---------- Synonyms + rental-focused intent ---------- */
const SYNONYMS = {'xe tay ga':['xe ga','tay ga'],'xe số':['côn tay','xe côn'],'giá':['bao nhiêu','mấy tiền','giá cả'],'thuê':['thuê xe','thuê'],'bền':['độ bền','chất lượng']};
function applySynonyms(q){
  const norm = normalizeTextForTokens(q), tokens = norm.split(' ').filter(Boolean), set=new Set(tokens);
  for(const [canon,arr] of Object.entries(SYNONYMS)){
    for(const s of arr) if(norm.includes(s)) canon.split(' ').forEach(t=>set.add(t));
    if(norm.includes(canon)) arr.forEach(s=>s.split(' ').forEach(t=>set.add(t)));
  }
  return Array.from(set).join(' ');
}
function detectIntent(q){
  const t = q.toLowerCase();
  if(/\b(giá thuê|giá|bao nhiêu|mấy tiền|mức giá|thuê|đơn giá)\b/.test(t)) return 'rental_price';
  if(/\b(thủ tục|giấy tờ|cọc|đặt cọc|đặt trước|hồ sơ|hợp đồng)\b/.test(t)) return 'procedure';
  if(/\b(thuê xe số|xe số|côn tay|số)\b/.test(t)) return 'rent_manual';
  if(/\b(thuê xe ga|xe ga|tay ga)\b/.test(t)) return 'rent_auto';
  if(/\b(50cc|xe 50|50 cc)\b/.test(t)) return 'rent_50cc';
  if(/\b(so sánh|so với|khác nhau|so sanh)\b/.test(t)) return 'compare';
  if(/\b(chào|hello)\b/.test(t)) return 'greeting';
  if(/\b(cảm ơn|thanks)\b/.test(t)) return 'thanks';
  return 'unknown';
}

/* ---------- Corpus build / merge external optional file ---------- */
function mergeExternalCorpusText(txt){
  try{
    if(!txt) return;
    const lines = txt.split(/\r?\n/);
    for(const ln of lines){
      const s = ln.trim();
      if(s.length >= CFG.minSentenceLen && !corpus.find(c=>c.text===s)){
        corpus.push({ text: s, vec: generateEmbeddings(s) });
      }
    }
    LOG('Merged external corpus lines');
    corpusReady = true;
  }catch(e){ LOG('mergeExternalCorpusText err', e); }
}

function buildCorpus(force){
  LOG('Building corpus... force=' + !!force);
  try{
    const now = Date.now();
    if(!force && (now - lastCorpusBuild) < 2000){ LOG('Skipping rebuild (debounced)'); return; }
    const set = new Set();
    const all = document.body ? document.body.innerText : '';
    if(!all){ LOG('No body text'); corpus=[]; corpusReady=true; lastCorpusBuild=Date.now(); try{ safeSetItem(CFG.corpusKey, JSON.stringify(corpus)); }catch(e){}; return; }
    const lines = all.split(/[\n\r]+/);
    for(const line of lines){
      const cleaned = line.trim();
      if(!cleaned) continue;
      const segs = cleaned.split(/[.!?]+/) || [];
      for(const s of segs){ const clean = s.trim(); if(clean.length >= CFG.minSentenceLen) set.add(clean); }
    }
    // seed from suggestions
    (CFG.suggestionTags||[]).forEach(t=>{ if(t.q && t.q.length>=CFG.minSentenceLen) set.add(t.q); });
    const arr = Array.from(set).slice(0, CFG.maxCorpusSentences);
    corpus = arr.map(t=>({ text: t, vec: generateEmbeddings(t) }));
    // try external corpus file (optional)
    if(CFG.externalCorpusPath){
      fetch(CFG.externalCorpusPath, { cache:'no-store' }).then(r=>{
        if(!r.ok) throw new Error('no external corpus');
        return r.text();
      }).then(txt=>{
        mergeExternalCorpusText(txt);
        try{ safeSetItem(CFG.corpusKey, JSON.stringify(corpus)); }catch(e){}
      }).catch(e=>{
        LOG('external corpus not found or error', e && e.message);
        try{ safeSetItem(CFG.corpusKey, JSON.stringify(corpus)); }catch(e){}
        corpusReady = true;
      });
    } else {
      try{ safeSetItem(CFG.corpusKey, JSON.stringify(corpus)); }catch(e){}
      corpusReady = true;
    }
    lastCorpusBuild = Date.now();
    LOG('Corpus built size:', corpus.length);
  }catch(e){ console.error('buildCorpus err', e); corpusReady = !!(corpus && corpus.length); lastCorpusBuild = Date.now(); }
}

/* ---------- Find best match ---------- */
function findBestMatch(q){
  if(!corpus || corpus.length===0) return null;
  let expanded = applySynonyms(q);
  if(contextHistory.length) expanded += ' ' + contextHistory.join(' ');
  const qvec = generateEmbeddings(expanded);
  if(qvec.size === 0) return null;
  let best = -1, bestText = null;
  for(const it of corpus){
    const ivel = it.vec || generateEmbeddings(it.text);
    if(!it.vec) it.vec = ivel;
    if(ivel.size === 0) continue;
    const sc = cosineSimilarity(qvec, ivel);
    if(sc > best){ best = sc; bestText = it.text; }
  }
  return best > CFG.minScoreThreshold ? { text: bestText, score: best } : null;
}

/* ---------- Persistence helpers (load/save) ---------- */
function loadData(){
  try{ const mem = safeGetItem(CFG.memoryKey); if(mem) memory = JSON.parse(mem); }catch(e){ LOG('load memory err', e); }
  try{ const sess = safeGetItem(CFG.sessionKey); if(sess){ chatHistory = JSON.parse(sess)||[]; if(chatHistory.length>0){ $body.innerHTML=''; chatHistory.forEach(m=>addMessage(m.sender,m.text,true)); } } }catch(e){ LOG('load session err', e); }
  try{
    const stored = safeGetItem(CFG.corpusKey);
    if(stored){
      corpus = JSON.parse(stored);
      if(Array.isArray(corpus) && corpus.length>0 && !corpus[0].vec){
        LOG('Rebuilding cached corpus vectors');
        corpus.forEach(it=>it.vec = generateEmbeddings(it.text));
        try{ safeSetItem(CFG.corpusKey, JSON.stringify(corpus)); }catch(e){}
      }
      corpusReady = true;
    } else {
      corpusReady = false;
    }
  }catch(e){ LOG('load corpus err', e); corpusReady = false; setTimeout(()=>buildCorpus(true), 900); }
}
function saveSession(){ try{ safeSetItem(CFG.sessionKey, JSON.stringify(chatHistory.slice(-CFG.maxSavedMessages))); }catch(e){ LOG('saveSession err', e); } }
function saveMemory(){ try{ safeSetItem(CFG.memoryKey, JSON.stringify(memory)); }catch(e){ LOG('saveMemory err', e); } }

/* ---------- addMessage / autoScroll / typing ---------- */
function autoScroll(){ try{ requestAnimationFrame(()=>{ $body.scrollTop = $body.scrollHeight; }); }catch(e){ try{ $body.scrollTop = $body.scrollHeight; }catch(err){} } }
function setTyping(t){ if(t){ $typing.innerHTML = '<span></span><span></span><span></span>'; $typing.style.width='42px'; $typing.style.marginRight='6px'; } else { $typing.innerHTML=''; $typing.style.width='0px'; $typing.style.marginRight='0px'; } }
function addMessage(sender,text,noSave){
  try{
    const d=document.createElement('div'); d.className='m-msg '+sender; d.textContent = text; $body.appendChild(d);
    requestAnimationFrame(()=>autoScroll());
    if(!noSave){ chatHistory.push({ sender, text, ts: Date.now() }); saveSession(); }
  }catch(e){ console.error('addMessage err', e); }
}

/* ---------- Memory name extractor ---------- */
function handleMemoryText(q){
  const m = q.match(/(?:tôi là|tên tôi là) ([A-Za-zÀ-ỹ ]+)/iu);
  if(m && m[1]){ memory.userName = m[1].trim(); saveMemory(); return `Chào ${memory.userName}! Rất vui được gặp bạn. Bạn cần tư vấn về xe gì?`; }
  return null;
}

/* ---------- Compose response (rental tuned) ---------- */
function composeResponse(raw){
  const q = String(raw||'').trim();
  if(!q) return null;
  rememberContext(q);
  if(!corpusReady || !corpus || corpus.length===0) return '⏳ Mình đang nạp dữ liệu trang, bạn chờ vài giây rồi hỏi lại nhé!';
  const mem = handleMemoryText(q.toLowerCase()); if(mem) return mem;
  const intent = detectIntent(q); const match = findBestMatch(q);
  if(match){
    if(intent==='rental_price') return `${match.text} (Tham khảo: giá có thể thay đổi theo ngày và theo xe.)`;
    if(intent==='compare') return `Mình tìm được: ${match.text}. Bạn muốn mình so sánh mẫu khác không?`;
    if(intent==='rent_manual' || intent==='rent_auto' || intent==='rent_50cc') return match.text;
    return match.text;
  }
  if(intent==='rental_price') return 'Giá thuê xe dao động: xe số ~100k/ngày, xe ga 120k-180k/ngày; có thể thay đổi theo thời điểm.';
  if(intent==='procedure') return 'Thủ tục: CCCD/CMND gốc + cọc (tùy nơi) hoặc để lại giấy tờ, một số chỗ chấp nhận không cọc nếu khách sạn giữ hộ.';
  if(intent==='rent_manual') return 'Xe số (thuê): Wave, Sirius, giá ~100k/ngày.';
  if(intent==='rent_auto') return 'Xe ga (thuê): Vision, Lead, Air Blade, giá 120k-180k/ngày.';
  if(intent==='rent_50cc') return 'Xe 50cc cho người chưa có bằng lái, giá ~120k/ngày.';
  if(intent==='greeting') return memory.userName ? `Chào ${memory.userName}! Mình giúp gì cho bạn?` : 'Chào bạn! Mình là MotoAI, trợ lý thuê xe — bạn cần thuê xe số, xe ga hay xe 50cc?';
  if(intent==='thanks') return 'Không có gì! Mình giúp gì tiếp theo?';
  if(contextHistory.length) return `Ý bạn có liên quan tới: "${contextHistory[contextHistory.length-1]}" chứ? Bạn muốn hỏi rõ hơn điều gì?`;
  return 'Mình chưa hiểu lắm — bạn thử hỏi "giá thuê", "thủ tục", hoặc "xe ga/xe số" nhé!';
}

/* ---------- End of PART 2/3. Paste PART 3/3 next to finish events, observer, startup, API and close function/IIFE ---------- */

/* PART 3/3 of 3 — motoai_embed_v11_5_3_selflearn_full_left_safe_ui_patch.js
   Paste this directly after PART 2/3 to complete the file.
*/

/* ---------- Context + Events + Safe UI ---------- */
function rememberContext(q){ if(!q) return; contextHistory.push(q); if(contextHistory.length>CFG.contextSize) contextHistory.shift(); }

function applySafePositioning(){
  try{
    const fixed = detectLeftFixedZones(); const base={left:16,bottom:18};
    if(!fixed||fixed.length===0){ $root.style.left=base.left+'px'; $root.style.bottom=base.bottom+'px'; return; }
    let maxBottom=0;
    for(const r of fixed){ if(r.bottom >= (window.innerHeight - 140)) maxBottom=Math.max(maxBottom,(window.innerHeight - r.top)); }
    const left = base.left + CFG.safeLeftOffset;
    const bottom = maxBottom>0 ? Math.min(220, base.bottom+maxBottom) : base.bottom;
    $root.style.left = left+'px'; $root.style.bottom = bottom+'px';
  }catch(e){ LOG('safePos err', e); }
}
function detectLeftFixedZones(){
  try{
    const els=Array.from(document.querySelectorAll('body *')), rects=[];
    for(const el of els){
      const st=window.getComputedStyle(el);
      if(!st||st.visibility==='hidden'||st.display==='none') continue;
      if(st.position==='fixed'||st.position==='sticky'){
        const r=el.getBoundingClientRect();
        if(r.width<8||r.height<8) continue;
        if(r.left<=160||Math.abs(r.left)<2||r.right<=160) rects.push(r);
      }
    }
    return rects;
  }catch(e){ return []; }
}

/* ---------- Handle keyboard/viewport ---------- */
function debounce(fn,wait){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn.apply(this,a),wait)}}
function onViewportChange(){
  try{
    const vh=window.innerHeight*0.01;
    document.documentElement.style.setProperty('--m15-vh',`${vh}px`);
    if(isCardOpen && window.visualViewport){
      const v=window.visualViewport;
      const keyboardHeight=Math.max(0,window.innerHeight - v.height);
      const basePadding=(window.innerWidth<=600)?0:12;
      $overlay.style.paddingBottom=`${basePadding+keyboardHeight}px`;
      setTimeout(()=>{try{$footer.scrollIntoView({behavior:'smooth',block:'end'})}catch(e){}},60);
    }else $overlay.style.paddingBottom='';
    autoScroll();
  }catch(e){LOG('viewportChange err',e);}
}
const debouncedViewport=debounce(onViewportChange,70);
if(window.visualViewport){
  window.visualViewport.addEventListener('resize',debouncedViewport);
  window.visualViewport.addEventListener('scroll',debouncedViewport);
}
window.addEventListener('resize',debouncedViewport);
$input.addEventListener('focus',()=>{document.body.classList.add('motoai-modal-open');setTimeout(()=>{$footer.scrollIntoView({behavior:'smooth',block:'end'})},100)});
$input.addEventListener('blur',()=>{document.body.classList.remove('motoai-modal-open')});

/* ---------- User Input ---------- */
async function handleUserInput(){
  const q=($input.value||'').trim(); if(!q) return;
  addMessage('user',q);
  $input.value='';$input.disabled=true;$send.disabled=true;setTyping(true);
  try{
    await new Promise(r=>setTimeout(r,300+Math.random()*400));
    const resp=composeResponse(q);
    addMessage('bot',resp||'Mình chưa tìm thấy thông tin phù hợp — bạn thử diễn đạt khác nhé.');
  }catch(e){LOG('handleInput err',e); addMessage('bot','Mình gặp lỗi nhỏ khi xử lý — thử lại nhé.');}
  finally{
    setTyping(false);
    $input.disabled=false;$send.disabled=false;
    try{$input.focus({preventScroll:true});setTimeout(()=>{$footer.scrollIntoView({behavior:'smooth',block:'end'})},60);}catch(e){}
  }
}

/* ---------- Toggle / Clear ---------- */
function toggleCard(show){
  isCardOpen=(typeof show==='boolean')?show:!isCardOpen;
  $overlay.classList.toggle('visible',isCardOpen);
  $overlay.setAttribute('aria-hidden',!isCardOpen);
  $card.setAttribute('aria-hidden',!isCardOpen);
  if(isCardOpen){
    document.body.classList.add('motoai-modal-open');
    applySafePositioning(); setTyping(false);
    setTimeout(()=>{$input.focus({preventScroll:true});$footer.scrollIntoView({behavior:'smooth',block:'end'})},200);
  }else{
    document.body.classList.remove('motoai-modal-open');
    $overlay.style.paddingBottom='';$card.style.maxHeight='';
  }
}
function handleClear(){
  chatHistory=[]; safeRemoveItem(CFG.sessionKey);
  $body.innerHTML='';
  const g=memory.userName?`Chào ${memory.userName}! Bạn cần hỗ trợ gì thêm không?`:'Chào bạn! Mình là MotoAI, mình giúp gì cho bạn?';
  addMessage('bot',g,true);
}

/* ---------- Debug Overlay ---------- */
let debugEl=null;
function createDebugOverlay(){
  if(debugEl) return;
  debugEl=document.createElement('div');
  Object.assign(debugEl.style,{position:'fixed',right:'12px',top:'12px',zIndex:2147484000,background:'rgba(0,0,0,.7)',color:'#fff',padding:'10px',borderRadius:'8px',maxWidth:'380px',fontSize:'13px',display:'none'});
  debugEl.innerHTML='<b>MotoAI Debug</b><pre id="motoai-debug-pre" style="white-space:pre-wrap"></pre>';
  document.body.appendChild(debugEl);
}
function toggleDebugOverlay(){if(!debugEl)createDebugOverlay();debugOpen=!debugOpen;debugEl.style.display=debugOpen?'block':'none';if(debugOpen)updateDebug();}
function updateDebug(){
  if(!debugEl) return;
  const p=debugEl.querySelector('#motoai-debug-pre');
  const info={ver:CFG.version,corpus:corpus.length,context:contextHistory,mem:Object.keys(memory)};
  p.textContent=JSON.stringify(info,null,2);
}

/* ---------- Init events ---------- */
function initEvents(){
  $bubble.addEventListener('click',e=>{if(e.altKey){toggleDebugOverlay();return;}toggleCard(true);});
  $close.addEventListener('click',()=>toggleCard(false));
  $clear.addEventListener('click',handleClear);
  $send.addEventListener('click',handleUserInput);
  $input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleUserInput();}});
  $overlay.addEventListener('click',e=>{if(e.target===$overlay)toggleCard(false);});
  $suggestions.addEventListener('click',e=>{if(e.target.tagName==='BUTTON'){$input.value=e.target.dataset.query||'';setTimeout(handleUserInput,50);}});
  const t=setInterval(applySafePositioning,2000);setTimeout(()=>clearInterval(t),60000);
}

/* ---------- Render suggestions ---------- */
function renderSuggestions(){
  $suggestions.innerHTML='';
  (CFG.suggestionTags||[]).forEach(t=>{const b=document.createElement('button');b.textContent=t.label;b.dataset.query=t.q;$suggestions.appendChild(b);});
}

/* ---------- Startup ---------- */
function startUp(){
  renderSuggestions(); loadData(); initEvents(); applySafePositioning();
  if(!corpusReady) setTimeout(()=>buildCorpus(true),800);
  if(chatHistory.length===0){
    $body.innerHTML='';
    const g=memory.userName?`Chào ${memory.userName}! Bạn sẵn sàng thuê xe chưa?`:'👋 Xin chào! Mình là MotoAI — trợ lý thuê xe tại Hoàn Kiếm. Bạn muốn thuê xe số, xe ga hay 50cc?';
    addMessage('bot',g,true);
  }
  LOG('MotoAI v11.5.3 ready ✅');
}

/* ---------- Public API ---------- */
window.MotoAI_v11_5_3={
  cfg:CFG,
  open:()=>toggleCard(true),
  close:()=>toggleCard(false),
  rebuildCorpus:(f)=>buildCorpus(f),
  debug:toggleDebugOverlay,
  getCorpusSize:()=>corpus.length,
  getSession:()=>chatHistory.slice(),
  setMemory:(m)=>{memory=Object.assign(memory||{},m);saveMemory();}
};

/* ---------- Start ---------- */
startUp();
})(); // END FILE ✅
