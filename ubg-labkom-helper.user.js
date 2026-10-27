// ==UserScript==
// @name         UBG Labkom Schedule Helper
// @namespace    https://ubg.ac.id/labkom-helper
// @version      2.1.0
// @description  Filter the UBG Labkom schedule against a saved list of courses, then hand the picked rows straight to UBG Schedule.
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
 *   4. Class matching ................. matchSaved() / classMatches()  [section 7]
 *   5. Bridge to UBG Schedule ......... buildBridgePayload() / openInApp() [section 8]
 *   6. Default filter state ........... init()                         [section 10]
 *   7. Syntax verified with node --check (header is a comment).
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

  // Where the picked rows are handed off to.
  var APP_BASE_URL = 'https://ubgschedule.vercel.app/';
  var BRIDGE_PARAM = 'bridge';

  // Course-code pattern, e.g. IF184201 or IK1IW33005 (5-12 alphanumerics).
  // 5 is low enough for the short codes the portal issues for some faculties;
  // anything shorter is a class label, a room or a room number.
  var CODE_RE = /\b[A-Z0-9]{5,12}\b/;
  // Whole-token form used for strict code equality (requirements 1 + 2).
  var CODE_EXACT_RE = /^[A-Z0-9]{5,12}$/;
  // A class label: one section letter (the portal never issues past L) plus an
  // optional sub-group digit, e.g. "A" or "A1".
  var CLASS_TOKEN_RE = /^[A-L]\d{0,2}$/;
  var CLASS_LETTERS = 'ABCDEFGHIJKL';

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
  var bridgeBtn = null;    // "Buka di UBG Schedule" button
  var bridgeStatusEl = null; // small status line under the bridge button
  var matchedInfos = [];   // cards that satisfied the saved list in the last pass

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
  //
  // A course code must carry at least one digit. CODE_RE is deliberately loose
  // (5-12 alphanumerics) so short codes like TI201 survive, but loose alone
  // would accept the words the portal prints on every card ('KELAS', 'TEORI',
  // 'DOSEN', 'SENIN'). Every real UBG code mixes letters and digits, so
  // requiring a digit rejects that noise without narrowing real codes.
  function normaliseCourse(code, kelas) {
    code = (code || '').trim().toUpperCase().replace(/\s+/g, '');
    kelas = (kelas || '').trim().toUpperCase().replace(/^(?:KELAS|KELOMPOK|KEL\.?)\s*/, '');
    if (!code || !CODE_EXACT_RE.test(code)) return null;
    if (!/\d/.test(code)) return null;
    if (NOISE_WORD_RE.test(code)) return null;
    if (kelas && !CLASS_TOKEN_RE.test(kelas)) kelas = '';
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
   *
   * Every token is normalised before it is judged, so `CODE, A`, `CODE,A` and
   * `CODE A` all produce the same { code, kelas } pair: commas are stripped
   * from around the class and surrounding whitespace is trimmed first.
   *
   * Grammar, applied per comma-separated piece:
   *   - piece -> CODE [SEP CLASS]   where SEP is ',' or whitespace
   *   - a comma pair is only read as CODE,CLASS when the part after the comma
   *     is a valid class token for that code; otherwise both halves are read as
   *     separate course codes (so `TI201,TI202` pastes still work).
   *   - a whitespace pair (`CODE A`) needs an unambiguous CLASS token, so a
   *     second course code after a space never gets eaten as a class label.
   * Invalid tokens are skipped.
   */
  function parseBatch(text) {
    var out = [];

    function push(course) {
      if (!course) return;
      // Skip what is already saved AND what this same batch already produced,
      // so one paste never writes the same course twice.
      if (isDuplicate(course.code, course.kelas)) return;
      for (var i = 0; i < out.length; i++) {
        if (out[i].code === course.code && (out[i].kelas || '') === (course.kelas || '')) return;
      }
      out.push(course);
    }

    var chunks = String(text || '').split(/[\n;]+/);
    for (var c = 0; c < chunks.length; c++) {
      // Split the chunk into "code" and "code, class" pieces. Whitespace around
      // a comma is consumed by the separator, not left dangling in a token.
      var pieces = chunks[c].split(/\s*,\s*/);
      for (var p = 0; p < pieces.length; p++) {
        var piece = pieces[p].trim();
        if (!piece) continue;

        if (p > 0) {
          // The previous piece was a bare code. If THIS piece is a class label,
          // it belongs to that code; otherwise it stands on its own.
          var prev = out[out.length - 1];
          if (isClassToken(piece)) {
            var normalised = normaliseClass(piece);
            if (prev && !prev.kelas) {
              prev.kelas = normalised;
              continue;
            }
            if (prev && prev.kelas && prev.kelas === normalised) continue; // duplicate pair
          }
          pushCode(piece);
          continue;
        }

        pushCode(piece);
      }
    }

    function pushCode(piece) {
      // `CODE CLASS` written with a space. Only the FIRST run of non-space
      // characters can be the code; the rest must be a class label.
      var words = piece.split(/\s+/).filter(Boolean);
      if (words.length === 0) return;
      if (words.length === 1) {
        push(normaliseCourse(words[0], ''));
        return;
      }
      if (!isClassToken(words[words.length - 1])) {
        // Trailing word is not a class label (a second code, an annotation).
        for (var w = 0; w < words.length; w++) push(normaliseCourse(words[w], ''));
        return;
      }
      var tail = words.pop();
      if (!isClassToken(tail)) return;
      if (words.length === 1) {
        push(normaliseCourse(words[0], tail));
        return;
      }
      // More than two words: `CODE , A` style head plus a class tail is still
      // readable, but only when the head collapses to one code.
      var joined = words.join('');
      if (CODE_EXACT_RE.test(joined) && /\d/.test(joined) && !NOISE_WORD_RE.test(joined)) {
        push(normaliseCourse(joined, tail));
        return;
      }
      for (var v = 0; v < words.length; v++) push(normaliseCourse(words[v], ''));
    }

    return out;
  }

  // A class label is a section letter A-L plus at most two digits, e.g. "A",
  // "C1", "A10". Anything else is not a class label.
  function normaliseClass(token) {
    return String(token || '').trim().toUpperCase().replace(/^(?:KELAS|KELOMPOK|KEL\.?)\s*/, '');
  }

  function isClassToken(token) {
    return CLASS_TOKEN_RE.test(normaliseClass(token));
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

    // ---- Bridge to UBG Schedule (section 9) -------------------------------
    bridgeBtn = makeEl('button', null, {
      width: '100%', padding: '10px', border: 'none', borderRadius: '8px',
      cursor: 'pointer', fontWeight: '700', fontSize: '13px',
      textAlign: 'center', color: '#ffffff', background: '#9ca3af'
    }, 'Buka di UBG Schedule');
    bridgeBtn.type = 'button';
    bridgeBtn.disabled = true;
    bridgeBtn.title = 'Kirim kartu yang tampil ke UBG Schedule';
    bridgeBtn.addEventListener('click', openInApp);

    bridgeStatusEl = makeEl('div', null, {
      fontSize: '11px', color: '#6b7280', textAlign: 'center', lineHeight: '1.3'
    }, 'Belum ada MK tersimpan.');

    body.appendChild(batchArea);
    body.appendChild(addBatchBtn);
    body.appendChild(globalWrap);
    body.appendChild(filterBtn);
    body.appendChild(actionWrap);
    body.appendChild(listEl);
    body.appendChild(counterEl);
    body.appendChild(bridgeBtn);
    body.appendChild(bridgeStatusEl);

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

  // Resolve the card container that owns a given <h4>.
  //
  // The walk stops at the FIRST ancestor that is a single card. A single card
  // holds exactly one <h4> (its course title); the shared grid holds one <h4>
  // per card, so an ancestor with more than one <h4> has already climbed past
  // the card and must never be returned. The climb additionally stops at the
  // first ancestor carrying a time range, so the card stays scoped to the
  // smallest container that holds both its title and its session time, and it
  // never swallows a sibling card.
  function getCardElement(h4) {
    var node = h4;
    while (node && node.parentElement && node.parentElement !== document.body) {
      var parent = node.parentElement;
      // Climbing to an ancestor with a second <h4> would leave the card. When
      // that ancestor is the immediate parent and we are still standing on the
      // seed heading, there is no per-card container at all: the headings are
      // grid children, so report null rather than treating one heading as a card.
      if (countHeadings(parent) > 1) return node === h4 ? null : node;
      node = parent;
      if (countHeadings(node) > 1) return null; // grid reached first: no card
      if (TIME_RE.test(node.textContent || '')) return node;
    }
    return null;
  }

  // Number of <h4> elements inside an element (0 when the selector is invalid).
  function countHeadings(el) {
    if (!el) return 0;
    try {
      return el.querySelectorAll('h4').length;
    } catch (e) {
      return 0;
    }
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
   * 7. Filter + class matching (Requirements 1, 4)
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

  // Words that introduce a room name. A class-shaped token sitting right after
  // one of these is a room, never a class: 'LAB A1' must not satisfy class A.
  var ROOM_WORD_RE = /^(?:LAB|LABORATORIUM|LABKOM|RUANG|RUANGAN|ROOM|R|GD|GEDUNG|LT|LANTAI)$/;
  // Words that introduce a section label. KELAS/KEL name the section itself;
  // KELOMPOK names a practical sub-group, which only speaks for the section when
  // the card prints no explicit KELAS field (see classMatches).
  var SECTION_WORD_RE = /^(?:KELAS|KEL)$/;
  var GROUP_WORD_RE = /^(?:KELOMPOK)$/;
  // Any word that introduces a section-or-group label.
  var CLASS_WORD_RE = /^(?:KELAS|KELOMPOK|KEL)$/;
  // Tokens we must never mistake for a class label or a course code.
  var NOISE_WORD_RE = /^(?:TEORI|PRAKTIKUM|PRAK|DOSEN|PENGAMPUH|SKS|SMT|SEMESTER|SEM|HARI|JAM|SESI|ONLINE|OFFLINE|BLENDED|SENIN|SELASA|RABU|KAMIS|JUMAT|SABTU|MINGGU)$/;

  /*
   * Tokenise a card's uppercased text into candidate class labels.
   * A token is a class label when it is one letter A-L plus at most two digits
   * ('A', 'C1', 'A10'), or a bare 1-2 digit group number right after a section
   * word ('KELOMPOK 1'). Each entry records whether a section word introduced
   * it (`labelled`), whether that word was KELOMPOK rather than KELAS (`group`),
   * and whether a room word did (`roomy`) so callers can tell a real class from
   * a room code (#A1 in 'LAB A1').
   */
  function collectClassLabels(upperText) {
    var tokens = segmentTokens(String(upperText || '').toUpperCase());
    var out = [];
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      if (!token) continue;
      var prev = i > 0 ? tokens[i - 1] : '';
      var labelled = CLASS_WORD_RE.test(prev);
      // KELOMPOK names a practical sub-group, not the section itself.
      var group = GROUP_WORD_RE.test(prev);
      var roomy = ROOM_WORD_RE.test(prev);
      var m = token.match(/^([A-Z])(\d{0,2})$/);
      if (m) {
        if (m[1] === 'S' && token === 'SKS') continue; // never a class
        out.push({ letter: m[1], num: m[2], labelled: labelled, group: group, roomy: roomy });
        continue;
      }
      // 'KELOMPOK 1' / 'KEL. 1' carry no letter, only a group number.
      if (labelled && /^\d{1,2}$/.test(token)) {
        out.push({ letter: '', num: token, labelled: true, group: group, roomy: false });
      }
    }
    return out;
  }

  /*
   * Does a card's uppercased text satisfy a saved class label (#1, #4)?
   *
   * Fail-closed rules, in order:
   *   1. The saved label must itself be valid: one letter A-L plus up to two
   *      digits. 'Z', 'AA', '12' are rejected outright.
   *   2. A section label beyond L in the card ('KELAS Z') rejects the card: the
   *      portal never issues sections past L, so that card is not ours.
   *   3. An explicit KELAS/KEL field is the card's own section and settles the
   *      match on its own. A KELOMPOK label names a practical sub-group inside
   *      that section, so when a card carries both, the KELOMPOK must never make
   *      a different section look like the saved one ('KELAS: B ... Kelompok A2'
   *      is section B, not section A). KELOMPOK labels only decide the match
   *      when the card prints no explicit KELAS field.
   *   4. With no explicit label, only an exact standalone token counts: saved
   *      'A1' matches the bare token 'A1', while saved 'A' does NOT match it,
   *      because a bare 'A1' is a sub-group or a room, not section A.
   */
  function classMatches(upperText, savedKelas) {
    if (!savedKelas) return true;
    var saved = String(savedKelas).trim().toUpperCase()
      .replace(/^(?:KELAS|KELOMPOK|KEL\.?)\s*/, '');
    var m = saved.match(/^([A-L])(\d{0,2})$/);
    if (!m) return false; // unknown label shape -> no match
    var letter = m[1];
    var num = m[2];

    var labels = collectClassLabels(upperText);

    // A labelled section outside A-L means this card belongs to some other
    // programme's section scheme; it can never match a valid saved label.
    for (var i = 0; i < labels.length; i++) {
      if (labels[i].labelled && labels[i].letter && CLASS_LETTERS.indexOf(labels[i].letter) === -1) {
        return false;
      }
    }

    var allLabelled = labels.filter(function (l) { return l.labelled && !l.roomy; });
    // An explicit KELAS wins over any KELOMPOK: it is the card's own section.
    var explicitSections = allLabelled.filter(function (l) { return !l.group; });
    var labelled = explicitSections.length > 0 ? explicitSections : allLabelled;

    if (labelled.length > 0) {
      if (num) {
        // Saved 'A1' -> 'KELAS A1' / 'KELOMPOK A1' / 'KELOMPOK 1'.
        return labelled.some(function (l) {
          return l.num === num && (l.letter === letter || l.letter === '');
        });
      }
      // Saved 'A' -> any labelled group of section A, including 'KELAS A1'.
      return labelled.some(function (l) { return l.letter === letter && !NOISE_WORD_RE.test(l.num); });
    }

    // No explicit section label anywhere on the card.
    return labels.some(function (l) {
      if (l.roomy) return false;               // 'LAB A1' is a room, not a class
      if (l.letter !== letter) return false;
      if (num) return l.num === num;           // bare 'A1' satisfies saved 'A1'
      return l.num === '';                     // bare 'A' satisfies saved 'A' only
    });
  }

  // Field-label words, used to recover a code boundary when the portal glues a
  // code to its next label with no whitespace between text nodes (textContent
  // then yields 'IF184201KELAS').
  var LABEL_WORD_ALT = '(?:KODE(?:MK)?|KELAS|KELOMPOK|KEL|SKS|SMT|SEMESTER|DOSEN|PENGAMPUH|HARI|JAM|SESI|RUANG|RUANGAN|ROOM|LOKASI|KETERANGAN|JENIS|TIPE|TEORI|PRAKTIKUM|PRAK|LABORATORIUM|LABKOM|LAB|ONLINE|OFFLINE|BLENDED|SENIN|SELASA|RABU|KAMIS|JUMAT|SABTU|MINGGU)';
  var LABEL_START_RE = new RegExp('^' + LABEL_WORD_ALT);

  // Anything that is not a letter or a digit separates two values on a card.
  // A course code that ends at one of these is complete; a code followed by an
  // alphanumeric character is the head of a longer token and must not match
  // ('TI101' must not satisfy 'TI10199').
  var CODE_DELIM_RE = /[^A-Z0-9]/;

  // Study-program marker. textContent glues the prodi span to the code span with
  // no whitespace, so <span>S1 TI</span><span>TI1UW3103</span> reads
  // 'S1TITI1UW3103' and the code arrives welded to the prodi name. Every prodi
  // the portal prints starts with a jenjang marker: S1 (sarjana), D3, D4.
  var PRODI_GLUE_RE = /(?:S1|D3|D4)[A-Z]+$/;
  // A token that contains a prodi marker followed by letters and digits is a
  // glued prodi+code pair. Where the programme name ends and the code begins is
  // ambiguous from textContent alone, so extractKodeMk() refuses to guess on
  // these tokens and the matched saved course supplies the real code instead.
  var PRODI_GLUED_RE = /(?:S1|D3|D4)[A-Z]+\d[A-Z0-9]*$/;
  // The same marker at the START of a glued pair: what follows a word like
  // 'TEORI' or 'SENIN' when the next sibling <span> is a prodi+code span.
  var PRODI_GLUE_START_RE = /^(?:S1|D3|D4)[A-Z]/;

  /*
   * Does `name` appear in `upper` as a word, allowing for the glue?
   *
   * textContent joins sibling elements with nothing between them, so a word the
   * portal prints as its own element ends up welded to whatever came next:
   * 'Kuliah Teori' + 'S1 TI' reads 'KULIAH TEORIS1TI...' and a day heading reads
   * 'SENIN08:00'. A plain \b test fails on both, because 'S' and '0' are word
   * characters. A boundary therefore holds when the neighbouring character is
   * not a letter, or when the character after the word begins a prodi marker,
   * which is the one thing that is genuinely welded to the left of a card's
   * metadata rather than part of the word itself.
   */
  function hasBoundedMarker(upper, name) {
    var from = 0;
    var at;
    while ((at = upper.indexOf(name, from)) !== -1) {
      from = at + 1;
      var before = at === 0 ? '' : upper.charAt(at - 1);
      if (before !== '' && /[A-Z]/.test(before)) continue;
      var after = upper.slice(at + name.length);
      var next = after.charAt(0);
      if (next !== '' && /[A-Z]/.test(next) && !PRODI_GLUE_START_RE.test(after)) continue;
      return true;
    }
    return false;
  }

  /*
   * Does the alphanumeric run immediately before `at` end with a prodi marker?
   * That is the only way a code may be welded to something on its left: a
   * prodi name ('S1SASTRAINGGRISSSKI3214'), not an arbitrary longer code.
   */
  function prodiGlueBefore(text, at) {
    var i = at;
    while (i > 0 && !CODE_DELIM_RE.test(text.charAt(i - 1))) i--;
    return PRODI_GLUE_RE.test(text.slice(i, at));
  }

  /*
   * Word tokens: split on anything that is not a letter or a digit, preserving
   * the original case so field values read as printed.
   */
  function segmentTokens(text) {
    var raw = String(text || '').split(/[^A-Za-z0-9]+/);
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      if (raw[i]) out.push(raw[i]);
    }
    return out;
  }

  /*
   * Course-code equality, widened for the portal's glued textContent.
   *
   * A saved code must still never be satisfied by a code it merely sits inside:
   * saved 'IF1842' must not be met by a card carrying 'IF184201'. Three shapes
   * are accepted, in order:
   *
   *   1. Exact whole token - 'IF184201' in 'KODE MK: IF184201 KELAS A'.
   *   2. Code followed by a known label word with no separator - textContent
   *      drops the whitespace between sibling <span>s, so a code followed by
   *      'KELAS' reads 'IF184201KELAS'. The remainder must be a label word, so
   *      a longer code ('IF1842019') is not accepted.
   *   3. Prodi welded in FRONT of the code - the same gluing on the other side.
   *      <span>S1 TI</span><span>TI1UW3103</span> reads 'S1TITI1UW3103', and
   *      <span>S1 SASTRA INGG</span><span>SSKI3214</span> reads
   *      'S1SASTRAINGGRISSSKI3214'. Accepted when the text directly after the
   *      code is a delimiter or a label word AND the alphanumeric run directly
   *      before it ends with a prodi marker.
   *
   * The right boundary is what keeps the widening honest: 'TI101' does not match
   * 'TI10199', because a digit follows the code and continues a longer one
   * rather than a delimiter ending it. The left boundary keeps a code from being
   * read out of the tail of an arbitrary identifier: '184201' does not match
   * 'IF184201'.
   */
  function hasCodeToken(upperText, code) {
    var target = String(code || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!target) return false;
    var text = String(upperText || '').toUpperCase();
    var tokens = segmentTokens(text);
    var i;

    // 1 and 2: whole token, or code + label word welded together.
    for (i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      if (token === target) return true;
      if (token.length > target.length &&
          token.slice(0, target.length) === target &&
          LABEL_START_RE.test(token.slice(target.length))) {
        return true;
      }
    }

    // 3: prodi welded in front of the code.
    var from = 0;
    var at;
    while ((at = text.indexOf(target, from)) !== -1) {
      from = at + 1;
      var after = text.charAt(at + target.length);
      // A code ends at a delimiter or runs into a label word. Anything else
      // after it means the saved code is only a part of a longer one.
      if (after !== '' && !CODE_DELIM_RE.test(after) &&
          !LABEL_START_RE.test(text.slice(at + target.length))) {
        continue;
      }
      var before = text.charAt(at - 1);
      // On its left the code is preceded by a delimiter (already a whole token,
      // handled above) or by the prodi name the portal welded to it.
      if (before !== '' && !CODE_DELIM_RE.test(before) && !prodiGlueBefore(text, at)) {
        continue;
      }
      return true;
    }
    return false;
  }

  // Which saved courses does a card match? The code must appear as a whole
  // token (see hasCodeToken) and, when a saved entry specifies a class, the
  // card must satisfy classMatches(). A blank saved kelas matches any class.
  function matchSaved(text, courses) {
    var list = courses || state.courses;
    var matches = [];
    var upper = (text || '').toUpperCase();
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (!c || !c.code) continue;

      // Exact-token code match (never a substring).
      if (!hasCodeToken(upper, c.code)) continue;

      // Class match.
      var savedKelas = (c.kelas || '').trim().toUpperCase();
      if (!savedKelas) {
        matches.push(c);
        continue;
      }

      if (classMatches(upper, savedKelas)) {
        matches.push(c);
      }
    }
    return matches;
  }

  /*
   * Pure filter core (Requirement 1, fail closed).
   *
   * Input is one entry per card: { text, title }. Nothing here touches the DOM,
   * so the node suite can drive every branch.
   *
   * A card is `parsed` only when it carries BOTH a title and a time range; a
   * card that cannot be parsed is never visible while filtering is on. A parsed
   * card is visible only when it matched a saved course, or when filtering is
   * off. A card that matched nothing is hidden, not shown.
   */
  function evaluateCardEntries(entries, options) {
    var opts = options || {};
    var filtering = !!opts.filtering;
    var courses = opts.courses || [];
    var out = [];
    for (var i = 0; i < (entries || []).length; i++) {
      var entry = entries[i] || {};
      var text = String(entry.text || '').replace(/\s+/g, ' ').trim();
      var title = String(entry.title || '').replace(/\s+/g, ' ').trim();
      var time = parseTimeRange(text);
      var parsed = !!(text && title && time);
      var matches = parsed ? matchSaved(text, courses) : [];
      var matched = parsed && matches.length > 0;
      out.push({
        parsed: parsed,
        time: time,
        matches: matches,
        matched: matched,
        visible: !filtering || matched
      });
    }
    return out;
  }

  function updateCounter(visible, total) {
    if (!counterEl) return;
    counterEl.textContent = 'Menampilkan ' + visible + ' dari ' + total + ' sesi';
  }

  /*
   * Read the CURRENT DOM once: find every card, flatten its text, and evaluate
   * it against the active filter. No visibility changes happen here, so callers
   * can reuse the same evaluation for filtering (reapply) and for the bridge
   * (a fresh scrape at hand-off time).
   */
  function evaluateCurrentCards() {
    var cards = findCards();
    var filtering = state.filterOn && state.courses.length > 0;
    var entries = [];
    for (var i = 0; i < cards.length; i++) {
      var el = cards[i];
      var titleEl = el.querySelector && el.querySelector('h4');
      entries.push({
        el: el,
        text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
        title: titleEl ? (titleEl.textContent || '').replace(/\s+/g, ' ').trim() : ''
      });
    }
    var results = evaluateCardEntries(entries, { filtering: filtering, courses: state.courses });
    return { entries: entries, results: results, filtering: filtering };
  }

  // Project an evaluation into the { el, text, title, time, matches } records the
  // bridge scrapes. Only cards that MATCHED are kept.
  function collectMatchedInfos(evaluation) {
    var out = [];
    for (var i = 0; i < evaluation.results.length; i++) {
      if (!evaluation.results[i].matched) continue;
      out.push({
        el: evaluation.entries[i].el,
        text: evaluation.entries[i].text,
        title: evaluation.entries[i].title,
        time: evaluation.results[i].time,
        matches: evaluation.results[i].matches
      });
    }
    return out;
  }

  /*
   * Re-scan the live view and refresh `matchedInfos`.
   *
   * The grid can repaint between the last reapply() and a bridge click (day tab,
   * pagination, the site re-rendering after 'Tampilkan Semua'), which leaves the
   * cached element references pointing at detached nodes. Re-running the scan at
   * hand-off time is what keeps the payload equal to what the user actually sees.
   */
  function refreshMatchedInfos() {
    if (!document || !document.body) return matchedInfos;
    matchedInfos = collectMatchedInfos(evaluateCurrentCards());
    return matchedInfos;
  }

  // Main pass: parse cards -> filter -> counter.
  //
  // Fail closed (Requirement 1): a card is shown ONLY when it was parsed
  // successfully AND matched a saved course. Anything else - unparsable text, a
  // missing <h4> title, a card that would not resolve to its own container - is
  // hidden. A card we cannot prove is the user's must never leak into the
  // filtered view, because the view is used to pick the rows the schedule is
  // built from.
  function reapply() {
    if (!panelReady || !document.body) return;

    var evaluation = evaluateCurrentCards();
    var entries = evaluation.entries;
    var results = evaluation.results;
    var filtering = evaluation.filtering;

    var visibleCount = 0;
    var matchedCount = 0;
    matchedInfos = collectMatchedInfos(evaluation);
    for (var i = 0; i < results.length; i++) {
      var result = results[i];
      var card = entries[i].el;
      if (result.matched) matchedCount++;
      if (result.visible) {
        showCard(card);
        visibleCount++;
      } else {
        hideCard(card);
      }
    }

    console.log('[UBG Labkom Helper] reapply: cards=' + results.length +
      ', parsed=' + results.filter(function (x) { return x.parsed; }).length +
      ', matched=' + matchedCount +
      ', visible=' + visibleCount +
      ', filtering=' + filtering + ' (filterOn=' + state.filterOn + ')');

    updateCounter(visibleCount, results.length);
    updateBridgeUI();
  }

  /* ==========================================================================
   * 8. Bridge to UBG Schedule (Jalur 2)
   * ==========================================================================
   * The filtered view already holds exactly the sessions the student picked.
   * This section scrapes those cards into the two shapes the web app stores
   * (DataTeoriMentah for theory, PraktikumCandidate for practicals), encodes
   * them into the URL hash and opens the app on step 3, so nobody has to upload
   * a file or re-pick a class by hand.
   * ======================================================================== */

  var HARI_LIST = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];

  // Label words the portal prints on a card, longest first so 'KETERANGAN' wins
  // over 'KET' and 'KELOMPOK' over 'KEL'. Each maps to the field it introduces.
  var CARD_LABEL_RE = new RegExp(
    '(?:^|[^A-Z0-9])(' +
    'DOSEN\\s*PENGAMPUH|KODE\\s*MK|KETERANGAN|PENGAMPUH|KELOMPOK|SEMESTER|RUANGAN|KODEMK|KELAS|DOSEN|RUANG|LOKASI|JENIS|TIPE|HARI|JAM|SESI|SKS|SMT|KET|KEL' +
    ')(?![A-Z0-9])\\s*:?',
    'gi'
  );
  var CARD_LABEL_KEYS = {
    KODEMK: 'kodeMk', KODE_MK: 'kodeMk',
    KELAS: 'kelas', KELOMPOK: 'kelas', KEL: 'kelas',
    SKS: 'sks', SMT: 'smt', SEMESTER: 'smt',
    DOSEN: 'dosen', PENGAMPUH: 'dosen', DOSEN_PENGAMPUH: 'dosen',
    HARI: 'hari', JAM: 'jam', SESI: 'jam',
    RUANG: 'ruang', RUANGAN: 'ruang', LOKASI: 'ruang',
    KETERANGAN: 'keterangan', KET: 'keterangan', JENIS: 'keterangan', TIPE: 'keterangan'
  };

  // SKS badge shape: the portal prints the credit count BEFORE the word, e.g.
  // '3 SKS' or '3SKS'. CARD_LABEL_RE reads the value AFTER 'SKS', so a bare
  // badge leaves the field empty; this pattern recovers the count from the
  // badge itself. Case-insensitive to match the portal's mixed casing.
  var SKS_BADGE_RE = /(\d+)\s*SKS\b/i;
  // Label words that introduce the same field but read differently. The
  // semester is the case that matters: the portal prints a 'Semester 3' badge
  // next to the code AND an explicit 'SMT: 3' field. Either can appear alone, so
  // both must claim the field, and the first one to appear wins.
  var CARD_LABEL_SYNONYMS = {
    SEMESTER: 'SMT',
    KODEMK: 'KODE_MK',
    KELOMPOK: 'KELAS', KEL: 'KELAS',
    PENGAMPUH: 'DOSEN', DOSEN_PENGAMPUH: 'DOSEN',
    SESI: 'JAM',
    RUANGAN: 'RUANG', LOKASI: 'RUANG',
    KETERANGAN: 'KET', JENIS: 'KET', TIPE: 'KET'
  };

  /*
   * Split a card's flattened text into labelled field segments and return
   * { kodeMk, kelas, sks, smt, dosen, hari, jam, ruang, keterangan }.
   *
   * Values are sliced out of the ORIGINAL text between two labels, so inner
   * punctuation survives ('PRAKTIKUM - Kelompok A1' keeps its dash).
   *
   * Only the FIRST label to claim a field supplies its value. A later label for
   * a field already claimed still ends the value before it, because that is what
   * stops the field in front of it running on: on a card carrying both the
   * 'Semester 1' badge and an explicit 'SMT: 1', the SKS before them would
   * otherwise swallow 'SMT: 1' whole.
   *
   * A repeat bounds a value ONLY when it is written as a field, i.e. followed by
   * a colon. Label words are matched case-insensitively, so without that
   * condition prose inside a value would cut itself off: the lecturer named
   * 'Dosen Satu' re-matches 'DOSEN', and 'KETERANGAN: PRAKTIKUM - Kelompok A1'
   * re-matches 'KELOMPOK'. Neither carries a colon, so neither is a boundary, and
   * the values stay whole.
   */
  function extractCardFields(rawText) {
    var text = String(rawText || '');
    var accepted = [];
    var seen = {};
    var m;
    CARD_LABEL_RE.lastIndex = 0;
    while ((m = CARD_LABEL_RE.exec(text)) !== null) {
      var word = m[1].toUpperCase().replace(/\s+/g, '_');
      var key = CARD_LABEL_KEYS[word];
      // A label word with no mapped field is skipped; the scan keeps moving.
      if (!key) {
        if (m.index === CARD_LABEL_RE.lastIndex) CARD_LABEL_RE.lastIndex++;
        continue;
      }
      var canonical = CARD_LABEL_SYNONYMS[word] || word;
      var claimed = !!seen[canonical];
      if (!claimed) seen[canonical] = true;
      var asField = /:$/.test(m[0]);
      // A repeat that is not written as a field is prose inside the value that
      // contains it, so it neither claims the field nor ends the value.
      if (claimed && !asField) {
        if (m.index === CARD_LABEL_RE.lastIndex) CARD_LABEL_RE.lastIndex++;
        continue;
      }
      accepted.push({
        key: key,
        claimed: claimed,
        labelStart: m.index,
        valueStart: m.index + m[0].length
      });
      if (m.index === CARD_LABEL_RE.lastIndex) CARD_LABEL_RE.lastIndex++;
    }

    var out = {};
    for (var i = 0; i < accepted.length; i++) {
      var start = accepted[i].valueStart;
      // A value ends where the NEXT label begins, not where its value begins:
      // the next label's own text and colon belong to the separator.
      var end = i + 1 < accepted.length ? accepted[i + 1].labelStart : text.length;
      var value = text.slice(start, end)
        .replace(/^[\s:;|,\-\u2013\u2014\u2022\u00b7]+/, '')
        .replace(/[\s:;|\u2022\u00b7]+$/, '')
        .trim();
      if (accepted[i].claimed) continue;
      // The semester reads as a bare digit; the badge is spaced, the field colon'd.
      if (accepted[i].key === 'smt') value = (value.match(/\d+/) || [''])[0];
      // SKS likewise reduces to its count: on 'KELAS: A 3 SKS' the value after
      // the label word runs on to the next label ('HARI: Senin'), which carries
      // no count, so the field reads empty and the badge below supplies it.
      if (accepted[i].key === 'sks') value = (value.match(/\d+/) || [''])[0];
      // The class is a single section token; a trailing SKS badge ('3 SKS')
      // often trails the value when the card prints them adjacent, so keep only
      // the first token and never fold the credit count into the class.
      if (accepted[i].key === 'kelas') value = value.split(/\s+/)[0] || '';
      out[accepted[i].key] = value;
    }

    // SKS badge fallback: a card that prints '3 SKS' (or '3SKS') rather than an
    // explicit 'SKS: 3' field carries no value after the label, so read the
    // count from the badge. An explicit 'SKS:' field still wins.
    if (!out.sks) {
      var badge = SKS_BADGE_RE.exec(text);
      if (badge) out.sks = badge[1];
    }
    return out;
  }

  /*
   * Drop the card's own course name from its flattened text.
   *
   * textContent concatenates every text node in the card, so the <h4> title sits
   * inside the same string the field labels are read from. With no label after
   * the last one, a value runs to the end of the string and swallows the title:
   * 'Semester 3' + title yields smt '3Speaking for Global Context'. Removing the
   * title first leaves '3'. Occurrences are removed without a RegExp so a title
   * carrying regex metacharacters (parentheses, a slash) is still literally
   * matched.
   */
  function stripCardTitle(text, title) {
    var name = String(title || '').trim();
    if (!name) return String(text || '');
    var hay = String(text || '');
    var needle = name.toLowerCase();
    var lower = hay.toLowerCase();
    var out = '';
    var from = 0;
    var at;
    while ((at = lower.indexOf(needle, from)) !== -1) {
      out += hay.slice(from, at);
      from = at + needle.length;
    }
    return out + hay.slice(from);
  }


  // Whole-word lab markers. Same intent as isLabLabel() in the web app: 'Prak'
  // and 'Praktikum' and 'Lab' plus real lab room names mark a practical. The
  // `i` flag matters: values arrive in the case the portal printed them.
  var LAB_MARK_RE = /\b(?:PRAKTIKUM|PRAK|LABORATORIUM|LABKOM|LAB)\b/i;

  // Uppercase a token and drop the trailing colon the portal likes to print.
  function cleanToken(token) {
    return String(token || '').replace(/[:\u00A0]+$/g, '').trim().toUpperCase();
  }

  // Normalise any time range to the app's 'HH.MM-HH.MM' shape.
  function normaliseJam(text) {
    var m = TIME_RE.exec(String(text || ''));
    if (!m) return '';
    var pad = function (v) { return v.length === 1 ? '0' + v : v; };
    return pad(m[1]) + '.' + m[2] + '-' + pad(m[3]) + '.' + m[4];
  }

  // First day name that appears on the card as its own word.
  //
  // textContent welds a day heading to the element that follows it, so a plain
  // \b test misses 'SENIN08:00'. See hasBoundedMarker().
  function extractHari(text) {
    var upper = String(text || '').toUpperCase();
    for (var i = 0; i < HARI_LIST.length; i++) {
      if (hasBoundedMarker(upper, HARI_LIST[i])) {
        return HARI_LIST[i].charAt(0) + HARI_LIST[i].slice(1).toLowerCase();
      }
    }
    return '';
  }

  // Room as printed: 'R.301', 'LAB 1', 'RUANG TEORI 2'. Prefers the labelled
  // segment, then a token that looks like a room, and refuses to guess.
  function extractRuang(text, labelled) {
    if (labelled) return labelled;
    var tokens = String(text || '').split(/\s+/).filter(Boolean);
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (/^(?:R|GD|LT)\.\d+[A-Z0-9]*$/i.test(t)) return t.toUpperCase();
      if (/^(?:RUANG|RUANGAN|ROOM|LAB|LABORATORIUM|LABKOM|GEDUNG|LANTAI|LT|GD|R)\.?$/i.test(t)) {
        var next = tokens[i + 1] || '';
        return (t + (next ? ' ' + next : '')).toUpperCase();
      }
    }
    return '';
  }

  // A run that STARTS with a label word and continues past it is that label
  // welded to the value after it ('Kuliah Teori' + 'S1 TI' reads 'TEORIS1TI'),
  // never a course code.
  var LABEL_HEAD_RE = new RegExp('^' + LABEL_WORD_ALT + '|^KULIAH');

  // First whole alphanumeric run that is a plausible course code.
  //
  // Runs are split on delimiters first, so a code welded into a longer run is
  // never returned as a fragment of itself. A run carrying a prodi marker
  // followed by letters and digits is a prodi+code pair the DOM welded together
  // ('S1TITI1UW3103'). Where the programme name ends and the code begins cannot
  // be told from textContent alone, so guessing would mint a code that does not
  // exist; these runs are skipped and the caller falls back to the saved
  // course's own code, which is what the card matched on.
  function extractKodeMk(text) {
    var runs = segmentTokens(String(text || '').toUpperCase());
    for (var i = 0; i < runs.length; i++) {
      var run = runs[i];
      if (!CODE_EXACT_RE.test(run)) continue;
      // Reject runs that are only digits (SKS/SMT/room numbers) and the
      // day/noise words, so the code is the real course identifier.
      if (!/\d/.test(run)) continue;
      if (/^\d+$/.test(run)) continue;
      if (NOISE_WORD_RE.test(run)) continue;
      if (HARI_LIST.indexOf(run) !== -1) continue;
      if (PRODI_GLUED_RE.test(run)) continue;
      if (LABEL_HEAD_RE.test(run)) continue;
      return run;
    }
    return '';
  }

  // A card is practical when its room or keterangan carries a lab marker.
  function isPraktikumCard(ruang, keterangan, mataKuliah) {
    return LAB_MARK_RE.test(String(ruang || '')) ||
           LAB_MARK_RE.test(String(keterangan || '')) ||
           LAB_MARK_RE.test(String(mataKuliah || ''));
  }

  /*
   * Row type as the card itself prints it: 'PRAKTIKUM', 'TEORI' or ''.
   *
   * The portal heads every card with 'Kuliah Teori' or 'Kuliah Praktikum', but
   * textContent welds that heading to the prodi and code that follow it, so the
   * type arrives as 'KULIAH TEORIS1TITI1UW3103'. A plain \b test sees no
   * boundary between 'TEORI' and 'S1' and misses a type the card plainly states.
   * See hasBoundedMarker().
   */
  function cardRowType(text) {
    var upper = String(text || '').toUpperCase();
    if (hasBoundedMarker(upper, 'PRAKTIKUM')) return 'PRAKTIKUM';
    if (hasBoundedMarker(upper, 'TEORI')) return 'TEORI';
    return '';
  }

  // Scrape one matched card into the flat field set the bridge needs. The
  // returned keys are the bridge's own neutral shape; buildPayloadFromCards()
  // projects them into DataTeoriMentah or PraktikumCandidate.
  function scrapeCard(info) {
    var text = info.text || '';
    // The card's own <h4> is the course name. A card without one is not a card
    // we can name, so it is skipped rather than labelled with its code.
    var mataKuliah = info.title || '';
    // The title is a text node inside the card, so it also sits in `text` and
    // would bleed into the last labelled value. Read the fields from text with
    // the title removed; keep the untouched text for time, day and row type,
    // which are positional and unaffected.
    var fieldsText = stripCardTitle(text, mataKuliah);
    var labelled = extractCardFields(fieldsText);
    var saved = (info.matches && info.matches[0]) || {};
    var kodeMk = labelled.kodeMk && CODE_EXACT_RE.test(String(labelled.kodeMk).split(/\s+/)[0])
      ? String(labelled.kodeMk).split(/\s+/)[0].toUpperCase()
      : '';
    if (!kodeMk) kodeMk = saved.code || extractKodeMk(fieldsText);
    // Prefer the section the card actually proves; fall back to the saved one.
    var kelas = normaliseClass(labelled.kelas || saved.kelas || '');
    var ruang = extractRuang(text, labelled.ruang || '');
    var keterangan = labelled.keterangan || '';
    // The card's own row type is the strongest signal; the room and keterangan
    // markers only add to it. A card that says 'Kuliah Teori' is theory even
    // when a lab marker appears elsewhere in its text.
    var jenis = cardRowType(text);
    if (!jenis && LAB_MARK_RE.test(keterangan)) jenis = 'PRAKTIKUM';
    return {
      MataKuliah: mataKuliah,
      KodeMK: kodeMk,
      Kelas: kelas,
      Hari: extractHari(text),
      // The time range is read off the whole card text: segmenting the card
      // splits '08.00' into '08' and '00', so the labelled segment alone would
      // lose the separator the range needs.
      Jam: normaliseJam(text),
      Ruang: ruang,
      Dosen: labelled.dosen || '',
      SMT: labelled.smt || '',
      SKS: labelled.sks || '',
      Keterangan: keterangan || jenis || '-'
    };
  }

  /*
   * Build the bridge payload from the cards that matched in the last pass.
   * Theory and practicals are separated so the app can drop them straight into
   * its two pools (jadwalTeoriTerpilih and praktikumCandidates).
   */
  function buildBridgePayload() {
    return buildPayloadFromCards(matchedInfos);
  }

  // Same as buildBridgePayload() but over an explicit card list. The card list
  // is the only input, so this is what the tests drive.
  //
  // Cards are deduplicated by CONTENT before ids are minted. The portal renders
  // the same session twice whenever the filter is re-applied over a re-rendered
  // grid, and a duplicated card would otherwise become two rows: two identical
  // boxes on the result page and an inflated 'bertabrakan' count. The key is the
  // session's identity (code + class + day + time + room), so two genuinely
  // distinct meetings are never merged while an exact repaint is.
  function buildPayloadFromCards(cards) {
    var theory = [];
    var praktikum = [];
    var seenTheory = {};
    var seenLab = {};
    for (var i = 0; i < (cards || []).length; i++) {
      var d = scrapeCard(cards[i]);
      if (!d.MataKuliah) continue;
      if (isPraktikumCard(d.Ruang, d.Keterangan, d.MataKuliah)) {
        var labKey = [d.KodeMK, d.Kelas, d.Hari, d.Jam, d.Ruang].join('|');
        if (seenLab[labKey]) continue;
        seenLab[labKey] = true;
        praktikum.push({
          id: 'bridge-lab-' + praktikum.length,
          courseName: d.MataKuliah,
          kelas: d.Kelas,
          keterangan: d.Keterangan,
          dosen: d.Dosen,
          semester: d.SMT,
          hari: d.Hari,
          jam: d.Jam,
          ruang: d.Ruang,
          kodeMk: d.KodeMK
        });
      } else {
        var theoryKey = [d.KodeMK, d.Kelas, d.Hari, d.Jam, d.Ruang].join('|');
        if (seenTheory[theoryKey]) continue;
        seenTheory[theoryKey] = true;
        theory.push({
          id: 'bridge-theory-' + theory.length,
          KodeMK: d.KodeMK,
          MataKuliah: d.MataKuliah,
          Kelas: d.Kelas,
          SKS: d.SKS,
          SMT: d.SMT,
          DosenPengampuh: d.Dosen,
          Hari: d.Hari,
          Jam: d.Jam,
          Ruang: d.Ruang,
          Keterangan: d.Keterangan
        });
      }
    }
    return {
      version: 1,
      source: 'labkom.ubg.ac.id',
      generatedAt: new Date().toISOString(),
      theory: theory,
      praktikum: praktikum
    };
  }

  // UTF-8 safe base64, made URL-safe so the hash survives every browser.
  function encodePayload(json) {
    var utf8 = unescape(encodeURIComponent(json));
    var b64 = btoa(utf8);
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function bridgeUrl(payload) {
    return APP_BASE_URL + '#' + BRIDGE_PARAM + '=' + encodePayload(JSON.stringify(payload));
  }

  // Reflect how many scraped rows are ready, and keep the button honest.
  function updateBridgeUI() {
    if (!bridgeBtn) return;
    var payload = buildBridgePayload();
    var theory = payload.theory.length;
    var lab = payload.praktikum.length;
    var total = theory + lab;
    if (total === 0) {
      bridgeBtn.disabled = true;
      bridgeBtn.style.background = '#9ca3af';
      bridgeBtn.style.cursor = 'not-allowed';
      bridgeBtn.textContent = 'Buka di UBG Schedule';
      if (bridgeStatusEl) {
        bridgeStatusEl.textContent = state.courses.length === 0
          ? 'Belum ada MK tersimpan.'
          : 'Belum ada kartu yang cocok untuk dikirim.';
      }
      return;
    }
    bridgeBtn.disabled = false;
    bridgeBtn.style.background = '#7c3aed';
    bridgeBtn.style.cursor = 'pointer';
    bridgeBtn.textContent = 'Buka di UBG Schedule (' + total + ')';
    if (bridgeStatusEl) {
      bridgeStatusEl.textContent = theory + ' teori, ' + lab + ' praktikum siap dikirim.';
    }
  }

  // Send the scraped rows to the app and open it on the result step.
  //
  // The DOM is re-scanned here rather than trusting the last cached pass: a day
  // tab click or a re-render between the last reapply() and this click would
  // otherwise send rows scraped from detached nodes, or omit rows that appeared
  // after the cache was built.
  function openInApp() {
    refreshMatchedInfos();
    var payload = buildBridgePayload();
    if (payload.theory.length + payload.praktikum.length === 0) return;
    var url = bridgeUrl(payload);
    if (bridgeStatusEl) bridgeStatusEl.textContent = 'Membuka UBG Schedule...';
    var win = null;
    try { win = window.open(url, '_blank'); } catch (e) { win = null; }
    if (!win) {
      // Popup blocked: same-tab navigation is the honest fallback.
      window.location.href = url;
    }
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

  /*
   * Test seam. The pure helpers below need no DOM, so the node test suite can
   * load this file, stub a minimal `window`/`document`, and call them directly.
   * Everything else stays closure-private.
   */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      parseBatch: parseBatch,
      isClassToken: isClassToken,
      classMatches: classMatches,
      hasCodeToken: hasCodeToken,
      matchSaved: matchSaved,
      evaluateCardEntries: evaluateCardEntries,
      normaliseCourse: normaliseCourse,
      buildPayloadFromCards: buildPayloadFromCards,
      encodePayload: encodePayload,
      normaliseJam: normaliseJam,
      extractCardFields: extractCardFields,
      stripCardTitle: stripCardTitle,
      cardRowType: cardRowType,
      prodiGlueBefore: prodiGlueBefore,
      extractHari: extractHari,
      extractRuang: extractRuang,
      extractKodeMk: extractKodeMk,
      isPraktikumCard: isPraktikumCard,
      scrapeCard: scrapeCard,
      getCardElement: getCardElement,
      collectMatchedInfos: collectMatchedInfos,
      refreshMatchedInfos: refreshMatchedInfos,
      // The handoff destination and the URL built from it, so the suite can pin
      // the canonical production domain instead of reading the source by hand.
      APP_BASE_URL: APP_BASE_URL,
      bridgeUrl: bridgeUrl,
      __setState: function (next) { state = next; },
      __getState: function () { return state; },
      __getMatchedInfos: function () { return matchedInfos; }
    };
  }
})();
