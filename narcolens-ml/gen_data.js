// Renders the synthetic training sets with the prototype's own renderers (headless Chromium).
// Usage: node gen_data.js <outDir>
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const OUT = process.argv[2] || path.join(__dirname, 'data');
fs.mkdirSync(OUT, { recursive: true });
const SETS = [
  ['m1_train', 'genXray', 1000, 6000], ['m1_test', 'genXray', 900000, 600],
  ['m2_train', 'genPills', 2000000, 12000], ['m2_test', 'genPills', 3000000, 1200]
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(__dirname, 'gen.html'));
  for (const [name, fn, seed, n] of SETS) {
    const parts = {}; const CH = fn === 'genXray' ? 300 : 2000;
    for (let s = 0; s < n; s += CH) {
      const r = await p.evaluate(([fn, a, c]) => window[fn](a, c), [fn, seed + s, Math.min(CH, n - s)]);
      for (const k of Object.keys(r)) (parts[k] = parts[k] || []).push(Buffer.from(r[k], 'base64'));
    }
    for (const k of Object.keys(parts)) fs.writeFileSync(path.join(OUT, `${name}_${k}.u8`), Buffer.concat(parts[k]));
    console.log(name, n, 'done');
  }
  if (errs.length) console.log('ERRORS', errs);
  await b.close();
})();
