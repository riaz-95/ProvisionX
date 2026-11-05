/* NarcoLens – M1 X-ray scene generator + renderer.
   The same code renders (a) the demo bags, (b) bags users build, and (c) the synthetic training set
   for the M1 model, so every scene comes with a ground-truth concealment mask. */
(function (NL) {
  'use strict';
  var W = 760, H = 440;
  var IN = { x0: 70, y0: 56, x1: 690, y1: 384 }; // suitcase interior
  var C = {
    organicLight: 'rgba(244,170,80,0.34)',
    organic: 'rgba(226,128,40,0.55)',
    organicDense: 'rgba(170,66,12,0.88)',
    mixed: 'rgba(96,176,96,0.45)',
    mixedDense: 'rgba(40,128,70,0.75)',
    metal: 'rgba(46,86,196,0.85)',
    metalDense: 'rgba(22,34,108,0.92)'
  };
  NL.XRAY = { W: W, H: H };

  // ---------- drawing helpers ----------
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function fillRR(ctx, x, y, w, h, r, c) { rr(ctx, x, y, w, h, r); ctx.fillStyle = c; ctx.fill(); }
  function circle(ctx, x, y, rad, c) { ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); }
  function ellipse(ctx, x, y, rx, ry, rot, c) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); }
  function dense(a) { return 'rgba(170,66,12,' + a + ')'; }

  // Each item is drawn centred at (0,0) after translate/rotate. `m` is the mask context (or null).
  // Positive (concealment) items paint their hidden region into the mask in white.
  var ITEMS = {
    // ----- clutter (negatives) -----
    garment: { label: 'Clothes', draw: function (c, it, r) {
      fillRR(c, -it.w / 2, -it.h / 2, it.w, it.h, 14, C.organicLight);
      c.strokeStyle = 'rgba(214,120,40,0.32)'; c.lineWidth = 2;
      for (var i = 1; i <= 4; i++) {
        var y0 = -it.h / 2 + (it.h * i) / 5, ph = r() * 6;
        c.beginPath(); c.moveTo(-it.w / 2 + 10, y0);
        for (var xx = -it.w / 2 + 10; xx <= it.w / 2 - 10; xx += 12) c.lineTo(xx, y0 + Math.sin(xx / 18 + ph) * 3);
        c.stroke();
      }
      if (it.buttons) for (var b = 0; b < 6; b++) circle(c, 0, -it.h / 2 + 14 + b * (it.h - 28) / 5, 3, 'rgba(214,120,40,0.45)');
    } },
    shoes: { label: 'Shoes', draw: function (c, it) {
      ellipse(c, 0, -14, it.w / 2, it.h / 4, 0, C.organic);
      ellipse(c, 8, 16, it.w / 2, it.h / 4.2, 0, C.organic);
      ellipse(c, 0, -14, it.w / 2 - 8, it.h / 4 - 8, 0, 'rgba(226,128,40,0.3)');
      for (var e = 0; e < 5; e++) circle(c, -it.w / 4 + e * 12, -20, 2.5, C.metal);
    } },
    laptop: { label: 'Laptop', draw: function (c, it) {
      fillRR(c, -it.w / 2, -it.h / 2, it.w, it.h, 8, C.mixed);
      for (var k = 0; k < 6; k++) fillRR(c, -it.w / 2 + 18 + k * (it.w - 30) / 6, it.h / 2 - 46, (it.w - 60) / 6, 34, 3, C.metal);
      fillRR(c, -35, -it.h / 2 + 26, 70, 40, 4, C.mixedDense);
      fillRR(c, -it.w / 2 + 6, -it.h / 2 + 4, 14, 8, 2, C.metalDense);
      fillRR(c, it.w / 2 - 20, -it.h / 2 + 4, 14, 8, 2, C.metalDense);
    } },
    bottles: { label: 'Toiletries', draw: function (c, it) {
      var n = it.n || 3;
      for (var t = 0; t < n; t++) {
        var bx = -it.w / 2 + t * (it.w / n);
        fillRR(c, bx, -it.h / 2 + 8, it.w / n - 6, it.h - 8, 7, C.mixed);
        fillRR(c, bx + 4, -it.h / 2, it.w / n - 14, 10, 3, C.metal);
      }
    } },
    cable: { label: 'Charger cable', draw: function (c, it) {
      c.beginPath(); c.moveTo(-it.w / 2, it.h / 2); c.bezierCurveTo(-it.w / 6, -it.h / 2, it.w / 6, it.h / 2, it.w / 2, -it.h / 2);
      c.lineWidth = 2.5; c.strokeStyle = C.metal; c.stroke();
      fillRR(c, -it.w / 2 - 14, it.h / 2 - 11, 28, 22, 4, C.metalDense);
    } },
    dates: { label: 'Box of dates', draw: function (c, it) {
      fillRR(c, -it.w / 2, -it.h / 2, it.w, it.h, 8, 'rgba(120,180,120,0.3)');
      var cols = Math.max(2, Math.floor(it.w / 26)), rows = Math.max(2, Math.floor(it.h / 22));
      for (var d = 0; d < cols * rows; d++) ellipse(c, -it.w / 2 + 16 + (d % cols) * 25, -it.h / 2 + 16 + Math.floor(d / cols) * 22, 10, 7, 0.3, C.organic);
    } },
    books: { label: 'Books', draw: function (c, it) {
      fillRR(c, -it.w / 2, -it.h / 2, it.w, it.h, 4, 'rgba(226,128,40,0.5)');
      c.strokeStyle = 'rgba(150,70,20,0.35)'; c.lineWidth = 1;
      for (var y = -it.h / 2 + 4; y < it.h / 2; y += 4) { c.beginPath(); c.moveTo(-it.w / 2 + 3, y); c.lineTo(it.w / 2 - 3, y); c.stroke(); }
      fillRR(c, -it.w / 2, -it.h / 2, 8, it.h, 2, 'rgba(170,80,20,0.4)');
    } },
    metal: { label: 'Keys & coins', draw: function (c, it, r) {
      for (var k = 0; k < 5; k++) circle(c, -it.w / 3 + r() * it.w * 0.6, -it.h / 3 + r() * it.h * 0.6, 5 + r() * 5, C.metalDense);
      fillRR(c, -it.w / 2, -4, it.w * 0.7, 8, 3, C.metal);
    } },
    tubClean: { label: 'Protein tub (clean)', draw: function (c, it) {
      var rad = it.w / 2;
      circle(c, 0, 0, rad, 'rgba(96,176,96,0.35)');
      c.lineWidth = 7; c.strokeStyle = C.mixedDense; c.beginPath(); c.arc(0, 0, rad - 2, 0, Math.PI * 2); c.stroke();
      circle(c, 0, 0, rad - 8, C.organic);
      fillRR(c, -rad * 0.4, -rad * 0.75, rad * 0.8, 10, 3, C.mixed); // scoop
    } },

    // ----- concealments (positives: paint the mask) -----
    packet: { label: 'Wrapped packet', positive: true, draw: function (c, it, r, m) {
      fillRR(c, -it.w / 2, -it.h / 2, it.w, it.h, 6, C.organicDense);
      c.strokeStyle = 'rgba(110,40,6,0.6)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-it.w / 2, 0); c.lineTo(it.w / 2, 0); c.moveTo(0, -it.h / 2); c.lineTo(0, it.h / 2); c.stroke();
      if (m) fillRR(m, -it.w / 2, -it.h / 2, it.w, it.h, 6, '#fff');
    } },
    lining: { label: 'Packets in lining', positive: true, draw: function (c, it, r, m) {
      var seg = (it.w - 30) / 2;
      [-it.w / 2, -it.w / 2 + seg + 30].forEach(function (x0) {
        fillRR(c, x0, -it.h / 2, seg, it.h, 6, C.organicDense);
        fillRR(c, x0, -it.h / 2, seg, it.h, 6, 'rgba(150,60,10,0.3)');
        if (m) fillRR(m, x0, -it.h / 2, seg, it.h, 6, '#fff');
      });
    } },
    tub: { label: 'Protein tub (block)', positive: true, draw: function (c, it, r, m) {
      ITEMS.tubClean.draw(c, it, r, null);
      var rad = it.w / 2, bw = rad * 1.15, bh = rad * 0.95;
      fillRR(c, -bw / 2, -bh / 2, bw, bh, 10, C.organicDense);
      for (var i = 0; i < 9; i++) circle(c, -bw / 2 + 8 + (i % 3) * (bw - 16) / 2, -bh / 2 + 8 + Math.floor(i / 3) * (bh - 16) / 2, rad * 0.11, 'rgba(140,50,8,0.9)');
      if (m) fillRR(m, -bw / 2, -bh / 2, bw, bh, 10, '#fff');
    } },
    buttons: { label: 'Shirt with dense buttons', positive: true, draw: function (c, it, r, m) {
      fillRR(c, -it.w / 2, -it.h / 2, it.w, it.h, 16, C.organicLight);
      c.strokeStyle = 'rgba(214,120,40,0.45)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(0, -it.h / 2 + 4); c.lineTo(0, it.h / 2 - 4); c.stroke();
      var n = 7, step = (it.h - 30) / (n - 1);
      for (var b = 0; b < n; b++) { circle(c, 0, -it.h / 2 + 15 + b * step, 8, C.organicDense); circle(c, 0, -it.h / 2 + 15 + b * step, 4, 'rgba(120,40,6,0.8)'); }
      if (m) fillRR(m, -11, -it.h / 2 + 5, 22, it.h - 10, 8, '#fff');
    } },
    vials: { label: 'Vial cluster', positive: true, draw: function (c, it, r, m) {
      fillRR(c, -it.w / 2, -it.h / 2, it.w, it.h, 14, 'rgba(96,176,96,0.22)');
      var cols = Math.max(3, Math.floor((it.w - 16) / 26)), rows = Math.max(1, Math.floor((it.h - 10) / 48));
      for (var v = 0; v < cols * rows; v++) {
        var vx = -it.w / 2 + 12 + (v % cols) * 26, vy = -it.h / 2 + 12 + Math.floor(v / cols) * 48;
        fillRR(c, vx, vy, 14, 38, 4, 'rgba(96,176,96,0.5)');
        fillRR(c, vx + 2, vy + 18, 10, 18, 3, C.organic);
        fillRR(c, vx - 1, vy - 4, 16, 7, 2, C.metal);
        if (m) fillRR(m, vx, vy - 4, 16, 42, 3, '#fff');
      }
    } },
    falsebottom: { label: 'False bottom slab', positive: true, draw: function (c, it, r, m) {
      fillRR(c, -it.w / 2, -it.h / 2, it.w, it.h, 6, dense(0.72));
      if (m) fillRR(m, -it.w / 2, -it.h / 2, it.w, it.h, 6, '#fff');
    } }
  };
  NL.xrayItems = ITEMS;
  NL.CLUTTER = ['garment', 'shoes', 'laptop', 'bottles', 'cable', 'dates', 'books', 'metal', 'tubClean'];
  NL.CONCEALMENTS = ['packet', 'lining', 'tub', 'buttons', 'vials', 'falsebottom'];

  // Default size for an item type (used by random scenes and the Bag Builder).
  function sizeFor(type, r) {
    r = r || Math.random;
    switch (type) {
      case 'garment': return { w: 180 + r() * 110, h: 90 + r() * 80, buttons: r() < 0.4 };
      case 'shoes': return { w: 120 + r() * 40, h: 90 + r() * 20 };
      case 'laptop': return { w: 180 + r() * 50, h: 120 + r() * 30 };
      case 'bottles': return { w: 60 + r() * 50, h: 56 + r() * 20, n: 2 + Math.floor(r() * 3) };
      case 'cable': return { w: 80 + r() * 80, h: 40 + r() * 60 };
      case 'dates': return { w: 110 + r() * 70, h: 70 + r() * 40 };
      case 'books': return { w: 100 + r() * 60, h: 70 + r() * 50 };
      case 'metal': return { w: 50 + r() * 40, h: 40 + r() * 30 };
      case 'tubClean': case 'tub': var d = 110 + r() * 50; return { w: d, h: d };
      case 'packet': return { w: 70 + r() * 80, h: 40 + r() * 40 };
      case 'lining': return { w: 260 + r() * 260, h: 18 + r() * 12 };
      case 'buttons': return { w: 160 + r() * 80, h: 140 + r() * 40 };
      case 'vials': return { w: 150 + r() * 60, h: 60 + r() * 60 };
      case 'falsebottom': return { w: 500 + r() * 110, h: 22 + r() * 14 };
    }
    return { w: 80, h: 60 };
  }

  function place(type, r, scene) {
    var s = sizeFor(type, r);
    var it = { type: type, w: s.w, h: s.h, n: s.n, buttons: s.buttons, rot: 0, seed: Math.floor(r() * 1e9) };
    if (type === 'lining') { // along an inner wall
      var side = Math.floor(r() * 3);
      if (side === 2) { it.rot = Math.PI / 2; it.x = IN.x0 + 26 + r() * 10; it.y = (IN.y0 + IN.y1) / 2; it.w = Math.min(it.w, IN.y1 - IN.y0 - 20); }
      else { it.x = IN.x0 + it.w / 2 + 20 + r() * Math.max(0, IN.x1 - IN.x0 - it.w - 40); it.y = side ? IN.y1 - 14 : IN.y0 + 8; }
    } else if (type === 'falsebottom') {
      it.x = (IN.x0 + IN.x1) / 2 + (r() - 0.5) * 20; it.y = IN.y1 - it.h / 2 + 2;
    } else {
      it.rot = (type === 'packet' || type === 'books' || type === 'metal') ? (r() - 0.5) * 1.2 : (r() - 0.5) * 0.3;
      it.x = IN.x0 + it.w / 2 + r() * Math.max(1, IN.x1 - IN.x0 - it.w);
      it.y = IN.y0 + it.h / 2 + r() * Math.max(1, IN.y1 - IN.y0 - it.h);
    }
    return it;
  }

  // ---------- scenes ----------
  NL.randomScene = function (seed, opts) {
    opts = opts || {};
    var r = NL.rng(seed);
    var sc = { seed: seed, bg: 238 + Math.floor(r() * 14), noise: 4 + r() * 8, handle: r() < 0.5 ? 'left' : 'right', items: [] };
    var nG = 2 + Math.floor(r() * 4);
    for (var i = 0; i < nG; i++) sc.items.push(place('garment', r));
    NL.CLUTTER.slice(1).forEach(function (t) { if (r() < (t === 'metal' ? 0.6 : 0.4)) sc.items.push(place(t, r)); });
    var pos = opts.positives != null ? opts.positives : (r() < 0.5 ? 0 : (r() < 0.75 ? 1 : 2));
    for (var p = 0; p < pos; p++) sc.items.push(place(NL.CONCEALMENTS[Math.floor(r() * NL.CONCEALMENTS.length)], r));
    // shuffle draw order a little (items overlap translucently)
    sc.items.sort(function () { return r() - 0.5; });
    return sc;
  };

  // Demo bags: random-looking clutter + one known concealment in a fixed place.
  NL.demoScene = function (concealment, seed) {
    var sc = NL.randomScene(seed, { positives: 0 });
    sc.items = sc.items.filter(function (it) { return it.type !== 'dates' && it.type !== 'tubClean'; });
    var add = {
      none: null,
      lining: { type: 'lining', x: 380, y: 64, w: 440, h: 24, rot: 0 },
      protein: { type: 'tub', x: 540, y: 262, w: 148, h: 148, rot: 0 },
      dates: { type: 'dates', x: 550, y: 282, w: 160, h: 104, rot: 0 },
      buttons: { type: 'buttons', x: 296, y: 276, w: 210, h: 160, rot: 0 },
      vials: { type: 'vials', x: 552, y: 142, w: 200, h: 112, rot: 0 },
      'false-bottom': { type: 'falsebottom', x: 380, y: 366, w: 600, h: 28, rot: 0 },
      double: [{ type: 'packet', x: 230, y: 300, w: 110, h: 60, rot: 0.2 }, { type: 'buttons', x: 540, y: 210, w: 200, h: 160, rot: 0 }],
      'under-laptop': [{ type: 'packet', x: 330, y: 215, w: 110, h: 55, rot: 0 }, { type: 'laptop', x: 335, y: 205, w: 230, h: 150, rot: 0 }],
      'dense-clean': [{ type: 'books', x: 250, y: 250, w: 150, h: 110, rot: 0.1 }, { type: 'tubClean', x: 540, y: 255, w: 140, h: 140, rot: 0 }, { type: 'dates', x: 420, y: 130, w: 160, h: 90, rot: 0 }],
      rotated: [{ type: 'shoes', x: 380, y: 300, w: 140, h: 100, rot: 0.1 }, { type: 'packet', x: 260, y: 270, w: 95, h: 48, rot: 0.75 }, { type: 'packet', x: 500, y: 160, w: 85, h: 42, rot: -0.9 }]
    }[concealment];
    if (concealment === 'dense-clean' || concealment === 'under-laptop') sc.items = sc.items.filter(function (it) { return it.type !== 'laptop'; });
    if (add) [].concat(add).forEach(function (it, i) { it.seed = seed * 7 + i; sc.items.push(it); });
    return sc;
  };

  NL.sceneHasConcealment = function (sc) { return sc.items.some(function (it) { return ITEMS[it.type] && ITEMS[it.type].positive; }); };

  // Render a scene into an image canvas (and optionally a mask canvas).
  NL.renderScene = function (sc, ctx, mctx) {
    var r = NL.rng(sc.seed || 1);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgb(' + (sc.bg || 246) + ',' + ((sc.bg || 246) - 3) + ',' + ((sc.bg || 246) - 10) + ')';
    ctx.fillRect(0, 0, W, H);
    if (mctx) { mctx.fillStyle = '#000'; mctx.fillRect(0, 0, W, H); }
    ctx.globalCompositeOperation = 'multiply';
    // shell
    fillRR(ctx, 50, 36, 660, 368, 28, 'rgba(140,196,150,0.25)');
    rr(ctx, 50, 36, 660, 368, 28); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(60,140,90,0.55)'; ctx.stroke();
    rr(ctx, 62, 48, 636, 344, 20); ctx.setLineDash([3, 5]); ctx.lineWidth = 2; ctx.strokeStyle = C.metal; ctx.stroke(); ctx.setLineDash([]);
    var hx = sc.handle === 'right' ? 632 : 90;
    fillRR(ctx, hx, 58, 7, 324, 3, C.metal);
    fillRR(ctx, hx + 32, 58, 7, 324, 3, C.metal);
    fillRR(ctx, hx - 6, 56, 51, 12, 4, C.metalDense);
    [[86, 398], [674, 398]].forEach(function (p) { circle(ctx, p[0], p[1], 15, C.metalDense); });
    sc.items.forEach(function (it) {
      var def = ITEMS[it.type];
      if (!def) return;
      var ir = NL.rng(it.seed || 3);
      ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot || 0);
      if (mctx) { mctx.save(); mctx.translate(it.x, it.y); mctx.rotate(it.rot || 0); }
      def.draw(ctx, it, ir, def.positive ? mctx : null);
      ctx.restore();
      if (mctx) mctx.restore();
    });
    ctx.globalCompositeOperation = 'source-over';
    // sensor noise
    if (sc.noise) {
      var img = ctx.getImageData(0, 0, W, H), d = img.data, amp = sc.noise;
      for (var i = 0; i < d.length; i += 4) {
        var n = (r() - 0.5) * amp * 2;
        d[i] = Math.max(0, Math.min(255, d[i] + n)); d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n)); d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
      }
      ctx.putImageData(img, 0, 0);
    }
  };

  // ---------- overlay ----------
  NL.drawOverlay = function (ctx, res) {
    if (!res) return;
    if (res.heatCanvas) {
      ctx.save(); ctx.globalAlpha = 0.85; ctx.imageSmoothingEnabled = true;
      ctx.drawImage(res.heatCanvas, 0, 0, W, H); ctx.restore();
    }
    (res.boxes || []).forEach(function (f) {
      var col = f.score >= 60 ? '239,68,68' : '245,158,11';
      ctx.setLineDash([7, 4]); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgb(' + col + ')';
      ctx.strokeRect(f.x, f.y, f.w, f.h); ctx.setLineDash([]);
      var txt = 'AI · concealment ' + f.score;
      ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
      var tw = ctx.measureText(txt).width + 14, ty = f.y > 26 ? f.y - 24 : f.y + f.h + 4, tx = Math.max(0, Math.min(f.x, W - tw - 4));
      ctx.fillStyle = 'rgb(' + col + ')'; ctx.fillRect(tx, ty, tw, 21);
      ctx.fillStyle = '#fff'; ctx.fillText(txt, tx + 7, ty + 15);
    });
  };
  NL.drawTruth = function (ctx, maskCanvas) {
    if (!maskCanvas) return;
    var t = document.createElement('canvas'); t.width = W; t.height = H;
    var tc = t.getContext('2d');
    tc.drawImage(maskCanvas, 0, 0);
    tc.globalCompositeOperation = 'source-in'; // keep white mask pixels only? mask is opaque, so tint via multiply
    var md = maskCanvas.getContext('2d').getImageData(0, 0, W, H).data, img = tc.createImageData(W, H);
    for (var i = 0; i < md.length; i += 4) if (md[i] > 127) { img.data[i] = 59; img.data[i + 1] = 130; img.data[i + 2] = 246; img.data[i + 3] = 110; }
    tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, W, H); tc.putImageData(img, 0, 0);
    ctx.drawImage(t, 0, 0);
  };

  function stopAnim(canvas) {
    if (canvas._raf) cancelAnimationFrame(canvas._raf);
    if (canvas._timer) clearTimeout(canvas._timer);
  }

  // Render a scene (or an uploaded image), animate the belt pass, then run the M1 model.
  NL.scanScene = function (canvas, scene, opts) {
    opts = opts || {};
    stopAnim(canvas);
    var off = document.createElement('canvas'); off.width = W; off.height = H;
    var mask = null;
    if (scene.image) {
      var oc = off.getContext('2d'); oc.fillStyle = '#f7f4ee'; oc.fillRect(0, 0, W, H);
      var s = Math.min(W / scene.image.width, H / scene.image.height), iw = scene.image.width * s, ih = scene.image.height * s;
      oc.drawImage(scene.image, (W - iw) / 2, (H - ih) / 2, iw, ih);
    } else {
      mask = document.createElement('canvas'); mask.width = W; mask.height = H;
      NL.renderScene(scene, off.getContext('2d'), mask.getContext('2d'));
    }
    canvas._off = off; canvas._mask = mask; canvas._res = null;
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');
    var start = performance.now(), dur = opts.fast ? 250 : 1000;
    function frame(now) {
      var p = Math.min(1, (now - start) / dur);
      ctx.fillStyle = '#1b1f24'; ctx.fillRect(0, 0, W, H);
      var x = Math.max(1, Math.round(W * p));
      ctx.drawImage(off, 0, 0, x, H, 0, 0, x, H);
      ctx.fillStyle = 'rgba(45,212,191,0.95)'; ctx.fillRect(x - 2, 0, 3, H);
      if (p < 1) { canvas._raf = requestAnimationFrame(frame); return; }
      ctx.drawImage(off, 0, 0);
      canvas._timer = setTimeout(function () {
        var res = NL.m1 ? NL.m1.run(off) : null;
        canvas._res = res;
        NL.redrawXray(canvas);
        if (opts.onDone) opts.onDone(res, mask);
      }, 30);
    }
    canvas._raf = requestAnimationFrame(frame);
  };

  NL.redrawXray = function (canvas) {
    if (!canvas._off) return;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(canvas._off, 0, 0);
    var t = document.getElementById('truthToggle');
    if (t && t.checked && canvas._mask) NL.drawTruth(ctx, canvas._mask);
    if (NL.overlayOn() && canvas._res) NL.drawOverlay(ctx, canvas._res);
  };
  NL.overlayOn = function () { var t = document.getElementById('overlayToggle'); return !t || t.checked; };
  NL.sizeFor = sizeFor;
  NL.placeItem = place;
  NL.XRAY_INTERIOR = IN;
})(window.NL);
