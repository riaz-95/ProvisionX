/* NarcoLens prototype – app shell, Inspection Case state, screens, demo runner. */
(function (NL) {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var SCREENS = {
    dashboard: { title: 'Command Dashboard', sub: 'Network-wide view of every UAE entry point running NarcoLens: what was screened, what the AI flagged, and what officers are inspecting now.' },
    lane: { title: 'Live Lane · M1 X-ray Vision', sub: 'Edge AI reads each scan from the existing X-ray machine in under a second and highlights hidden organic masses for the operator.' },
    'case': { title: 'Inspection Case · M5 Risk Fusion', sub: 'One case per bag tag. Every module adds evidence to it; the fusion engine explains its score and recommends an action. The officer decides.' },
    desk: { title: 'Inspection Desk · M2 Pills, Vials & Labels', sub: 'The officer photographs what is found. AI reads pill imprints, vials and Arabic / English labels, and checks them against the product registry.' },
    hyper: { title: 'Hyperspectral ID · M3 Substance Identification', sub: 'A hyperspectral camera sees chemistry through packaging. AI matches every pixel\'s spectrum to the drug library – without opening the pouch.' },
    predict: { title: 'Novel-Drug Predictor · M4', sub: 'Predicts the spectral fingerprint of new synthetic-drug variants before they are ever seized, and pushes them into the M3 library.' },
    learn: { title: 'Learning Loop · Federated Retraining', sub: 'Every confirmed seizure makes every site smarter. Models train locally; only model updates – never raw images – leave a site.' },
    challenge: { title: 'Challenge · You vs the AI', sub: 'Five random X-ray bags the model has never seen. Click where you think drugs are hidden, then see the live M1 heatmap and the ground truth.' },
    models: { title: 'AI Models · Live Test', sub: 'The trained models behind M1 and M2, their held-out test results, and buttons to test them on brand-new data right now – in this browser.' }
  };
  var BADGES = {
    dashboard: [['sim', 'Simulated network data']],
    lane: [['live', 'M1 trained CNN · running in this browser'], ['algo', 'Fusion · live formula']],
    'case': [['algo', 'M5 fusion · live formula'], ['live', 'Evidence from live M1 / M2 / M3']],
    desk: [['live', 'M2 imprint CNN · live'], ['sim', 'Packaging detection & OCR · simulated']],
    hyper: [['algo', 'Spectral matching + unmixing · live'], ['sim', 'Camera spectra · simulated']],
    predict: [['sim', 'M4 predictions · simulated']],
    learn: [['sim', 'Federated round · illustration']],
    models: [['live', 'Benchmarks run live in this browser']],
    challenge: [['live', 'M1 trained CNN · live'], ['algo', 'Fresh random bags every round']]
  };

  // ---------------- state ----------------
  var S = NL.state = {
    screen: 'dashboard',
    cases: [],
    events: [],
    stats: { screened: 184213, flags: 612, seizures: 97, far: 3.8, idMin: 4 },
    model: { v: [2, 3, 0], recall: 91.2, far: 3.8, library: 412, predicted: 38, early: 5 },
    clock: new Date(2026, 10, 5, 9, 14, 0),
    caseSeq: 24130,
    currentCase: null,
    bagIdx: -1,
    bagStatus: {},
    lastLane: null,
    deskSample: 'protein-tub',
    deskAnalysed: false,
    hyperScene: 'tub',
    demo: null,
    autoBelt: null
  };

  function fmtTime(d) { return d.toTimeString().slice(0, 8); }
  function fmtHM(d) { return d.toTimeString().slice(0, 5); }
  function tick(sec) { S.clock = new Date(S.clock.getTime() + sec * 1000); $('#clock').innerHTML = 'DXB local time <b>' + fmtHM(S.clock) + '</b>'; }
  function lvl(score) { return score >= 60 ? 'high' : score >= 45 ? 'mid' : 'low'; }
  function decisionText(score) {
    return score >= 60 ? 'Open bag · secondary inspection' : score >= 45 ? 'Re-scan at second angle' : 'Clear';
  }

  // Noisy-OR fusion of all evidence attached to a case.
  function fuse(c) {
    var e = c.evidence;
    var parts = [
      { k: 'pre', label: 'Pre-arrival pattern', sub: 'route, booking timing, weight', w: 0.45, v: e.pre ? e.pre.score : null },
      { k: 'm1', label: 'M1 · X-ray anomaly', sub: 'edge vision model', w: 0.9, v: e.m1 ? e.m1.score : null },
      { k: 'm2', label: 'M2 · Package & imprint check', sub: 'officer photo + OCR', w: 0.85, v: e.m2 ? e.m2.score : null },
      { k: 'm3', label: 'M3 · Spectral substance match', sub: 'hyperspectral camera', w: 0.97, v: e.m3 ? e.m3.score : null }
    ];
    var p = 1;
    parts.forEach(function (x) { if (x.v != null) p *= (1 - x.w * x.v / 100); });
    return { score: Math.min(99, Math.round((1 - p) * 100)), parts: parts };
  }

  function log(site, text, level) {
    tick(3 + Math.floor(Math.random() * 6));
    S.events.unshift({ t: fmtTime(S.clock), site: site, text: text, level: level || 'info' });
    if (S.events.length > 40) S.events.pop();
    renderLog();
    pulse(site, level === 'danger' ? 'danger' : 'ok');
  }

  function newCase(o) {
    var c = {
      id: o.id || ('C-' + (++S.caseSeq)),
      tag: o.tag, kind: o.kind || 'Bag', site: o.site, lane: o.lane, route: o.route,
      status: 'Awaiting inspection',
      evidence: { pre: { score: o.preScore, text: o.preText }, m1: { score: o.m1.score, label: o.m1.label, text: o.m1.text } },
      timeline: []
    };
    var t0 = new Date(S.clock.getTime() - 40 * 60000);
    c.timeline.push({ t: fmtHM(t0), mod: 'M5', title: 'Pre-arrival score ' + o.preScore, text: o.preText, cls: o.preScore >= 45 ? 'danger' : '' });
    c.timeline.push({ t: fmtHM(S.clock), mod: 'M1', title: o.m1.label + ' · score ' + o.m1.score, text: o.m1.text, cls: 'danger' });
    c.timeline.push({ t: fmtHM(S.clock), mod: 'M5', title: 'Fused score ' + fuse(c).score + ' → ' + decisionText(fuse(c).score), text: 'Routed to inspection queue. Officer notified on tablet.', cls: '' });
    S.cases.unshift(c);
    return c;
  }
  function caseById(id) { return S.cases.find(function (c) { return c.id === id; }); }
  function caseByTag(tag) { return S.cases.find(function (c) { return c.tag === tag; }); }
  function current() { return caseById(S.currentCase) || S.cases[0]; }
  function addTimeline(c, mod, title, text, cls) {
    tick(20 + Math.floor(Math.random() * 40));
    c.timeline.push({ t: fmtHM(S.clock), mod: mod, title: title, text: text, cls: cls || '', fresh: true });
  }

  // ---------------- navigation ----------------
  function go(screen) {
    if (typeof closeInfo === 'function') closeInfo(false);
    if (!SCREENS[screen]) screen = 'dashboard';
    S.screen = screen;
    $$('.screen').forEach(function (s) { s.hidden = s.id !== 'screen-' + screen; });
    $$('#nav a').forEach(function (a) { a.classList.toggle('active', a.dataset.screen === screen); });
    $('#screenTitle').textContent = SCREENS[screen].title;
    $('#screenSub').textContent = SCREENS[screen].sub;
    $('#badges').innerHTML = (BADGES[screen] || []).map(function (b) { return '<span class="badge ' + b[0] + '">' + esc(b[1]) + '</span>'; }).join('');
    if (location.hash !== '#' + screen) history.replaceState(null, '', '#' + screen);
    var r = RENDER[screen];
    if (r) r();
    var sec = $('#screen-' + screen);
    if (sec) {
      Array.prototype.forEach.call(sec.children, function (ch, i) { ch.style.setProperty('--i', i); });
      sec.classList.remove('enter'); void sec.offsetWidth; sec.classList.add('enter');
    }
    if (screen === 'dashboard') countUpKpis();
    window.scrollTo(0, 0);
  }

  // ---------------- dashboard ----------------
  function renderKpis() {
    var s = S.stats;
    var k = [
      ['Bags & parcels screened today', s.screened.toLocaleString('en-US'), 'across 7 entry points'],
      ['AI flags raised', s.flags.toLocaleString('en-US'), '<b>0.33%</b> of items screened'],
      ['Seizures confirmed (YTD)', s.seizures, 'lab-confirmed'],
      ['Extra false alarms', s.far.toFixed(1) + '%', 'target ≤ 5% per lane'],
      ['Time to identify substance', s.idMin + ' min', 'vs. ~3 days lab turnaround']
    ];
    $('#kpis').innerHTML = k.map(function (x) {
      return '<div class="kpi"><div class="lbl">' + x[0] + '</div><div class="val">' + x[1] + '</div><div class="sub">' + x[2] + '</div></div>';
    }).join('');
  }

  // ---------------- interactive UAE map ----------------
  var FULL = { x: 0, y: 0, w: 600, h: 340 }, VIEW = { x: 0, y: 0, w: 600, h: 340 }, mapSel = null, mapRaf = null;
  var SITE_STATS = { DXB: [61240, 214], SHJ: [18320, 41], POST: [39870, 162], DWC: [14410, 38], JEA: [9120, 57], KZP: [6480, 31], AUH: [34773, 69] };
  var KIND = { airport: 'Airport · passenger & air cargo', port: 'Seaport · container gantry scanners', post: 'Postal & courier · parcel X-ray lines' };
  function projectSites() { NL.sites.forEach(function (s) { var p = NL.MAP.project(s.lon, s.lat); s.x = p[0]; s.y = p[1]; }); }
  function renderMap() {
    var svg = $('#map'), M = NL.MAP, P = M.project;
    var lbl = function (txt, lon, lat, cls, extra) { var q = P(lon, lat); return '<text class="' + cls + '" x="' + q[0].toFixed(1) + '" y="' + q[1].toFixed(1) + '" text-anchor="middle"' + (extra || '') + '>' + txt + '</text>'; };
    var h = '<rect class="sea" x="-600" y="-340" width="1800" height="1020"/>' +
      M.neighbours.map(function (n) { return '<path class="nb" d="' + n.d + '"><title>' + esc(n.name) + '</title></path>'; }).join('') +
      '<path class="land uae" d="' + M.uae + '"><title>United Arab Emirates</title></path>' +
      lbl('Arabian Gulf', 53.0, 25.95, 'sea-lbl') + lbl('Gulf of Oman', 57.15, 24.75, 'sea-lbl') +
      lbl('OMAN', 56.9, 23.1, 'cty-lbl') + lbl('SAUDI ARABIA', 51.6, 22.95, 'cty-lbl') + lbl('UNITED ARAB EMIRATES', 54.1, 23.55, 'cty-lbl uae-lbl');
    NL.sites.forEach(function (s) {
      h += '<g class="site-g" data-site="' + s.id + '" tabindex="0" role="button" aria-label="' + esc(s.name) + '"><title>' + esc(s.name) + ' – click for details</title>' +
        '<circle class="site-hit" cx="' + s.x + '" cy="' + s.y + '" r="12"/><circle class="site-ring" cx="' + s.x + '" cy="' + s.y + '" r="9"/>' +
        '<circle class="site" cx="' + s.x + '" cy="' + s.y + '" r="5"/>' +
        '<text class="site-lbl" x="' + (s.x + s.lx) + '" y="' + (s.y + s.ly) + '" text-anchor="' + s.anchor + '">' + esc(s.name) + '</text></g>';
    });
    svg.innerHTML = h + '<g id="pulses"></g>';
    applyView(VIEW);
  }
  function applyView(v) {
    var svg = $('#map'), k = v.w / FULL.w;
    svg.setAttribute('viewBox', v.x.toFixed(2) + ' ' + v.y.toFixed(2) + ' ' + v.w.toFixed(2) + ' ' + v.h.toFixed(2));
    svg.style.setProperty('--k', k);
    $$('#map .site-g').forEach(function (g) {
      var s = NL.site(g.dataset.site), t = g.querySelector('text');
      t.setAttribute('x', s.x + s.lx * k); t.setAttribute('y', s.y + s.ly * k);
      t.style.fontSize = (11.5 * k).toFixed(2) + 'px';
      t.style.strokeWidth = (3 * k).toFixed(2) + 'px';
      g.querySelector('.site').setAttribute('r', 5 * k); g.querySelector('.site-ring').setAttribute('r', 9 * k); g.querySelector('.site-hit').setAttribute('r', 12 * k);
    });
    $$('#map .sea-lbl, #map .cty-lbl').forEach(function (t) { t.style.fontSize = ((t.classList.contains('cty-lbl') ? 10 : 12) * k).toFixed(2) + 'px'; });
  }
  function animateView(to, ms) {
    if (mapRaf) cancelAnimationFrame(mapRaf);
    var from = { x: VIEW.x, y: VIEW.y, w: VIEW.w, h: VIEW.h }, t0 = performance.now();
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    (function f(now) {
      var p = reduce ? 1 : Math.min(1, (now - t0) / (ms || 650)), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      ['x', 'y', 'w', 'h'].forEach(function (k) { VIEW[k] = from[k] + (to[k] - from[k]) * e; });
      applyView(VIEW);
      if (p < 1) mapRaf = requestAnimationFrame(f);
    })(t0);
  }
  function selectSite(id) {
    var s = NL.site(id);
    if (!s) return;
    mapSel = id;
    $$('#map .site-g').forEach(function (g) { g.classList.toggle('sel', g.dataset.site === id); });
    var w = 190, hgt = w * FULL.h / FULL.w;
    animateView({ x: Math.max(-40, Math.min(FULL.w - w + 40, s.x - w * 0.28)), y: Math.max(-20, Math.min(FULL.h - hgt + 20, s.y - hgt / 2)), w: w, h: hgt });
    renderSiteCard();
  }
  function renderSiteCard() {
    var el = $('#siteCard'), s = NL.site(mapSel);
    if (!s) { el.hidden = true; return; }
    var st = SITE_STATS[s.id] || [0, 0];
    var open = S.cases.filter(function (c) { return c.site === s.id && !/Cleared|confirmed/.test(c.status); });
    var ev = S.events.find(function (e) { return e.site === s.id; });
    el.innerHTML = '<div class="sc-h"><b>' + esc(s.name) + '</b><button class="sc-x" id="scClose" type="button" aria-label="Zoom out">&times;</button></div>' +
      '<small>' + KIND[s.kind] + ' · ' + s.lat.toFixed(3) + '°N ' + s.lon.toFixed(3) + '°E</small>' +
      '<div class="sc-stats"><div><small>Screened today</small><b>' + st[0].toLocaleString('en-US') + '</b></div><div><small>AI flags</small><b>' + st[1] + '</b></div><div><small>Open cases</small><b>' + open.length + '</b></div></div>' +
      '<p class="sc-ev">' + (ev ? '<time>' + ev.t.slice(0, 5) + '</time> ' + esc(ev.text) : 'No events yet today.') + '</p>' +
      (open.length ? '<div class="sc-open">' + open.slice(0, 3).map(function (c) { return '<button type="button" data-case="' + c.id + '">' + c.id + ' · ' + esc(c.tag) + ' <span class="pill ' + lvl(fuse(c).score) + '">' + fuse(c).score + '</span></button>'; }).join('') + '</div>' : '') +
      '<div class="row"><button class="btn primary" id="scNew" type="button">Open new case here</button><button class="btn" id="scOut" type="button">Zoom out</button></div>';
    el.hidden = false;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  }
  function zoomOut() { mapSel = null; $$('#map .site-g').forEach(function (g) { g.classList.remove('sel'); }); $('#siteCard').hidden = true; animateView(FULL); }
  function openCaseAtSite(id) {
    var s = NL.site(id), r = Math.floor(Math.random() * 1e9), c;
    if (s.kind === 'port') {
      var routes = ['Furniture consignment · 40 ft', 'Auto parts · 20 ft', 'Foodstuffs · reefer 40 ft', 'Building materials · 40 ft'];
      c = newCase({ tag: 'CGO-' + id + '-' + (10000 + r % 89999), kind: 'Container', site: id, lane: 'Gantry scanner ' + (1 + r % 3), route: routes[r % routes.length],
        preScore: 30 + r % 25, preText: 'New consignee; routing via two transhipment ports (simulated indicators).',
        m1: { score: 70 + r % 22, label: 'Organic fill in normally hollow cargo', text: 'Container scan shows uniform organic density inside panels / pallets that should be hollow (container model simulated).' } });
    } else {
      var sc = NL.randomScene(r, { positives: 1 }), off = document.createElement('canvas');
      off.width = NL.XRAY.W; off.height = NL.XRAY.H; NL.renderScene(sc, off.getContext('2d'), null);
      var res = NL.m1.run(off), parcel = s.kind === 'post';
      c = newCase({ tag: (parcel ? 'PCL-' : 'BAG-') + id + '-' + (100000 + r % 899999), kind: parcel ? 'Parcel' : 'Bag', site: id,
        lane: parcel ? 'Courier line ' + (1 + r % 4) : 'Lane ' + (1 + r % 8), route: parcel ? 'E-commerce parcel · declared "household goods"' : 'Arrival · generated live scan',
        preScore: 20 + r % 35, preText: 'Route and booking indicators (simulated).',
        m1: { score: res.score, label: m1Label(res), text: m1Text(res) + ' (live M1 model on a freshly generated scan)' } });
      c.scene = sc;
    }
    S.stats.flags += 1;
    log(id, 'AI flag · ' + c.tag + ' → case ' + c.id + ' (opened from map)', 'danger');
    S.currentCase = c.id;
    go('case');
  }
  function initMap() {
    projectSites();
    var svg = $('#map');
    svg.addEventListener('click', function (e) { var g = e.target.closest('.site-g'); if (g) selectSite(g.dataset.site); });
    svg.addEventListener('keydown', function (e) { var g = e.target.closest('.site-g'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selectSite(g.dataset.site); } });
    $('#siteCard').addEventListener('click', function (e) {
      if (e.target.closest('#scClose') || e.target.closest('#scOut')) zoomOut();
      else if (e.target.closest('#scNew')) openCaseAtSite(mapSel);
      else { var b = e.target.closest('[data-case]'); if (b) { S.currentCase = b.dataset.case; go('case'); } }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mapSel && S.screen === 'dashboard') zoomOut(); });
  }
  function pulse(siteId, kind) {
    var s = NL.site(siteId), g = $('#pulses');
    if (!s || !g) return;
    var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', s.x); c.setAttribute('cy', s.y); c.setAttribute('r', 6 * VIEW.w / FULL.w);
    c.setAttribute('class', 'pulse ' + kind);
    g.appendChild(c);
    setTimeout(function () { c.remove(); }, 1900);
    if (mapSel === siteId && S.screen === 'dashboard') renderSiteCard();
  }

  function renderQueue() {
    var open = S.cases.filter(function (c) { return !/Cleared|confirmed/.test(c.status); });
    $('#queueCount').textContent = open.length + ' open';
    $('#queue').innerHTML = open.length ? open.map(function (c) {
      var f = fuse(c).score;
      return '<li data-case="' + c.id + '"><div class="q-main"><b>' + c.id + ' · ' + esc(c.tag) + '</b><span>' + esc(NL.site(c.site).name) + ' · ' + esc(c.status) + '</span></div>' +
        '<span class="pill ' + lvl(f) + '">' + f + '</span></li>';
    }).join('') : '<li class="empty">No open cases</li>';
  }
  function renderLog() {
    var el = $('#log');
    if (!el) return;
    el.innerHTML = S.events.slice(0, 18).map(function (e) {
      return '<li><time>' + e.t + '</time><span class="site-tag">' + e.site + '</span><span class="lvl-' + e.level + '">' + esc(e.text) + '</span></li>';
    }).join('');
  }
  function renderDashboard() { renderKpis(); renderQueue(); renderLog(); }

  // ---------------- M1 lane ----------------
  S.laneMode = 'belt';
  S.build = null;
  S.buildRes = null;
  NL.bags.forEach(function (b) { b.scene = NL.demoScene(b.concealment, b.seed); });
  function m1Params() { var m = NL.MODEL_METRICS && NL.MODEL_METRICS.m1; return m ? m.params.toLocaleString('en-US') : '–'; }

  function renderBagStrip() {
    $('#bagStrip').innerHTML = NL.bags.map(function (b, i) {
      var st = S.bagStatus[b.tag] || '';
      return '<button class="bag-chip ' + st + (i === S.bagIdx ? ' active' : '') + '" data-bag="' + i + '"><b>' + b.tag + '</b><span>' + esc(b.route) + '</span></button>';
    }).join('');
  }

  function m1Text(res) {
    if (!res) return 'Model not loaded.';
    if (!res.boxes.length) return 'No region above 50% concealment probability. Densities look consistent with normal packing.';
    var b = res.boxes[0];
    return res.boxes.length + ' region' + (res.boxes.length > 1 ? 's' : '') + ' with concealment-like density; strongest ' + b.score + '/100, covering ' + (b.px / (112 * 64) * 100).toFixed(1) + '% of the scan.';
  }
  function m1Label(res) { return res && res.boxes.length ? 'Concealment-like density (' + res.boxes.length + ' region' + (res.boxes.length > 1 ? 's' : '') + ')' : 'No anomaly'; }
  function truthLabels(scene) {
    return scene.items.filter(function (it) { return NL.xrayItems[it.type].positive; }).map(function (it) { return NL.xrayItems[it.type].label.toLowerCase(); }).join(', ');
  }
  function truthHtml(L) {
    if (L.truth == null) return '<div class="truth">No ground truth for uploaded images &ndash; judge the heatmap yourself.</div>';
    var flagged = L.m1 >= 50, ok = flagged === L.truth;
    return '<div class="truth">Ground truth (hidden from the AI): <b>' + (L.truth ? 'drugs hidden &ndash; ' + esc(L.truthLabel) : 'clean bag') + '</b><br>AI ' + (flagged ? 'flagged it' : 'did not flag it') + ' &rarr; <b class="' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓ correct' : '✗ wrong') + '</b></div>';
  }

  function renderLaneResult() {
    var el = $('#laneResult'), L = S.lastLane;
    if (!L) {
      el.innerHTML = '<div class="placeholder">' + ({
        belt: 'Pick a bag on the belt or press <b>Scan next bag</b>.<br><br>M1 is a trained neural network (' + m1Params() + ' parameters) running right here in your browser.',
        build: 'Add items, hide drugs anywhere, drag things around &ndash; then press <b>Scan with AI</b>.<br><br>The model has never seen your bag.',
        upload: 'Upload any image. M1 will produce a concealment heatmap for it.'
      })[S.laneMode] + '</div>';
      return;
    }
    if (L.scanning) { el.innerHTML = '<div class="placeholder"><span class="spinner"></span>Scanning&hellip;</div>'; return; }
    var sc = L.fused, l = lvl(sc), b = L.bag;
    if (L.ood) {
      el.innerHTML = '<div class="result-h"><h3>AI result · uploaded image</h3><span class="pill mid">NOT AN X-RAY</span></div>' +
        '<div class="finding low"><b>Out of distribution &ndash; result not reliable.</b><br>This image does not look like a dual-energy bag scan (' + Math.round(L.xl.light * 100) + '% bright background, ' + Math.round(L.xl.warm * 100) + '% organic/mixed colour). M1 was trained only on X-ray scans, so its heatmap (raw score ' + L.m1 + ') is shown for transparency but no decision is made.</div>' +
        '<p class="muted small">A production system would refuse non-scanner input in the same way: an out-of-distribution check runs before any risk score is used.</p>';
      return;
    }
    var findings = L.res && L.res.boxes.length ? L.res.boxes.slice(0, 3).map(function (f, i) {
      return '<div class="finding ' + (f.score < 60 ? 'low' : '') + '"><b>Region ' + (i + 1) + '</b> · concealment probability ' + f.score + '/100 · ' + (f.px / (112 * 64) * 100).toFixed(1) + '% of scan area</div>';
    }).join('') : '<div class="finding none"><b>No anomaly</b><br>' + esc(m1Text(L.res)) + '</div>';
    el.innerHTML =
      '<div class="result-h"><h3>' + (b ? 'Lane decision' : L.kind === 'build' ? 'AI result · your bag' : 'AI result · uploaded image') + '</h3><span class="pill ' + l + '">' + (l === 'high' ? 'FLAGGED' : l === 'mid' ? 'RE-SCAN' : 'CLEAR') + '</span></div>' +
      '<div class="score-big"><span class="n lvl-' + l + '">' + sc + '</span><span class="of">/ 100 ' + (b ? 'fused risk' : 'M1 score') + '</span></div>' +
      '<div class="meter"><i class="bg-' + l + '" style="width:' + sc + '%"></i></div>' +
      (b ? '<dl class="kv"><dt>Bag tag</dt><dd><b>' + b.tag + '</b></dd><dt>Route</dt><dd>' + esc(b.route) + '</dd>' +
        '<dt>Pre-arrival</dt><dd>' + b.preScore + ' · ' + esc(b.preText) + '</dd><dt>M1 model</dt><dd><b>' + L.m1 + '</b> / 100</dd></dl>' : '') +
      findings + truthHtml(L) +
      (b ? '<div class="decision ' + l + '"><span>' + decisionText(sc) + '</span>' + (L.caseId ? '<button class="btn primary" data-open-case="' + L.caseId + '">Open case ' + L.caseId + ' &rarr;</button>' : '') + '</div>' : '') +
      '<p class="muted small">M1 · trained CNN, ' + m1Params() + ' parameters · ' + (L.res ? L.res.ms.toFixed(0) : '–') + ' ms in this browser · no server, no internet</p>';
  }

  function selectBag(i, done) {
    var b = NL.bags[i];
    S.bagIdx = i;
    S.lastLane = { bag: b, scanning: true };
    $('#laneTag').textContent = b.tag;
    renderBagStrip(); renderLaneResult();
    $('#latency').textContent = '…';
    NL.scanScene($('#xray'), b.scene, {
      onDone: function (res) {
        var m1s = res ? res.score : 0;
        var tmp = { evidence: { pre: { score: b.preScore }, m1: { score: m1s } } };
        var fused = fuse(tmp).score, caseId = null;
        S.stats.screened += 1;
        if (fused >= 60) {
          var c = caseByTag(b.tag);
          if (!c) {
            c = newCase({ tag: b.tag, site: b.site, lane: 'DXB ' + b.lane, route: b.route, preScore: b.preScore, preText: b.preText, m1: { score: m1s, label: m1Label(res), text: m1Text(res) } });
            S.stats.flags += 1;
            log('DXB', 'AI flag · ' + b.tag + ' · M1 model ' + m1s + ' → fused ' + fused + ' → case ' + c.id, 'danger');
          }
          caseId = c.id; S.currentCase = c.id; S.bagStatus[b.tag] = 'flagged';
        } else {
          S.bagStatus[b.tag] = 'cleared';
          log('DXB', b.tag + ' cleared (M1 ' + m1s + ', fused ' + fused + ')', 'ok');
        }
        $('#latency').textContent = res ? res.ms.toFixed(0) + ' ms' : 'n/a';
        S.lastLane = { bag: b, res: res, m1: m1s, fused: fused, caseId: caseId, truth: NL.sceneHasConcealment(b.scene), truthLabel: truthLabels(b.scene) };
        renderBagStrip(); renderLaneResult();
        if (done) done();
      }
    });
  }
  function scanNext() { selectBag((S.bagIdx + 1) % NL.bags.length); }
  function toggleAuto() {
    if (S.autoBelt) { clearInterval(S.autoBelt); S.autoBelt = null; }
    else { scanNext(); S.autoBelt = setInterval(scanNext, 3600); }
    $('#laneAuto').textContent = 'Auto belt: ' + (S.autoBelt ? 'on' : 'off');
  }

  // ----- Bag Builder -----
  function emptyScene() { return { seed: Math.floor(Math.random() * 1e9), bg: 246, noise: 6, handle: 'left', items: [] }; }
  function drawBuild() {
    var cv = $('#xray');
    cv.width = NL.XRAY.W; cv.height = NL.XRAY.H;
    var off = document.createElement('canvas'); off.width = NL.XRAY.W; off.height = NL.XRAY.H;
    var mask = document.createElement('canvas'); mask.width = NL.XRAY.W; mask.height = NL.XRAY.H;
    NL.renderScene(S.build, off.getContext('2d'), mask.getContext('2d'));
    cv._off = off; cv._mask = mask; cv._res = S.buildRes;
    NL.redrawXray(cv);
    if (S.dragIdx != null) {
      var it = S.build.items[S.dragIdx], ctx = cv.getContext('2d');
      ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot || 0);
      ctx.setLineDash([5, 4]); ctx.strokeStyle = '#2dd4bf'; ctx.lineWidth = 2; ctx.strokeRect(-it.w / 2 - 4, -it.h / 2 - 4, it.w + 8, it.h + 8);
      ctx.restore();
    }
  }
  function buildEdited() { S.buildRes = null; S.lastLane = null; $('#laneTag').textContent = 'your bag (not scanned yet)'; renderLaneResult(); drawBuild(); }
  function canvasPt(ev) {
    var cv = $('#xray'), r = cv.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / r.width * NL.XRAY.W, y: (ev.clientY - r.top) / r.height * NL.XRAY.H };
  }
  function hitItem(p) {
    for (var i = S.build.items.length - 1; i >= 0; i--) {
      var it = S.build.items[i], dx = p.x - it.x, dy = p.y - it.y, a = -(it.rot || 0);
      var lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
      if (Math.abs(lx) <= it.w / 2 + 4 && Math.abs(ly) <= it.h / 2 + 4) return i;
    }
    return null;
  }
  function initBuilder() {
    $('#palClutter').insertAdjacentHTML('beforeend', NL.CLUTTER.map(function (t) { return '<button type="button" data-add="' + t + '">+ ' + NL.xrayItems[t].label + '</button>'; }).join(''));
    $('#palHide').insertAdjacentHTML('beforeend', NL.CONCEALMENTS.map(function (t) { return '<button type="button" class="hide" data-add="' + t + '">+ ' + NL.xrayItems[t].label + '</button>'; }).join(''));
    $('#builder').addEventListener('click', function (e) {
      var b = e.target.closest('[data-add]');
      if (!b) return;
      S.build.items.push(NL.placeItem(b.dataset.add, Math.random));
      buildEdited();
    });
    $('#bRandom').addEventListener('click', function () { S.build = NL.randomScene(Math.floor(Math.random() * 1e9)); buildEdited(); });
    $('#bClear').addEventListener('click', function () { S.build = emptyScene(); buildEdited(); });
    $('#bScan').addEventListener('click', scanBuild);
    var cv = $('#xray');
    cv.addEventListener('pointerdown', function (e) {
      if (S.laneMode !== 'build') return;
      var p = canvasPt(e), i = hitItem(p);
      if (i == null) return;
      var it = S.build.items.splice(i, 1)[0]; S.build.items.push(it); // bring to front
      S.dragIdx = S.build.items.length - 1; S.dragOff = { x: p.x - it.x, y: p.y - it.y };
      cv.setPointerCapture(e.pointerId); e.preventDefault();
      buildEdited();
    });
    cv.addEventListener('pointermove', function (e) {
      if (S.laneMode !== 'build' || S.dragIdx == null) return;
      var p = canvasPt(e), it = S.build.items[S.dragIdx];
      it.x = Math.max(40, Math.min(NL.XRAY.W - 40, p.x - S.dragOff.x)); it.y = Math.max(30, Math.min(NL.XRAY.H - 30, p.y - S.dragOff.y));
      drawBuild();
    });
    var end = function () { if (S.dragIdx != null) { S.dragIdx = null; drawBuild(); } };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    $('#uploadInput').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var img = new Image();
      img.onload = function () { scanUpload(img); };
      img.src = URL.createObjectURL(f);
      this.value = '';
    });
  }
  function scanBuild() {
    return new Promise(function (resolve) {
      S.lastLane = { scanning: true, kind: 'build' }; renderLaneResult();
      $('#laneTag').textContent = 'your bag';
      NL.scanScene($('#xray'), S.build, {
        onDone: function (res) {
          S.buildRes = res;
          S.lastLane = { kind: 'build', res: res, m1: res ? res.score : 0, fused: res ? res.score : 0, truth: NL.sceneHasConcealment(S.build), truthLabel: truthLabels(S.build) };
          $('#latency').textContent = res ? res.ms.toFixed(0) + ' ms' : 'n/a';
          renderLaneResult(); resolve(res);
        }
      });
    });
  }
  // Out-of-distribution guard: M1 was trained on dual-energy scans with a bright background.
  function xrayLikeness(cv) {
    var d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, n = 0, light = 0, warm = 0;
    for (var i = 0; i < d.length; i += 16) {
      var r = d[i], g = d[i + 1], b = d[i + 2], y = 0.299 * r + 0.587 * g + 0.114 * b;
      n++; if (y > 200) light++;
      if (r > b + 20 || g > b + 10) warm++;
    }
    return { light: light / n, warm: warm / n };
  }
  function scanUpload(img) {
    S.lastLane = { scanning: true, kind: 'upload' }; renderLaneResult();
    $('#laneTag').textContent = 'uploaded image';
    NL.scanScene($('#xray'), { image: img }, {
      onDone: function (res) {
        var xl = xrayLikeness($('#xray')._off), ood = xl.light < 0.45 || xl.warm < 0.15;
        S.lastLane = { kind: 'upload', res: res, m1: res ? res.score : 0, fused: res ? res.score : 0, truth: null, ood: ood, xl: xl };
        $('#latency').textContent = res ? res.ms.toFixed(0) + ' ms' : 'n/a';
        renderLaneResult();
      }
    });
  }
  function setLaneMode(m) {
    S.laneMode = m;
    $$('#laneModes button').forEach(function (b) { b.classList.toggle('active', b.dataset.mode === m); });
    $('#bagStrip').hidden = m !== 'belt'; $('#builder').hidden = m !== 'build'; $('#uploadBox').hidden = m !== 'upload';
    $('#scanNext').hidden = $('#laneAuto').hidden = m !== 'belt'; $('#bScan').hidden = m !== 'build';
    $('#truthWrap').hidden = m === 'upload';
    $('#xray').classList.toggle('building', m === 'build');
    if (m !== 'belt' && S.autoBelt) toggleAuto();
    S.lastLane = null;
    if (m === 'build') { if (!S.build) S.build = NL.randomScene(424242, { positives: 1 }); S.buildRes = null; $('#laneTag').textContent = 'your bag (not scanned yet)'; drawBuild(); }
    else if (m === 'upload') { $('#laneTag').textContent = 'upload'; drawIdleXray('Choose an image to scan'); }
    else if (S.bagIdx >= 0) selectBag(S.bagIdx);
    else { $('#laneTag').textContent = 'select a bag'; drawIdleXray(); }
    renderLaneResult();
  }

  function renderLane() {
    renderBagStrip();
    renderLaneResult();
    if (S.laneMode === 'build') { drawBuild(); return; }
    if (S.laneMode === 'belt' && S.bagIdx >= 0 && !$('#xray')._off) NL.scanScene($('#xray'), NL.bags[S.bagIdx].scene, { fast: true });
    if (S.laneMode === 'belt' && S.bagIdx < 0) drawIdleXray();
  }
  function drawIdleXray(msg) {
    var cv = $('#xray'), ctx = cv.getContext('2d');
    cv._off = null; cv._res = null;
    ctx.fillStyle = '#1b1f24'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = '#8fa1b6'; ctx.font = '600 18px "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(msg || 'Waiting for next bag on the belt…', cv.width / 2, cv.height / 2);
    ctx.textAlign = 'start';
  }

  // ---------------- M5 case ----------------
  function renderCase() {
    var c = current();
    if (!c) return;
    S.currentCase = c.id;
    var f = fuse(c), l = lvl(f.score);
    var opts = S.cases.map(function (x) { return '<option value="' + x.id + '"' + (x.id === c.id ? ' selected' : '') + '>' + x.id + ' · ' + esc(x.tag) + '</option>'; }).join('');
    $('#caseHead').innerHTML =
      '<div class="ids"><div><small>Case</small><b>' + c.id + '</b></div><div><small>' + c.kind + ' tag</small><b>' + esc(c.tag) + '</b></div>' +
      '<div><small>Site</small><b>' + esc(NL.site(c.site).name) + '</b></div><div><small>Lane</small><b>' + esc(c.lane) + '</b></div>' +
      '<div><small>Status</small><b>' + esc(c.status) + '</b></div></div>' +
      '<label class="muted small case-switch">Switch case <span class="select-glass"><select id="caseSelect">' + opts + '</select></span></label>';

    var pend = [];
    if (!c.evidence.m2) pend.push('<li class="pending"><div class="t-top"><span class="t-mod">M2</span><span class="t-title">Package &amp; imprint check</span></div><p>Pending – officer photographs contents at the inspection desk</p></li>');
    if (!c.evidence.m3) pend.push('<li class="pending"><div class="t-top"><span class="t-mod">M3</span><span class="t-title">Hyperspectral substance ID</span></div><p>Pending – scan sealed contents</p></li>');
    $('#timeline').innerHTML = c.timeline.map(function (t) {
      var cls = t.cls + (t.fresh ? ' new' : '');
      t.fresh = false;
      return '<li class="' + cls + '"><div class="t-top"><span class="t-mod">' + t.mod + '</span><time>' + t.t + '</time></div><div class="t-title">' + esc(t.title) + '</div><p>' + esc(t.text) + '</p></li>';
    }).join('') + pend.join('');

    $('#fusion').innerHTML =
      '<div class="score-big"><span class="n lvl-' + l + '">' + f.score + '</span><span class="of">/ 100</span><span class="pill ' + l + '">' + (c.evidence.m3 && c.evidence.m3.illicit ? 'Seizure recommended' : decisionText(f.score)) + '</span></div>' +
      '<div class="meter"><i class="bg-' + l + '" style="width:' + f.score + '%"></i></div>' +
      '<div class="bars">' + f.parts.map(function (p) {
        return '<div class="bar-row' + (p.v == null ? ' pending' : '') + '"><div class="bar-lbl"><span>' + p.label + ' <small>· ' + p.sub + '</small></span><b>' + (p.v == null ? 'pending' : p.v) + '</b></div>' +
          '<div class="track"><i style="width:' + (p.v || 0) + '%"></i></div></div>';
      }).join('') + '</div>' +
      whatIfHtml(f) +
      '<p class="muted small">Score = noisy-OR of independent evidence, each weighted by the module\'s validated precision. Threshold: ≥60 open, 45–59 re-scan, &lt;45 clear.</p>';

    var a = [];
    var closed = /Cleared|confirmed|Seized/.test(c.status);
    if (!closed) {
      a.push(/Opened/.test(c.status) ? '<button class="btn" data-act="open">Back to inspection desk</button>' : '<button class="btn primary" data-act="open">Open bag &rarr; inspection desk</button>');
      a.push('<button class="btn" data-act="rescan">Re-scan</button>');
      a.push('<button class="btn" data-act="clear">Clear</button>');
      if (c.evidence.m3 && c.evidence.m3.illicit) a.push('<button class="btn danger" data-act="seize">Seize · send sample to lab</button>');
    } else if (/Seized/.test(c.status)) {
      a.push('<button class="btn primary" data-act="tolearn">Go to learning loop &rarr;</button>');
    }
    $('#caseActions').innerHTML = a.join('');
  }

  // ----- what-if fusion explorer -----
  function whatIfHtml(f) {
    return '<details class="whatif" id="whatIf"' + (S.whatIfOpen ? ' open' : '') + '><summary>What-if: adjust the evidence and watch the decision change</summary>' +
      f.parts.map(function (p) { return '<label class="wi-row"><span>' + p.label + '</span><input type="range" min="0" max="100" step="1" data-k="' + p.k + '" value="' + (p.v || 0) + '"><b data-out="' + p.k + '">' + (p.v || 0) + '</b></label>'; }).join('') +
      '<div class="wi-result" id="wiResult"></div><button class="btn" type="button" id="wiReset">Reset to case</button></details>';
  }
  function updateWhatIf() {
    var ev = {};
    $$('#whatIf input[type=range]').forEach(function (r) { var v = +r.value; $('#whatIf [data-out="' + r.dataset.k + '"]').textContent = v; if (v > 0) ev[r.dataset.k] = { score: v }; });
    var sc = fuse({ evidence: ev }).score, l = lvl(sc);
    $('#wiResult').innerHTML = 'What-if fused score <b class="lvl-' + l + '">' + sc + '</b> <span class="pill ' + l + '">' + decisionText(sc) + '</span>';
  }
  function initWhatIf() {
    var host = $('#fusion');
    host.addEventListener('input', function (e) { if (e.target.matches('#whatIf input[type=range]')) updateWhatIf(); });
    host.addEventListener('toggle', function (e) { if (e.target.id === 'whatIf') { S.whatIfOpen = e.target.open; if (e.target.open) updateWhatIf(); } }, true);
    host.addEventListener('click', function (e) { if (e.target.id === 'wiReset') { renderCase(); var w = $('#whatIf'); if (w) { w.open = true; updateWhatIf(); } } });
  }

  function caseAction(act) {
    var c = current();
    if (!c) return;
    if (act === 'open') {
      if (!/Opened/.test(c.status)) {
        c.status = 'Opened · at inspection desk';
        addTimeline(c, 'OFFICER', 'Bag opened by ' + (NL.officer ? NL.officer.short : 'Officer') + ' · desk 2', 'Officer accepted the recommendation. Contents photographed with desk tablet.', '');
        log(c.site, c.id + ' opened at inspection desk', 'info');
      }
      go('desk');
    } else if (act === 'rescan') {
      addTimeline(c, 'OFFICER', 'Re-scan requested by ' + (NL.officer ? NL.officer.short : 'Officer'), 'Bag sent through second-angle scan.', '');
      renderCase();
    } else if (act === 'clear') {
      c.status = 'Cleared by officer';
      addTimeline(c, 'OFFICER', 'Cleared by ' + (NL.officer ? NL.officer.short : 'Officer'), 'Officer override recorded – used as feedback for model calibration.', 'ok');
      log(c.site, c.id + ' cleared by officer', 'ok');
      renderCase();
    } else if (act === 'seize') {
      c.status = 'Seized · lab confirmation pending';
      addTimeline(c, 'OFFICER', 'Seizure by ' + (NL.officer ? NL.officer.short : 'Officer') + ' · sample sent to forensic lab', 'Chain of custody started. AI evidence pack (images, spectra, scores) attached.', 'danger');
      log(c.site, c.id + ' seized – sample to forensic lab', 'danger');
      renderCase();
    } else if (act === 'tolearn') {
      go('learn');
    }
  }

  // ---------------- M2 desk ----------------
  var LABEL_SCORE = { 'protein-tub': 60, 'pill-strip': 0, 'peptide-vial': 74 };
  S.crops = null;
  function imprintSummary() {
    var cr = S.crops || [];
    if (!cr.length) return null;
    var hits = cr.filter(function (c) { return c.res.top === 0; });
    var avg = hits.length ? hits.reduce(function (a, c) { return a + c.res.probs[0]; }, 0) / hits.length : 0;
    return { n: cr.length, hits: hits.length, avg: avg, score: hits.length ? Math.round(avg * (hits.length / cr.length >= 0.5 ? 95 : 85)) : 0 };
  }
  function deskScore() {
    var im = imprintSummary();
    return Math.max(LABEL_SCORE[S.deskSample] || 0, im ? im.score : 0);
  }
  function deskSummary() {
    var s = NL.deskSamples[S.deskSample], im = imprintSummary(), parts = [];
    if (im) parts.push(im.hits + '/' + im.n + ' tablets classified Captagon-style (avg ' + Math.round(im.avg * 100) + '%)' + (S.profile ? ', ' + S.profile.dMean.toFixed(1) + ' mm' : ''));
    if (!s.registry.ok && S.deskSample !== 'mixed-tray') parts.push({ 'peptide-vial': 'unregistered injectable peptide', 'protein-tub': 'label not in registry', 'pill-strip': 'no registered medicine matches' }[S.deskSample]);
    return parts.join(' + ');
  }
  function renderDesk() {
    $('#samplePick').innerHTML = Object.keys(NL.deskSamples).map(function (k) {
      return '<button data-sample="' + k + '" class="' + (k === S.deskSample ? 'active' : '') + '">' + NL.deskSamples[k].name + '</button>';
    }).join('');
    var s = NL.deskSamples[S.deskSample];
    var ph = $('#deskPhoto');
    ph.innerHTML = s.svg();
    ph.classList.toggle('analysed', S.deskAnalysed);
    var c = current();
    var attachBtn = $('#deskAttach');
    attachBtn.disabled = !S.deskAnalysed || !c;
    attachBtn.textContent = c ? 'Attach to case ' + c.id : 'Attach to case';
    renderCrops();
    var el = $('#deskResult');
    if (!S.deskAnalysed) {
      el.innerHTML = '<div class="placeholder">Press <b>Analyse photo</b>. The live M2 model classifies every tablet imprint; packaging detection and Arabic / English OCR are simulated in this prototype.</div>';
      return;
    }
    var im = imprintSummary(), sc = deskScore();
    el.innerHTML =
      '<div class="result-h"><h3>M2 result</h3><span class="pill ' + lvl(sc) + '">Evidence score ' + sc + '</span></div>' +
      '<p><b>' + esc(deskSummary()) + '</b></p>' +
      (im ? '<div class="finding ' + (im.hits ? '' : 'none') + '"><span class="badge live">Live model</span> <b>Imprints:</b> ' + im.hits + ' of ' + im.n + ' tablets → twin-crescent (Captagon-style logo family), mean confidence ' + Math.round(im.avg * 100) + '%</div>' : '<div class="finding none"><span class="badge live">Live model</span> No tablets in this photo, so the imprint model is not used.</div>') +
      '<div class="ocr"><div class="muted small"><span class="badge sim">Simulated</span> Packaging detection &amp; OCR</div>' + s.ocr.map(function (o) {
        return '<div><span class="lang">' + o.lang + '</span><span' + (o.rtl ? ' dir="rtl" lang="ar"' : '') + '>' + esc(o.text) + '</span></div>';
      }).join('') + '</div>' +
      '<div class="registry ' + (s.registry.ok ? 'pass' : 'fail') + '">' + esc(s.registry.text) + '</div>' + profileHtml();
  }
  function renderCrops() {
    var el = $('#crops');
    if (!S.deskAnalysed || !S.crops) { el.innerHTML = '<p class="muted small">Press <b>Analyse photo</b> to classify every tablet crop with the live model.</p>'; return; }
    if (!S.crops.length) { el.innerHTML = '<p class="muted small">No tablets in this photo.</p>'; return; }
    el.innerHTML = '';
    S.crops.forEach(function (c) {
      var d = document.createElement('div'), cls = NL.IMPRINT_CLASSES[c.res.top];
      d.className = 'crop' + (cls.risk ? ' risk' : '');
      var cv = document.createElement('canvas'); cv.width = 48; cv.height = 48;
      cv.getContext('2d').drawImage(c.canvas, 0, 0);
      d.appendChild(cv);
      d.insertAdjacentHTML('beforeend', '<b>' + (cls.risk ? 'Twin-crescent' : cls.id === 'plain' ? 'Plain' : cls.id === 'scored' ? 'Score line' : 'Letter stamp') + '</b>' + Math.round(c.res.probs[c.res.top] * 100) + '%');
      el.appendChild(d);
    });
  }
  // ----- forensic physical profile: ruler-calibrated tablet measurements -----
  function lumAt(d, W, x, y) { var i = (Math.round(y) * W + Math.round(x)) * 4; return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; }
  function measureProfile(photo, s) {
    if (!s.ruler || !s.tablets.length) return null;
    var W = photo.width, d = photo.getContext('2d').getImageData(0, 0, W, photo.height).data, R = s.ruler;
    // 1. calibrate from the scale bar: centres of dark tick marks along one row
    var runs = [], inRun = false, st = 0, lo = 255, hi = 0;
    for (var x0 = R.x0; x0 <= R.x1; x0++) { var lv = lumAt(d, W, x0, R.y); if (lv < lo) lo = lv; if (lv > hi) hi = lv; }
    var thr = (lo + hi) / 2;
    for (var x = R.x0; x <= R.x1; x++) {
      var dark = lumAt(d, W, x, R.y) < thr;
      if (dark && !inRun) { inRun = true; st = x; }
      if (!dark && inRun) { inRun = false; runs.push((st + x - 1) / 2); }
    }
    var diffs = []; for (var i = 1; i < runs.length; i++) diffs.push(runs[i] - runs[i - 1]);
    diffs.sort(function (a, b) { return a - b; });
    var pxPerMm = diffs.length ? diffs[Math.floor(diffs.length / 2)] / R.mmPerTick : null;
    if (!pxPerMm) return null;
    // 2. each tablet: radial scan for the rim (darkest ring between 0.8r and 1.25r)
    var dia = [], circ = [], cols = [];
    s.tablets.forEach(function (t) {
      var radii = [];
      for (var k = 0; k < 24; k++) {
        // half-maximum edge: where brightness falls halfway from the tablet face to the darkest point outside it
        var ang = k / 24 * 2 * Math.PI, ca = Math.cos(ang), sa = Math.sin(ang), prof = [], lo2 = 1e9, br = t[2];
        var face = lumAt(d, W, t[0] + ca * t[2] * 0.6, t[1] + sa * t[2] * 0.6);
        for (var q = t[2] * 0.8; q <= t[2] * 1.25; q += 0.25) { var L = lumAt(d, W, t[0] + ca * q, t[1] + sa * q); prof.push([q, L]); if (L < lo2) lo2 = L; }
        var half = (face + lo2) / 2;
        for (var pi = 0; pi < prof.length; pi++) if (prof[pi][1] < half) { br = pi ? prof[pi - 1][0] + (prof[pi - 1][1] - half) / Math.max(1e-6, prof[pi - 1][1] - prof[pi][1]) * 0.25 : prof[pi][0]; break; }
        radii.push(br);
      }
      var m = radii.reduce(function (a, b) { return a + b; }, 0) / radii.length;
      var sd = Math.sqrt(radii.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / radii.length);
      dia.push(2 * m / pxPerMm); circ.push(1 - sd / m);
      var rgb = [0, 0, 0];
      [[0, -0.7], [0, 0.7]].forEach(function (o) { var j = (Math.round(t[1] + o[1] * t[2]) * W + Math.round(t[0] + o[0] * t[2])) * 4; rgb[0] += d[j] / 2; rgb[1] += d[j + 1] / 2; rgb[2] += d[j + 2] / 2; });
      cols.push(rgb);
    });
    var mean = function (a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; };
    var dm = mean(dia), dsd = Math.sqrt(mean(dia.map(function (v) { return (v - dm) * (v - dm); })));
    var c = [0, 1, 2].map(function (k) { return Math.round(mean(cols.map(function (v) { return v[k]; }))); });
    return { n: dia.length, dMean: dm, dSd: dsd, circ: mean(circ), rgb: c, hex: '#' + c.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join(''), pxPerMm: pxPerMm, ticks: runs.length };
  }
  function profileHtml() {
    var P = S.profile, im = imprintSummary();
    if (!P) return '';
    var logo = im && im.hits / im.n >= 0.5, round = P.circ > 0.95;
    var match = logo && round && P.dMean >= 7.0 && P.dMean <= 8.5;
    var row = function (k, v, badge) { return '<tr><th>' + k + '</th><td>' + v + '</td><td><span class="badge ' + badge[0] + '">' + badge[1] + '</span></td></tr>'; };
    return '<div class="profile"><div class="muted small"><b>Forensic physical profile</b> · calibrated from the scale bar (' + P.ticks + ' ticks, ' + P.pxPerMm.toFixed(2) + ' px/mm)</div><table>' +
      row('Count', P.n + ' tablets', ['algo', 'Live measurement']) +
      row('Diameter', P.dMean.toFixed(1) + ' ± ' + P.dSd.toFixed(1) + ' mm', ['algo', 'Live measurement']) +
      row('Shape', (round ? 'Round' : 'Irregular') + ' · circularity ' + P.circ.toFixed(2), ['algo', 'Live measurement']) +
      row('Colour', '<i class="swatch" style="background:' + P.hex + '"></i>' + P.hex.toUpperCase() + ' · sRGB ' + P.rgb.join(', '), ['algo', 'Live measurement']) +
      row('Logo / imprint', im ? (im.hits ? 'Twin crescents on ' + im.hits + ' of ' + im.n + ' tablets' : 'No Captagon-style logo') : '–', ['live', 'Live model']) +
      row('Score line', im && S.crops.some(function (c) { return c.res.top === 2; }) ? 'Present' : 'None', ['live', 'Live model']) +
      row('Thickness · weight', 'Not measurable from a top-down photo – use calipers and a balance', ['sim', 'Manual step']) +
      '</table><div class="ref ' + (match || (im && im.hits) ? 'hit' : '') + '">' + (match ? '⚠ Consistent with the Captagon-style reference profile (illustrative): 7.0–8.5 mm, round, off-white, twin-crescent logo.' : im && im.hits ? '⚠ ' + im.hits + ' of ' + im.n + ' tablets carry the Captagon-style logo – separate them for lab testing.' : 'Does not match the Captagon-style reference profile.') + '</div></div>';
  }
  function analyseDesk() {
    $('#deskResult').innerHTML = '<div class="placeholder"><span class="spinner"></span>Classifying tablet imprints with the M2 model&hellip;</div>';
    var s = NL.deskSamples[S.deskSample];
    return NL.rasterPhoto(s).then(function (photo) {
      S.profile = measureProfile(photo, s);
      S.crops = s.tablets.map(function (t) {
        var side = t[2] * 2.6, x = t[0] - side / 2, y = t[1] - side / 2;
        var cc = document.createElement('canvas'); cc.width = 48; cc.height = 48;
        cc.getContext('2d').drawImage(photo, x, y, side, side, 0, 0, 48, 48);
        return { canvas: cc, res: NL.m2.run(photo, x, y, side, side) };
      });
      return new Promise(function (r) { setTimeout(r, 350); });
    }).then(function () { S.deskAnalysed = true; renderDesk(); });
  }
  function attachDesk() {
    var c = current(), s = NL.deskSamples[S.deskSample];
    if (!c || !S.deskAnalysed) return;
    var sc = deskScore(), sum = deskSummary();
    c.evidence.m2 = { score: sc, text: sum };
    addTimeline(c, 'M2', sum + ' · score ' + sc, 'Imprints from the live M2 model; ' + s.registry.text.replace('✕ ', '').toLowerCase() + ' (simulated OCR).', 'danger');
    log(c.site, c.id + ' · M2: ' + sum, 'danger');
    $('#deskAttach').textContent = 'Attached to ' + c.id + ' ✓';
    $('#deskAttach').disabled = true;
  }

  // ----- imprint pad -----
  var PAD = { base: null, drawing: false, truth: null };
  function padReset() {
    var cv = $('#pad'), ctx = cv.getContext('2d');
    NL.drawTabletCrop(ctx, 240, 1, NL.rng(11));
    PAD.base = ctx.getImageData(0, 0, 240, 240);
    PAD.truth = null;
    $('#padResult').innerHTML = '<p class="muted small">Waiting for your drawing&hellip;</p>';
  }
  function padClassify() {
    var res = NL.m2.run($('#pad'), 0, 0, 240, 240);
    if (!res) return;
    var order = res.probs.map(function (p, i) { return i; }).sort(function (a, b) { return res.probs[b] - res.probs[a]; });
    $('#padResult').innerHTML = order.map(function (i) {
      var cls = NL.IMPRINT_CLASSES[i], p = Math.round(res.probs[i] * 100);
      return '<div class="prob-row' + (i === res.top ? ' top' : '') + (cls.risk ? ' risk' : '') + '"><span>' + esc(cls.name) + '</span><b>' + p + '%</b><div class="track"><i style="width:' + p + '%"></i></div></div>';
    }).join('') + '<p class="muted small">' + (PAD.truth != null ? 'True class of this random example: <b>' + esc(NL.IMPRINT_CLASSES[PAD.truth].name) + '</b> · ' : '') + res.ms.toFixed(1) + ' ms</p>';
  }
  function initPad() {
    var cv = $('#pad'), ctx = cv.getContext('2d'), last = null;
    padReset();
    function pt(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * 240, y: (e.clientY - r.top) / r.height * 240 }; }
    cv.addEventListener('pointerdown', function (e) { PAD.drawing = true; PAD.truth = null; last = pt(e); cv.setPointerCapture(e.pointerId); e.preventDefault(); });
    cv.addEventListener('pointermove', function (e) {
      if (!PAD.drawing) return;
      var p = pt(e);
      ctx.strokeStyle = 'rgba(122,110,88,0.92)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      last = p;
    });
    var up = function () { if (PAD.drawing) { PAD.drawing = false; padClassify(); } };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    $('#padClear').addEventListener('click', padReset);
    $('#padRandom').addEventListener('click', function () {
      var cls = Math.floor(Math.random() * 4);
      NL.drawTabletCrop(ctx, 240, cls, NL.rng(Math.floor(Math.random() * 1e9)));
      PAD.truth = cls; padClassify();
    });
    $('#padUpload').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var img = new Image();
      img.onload = function () {
        var s = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 240, 240);
        PAD.truth = null; padClassify();
      };
      img.src = URL.createObjectURL(f);
      this.value = '';
    });
  }

  // ---------------- M3 hyperspectral ----------------
  function renderHyper() {
    $('#hyperPick').innerHTML = Object.keys(NL.hyperScenes).map(function (k) {
      return '<button data-scene="' + k + '" class="' + (k === S.hyperScene ? 'active' : '') + '">' + NL.hyperScenes[k].name + '</button>';
    }).join('');
    if (!NL.hyper.cur || NL.hyper.cur.scene !== S.hyperScene) NL.hyper.setScene(S.hyperScene);
    else { NL.hyper.draw(); NL.hyper.drawSpectrum(); }
    renderHyperResult();
  }
  function renderHyperResult() {
    var R = NL.hyper.result, el = $('#hyperResult'), c = current();
    var btn = $('#hyperAttach');
    btn.disabled = !R || !c;
    btn.textContent = c ? 'Attach to case ' + c.id : 'Attach to case';
    if (!R) { el.innerHTML = '<p class="muted small">Press <b>Auto-scan</b> to classify every pixel against ' + NL.library.length + ' library substances (+ packaging materials).</p>'; return; }
    var top = R.top, pct = Math.round(top.r * 100);
    el.innerHTML =
      '<div class="decision ' + (R.illicit ? 'high' : 'low') + '"><span>' + (R.illicit ? '⚠ ' + esc(top.ref.name) + ' · ' + pct + '% match' : '✓ No controlled substance · ' + esc(top.ref.name) + ' ' + pct + '%') + '</span>' +
      (R.illicit ? '<span class="small">' + R.coverage + '% of contents · ' + R.pixels + ' px</span>' : '') + '</div>' +
      '<ul class="rank">' + R.ranking.map(function (x) {
        var p = Math.max(0, Math.round(x.r * 100));
        return '<li><span>' + esc(x.ref.name) + ' <span class="muted">· ' + esc(x.ref.note) + '</span></span><b>' + p + '%</b><div class="track"><i style="width:' + p + '%;background:' + (x.ref.illicit ? 'var(--danger)' : 'var(--ok)') + '"></i></div></li>';
      }).join('') + '</ul>' +
      (R.unmix ? '<p class="small"><b>Mixture (non-negative least-squares unmixing):</b> ' + R.unmix.parts.slice(0, 3).map(function (q) { return Math.round(q.f * 100) + '% ' + esc(q.ref.name); }).join(' + ') + ' <span class="muted">· fit error ' + R.unmix.rmse.toFixed(3) + '</span></p>' : '');
  }
  function hyperScan() {
    $('#hyperScan').disabled = true;
    return NL.hyper.autoScan().then(function () { $('#hyperScan').disabled = false; renderHyperResult(); });
  }
  function attachHyper() {
    var R = NL.hyper.result, c = current();
    if (!R || !c) return;
    var pct = Math.round(R.top.r * 100);
    c.evidence.m3 = R.illicit ? { score: pct, illicit: true, text: R.top.ref.name } : { score: 5, illicit: false, text: 'No controlled substance' };
    addTimeline(c, 'M3', R.illicit ? R.top.ref.name + ' · ' + pct + '% spectral match' : 'No controlled substance detected',
      R.illicit ? 'Identified through the sealed pouch; ' + R.coverage + '% of contents. Mixture: ' + R.unmix.parts.slice(0, 2).map(function (q) { return Math.round(q.f * 100) + '% ' + q.ref.name; }).join(' + ') + '. Spectra saved to evidence pack.' : 'Contents match benign library entries.', R.illicit ? 'danger' : 'ok');
    log(c.site, c.id + ' · M3: ' + (R.illicit ? R.top.ref.name + ' ' + pct + '%' : 'clean'), R.illicit ? 'danger' : 'ok');
    $('#hyperAttach').textContent = 'Attached to ' + c.id + ' ✓';
    $('#hyperAttach').disabled = true;
  }

  // ---------------- M4 predictor ----------------
  var FAMILIES = [
    { fam: 'Amphetamine-type', base: 'ats', basis: 'Captagon seizure trend ↑ · analogue series A' },
    { fam: 'Synthetic cannabinoid', base: 'scra', basis: 'EU early-warning feed · new tail-group pattern' },
    { fam: 'Nitazene-type opioid', base: 'nitazene', basis: 'Global early-warning reports · ring substitution' },
    { fam: 'Peptide hormone', base: 'peptide', basis: 'Parcel seizures of "research peptides" ↑' },
    { fam: 'Methamphetamine', base: 'meth', basis: 'Precursor-route change in regional seizures' }
  ];
  var VAR_SEQ = 410;
  function makeVariant(fi, status, seen) {
    var F = FAMILIES[fi], r = NL.rng(++VAR_SEQ * 13);
    var peaks = NL.ref(F.base).peaks.map(function (p) { return [p[0] + (r() - 0.5) * 50, p[1] * (0.8 + r() * 0.4), p[2]]; });
    return { id: 'PV-0' + VAR_SEQ, fam: F.fam, basis: F.basis, s: NL.spec(peaks), conf: 72 + Math.floor(r() * 20), status: status, seen: seen || 'Not yet seen in UAE' };
  }
  S.variants = [
    makeVariant(0, 'live', 'Not yet seen in UAE'),
    makeVariant(1, 'live', 'Seen in EU feeds, not GCC'),
    makeVariant(2, 'live', 'Not yet seen in GCC'),
    makeVariant(3, 'review', 'Not yet seen in UAE')
  ];
  function spark(s) {
    var lo = Math.min.apply(null, s), hi = Math.max.apply(null, s);
    var pts = s.map(function (v, i) { return (i / (s.length - 1) * 118 + 1).toFixed(1) + ',' + (32 - (v - lo) / ((hi - lo) || 1) * 28).toFixed(1); }).join(' ');
    return '<svg class="spark" viewBox="0 0 120 34"><polyline points="' + pts + '" fill="none" stroke="var(--accent)" stroke-width="1.6"/></svg>';
  }
  var STATUS = {
    predicting: '<span class="pill"><span class="spinner"></span>Predicting</span>',
    review: '<span class="pill mid">Lab validation</span>',
    live: '<span class="pill accent">✓ In M3 library</span>'
  };
  function renderPredict() {
    var m = S.model;
    $('#predKpis').innerHTML =
      '<div class="kpi"><div class="lbl">M3 library size</div><div class="val">' + m.library + '</div><div class="sub">substances &amp; variants</div></div>' +
      '<div class="kpi"><div class="lbl">Predicted by M4</div><div class="val">' + m.predicted + '</div><div class="sub">validated variants in library</div></div>' +
      '<div class="kpi"><div class="lbl">Caught before first seizure</div><div class="val">' + m.early + '</div><div class="sub">variants recognised on first appearance</div></div>';
    $('#predTable').innerHTML = '<thead><tr><th>Variant</th><th>Family</th><th>Why predicted</th><th>Predicted fingerprint</th><th>Conf.</th><th>Seen?</th><th>Status</th></tr></thead><tbody>' +
      S.variants.map(function (v) {
        return '<tr class="' + (v.fresh ? 'new' : '') + '"><td><code>' + v.id + '</code></td><td>' + v.fam + '</td><td class="muted">' + esc(v.basis) + '</td><td>' + spark(v.s) + '</td><td>' + v.conf + '%</td><td class="muted">' + v.seen + '</td><td>' + STATUS[v.status] + '</td></tr>';
      }).join('') + '</tbody>';
    S.variants.forEach(function (v) { v.fresh = false; });
  }
  function runPrediction() {
    var btn = $('#predRun');
    btn.disabled = true;
    var news = [makeVariant(Math.floor(Math.random() * 5), 'predicting'), makeVariant(Math.floor(Math.random() * 5), 'predicting'), makeVariant(Math.floor(Math.random() * 5), 'predicting')];
    news.forEach(function (v) { v.fresh = true; });
    S.variants = news.concat(S.variants);
    renderPredict();
    setTimeout(function () { news.forEach(function (v) { v.status = 'review'; }); if (S.screen === 'predict') renderPredict(); }, 1400);
    setTimeout(function () {
      news.forEach(function (v) { v.status = 'live'; });
      S.model.library += 3; S.model.predicted += 3;
      log('DXB', 'M4 pushed 3 predicted variants to every M3 camera', 'info');
      if (S.screen === 'predict') renderPredict();
      btn.disabled = false;
    }, 2900);
  }

  // ---------------- learning loop ----------------
  var CORE = { x: 300, y: 180 };
  function nodePos(i) { var a = -Math.PI / 2 + i * 2 * Math.PI / NL.sites.length; return { x: CORE.x + Math.cos(a) * 140, y: CORE.y + Math.sin(a) * 135 }; }
  function renderFedNet() {
    var h = '';
    NL.sites.forEach(function (s, i) { var p = nodePos(i); h += '<line class="link" x1="' + CORE.x + '" y1="' + CORE.y + '" x2="' + p.x + '" y2="' + p.y + '"/>'; });
    NL.sites.forEach(function (s, i) {
      var p = nodePos(i), below = p.y > CORE.y + 20;
      h += '<circle class="node" id="node-' + s.id + '" cx="' + p.x + '" cy="' + p.y + '" r="15"/>' +
        '<text class="site-lbl" x="' + p.x + '" y="' + (below ? p.y + 32 : p.y - 22) + '" text-anchor="middle">' + esc(s.name) + '</text>';
    });
    h += '<circle class="core" cx="' + CORE.x + '" cy="' + CORE.y + '" r="40"/><text class="core-lbl" x="' + CORE.x + '" y="' + (CORE.y - 2) + '" text-anchor="middle">NarcoLens</text>' +
      '<text class="core-lbl" x="' + CORE.x + '" y="' + (CORE.y + 14) + '" text-anchor="middle" style="font-size:10.5px;font-weight:600">core · on-prem</text><g id="packets"></g>';
    $('#fedNet').innerHTML = h;
  }
  function renderLearn() {
    var m = S.model;
    $('#modelVer').textContent = 'Model v' + m.v.join('.');
    $('#modelVer').className = 'pill accent';
    if (!$('#fedNet').childNodes.length) renderFedNet();
    var c = S.cases.find(function (x) { return /Seized/.test(x.status); });
    var done = S.cases.find(function (x) { return /confirmed/.test(x.status); });
    $('#learnCase').innerHTML = c
      ? '<div class="card-h"><h3>Pending lab result</h3><span class="pill high">' + c.id + '</span></div><p><b>' + esc(c.tag) + '</b> · ' + esc(c.evidence.m3 ? c.evidence.m3.text : '') + '</p><p class="muted small">AI evidence pack: X-ray, officer photos, OCR, spectra and fusion scores, under chain of custody.</p>'
      : done
        ? '<div class="card-h"><h3>Last confirmed seizure</h3><span class="pill low">' + done.id + '</span></div><p><b>' + esc(done.tag) + '</b> · ' + esc(done.status) + '</p>'
        : '<div class="card-h"><h3>Waiting for a seizure</h3></div><p class="muted">Run the full demo, or seize a case after M3 identifies a substance. You can still trigger a scheduled retraining round below.</p>';
    $('#learnMetrics').innerHTML =
      '<div class="metric"><span>Detection recall (held-out seizures)</span><b>' + m.recall.toFixed(1) + '%' + (m.dRecall ? '<span class="delta">+' + m.dRecall + '</span>' : '') + '</b></div>' +
      '<div class="metric"><span>Extra false alarms per lane</span><b>' + m.far.toFixed(1) + '%' + (m.dFar ? '<span class="delta">−' + m.dFar + '</span>' : '') + '</b></div>' +
      '<div class="metric"><span>Sites on current model</span><b>' + NL.sites.length + ' / ' + NL.sites.length + '</b></div>' +
      '<div class="metric"><span>Raw images shared between sites</span><b>0</b></div>';
  }
  function setStep(n) {
    $$('#learnSteps li').forEach(function (li, i) { li.className = i < n ? 'done' : i === n ? 'active' : ''; });
  }
  function animatePackets(toCore, color, dur) {
    return new Promise(function (resolve) {
      var g = $('#packets'), ns = 'http://www.w3.org/2000/svg';
      if (!g) return resolve();
      var dots = NL.sites.map(function (s, i) {
        var c = document.createElementNS(ns, 'circle');
        c.setAttribute('r', 6); c.setAttribute('fill', color);
        g.appendChild(c);
        return { el: c, p: nodePos(i), delay: i * 70 };
      });
      var start = performance.now();
      function f(now) {
        var all = true;
        dots.forEach(function (d) {
          var t = Math.max(0, Math.min(1, (now - start - d.delay) / dur));
          if (t < 1) all = false;
          var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          var a = toCore ? d.p : CORE, b = toCore ? CORE : d.p;
          d.el.setAttribute('cx', a.x + (b.x - a.x) * e);
          d.el.setAttribute('cy', a.y + (b.y - a.y) * e);
        });
        if (!all) requestAnimationFrame(f);
        else { dots.forEach(function (d) { d.el.remove(); }); resolve(); }
      }
      requestAnimationFrame(f);
    });
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function learnGo() {
    var btn = $('#learnGo');
    btn.disabled = true;
    var st = $('#learnStatus');
    var c = S.cases.find(function (x) { return /Seized/.test(x.status); });
    setStep(0);
    return sleep(400).then(function () {
      setStep(1);
      st.textContent = 'Forensic lab confirms substance…';
      if (c) {
        c.status = 'Seizure confirmed by lab';
        addTimeline(c, 'LAB', 'Lab confirmed: ' + (c.evidence.m3 ? c.evidence.m3.text : 'controlled substance'), 'Case closed. Labelled images and spectra added to local training set.', 'danger');
        S.stats.seizures += 1;
        log(c.site, c.id + ' lab-confirmed → added to training data', 'danger');
      }
      return sleep(900);
    }).then(function () {
      setStep(2); st.textContent = 'Each site trains locally on its own confirmed cases…';
      $$('#fedNet .node').forEach(function (n) { n.classList.add('sync'); });
      return sleep(900);
    }).then(function () {
      setStep(3); st.textContent = 'Encrypted model updates → core (no images)';
      return animatePackets(true, '#f59e0b', 1100);
    }).then(function () {
      st.textContent = 'Core aggregates updates…';
      return sleep(600);
    }).then(function () {
      setStep(4);
      var m = S.model;
      m.v[2] += 1; m.recall = Math.min(99, m.recall + 0.4); m.far = Math.max(1, m.far - 0.2);
      m.dRecall = '0.4'; m.dFar = '0.2';
      S.stats.far = m.far;
      st.textContent = 'Model v' + m.v.join('.') + ' → all sites';
      return animatePackets(false, '#2dd4bf', 1100);
    }).then(function () {
      setStep(5);
      $$('#fedNet .node').forEach(function (n) { n.classList.remove('sync'); });
      st.textContent = 'All ' + NL.sites.length + ' sites updated to v' + S.model.v.join('.');
      log('DXB', 'Federated update v' + S.model.v.join('.') + ' deployed to all sites', 'info');
      renderLearn();
      btn.disabled = false;
    });
  }

  // ---------------- info popovers (ⓘ buttons) ----------------
  var openInfo = null;
  function closeInfo(returnFocus) {
    if (!openInfo) return;
    var btn = openInfo.btn;
    openInfo.pop.hidden = true; btn.setAttribute('aria-expanded', 'false');
    openInfo = null;
    if (returnFocus) btn.focus();
  }
  function initInfoPopovers() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-info]');
      if (btn) {
        var pop = document.getElementById(btn.dataset.info), same = openInfo && openInfo.pop === pop;
        closeInfo(false);
        if (!same) { pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); openInfo = { btn: btn, pop: pop }; pop.focus(); }
        return;
      }
      if (openInfo && e.target.closest('.info-x')) { closeInfo(true); return; }
      if (openInfo && !e.target.closest('.info-pop')) closeInfo(false);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openInfo) closeInfo(true); });
  }

  // ---------------- challenge: you vs the AI ----------------
  var CH = null;
  function chStart() {
    CH = { round: 0, you: 0, ai: 0, results: [], base: Math.floor(Math.random() * 1e8) + 3e7 };
    chRound();
  }
  function chRound() {
    var r = NL.rng(CH.base + CH.round * 101);
    CH.answered = false;
    CH.scene = NL.randomScene(CH.base + CH.round, { positives: r() < 0.6 ? 1 + (r() < 0.25 ? 1 : 0) : 0 });
    CH.off = document.createElement('canvas'); CH.off.width = NL.XRAY.W; CH.off.height = NL.XRAY.H;
    CH.mask = document.createElement('canvas'); CH.mask.width = NL.XRAY.W; CH.mask.height = NL.XRAY.H;
    NL.renderScene(CH.scene, CH.off.getContext('2d'), CH.mask.getContext('2d'));
    var cv = $('#chCanvas'); cv.getContext('2d').drawImage(CH.off, 0, 0);
    cv.classList.add('aim');
    $('#chRound').textContent = 'Round ' + (CH.round + 1) + ' of 5';
    $('#chHint').innerHTML = 'Click where you think drugs are hidden &ndash; or press &ldquo;Looks clean&rdquo;.';
    $('#chClean').hidden = false; $('#chNext').hidden = true;
    chBoard();
  }
  function chAnswer(pt) {
    if (!CH || CH.answered || CH.round >= 5) return;
    CH.answered = true;
    var truth = NL.sceneHasConcealment(CH.scene), res = NL.m1.run(CH.off), aiFlag = res.score >= 50;
    var hit = false;
    if (pt) { var md = CH.mask.getContext('2d').getImageData(Math.round(pt.x), Math.round(pt.y), 1, 1).data; hit = md[0] > 127; }
    var youOk = pt ? (truth && hit) : !truth, aiOk = aiFlag === truth;
    if (youOk) CH.you++; if (aiOk) CH.ai++;
    CH.results.push({ truth: truth, youOk: youOk, aiOk: aiOk, ai: res.score, ms: res.ms, clicked: !!pt });
    var cv = $('#chCanvas'), ctx = cv.getContext('2d');
    cv.classList.remove('aim');
    ctx.drawImage(CH.off, 0, 0); NL.drawTruth(ctx, CH.mask); NL.drawOverlay(ctx, res);
    if (pt) {
      ctx.strokeStyle = youOk ? '#22c55e' : '#f59e0b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 16, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pt.x - 24, pt.y); ctx.lineTo(pt.x + 24, pt.y); ctx.moveTo(pt.x, pt.y - 24); ctx.lineTo(pt.x, pt.y + 24); ctx.stroke();
    }
    $('#chHint').innerHTML = (truth ? 'Drugs were hidden (blue = ground truth).' : 'This bag was clean.') + ' You: <b class="' + (youOk ? 'lvl-low' : 'lvl-high') + '">' + (youOk ? '✓' : '✗') + '</b> · AI (' + res.score + '/100): <b class="' + (aiOk ? 'lvl-low' : 'lvl-high') + '">' + (aiOk ? '✓' : '✗') + '</b>';
    CH.round++;
    $('#chClean').hidden = true;
    $('#chNext').hidden = false; $('#chNext').innerHTML = CH.round >= 5 ? 'See final score' : 'Next bag &rarr;';
    chBoard();
  }
  function chBoard() {
    var done = CH.round >= 5 && CH.answered, avg = CH.results.length ? CH.results.reduce(function (a, r) { return a + r.ms; }, 0) / CH.results.length : 0;
    $('#chBoard').innerHTML =
      '<div class="result-h"><h3>Scoreboard</h3><span class="badge live">Live model</span></div>' +
      '<div class="vs"><div><small>You</small><b>' + CH.you + '</b></div><span>vs</span><div><small>AI (M1)</small><b>' + CH.ai + '</b></div></div>' +
      '<ol class="ch-list">' + [0, 1, 2, 3, 4].map(function (i) {
        var r = CH.results[i];
        return '<li class="' + (r ? '' : 'todo') + '"><span>Bag ' + (i + 1) + (r ? ' · ' + (r.truth ? 'drugs hidden' : 'clean') : '') + '</span>' +
          (r ? '<span>You ' + (r.youOk ? '✓' : '✗') + ' · AI ' + (r.aiOk ? '✓' : '✗') + ' <small>(' + r.ai + ')</small></span>' : '<span class="muted">–</span>') + '</li>';
      }).join('') + '</ol>' +
      (done ? '<div class="decision ' + (CH.ai >= CH.you ? 'low' : 'mid') + '"><span>Final: you ' + CH.you + '/5 · AI ' + CH.ai + '/5 · AI took ' + avg.toFixed(0) + ' ms per bag</span><button class="btn primary" type="button" id="chAgain">Play again</button></div>' :
        '<p class="muted small">You score when you click inside a hidden concealment, or say &ldquo;Looks clean&rdquo; on a clean bag. The AI scores when its flag (≥ 50) matches the truth. Every bag is generated fresh, so neither of you has seen it before.</p>');
  }
  function renderChallenge() { if (!CH) chStart(); else { chBoard(); } }
  function initChallenge() {
    var cv = $('#chCanvas');
    cv.addEventListener('click', function (e) { var r = cv.getBoundingClientRect(); chAnswer({ x: (e.clientX - r.left) / r.width * NL.XRAY.W, y: (e.clientY - r.top) / r.height * NL.XRAY.H }); });
    $('#chClean').addEventListener('click', function () { chAnswer(null); });
    $('#chNext').addEventListener('click', function () { if (CH.round >= 5) { CH.answered = true; chBoard(); $('#chNext').hidden = true; $('#chHint').textContent = 'Game over – see the scoreboard.'; } else chRound(); });
    $('#chRestart').addEventListener('click', chStart);
    // automated-test helper: centre of the first hidden concealment in the current bag (null if clean)
    NL._chScene = function () { if (!CH || !CH.scene) return null; var it = CH.scene.items.find(function (i) { return NL.xrayItems[i.type].positive; }); return it ? { x: it.x, y: it.y } : null; };
    $('#chBoard').addEventListener('click', function (e) { if (e.target.id === 'chAgain') chStart(); });
  }

  // ---------------- AI models: model cards + live benchmarks ----------------
  function pct(v) { return (v * 100).toFixed(1) + '%'; }
  function renderModels() {
    var M = NL.MODEL_METRICS || {}, m1 = M.m1 || {}, m2 = M.m2 || {};
    $('#cardM1').innerHTML =
      '<div class="card-h"><h3>M1 · X-ray concealment segmentation</h3><span class="badge live">Live model</span></div>' +
      '<p class="muted">A fully-convolutional neural network that outputs a per-pixel probability of hidden drugs. Trained on ' + (m1.train_bags || 0).toLocaleString('en-US') + ' synthetic dual-energy bag scans with pixel-level ground truth; tested on ' + (m1.test_bags || 0) + ' bags it never saw.</p>' +
      '<div class="mc-grid">' +
      '<div class="mc"><small>Bag-level recall</small><b>' + pct(m1.bag_recall || 0) + '</b></div>' +
      '<div class="mc"><small>False alarms (clean bags)</small><b>' + pct(m1.bag_false_alarm || 0) + '</b></div>' +
      '<div class="mc"><small>Pixel IoU</small><b>' + pct(m1.pixel_iou || 0) + '</b></div>' +
      '<div class="mc"><small>Parameters</small><b>' + (m1.params || 0).toLocaleString('en-US') + '</b></div></div>' +
      '<div class="arch">input 3×128×224 (RGB dual-energy)\nconv3×3·16 → pool → conv3×3·32 → pool\ndilated conv·32 (d=2) → dilated conv·32 (d=4)\nconv1×1·16 → upsample ×2 ⊕ skip(conv1)\nconv3×3·16 → conv1×1·1 → sigmoid heatmap 64×112</div>' +
      '<div class="row"><button class="btn primary" id="benchM1" type="button">Test on 40 brand-new random bags</button><span class="muted small" id="benchM1Out">Runs entirely in this browser.</span></div>' +
      '<div class="bench-thumbs" id="benchM1Thumbs"></div>';
    var cm = m2.confusion || [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], short = ['Crescent', 'Plain', 'Scored', 'Letter'];
    $('#cardM2').innerHTML =
      '<div class="card-h"><h3>M2 · Tablet imprint classifier</h3><span class="badge live">Live model</span></div>' +
      '<p class="muted">A convolutional classifier for 48×48 tablet close-ups: Captagon-style twin-crescent vs. plain, scored and letter-stamped tablets. Trained on ' + (m2.train_crops || 0).toLocaleString('en-US') + ' synthetic close-ups with random lighting, rotation, blur and noise.</p>' +
      '<div class="mc-grid">' +
      '<div class="mc"><small>Test accuracy</small><b>' + pct(m2.accuracy || 0) + '</b></div>' +
      '<div class="mc"><small>Crescent recall</small><b>' + pct(m2.crescent_recall || 0) + '</b></div>' +
      '<div class="mc"><small>Crescent false positives</small><b>' + pct(m2.crescent_false_positive || 0) + '</b></div>' +
      '<div class="mc"><small>Parameters</small><b>' + (m2.params || 0).toLocaleString('en-US') + '</b></div></div>' +
      '<table class="cm"><tr><th>true ↓ / predicted →</th>' + short.map(function (s) { return '<th>' + s + '</th>'; }).join('') + '</tr>' +
      cm.map(function (row, i) { return '<tr><th>' + short[i] + '</th>' + row.map(function (v, j) { return '<td class="' + (i === j ? 'diag' : '') + '">' + v + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>' +
      '<div class="row"><button class="btn primary" id="benchM2" type="button">Test on 200 brand-new tablets</button><span class="muted small" id="benchM2Out">Runs entirely in this browser.</span></div>';
    $('#cardOthers').innerHTML =
      '<div class="card-h"><h3>What is real in this prototype</h3><span class="muted small">Models trained ' + esc(M.trained || '') + ' · training code in narcolens-ml/</span></div>' +
      '<table class="tbl" style="min-width:0"><thead><tr><th>Component</th><th>Status</th><th>How it works here</th></tr></thead><tbody>' +
      [['M1 X-ray vision', 'live', 'Trained CNN, pure-JS inference on every scan, Bag Builder and uploads'],
       ['M2 tablet imprints', 'live', 'Trained CNN on every tablet crop, the imprint pad and uploads'],
       ['M2 packaging detection & OCR', 'sim', 'Pre-written results for the three sample photos'],
       ['M3 spectral ID', 'algo', 'Pearson matching against an 11-substance library + non-negative least-squares unmixing'],
       ['M3 hyperspectral camera', 'sim', 'Spectra are simulated (no sensor attached)'],
       ['M4 novel-drug predictor', 'sim', 'Illustrative predictions'],
       ['M5 fusion', 'algo', 'Noisy-OR over live evidence scores'],
       ['Federated learning loop', 'sim', 'Animated illustration of the training round']
      ].map(function (r) { return '<tr><td>' + r[0] + '</td><td><span class="badge ' + r[1] + '">' + ({ live: 'Live model', algo: 'Live algorithm', sim: 'Simulated' })[r[1]] + '</span></td><td class="muted">' + r[2] + '</td></tr>'; }).join('') +
      '</tbody></table><p class="muted small">Production would retrain M1 and M2 on real customs scans and photos under a data-sharing MoU; the synthetic training here proves the pipeline and the in-browser/edge inference, not field accuracy.</p>';
    $('#benchM1').addEventListener('click', benchM1);
    $('#benchM2').addEventListener('click', benchM2);
  }
  function benchM1() {
    var btn = $('#benchM1'), out = $('#benchM1Out'), th = $('#benchM1Thumbs');
    btn.disabled = true; th.innerHTML = '';
    var N = 40, k = 0, tp = 0, fp = 0, tn = 0, fn = 0, ms = 0, base = Math.floor(Math.random() * 1e8) + 5e6;
    var off = document.createElement('canvas'); off.width = NL.XRAY.W; off.height = NL.XRAY.H;
    function next() {
      if (k >= N) {
        out.innerHTML = '<b>Recall ' + (tp + fn ? Math.round(tp / (tp + fn) * 100) : 0) + '%</b> (' + tp + '/' + (tp + fn) + ' drug bags) · <b>False alarms ' + (fp + tn ? Math.round(fp / (fp + tn) * 100) : 0) + '%</b> (' + fp + '/' + (fp + tn) + ' clean bags) · ' + (ms / N).toFixed(0) + ' ms per bag';
        btn.disabled = false; return;
      }
      var sc = NL.randomScene(base + k), truth = NL.sceneHasConcealment(sc);
      NL.renderScene(sc, off.getContext('2d'), null);
      var res = NL.m1.run(off), flag = res.score >= 50;
      ms += res.ms;
      var cls = truth ? (flag ? 'tp' : 'fn') : (flag ? 'fp' : 'tn');
      if (cls === 'tp') tp++; else if (cls === 'fn') fn++; else if (cls === 'fp') fp++; else tn++;
      var t = document.createElement('canvas'); t.width = 152; t.height = 88; t.className = cls;
      var tc = t.getContext('2d'); tc.drawImage(off, 0, 0, 152, 88); tc.globalAlpha = 0.9; tc.drawImage(res.heatCanvas, 0, 0, 152, 88);
      t.title = (truth ? 'Drugs hidden' : 'Clean') + ' · AI score ' + res.score;
      th.appendChild(t);
      k++; out.textContent = 'Scanning bag ' + k + ' / ' + N + '…';
      setTimeout(next, 0);
    }
    next();
  }
  function benchM2() {
    var btn = $('#benchM2'), out = $('#benchM2Out');
    btn.disabled = true;
    var N = 200, ok = 0, cres = 0, cresHit = 0, ms = 0, c = document.createElement('canvas'); c.width = 48; c.height = 48;
    var base = Math.floor(Math.random() * 1e8) + 9e6;
    for (var k = 0; k < N; k++) {
      var r = NL.rng(base + k), cls = Math.floor(r() * 4);
      NL.drawTabletCrop(c.getContext('2d'), 48, cls, r);
      var res = NL.m2.run(c, 0, 0, 48, 48); ms += res.ms;
      if (res.top === cls) ok++;
      if (cls === 0) { cres++; if (res.top === 0) cresHit++; }
    }
    out.innerHTML = '<b>Accuracy ' + Math.round(ok / N * 100) + '%</b> on ' + N + ' new tablets · crescent recall ' + Math.round(cresHit / Math.max(1, cres) * 100) + '% · ' + (ms / N).toFixed(1) + ' ms each';
    btn.disabled = false;
  }

  // ---------------- KPI count-up ----------------
  function countUpKpis() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    $$('#kpis .val').forEach(function (el) {
      var m = /^([^\d]*)([\d,.]+)(.*)$/.exec(el.textContent);
      if (!m) return;
      var target = parseFloat(m[2].replace(/,/g, '')), dec = (m[2].split('.')[1] || '').length, t0 = performance.now();
      el.dataset.counting = '1';
      (function step(now) {
        var p = Math.min(1, (now - t0) / 900), e = 1 - Math.pow(1 - p, 3), v = target * e;
        el.textContent = m[1] + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US')) + m[3];
        if (p < 1) requestAnimationFrame(step); else delete el.dataset.counting;
      })(t0);
    });
  }

  // ---------------- sign-in (fictional demo officer) ----------------
  var AUTH_KEY = 'nl-signed-in';
  function isSignedIn() { try { return sessionStorage.getItem(AUTH_KEY) === '1'; } catch (e) { return false; } }
  function fillOfficer() {
    var o = NL.officer;
    $('#offName').textContent = o.name; $('#offName').title = 'Inspector ' + o.name + ' · ' + o.role + ' · ' + o.org;
    $('#offRole').textContent = 'MOHAP · DXB T3 Desk 2';
  }
  function showLogin() {
    var l = $('#login');
    l.classList.remove('leaving'); l.hidden = false;
    document.body.classList.add('locked');
    $('#loginErr').hidden = true;
    $('#loginBtn').disabled = false; $('#loginBtn').textContent = 'Sign in';
    setTimeout(function () { $('#loginBtn').focus(); }, 60);
  }
  function doLogin(e) {
    e.preventDefault();
    var o = NL.officer, id = $('#loginId').value.trim().toUpperCase(), pw = $('#loginPw').value;
    var form = $('#loginForm');
    if (id !== o.id || pw !== o.password) {
      $('#loginErr').hidden = false;
      form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
      return;
    }
    var btn = $('#loginBtn');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Verifying officer credentials…';
    setTimeout(function () {
      try { sessionStorage.setItem(AUTH_KEY, '1'); } catch (err) { }
      $('#login').classList.add('leaving');
      setTimeout(function () { $('#login').hidden = true; document.body.classList.remove('locked'); }, 450);
      fillOfficer();
      log('DXB', o.short + ' signed in · ' + o.post, 'info');
      go(S.screen);
    }, 700);
  }
  function signOut() {
    stopDemo();
    if (S.autoBelt) toggleAuto();
    try { sessionStorage.removeItem(AUTH_KEY); } catch (e) { }
    log('DXB', NL.officer.short + ' signed out', 'info');
    showLogin();
  }

  var RENDER = { dashboard: renderDashboard, lane: renderLane, 'case': renderCase, desk: renderDesk, hyper: renderHyper, predict: renderPredict, learn: renderLearn, models: renderModels, challenge: renderChallenge };

  // ---------------- demo runner ----------------
  function narrate(n, total, text) {
    $('#narration').hidden = false;
    $('#narrStep').textContent = n + ' / ' + total;
    $('#narrText').textContent = text;
  }
  function endDemoUI() {
    $('#narration').hidden = true;
    $('#demoBtn').innerHTML = '&#9654; Run full demo';
    $('#demoChip').hidden = true; $('#clock').hidden = false;
    clearInterval(S.demoTimer);
  }
  function stopDemo() {
    var t = S.demo;
    if (!t) return;
    t.stop = true;
    t.cancels.splice(0).forEach(function (f) { f(); });
    S.demo = null;
    endDemoUI();
  }
  function runDemo() {
    if (S.demo) { stopDemo(); return; }
    var token = S.demo = { stop: false, cancels: [], t0: performance.now(), n: 0 };
    $('#demoBtn').innerHTML = '&#9632; Stop demo';
    $('#clock').hidden = true; $('#demoChip').hidden = false;
    var upd = function () {
      var sec = Math.floor((performance.now() - token.t0) / 1000);
      $('#demoTime').textContent = Math.floor(sec / 60) + ':' + ('0' + sec % 60).slice(-2);
      $('#demoStep').textContent = 'Step ' + Math.max(1, token.n) + ' of 8';
      $('#demoBar').style.width = (token.n / 8 * 100) + '%';
    };
    upd(); clearInterval(S.demoTimer); S.demoTimer = setInterval(upd, 250);
    if (S.autoBelt) toggleAuto();
    var bagI = NL.bags.findIndex(function (b) { return b.demo; });
    var TOTAL = 8;
    function wait(ms) {
      return new Promise(function (res, rej) {
        if (token.stop) return rej(new Error('stopped'));
        var id = setTimeout(function () { token.stop ? rej(new Error('stopped')) : res(); }, ms);
        token.cancels.push(function () { clearTimeout(id); rej(new Error('stopped')); });
      });
    }
    function step(n, text, fn, ms) {
      return function () {
        if (token.stop) throw new Error('stopped');
        token.n = n;
        narrate(n, TOTAL, text);
        return Promise.resolve(fn && fn()).then(function () { return wait(ms); });
      };
    }
    Promise.resolve()
      .then(step(1, 'A bag on a high-risk transfer route reaches DXB Terminal 3. Before it lands, M5 has already given it a pre-arrival score of 52.', function () { go('lane'); }, 3200))
      .then(step(2, 'M1 – a trained neural network running live in this browser – reads the X-ray and highlights the dense block hidden inside a protein tub.', function () { setLaneMode('belt'); return new Promise(function (res) { selectBag(bagI, res); }); }, 3600))
      .then(step(3, 'Fused score crosses the threshold, so a case opens. The officer sees exactly why: every factor is explained, and no nationality data is used.', function () { go('case'); }, 5200))
      .then(step(4, 'The officer opens the bag and photographs it. The live M2 model classifies every tablet imprint as Captagon-style; the label is not in the registry.', function () {
        caseAction('open'); S.deskSample = 'protein-tub'; S.deskAnalysed = false; renderDesk();
        return wait(800).then(analyseDesk).then(function () { return wait(1800); }).then(attachDesk);
      }, 2200))
      .then(step(5, 'M3: a hyperspectral camera identifies the powder through the sealed pouch – no need to open it.', function () {
        S.hyperScene = 'tub'; go('hyper');
        return hyperScan().then(function () { return wait(1200); }).then(attachHyper);
      }, 2600))
      .then(step(6, 'All evidence is in the same case. Final score 99 → seizure; the sample goes to the lab as legal proof.', function () {
        go('case'); return wait(2400).then(function () { caseAction('seize'); });
      }, 3000))
      .then(step(7, 'The lab confirms. Every site retrains on its own data; only model updates are shared – the whole network gets smarter.', function () {
        go('learn'); return wait(600).then(learnGo);
      }, 2400))
      .then(step(8, 'Back to the command view: one seizure at DXB improved detection at all seven UAE entry points.', function () { go('dashboard'); }, 4500))
      .catch(function () { })
      .then(function () { if (S.demo === token) { S.demo = null; endDemoUI(); } });
  }

  // ---------------- background activity ----------------
  var BG_EVENTS = [
    ['AUH', 'Bag cleared · Lane 2', 'ok'], ['JEA', 'Container scan cleared · Gantry 3', 'ok'], ['POST', 'Parcel cleared · Courier line 1', 'ok'],
    ['SHJ', 'Air-cargo pallet cleared', 'ok'], ['DWC', 'Bag cleared · Lane 1', 'ok'], ['KZP', 'Container scan cleared', 'ok'],
    ['POST', 'Parcel re-scan requested (score 51)', 'info'], ['AUH', 'AI flag · organic mass in shoe soles (score 68)', 'danger']
  ];
  function background() {
    S.stats.screened += 3 + Math.floor(Math.random() * 9);
    if (S.screen === 'dashboard' && !document.querySelector('#kpis [data-counting]')) renderKpis();
    if (Math.random() < 0.35) {
      var e = BG_EVENTS[Math.floor(Math.random() * BG_EVENTS.length)];
      if (e[2] === 'danger') S.stats.flags += 1;
      log(e[0], e[1], e[2]);
    } else { tick(2); }
  }

  // ---------------- theme ----------------
  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem('nl-theme'); } catch (e) { }
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    $('#themeBtn').addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme');
      if (!cur) cur = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      var next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('nl-theme', next); } catch (e) { }
      if (S.screen === 'hyper') NL.hyper.drawSpectrum();
    });
  }

  // ---------------- wiring ----------------
  function init() {
    NL.seedCases.forEach(function (o) { newCase(o); });
    S.cases.forEach(function (c) { c.timeline.forEach(function (t) { t.fresh = false; }); });
    S.currentCase = S.cases[0].id;
    initMap();
    renderMap();
    tick(0);
    log('POST', 'AI flag · PCL-POST-55120 · organic sheets (score ' + fuse(caseById('C-24117')).score + ') → case C-24117', 'danger');
    log('JEA', 'AI flag · CGO-JEA-30988 · dense voids in door panels → case C-24118', 'danger');
    log('AUH', 'Bag cleared · Lane 3', 'ok');

    $('#nav').addEventListener('click', function (e) { var a = e.target.closest('a'); if (a) { e.preventDefault(); go(a.dataset.screen); } });
    $('#flow').addEventListener('click', function (e) { var b = e.target.closest('[data-go]'); if (b) go(b.dataset.go); });
    $('#queue').addEventListener('click', function (e) { var li = e.target.closest('[data-case]'); if (li) { S.currentCase = li.dataset.case; go('case'); } });
    $('#bagStrip').addEventListener('click', function (e) { var b = e.target.closest('[data-bag]'); if (b) selectBag(+b.dataset.bag); });
    $('#laneResult').addEventListener('click', function (e) { var b = e.target.closest('[data-open-case]'); if (b) { S.currentCase = b.dataset.openCase; go('case'); } });
    $('#scanNext').addEventListener('click', scanNext);
    $('#laneAuto').addEventListener('click', toggleAuto);
    $('#overlayToggle').addEventListener('change', function () { if (S.laneMode === 'build') drawBuild(); else NL.redrawXray($('#xray')); });
    $('#truthToggle').addEventListener('change', function () { if (S.laneMode === 'build') drawBuild(); else NL.redrawXray($('#xray')); });
    $('#laneModes').addEventListener('click', function (e) { var b = e.target.closest('[data-mode]'); if (b) setLaneMode(b.dataset.mode); });
    initBuilder();
    initPad();
    initWhatIf();
    initChallenge();
    initInfoPopovers();
    $('#caseHead').addEventListener('change', function (e) { if (e.target.id === 'caseSelect') { S.currentCase = e.target.value; renderCase(); } });
    $('#caseActions').addEventListener('click', function (e) { var b = e.target.closest('[data-act]'); if (b) caseAction(b.dataset.act); });
    $('#samplePick').addEventListener('click', function (e) { var b = e.target.closest('[data-sample]'); if (b) { S.deskSample = b.dataset.sample; S.deskAnalysed = false; renderDesk(); } });
    $('#deskAnalyse').addEventListener('click', analyseDesk);
    $('#deskAttach').addEventListener('click', attachDesk);
    $('#hyperPick').addEventListener('click', function (e) { var b = e.target.closest('[data-scene]'); if (b) { S.hyperScene = b.dataset.scene; NL.hyper.setScene(S.hyperScene); renderHyper(); } });
    $('#hyperScan').addEventListener('click', hyperScan);
    $('#hyperAttach').addEventListener('click', attachHyper);
    $('#hyperMap').addEventListener('change', function () { NL.hyper.draw(); });
    $('#hyperCanvas').addEventListener('click', NL.hyper.pick);
    $('#predRun').addEventListener('click', runPrediction);
    $('#learnGo').addEventListener('click', learnGo);
    $('#demoBtn').addEventListener('click', runDemo);
    initTheme();
    $('#brandLink').addEventListener('click', function (e) { e.preventDefault(); go('dashboard'); });
    $('#loginForm').addEventListener('submit', doLogin);
    $('#signOut').addEventListener('click', signOut);
    fillOfficer();
    if (!isSignedIn()) showLogin();

    var start = (location.hash || '').replace('#', '');
    go(SCREENS[start] ? start : 'dashboard');
    setInterval(background, 2600);
  }

  NL.app = { go: go, runDemo: runDemo, state: S };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window.NL);
