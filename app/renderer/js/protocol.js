// WebHID protocol implementation for the Gamakay MK61 / SK61L.
// Feature report ID 0x07 on vendor collection (usagePage 0xFF01, usage 0x0001), 264 bytes.
// All offsets verified against the official driver + live hardware (see PROTOCOL.md).

const VID = 0x1ea7;
const PID = 0x9018;
const REPORT_ID = 0x07;
const REPORT_LEN = 264;      // incl. report id byte
const MACRO_MARKER = 0xb2;

// --- animation SPEED (settings block byte 11) ---
// Found by bisecting the settings block byte-by-byte against live hardware
// (re/probe_speed*.py): on THIS firmware the speed byte is INVERTED —
// 0 = fastest, higher = slower. The app-level speed is 0..100 with 100 =
// fastest (natural for the user), so we map between the two.
const SPEED_FW_MAX = 255;
function speedToFw(speedUi) {
  const s = Math.max(0, Math.min(100, speedUi | 0));
  return Math.round((SPEED_FW_MAX * (100 - s)) / 100);
}
function speedFromFw(fw) {
  const f = Math.max(0, Math.min(SPEED_FW_MAX, fw & 0xff));
  return Math.max(0, Math.min(100, Math.round(100 - (100 * f) / SPEED_FW_MAX)));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class MK61Protocol {
  constructor() {
    this.dev = null;
    this.onDisconnect = null;
  }

  get connected() { return !!this.dev; }

  async connect() {
    // Transport: node-hid via main-process IPC. (WebHID in Chromium fails
    // receiveFeatureReport on this device with NotAllowedError even though raw
    // Win32 calls succeed — node-hid is the same stack the official driver uses.)
    const res = await window.mk61app.hidConnect();
    if (!res?.ok) throw new Error(res?.error || 'HID open failed');
    this.dev = true;
    console.log('[mk61] connected via node-hid:', res.product);
    return true;
  }

  disconnect() {
    try { window.mk61app?.hidClose?.(); } catch { /* ignore */ }
    this.dev = null;
  }

  async _set(bytes) {
    if (!this.dev) throw new Error('Not connected');
    const buf = new Uint8Array(REPORT_LEN);
    buf.set(bytes.slice(0, REPORT_LEN));
    buf[0] = REPORT_ID;
    this._lastPayload = Array.from(buf);   // remembered so reads can resend on retry
    console.log('[mk61] send head=' + Array.from(buf.slice(0, 6)).join(','));
    const r = await window.mk61app.hidSend(Array.from(buf));
    if (!r?.ok) throw new Error('sendFeatureReport failed: ' + (r?.error || 'unknown'));
    await sleep(60);
  }

  async _get() {
    if (!this.dev) throw new Error('Not connected');
    let lastErr = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const r = await window.mk61app.hidRecv();
      if (r?.ok) {
        const out = new Uint8Array(REPORT_LEN);
        // node-hid returns the report with ID at byte 0 — same convention as
        // PROTOCOL.md offsets (verified live against hardware).
        out.set((r.data || []).slice(0, REPORT_LEN));
        // Hardware safety: read too soon after a burst of writes and the device
        // returns garbage (wrong length, missing header). Writing such a block
        // back would clobber the keyboard's settings (observed: colors reset to
        // factory rainbow). Responses MUST echo report id + command at [0..1];
        // otherwise resend the command, wait longer, and read again.
        if (out[0] === REPORT_ID && (this._lastPayload == null || out[1] === this._lastPayload[1])) {
          return out;
        }
        console.warn(`[mk61] invalid read (attempt ${attempt}): head=${out[0].toString(16)} ${out[1].toString(16)} len=${(r.data || []).length}`);
      } else {
        lastErr = r?.error;
        console.warn(`[mk61] read error (attempt ${attempt}):`, r?.error);
      }
      if (this._lastPayload) await window.mk61app.hidSend(this._lastPayload);
      await sleep(60 * attempt);
    }
    throw new Error('receiveFeatureReport failed: ' + (lastErr || 'device returned invalid data'));
  }

  // --- commands ---

  async getActiveProfile() {              // 0x81 -> resp[2] = 1..4
    await this._set([0x00, 0x81]);
    const r = await this._get();
    return Math.max(1, Math.min(4, r[2] || 1)) - 1;   // 0-based
  }

  async switchProfile(idx) {              // 0x01, profile 1..4
    await this._set([0x00, 0x01, idx + 1]);
  }

  // The LED engine only re-reads the palette on a profile activation (verified
  // live: writing colors alone never changes the lights; switching profile does).
  // So after a lighting write we bounce away and back to force a reload.
  async reloadLights(idx) {
    const target = (idx | 0) + 1;                 // firmware profile 1..4
    const other = target === 1 ? 2 : 1;           // any *different* profile
    await this._set([0x00, 0x01, other]);
    await sleep(150);
    await this._set([0x00, 0x01, target]);
    await sleep(250);
  }

  async factoryReset() {                  // 0x01 with 0xFF
    await this._set([0x00, 0x01, 0xff]);
    await sleep(500);
  }

  async readBlock(profileIdx) {           // 0x82 -> 256-byte settings block
    await this._set([0x00, 0x82, profileIdx + 1]);
    const r = await this._get();
    // Verified empirically (find_offset.py): block[4]=brightness lands at raw[12],
    // so block starts at raw index 8 (12-4=8). Naive [8..263] is CORRECT.
    // (The official driver's [8+i-1] is an internal buffer quirk that cancels out.)
    return Array.from(r.slice(8, 8 + 256));
  }

  async writeBlock(profileIdx, block, header = {}) {
    const b = new Array(REPORT_LEN).fill(0);
    b[1] = 0x02;
    b[2] = profileIdx + 1;
    if (header.reportRate != null) b[4] = header.reportRate;
    for (let i = 0; i < 256; i++) b[8 + i] = block[i] & 0xff;
    await this._set(b);
  }

  async writeKeyMatrix(profileIdx, normal, fnLayer) {   // 0x03, 3x70 bytes
    const b = new Array(REPORT_LEN).fill(0);
    b[1] = 0x03;
    b[2] = profileIdx + 1;
    b[3] = 0;
    for (let k = 0; k < KEY_MATRIX_LENGTH; k++) {
      b[8 + k] = (normal[k] ?? 0) & 0xff;
      b[8 + KEY_MATRIX_LENGTH + k] = (fnLayer[k] ?? 0) & 0xff;
      b[8 + KEY_MATRIX_LENGTH * 2 + k] = 0;   // custom LED assignments (unused)
    }
    await this._set(b);
    await sleep(60);
  }

  async writeMacro(profileIdx, keyIndex, repeat, steps) { // 0x05
    const b = new Array(REPORT_LEN).fill(0);
    b[1] = 0x05;
    b[2] = profileIdx + 1;
    b[3] = keyIndex & 0xff;
    b[8] = (repeat >> 8) & 0xff;
    b[9] = repeat & 0xff;
    steps.slice(0, 84).forEach((s, i) => {
      const delay = Math.max(20, s.delay | 0);
      b[10 + i * 3] = ((delay >> 8) & 0x7f) | (s.down ? 0x80 : 0);
      b[11 + i * 3] = delay & 0xff;
      b[12 + i * 3] = s.hid & 0xff;
    });
    await this._set(b);
    await sleep(60);
  }

  async writeLighting(profileIdx, lighting) {           // 0x82 read -> modify -> 0x02 write
    const block = await this.readBlock(profileIdx);
    block[3] = lighting.effect & 0xff;         // effect id
    // Firmware brightness field is 0..20 (live-confirmed by user: works up to 20,
    // past 20 the slider starts corrupting the animation). Cap at 20.
    block[4] = Math.max(0, Math.min(20, lighting.brightness | 0));
    // Firmware only understands speed 0..3 (verified live: 5+ = garbage flicker then black)
    // block[5] = animation DIRECTION (0-3): changes which way the animation flows.
    // (The official driver mislabels this same byte as "speed" — on this
    // firmware it is direction; the real speed byte is block[11], below.)
    block[5] = Math.max(0, Math.min(3, lighting.direction | 0));
    // block[11] = animation SPEED (inverted on this firmware: 0 = fastest).
    block[11] = speedToFw(lighting.speed);
    // Official driver zeroes the per-effect spectrum-mode flags on every write —
    // nonzero flags can hijack the palette into factory rainbow mode.
    for (let i = 24; i <= 32; i++) block[i] = 0;

    const fx = EFFECTS.find((e) => e.id === lighting.effect);
    if (fx && fx.off != null && lighting.colors) {
      const n = fx.colors;
      // Colors are stored PLANAR by channel — GROUND TRUTH reverse-engineered from
      // the official app writing 14 known-red slots (test: reds appeared as one
      // contiguous high-R block at 84-97, then low G, then low B; interleaved
      // scrambled them into white/lavender). Layout for n colors at off:
      //   R plane = [off .. off+n-1], G plane = [off+n .. off+2n-1], B = [off+2n .. off+3n-1]
      // Wave (off=84, n=14): R@84-97, G@98-111, B@112-125. Live-confirmed: planar-14
      // green turned the WHOLE keyboard green (test_planar14_green.py).
      for (let j = 0; j < n; j++) {
        const c = lighting.colors[j] || [255, 255, 255];
        block[fx.off + j]        = c[0] & 0xff;   // R plane
        block[fx.off + n + j]    = c[1] & 0xff;   // G plane
        block[fx.off + 2 * n + j]= c[2] & 0xff;   // B plane
      }
    }
    // --- FLASH COMMIT: the keyboard's "save switch" ---
    // PROVEN 2026-10-19 (re/flash_trigger_bisect.py + user's 2 unplug cycles):
    // toggling block[126] (custom-count field) makes the firmware save the ENTIRE
    // settings block to flash. Palette writes left count=255 untouched in every
    // earlier test -> nothing ever committed ("RAM-only" conclusion was wrong).
    // Two writes: count=1 (a change -> commits) then count=255 (clean factory
    // value -> commits again). Final flash content = this block with count 255,
    // no matter what flash held before.
    block[126] = 1;
    await this.writeBlock(profileIdx, block);
    await sleep(80);
    block[126] = 255;
    await this.writeBlock(profileIdx, block);
    await sleep(80);

    // Verify-after-write: read the block back and confirm the settings stuck.
    // Guards against the firmware silently ignoring a bad/timed-out write.
    const check = await this.readBlock(profileIdx);
    const mismatches = [];
    if (check[3] !== block[3]) mismatches.push(`effect ${check[3]}≠${block[3]}`);
    if (check[4] !== block[4]) mismatches.push(`brightness ${check[4]}≠${block[4]}`);
    if (check[5] !== block[5]) mismatches.push(`direction ${check[5]}≠${block[5]}`);
    if (check[11] !== block[11]) mismatches.push(`speed ${check[11]}≠${block[11]}`);
    if (check[126] !== 255) mismatches.push(`flash-save count ${check[126]}≠255`);
    if (fx && fx.off != null) {
      for (let i = 0; i < fx.colors * 3; i++) {
        if (check[fx.off + i] !== block[fx.off + i]) { mismatches.push(`color@${fx.off + i}`); break; }
      }
    }
    if (mismatches.length) throw new Error('write verification failed: ' + mismatches.join(', '));
  }

  async writeOpts(profileIdx, opts) {                    // 0x0B direction/winlock
    const b = new Array(REPORT_LEN).fill(0);
    b[1] = 0x0b;
    b[2] = profileIdx + 1;
    b[8 + 3] = opts.direction ? 1 : 0;
    b[8 + 4] = 0;
    b[8 + 5] = opts.winLock ? 1 : 0;
    await this._set(b);
    await sleep(45);
  }

  // --- full profile apply ---
  // profile: { keys:{normal[],fn[]}, bindings:{ "layer:ledIdx": binding }, macros:[], lighting, opts }
  async applyProfile(idx, profile, onStep = () => {}) {
    onStep('Switching profile…');
    await this.switchProfile(idx);

    // build matrices (0xB2 marker where a macro/combo binding exists)
    const normal = profile.keys.normal.slice();
    const fnLayer = profile.keys.fn.slice();
    for (const key of Object.keys(profile.bindings || {})) {
      const [layer, ledStr] = key.split(':');
      (layer === 'fn' ? fnLayer : normal)[+ledStr] = MACRO_MARKER;
    }
    onStep('Writing key matrix…');
    await this.writeKeyMatrix(idx, normal, fnLayer);

    onStep('Writing macros…');
    for (const [key, binding] of Object.entries(profile.bindings || {})) {
      const [layer, ledStr] = key.split(':');
      const keyIndex = (layer === 'fn' ? KEY_MATRIX_LENGTH : 0) + +ledStr;
      let steps = binding.steps;
      let repeat = binding.repeat || 1;
      if (binding.type === 'macro') {
        const m = (profile.macros || []).find((x) => x.id === binding.macroId);
        steps = m ? m.steps : [];
        repeat = m ? m.repeat : 1;      // live from the macro editor
      }
      if (steps?.length) await this.writeMacro(idx, keyIndex, repeat, steps);
    }

    onStep('Writing lighting…');
    await this.writeLighting(idx, profile.lighting);

    // Force the LED engine to re-read the palette we just wrote, so the colors
    // appear immediately instead of only after a reboot/profile change.
    onStep('Reloading lights…');
    try { await this.reloadLights(idx); } catch { /* non-fatal */ }

    onStep('Writing options…');
    await this.writeOpts(idx, profile.opts || {});
    onStep('Done ✔');
  }
}

window.MK61Protocol = MK61Protocol;
window.MK61_IDS = { VID, PID, MACRO_MARKER };
