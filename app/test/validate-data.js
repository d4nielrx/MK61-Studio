// Validates renderer data files: lengths, uniqueness, arrow-key FN mapping.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { console, window: {} };
vm.createContext(ctx);
for (const f of ['keycodes.js', 'layout.js', 'protocol.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'renderer', 'js', f), 'utf8'), ctx, { filename: f });
}

const r = vm.runInContext(`(() => {
  const errs = [];
  const ok = (cond, msg) => { if (!cond) errs.push(msg); };

  ok(MATRIX_KEYS.length === 61, 'MATRIX_KEYS length ' + MATRIX_KEYS.length);
  ok(MATRIX_LEDCODE.length === 70, 'MATRIX_LEDCODE length ' + MATRIX_LEDCODE.length);
  ok(KEY_DEFAULT_NORMAL.length === 70, 'KEY_DEFAULT_NORMAL length ' + KEY_DEFAULT_NORMAL.length);
  ok(KEY_DEFAULT_FN.length === 70, 'KEY_DEFAULT_FN length ' + KEY_DEFAULT_FN.length);
  ok(KEY_POS.length === 61, 'KEY_POS length ' + KEY_POS.length);

  // every MATRIX_KEYS entry has an LED position
  for (const k of MATRIX_KEYS) ok(LED_INDEX[k] != null, 'no LED index for key ' + k);
  ok(Object.keys(LED_INDEX).length === 61, 'LED_INDEX size ' + Object.keys(LED_INDEX).length);

  // non-empty LED code names unique
  const names = MATRIX_LEDCODE.filter(Boolean);
  ok(new Set(names).size === names.length, 'duplicate LED names');

  // every default keycode resolves to a display name
  for (const [label, arr] of [['normal', KEY_DEFAULT_NORMAL], ['fn', KEY_DEFAULT_FN]])
    for (const c of arr) { const n = hidName(c); ok(!/^0x/.test(n) || c > 0xfc, label + ' unknown code 0x' + c.toString(16)); }

  // matrix x,y sanity: keys don't overlap badly
  for (let i = 0; i < 61; i++) {
    const p = KEY_POS[i];
    ok(p.x >= 0 && p.x <= 510 && p.w > 10 && p.y >= 40 && p.y <= 220, 'bad pos ' + i);
  }

  // arrow keys in FN layer
  const arrows = {};
  for (const [code, ev] of [[0x4f,'ArrowRight'],[0x50,'ArrowLeft'],[0x51,'ArrowDown'],[0x52,'ArrowUp']]) {
    const idx = KEY_DEFAULT_FN.indexOf(code);
    arrows[ev] = idx >= 0 ? MATRIX_LEDCODE[idx] : null;
  }

  // palette codes all named
  for (const g of KEY_GROUPS) for (const [c] of g.items) ok(HID_NAMES[c] != null, 'palette unknown 0x' + c.toString(16));

  return { errs, arrows };
})()`, ctx);

console.log('errors:', r.errs.length ? r.errs : 'none');
console.log('FN arrow keys:', r.arrows);
