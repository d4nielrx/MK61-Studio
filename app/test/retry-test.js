// Prove: a garbage read (no sleep) can be recovered by resend + wait + reread.
const hid = require('node-hid');
const cfg = hid.devices().find(
  (d) => d.vendorId === 0x1ea7 && d.productId === 0x9018 && d.usagePage === 0xff01 && d.usage === 1
);
const dev = new hid.HID(cfg.path);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const head = (a) => Buffer.from(a.slice(0, 4)).toString('hex');
(async () => {
  // read immediately after send — reproduces the app's garbage case
  dev.sendFeatureReport([0x07, 0x82, 1, ...Array(261).fill(0)]);
  const bad = dev.getFeatureReport(0x07, 264);
  console.log('immediate read: len =', bad.length, 'head =', head(bad), '-> valid?', bad[0] === 7 && bad[1] === 0x82);

  // recovery: resend, wait 60ms, reread — validate header
  let ok = false;
  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    dev.sendFeatureReport([0x07, 0x82, 1, ...Array(261).fill(0)]);
    await sleep(60);
    const r = dev.getFeatureReport(0x07, 264);
    ok = r[0] === 7 && r[1] === 0x82;
    console.log(`retry ${attempt}: len = ${r.length} head = ${head(r)} valid? ${ok}`);
  }
  console.log(ok ? 'RECOVERY PATTERN WORKS' : 'RECOVERY FAILED');
  dev.close();
})();
