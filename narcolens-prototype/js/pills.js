/* NarcoLens prototype – M2: officer photos (drawn in SVG) + simulated recognition results. */
(function (NL) {
  'use strict';

  function tablet(cx, cy, r, fill) {
    return '<g><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + (fill || '#ece4d2') + '" stroke="#b9ae96" stroke-width="1.5"/>' +
      '<path d="M' + (cx - 0.12 * r) + ' ' + (cy - 0.5 * r) + ' Q' + (cx - 0.8 * r) + ' ' + cy + ' ' + (cx - 0.12 * r) + ' ' + (cy + 0.5 * r) + '" fill="none" stroke="#6b604b" stroke-width="' + Math.max(1.5, r / 6) + '" stroke-linecap="round"/>' +
      '<path d="M' + (cx + 0.12 * r) + ' ' + (cy - 0.5 * r) + ' Q' + (cx + 0.8 * r) + ' ' + cy + ' ' + (cx + 0.12 * r) + ' ' + (cy + 0.5 * r) + '" fill="none" stroke="#6b604b" stroke-width="' + Math.max(1.5, r / 6) + '" stroke-linecap="round"/></g>';
  }
  function det(x, y, w, h, label, n) {
    return '<g class="det"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="rgba(239,68,68,0.10)" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="7 4" rx="4"/>' +
      '<rect x="' + x + '" y="' + (y - 22) + '" width="' + (label.length * 7 + 28) + '" height="20" fill="#ef4444" rx="3"/>' +
      '<text x="' + (x + 6) + '" y="' + (y - 7) + '" fill="#fff" font-size="12" font-weight="700" font-family="Segoe UI, system-ui, sans-serif">' + n + ' · ' + label + '</text></g>';
  }
  var DESK = '<defs><linearGradient id="dk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cfc6b8"/><stop offset="1" stop-color="#a99d8a"/></linearGradient>' +
    '<linearGradient id="tb" x1="0" x2="1"><stop offset="0" stop-color="#151b26"/><stop offset=".5" stop-color="#344055"/><stop offset="1" stop-color="#0f141d"/></linearGradient>' +
    '<linearGradient id="gl" x1="0" x2="1"><stop offset="0" stop-color="rgba(255,255,255,.35)"/><stop offset=".45" stop-color="rgba(255,255,255,.8)"/><stop offset="1" stop-color="rgba(255,255,255,.3)"/></linearGradient></defs>' +
    '<rect width="520" height="340" fill="url(#dk)"/>';

  function proteinTub() {
    var t = '';
    for (var i = 0; i < 12; i++) t += tablet(338 + (i % 4) * 30, 178 + Math.floor(i / 4) * 30, 11);
    return '<svg viewBox="0 0 520 340" xmlns="http://www.w3.org/2000/svg">' + DESK +
      '<ellipse cx="170" cy="304" rx="110" ry="14" fill="rgba(0,0,0,.18)"/>' +
      '<rect x="70" y="76" width="200" height="226" rx="18" fill="url(#tb)"/>' +
      '<ellipse cx="170" cy="78" rx="100" ry="16" fill="#e9dcc1"/>' +
      '<rect x="70" y="140" width="200" height="92" fill="#f59e0b"/>' +
      '<text x="170" y="172" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="22" font-weight="900" fill="#111" textLength="176" lengthAdjust="spacingAndGlyphs">WHEY PRO MAX</text>' +
      '<text x="170" y="192" text-anchor="middle" font-family="Arial, sans-serif" font-size="10.5" fill="#1f2937" textLength="176" lengthAdjust="spacingAndGlyphs">2.27 kg · Batch WP-2291 · Exp 09/2027</text>' +
      '<text x="170" y="218" text-anchor="middle" font-family="Tahoma, Arial, sans-serif" font-size="13" font-weight="700" fill="#111" direction="rtl" textLength="172" lengthAdjust="spacingAndGlyphs">مكمل غذائي – بروتين مصل اللبن</text>' +
      '<rect x="305" y="150" width="150" height="118" rx="12" fill="rgba(255,255,255,.55)" stroke="#9ca3af" stroke-width="2"/>' +
      '<rect x="305" y="150" width="150" height="14" rx="6" fill="rgba(156,163,175,.6)"/>' + t +
      '<text x="380" y="292" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#3f3a33">inner pouch found under powder</text>' + NL_RULER(296, 304, 2.75, 65, 5) +
      det(66, 136, 208, 100, 'Label', 'A') + det(298, 142, 164, 132, 'Inner pouch', 'B') + det(323, 164, 120, 92, 'Imprinted tablets', 'C') +
      '</svg>';
  }

  // Metric scale bar: x0/y top-left, px per mm, length in mm, mm per tick. Labels every 10 mm.
  function NL_RULER(x0, y, ppm, len, step) {
    var w = len * ppm, out = '<rect x="' + (x0 - 6) + '" y="' + y + '" width="' + (w + 30) + '" height="34" rx="2" fill="#f5e6a8" stroke="#a38f3b"/>';
    for (var mm = 0; mm <= len; mm += step) {
      var x = x0 + mm * ppm, hgt = mm % 10 === 0 ? 13 : mm % 5 === 0 ? 9 : 5;
      out += '<line x1="' + x + '" y1="' + y + '" x2="' + x + '" y2="' + (y + hgt) + '" stroke="#222" stroke-width="' + (step > 1 ? 1.2 : 0.9) + '"/>';
      if (mm % 10 === 0) out += '<text x="' + x + '" y="' + (y + 25) + '" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#222">' + mm + '</text>';
    }
    return out + '<text x="' + (x0 + w + 20) + '" y="' + (y + 25) + '" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" font-weight="700" fill="#222">mm</text>';
  }

  function pillStrip() {
    var t = '';
    var pts = [[120, 150], [160, 140], [200, 158], [140, 190], [182, 196], [222, 190], [110, 228], [152, 236], [196, 230], [236, 226], [130, 270], [176, 274], [216, 266]];
    pts.forEach(function (p) { t += tablet(p[0], p[1], 16); });
    return '<svg viewBox="0 0 520 340" xmlns="http://www.w3.org/2000/svg">' + DESK +
      '<path d="M70 104 h220 v196 h-220 z" fill="rgba(255,255,255,.45)" stroke="#9ca3af" stroke-width="2"/>' +
      '<rect x="70" y="104" width="220" height="16" fill="rgba(59,130,246,.35)"/>' + t +
      '<circle cx="410" cy="150" r="78" fill="#fff" stroke="#0d9488" stroke-width="4"/>' +
      tablet(410, 150, 62) +
      '<line x1="236" y1="190" x2="334" y2="160" stroke="#0d9488" stroke-width="2" stroke-dasharray="5 4"/>' +
      '<text x="410" y="250" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#1f2937" font-weight="700">imprint close-up (AI zoom)</text>' +
      NL_RULER(56, 300, 4, 100, 1) +
      det(90, 120, 170, 172, 'Tablets ×13', 'A') + det(326, 66, 168, 168, 'Twin-crescent imprint', 'B') +
      '</svg>';
  }

  function peptideVials() {
    function vial(x) {
      return '<g><rect x="' + x + '" y="110" width="62" height="150" rx="10" fill="url(#gl)" stroke="#9aa3ad" stroke-width="2"/>' +
        '<rect x="' + (x + 6) + '" y="226" width="50" height="28" rx="6" fill="#f8f7f3"/>' +
        '<rect x="' + (x + 8) + '" y="84" width="46" height="28" rx="5" fill="#dc2626"/>' +
        '<rect x="' + (x + 12) + '" y="100" width="38" height="14" fill="#a3a9b0"/>' +
        '<rect x="' + (x + 2) + '" y="150" width="58" height="60" fill="#fff" stroke="#d1d5db"/>' +
        '<text x="' + (x + 31) + '" y="170" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="800" fill="#111" textLength="48" lengthAdjust="spacingAndGlyphs">BPC-157</text>' +
        '<text x="' + (x + 31) + '" y="184" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#111">5 mg</text>' +
        '<text x="' + (x + 31) + '" y="196" text-anchor="middle" font-family="Arial, sans-serif" font-size="6.5" font-weight="700" fill="#b91c1c" textLength="50" lengthAdjust="spacingAndGlyphs">RESEARCH USE</text>' +
        '<text x="' + (x + 31) + '" y="204" text-anchor="middle" font-family="Arial, sans-serif" font-size="6.5" font-weight="700" fill="#b91c1c">ONLY</text></g>';
    }
    return '<svg viewBox="0 0 520 340" xmlns="http://www.w3.org/2000/svg">' + DESK +
      '<rect x="40" y="70" width="440" height="230" rx="18" fill="rgba(31,41,55,.25)"/>' +
      vial(90) + vial(180) + vial(270) + vial(360) +
      '<text x="260" y="288" text-anchor="middle" font-family="Arial, sans-serif" font-size="11.5" fill="#1f2937">14 vials found in toiletry bag (4 shown)</text>' +
      det(82, 80, 352, 186, 'Lyophilised injectable vials', 'A') + det(182, 146, 66, 68, 'Label', 'B') +
      '</svg>';
  }

  function tabletVariant(cx, cy, r, kind) {
    if (kind === 'crescent') return tablet(cx, cy, r);
    var fills = { scored: '#f5f5f0', letter: '#f2e6c9', plain: '#e8d7d7' };
    var out = '<g><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + (fills[kind] || '#ece4d2') + '" stroke="#b9ae96" stroke-width="1.5"/>';
    if (kind === 'scored') out += '<line x1="' + (cx - 0.8 * r) + '" y1="' + cy + '" x2="' + (cx + 0.8 * r) + '" y2="' + cy + '" stroke="#8a7f6a" stroke-width="' + (r / 7) + '" stroke-linecap="round"/>';
    if (kind === 'letter') out += '<text x="' + cx + '" y="' + (cy + r * 0.35) + '" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="' + (r * 1.0) + '" fill="#8a7f6a">M</text>';
    return out + '</g>';
  }
  var TRAY = ['crescent', 'scored', 'letter', 'plain', 'scored', 'crescent', 'plain', 'letter', 'letter', 'plain', 'crescent', 'scored'];
  function mixedTray() {
    var t = '';
    TRAY.forEach(function (k, i) { t += tabletVariant(110 + (i % 6) * 50, 150 + Math.floor(i / 6) * 70, 16, k); });
    return '<svg viewBox="0 0 520 340" xmlns="http://www.w3.org/2000/svg">' + DESK +
      '<rect x="70" y="100" width="380" height="160" rx="14" fill="#1f2937" opacity=".85"/>' +
      '<text x="260" y="122" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#e5e7eb">Evidence tray · 12 loose tablets from one bag</text>' + t +
      NL_RULER(56, 290, 4, 100, 1) +
      '</svg>';
  }

  NL.deskSamples = {
    'protein-tub': {
      name: 'Supplement tub',
      svg: proteinTub,
      score: 90,
      summary: 'Label not in registry + Captagon-style tablets in inner pouch',
      detections: [
        { id: 'A', label: 'Product label (OCR read)', conf: 97 },
        { id: 'B', label: 'Non-factory inner pouch under powder', conf: 94 },
        { id: 'C', label: 'Tablets · twin-crescent imprint → Captagon-style logo family (library #C-117)', conf: 91 }
      ],
      ocr: [
        { lang: 'EN', text: 'WHEY PRO MAX · 2.27 kg · Batch WP-2291 · Exp 09/2027' },
        { lang: 'AR', text: 'مكمل غذائي – بروتين مصل اللبن', rtl: true }
      ],
      registry: { ok: false, text: '✕ Brand + batch WP-2291 not found in MOHAP product registry' }
    },
    'pill-strip': {
      name: 'Loose tablets',
      svg: pillStrip,
      score: 88,
      summary: '13 tablets with Captagon-style twin-crescent imprint',
      detections: [
        { id: 'A', label: '13 round tablets, 8.1 mm, beige', conf: 96 },
        { id: 'B', label: 'Imprint: twin crescents → Captagon-style logo family (library #C-117)', conf: 92 }
      ],
      ocr: [{ lang: '—', text: 'No packaging text (loose tablets in zip bag)' }],
      registry: { ok: false, text: '✕ No registered medicine with this imprint, size and colour' }
    },
    'peptide-vial': {
      name: 'Peptide vials',
      svg: peptideVials,
      score: 74,
      summary: 'Unregistered injectable peptide (BPC-157), 14 vials',
      detections: [
        { id: 'A', label: '14 lyophilised injectable vials, flip-off caps', conf: 95 },
        { id: 'B', label: 'Label: "BPC-157 5 mg · Research use only"', conf: 93 }
      ],
      ocr: [
        { lang: 'EN', text: 'BPC-157 · 5 mg · RESEARCH USE ONLY · Not for human use' }
      ],
      registry: { ok: false, text: '✕ Injectable peptide not authorised for import or human use in the UAE' }
    },
    'mixed-tray': {
      name: 'Mixed tablets',
      svg: mixedTray,
      score: 0,
      summary: 'Mixed tablets',
      detections: [],
      ocr: [{ lang: '—', text: 'No packaging (loose tablets in an evidence tray)' }],
      registry: { ok: false, text: '✕ Tablets with the twin-crescent logo match no registered medicine – lab to confirm the rest' },
      truth: TRAY
    }
  };
})(window.NL);

/* M2 imprint classes and a randomised tablet close-up renderer.
   Used to generate the classifier's training set and to draw the imprint pad's base tablet. */
(function (NL) {
  'use strict';
  NL.IMPRINT_CLASSES = [
    { id: 'crescent', name: 'Twin-crescent (Captagon-style logo)', risk: true },
    { id: 'plain', name: 'Plain tablet, no imprint', risk: false },
    { id: 'scored', name: 'Score line (typical licensed medicine)', risk: false },
    { id: 'letter', name: 'Letter / number stamp', risk: false }
  ];
  var TAB = ['#ece4d2', '#f5f5f0', '#f2e6c9', '#e8d7d7', '#dfe7f0', '#efe9da'];
  var BG = ['#a99d8a', '#cfc6b8', '#6b6f76', '#3b3f46', '#d9d4cb', '#8c8f94', '#2b2f36'];
  var GLYPHS = 'ABCDEFHKMPRTX0123456789';

  NL.drawTabletCrop = function (ctx, S, cls, r, strokesFn) {
    var c = document.createElement('canvas'); c.width = S; c.height = S;
    var g = c.getContext('2d');
    g.fillStyle = BG[Math.floor(r() * BG.length)]; g.fillRect(0, 0, S, S);
    var cx = S / 2 + (r() - 0.5) * S * 0.12, cy = S / 2 + (r() - 0.5) * S * 0.12, rad = S * (0.33 + r() * 0.1);
    g.beginPath(); g.arc(cx + 1.5, cy + 2, rad, 0, Math.PI * 2); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill();
    var col = TAB[Math.floor(r() * TAB.length)];
    var grd = g.createRadialGradient(cx - rad * 0.4, cy - rad * 0.4, rad * 0.1, cx, cy, rad * 1.1);
    grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.35, col); grd.addColorStop(1, shade(col, -28));
    g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.fillStyle = grd; g.fill();
    g.lineWidth = Math.max(0.8, S / 40); g.strokeStyle = shade(col, -45); g.stroke();
    g.save(); g.translate(cx, cy); g.rotate(r() * Math.PI * 2);
    var ink = 'rgba(' + [110 + r() * 40, 100 + r() * 35, 80 + r() * 30].map(Math.round).join(',') + ',' + (0.6 + r() * 0.35).toFixed(2) + ')';
    g.strokeStyle = ink; g.fillStyle = ink; g.lineCap = 'round';
    g.lineWidth = S * (0.018 + r() * 0.035);
    var j = function (v) { return v + (r() - 0.5) * rad * 0.22; };
    if (strokesFn) strokesFn(g, rad);
    else if (cls === 0) {
      var gap = rad * (0.06 + r() * 0.14), h = rad * (0.42 + r() * 0.22), bulge = rad * (0.45 + r() * 0.35);
      [-1, 1].forEach(function (sgn) {
        g.beginPath(); g.moveTo(sgn * gap, -h); g.quadraticCurveTo(j(sgn * (gap + bulge)), j(0), sgn * gap, h); g.stroke();
      });
    } else if (cls === 2) {
      var L = rad * (0.7 + r() * 0.25);
      g.beginPath(); g.moveTo(-L, j(0) * 0.3); g.lineTo(L, j(0) * 0.3); g.stroke();
    } else if (cls === 3) {
      var txt = GLYPHS[Math.floor(r() * GLYPHS.length)] + (r() < 0.4 ? GLYPHS[Math.floor(r() * GLYPHS.length)] : '');
      g.font = '700 ' + Math.round(rad * (txt.length > 1 ? 0.8 : 1.05)) + 'px Arial, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (r() < 0.5) g.fillText(txt, 0, rad * 0.04); else { g.lineWidth = Math.max(0.8, g.lineWidth * 0.7); g.strokeText(txt, 0, rad * 0.04); }
    }
    g.restore();
    ctx.save();
    ctx.filter = 'blur(' + (r() * 0.9).toFixed(2) + 'px)';
    ctx.drawImage(c, 0, 0);
    ctx.restore();
    var img = ctx.getImageData(0, 0, S, S), d = img.data, amp = 3 + r() * 10, bri = (r() - 0.5) * 40, con = 0.8 + r() * 0.4;
    for (var i = 0; i < d.length; i += 4) {
      var n = (r() - 0.5) * amp * 2;
      for (var k = 0; k < 3; k++) d[i + k] = Math.max(0, Math.min(255, (d[i + k] - 128) * con + 128 + bri + n));
    }
    ctx.putImageData(img, 0, 0);
  };
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var rr = Math.max(0, Math.min(255, (n >> 16) + amt)), gg = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt)), bb = Math.max(0, Math.min(255, (n & 255) + amt));
    return 'rgb(' + rr + ',' + gg + ',' + bb + ')';
  }
})(window.NL);

/* Tablet locations in each officer photo (crop centres + radius), and a det-free SVG for rasterising. */
(function (NL) {
  'use strict';
  var tub = [];
  for (var i = 0; i < 12; i++) tub.push([338 + (i % 4) * 30, 178 + Math.floor(i / 4) * 30, 11]);
  NL.deskSamples['protein-tub'].tablets = tub;
  NL.deskSamples['pill-strip'].tablets = [[120, 150], [160, 140], [200, 158], [140, 190], [182, 196], [222, 190], [110, 228], [152, 236], [196, 230], [236, 226], [130, 270], [176, 274], [216, 266]].map(function (p) { return [p[0], p[1], 16]; });
  NL.deskSamples['peptide-vial'].tablets = [];
  NL.deskSamples['mixed-tray'].tablets = NL.deskSamples['mixed-tray'].truth.map(function (k, i) { return [110 + (i % 6) * 50, 150 + Math.floor(i / 6) * 70, 16]; });
  NL.deskSamples['mixed-tray'].ruler = { y: 292, x0: 53, x1: 462, mmPerTick: 1 };
  // Scale bars (for ruler calibration): scan row y, x-range, mm between ticks
  NL.deskSamples['protein-tub'].ruler = { y: 306, x0: 293, x1: 480, mmPerTick: 5 };
  NL.deskSamples['pill-strip'].ruler = { y: 302, x0: 53, x1: 462, mmPerTick: 1 };
  // scale > 1 renders a sharper copy (used for the on-screen tablet thumbnails)
  NL.rasterPhoto = function (sample, scale) {
    scale = scale || 1;
    return new Promise(function (resolve, reject) {
      var svg = sample.svg().replace(/<g class="det">[\s\S]*?<\/g>/g, '');
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas'); c.width = 520 * scale; c.height = 340 * scale;
        var ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, 520 * scale, 340 * scale);
        resolve(c);
      };
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  };
})(window.NL);
