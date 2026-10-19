// Dump the full 0x82 profile-block response to find where data actually sits.
const hid = require('node-hid');
const devs = hid.devices().filter((d) => d.vendorId === 0x1ea7 && d.productId === 0x9018);
const cfg = devs.find((d) => d.usagePage === 0xff01 && d.usage === 1);
const dev = new hid.HID(cfg.path);

dev.sendFeatureReport([0x07, 0x82, 1, ...Array(261).fill(0)]);
const resp = dev.getFeatureReport(0x07, 264);
console.log('response length =', resp.length);
const hex = (a, from, to) =>
  Buffer.from(a.slice(from, to)).toString('hex').replace(/(..)/g, '$1 ').trim();
// print in 16-byte rows labeled with array index
for (let i = 0; i < resp.length; i += 16) {
  console.log(String(i).padStart(3) + ': ' + hex(resp, i, Math.min(i + 16, resp.length)));
}
dev.close();
