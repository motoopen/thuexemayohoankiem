/*!
  MotoAI v11.3 PRO (Full, Left + SafeZone) - Developer Edition
  - Smart Context + Synonym Mapping + Intent Detection
  - Runtime fixes (safe localStorage, typing finally, stable scroll)
  - SafeZone detector (avoid left fixed QuickCall / TOC)
  - Auto-init safe for iPhone/Safari (body clientHeight check)
  - No external APIs; all processing in-browser (corpus-based retrieval)
  - By: MotoOpen (2025) — embed-ready
*/

(function () {
  // ---------------------------
  // PREVENT DOUBLE LOAD & LOG
  // ---------------------------
  if (window.MotoAI_v11_3_FULL_LEFT_SAFE_LOADED) return;
  window.MotoAI_v11_3_FULL_LEFT_SAFE_LOADED = true;

  const LOG = (...args) => {
    try { console.log('[MotoAI v11.3]', ...args); } catch (e) {}
  };

  LOG('Booting MotoAI v11.3 PRO (Full Left Safe)');

  // ---------------------------
  // AUTO-INIT + BODY READINESS
  // ---------------------------
  const MAX_RETRY = 30;
  const RETRY_DELAY = 240;
  const SAFE_LEFT_OFFSET = 30; // px offset to avoid left fixed elements
  let retryCount = 0;

  if (!window.MotoAI_INIT_STARTED) window.MotoAI_INIT_STARTED = false;

  function waitForBodyAndInit() {
    try {
      if (document && document.body && document.body.clientHeight > 0) {
        if (window.MotoAI_INIT_STARTED) {
          LOG('Init already started.');
          return;
        }
        window.MotoAI_INIT_STARTED = true;
        LOG('✅ Body ready — initializing MotoAI v11.3...');
        setTimeout(initMotoAI, 120);
        return;
      }
    } catch (e) {
      LOG('Body check error:', e);
    }
    retryCount++;
    if (retryCount <= MAX_RETRY) {
      LOG(`⏳ Waiting for body... retry ${retryCount}/${MAX_RETRY}`);
      setTimeout(waitForBodyAndInit, RETRY_DELAY + (retryCount * 20));
    } else {
      LOG('❌ Body not ready — aborting.');
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(waitForBodyAndInit, 80);
  } else {
    window.addEventListener('load', waitForBodyAndInit, { once: true });
  }

  // ---------------------------
  // MAIN INIT (core)
  // ---------------------------
  function initMotoAI() {
    // Avoid duplicate injection
    if (document.getElementById('motoai-root')) {
      LOG('Already injected - aborting.');
      return;
    }

    LOG('Injecting MotoAI UI...');

    // ---------------------------
    // CONFIG
    // ---------------------------
    const CFG = {
      version: '11.3-pro',
      placement: 'left',
      safeLeftOffset: SAFE_LEFT_OFFSET,
      maxCorpusSentences: 1200,
      minSentenceLen: 14,
      suggestionTags: [
        { q: 'Xe số', label: '🏍 Xe số' },
        { q: 'Xe ga', label: '🛵 Xe ga' },
        { q: 'Xe 50cc', label: '🚲 Xe 50cc' },
        { q: 'Thủ tục', label: '📄 Thủ tục' }
      ],
      corpusKey: 'MotoAI_v11_3_corpus_v1',
      sessionKey: 'MotoAI_v11_3_session_v1',
      memoryKey: 'MotoAI_v11_3_memory_v1',
      embedNgram: 3,
      minScoreThreshold: 0.06,
      maxSavedMessages: 300,
      contextSize: 3 // how many previous user queries to remember
    };

    // ---------------------------
    // SAFEZONE DETECTION FUNCTIONS
    // ---------------------------
    function detectLeftFixedZones() {
      try {
        const nodes = Array.from(document.querySelectorAll('body *'));
        const rects = [];
        for (const el of nodes) {
          const st = window.getComputedStyle(el);
          if (!st || (st.visibility === 'hidden') || (st.display === 'none')) continue;
          if (st.position === 'fixed' || st.position === 'sticky') {
            const r = el.getBoundingClientRect();
            if (r.width < 8 || r.height < 8) continue;
            // consider if near left portion of screen
            if (r.left <= 160 || parseFloat(st.left) === 0 || parseFloat(st.right) > (window.innerWidth - 160)) {
              rects.push(r);
            }
          }
        }
        return rects;
      } catch (e) {
        LOG('detectLeftFixedZones error', e);
        return [];
      }
    }

    function computeSafePositions() {
      const fixedRects = detectLeftFixedZones();
      const base = { left: 16, bottom: 18 };
      if (!fixedRects || fixedRects.length === 0) return base;

      // If any fixed element occupies bottom-left area, we lift the bubble and nudge right
      let maxBottomOccupy = 0;
      for (const r of fixedRects) {
        if (r.bottom >= (window.innerHeight - 140)) {
          maxBottomOccupy = Math.max(maxBottomOccupy, (window.innerHeight - r.top));
        }
      }
      const newLeft = base.left + CFG.safeLeftOffset;
      const newBottom = maxBottomOccupy > 0 ? Math.min(200, 18 + maxBottomOccupy) : base.bottom;
      return { left: newLeft, bottom: newBottom };
    }

    // ---------------------------
    // HTML Injection
    // ---------------------------
    const html = `
      <div id="motoai-root" data-placement="${CFG.placement}">
        <div id="motoai-bubble" role="button" aria-label="Mở MotoAI" title="Mở MotoAI">🤖</div>

        <div id="motoai-overlay" aria-hidden="true">
          <div id="motoai-card" role="dialog" aria-modal="true" aria-hidden="true">
            <div id="motoai-handle" aria-hidden="true"></div>

            <header id="motoai-header">
              <div class="title">MotoAI Assistant</div>
              <div class="tools">
                <button id="motoai-clear" title="Xóa hội thoại">🗑</button>
                <button id="motoai-close" title="Đóng">✕</button>
              </div>
            </header>

            <main id="motoai-body" tabindex="0" role="log" aria-live="polite">
              <div class="m-msg bot">👋 Chào bạn! Mình là MotoAI — hỏi thử “Xe ga”, “Xe số”, “Xe 50cc”, hoặc “Thủ tục” nhé!</div>
            </main>

            <div id="motoai-suggestions" role="toolbar" aria-label="Gợi ý nhanh"></div>

            <footer id="motoai-footer">
              <div id="motoai-typing" aria-hidden="true"></div>
              <input id="motoai-input" placeholder="Nhập câu hỏi..." autocomplete="off" aria-label="Nhập câu hỏi" />
              <button id="motoai-send" aria-label="Gửi">Gửi</button>
            </footer>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);

    // ---------------------------
    // CSS Injection
    // ---------------------------
    const css = `
      :root{
        --m11-accent:#007aff; --m11-radius:18px; --m11-card-bg:rgba(255,255,255,0.92);
        --m11-card-bg-dark:rgba(26,26,28,0.94); --m11-blur: blur(12px) saturate(140%);
        --m11-vh: 1vh;
      }
      #motoai-root { position: fixed; bottom: 18px; z-index: 2147483000; pointer-events: none; left:16px; }
      #motoai-root[data-placement="left"] { left: 16px; }
      #motoai-root[data-placement="right"] { right: 16px; left: auto; }

      #motoai-bubble { pointer-events: auto; width:56px; height:56px; border-radius:14px;
        display:flex;align-items:center;justify-content:center;font-size:26px;background:var(--m11-accent);
        color:#fff;cursor:pointer;box-shadow:0 10px 28px rgba(2,6,23,0.18); transition: transform .12s ease; user-select:none; }
      #motoai-bubble:active { transform: scale(0.96); }

      #motoai-overlay { position: fixed; inset: 0; display:flex; align-items:flex-end; justify-content:center; padding:12px; pointer-events:none; transition: background .24s ease, padding-bottom .2s ease-out; z-index:2147482999;}
      #motoai-overlay.visible { background: rgba(0,0,0,0.18); pointer-events: auto; }
      #motoai-card { width:min(920px, calc(100% - 36px)); max-width:920px; height:calc(var(--m11-vh,1vh)*72); min-height:320px;
        border-radius: var(--m11-radius) var(--m11-radius) 12px 12px; background:var(--m11-card-bg); backdrop-filter:var(--m11-blur);
        -webkit-backdrop-filter:var(--m11-blur); box-shadow:0 -18px 60px rgba(0,0,0,.22); display:flex; flex-direction:column; overflow:hidden;
        transform:translateY(110%); opacity:0; pointer-events:auto; transition: transform .36s cubic-bezier(.2,.9,.2,1), opacity .28s ease; }
      #motoai-overlay.visible #motoai-card { transform: translateY(0); opacity:1; }

      #motoai-header { display:flex; align-items:center; justify-content:space-between; padding:8px 14px; font-weight:700; color:var(--m11-accent); border-bottom:1px solid rgba(0,0,0,0.06); }
      #motoai-header .tools button { background:none; border:none; font-size:18px; cursor:pointer; padding:6px 8px; color:#888; }

      #motoai-body { flex:1; overflow:auto; padding:12px 16px; font-size:15px; -webkit-overflow-scrolling: touch; }
      .m-msg { margin:8px 0; padding:12px 14px; border-radius:16px; max-width:86%; line-height:1.4; word-break:break-word; box-shadow:0 4px 8px rgba(0,0,0,0.06); }
      .m-msg.bot { background: rgba(255,255,255,0.95); color:#111; }
      .m-msg.user { background: linear-gradient(180deg,var(--m11-accent),#00b6ff); color:#fff; margin-left:auto; }

      #motoai-suggestions { display:flex; gap:8px; justify-content:center; flex-wrap:wrap; padding:8px 12px; border-top:1px solid rgba(0,0,0,0.04); }
      #motoai-suggestions button { border:none; background: rgba(0,122,255,0.08); color:var(--m11-accent); padding:8px 12px; border-radius:12px; cursor:pointer; font-weight:600; }

      #motoai-footer { display:flex; align-items:center; padding:10px 12px; border-top:1px solid rgba(0,0,0,0.06); background: rgba(255,255,255,0.9); }
      #motoai-typing { width:0; height:20px; display:flex; align-items:center; justify-content:center; font-size:14px; color: rgba(0,0,0,0.5); transition: width .2s ease, margin-right .2s ease; overflow:hidden; }
      #motoai-typing span { width:6px; height:6px; background:rgba(0,0,0,0.3); border-radius:50%; margin:0 2px; animation:m11-dot 1.4s infinite; }
      @keyframes m11-dot { 0%,80%,100%{transform:scale(0);} 40%{transform:scale(1);} }

      #motoai-input { flex:1; min-width:0; padding:11px 12px; border-radius:16px; border:1px solid rgba(0,0,0,0.08); font-size:15px; background:rgba(255,255,255,0.88); }
      #motoai-send { background:var(--m11-accent); color:#fff; border:none; border-radius:14px; padding:10px 16px; font-weight:700; cursor:pointer; margin-left:6px; box-shadow:0 2px 6px rgba(0,0,0,0.12); }

      @media (prefers-color-scheme: dark) {
        #motoai-card { background: var(--m11-card-bg-dark); }
        #motoai-header { color:#fff; border-bottom:1px solid rgba(255,255,255,0.08); }
        .m-msg.bot { background:#2c2c2e; color:#eee; }
        #motoai-suggestions { background: rgba(0,0,0,0.2); }
        #motoai-footer { background: rgba(0,0,0,0.3); }
        #motoai-input { background:#2c2c2e; color:#fff; }
      }

      @media (max-width:600px) {
        #motoai-overlay { padding:0; align-items:flex-end; }
        #motoai-card { width:100%; max-width:100%; height: calc(var(--m11-vh,1vh) * 100 - 28px); max-height: calc(var(--m11-vh,1vh) * 100 - 28px); min-height:200px; border-radius: var(--m11-radius) var(--m11-radius) 0 0; transform: translateY(100%); }
        #motoai-overlay.visible #motoai-card { transform: translateY(0); }
      }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // ---------------------------
    // GET ELEMENTS
    // ---------------------------
    const $root = document.getElementById('motoai-root');
    const $bubble = document.getElementById('motoai-bubble');
    const $overlay = document.getElementById('motoai-overlay');
    const $card = document.getElementById('motoai-card');
    const $body = document.getElementById('motoai-body');
    const $suggestions = document.getElementById('motoai-suggestions');
    const $typing = document.getElementById('motoai-typing');
    const $input = document.getElementById('motoai-input');
    const $send = document.getElementById('motoai-send');
    const $clear = document.getElementById('motoai-clear');
    const $close = document.getElementById('motoai-close');

    // ---------------------------
    // STATE
    // ---------------------------
    let corpus = [];
    let chatHistory = [];
    let memory = {};
    let isCardOpen = false;
    let contextHistory = []; // last N user queries
    let debugOverlayOpen = false;

    // ---------------------------
    // UTILITY: safe localStorage set
    // ---------------------------
    function safeSetItem(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        console.warn('[MotoAI] localStorage.setItem failed:', e && e.message);
        // try to free some recent session to make room
        try {
          localStorage.removeItem(CFG.sessionKey);
          localStorage.setItem(key, value);
          return true;
        } catch (err) {
          // give up silently; do not throw
          return false;
        }
      }
    }

    // ---------------------------
    // TEXT NORMALIZATION & EMBEDDINGS (n-gram)
    // ---------------------------
    function normalizeTextForTokens(text) {
      return String(text || '')
        .toLowerCase()
        .replace(/[^\wÀ-ỹ0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function generateEmbeddings(text) {
      const vec = new Map();
      const clean = normalizeTextForTokens(text);
      if (!clean) return vec;
      const words = clean.split(' ').filter(w => w.length > 2);
      for (let i = 0; i < words.length; i++) {
        for (let n = 1; n <= CFG.embedNgram && i + n <= words.length; n++) {
          const token = words.slice(i, i + n).join(' ');
          vec.set(token, (vec.get(token) || 0) + 1);
        }
      }
      return vec;
    }

    function dotProduct(a, b) {
      let s = 0;
      for (const [k, v] of a) if (b.has(k)) s += v * b.get(k);
      return s;
    }
    function magnitude(v) {
      let s = 0;
      for (const x of v.values()) s += x * x;
      return Math.sqrt(s);
    }
    function cosineSimilarity(a, b) {
      const ma = magnitude(a), mb = magnitude(b);
      if (ma === 0 || mb === 0) return 0;
      return dotProduct(a, b) / (ma * mb);
    }

    // ---------------------------
    // SYNONYM MAP (simple)
    // ---------------------------
    const SYNONYMS = {
      'xe tay ga': ['xe ga', 'tay ga'],
      'xe số': ['côn tay', 'xe côn'],
      'giá': ['bao nhiêu', 'mức giá', 'giá cả'],
      'mua': ['mua xe', 'mua ở đâu'],
      'bền': ['độ bền', 'chất lượng']
    };

    function applySynonyms(query) {
      // expand query by mapping synonyms (simple approach)
      const tokens = normalizeTextForTokens(query).split(' ');
      const expanded = new Set(tokens);
      for (const [canon, arr] of Object.entries(SYNONYMS)) {
        for (const s of arr) {
          // if query contains synonym word, also add canonical phrase
          if (query.toLowerCase().includes(s)) {
            canon.split(' ').forEach(t => expanded.add(t));
          }
        }
        // also if query contains canonical, add synonyms
        if (query.toLowerCase().includes(canon)) {
          arr.forEach(s => s.split(' ').forEach(t => expanded.add(t)));
        }
      }
      return Array.from(expanded).join(' ');
    }

    // ---------------------------
    // CORPUS BUILD + PERSIST
    // ---------------------------
    function buildCorpus() {
      LOG('Building corpus...');
      try {
        const textSet = new Set();
        const allText = document.body ? document.body.innerText : '';
        if (!allText) {
          LOG('No body text to build corpus from.');
          return;
        }
        // split by lines then sentences
        const lines = allText.split(/[\n\r]+/);
        for (const line of lines) {
          const sentences = line.split(/[.!?]+/) || [];
          for (const s of sentences) {
            const clean = s.trim();
            if (clean.length >= CFG.minSentenceLen) textSet.add(clean);
          }
        }
        const arr = Array.from(textSet).slice(0, CFG.maxCorpusSentences);
        corpus = arr.map(t => ({ text: t, vec: generateEmbeddings(t) }));
        safeSetItem(CFG.corpusKey, JSON.stringify(corpus));
        LOG(`Corpus built (${corpus.length} items).`);
      } catch (e) {
        console.error('MotoAI: buildCorpus error', e);
      }
    }

    // ---------------------------
    // FIND BEST MATCH (uses synonyms + context matching)
    // ---------------------------
    function findBestMatch(query) {
      if (!corpus || corpus.length === 0) return null;

      // expand query using synonyms and context buffer
      let expandedQuery = applySynonyms(query);
      if (contextHistory.length) {
        // append last context to help disambiguate (user follow-up)
        expandedQuery += ' ' + contextHistory.join(' ');
      }

      const qvec = generateEmbeddings(expandedQuery);
      if (qvec.size === 0) return null;

      let bestScore = -1;
      let bestText = null;
      for (const item of corpus) {
        const itemVec = item.vec || generateEmbeddings(item.text);
        if (!item.vec) item.vec = itemVec;
        if (itemVec.size === 0) continue;
        const score = cosineSimilarity(qvec, itemVec);
        if (score > bestScore) {
          bestScore = score;
          bestText = item.text;
        }
      }
      return bestScore > CFG.minScoreThreshold ? { text: bestText, score: bestScore } : null;
    }

    // ---------------------------
    // CONTEXT & INTENT
    // ---------------------------
    function rememberContext(query) {
      contextHistory.push(query);
      if (contextHistory.length > CFG.contextSize) contextHistory.shift();
    }

    function detectIntent(query) {
      const q = query.toLowerCase();
      if (q.includes('giá') || q.includes('bao nhiêu') || q.includes('mức giá')) return 'price';
      if (q.includes('mua') || q.includes('mua ở') || q.includes('đặt')) return 'buy';
      if (q.includes('so sánh') || q.includes('so sánh với') || q.includes('khác nhau')) return 'compare';
      if (q.includes('thủ tục') || q.includes('giấy tờ') || q.includes('hồ sơ')) return 'procedure';
      if (q.includes('có bền') || q.includes('độ bền') || q.includes('chất lượng')) return 'durability';
      return 'unknown';
    }

    // ---------------------------
    // UI HELPERS
    // ---------------------------
    function applySafePositioning() {
      try {
        const pos = computeSafePositions();
        $root.style.left = pos.left + 'px';
        $root.style.right = 'auto';
        $root.style.bottom = pos.bottom + 'px';
      } catch (e) {
        LOG('applySafePositioning error', e);
      }
    }

    function setTyping(isTyping) {
      if (isTyping) {
        $typing.innerHTML = '<span></span><span></span><span></span>';
        $typing.style.width = '42px';
        $typing.style.marginRight = '6px';
      } else {
        $typing.innerHTML = '';
        $typing.style.width = '0px';
        $typing.style.marginRight = '0px';
      }
    }

    function autoScroll(smooth = true) {
      try {
        if (smooth) $body.scrollTo({ top: $body.scrollHeight, behavior: 'smooth' });
        else $body.scrollTop = $body.scrollHeight;
      } catch (e) {
        // fallback to simple set
        try { $body.scrollTop = $body.scrollHeight; } catch (err) {}
      }
    }

    function addMessage(sender, text, noSave = false) {
      const div = document.createElement('div');
      div.className = `m-msg ${sender}`;
      div.textContent = text;
      $body.appendChild(div);
      requestAnimationFrame(() => autoScroll(true));
      if (!noSave) {
        chatHistory.push({ sender, text, ts: Date.now() });
        saveSession();
      }
    }

    // ---------------------------
    // PERSISTENCE
    // ---------------------------
    function loadData() {
      try {
        const mem = localStorage.getItem(CFG.memoryKey);
        if (mem) memory = JSON.parse(mem);

        const sess = localStorage.getItem(CFG.sessionKey);
        if (sess) {
          chatHistory = JSON.parse(sess);
          if (chatHistory.length > 0) {
            $body.innerHTML = '';
            chatHistory.forEach(m => addMessage(m.sender, m.text, true));
          }
        }

        const stored = localStorage.getItem(CFG.corpusKey);
        if (stored) {
          corpus = JSON.parse(stored);
          if (corpus.length > 0 && !corpus[0].vec) {
            LOG('Rebuilding cached corpus vectors...');
            corpus.forEach(it => it.vec = generateEmbeddings(it.text));
            safeSetItem(CFG.corpusKey, JSON.stringify(corpus));
          }
        } else {
          setTimeout(buildCorpus, 800);
        }
      } catch (e) {
        console.error('MotoAI loadData error', e);
        // clear potential corrupted data
        try { localStorage.removeItem(CFG.memoryKey); localStorage.removeItem(CFG.sessionKey); } catch (err) {}
      }
    }

    function saveSession() {
      try {
        safeSetItem(CFG.sessionKey, JSON.stringify(chatHistory.slice(-CFG.maxSavedMessages)));
      } catch (e) { console.error('MotoAI saveSession error', e); }
    }

    function saveMemory() {
      try {
        safeSetItem(CFG.memoryKey, JSON.stringify(memory));
      } catch (e) { console.error('MotoAI saveMemory error', e); }
    }

    // ---------------------------
    // CLEAR
    // ---------------------------
    function handleClear() {
      chatHistory = [];
      try { localStorage.removeItem(CFG.sessionKey); } catch (e) {}
      $body.innerHTML = '';
      const greeting = memory.userName ? `Chào ${memory.userName}! Bạn cần hỗ trợ gì tiếp theo?` : 'Chào bạn! Mình là MotoAI, mình có thể giúp gì cho bạn?';
      addMessage('bot', greeting, true);
    }

    // ---------------------------
    // MEMORY: extract name
    // ---------------------------
    function handleMemoryText(query) {
      const nameMatch = query.match(/(?:tôi là|tên tôi là) ([A-Za-zÀ-ỹ ]+)/iu);
      if (nameMatch && nameMatch[1]) {
        memory.userName = nameMatch[1].trim();
        saveMemory();
        return `Chào ${memory.userName}! Rất vui được gặp bạn. Bạn cần tư vấn về xe gì?`;
      }
      return null;
    }

    // ---------------------------
    // BOT RESPONSE (main)
    // ---------------------------
    function getBotResponse(rawQuery) {
      const query = String(rawQuery || '').trim();
      if (!query) return null;

      // remember context
      rememberContext(query);

      // check memory-based name
      const memResp = handleMemoryText(query.toLowerCase());
      if (memResp) return memResp;

      // detect intent
      const intent = detectIntent(query);

      // try corpus match (with synonyms + context)
      const match = findBestMatch(query);
      if (match) {
        // optionally post-process based on intent
        if (intent === 'price') {
          return `${match.text} (Tham khảo: thông tin về giá > có thể khác theo thời điểm và đại lý.)`;
        }
        if (intent === 'compare') {
          return `Mình tìm được: ${match.text} — bạn muốn mình so sánh mẫu này với mẫu khác không?`;
        }
        return match.text;
      }

      // fallback small Q/A
      if (query.toLowerCase().includes('chào') || query.toLowerCase().includes('hello')) {
        return memory.userName ? `Chào ${memory.userName}! Bạn cần mình giúp gì?` : 'Chào bạn! Mình là MotoAI, mình có thể giúp gì cho bạn?';
      }
      if (query.toLowerCase().includes('cảm ơn') || query.toLowerCase().includes('thanks')) {
        return 'Không có gì! Mình giúp được gì nữa không?';
      }

      // if unknown, ask clarifying Q instead of silence
      return 'Mình chưa rõ lắm — ý bạn muốn hỏi về "giá", "mua", hay "thủ tục" phải không?';
    }

    // ---------------------------
    // USER INPUT HANDLER (safe with finally)
    // ---------------------------
    async function handleUserInput() {
      const q = $input.value.trim();
      if (!q) return;

      addMessage('user', q);
      $input.value = '';
      $input.disabled = true;
      $send.disabled = true;
      setTyping(true);

      let responseText = null;
      try {
        // simulate thinking latency
        await new Promise(r => setTimeout(r, 400 + Math.random() * 500));
        responseText = getBotResponse(q);
        if (!responseText) responseText = 'Mình không tìm thấy thông tin phù hợp, bạn thử diễn đạt khác nhé.';
        addMessage('bot', responseText);
      } catch (e) {
        LOG('handleUserInput error', e);
        try { addMessage('bot', 'Mình gặp lỗi nhỏ khi xử lý, thử lại nhé.'); } catch (err) {}
      } finally {
        setTyping(false);
        $input.disabled = false;
        $send.disabled = false;
        try { $input.focus(); } catch (e) {}
      }
    }

    // ---------------------------
    // VIEWPORT (keyboard) handling
    // ---------------------------
    function handleViewport() {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--m11-vh', `${vh}px`);

      if (isCardOpen && window.visualViewport) {
        const v = window.visualViewport;
        const basePadding = (window.innerWidth <= 600) ? 0 : 12;
        const keyboardHeight = Math.max(0, window.innerHeight - v.height);
        $overlay.style.paddingBottom = `${basePadding + keyboardHeight}px`;
        if (window.innerWidth <= 600) $card.style.maxHeight = `calc(${v.height}px - 28px)`;
        else $card.style.maxHeight = `calc(${v.height}px - 40px)`;
        requestAnimationFrame(() => autoScroll(true));
      } else if (isCardOpen) {
        // fallback adjust
        document.documentElement.style.setProperty('--m11-vh', `${window.innerHeight * 0.01}px`);
      }
    }

    // ---------------------------
    // EVENTS BINDING
    // ---------------------------
    function toggleCard(show) {
      isCardOpen = (typeof show === 'boolean') ? show : !isCardOpen;
      handleViewport(); // update vh prior transition
      $overlay.classList.toggle('visible', isCardOpen);
      $overlay.setAttribute('aria-hidden', !isCardOpen);
      $card.setAttribute('aria-hidden', !isCardOpen);
      if (isCardOpen) {
        setTyping(false);
        setTimeout(() => { try { $input.focus(); } catch (e) {} }, 260);
        handleViewport();
      } else {
        $overlay.style.paddingBottom = '';
        $card.style.maxHeight = '';
      }
    }

    function initEvents() {
      $bubble.addEventListener('click', (e) => {
        if (e.altKey) { toggleDebugOverlay(); return; }
        toggleCard(true);
      });
      if ($close) $close.addEventListener('click', () => toggleCard(false));
      if ($clear) $clear.addEventListener('click', handleClear);
      if ($send) $send.addEventListener('click', handleUserInput);
      if ($input) $input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleUserInput(); }
      });
      $overlay.addEventListener('click', (e) => { if (e.target === $overlay) toggleCard(false); });
      $suggestions.addEventListener('click', (e) => {
        if (e.target && e.target.tagName === 'BUTTON') {
          $input.value = e.target.dataset.query || '';
          setTimeout(handleUserInput, 60);
        }
      });

      window.addEventListener('resize', () => {
        applySafePositioning();
        handleViewport();
      });
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
          applySafePositioning();
          handleViewport();
        });
      }

      // periodically re-check safe zone for SPAs
      const safeTimer = setInterval(() => applySafePositioning(), 2000);
      setTimeout(() => clearInterval(safeTimer), 60000);
    }

    // ---------------------------
    // DEBUG OVERLAY (Alt+Click to toggle)
    // ---------------------------
    let debugOverlayEl = null;
    function createDebugOverlay() {
      if (debugOverlayEl) return;
      debugOverlayEl = document.createElement('div');
      debugOverlayEl.id = 'motoai-debug-overlay';
      Object.assign(debugOverlayEl.style, {
        position: 'fixed', right: '12px', top: '12px', zIndex: 2147484000,
        background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '10px', borderRadius: '8px',
        maxWidth: '360px', fontSize: '13px', display: 'none', pointerEvents: 'auto'
      });
      debugOverlayEl.innerHTML = `<div style="font-weight:700;margin-bottom:6px">MotoAI DEBUG</div><pre id="motoai-debug-pre" style="white-space:pre-wrap"></pre>`;
      document.body.appendChild(debugOverlayEl);
    }
    function toggleDebugOverlay() {
      if (!debugOverlayEl) createDebugOverlay();
      debugOverlayOpen = !debugOverlayOpen;
      debugOverlayEl.style.display = debugOverlayOpen ? 'block' : 'none';
      if (debugOverlayOpen) updateDebugInfo();
    }
    function updateDebugInfo() {
      if (!debugOverlayEl) return;
      const pre = debugOverlayEl.querySelector('#motoai-debug-pre');
      const info = {
        version: CFG.version,
        placement: CFG.placement,
        corpusSize: corpus.length,
        sessionLen: chatHistory.length,
        memoryKeys: Object.keys(memory),
        contextHistory,
        userAgent: navigator.userAgent
      };
      pre.textContent = JSON.stringify(info, null, 2);
    }

    // ---------------------------
    // STARTUP
    // ---------------------------
    function startUp() {
      renderSuggestions();
      loadData();
      initEvents();
      // initial greeting if no history
      if (!chatHistory || chatHistory.length === 0) {
        $body.innerHTML = '';
        const g = memory.userName ? `Chào ${memory.userName}! Bạn sẵn sàng tìm hiểu về xe chưa?` : '👋 Chào bạn! Mình là MotoAI — hỏi thử “Xe ga”, “Xe số”, “Xe 50cc”, hoặc “Thủ tục” nhé!';
        addMessage('bot', g, true);
      }
      applySafePositioning();
      handleViewport();
      LOG('Ready ✅ MotoAI v11.3 PRO');
    }

    // render suggestions (small)
    function renderSuggestions() {
      $suggestions.innerHTML = '';
      (CFG.suggestionTags || []).forEach(t => {
        const btn = document.createElement('button');
        btn.textContent = t.label;
        btn.dataset.query = t.q;
        $suggestions.appendChild(btn);
      });
    }

    // expose small API for dev
    window.MotoAI_v11_3 = {
      cfg: CFG,
      open: () => toggleCard(true),
      close: () => toggleCard(false),
      rebuildCorpus: buildCorpus,
      debug: toggleDebugOverlay,
      getCorpusSize: () => corpus.length,
      getSession: () => chatHistory.slice()
    };

    // finally start
    startUp();
  } // end initMotoAI

  // end IIFE - initMotoAI will be invoked by waitForBodyAndInit
})();
