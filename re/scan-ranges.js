// Extract every ParameterNumberList + effect-class name from the minified
// MK-series UI component to find the true firmware ranges for MK61 effects.
const fs = require('fs');
const src = fs.readFileSync(
  'C:/Users/djdan/Documents/keybaord/re/official_asar/components/M_Built_ineffect.js',
  'utf8'
);

// find all ParameterNumberList blocks with surrounding field defs
const re = /ParameterNumberList\s*=\s*\[[^\]]*\]/g;
let m, n = 0;
while ((m = re.exec(src)) !== null) {
  const before = src.slice(Math.max(0, m.index - 260), m.index);
  // nearest class/effect name marker before this definition
  const names = [...before.matchAll(/translate\s*[:=]\s*"([^"]{2,40})"/g)].map((x) => x[1]);
  const label = names.length ? names[names.length - 1] : '(base?)';
  console.log(`--- ${label} ---`);
  console.log(m[0].replace(/,/g, ', ').slice(0, 400));
  n++;
}
console.log('total ParameterNumberList definitions:', n);
