/* NarcoLens – minimal float32 neural-network runtime (no libraries, works offline and on file://).
   Implements exactly the ops used by the trained M1/M2 models, matching PyTorch semantics. */
(function (NL) {
  'use strict';
  function f32(b64) {
    var s = atob(b64), u = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return new Float32Array(u.buffer);
  }
  function loadModel(name) {
    var L = {};
    (NL.MODEL_WEIGHTS && NL.MODEL_WEIGHTS[name] || []).forEach(function (l) { L[l.name] = { shape: l.shape, w: f32(l.w), b: f32(l.b) }; });
    return L;
  }

  // x: {d: Float32Array, c, h, w}. Stride-1 conv with zero padding and dilation (PyTorch layout [out,in,k,k]).
  function conv(x, L, pad, dil) {
    var OC = L.shape[0], IC = L.shape[1], K = L.shape[2], H = x.h, W = x.w;
    var OH = H + 2 * pad - dil * (K - 1), OW = W + 2 * pad - dil * (K - 1);
    var out = new Float32Array(OC * OH * OW), wt = L.w, inp = x.d;
    for (var oc = 0; oc < OC; oc++) {
      var ob = oc * OH * OW, bias = L.b[oc];
      for (var p = 0; p < OH * OW; p++) out[ob + p] = bias;
      for (var ic = 0; ic < IC; ic++) {
        var ib = ic * H * W;
        for (var ky = 0; ky < K; ky++) {
          var dy = ky * dil - pad;
          var y0 = Math.max(0, -dy), y1 = Math.min(OH, H - dy);
          for (var kx = 0; kx < K; kx++) {
            var wv = wt[((oc * IC + ic) * K + ky) * K + kx];
            if (wv === 0) continue;
            var dx = kx * dil - pad;
            var x0 = Math.max(0, -dx), x1 = Math.min(OW, W - dx);
            for (var yy = y0; yy < y1; yy++) {
              var orow = ob + yy * OW, irow = ib + (yy + dy) * W + dx;
              for (var xx = x0; xx < x1; xx++) out[orow + xx] += wv * inp[irow + xx];
            }
          }
        }
      }
    }
    return { d: out, c: OC, h: OH, w: OW };
  }
  function relu(x) { var d = x.d; for (var i = 0; i < d.length; i++) if (d[i] < 0) d[i] = 0; return x; }
  function pool2(x) {
    var OH = Math.floor(x.h / 2), OW = Math.floor(x.w / 2), out = new Float32Array(x.c * OH * OW), d = x.d;
    for (var c = 0; c < x.c; c++) for (var y = 0; y < OH; y++) for (var xx = 0; xx < OW; xx++) {
      var i = c * x.h * x.w + 2 * y * x.w + 2 * xx;
      out[(c * OH + y) * OW + xx] = Math.max(d[i], d[i + 1], d[i + x.w], d[i + x.w + 1]);
    }
    return { d: out, c: x.c, h: OH, w: OW };
  }
  // Bilinear x2, align_corners=False (PyTorch).
  function up2(x) {
    var OH = x.h * 2, OW = x.w * 2, out = new Float32Array(x.c * OH * OW), d = x.d;
    function idx(o, n) { var s = (o + 0.5) / 2 - 0.5; if (s < 0) s = 0; var i0 = Math.floor(s); var i1 = Math.min(i0 + 1, n - 1); return [i0, i1, s - i0]; }
    var ys = [], xs = [];
    for (var y = 0; y < OH; y++) ys.push(idx(y, x.h));
    for (var xx = 0; xx < OW; xx++) xs.push(idx(xx, x.w));
    for (var c = 0; c < x.c; c++) {
      var b = c * x.h * x.w;
      for (y = 0; y < OH; y++) {
        var Y = ys[y], r0 = b + Y[0] * x.w, r1 = b + Y[1] * x.w, ly = Y[2];
        for (xx = 0; xx < OW; xx++) {
          var X = xs[xx], lx = X[2];
          var top = d[r0 + X[0]] * (1 - lx) + d[r0 + X[1]] * lx;
          var bot = d[r1 + X[0]] * (1 - lx) + d[r1 + X[1]] * lx;
          out[(c * OH + y) * OW + xx] = top * (1 - ly) + bot * ly;
        }
      }
    }
    return { d: out, c: x.c, h: OH, w: OW };
  }
  function cat(a, b) { var d = new Float32Array(a.d.length + b.d.length); d.set(a.d); d.set(b.d, a.d.length); return { d: d, c: a.c + b.c, h: a.h, w: a.w }; }
  function dense(v, L) {
    var O = L.shape[0], I = L.shape[1], out = new Float32Array(O);
    for (var o = 0; o < O; o++) { var s = L.b[o]; for (var i = 0; i < I; i++) s += L.w[o * I + i] * v[i]; out[o] = s; }
    return out;
  }

  // ---------------- M1: X-ray concealment segmentation ----------------
  var M1W = 224, M1H = 128, HW = 112, HH = 64, m1 = null;
  var inCanvas = document.createElement('canvas'); inCanvas.width = M1W; inCanvas.height = M1H;

  function m1Forward(img) {
    m1 = m1 || loadModel('m1');
    var x = { d: img, c: 3, h: M1H, w: M1W };
    var a = pool2(relu(conv(x, m1.c1, 1, 1)));
    var b = pool2(relu(conv(a, m1.c2, 1, 1)));
    b = relu(conv(b, m1.c3, 2, 2)); b = relu(conv(b, m1.c4, 4, 4));
    b = relu(conv(b, m1.c5, 0, 1));
    b = up2(b);
    var h = relu(conv(cat(b, a), m1.c6, 1, 1));
    var o = conv(h, m1.c7, 0, 1).d, p = new Float32Array(o.length);
    for (var i = 0; i < o.length; i++) p[i] = 1 / (1 + Math.exp(-o[i]));
    return p;
  }
  function smooth3(p) { // avg_pool2d(3, stride 1, pad 1, count_include_pad=True)
    var s = new Float32Array(p.length);
    for (var y = 0; y < HH; y++) for (var x = 0; x < HW; x++) {
      var t = 0;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        var yy = y + dy, xx = x + dx;
        if (yy >= 0 && yy < HH && xx >= 0 && xx < HW) t += p[yy * HW + xx];
      }
      s[y * HW + x] = t / 9;
    }
    return s;
  }

  NL.m1 = {
    available: function () { return !!(NL.MODEL_WEIGHTS && NL.MODEL_WEIGHTS.m1); },
    // Runs the model on a 760x440 canvas. Returns {score, prob, boxes, heatCanvas, ms}.
    run: function (srcCanvas) {
      if (!this.available()) return null;
      var t0 = performance.now();
      var ic = inCanvas.getContext('2d');
      ic.drawImage(srcCanvas, 0, 0, M1W, M1H);
      var d = ic.getImageData(0, 0, M1W, M1H).data, N = M1W * M1H, img = new Float32Array(3 * N);
      for (var i = 0; i < N; i++) { img[i] = d[i * 4] / 255 - 0.5; img[N + i] = d[i * 4 + 1] / 255 - 0.5; img[2 * N + i] = d[i * 4 + 2] / 255 - 0.5; }
      var p = m1Forward(img), s = smooth3(p), max = 0;
      for (i = 0; i < s.length; i++) if (s[i] > max) max = s[i];
      // connected components on p > 0.5
      var lab = new Int32Array(p.length), boxes = [], sx = NL.XRAY.W / HW, sy = NL.XRAY.H / HH, next = 0;
      for (i = 0; i < p.length; i++) {
        if (p[i] <= 0.5 || lab[i]) continue;
        next++; var stack = [i], x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0, peak = 0; lab[i] = next;
        while (stack.length) {
          var k = stack.pop(), ky = Math.floor(k / HW), kx = k % HW; n++;
          if (s[k] > peak) peak = s[k];
          x0 = Math.min(x0, kx); x1 = Math.max(x1, kx); y0 = Math.min(y0, ky); y1 = Math.max(y1, ky);
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (o) {
            var nx = kx + o[0], ny = ky + o[1], j = ny * HW + nx;
            if (nx >= 0 && nx < HW && ny >= 0 && ny < HH && !lab[j] && p[j] > 0.5) { lab[j] = next; stack.push(j); }
          });
        }
        if (n >= 4) boxes.push({ x: x0 * sx - 4, y: y0 * sy - 4, w: (x1 - x0 + 1) * sx + 8, h: (y1 - y0 + 1) * sy + 8, score: Math.round(peak * 100), px: n });
      }
      boxes.sort(function (a, b) { return b.score - a.score; });
      var hc = document.createElement('canvas'); hc.width = HW; hc.height = HH;
      var hctx = hc.getContext('2d'), hd = hctx.createImageData(HW, HH);
      for (i = 0; i < p.length; i++) {
        var v = p[i];
        if (v > 0.12) { hd.data[i * 4] = 239; hd.data[i * 4 + 1] = Math.round(68 + (1 - v) * 120); hd.data[i * 4 + 2] = 68; hd.data[i * 4 + 3] = Math.round(Math.min(1, v) * 170); }
      }
      hctx.putImageData(hd, 0, 0);
      return { score: Math.round(max * 100), prob: p, smooth: s, boxes: boxes, heatCanvas: hc, ms: performance.now() - t0, area: boxes.reduce(function (a, b) { return a + b.px; }, 0) / p.length };
    },
    forwardRaw: m1Forward
  };

  // ---------------- M2: tablet imprint classifier ----------------
  var m2 = null;
  function m2Forward(gray) { // Float32Array 48*48, values in [-0.5,0.5]
    m2 = m2 || loadModel('m2');
    var x = { d: gray, c: 1, h: 48, w: 48 };
    x = pool2(relu(conv(x, m2.c1, 1, 1)));
    x = pool2(relu(conv(x, m2.c2, 1, 1)));
    x = pool2(relu(conv(x, m2.c3, 1, 1)));
    var h = dense(x.d, m2.f1); for (var i = 0; i < h.length; i++) if (h[i] < 0) h[i] = 0;
    var o = Array.from(dense(h, m2.f2)), mx = Math.max.apply(null, o), e = o.map(function (v) { return Math.exp(v - mx); }), z = e.reduce(function (a, b) { return a + b; }, 0);
    return e.map(function (v) { return v / z; });
  }
  var cropCanvas = document.createElement('canvas'); cropCanvas.width = 48; cropCanvas.height = 48;
  NL.m2 = {
    available: function () { return !!(NL.MODEL_WEIGHTS && NL.MODEL_WEIGHTS.m2); },
    // Classify a region (sx,sy,sw,sh) of any canvas/image. Returns {probs, top, ms}.
    run: function (src, sx, sy, sw, sh) {
      if (!this.available()) return null;
      var t0 = performance.now(), c = cropCanvas.getContext('2d');
      c.drawImage(src, sx, sy, sw, sh, 0, 0, 48, 48);
      var d = c.getImageData(0, 0, 48, 48).data, g = new Float32Array(48 * 48);
      for (var i = 0; i < g.length; i++) g[i] = Math.round(0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255 - 0.5;
      var probs = m2Forward(g), top = 0;
      for (i = 1; i < probs.length; i++) if (probs[i] > probs[top]) top = i;
      return { probs: probs, top: top, ms: performance.now() - t0 };
    },
    forwardRaw: m2Forward
  };
})(window.NL);
