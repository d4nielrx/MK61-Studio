// Compare raw feature-read bytes: python hidapi returns 264 with 07 82 01 header;
// node-hid returned 265 with no header. Print full hex to locate the shift.
const hid = require('node-hid');
console.log('node-hid version:', require('node-hid/package.json').version);
const cfg = hid.devices().find(
  (d) => d.vendorId === 0x1ea7 && d.productId === 0x9018 && d.usagePage === 0xff01 && d.usage === 1
);
const dev = new hid.HID(cfg.path);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  // read 1: immediate (what the app effectively does after its 45ms sleep)
  dev.sendFeatureReport([0x07, 0x82, 1, ...Array(261).fill(0)]);
  await sleep(45);
  const r1 = dev.getFeatureReport(0x07, 264);
  console.log('read@45ms  len =', r1.length, 'head =', Buffer.from(r1.slice(0, 8)).toString('hex'));

  // read 2: longer delay, same command
  dev.sendFeatureReport([0x07, 0x82, 1, ...Array(261).fill(0)]);
  await sleep(250);
  const r2 = dev.getFeatureReport(0x07, 264);
  console.log('read@250ms len =', r2.length, 'head =', Buffer.from(r2.slice(0, 8)).toString('hex'));
  console.log('full@250ms =', Buffer.from(r2).toString('hex'));
  dev.close();
})();
