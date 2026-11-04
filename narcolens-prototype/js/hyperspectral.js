/* NarcoLens prototype – M3: simulated hyperspectral cube, per-pixel spectral matching. */
(function (NL) {
  'use strict';
  var GW = 96, GH = 64, NB = NL.WL.length;
  var REFS = NL.library.concat(NL.materials);

  function centred(v) {
    var m = 0, i;
    for (i = 0; i < v.length; i++) m += v[i];
    m /= v.length;
    var out = new Float32Array(v.length), s = 0;
    for (i = 0; i < v.length; i++) { out[i] = v[i] - m; s += out[i] * out[i]; }
    s = Math.sqrt(s) || 1;
    for (i = 0; i < v.length; i++) out[i] /= s;
    return out;
  }
  var REF_C = REFS.map(function (r) { return centred(r.s); });
  function corr(vc, k) {
    var a = REF_C[k], s = 0;
    for (var i = 0; i < NB; i++) s += vc[i] * a[i];
    return s;
  }
  function rank(spec) {
    var vc = centred(spec);
    return REFS.map(function (r, k) { return { ref: r, r: corr(vc, k) }; })
      .sort(function (a, b) { return b.r - a.r; });
  }

  NL.hyperScenes = {
    tub: { name: 'Sealed tub (case bag)', seed: 101 },
    vials: { name: 'Peptide vials', seed: 202 },
    clean: { name: 'Clean supplement (control)', seed: 303 }
  };

  function mixAt(scene, x, y) {
    if (scene === 'vials') {
      for (var v = 0; v < 4; v++) {
        var vx = 14 + v * 20;
        if (x >= vx && x < vx + 12 && y >= 10 && y < 56) {
          if (x === vx || x === vx + 11 || y === 10) return { glass: 1 };
          if (y > 40) return { peptide: 0.7, glass: 0.3 };
          return { glass: 1 };
        }
      }
      return { bg: 1 };
    }
    var dx = x - 46, dy = y - 32, d = Math.sqrt(dx * dx + dy * dy);
    if (d > 28) return { bg: 1 };
    if (d > 25) return { hdpe: 0.85, whey: 0.15 };
    if (scene === 'tub') {
      var ex = (x - 54) / 13, ey = (y - 30) / 9;
      if (ex * ex + ey * ey < 1) return { ats: 0.78, whey: 0.22 };
    }
    return { whey: 1 };
  }

  function build(scene) {
    var r = NL.rng(NL.hyperScenes[scene].seed);
    var px = new Array(GW * GH);
    for (var y = 0; y < GH; y++) {
      for (var x = 0; x < GW; x++) {
        var mix = mixAt(scene, x, y);
        var s = new Float32Array(NB);
        var gain = 0.92 + r() * 0.16;
        Object.keys(mix).forEach(function (id) {
          var ref = NL.ref(id).s, f = mix[id] * gain;
          for (var i = 0; i < NB; i++) s[i] += ref[i] * f;
        });
        for (var i = 0; i < NB; i++) s[i] += NL.gauss(r) * 0.018;
        px[y * GW + x] = s;
      }
    }
    // classify every pixel
    var cls = new Array(GW * GH);
    for (var k = 0; k < px.length; k++) {
      var best = rank(px[k])[0];
      cls[k] = best;
    }
    return { scene: scene, px: px, cls: cls };
  }

  function bandIdx(wl) { return Math.round((wl - 1000) / 10); }
  var BANDS = [bandIdx(2262), bandIdx(1690), bandIdx(1510)];

  var H = { cache: {}, cur: null, scanned: false, selected: null, result: null };
  NL.hyper = H;

  H.setScene = function (scene) {
    if (!H.cache[scene]) H.cache[scene] = build(scene);
    H.cur = H.cache[scene];
    H.scanned = false;
    H.selected = null;
    H.result = null;
    H.draw();
    H.drawSpectrum();
  };

  function falseColour(data) {
    var lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9], c, k;
    for (k = 0; k < data.px.length; k++) for (c = 0; c < 3; c++) {
      var v = data.px[k][BANDS[c]];
      if (v < lo[c]) lo[c] = v;
      if (v > hi[c]) hi[c] = v;
    }
    var img = new ImageData(GW, GH);
    for (k = 0; k < data.px.length; k++) for (c = 0; c < 3; c++) {
      var n = (data.px[k][BANDS[c]] - lo[c]) / ((hi[c] - lo[c]) || 1);
      img.data[k * 4 + c] = Math.round(20 + 225 * Math.pow(n, 0.85));
      img.data[k * 4 + 3] = 255;
    }
    return img;
  }

  H.draw = function (rows) {
    var cv = document.getElementById('hyperCanvas');
    if (!cv || !H.cur) return;
    var ctx = cv.getContext('2d');
    if (!H.cur.img) {
      H.cur.img = document.createElement('canvas');
      H.cur.img.width = GW; H.cur.img.height = GH;
      H.cur.img.getContext('2d').putImageData(falseColour(H.cur), 0, 0);
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(H.cur.img, 0, 0, cv.width, cv.height);
    var sx = cv.width / GW, sy = cv.height / GH;
    var limit = rows == null ? (H.scanned ? GH : 0) : rows;
    var mapOn = document.getElementById('hyperMap');
    if (mapOn && !mapOn.checked) limit = 0;
    for (var y = 0; y < limit; y++) for (var x = 0; x < GW; x++) {
      var c = H.cur.cls[y * GW + x];
      if (c.ref.illicit && c.r > 0.8) {
        ctx.fillStyle = 'rgba(239,68,68,0.62)';
        ctx.fillRect(x * sx, y * sy, sx + 0.5, sy + 0.5);
      }
    }
    if (rows != null && rows < GH) {
      ctx.fillStyle = 'rgba(45,212,191,0.95)';
      ctx.fillRect(0, rows * sy - 1, cv.width, 3);
    }
    if (H.selected) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.strokeRect(H.selected.x * sx - 3, H.selected.y * sy - 3, sx + 6, sy + 6);
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
      ctx.strokeRect(H.selected.x * sx - 5, H.selected.y * sy - 5, sx + 10, sy + 10);
    }
  };

  H.autoScan = function () {
    return new Promise(function (resolve) {
      if (!H.cur) return resolve(null);
      var start = performance.now(), dur = 1500;
      function step(now) {
        var p = Math.min(1, (now - start) / dur);
        H.draw(Math.round(GH * p));
        if (p < 1) requestAnimationFrame(step);
        else {
          H.scanned = true;
          H.result = summarise();
          // focus on the most "suspicious" pixel for the spectrum view
          H.selected = H.result.focus;
          H.draw();
          H.drawSpectrum();
          resolve(H.result);
        }
      }
      requestAnimationFrame(step);
    });
  };

  function summarise() {
    var d = H.cur, ill = [], content = 0, k, i;
    for (k = 0; k < d.cls.length; k++) {
      var c = d.cls[k];
      if (c.ref.id !== 'bg') content++;
      if (c.ref.illicit && c.r > 0.8) ill.push(k);
    }
    var target = ill.length ? ill : [];
    if (!target.length) for (k = 0; k < d.cls.length; k++) if (!d.cls[k].ref.material) target.push(k);
    var mean = new Float32Array(NB);
    target.forEach(function (idx) { for (i = 0; i < NB; i++) mean[i] += d.px[idx][i] / target.length; });
    var ranking = rank(mean).filter(function (x) { return !x.ref.material; }).slice(0, 5);
    var focusIdx = target[Math.floor(target.length / 2)] || 0;
    return {
      illicit: ill.length > 0,
      top: ranking[0],
      ranking: ranking,
      coverage: Math.round((ill.length / Math.max(1, content)) * 100),
      pixels: ill.length,
      focus: { x: focusIdx % GW, y: Math.floor(focusIdx / GW) }
    };
  }

  H.pick = function (ev) {
    var cv = document.getElementById('hyperCanvas');
    if (!H.cur) return;
    var rect = cv.getBoundingClientRect();
    var x = Math.floor(((ev.clientX - rect.left) / rect.width) * GW);
    var y = Math.floor(((ev.clientY - rect.top) / rect.height) * GH);
    if (x < 0 || y < 0 || x >= GW || y >= GH) return;
    H.selected = { x: x, y: y };
    H.draw();
    H.drawSpectrum();
  };

  function cssVar(name, fb) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fb;
  }

  H.drawSpectrum = function () {
    var cv = document.getElementById('specCanvas');
    if (!cv) return;
    var ctx = cv.getContext('2d'), Wc = cv.width, Hc = cv.height;
    var pad = { l: 40, r: 12, t: 12, b: 30 };
    ctx.clearRect(0, 0, Wc, Hc);
    var grid = cssVar('--chart-grid', '#e5eaf0'), muted = cssVar('--muted', '#64748b');
    var accent = cssVar('--accent', '#0d9488'), danger = cssVar('--danger', '#dc2626');
    ctx.font = '11px "Segoe UI", system-ui, sans-serif';
    ctx.strokeStyle = grid; ctx.fillStyle = muted; ctx.lineWidth = 1;
    for (var wl = 1000; wl <= 2500; wl += 250) {
      var gx = pad.l + ((wl - 1000) / 1500) * (Wc - pad.l - pad.r);
      ctx.beginPath(); ctx.moveTo(gx, pad.t); ctx.lineTo(gx, Hc - pad.b); ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillText(wl + '', gx, Hc - pad.b + 15);
    }
    for (var g = 0; g <= 4; g++) {
      var gy = pad.t + (g / 4) * (Hc - pad.t - pad.b);
      ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(Wc - pad.r, gy); ctx.stroke();
    }
    ctx.textAlign = 'center';
    ctx.fillText('wavelength (nm)', (Wc + pad.l) / 2, Hc - 2);
    ctx.save(); ctx.translate(11, (Hc - pad.b + pad.t) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('absorbance', 0, 0); ctx.restore();

    var info = document.getElementById('pxInfo');
    if (!H.cur || !H.selected) {
      if (info) info.textContent = 'no pixel selected';
      ctx.fillStyle = muted; ctx.textAlign = 'center';
      ctx.fillText('Run Auto-scan or click the image', Wc / 2, Hc / 2);
      return;
    }
    var spec = H.cur.px[H.selected.y * GW + H.selected.x];
    var rk = rank(spec);
    var best = rk[0];
    var ref = best.ref.s;
    // scale reference onto pixel's mean/std for visual comparison
    function stats(v) { var m = 0, s = 0, i; for (i = 0; i < v.length; i++) m += v[i]; m /= v.length; for (i = 0; i < v.length; i++) s += (v[i] - m) * (v[i] - m); return [m, Math.sqrt(s / v.length) || 1]; }
    var sp = stats(spec), sr = stats(ref);
    var refScaled = ref.map(function (v) { return (v - sr[0]) / sr[1] * sp[1] + sp[0]; });
    var lo = Infinity, hi = -Infinity;
    [spec, refScaled].forEach(function (arr) { for (var i = 0; i < arr.length; i++) { if (arr[i] < lo) lo = arr[i]; if (arr[i] > hi) hi = arr[i]; } });
    var span = (hi - lo) || 1;
    function X(i) { return pad.l + (i / (NB - 1)) * (Wc - pad.l - pad.r); }
    function Y(v) { return Hc - pad.b - ((v - lo) / span) * (Hc - pad.t - pad.b) * 0.92; }
    ctx.setLineDash([6, 4]); ctx.strokeStyle = danger; ctx.lineWidth = 2; ctx.beginPath();
    refScaled.forEach(function (v, i) { if (i) ctx.lineTo(X(i), Y(v)); else ctx.moveTo(X(i), Y(v)); });
    ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = accent; ctx.lineWidth = 2.2; ctx.beginPath();
    for (var i = 0; i < NB; i++) { if (i) ctx.lineTo(X(i), Y(spec[i])); else ctx.moveTo(X(i), Y(spec[i])); }
    ctx.stroke();
    if (info) info.textContent = 'pixel (' + H.selected.x + ', ' + H.selected.y + ') → ' + best.ref.name + ' · ' + Math.round(best.r * 100) + '%';
  };
})(window.NL);
