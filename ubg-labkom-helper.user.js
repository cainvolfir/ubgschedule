// ==UserScript==
// @name         UBG Labkom Schedule Helper
// @namespace    https://ubg.ac.id/labkom-helper
// @version      2.0.0
// @description  Filter the UBG Labkom schedule against a saved list of courses.
// @match        *://labkom.ubg.ac.id/*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

/*
 * UBG Labkom Schedule Helper
 * -------------------------------------------------------------------------
 * A single-file Tampermonkey userscript (vanilla JS, no build, no deps).
 *
 * The site (labkom.ubg.ac.id) renders Tailwind utility <div>s — there are no
 * `.card` / `[class*="card"]` hooks — so card detection walks up from each <h4>
 * (course title) until its parent holds more than one <h4>; that stops at the
 * per-card container rather than the shared grid (see getCardElement()).
 *
 * Feature map (see section banners below):
 *   1. Card detection ................. findCards() / getCardElement() [section 5]
 *   2. "Tampilkan Semua" via <select>  . clickShowAll()                [section 6]
 *   3. Batch input + class picker UX .. buildPanel() / parseBatch()    [sections 3, 4]
 *   4. Class matching ................. matchSaved() / classMatches()  [section 8]
 *   5. Default filter state ........... init()                         [section 10]
 *   6. Syntax verified with node --check (header is a comment).
 *
 * The script only READS the host DOM and INJECTS its own prefixed elements
 * (id/classes starting with `ubg-lk-`), so it never breaks the host page.
 */

(function () {
  'use strict';

  /* ==========================================================================
   * 0. Constants, state and small helpers
   * ========================================================================== */

  var STORAGE_KEY = 'ubg_labkom_courses';
  var PANEL_ID = 'ubg-lk-panel';
  var REAPPLY_DEBOUNCE_MS = 250;

  // Course-code pattern, e.g. IF184201 (8-12 alphanumerics). Used for both
  // validation of typed input and for locating code text in the DOM.
  var CODE_RE = /\b[A-Z0-9]{8,12}\b/;

  // Time-range pattern. Accepts "HH:MM - HH:MM WITA", "HH:MM-HH:MM",
  // "HH:MM s/d HH:MM", en/em dashes, and "." as the minutes separator.
  // `WITA` (and similar) is simply ignored — the range appears before it.
  var TIME_RE = /(\d{1,2})[:.](\d{2})\s*(?:-|\u2013|\u2014|s\/d|s\.d\.|\s)\s*(\d{1,2})[:.](\d{2})/i;

  // Runtime state. `courses` is hydrated from storage at startup.
  var state = {
    courses: [],   // [{ code: 'IF184201', kelas: 'C1' }]
    filterOn: false
  };

  // Module-level references to injected DOM nodes (kept so we can re-render).
  var listEl = null;
  var counterEl = null;
  var filterBtn = null;
  var panelReady = false;
  var debounceTimer = null;
  var showAllTried = false; // ensures we only auto-trigger show-all once
  var clickDelegationAttached = false; // guards the document click listener
  var domObserver = null;  // the MutationObserver (disconnected during reapply)
  var domRoot = null;      // the element the observer watches

  // Create an element with optional class, inline styles and text.
  function makeEl(tag, className, styles, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (styles) Object.assign(el.style, styles);
    if (text != null) el.textContent = text;
    return el;
  }

  // querySelectorAll -> real Array, defensive against bad selectors.
  function qsa(selector, root) {
    try {
      return Array.prototype.slice.call((root || document).querySelectorAll(selector));
    } catch (e) {
      return [];
    }
  }

  // Shared input styling.
  function inputStyle() {
    return {
      width: '100%', boxSizing: 'border-box', padding: '6px 8px',
      border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px',
      color: '#111827', background: '#ffffff'
    };
  }

  /* ==========================================================================
   * 1. Storage — GM_setValue/GM_getValue with localStorage fallback
   * ========================================================================== */

  // Feature-detect GM_* safely (typeof on an undeclared identifier never throws).
  function hasGM() {
    return typeof GM_setValue === 'function' && typeof GM_getValue === 'function';
  }

  function loadCourses() {
    try {
      var raw = hasGM() ? GM_getValue(STORAGE_KEY, null) : localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      // GM may return the stored value already parsed depending on the manager.
      if (typeof raw === 'object') return Array.isArray(raw) ? raw : [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveCourses(courses) {
    try {
      var raw = JSON.stringify(courses);
      if (hasGM()) GM_setValue(STORAGE_KEY, raw);
      else localStorage.setItem(STORAGE_KEY, raw);
    } catch (e) {
      /* Storage unavailable — silently ignore, state stays in memory. */
    }
  }

  /* ==========================================================================
   * 2. Course management (add / remove / clear / bulk)
   * ========================================================================== */

  // Normalise one entry and return it, or null when invalid.
  function normaliseCourse(code, kelas) {
    code = (code || '').trim().toUpperCase();
    kelas = (kelas || '').trim().toUpperCase();
    if (!code || !CODE_RE.test(code)) return null;
    return { code: code, kelas: kelas };
  }

  // Is this exact code+class already saved?
  function isDuplicate(code, kelas) {
    return state.courses.some(function (c) {
      return c.code === code && (c.kelas || '') === (kelas || '');
    });
  }

  // Add a single course. Returns true when a new entry was stored.
  function addCourse(code, kelas) {
    var course = normaliseCourse(code, kelas);
    if (!course) return false;
    if (isDuplicate(course.code, course.kelas)) return false;
    state.courses.push(course);
    saveCourses(state.courses);
    state.filterOn = true;
    updateFilterUI();
    return true;
  }

  /*
   * parseBatch(text):
   * Accepts text pasted with commas, whitespace, semicolons or newlines.
   * Supports both `CODE` and `CODE,CLASS` tokens. Because a bare comma can
   * also be a separator between two codes, a comma pair is only treated as
   * `CODE,CLASS` when the second part is short (a typical class label such as
   * "C1") and is not itself a full course code. Invalid tokens are skipped.
   */
  function parseBatch(text) {
    var out = [];
    var chunks = String(text || '').split(/[\n;]+/);
    for (var c = 0; c < chunks.length; c++) {
      var words = chunks[c].split(/\s+/);
      for (var w = 0; w < words.length; w++) {
        var word = words[w].trim();
        if (!word) continue;

        if (word.indexOf(',') !== -1) {
          var parts = word.split(',');
          var second = (parts[1] || '').trim();
          if (parts.length === 2 && second && second.length <= 4 && !CODE_RE.test(second)) {
            var pair = normaliseCourse(parts[0], second);
            if (pair && !isDuplicate(pair.code, pair.kelas)) out.push(pair);
          } else {
            for (var p = 0; p < parts.length; p++) {
              var single = normaliseCourse(parts[p], '');
              if (single && !isDuplicate(single.code, single.kelas)) out.push(single);
            }
          }
        } else {
          var one = normaliseCourse(word, '');
          if (one && !isDuplicate(one.code, one.kelas)) out.push(one);
        }
      }
    }
    return out;
  }

  function removeCourse(index) {
    if (index < 0 || index >= state.courses.length) return;
    state.courses.splice(index, 1);
    saveCourses(state.courses);
    if (state.courses.length === 0) {
      state.filterOn = false;
      updateFilterUI();
    }
    rerenderList();
    scheduleReapply();
  }

  function clearAllCourses() {
    state.courses = [];
    saveCourses(state.courses);
    state.filterOn = false;
    updateFilterUI();
    rerenderList();
    scheduleReapply();
  }

  // Set (or clear) the class for every saved course.
  function applyClassToAll(kelas) {
    kelas = (kelas || '').trim().toUpperCase();
    for (var i = 0; i < state.courses.length; i++) {
      state.courses[i].kelas = kelas;
    }
    saveCourses(state.courses);
    state.filterOn = true;
    updateFilterUI();
    rerenderList();
    scheduleReapply();
  }

  // Add all valid tokens from the batch textarea.
  function addBatch() {
    var area = document.getElementById('ubg-lk-batch');
    if (!area) return;
    var parsed = parseBatch(area.value || '');
    for (var i = 0; i < parsed.length; i++) state.courses.push(parsed[i]);
    if (parsed.length) saveCourses(state.courses);
    state.filterOn = true;
    updateFilterUI();
    area.value = '';
    rerenderList();
    scheduleReapply();
  }

  // Saved courses list: code badge + inline class input + remove button.
  function rerenderList() {
    if (!listEl) return;
    listEl.textContent = '';

    if (state.courses.length === 0) {
      listEl.appendChild(makeEl('div', null,
        { color: '#6b7280', fontSize: '12px' },
        'Belum ada MK tersimpan.'));
      return;
    }

    state.courses.forEach(function (course, idx) {
      var row = makeEl('div', null, {
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '4px 6px', background: '#f3f4f6', borderRadius: '6px'
      });

      // (a) Course-code badge
      row.appendChild(makeEl('span', null, {
        fontSize: '12px', fontWeight: '700', wordBreak: 'break-all',
        flex: '1 1 auto', minWidth: '0'
      }, course.code));

      // (b) Inline editable class input (empty = "all classes")
      var clsInput = makeEl('input', null, {
        width: '56px', boxSizing: 'border-box', padding: '3px 5px',
        border: '1px solid #d1d5db', borderRadius: '5px',
        fontSize: '11px', textAlign: 'center', background: '#ffffff'
      }, null);
      clsInput.type = 'text';
      clsInput.value = course.kelas || '';
      clsInput.placeholder = 'all';
      clsInput.title = 'Kelas (kosong = semua kelas)';
      var updateClass = function () {
        state.courses[idx].kelas = (clsInput.value || '').trim().toUpperCase();
        saveCourses(state.courses);
        scheduleReapply();
      };
      clsInput.addEventListener('input', updateClass);
      clsInput.addEventListener('change', updateClass);
      row.appendChild(clsInput);

      // (c) Remove button
      var rm = makeEl('button', null, {
        background: 'transparent', border: 'none', color: '#dc2626',
        cursor: 'pointer', fontWeight: '700', fontSize: '14px', lineHeight: '1'
      }, '\u00D7');
      rm.type = 'button';
      rm.title = 'Hapus';
      rm.addEventListener('click', function () { removeCourse(idx); });
      row.appendChild(rm);

      listEl.appendChild(row);
    });
  }

  /* ==========================================================================
   * 3. Floating panel (top-right, collapsible)
   * ========================================================================== */

  function buildPanel() {
    if (panelReady || document.getElementById(PANEL_ID)) return;
    if (!document.body) return;

    var panel = makeEl('div', null, {
      position: 'fixed', top: '12px', right: '12px', zIndex: '2147483647',
      width: '300px', maxWidth: 'calc(100vw - 24px)',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      fontSize: '13px', lineHeight: '1.4', color: '#111827',
      background: '#ffffff', border: '1px solid #d1d5db', borderRadius: '10px',
      boxShadow: '0 6px 24px rgba(0,0,0,0.18)', overflow: 'hidden'
    });
    panel.id = PANEL_ID;

    // --- Header with title + minimize toggle -------------------------------
    var header = makeEl('div', null, {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 10px', background: '#1e293b', color: '#ffffff'
    });
    header.appendChild(makeEl('span', null,
      { fontWeight: '700', fontSize: '13px' }, 'UBG Labkom Helper'));

    var minBtn = makeEl('button', null, {
      background: 'transparent', border: 'none', color: '#ffffff',
      fontSize: '16px', lineHeight: '1', cursor: 'pointer', padding: '0 4px'
    }, '\u2013');
    minBtn.type = 'button';
    minBtn.title = 'Minimize / Expand';
    header.appendChild(minBtn);

    // --- Body --------------------------------------------------------------
    var body = makeEl('div', 'ubg-lk-body', {
      display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px',
      maxHeight: '70vh', overflowY: 'auto'
    });

    // ---- Batch input (Requirement 3) --------------------------------------
    var batchArea = makeEl('textarea', null, Object.assign(inputStyle(), {
      minHeight: '54px', resize: 'vertical', fontFamily: 'monospace'
    }), null);
    batchArea.id = 'ubg-lk-batch';
    batchArea.placeholder = 'Tempel banyak kode MK (pisah dengan koma / spasi / baris baru)…';

    var addBatchBtn = makeEl('button', null, {
      padding: '8px', background: '#2563eb', color: '#ffffff', border: 'none',
      borderRadius: '6px', cursor: 'pointer', fontWeight: '600'
    }, 'Tambah Semua MK');
    addBatchBtn.type = 'button';
    addBatchBtn.addEventListener('click', addBatch);

    // ---- Global class applier ---------------------------------------------
    var globalWrap = makeEl('div', null, {
      display: 'flex', gap: '6px', alignItems: 'center'
    });
    var globalInput = makeEl('input', null, Object.assign(inputStyle(), { flex: '1 1 auto' }), null);
    globalInput.id = 'ubg-lk-global-class';
    globalInput.type = 'text';
    globalInput.placeholder = 'Kelas utk semua (mis. C1)';
    globalInput.addEventListener('input', function () {
      this.value = this.value.toUpperCase();
    });
    var applyBtn = makeEl('button', null, {
      padding: '7px 8px', background: '#0f766e', color: '#ffffff', border: 'none',
      borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '12px'
    }, 'Terapkan');
    applyBtn.type = 'button';
    applyBtn.title = 'Terapkan ke Semua Kelas (kosong = semua kelas)';
    applyBtn.addEventListener('click', function () { applyClassToAll(globalInput.value); });
    globalWrap.appendChild(globalInput);
    globalWrap.appendChild(applyBtn);

    // ---- Filter toggle (prominent button; state lives in state.filterOn) ---
    filterBtn = makeEl('button', null, {
      width: '100%', padding: '10px', border: 'none', borderRadius: '8px',
      cursor: 'pointer', fontWeight: '700', fontSize: '13px',
      textAlign: 'center', color: '#ffffff'
    });
    filterBtn.type = 'button';
    filterBtn.addEventListener('click', function () {
      state.filterOn = !state.filterOn;
      updateFilterUI();
      scheduleReapply();
    });

    // ---- Action row: Tampilkan Semua + Hapus Semua ------------------------
    var actionWrap = makeEl('div', null, { display: 'flex', gap: '6px' });
    var showAllBtn = makeEl('button', null, {
      flex: '1 1 auto', padding: '7px', background: '#f3f4f6', color: '#111827',
      border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
    }, 'Tampilkan Semua');
    showAllBtn.type = 'button';
    showAllBtn.addEventListener('click', function () {
      clickShowAll();
      // Give the site a moment to expand the list before re-applying.
      setTimeout(scheduleReapply, 300);
    });

    var clearBtn = makeEl('button', null, {
      flex: '1 1 auto', padding: '7px', background: '#fee2e2', color: '#991b1b',
      border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
    }, 'Hapus Semua');
    clearBtn.type = 'button';
    clearBtn.addEventListener('click', clearAllCourses);

    actionWrap.appendChild(showAllBtn);
    actionWrap.appendChild(clearBtn);

    // ---- Saved courses list ----------------------------------------------
    listEl = makeEl('div', 'ubg-lk-list', {
      maxHeight: '150px', overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: '4px'
    });

    // ---- Live counter -----------------------------------------------------
    counterEl = makeEl('div', null, {
      fontSize: '12px', color: '#374151', textAlign: 'center',
      padding: '4px', background: '#eef2ff', borderRadius: '6px'
    }, 'Menampilkan 0 dari 0 sesi');

    body.appendChild(batchArea);
    body.appendChild(addBatchBtn);
    body.appendChild(globalWrap);
    body.appendChild(filterBtn);
    body.appendChild(actionWrap);
    body.appendChild(listEl);
    body.appendChild(counterEl);

    // Minimize toggle collapses the body.
    minBtn.addEventListener('click', function () {
      var collapsed = body.style.display === 'none';
      body.style.display = collapsed ? 'flex' : 'none';
      minBtn.textContent = collapsed ? '\u2013' : '+';
    });

    panel.appendChild(header);
    panel.appendChild(body);
    document.body.appendChild(panel);

    rerenderList();
    updateFilterUI();
    panelReady = true;
  }

  // Reflect state.filterOn on the prominent filter button.
  function updateFilterUI() {
    if (!filterBtn) return;
    if (state.filterOn) {
      filterBtn.style.background = '#16a34a';
      filterBtn.textContent = '\u2713 Filter Aktif: Hanya MK Saya';
    } else {
      filterBtn.style.background = '#4b5563';
      filterBtn.textContent = 'Filter Nonaktif: Tampilkan Semua';
    }
  }

  /* ==========================================================================
   * 4. DOM parsing helpers (time / code extraction)
   * ========================================================================== */

  // Convert "HH" / "MM" into minutes since midnight.
  function toMinutes(hh, mm) {
    return parseInt(hh, 10) * 60 + parseInt(mm, 10);
  }

  // Parse the first time range found in a string -> { start, end } minutes or null.
  function parseTimeRange(text) {
    if (!text) return null;
    var m = TIME_RE.exec(text);
    if (!m) return null;
    var start = toMinutes(m[1], m[2]);
    var end = toMinutes(m[3], m[4]);
    if (!(start < end)) return null;
    return { start: start, end: end };
  }

  /* ==========================================================================
   * 5. Card detection (Change 1)
   * ==========================================================================
   * Every schedule card on labkom.ubg.ac.id has exactly one <h4> (course title).
   * We seed from every <h4> and walk UP via getCardElement() until the parent
   * holds more than one <h4> — that parent is the shared grid, so the element
   * just below it is the individual card container (title + code + class +
   * time). This is far more reliable than the old text-anchor walk, which
   * sometimes stopped at an inner element that lacked the code or class.
   * ======================================================================== */

  // Resolve the card container that owns a given <h4>. Each card is detected
  // independently by walking UP until an ancestor's text contains a time range,
  // so SEMUA HARI mode (one grid container per day) works universally.
  function getCardElement(h4) {
    var node = h4;
    while (node && node.parentElement && node.parentElement !== document.body) {
      if (TIME_RE.test(node.textContent || "")) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  function findCards() {
    var headings = qsa('h4');
    var cards = [];
    var seen = [];
    for (var i = 0; i < headings.length; i++) {
      var h4 = headings[i];
      if (h4.closest && h4.closest('#' + PANEL_ID)) continue;
      var card = getCardElement(h4);
      if (!card || card === document.body || card === document.documentElement) continue;
      if (card.closest && card.closest('#' + PANEL_ID)) continue;
      if (seen.indexOf(card) === -1) {
        seen.push(card);
        cards.push(card);
      }
    }
    return cards;
  }

  /* ==========================================================================
   * 6. "Tampilkan Semua" (Requirement 2)
   * ==========================================================================
   * The pagination control is a <select>. We look for an <option> whose label
   * contains "Tampilkan Semua" or whose value is all / -1 / 1000, set the
   * select to it, and dispatch a bubbling "change" event so the site re-renders
   * the full list. No-op (returns false) when nothing matches.
   * ======================================================================== */

  function clickShowAll() {
    var selects = qsa('select');
    for (var s = 0; s < selects.length; s++) {
      var select = selects[s];
      var options = Array.prototype.slice.call(select.options || []);
      for (var o = 0; o < options.length; o++) {
        var opt = options[o];
        var val = String(opt.value || '').toLowerCase().trim();
        var label = String(opt.textContent || '').toLowerCase();
        if (label.indexOf('tampilkan semua') !== -1 ||
            val === 'all' || val === '-1' || val === '1000') {
          try {
            select.value = opt.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          } catch (e) {
            return false;
          }
        }
      }
    }
    return false;
  }

  /* ==========================================================================
   * 8. Filter + class matching (Requirements 1, 4)
   * ========================================================================== */

  // Inject the global stylesheet once (class-based, !important to survive Tailwind).
  function injectStyles() {
    if (document.getElementById('ubg-lk-style')) return;
    var css =
      '.ubg-lk-hidden{display:none !important;}';
    var style = makeEl('style', null, null, css);
    style.id = 'ubg-lk-style';
    (document.head || document.documentElement).appendChild(style);
  }

  // Requirement 1: hide/show must use BOTH the class and inline !important so
  // the Tailwind wrapper is really hidden; display is restored to "" to show.
  // Diff-based: only touch the DOM when the visibility state actually flips,
  // so a steady-state pass performs zero style writes (no forced reflow).
  function hideCard(card) {
    if (card.classList.contains('ubg-lk-hidden')) return; // already hidden — no-op
    card.classList.add('ubg-lk-hidden');
    try { card.style.setProperty('display', 'none', 'important'); } catch (e) { /* ignore */ }
    // If the card is the only child of its parent (not body), hide the parent
    // too so the grid cell collapses instead of leaving an empty slot.
    if (card.parentElement && card.parentElement.children.length === 1 &&
        card.parentElement !== document.body) {
      try { card.parentElement.style.setProperty('display', 'none', 'important'); } catch (e) { /* ignore */ }
    }
  }

  function showCard(card) {
    if (!card.classList.contains('ubg-lk-hidden')) return; // already visible — no-op
    card.classList.remove('ubg-lk-hidden');
    try { card.style.removeProperty('display'); } catch (e) { /* ignore */ }
    card.style.display = '';
    // Restore the parent too if we hid it.
    if (card.parentElement && card.parentElement.children.length === 1 &&
        card.parentElement !== document.body) {
      try { card.parentElement.style.removeProperty('display'); } catch (e) { /* ignore */ }
      card.parentElement.style.display = '';
    }
  }

  // Escape a string so it can be embedded literally in a RegExp.
  function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Does a card's uppercased text satisfy a saved class label?
  // Rules are substring-based and intentionally aggressive:
  //   saved "A"  -> "KELAS A" / "KELOMPOK A" / "KEL. A" / any "A1".."A9",
  //                 rejected when a DIFFERENT "KELAS <other>" is present.
  //   saved "A1" -> literal "A1" / "KELOMPOK 1" / "KEL. 1".
  function classMatches(upperText, savedKelas) {
    if (!savedKelas) return true;
    var isGroup = /\d/.test(savedKelas);
    if (isGroup) {
      var savedMain = savedKelas.replace(/\d.*$/, '');
      var savedNum = savedKelas.replace(savedMain, '');
      if (upperText.indexOf(savedKelas) !== -1) return true;
      if (upperText.indexOf('KELOMPOK ' + savedNum) !== -1) return true;
      if (upperText.indexOf('KEL. ' + savedNum) !== -1) return true;
      return false;
    } else {
      var letter = savedKelas;
      // Positive: "KELAS A", "KELOMPOK A", "KEL. A", or any A1..A9.
      var positive = (upperText.indexOf('KELAS ' + letter) !== -1) ||
                     (upperText.indexOf('KELOMPOK ' + letter) !== -1) ||
                     (upperText.indexOf('KEL. ' + letter) !== -1);
      for (var d = 1; d <= 9; d++) {
        if (upperText.indexOf(letter + d) !== -1) { positive = true; break; }
      }
      if (!positive) return false;
      // Negative: "KELAS B", "KELAS C", etc. (any letter other than `letter`).
      var others = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
      for (var o = 0; o < others.length; o++) {
        if (others[o] !== letter &&
            upperText.indexOf('KELAS ' + others[o]) !== -1) return false;
      }
      return true;
    }
  }

  // Which saved courses does a card match? Matching works on the uppercased
  // full card text: the code must appear as a substring, and (when a saved
  // entry specifies a class) the class must satisfy classMatches(). A blank
  // saved kelas matches any class for that course.
  function matchSaved(text) {
    var matches = [];
    var upper = (text || '').toUpperCase();
    for (var i = 0; i < state.courses.length; i++) {
      var c = state.courses[i];
      if (!c || !c.code) continue;

      // Code match: substring (case-insensitive via uppercased text).
      if (upper.indexOf(c.code.toUpperCase()) === -1) continue;

      // Class match.
      var savedKelas = (c.kelas || '').trim().toUpperCase();
      if (!savedKelas) {
        // Blank class = match all classes for this course.
        matches.push(c);
        continue;
      }

      if (classMatches(upper, savedKelas)) {
        matches.push(c);
      }
    }
    return matches;
  }

  function updateCounter(visible, total) {
    if (!counterEl) return;
    counterEl.textContent = 'Menampilkan ' + visible + ' dari ' + total + ' sesi';
  }

  // Main pass: parse cards -> filter -> counter.
  function reapply() {
    if (!panelReady || !document.body) return;

    var cards = findCards();

    // 1. Parse every card.
    var infos = [];
    for (var i = 0; i < cards.length; i++) {
      var el = cards[i];
      var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      var time = parseTimeRange(text);
      if (!time) continue;
      infos.push({
        el: el,
        text: text,
        time: time,
        matches: []
      });
    }

    // 2. Resolve saved-course matches.
    for (i = 0; i < infos.length; i++) {
      infos[i].matches = matchSaved(infos[i].text);
    }

    // Debug: how many cards were found, matched, and whether filtering is on.
    var filtering = state.filterOn && state.courses.length > 0;
    console.log('[UBG Labkom Helper] reapply: cards=' + infos.length +
      ', matched=' + infos.filter(function (i) { return i.matches.length > 0; }).length +
      ', filtering=' + filtering + ' (filterOn=' + state.filterOn + ')');

    // 4. Filter (Requirement 4: state.filterOn defaults on when courses exist).
    var visibleCount = 0;
    for (i = 0; i < infos.length; i++) {
      var visible = !filtering || infos[i].matches.length > 0;
      if (visible) showCard(infos[i].el);
      else hideCard(infos[i].el);
      if (visible) visibleCount++;
    }
    updateCounter(visibleCount, infos.length);
  }

  /* ==========================================================================
   * 9. MutationObserver + debounce
   * ========================================================================== */

  // Pick a sensible observation root: a likely schedule container, else <body>.
  // >>> ADJUST HERE if you want to scope observation more tightly. <<<
  function findContainer() {
    var candidates = [
      '#jadwal', '.jadwal', '[class*="jadwal"]', '[class*="schedule"]',
      'main', '.container'
    ];
    for (var i = 0; i < candidates.length; i++) {
      var el = null;
      try { el = document.querySelector(candidates[i]); } catch (e) { /* ignore */ }
      if (el) return el;
    }
    return document.body;
  }

  function scheduleReapply() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      debounceTimer = null;
      reapply();
    }, REAPPLY_DEBOUNCE_MS);
  }

  // Ignore mutations caused by our own injections to avoid feedback loops.
  function isOurMutation(m) {
    var target = m.target;
    if (target && target.nodeType === 1 && target.closest &&
        target.closest('#' + PANEL_ID)) {
      return true;
    }
    var nodes = [];
    var k;
    for (k = 0; k < m.addedNodes.length; k++) nodes.push(m.addedNodes[k]);
    for (k = 0; k < m.removedNodes.length; k++) nodes.push(m.removedNodes[k]);
    if (nodes.length === 0) return false;

    return nodes.every(function (n) {
      if (!n || n.nodeType !== 1) return false;
      return n.id === PANEL_ID;
    });
  }

  function startObserver() {
    var root = findContainer() || document.body;
    if (!root) return;

    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        if (!isOurMutation(mutations[i])) {
          scheduleReapply();
          return;
        }
      }
    });

    observer.observe(root, { childList: true, subtree: true });

    // Event delegation: only re-apply when a click targets an interactive
    // control outside our panel (day tab, pagination, etc.). scheduleReapply()
    // is already debounced, so no extra timers are needed.
    if (!clickDelegationAttached) {
      clickDelegationAttached = true;
      document.body.addEventListener('click', function (e) {
        var target = e.target;
        if (!target || !target.closest) return;
        if (target.closest('#' + PANEL_ID)) return;
        if (target.closest('button, a, select, [role="tab"]')) {
          scheduleReapply();
        }
      });
    }
  }

  /* ==========================================================================
   * 10. Bootstrap (Requirement 4: default filter state)
   * ========================================================================== */

  function init() {
    state.courses = loadCourses();

    // If we already have saved courses, filter immediately on load.
    state.filterOn = state.courses.length > 0;

    injectStyles();
    buildPanel();

    // Precursor to filtering: expand the paginated list once so the full set
    // can be filtered. Guarded so it never loops with the observer.
    if (!showAllTried) {
      showAllTried = true;
      clickShowAll();
    }

    // Single startup log line (kept quiet afterwards).
    console.log('[UBG Labkom Helper] active — ' + state.courses.length +
      ' saved course(s), filter ' + (state.filterOn ? 'ON' : 'OFF') + '.');

    // Initial pass + observe for day-tab switches and pagination changes.
    scheduleReapply();
    startObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
