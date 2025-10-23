/*!
  MotoAI v11.0 FULL (Left + SafeZone) - Developer Edition
  - Full commented file (no logo, bubble default hidden)
  - SafeZone detector to avoid left fixed callouts (Zalo/QuickCall/TOC)
  - Safari/iPhone safe auto-init, corpus, cosine, memory, session
  - Debug: Alt+Click bubble opens debug overlay (hidden by default)
  By: MotoOpen (refactor & upgrade from v10.4)
*/

(function () {
  // ---------------------------
  // PREVENT DOUBLE LOAD / LOG
  // ---------------------------
  if (window.MotoAI_v11_FULL_LEFT_SAFE_LOADED) return;
  window.MotoAI_v11_FULL_LEFT_SAFE_LOADED = true;

  const LOG = (...args) => {
    try { console.log('[MotoAI v11]', ...args); } catch (e) {}
  };

  LOG('Booting MotoAI v11.0 (Full Left Safe)');

  // ---------------------------
  // AUTO-INIT + BODY READINESS
  // ---------------------------
  // Config for auto-init
  const MAX_RETRY = 30;
  const RETRY_DELAY = 220; // ms base
  const SAFE_LEFT_OFFSET = 30; // px offset when avoiding left fixed elements
  let retryCount = 0;

  // Guard to avoid race double-init
  if (!window.MotoAI_INIT_STARTED) window.MotoAI_INIT_STARTED = false;

  function waitForBodyAndInit() {
    try {
      // document.body may exist but not rendered (height 0) — check clientHeight
      if (document && document.body && document.body.clientHeight > 0) {
        if (window.MotoAI_INIT_STARTED) {
          LOG('Init already started (race prevented).');
          return;
        }
        window.MotoAI_INIT_STARTED = true;
        LOG('✅ Body ready, initializing MotoAI...');
        // slight delay to let layout settle
        setTimeout(initMotoAI, 120);
        return;
      }
    } catch (e) {
      LOG('Body check error:', e);
    }

    retryCount++;
    if (retryCount <= MAX_RETRY) {
      LOG(`⏳ Waiting for body... retry ${retryCount}/${MAX_RETRY}`);
      // small backoff
      setTimeout(waitForBodyAndInit, RETRY_DELAY + (retryCount * 30));
    } else {
      LOG('❌ Body not ready after retries. Aborting init.');
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // give browser a tick to finalize rendering
    setTimeout(waitForBodyAndInit, 90);
  } else {
    window.addEventListener('load', waitForBodyAndInit, { once: true });
  }

  // ---------------------------
  // MAIN: initMotoAI
  // ---------------------------
  function initMotoAI() {
    // Prevent re-injection if present
    if (document.getElementById('motoai-root')) {
      LOG('Already injected - aborting double inject.');
      return;
    }

    LOG('Injecting UI...');

    // ---------------------------
    // CONFIG
    // ---------------------------
    const CFG = {
      version: '11.0',
      placement: 'left',
      safeLeftOffset: SAFE_LEFT_OFFSET,
      maxCorpusSentences: 1200,
      minSentenceLen: 16,
      suggestionTags: [
        { q: 'Xe số', label: '🏍 Xe số' },
        { q: 'Xe ga', label: '🛵 Xe ga' },
        { q: 'Xe 50cc', label: '🚲 Xe 50cc' },
        { q: 'Thủ tục', label: '📄 Thủ tục' }
      ],
      corpusKey: 'MotoAI_v11_stable_corpus_v1',
      sessionKey: 'MotoAI_v11_session_v1',
      memoryKey: 'MotoAI_v11_memory_v1',
      embedNgram: 3,
      minScoreThreshold: 0.06,
      maxSavedMessages: 200
    };

    // ---------------------------
    // SAFEZONE DETECTION
    // ---------------------------
    // Find fixed positioned elements that live on the left side and could overlap bubble.
    function detectLeftFixedZones() {
      try {
        const elements = Array.from(document.querySelectorAll('body *'));
        const fixedLeftRects = [];
        for (const el of elements) {
          const st = window.getComputedStyle(el);
          if (!st) continue;
          if (st.position === 'fixed' || st.position === 'sticky') {
            // compute bounding rect in viewport coordinates
            const r = el.getBoundingClientRect();
            // only consider elements visible and on left half and within small left range
            if (r.width > 12 && r.height > 12 && r.right > 0 && r.left < (window.innerWidth * 0.6)) {
              // treat as potential obstacle if anchored to left side
              // we check if its left coordinate is near left edge (within 120px) OR it is visually left-anchored
              const nearLeft = (r.left <= 120) || (parseFloat(st.left) === 0);
              if (nearLeft) {
                fixedLeftRects.push(r);
              }
            }
          }
        }
        return fixedLeftRects;
      } catch (e) {
        LOG('SafeZone detect error', e);
        return [];
      }
    }

    // Calculate bubble offset from bottom & left to avoid collisions
    function computeSafePositions() {
      const fixedRects = detectLeftFixedZones();
      // default offsets
      const base = { left: 16, bottom: 18 };
      if (!fixedRects.length) return base;

      // find max vertical overlap at our default left region (0..(base.left + 80))
      let maxHeight = 0;
      for (const r of fixedRects) {
        // if an element spans near the left edge, reserve space above its top
        if (r.left <= (base.left + 80)) {
          maxHeight = Math.max(maxHeight, r.height + (window.innerHeight - r.bottom));
        }
      }
      // if there's any left fixed element, nudge bubble right by SAFE_LEFT_OFFSET
      const newLeft = base.left + CFG.safeLeftOffset;
      // also lift bubble up if the fixed element occupies bottom area
      const reserveBottom = maxHeight > 0 ? Math.max(18, Math.min(120, maxHeight + 8)) : base.bottom;
      return { left: newLeft, bottom: reserveBottom };
    }

    // ---------------------------
    // INJECT HTML
    // ---------------------------
    const html = `
      <div id="motoai-root" data-placement="${CFG.placement}" aria-hidden="false">
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
    // append to body
    document.body.insertAdjacentHTML('beforeend', html);

    // ---------------------------
    // INJECT CSS
    // ---------------------------
    const css = `
      :root {
        --m11-accent: #007aff;
        --m11-radius: 18px;
        --m11-card-bg: rgba(255,255,255,0.92);
        --m11-card-bg-dark: rgba(26,26,28,0.94);
        --m11-blur: blur(12px) saturate(140%);
        --m11-vh: 1vh;
      }
      #motoai-root { position: fixed; bottom: 18px; z-index: 2147483000; pointer-events: none; }
      #motoai-root[data-placement="left"] { left: 16px; }
      #motoai-root[data-placement="right"] { right: 16px; }

      /* Bubble */
      #motoai-bubble {
        pointer-events: auto;
        width: 56px; height: 56px; border-radius: 14px;
        display:flex; align-items:center; justify-content:center; font-size:26px;
        background: var(--m11-accent); color:#fff; cursor:pointer;
        box-shadow: 0 10px 28px rgba(2,6,23,0.18); transition: transform .12s ease, opacity .12s ease;
        user-select: none;
      }
      #motoai-bubble:active { transform: scale(0.96); }
      #motoai-overlay { position: fixed; inset: 0; display:flex; align-items:flex-end; justify-content:center; padding:12px; pointer-events: none; transition: background .24s ease, padding-bottom .2s ease-out; z-index:2147482999; }
      #motoai-overlay.visible { background: rgba(0,0,0,0.18); pointer-events: auto; }
      #motoai-card {
        width: min(920px, calc(100% - 36px));
        max-width: 920px;
        height: calc(var(--m11-vh, 1vh) * 72);
        min-height: 320px;
        border-radius: var(--m11-radius) var(--m11-radius) 12px 12px;
        background: var(--m11-card-bg);
        backdrop-filter: var(--m11-blur); -webkit-backdrop-filter: var(--m11-blur);
        box-shadow: 0 -18px 60px rgba(0,0,0,.22);
        display:flex; flex-direction:column; overflow:hidden;
        transform: translateY(110%); opacity: 0; pointer-events: auto;
        transition: transform .36s cubic-bezier(.2,.9,.2,1), opacity .28s ease, max-height .2s ease-out;
      }
      #motoai-overlay.visible #motoai-card { transform: translateY(0); opacity:1; }

      #motoai-handle { width:64px; height:6px; background: rgba(160,160,160,0.6); border-radius:6px; margin:10px auto; }
      #motoai-header { display:flex; align-items:center; justify-content:space-between; padding:8px 14px; font-weight:700; color:var(--m11-accent); border-bottom:1px solid rgba(0,0,0,0.06); }
      #motoai-header .tools button { background:none; border:none; font-size:18px; cursor:pointer; padding:6px 8px; color: #888; }

      #motoai-body { flex:1; overflow:auto; padding:12px 16px; font-size:15px; background: transparent; -webkit-overflow-scrolling: touch; }
      .m-msg { margin:8px 0; padding:12px 14px; border-radius:16px; max-width:86%; line-height:1.4; word-break:break-word; box-shadow:0 4px 8px rgba(0,0,0,0.06); }
      .m-msg.bot { background: rgba(255,255,255,0.95); color:#111; }
      .m-msg.user { background: linear-gradient(180deg,var(--m11-accent),#00b6ff); color:#fff; margin-left:auto; }

      #motoai-suggestions { display:flex; gap:8px; justify-content:center; flex-wrap:wrap; padding:8px 12px; border-top:1px solid rgba(0,0,0,0.04); background: rgba(255,255,255,0.6); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
      #motoai-suggestions button { border: none; background: rgba(0,122,255,0.08); color:var(--m11-accent); padding:8px 12px; border-radius:12px; cursor:pointer; font-weight:600; }

      #motoai-footer { display:flex; align-items:center; padding:10px 12px; border-top:1px solid rgba(0,0,0,0.06); background: rgba(255,255,255,0.9); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
      #motoai-typing { width:0px; height:20px; display:flex; align-items:center; justify-content:center; font-size:14px; color: rgba(0,0,0,0.5); transition: width 0.2s ease, margin-right 0.2s ease; overflow: hidden; }
      #motoai-typing span { width:6px; height:6px; background:rgba(0,0,0,0.3); border-radius:50%; margin:0 2px; animation: m11-dot-pulse 1.4s infinite ease-in-out both; }
      @keyframes m11-dot-pulse { 0%,80%,100%{transform:scale(0);}40%{transform:scale(1);} }

      #motoai-input { flex:1; min-width:0; padding:11px 12px; border-radius:16px; border:1px solid rgba(0,0,0,0.08); font-size:15px; background:rgba(255,255,255,0.88); }
      #motoai-send { background:var(--m11-accent); color:#fff; border:none; border-radius:14px; padding:10px 16px; font-weight:700; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.12); margin-left:6px; }

      @media (prefers-color-scheme: dark) {
        #motoai-card { background: var(--m11-card-bg-dark); }
        #motoai-header { color:#fff; border-bottom:1px solid rgba(255,255,255,0.08); }
        .m-msg.bot { background: #2c2c2e; color:#eee; }
        #motoai-suggestions { background: rgba(0,0,0,0.2); border-top:1px solid rgba(255,255,255,0.06); }
        #motoai-footer { background: rgba(0,0,0,0.3); border-top:1px solid rgba(255,255,255,0.08); }
        #motoai-input { background: #2c2c2e; border:1px solid rgba(255,255,255,0.08); color:#fff; }
      }

      /* Mobile optimizations */
      @media (max-width: 600px) {
        #motoai-overlay { padding: 0; align-items: flex-end; }
        #motoai-card { width: 100%; max-width: 100%; height: calc(var(--m11-vh, 1vh) * 100 - 28px); max-height: calc(var(--m11-vh, 1vh) * 100 - 28px); min-height:200px; border-radius: var(--m11-radius) var(--m11-radius) 0 0; transform: translateY(100%); }
        #motoai-overlay.visible #motoai-card { transform: translateY(0); }
        #motoai-footer { padding:8px 8px; }
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
    let debugOverlayOpen = false;

    // ---------------------------
    // EMBEDDING & SIMILARITY
    // ---------------------------
    // We avoid using \p{L} to keep compatibility with older Safari.
    function normalizeTextForTokens(text) {
      // Lowercase and remove punctuation except letters/numbers/whitespace.
      // Keep Vietnamese accented characters by using a char range.
      // Using [^\wÀ-ỹ0-9\s] to remove punctuation; fallback safe.
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
      // create simple n-gram tokens (1..CFG.embedNgram)
      for (let i = 0; i < words.length; i++) {
        for (let n = 1; n <= CFG.embedNgram && i + n <= words.length; n++) {
          const token = words.slice(i, i + n).join(' ');
          vec.set(token, (vec.get(token) || 0) + 1);
        }
      }
      return vec;
    }

    function dotProduct(vecA, vecB) {
      let dot = 0;
      for (const [k, v] of vecA) {
        if (vecB.has(k)) dot += v * vecB.get(k);
      }
      return dot;
    }
    function magnitude(vec) {
      let sum = 0;
      for (const v of vec.values()) sum += v * v;
      return Math.sqrt(sum);
    }
    function cosineSimilarity(vecA, vecB) {
      const ma = magnitude(vecA), mb = magnitude(vecB);
      if (ma === 0 || mb === 0) return 0;
      return dotProduct(vecA, vecB) / (ma * mb);
    }

    function findBestMatch(query) {
      if (!corpus || !corpus.length) return null;
      const qVec = generateEmbeddings(query);
      if (qVec.size === 0) return null;

      let bestScore = -1, bestMatch = null;
      for (const item of corpus) {
        // Ensure item.vec exists (cached)
        const itemVec = item.vec || generateEmbeddings(item.text);
        if (!item.vec) item.vec = itemVec;
        if (itemVec.size === 0) continue;
        const score = cosineSimilarity(qVec, itemVec);
        if (score > bestScore) { bestScore = score; bestMatch = item.text; }
      }
      return bestScore > CFG.minScoreThreshold ? bestMatch : null;
    }

    // ---------------------------
    // UI HELPERS & BEHAVIOR
    // ---------------------------
    function applySafePositioning() {
      try {
        const pos = computeSafePositions();
        // set root left/bottom dynamic styles
        $root.style.left = pos.left + 'px';
        $root.style.right = 'auto';
        $root.style.bottom = pos.bottom + 'px';
      } catch (e) {
        LOG('applySafePositioning error', e);
      }
    }

    function toggleCard(show) {
      isCardOpen = (typeof show === 'boolean') ? show : !isCardOpen;

      // update vh variable early
      handleViewport();

      $overlay.classList.toggle('visible', isCardOpen);
      $overlay.setAttribute('aria-hidden', !isCardOpen);
      $card.setAttribute('aria-hidden', !isCardOpen);
      // Note: do NOT set aria-hidden on $root (it contains bubble and overlay)
      if (isCardOpen) {
        setTyping(false);
        // focus input after opening animation
        setTimeout(() => $input.focus(), 260);
        // ensure overlay padding for keyboard
        handleViewport();
      } else {
        $overlay.style.paddingBottom = '';
        $card.style.maxHeight = '';
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
        // fallback
        $body.scrollTop = $body.scrollHeight;
      }
    }

    function addMessage(sender, text, noSave = false) {
      const msgDiv = document.createElement('div');
      msgDiv.className = `m-msg ${sender}`;
      msgDiv.textContent = text;
      $body.appendChild(msgDiv);
      requestAnimationFrame(() => autoScroll(true));
      if (!noSave) {
        chatHistory.push({ sender, text, ts: Date.now() });
        saveSession();
      }
    }

    // ---------------------------
    // SUGGESTIONS RENDER
    // ---------------------------
    function renderSuggestions() {
      $suggestions.innerHTML = '';
      (CFG.suggestionTags || []).forEach(tag => {
        const btn = document.createElement('button');
        btn.textContent = tag.label;
        btn.dataset.query = tag.q;
        $suggestions.appendChild(btn);
      });
    }

    // ---------------------------
    // PERSISTENCE: load/save
    // ---------------------------
    function loadData() {
      try {
        const mem = localStorage.getItem(CFG.memoryKey);
        if (mem) memory = JSON.parse(mem);

        const session = localStorage.getItem(CFG.sessionKey);
        if (session) {
          chatHistory = JSON.parse(session);
          if (chatHistory.length > 0) {
            $body.innerHTML = '';
            chatHistory.forEach(m => addMessage(m.sender, m.text, true));
          }
        }

        const storedCorpus = localStorage.getItem(CFG.corpusKey);
        if (storedCorpus) {
          corpus = JSON.parse(storedCorpus);
          // if old format without vec, rebuild
          if (corpus.length > 0 && !corpus[0].vec) {
            LOG('Rebuilding vectors for cached corpus...');
            corpus.forEach(it => it.vec = generateEmbeddings(it.text));
            localStorage.setItem(CFG.corpusKey, JSON.stringify(corpus));
          }
        } else {
          // build after slight delay to avoid blocking render
          setTimeout(buildCorpus, 900);
        }
      } catch (e) {
        console.error('MotoAI: Error loading data', e);
        // purge corrupted storage safely
        try {
          localStorage.removeItem(CFG.memoryKey);
          localStorage.removeItem(CFG.sessionKey);
          localStorage.removeItem(CFG.corpusKey);
        } catch (err) {}
      }
    }

    function saveSession() {
      try {
        const limited = chatHistory.slice(-CFG.maxSavedMessages);
        localStorage.setItem(CFG.sessionKey, JSON.stringify(limited));
      } catch (e) {
        console.error('MotoAI: Error saving session', e);
      }
    }

    function saveMemory() {
      try {
        localStorage.setItem(CFG.memoryKey, JSON.stringify(memory));
      } catch (e) {
        console.error('MotoAI: Error saving memory', e);
      }
    }

    // ---------------------------
    // CLEAR / BUILD CORPUS
    // ---------------------------
    function handleClear() {
      chatHistory = [];
      try { localStorage.removeItem(CFG.sessionKey); } catch (e) {}
      $body.innerHTML = '';
      const greeting = memory.userName ? `Chào ${memory.userName}! Bạn cần hỗ trợ gì tiếp theo?` : 'Chào bạn! Mình là MotoAI, mình có thể giúp gì cho bạn?';
      addMessage('bot', greeting, true);
    }

    function buildCorpus() {
      LOG('Building corpus...');
      try {
        const textCorpus = new Set();
        const allText = document.body.innerText || '';
        // split by lines then sentence separators for better uniqueness
        const lines = allText.split(/[\n\r]+/);
        for (const line of lines) {
          const sentences = line.split(/[.!?]+/) || [];
          for (const s of sentences) {
            const clean = s.trim();
            if (clean.length > CFG.minSentenceLen) textCorpus.add(clean);
          }
        }
        const arr = Array.from(textCorpus).slice(0, CFG.maxCorpusSentences);
        corpus = arr.map(t => ({ text: t, vec: generateEmbeddings(t) }));
        try {
          localStorage.setItem(CFG.corpusKey, JSON.stringify(corpus));
        } catch (e) {
          // If storage fails, try saving smaller set
          try {
            localStorage.setItem(CFG.corpusKey, JSON.stringify(corpus.slice(0, 200)));
          } catch (err) {
            LOG('Unable to persist corpus to localStorage (quota?)', err);
          }
        }
        LOG(`Corpus built (${corpus.length})`);
      } catch (e) {
        console.error('MotoAI: Error building corpus', e);
      }
    }

    // ---------------------------
    // MEMORY HANDLER (name extraction)
    // ---------------------------
    function handleMemoryText(query) {
      // Use simpler char class to avoid Unicode property escapes in older Safari
      const nameMatch = query.match(/(?:tôi là|tên tôi là) ([A-Za-zÀ-ỹ ]+)/iu);
      if (nameMatch && nameMatch[1]) {
        memory.userName = nameMatch[1].trim();
        saveMemory();
        return `Chào ${memory.userName}! Rất vui được gặp bạn. Bạn cần tư vấn về xe gì?`;
      }
      return null;
    }

    // ---------------------------
    // BOT RESPONSE LOGIC
    // ---------------------------
    function getBotResponse(query) {
      const q = String(query || '').toLowerCase();
      const memResp = handleMemoryText(q);
      if (memResp) return memResp;

      const corpusMatch = findBestMatch(q);
      if (corpusMatch) return corpusMatch;

      if (q.includes('chào') || q.includes('hello')) {
        return memory.userName ? `Chào ${memory.userName}! Bạn cần mình giúp gì?` : 'Chào bạn! Mình là MotoAI, mình có thể giúp gì cho bạn?';
      }
      if (q.includes('cảm ơn') || q.includes('thanks')) {
        return 'Không có gì! Mình giúp được gì nữa không?';
      }
      return 'Xin lỗi, mình chưa hiểu rõ ý bạn lắm. Bạn có thể hỏi về "xe số", "xe ga", "thủ tục mua xe" thử nhé!';
    }

    // ---------------------------
    // USER INPUT HANDLER
    // ---------------------------
    async function handleUserInput() {
      const query = $input.value.trim();
      if (!query) return;
      addMessage('user', query);
      $input.value = '';
      $input.disabled = true;
      $send.disabled = true;
      setTyping(true);

      // simulated thinking delay
      await new Promise(res => setTimeout(res, 500 + Math.random() * 500));

      const response = getBotResponse(query);
      setTyping(false);
      addMessage('bot', response);
      $input.disabled = false;
      $send.disabled = false;
      $input.focus();
    }

    // ---------------------------
    // VIEWPORT & KEYBOARD HANDLING
    // ---------------------------
    function handleViewport() {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--m11-vh', `${vh}px`);

      if (isCardOpen && window.visualViewport) {
        const vvp = window.visualViewport;
        const basePadding = (window.innerWidth <= 600) ? 0 : 12;
        const keyboardHeight = Math.max(0, window.innerHeight - vvp.height);
        $overlay.style.paddingBottom = `${basePadding + keyboardHeight}px`;
        if (window.innerWidth <= 600) $card.style.maxHeight = `calc(${vvp.height}px - 28px)`;
        else $card.style.maxHeight = `calc(${vvp.height}px - 40px)`;
        requestAnimationFrame(() => autoScroll(true));
      } else if (isCardOpen) {
        // fallback
        document.documentElement.style.setProperty('--m11-vh', `${window.innerHeight * 0.01}px`);
      }
    }

    // ---------------------------
    // INITIALIZATION & EVENT BINDING
    // ---------------------------
    // Apply safe position initially
    applySafePositioning();

    // Event listeners
    function initEvents() {
      // Bubble click opens toggles the chat
      $bubble.addEventListener('click', (e) => {
        // Alt+Click toggles debug overlay (for dev)
        if (e.altKey) { toggleDebugOverlay(); return; }
        toggleCard(true);
      });

      // Close button
      if ($close) $close.addEventListener('click', () => toggleCard(false));

      // Clear
      if ($clear) $clear.addEventListener('click', handleClear);

      // Send
      if ($send) $send.addEventListener('click', handleUserInput);

      // Enter to send (Shift+Enter for newline)
      if ($input) $input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleUserInput();
        }
      });

      // Clicking overlay background closes
      $overlay.addEventListener('click', (e) => {
        if (e.target === $overlay) toggleCard(false);
      });

      // Suggestion clicks
      $suggestions.addEventListener('click', (e) => {
        if (e.target && e.target.tagName === 'BUTTON') {
          const q = e.target.dataset.query || '';
          $input.value = q;
          // a tiny delay for UX
          setTimeout(handleUserInput, 70);
        }
      });

      // Orientation / resize / visualViewport adjustments
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

      // Re-run safe zone detection periodically for dynamic pages (SPA)
      let safeZoneTimer = setInterval(() => applySafePositioning(), 2000);
      // clear interval after a minute to avoid runaway timers
      setTimeout(() => clearInterval(safeZoneTimer), 60000);
    }

    // ---------------------------
    // DEBUG OVERLAY (hidden, Alt+Click to toggle)
    // ---------------------------
    let debugOverlayEl = null;
    function createDebugOverlay() {
      if (debugOverlayEl) return;
      debugOverlayEl = document.createElement('div');
      debugOverlayEl.id = 'motoai-debug-overlay';
      debugOverlayEl.style.position = 'fixed';
      debugOverlayEl.style.right = '12px';
      debugOverlayEl.style.top = '12px';
      debugOverlayEl.style.zIndex = 2147484000;
      debugOverlayEl.style.background = 'rgba(0,0,0,0.7)';
      debugOverlayEl.style.color = '#fff';
      debugOverlayEl.style.padding = '10px';
      debugOverlayEl.style.borderRadius = '8px';
      debugOverlayEl.style.maxWidth = '320px';
      debugOverlayEl.style.fontSize = '13px';
      debugOverlayEl.style.display = 'none';
      debugOverlayEl.style.pointerEvents = 'auto';
      debugOverlayEl.innerHTML = `<div style="font-weight:700;margin-bottom:6px">MotoAI Debug</div><pre id="motoai-debug-pre" style="white-space:pre-wrap"></pre>`;
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
        corpusItems: corpus.length,
        sessionMessages: chatHistory.length,
        memoryKeys: Object.keys(memory),
        safePos: { left: $root.style.left, bottom: $root.style.bottom },
        userAgent: navigator.userAgent
      };
      pre.textContent = JSON.stringify(info, null, 2);
    }

    // ---------------------------
    // UTILITY: computeSafePositions (exposed earlier)
    // ---------------------------
    // (already defined above as computeSafePositions via detectLeftFixedZones closure)
    // but define computeSafePositions function name for clarity:
    function computeSafePositions() {
      // reuse detection logic above
      const fixedRects = detectLeftFixedZones();
      const base = { left: 16, bottom: 18 };
      if (!fixedRects || fixedRects.length === 0) return base;

      // If there are fixed items at left, nudge right and potentially higher bottom
      let hitBottomOccupier = 0;
      for (const r of fixedRects) {
        // If any occupies bottom 120px, consider lifting
        if (r.bottom >= (window.innerHeight - 140)) {
          hitBottomOccupier = Math.max(hitBottomOccupier, (window.innerHeight - r.top));
        }
      }
      const newLeft = base.left + CFG.safeLeftOffset;
      const newBottom = hitBottomOccupier > 0 ? Math.min(160, 18 + hitBottomOccupier) : base.bottom;
      return { left: newLeft, bottom: newBottom };
    }

    // ---------------------------
    // STARTUP: render suggestions, load data, events
    // ---------------------------
    function startUp() {
      renderSuggestions();
      loadData();
      initEvents();

      // If no saved history, show default greeting (but don't save)
      if (!chatHistory || chatHistory.length === 0) {
        $body.innerHTML = '';
        const greeting = memory.userName ? `Chào ${memory.userName}! Bạn sẵn sàng tìm hiểu về xe chưa?` : '👋 Chào bạn! Mình là MotoAI — hỏi thử “Xe ga”, “Xe số”, “Xe 50cc”, hoặc “Thủ tục” nhé!';
        addMessage('bot', greeting, true);
      }

      // final adjustments
      applySafePositioning();
      handleViewport();

      LOG('Ready ✅ (MotoAI v11.0 Full Left Safe)');
    }

    // invoke startup
    startUp();

    // expose some internals for debugging (only in memory, not polluting global names too much)
    window.MotoAI_v11 = {
      cfg: CFG,
      computeSafePositions,
      detectLeftFixedZones,
      rebuildCorpus: buildCorpus,
      open: () => toggleCard(true),
      close: () => toggleCard(false),
      debug: toggleDebugOverlay
    };
  } // end initMotoAI()

  // end IIFE continuation (initMotoAI will be called by waitForBodyAndInit)
})();
