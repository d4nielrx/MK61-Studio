'use strict';
/* global HID_NAMES, hidName, KEY_GROUPS, eventToHid, CODE_TO_KEYNAME, EFFECTS,
   MATRIX_KEYS, MATRIX_LEDCODE, KEY_MATRIX_LENGTH, KEY_DEFAULT_NORMAL, KEY_DEFAULT_FN,
   KEY_POS, KEY_LABELS, LED_INDEX, MK61Protocol */

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

// ---------------- state ----------------
let cfg = null;
const proto = new MK61Protocol();
let cur = 0;                 // profile being edited (0-based)
let sel = null;              // selected key { layer, ledIdx, name }
let layer = 'normal';
let captureMode = false;
let bindMode = null;         // { macroId }
let recording = null;        // { steps:[], lastT }
let selMacroId = null;
let dirty = false;
let saveTimer = null;

function defaultProfile(name) {
  return {
    name,
    keys: { normal: [...KEY_DEFAULT_NORMAL], fn: [...KEY_DEFAULT_FN] },
    bindings: {},            // "layer:ledIdx" -> { type:'macro', macroId, repeat }
    macros: [],
    lighting: {
      effect: 0, brightness: 100, direction: 0, speed: 100,
      colors: Array.from({ length: 8 }, () => [255, 255, 255]),
    },
    opts: { winLock: false, direction: false, reportRate: 0 },
  };
}
function defaultConfig() {
  return {
    version: 2,
    activeProfile: 0,
    settings: { autostart: false, autoApply: false },
    profiles: [1, 2, 3, 4].map((n) => defaultProfile('Profile ' + n)),
  };
}
const P = () => cfg.profiles[cur];

// ---------------- helpers ----------------
function toast(msg, isErr = false, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('err', isErr);
  t.hidden = false;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.hidden = true; }, ms);
}
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => window.mk61app.setConfig(JSON.parse(JSON.stringify(cfg))), 250);
}
function setDirty(v) {
  dirty = v;
  $('#dirtyFlag').hidden = !v;
}
function isTypingTarget(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA');
}

// ---------------- keyboard rendering ----------------
function buildKeyboard(container, opts = {}) {
  container.innerHTML = '';
  MATRIX_KEYS.forEach((name, i) => {
    const pos = KEY_POS[i];
    const el = document.createElement('div');
    el.className = 'key';
    el.dataset.key = name;
    el.style.left = (pos.x - 6) + 'px';
    el.style.top = (pos.y - 48) + 'px';
    el.style.width = (pos.w - 3) + 'px';
    el.style.height = '25px';
    el.innerHTML = `<span class="klabel"></span><span class="kassign"></span>`;
    container.appendChild(el);
  });
  if (!opts.static) {
    container.addEventListener('click', (e) => {
      const key = e.target.closest('.key');
      if (!key) return;
      onKeyClicked(key.dataset.key);
    });
  }
}

function assignmentLabel(l, ledIdx) {
  const binding = P().bindings[`${l}:${ledIdx}`];
  if (binding) {
    if (binding.type === 'macro') {
      const m = P().macros.find((x) => x.id === binding.macroId);
      return m ? '★ ' + m.name : '★ macro';
    }
    return '★ combo';
  }
  const code = P().keys[l][ledIdx] ?? 0;
  if (l === 'fn' && code === 0) return '·';
  return hidName(code);
}

function paintKeyboard(container, mode) {
  container.querySelectorAll('.key').forEach((el) => {
    const name = el.dataset.key;
    const ledIdx = LED_INDEX[name];
    const l = mode === 'tester' ? 'normal' : layer;
    const code = P().keys[l][ledIdx] ?? 0;
    const def = (l === 'fn' ? KEY_DEFAULT_FN : KEY_DEFAULT_NORMAL)[ledIdx] ?? 0;
    const binding = P().bindings[`${l}:${ledIdx}`];
    el.querySelector('.klabel').textContent = KEY_LABELS[name] ?? name;
    el.querySelector('.kassign').textContent = assignmentLabel(l, ledIdx);
    el.classList.toggle('changed', !!binding || code !== def);
    el.classList.toggle('sel', !!(sel && sel.layer === l && sel.ledIdx === ledIdx));
  });
}

function onKeyClicked(name) {
  const ledIdx = LED_INDEX[name];
  if (ledIdx == null) return;
  if (bindMode) {
    P().bindings[`${layer}:${ledIdx}`] = { type: 'macro', macroId: bindMode.macroId, repeat: 1 };
    bindMode = null;
    setDirty(true); save(); renderAll();
    toast('Macro bound to key ✔ — press Apply to write it to the keyboard');
    return;
  }
  sel = { layer, ledIdx, name };
  renderAll();
}

// ---------------- palette ----------------
function buildPalette() {
  const wrap = $('#paletteGroups');
  wrap.innerHTML = '';
  KEY_GROUPS.forEach((g) => {
    const det = document.createElement('details');
    det.open = ['Letters', 'Control', 'Modifiers'].includes(g.name);
    const sum = document.createElement('summary');
    sum.textContent = g.name;
    const chips = document.createElement('div');
    chips.className = 'chips';
    g.items.forEach(([code, label]) => {
      const c = document.createElement('button');
      c.className = 'chip';
      c.textContent = label;
      c.dataset.code = code;
      c.addEventListener('click', () => assignCode(code));
      chips.appendChild(c);
    });
    det.append(sum, chips);
    wrap.appendChild(det);
  });
}

function paintPalette() {
  const box = $('#paletteCurrent');
  if (!sel) {
    box.innerHTML = 'Select a key on the keyboard…';
  } else {
    const cur = assignmentLabel(sel.layer, sel.ledIdx);
    box.innerHTML = `<b>${KEY_LABELS[sel.name] ?? sel.name}</b> — ${sel.layer === 'fn' ? 'FN layer' : 'Normal layer'} → <b>${cur}</b>`;
  }
  const code = sel ? (P().keys[sel.layer][sel.ledIdx] ?? 0) : -1;
  $$('#paletteGroups .chip').forEach((c) => c.classList.toggle('active', +c.dataset.code === code));
  $('#captureBtn').textContent = captureMode ? 'Press any key now…' : 'Press a key to assign…';
  $('#captureBtn').classList.toggle('on', captureMode);

  const bl = $('#bindingList');
  bl.innerHTML = '';
  const entries = Object.entries(P().bindings).filter(([k]) => !sel || k.startsWith(sel.layer + ':'));
  if (!entries.length) {
    bl.innerHTML = '<div class="hint">No macros bound on this layer. Record one in the Macros tab, then use “Bind to key…”.</div>';
  }
  entries.forEach(([key, b]) => {
    const [l, idx] = key.split(':');
    const m = P().macros.find((x) => x.id === b.macroId);
    const row = document.createElement('div');
    row.className = 'binding-item';
    row.innerHTML = `<span>${KEY_LABELS[MATRIX_LEDCODE[+idx]] ?? idx} · ${m ? m.name : 'missing macro'}</span>`;
    const rm = document.createElement('button');
    rm.textContent = 'Unbind';
    rm.addEventListener('click', () => {
      delete P().bindings[key];
      setDirty(true); save(); renderAll();
    });
    row.appendChild(rm);
    bl.appendChild(row);
    void l;
  });
}

function assignCode(code) {
  if (!sel) { toast('Click a key on the keyboard first', true); return; }
  P().keys[sel.layer][sel.ledIdx] = code;
  delete P().bindings[`${sel.layer}:${sel.ledIdx}`];   // plain keycode replaces any binding
  setDirty(true); save(); renderAll();
}

// ---------------- lighting ----------------
function buildLighting() {
  const sel_ = $('#fxEffect');
  sel_.innerHTML = '';
  EFFECTS.forEach((e) => {
    const o = document.createElement('option');
    o.value = e.id; o.textContent = `${e.id} · ${e.name}`;
    sel_.appendChild(o);
  });
  sel_.addEventListener('change', () => {
    P().lighting.effect = +sel_.value;
    setDirty(true); save(); paintLighting();
  });
  $('#fxBrightness').addEventListener('input', (e) => {
    P().lighting.brightness = +e.target.value; setDirty(true); save(); paintLighting(true);
  });
  $('#fxDirection').addEventListener('input', (e) => {
    P().lighting.direction = +e.target.value; setDirty(true); save(); paintLighting(true);
  });
  $('#fxSpeed').addEventListener('input', (e) => {
    P().lighting.speed = +e.target.value; setDirty(true); save(); paintLighting(true);
  });
  $('#fxApplyBtn').addEventListener('click', async () => {
    if (!guardConnected()) return;
    try {
      $('#fxApplyBtn').disabled = true;
      await proto.writeLighting(cur, P().lighting);
      // Make the keyboard actually SHOW the new colors: the LED engine only
      // re-reads the palette on a profile switch (verified live), so bounce
      // away and back — same trick applyProfile uses.
      try { await proto.reloadLights(cur); } catch { /* non-fatal */ }
      toast('Lighting applied ✔');
      setDirty(false);
    } catch (err) { toast('Lighting failed: ' + err.message, true, 4000); }
    finally { $('#fxApplyBtn').disabled = false; }
  });
  $('#fxDefaultBtn').addEventListener('click', () => {
    P().lighting = defaultProfile('x').lighting;
    setDirty(true); save(); paintLighting();
  });
}

function paintLighting(sliderOnly = false) {
  const L = P().lighting;
  if (!sliderOnly) {
    $('#fxEffect').value = L.effect;
    $('#fxBrightness').value = L.brightness;
    $('#fxDirection').value = L.direction ?? 0;
    $('#fxSpeed').value = L.speed ?? 0;
  }
  $('#fxBrightVal').textContent = `(${L.brightness})`;
  $('#fxDirVal').textContent = `(${L.direction ?? 0})`;
  $('#fxSpeedVal').textContent = `(${L.speed ?? 0})`;
  const fx = EFFECTS.find((e) => e.id === L.effect) || EFFECTS[0];
  const row = $('#fxColors');
  $('#fxColorsHint').textContent = fx.colors ? `${fx.colors} color${fx.colors > 1 ? 's' : ''}` : 'this effect has fixed colors';
  row.innerHTML = '';
  if (!fx.colors) return;
  for (let i = 0; i < fx.colors; i++) {
    const c = L.colors[i] || [255, 255, 255];
    const cell = document.createElement('div');
    cell.className = 'color-cell';
    const input = document.createElement('input');
    input.type = 'color';
    input.value = rgbHex(c);
    input.addEventListener('input', () => {
      L.colors[i] = hexRgb(input.value);
      setDirty(true); save();
    });
    const lab = document.createElement('span');
    lab.textContent = 'Color ' + (i + 1);
    cell.append(input, lab);
    row.appendChild(cell);
  }
}
const rgbHex = ([r, g, b]) => '#' + [r, g, b].map((v) => (v & 0xff).toString(16).padStart(2, '0')).join('');
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// ---------------- macros ----------------
function buildMacros() {
  $('#macroNewBtn').addEventListener('click', () => {
    const m = { id: Date.now(), name: 'Macro ' + (P().macros.length + 1), repeat: 1, steps: [] };
    P().macros.push(m);
    selMacroId = m.id;
    setDirty(true); save(); renderAll();
  });
  $('#macroName').addEventListener('input', (e) => {
    const m = curMacro(); if (m) { m.name = e.target.value; setDirty(true); save(); renderAll(); }
  });
  $('#macroRepeat').addEventListener('input', (e) => {
    const m = curMacro(); if (m) { m.repeat = Math.max(0, +e.target.value | 0); setDirty(true); save(); }
  });
  $('#macroRecBtn').addEventListener('click', () => (recording ? stopRecording() : startRecording()));
  $('#macroStepClearBtn').addEventListener('click', () => {
    const m = curMacro(); if (m) { m.steps = []; setDirty(true); save(); renderAll(); }
  });
  $('#macroDeleteBtn').addEventListener('click', () => {
    const m = curMacro(); if (!m) return;
    P().macros = P().macros.filter((x) => x.id !== m.id);
    for (const [k, b] of Object.entries(P().bindings))
      if (b.type === 'macro' && b.macroId === m.id) delete P().bindings[k];
    selMacroId = null;
    setDirty(true); save(); renderAll();
  });
  $('#macroBindBtn').addEventListener('click', () => {
    const m = curMacro(); if (!m) return;
    bindMode = { macroId: m.id };
    toast('Now click a key on the keyboard layout to bind “' + m.name + '” (layer: ' + layer + ')', false, 4000);
    switchTab('remap');
  });
}
const curMacro = () => P().macros.find((x) => x.id === selMacroId);

function startRecording() {
  const m = curMacro(); if (!m) return;
  m.steps = [];
  recording = { steps: m.steps, lastT: 0 };
  $('#macroRecBtn').classList.add('on');
  $('#macroRecBtn').textContent = '■ Stop (Esc)';
  toast('Recording… press keys. Esc stops without adding Esc.', false, 3000);
}
function stopRecording() {
  recording = null;
  $('#macroRecBtn').classList.remove('on');
  $('#macroRecBtn').textContent = '● Record';
  setDirty(true); save(); renderAll();
}

function paintMacros() {
  const list = $('#macroList');
  list.innerHTML = '';
  if (!P().macros.length) {
    list.innerHTML = '<div class="hint">No macros yet. Create one, then record keystrokes.</div>';
  }
  P().macros.forEach((m) => {
    const el = document.createElement('div');
    el.className = 'macro-item' + (m.id === selMacroId ? ' active' : '');
    el.innerHTML = `<span>${escapeHtml(m.name)}</span><span class="mcount">${m.steps.length} steps</span>`;
    el.addEventListener('click', () => { selMacroId = m.id; renderAll(); });
    list.appendChild(el);
  });
  const m = curMacro();
  $('#macroEditor').hidden = !m;
  if (!m) return;
  if (document.activeElement !== $('#macroName')) $('#macroName').value = m.name;
  if (document.activeElement !== $('#macroRepeat')) $('#macroRepeat').value = m.repeat;
  const steps = $('#macroSteps');
  steps.innerHTML = '';
  if (!m.steps.length) steps.innerHTML = '<div class="hint">No steps — hit Record and press some keys.</div>';
  m.steps.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'macro-step';
    row.innerHTML =
      `<span class="${s.down ? 'sd' : 'su'}">${s.down ? '▼ down' : '▲ up'}</span>` +
      `<span class="sk">${hidName(s.hid)}</span>`;
    const inp = document.createElement('input');
    inp.type = 'number'; inp.min = 20; inp.max = 5000; inp.value = s.delay;
    inp.title = 'delay ms before this event';
    inp.addEventListener('change', () => { s.delay = Math.max(20, +inp.value | 0); setDirty(true); save(); });
    const del = document.createElement('button');
    del.textContent = '✕';
    del.addEventListener('click', () => { m.steps.splice(i, 1); setDirty(true); save(); renderAll(); });
    row.append(inp, del);
    steps.appendChild(row);
  });
  const bound = Object.entries(P().bindings).filter(([, b]) => b.macroId === m.id);
  $('#macroBindHint').textContent = bound.length
    ? 'Bound to: ' + bound.map(([k]) => KEY_LABELS[MATRIX_LEDCODE[+k.split(':')[1]]] ?? k).join(', ') + (layer === 'fn' ? '' : '')
    : 'Not bound to any key yet.';
}
const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------- tester ----------------
let testerOn = false;
function buildTester() {
  // Arrows arrive from the OS as Arrow* usages; the physical keys depend on the
  // default FN layer. Resolve them programmatically so they highlight correctly.
  [[0x4f, 'ArrowRight'], [0x50, 'ArrowLeft'], [0x51, 'ArrowDown'], [0x52, 'ArrowUp']]
    .forEach(([code, evCode]) => {
      const idx = KEY_DEFAULT_FN.indexOf(code);
      if (idx >= 0 && MATRIX_LEDCODE[idx]) CODE_TO_KEYNAME[evCode] = MATRIX_LEDCODE[idx];
    });
  buildKeyboard($('#testerKeyboard'), { static: true });
  $('#testerToggle').addEventListener('change', (e) => {
    testerOn = e.target.checked;
    $('#testerInfo').textContent = testerOn ? 'Listening… press keys on the MK61.' : 'Enable testing, then press keys on your MK61.';
  });
}
function paintTester() {
  $('#testerKeyboard').querySelectorAll('.key').forEach((el) => {
    const name = el.dataset.key;
    const ledIdx = LED_INDEX[name];
    el.querySelector('.klabel').textContent = KEY_LABELS[name] ?? name;
    el.querySelector('.kassign').textContent = hidName(P().keys.normal[ledIdx] ?? 0);
  });
}
function onTesterKey(e, down) {
  if (!testerOn) return;
  const name = CODE_TO_KEYNAME[e.code];
  if (name) {
    const el = $(`#testerKeyboard .key[data-key="${name}"]`);
    el?.classList.toggle('down', down);
  }
  if (down) {
    const hid = eventToHid(e);
    const ledIdx = name ? LED_INDEX[name] : null;
    const assigned = ledIdx != null ? hidName(P().keys.normal[ledIdx] ?? 0) : '?';
    $('#testerInfo').textContent =
      `physical: ${e.code}   key: "${e.key}"   HID: 0x${hid.toString(16).toUpperCase().padStart(2, '0')} (${hidName(hid)})` +
      (ledIdx != null ? `   matrix: ${name} → normal layer = ${assigned}` : '');
  }
}

// ---------------- settings ----------------
function buildSettings() {
  $('#optName').addEventListener('input', (e) => {
    P().name = e.target.value || 'Profile ' + (cur + 1);
    setDirty(true); save(); paintProfileTabs();
  });
  $('#optWinLock').addEventListener('change', (e) => { P().opts.winLock = e.target.checked; setDirty(true); save(); });
  $('#optDirection').addEventListener('change', (e) => { P().opts.direction = e.target.checked; setDirty(true); save(); });
  $('#optRate').addEventListener('change', (e) => { P().opts.reportRate = +e.target.value; setDirty(true); save(); });
  $('#optAutostart').addEventListener('change', async (e) => {
    cfg.settings.autostart = e.target.checked;
    const ok = await window.mk61app.setAutostart(e.target.checked);
    if (!ok) toast('Could not update startup shortcut', true);
    save();
  });
  $('#optAutoApply').addEventListener('change', (e) => { cfg.settings.autoApply = e.target.checked; save(); });
  $('#profileResetBtn').addEventListener('click', () => {
    if (!confirm('Reset this profile (keys, macros, lighting) to defaults?')) return;
    const name = P().name;
    cfg.profiles[cur] = defaultProfile(name);
    setDirty(true); save(); renderAll();
  });
  $('#profileExportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(P(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (P().name || 'profile').replace(/[^\w-]+/g, '_') + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Profile exported');
  });
  $('#profileImportBtn').addEventListener('click', () => $('#fileInput').click());
  $('#fileInput').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data.keys?.normal || !data.lighting) throw new Error('not a profile file');
      const name = P().name;
      cfg.profiles[cur] = { ...defaultProfile(name), ...data, name };
      setDirty(true); save(); renderAll();
      toast('Profile imported — press Apply to write it to the keyboard');
    } catch (err) { toast('Import failed: ' + err.message, true); }
  });
  $('#factoryResetBtn').addEventListener('click', async () => {
    if (!guardConnected()) return;
    if (!confirm('Factory reset the keyboard? This wipes ALL profiles stored on the device.')) return;
    try {
      await proto.factoryReset();
      toast('Keyboard factory reset');
      setDirty(false);
    } catch (err) { toast('Reset failed: ' + err.message, true); }
  });
  window.mk61app.configPath().then((p) => { $('#configPathHint').textContent = 'Config file: ' + p; });
}
function paintSettings() {
  if (document.activeElement !== $('#optName')) $('#optName').value = P().name;
  $('#optWinLock').checked = !!P().opts.winLock;
  $('#optDirection').checked = !!P().opts.direction;
  $('#optRate').value = String(P().opts.reportRate ?? 0);
  $('#optAutoApply').checked = !!cfg.settings.autoApply;
}

// ---------------- profile tabs / header ----------------
function paintProfileTabs() {
  $$('#profileTabs .ptab').forEach((b) => {
    const i = +b.dataset.profile;
    b.textContent = cfg.profiles[i].name || 'Profile ' + (i + 1);
    b.classList.toggle('active', i === cur);
  });
}
function buildHeader() {
  $$('#profileTabs .ptab').forEach((b) =>
    b.addEventListener('click', () => { cur = +b.dataset.profile; sel = null; renderAll(); }));
  $('#applyBtn').addEventListener('click', applyAll);
}

function guardConnected() {
  if (!proto.connected) { toast('Connect the keyboard first', true); return false; }
  return true;
}

async function applyAll() {
  if (!guardConnected()) return;
  const btn = $('#applyBtn');
  btn.disabled = true;
  try {
    await proto.applyProfile(cur, P(), (step) => { btn.textContent = step; console.log('[mk61] apply:', step); });
    toast(`Profile ${cur + 1} written to keyboard ✔ — it now survives reboots on its own`);
    setDirty(false);
  } catch (err) {
    toast('Apply failed: ' + err.message + ' (is the official Gamakay app closed?)', true, 5000);
  } finally {
    btn.textContent = 'Apply to keyboard';
    btn.disabled = false;
  }
}

// ---------------- tabs / routing ----------------
function switchTab(tab) {
  $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $$('.tab').forEach((s) => { s.hidden = s.id !== 'tab-' + tab; });
  if (tab === 'tester') paintTester();
}
function buildNav() {
  $$('.nav-btn').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));
}

// ---------------- global key capture ----------------
document.addEventListener('keydown', (e) => {
  if (recording) {
    e.preventDefault();
    if (e.code === 'Escape') { stopRecording(); return; }
    const hid = eventToHid(e);
    if (!hid) return;
    pushStep(e, hid);
    return;
  }
  if (captureMode && !isTypingTarget(e)) {
    e.preventDefault();
    const hid = eventToHid(e);
    captureMode = false;
    if (hid) assignCode(hid);
    else toast('Could not map that key', true);
    return;
  }
  onTesterKey(e, true);
});
document.addEventListener('keyup', (e) => {
  if (recording) {
    e.preventDefault();
    if (e.code === 'Escape') return;
    const hid = eventToHid(e);
    if (hid) pushStep(e, hid);
    return;
  }
  onTesterKey(e, false);
});
function pushStep(e, hid) {
  if (!recording) return;
  const now = performance.now();
  const delay = recording.lastT ? Math.max(20, Math.round(now - recording.lastT)) : 20;
  recording.lastT = now;
  recording.steps.push({ down: e.type === 'keydown', delay, hid });
  paintMacros();
}

// ---------------- connect ----------------
function setConnState(state, text, sub) {
  $('#connDot').className = 'dot' + (state === 'ok' ? ' ok' : state === 'err' ? ' err' : '');
  $('#connText').textContent = text;
  if (sub != null) $('#connSub').textContent = sub;
  $('#applyBtn').disabled = state !== 'ok';
  $('#connectBtn').textContent = state === 'ok' ? 'Disconnect' : 'Connect keyboard';
}
function buildConnect() {
  $('#connectBtn').addEventListener('click', async () => {
    if (proto.connected) {
      proto.disconnect();
      setConnState('', 'Not connected', 'Gamakay MK61 (SK61L)');
      return;
    }
    try {
      setConnState('', 'Connecting…');
      await proto.connect();
      const active = await proto.getActiveProfile();
      cur = active;
      // Sync lighting state FROM the keyboard so the UI shows reality —
      // otherwise Apply would overwrite custom colors with stale app defaults.
      try {
        const block = await proto.readBlock(active);
        const L = cfg.profiles[active].lighting;
        L.effect = block[3] & 0xff;
        L.brightness = block[4] & 0xff;
        L.direction = block[5] & 0xff;
        L.speed = speedFromFw(block[11]);
        const fx = EFFECTS.find((e) => e.id === L.effect);
        if (fx && fx.off != null) {
          const n = fx.colors;
          // PLANAR read (mirrors writeLighting; ground-truth from official app):
          //   R plane = [off .. off+n-1], G = [off+n .. off+2n-1], B = [off+2n .. off+3n-1]
          // Wave (off=84, n=14): R@84-97, G@98-111, B@112-125.
          for (let j = 0; j < n; j++) {
            L.colors[j] = [block[fx.off + j] & 0xff, block[fx.off + n + j] & 0xff, block[fx.off + 2 * n + j] & 0xff];
          }
        }
        save();
        console.log('[mk61] synced lighting from keyboard: effect', L.effect, 'brightness', L.brightness);
      } catch (syncErr) {
        console.warn('[mk61] lighting sync failed:', syncErr?.message || syncErr);
      }
      setConnState('ok', 'Connected', `MK61 · firmware profile ${active + 1}`);
      renderAll();
      // Auto-apply is DISABLED until the color-encoding bug is fixed — pushing a
      // wrong/black palette at boot previously wiped the user's stored lighting.
      // Re-enable only after writeLighting writes colors the firmware accepts.
      // if (cfg.settings.autoApply) {
      //   toast('Auto-apply enabled — pushing profile to keyboard…', false, 2500);
      //   applyAll();
      // }
    } catch (err) {
      console.error('connect failed:', err?.stack || err?.message || String(err));   // -> mk61-studio.log
      setConnState('err', 'Connection failed', err.message);
      const hint = /open|access|in use|busy|denied|not found/i.test(String(err.message))
        ? ' — close the official Gamakay app first, or unplug/replug the keyboard'
        : '';
      toast('Connect failed: ' + err.message + hint, true, 6000);
    }
  });
  proto.onDisconnect = () => {
    setConnState('', 'Disconnected', 'Gamakay MK61 (SK61L)');
    toast('Keyboard disconnected', true);
  };
  window.mk61app?.onHidDetached?.(() => {
    proto.dev = null;
    proto.onDisconnect?.();
  });
}

// ---------------- remap tab wiring ----------------
function buildRemap() {
  $$('.layer-btn').forEach((b) =>
    b.addEventListener('click', () => {
      layer = b.dataset.layer;
      $$('.layer-btn').forEach((x) => x.classList.toggle('active', x === b));
      renderAll();
    }));
  $('#captureBtn').addEventListener('click', () => { captureMode = true; paintPalette(); });
  $('#clearKeyBtn').addEventListener('click', () => assignCode(0));
  $('#resetKeyBtn').addEventListener('click', () => {
    if (!sel) return;
    const def = (sel.layer === 'fn' ? KEY_DEFAULT_FN : KEY_DEFAULT_NORMAL)[sel.ledIdx] ?? 0;
    P().keys[sel.layer][sel.ledIdx] = def;
    delete P().bindings[`${sel.layer}:${sel.ledIdx}`];
    setDirty(true); save(); renderAll();
  });
}

// ---------------- master render ----------------
function renderAll() {
  paintProfileTabs();
  paintKeyboard($('#keyboard'));
  paintPalette();
  paintLighting();
  paintMacros();
  paintTester();
  paintSettings();
}

// ---------------- init ----------------
async function init() {
  cfg = (await window.mk61app.getConfig()) || defaultConfig();
  // migrate/patch missing fields
  cfg = { ...defaultConfig(), ...cfg };
  cfg.profiles = [0, 1, 2,  3].map((i) => {
    const base = defaultProfile('Profile ' + (i + 1));
    const old = cfg.profiles?.[i] || {};
    return {
      ...base, ...old,
      keys: { ...base.keys, ...(old.keys || {}) },
      lighting: { ...base.lighting, ...(old.lighting || {}) },
      opts: { ...base.opts, ...(old.opts || {}) },
    };
  });
  // v1 -> v2: v1 kept the animation-DIRECTION field (block[5]) under the key
  // "speed" (it was mislabelled back then). v2 adds a real animation-SPEED
  // field (block[11]) and renames the old one to "direction".
  if ((cfg.version | 0) < 2) {
    for (const p of cfg.profiles) {
      const L = p.lighting;
      if (L.direction == null) L.direction = Math.max(0, Math.min(3, L.speed | 0));
      L.speed = 100;   // app-level 100 = fastest = firmware byte 0
    }
    cfg.version = 2;
    save();
  }
  cur = Math.min(3, Math.max(0, cfg.activeProfile | 0));

  buildNav();
  buildHeader();
  buildRemap();
  buildKeyboard($('#keyboard'));
  buildPalette();
  buildLighting();
  buildMacros();
  buildTester();
  buildSettings();
  buildConnect();

  $('#appVersion').textContent = await window.mk61app.version();
  // "Start with Windows" is a Windows-only feature (Startup-folder shortcut).
  if ((await window.mk61app.platform?.()) !== 'win32') {
    const row = $('#optAutostartRow');
    if (row) row.hidden = true;
  } else {
    $('#optAutostart').checked = await window.mk61app.getAutostart();
  }
  setConnState('', 'Not connected', 'Gamakay MK61 (SK61L)');
  renderAll();
}

init();
