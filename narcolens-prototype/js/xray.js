/* NarcoLens prototype – M1: procedural dual-energy X-ray renderer + AI overlay (simulated). */
(function (NL) {
  'use strict';
  var W = 760, H = 440;
  var C = {
    organicLight: 'rgba(244,170,80,0.34)',
    organic: 'rgba(226,128,40,0.55)',
    organicDense: 'rgba(170,66,12,0.88)',
    mixed: 'rgba(96,176,96,0.45)',
    mixedDense: 'rgba(40,128,70,0.75)',
    metal: 'rgba(46,86,196,0.85)',
    metalDense: 'rgba(22,34,108,0.92)'
  };

  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
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

  function garment(ctx, x, y, w, h, r) {
    fillRR(ctx, x, y, w, h, 14, C.organicLight);
    ctx.strokeStyle = 'rgba(214,120,40,0.32)';
    ctx.lineWidth = 2;
    for (var i = 1; i <= 4; i++) {
      var y0 = y + (h * i) / 5, ph = r() * 6;
      ctx.beginPath();
      ctx.moveTo(x + 10, y0);
      for (var xx = x + 10; xx <= x + w - 10; xx += 12) ctx.lineTo(xx, y0 + Math.sin(xx / 18 + ph) * 3);
      ctx.stroke();
    }
  }

  function drawConcealment(ctx, type) {
    var m = NL.concealments[type];
    var f = [];
    function add(x, y, w, h, label, level) { f.push({ x: x, y: y, w: w, h: h, label: label, score: m.m1, level: level || 'high' }); }
    switch (type) {
      case 'lining':
        fillRR(ctx, 160, 50, 210, 24, 6, C.organicDense);
        fillRR(ctx, 410, 50, 190, 24, 6, C.organicDense);
        fillRR(ctx, 160, 50, 210, 24, 6, 'rgba(150,60,10,0.35)');
        add(150, 42, 460, 40, 'Organic packets in lining');
        break;
      case 'protein':
        circle(ctx, 540, 262, 74, 'rgba(96,176,96,0.35)');
        ctx.lineWidth = 7; ctx.strokeStyle = C.mixedDense; ctx.beginPath(); ctx.arc(540, 262, 72, 0, Math.PI * 2); ctx.stroke();
        circle(ctx, 540, 262, 66, C.organic);
        fillRR(ctx, 500, 226, 86, 70, 10, C.organicDense);
        for (var i = 0; i < 9; i++) circle(ctx, 506 + (i % 3) * 26, 232 + Math.floor(i / 3) * 22, 8, 'rgba(140,50,8,0.9)');
        add(462, 184, 156, 156, 'Dense block in supplement tub');
        break;
      case 'dates':
        fillRR(ctx, 470, 230, 160, 104, 8, 'rgba(120,180,120,0.3)');
        for (var d = 0; d < 24; d++) {
          ctx.beginPath();
          ctx.ellipse(488 + (d % 6) * 25, 248 + Math.floor(d / 6) * 22, 10, 7, 0.3, 0, Math.PI * 2);
          ctx.fillStyle = C.organic; ctx.fill();
        }
        add(462, 222, 176, 120, 'Food-like organic mass', 'low');
        break;
      case 'buttons':
        fillRR(ctx, 190, 196, 210, 160, 16, C.organicLight);
        ctx.strokeStyle = 'rgba(214,120,40,0.45)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(296, 200); ctx.lineTo(296, 352); ctx.stroke();
        for (var b = 0; b < 7; b++) { circle(ctx, 296, 214 + b * 20, 8, C.organicDense); circle(ctx, 296, 214 + b * 20, 4, 'rgba(120,40,6,0.8)'); }
        add(276, 198, 40, 152, 'Dense buttons');
        break;
      case 'vials':
        fillRR(ctx, 452, 86, 200, 112, 14, 'rgba(96,176,96,0.22)');
        for (var v = 0; v < 14; v++) {
          var vx = 468 + (v % 7) * 26, vy = 98 + Math.floor(v / 7) * 48;
          fillRR(ctx, vx, vy, 14, 38, 4, 'rgba(96,176,96,0.5)');
          fillRR(ctx, vx + 2, vy + 18, 10, 18, 3, C.organic);
          fillRR(ctx, vx - 1, vy - 4, 16, 7, 2, C.metal);
        }
        add(444, 78, 216, 128, 'Vial cluster (14)');
        break;
      case 'false-bottom':
        fillRR(ctx, 72, 352, 616, 28, 6, 'rgba(170,66,12,0.7)');
        add(66, 344, 628, 44, 'Slab under base panel');
        break;
    }
    return f;
  }

  function drawScene(ctx, bag) {
    var r = NL.rng(bag.seed);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#f7f4ee';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'multiply';

    // suitcase shell, zip, handle, wheels
    fillRR(ctx, 50, 36, 660, 368, 28, 'rgba(140,196,150,0.25)');
    rr(ctx, 50, 36, 660, 368, 28); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(60,140,90,0.55)'; ctx.stroke();
    rr(ctx, 62, 48, 636, 344, 20); ctx.setLineDash([3, 5]); ctx.lineWidth = 2; ctx.strokeStyle = C.metal; ctx.stroke(); ctx.setLineDash([]);
    fillRR(ctx, 90, 58, 7, 324, 3, C.metal);
    fillRR(ctx, 122, 58, 7, 324, 3, C.metal);
    fillRR(ctx, 84, 56, 51, 12, 4, C.metalDense);
    [[86, 398], [674, 398]].forEach(function (p) { circle(ctx, p[0], p[1], 15, C.metalDense); circle(ctx, p[0], p[1], 6, '#f7f4ee'); });

    // clothes
    [[150, 72, 250, 118], [160, 200, 230, 170], [400, 74, 280, 110], [420, 196, 250, 100]].forEach(function (g) {
      garment(ctx, g[0] + (r() - 0.5) * 16, g[1] + (r() - 0.5) * 12, g[2], g[3], r);
    });

    // shoes
    if (r() > 0.3) {
      ctx.save(); ctx.translate(250 + r() * 40, 330); ctx.rotate(-0.15);
      ctx.beginPath(); ctx.ellipse(0, 0, 70, 24, 0, 0, Math.PI * 2); ctx.fillStyle = C.organic; ctx.fill();
      ctx.beginPath(); ctx.ellipse(10, 34, 70, 22, 0, 0, Math.PI * 2); ctx.fill();
      for (var e = 0; e < 5; e++) circle(ctx, -30 + e * 12, -6, 2.5, C.metal);
      ctx.restore();
    }

    // laptop / tablet
    if (r() > 0.35) {
      var lx = 180 + r() * 60, ly = 110 + r() * 40;
      fillRR(ctx, lx, ly, 210, 140, 8, C.mixed);
      for (var c = 0; c < 6; c++) fillRR(ctx, lx + 20 + c * 30, ly + 92, 24, 34, 3, C.metal);
      fillRR(ctx, lx + 70, ly + 30, 70, 40, 4, C.mixedDense);
      fillRR(ctx, lx + 6, ly + 4, 14, 8, 2, C.metalDense);
      fillRR(ctx, lx + 190, ly + 4, 14, 8, 2, C.metalDense);
    }

    // toiletries
    var nb = 2 + Math.floor(r() * 2);
    for (var t = 0; t < nb; t++) {
      var bx = 600 + t * 30 - (r() * 10), by = 250 + r() * 70;
      fillRR(ctx, bx, by, 22, 64, 7, C.mixed);
      fillRR(ctx, bx + 4, by - 8, 14, 10, 3, C.metal);
    }

    // charger cable
    ctx.beginPath(); ctx.moveTo(420, 330); ctx.bezierCurveTo(470, 280, 380, 250, 470, 210 + r() * 20);
    ctx.lineWidth = 2.5; ctx.strokeStyle = C.metal; ctx.stroke();
    fillRR(ctx, 412, 326, 30, 22, 4, C.metalDense);

    var findings = drawConcealment(ctx, bag.concealment);
    ctx.globalCompositeOperation = 'source-over';
    return findings;
  }

  NL.drawOverlay = function (ctx, findings) {
    findings.forEach(function (f) {
      var col = f.level === 'low' ? '245,158,11' : '239,68,68';
      var cx = f.x + f.w / 2, cy = f.y + f.h / 2, rad = Math.max(f.w, f.h) * 0.75;
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, 'rgba(' + col + ',0.42)');
      g.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
      ctx.setLineDash([7, 4]);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgb(' + col + ')';
      ctx.strokeRect(f.x, f.y, f.w, f.h);
      ctx.setLineDash([]);
      var txt = f.label + ' · ' + f.score;
      ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
      var tw = ctx.measureText(txt).width + 14;
      var ty = f.y > 26 ? f.y - 24 : f.y + f.h + 4;
      var tx = Math.min(f.x, W - tw - 4);
      ctx.fillStyle = 'rgb(' + col + ')';
      ctx.fillRect(tx, ty, tw, 21);
      ctx.fillStyle = '#fff';
      ctx.fillText(txt, tx + 7, ty + 15);
    });
  };

  function stopAnim(canvas) {
    if (canvas._raf) cancelAnimationFrame(canvas._raf);
    if (canvas._timer) clearTimeout(canvas._timer);
  }

  // Animate the bag passing the scanner, then (optionally) draw the AI overlay.
  NL.scanBag = function (canvas, bag, opts) {
    opts = opts || {};
    stopAnim(canvas);
    var off = document.createElement('canvas');
    off.width = W; off.height = H;
    var findings = drawScene(off.getContext('2d'), bag);
    canvas._off = off;
    canvas._findings = findings;
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');
    var start = performance.now(), dur = opts.fast ? 300 : 1100;
    function frame(now) {
      var p = Math.min(1, (now - start) / dur);
      ctx.fillStyle = '#1b1f24';
      ctx.fillRect(0, 0, W, H);
      var x = Math.max(1, Math.round(W * p));
      ctx.drawImage(off, 0, 0, x, H, 0, 0, x, H);
      ctx.fillStyle = 'rgba(45,212,191,0.95)';
      ctx.fillRect(x - 2, 0, 3, H);
      if (p < 1) {
        canvas._raf = requestAnimationFrame(frame);
      } else {
        ctx.drawImage(off, 0, 0);
        canvas._timer = setTimeout(function () {
          NL.redrawXray(canvas, opts.overlay !== false && NL.overlayOn());
          if (opts.onDone) opts.onDone(findings);
        }, opts.fast ? 50 : 380);
      }
    }
    canvas._raf = requestAnimationFrame(frame);
    return findings;
  };

  NL.redrawXray = function (canvas, overlay) {
    if (!canvas._off) return;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(canvas._off, 0, 0);
    if (overlay) NL.drawOverlay(ctx, canvas._findings || []);
  };

  NL.overlayOn = function () {
    var t = document.getElementById('overlayToggle');
    return !t || t.checked;
  };
})(window.NL);
