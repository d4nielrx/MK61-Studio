// Mirror the app's EXACT main-process sequence to reproduce the garbage reads:
// open -> attach detach listener -> send 0x81 (full 264-byte buffer) -> sleep -> read.
const hid = require('node-hid');
const cfg = hid.devices().find(
  (d) => d.vendorId === 0x1ea7 && d.productId === 0x9018 && d.usagePage === 0xff01 && d.usage === 1
);
console.log('cfg:', cfg.path.slice(0, 60));
const dev = new hid.HID(cfg.path);
if (typeof dev.on === 'function') dev.on('detach', () => console.log('DETACH EVENT'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const full = (cmd) => { const a = Array(264).fill(0); a[0] = 0x07; a[1] = cmd; return a; };
const show = (tag, r) => console.log(`${tag}: len=${r.length} head=${Buffer.from(r.slice(0, 4)).toString('hex')}`);

(async () => {
  // exactly what the app does for getActiveProfile
  dev.sendFeatureReport(full(0x81));
  await sleep(60);
  let r = dev.getFeatureReport(0x07, 264);
  show('0x81 first read', r);

  dev.sendFeatureReport(full(0x81));
  await sleep(120);
  r = dev.getFeatureReport(0x07, 264);
  show('0x81 second read (after resend)', r);

  // and the short-payload form used by my working tests
  dev.sendFeatureReport([0x07, 0x81, ...Array(262).fill(0)]);
  await sleep(60);
  r = dev.getFeatureReport(0x07, 264);
  show('0x81 short payload read', r);

  dev.close();
  process.exit(0);
})();
