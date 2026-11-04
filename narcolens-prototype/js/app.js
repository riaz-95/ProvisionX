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
    learn: { title: 'Learning Loop · Federated Retraining', sub: 'Every confirmed seizure makes every site smarter. Models train locally; only model updates – never raw images – leave a site.' }
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
  function tick(sec) { S.clock = new Date(S.clock.getTime() + sec * 1000); $('#clock').textContent = 'Simulated · ' + fmtTime(S.clock); }
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
    c.timeline.push({ t: fmtTime(t0), mod: 'M5', title: 'Pre-arrival score ' + o.preScore, text: o.preText, cls: o.preScore >= 45 ? 'danger' : '' });
    c.timeline.push({ t: fmtTime(S.clock), mod: 'M1', title: o.m1.label + ' · score ' + o.m1.score, text: o.m1.text, cls: 'danger' });
    c.timeline.push({ t: fmtTime(S.clock), mod: 'M5', title: 'Fused score ' + fuse(c).score + ' → ' + decisionText(fuse(c).score), text: 'Routed to inspection queue. Officer notified on tablet.', cls: '' });
    S.cases.unshift(c);
    return c;
  }
  function caseById(id) { return S.cases.find(function (c) { return c.id === id; }); }
  function caseByTag(tag) { return S.cases.find(function (c) { return c.tag === tag; }); }
  function current() { return caseById(S.currentCase) || S.cases[0]; }
  function addTimeline(c, mod, title, text, cls) {
    tick(20 + Math.floor(Math.random() * 40));
    c.timeline.push({ t: fmtTime(S.clock), mod: mod, title: title, text: text, cls: cls || '', fresh: true });
  }

  // ---------------- navigation ----------------
  function go(screen) {
    if (!SCREENS[screen]) screen = 'dashboard';
    S.screen = screen;
    $$('.screen').forEach(function (s) { s.hidden = s.id !== 'screen-' + screen; });
    $$('#nav a').forEach(function (a) { a.classList.toggle('active', a.dataset.screen === screen); });
    $('#screenTitle').textContent = SCREENS[screen].title;
    $('#screenSub').textContent = SCREENS[screen].sub;
    if (location.hash !== '#' + screen) history.replaceState(null, '', '#' + screen);
    var r = RENDER[screen];
    if (r) r();
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

  function renderMap() {
    var svg = $('#map');
    var land = 'M0,270 L120,250 L175,232 L240,205 L300,178 L360,150 L410,122 L450,98 L470,52 L492,60 L502,112 L524,150 L548,208 L536,252 L470,300 L330,330 L150,340 L0,340 Z';
    var h = '<path class="land" d="' + land + '"/>' +
      '<text class="sea-lbl" x="150" y="120">Arabian Gulf</text>' +
      '<text class="sea-lbl" x="562" y="120" text-anchor="middle" transform="rotate(70 562 120)">Gulf of Oman</text>';
    NL.sites.forEach(function (s) {
      h += '<g class="site-g" data-site="' + s.id + '"><circle class="site" cx="' + s.x + '" cy="' + s.y + '" r="6"/>' +
        '<text class="site-lbl" x="' + (s.x + s.lx) + '" y="' + (s.y + s.ly) + '" text-anchor="' + s.anchor + '">' + esc(s.name) + '</text></g>';
    });
    svg.innerHTML = h;
  }
  function pulse(siteId, kind) {
    var s = NL.site(siteId), svg = $('#map');
    if (!s || !svg) return;
    var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', s.x); c.setAttribute('cy', s.y); c.setAttribute('r', 6);
    c.setAttribute('class', 'pulse ' + kind);
    svg.appendChild(c);
    setTimeout(function () { c.remove(); }, 1900);
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
  function renderBagStrip() {
    $('#bagStrip').innerHTML = NL.bags.map(function (b, i) {
      var st = S.bagStatus[b.tag] || '';
      return '<button class="bag-chip ' + st + (i === S.bagIdx ? ' active' : '') + '" data-bag="' + i + '"><b>' + b.tag + '</b><span>' + esc(b.route) + '</span></button>';
    }).join('');
  }

  function renderLaneResult() {
    var el = $('#laneResult');
    var L = S.lastLane;
    if (!L) {
      el.innerHTML = '<div class="placeholder">Pick a bag on the belt or press <b>Scan next bag</b>.<br><br>M1 runs on an edge GPU box beside the existing scanner – no new X-ray hardware.</div>';
      return;
    }
    if (L.scanning) {
      el.innerHTML = '<div class="placeholder"><span class="spinner"></span>Bag ' + L.bag.tag + ' passing the scanner&hellip;</div>';
      return;
    }
    var b = L.bag, m = NL.concealments[b.concealment], sc = L.fused, l = lvl(sc);
    var fhtml = L.findings.length ? L.findings.map(function (f) {
      return '<div class="finding ' + (f.level === 'low' ? 'low' : '') + '"><b>' + esc(f.label) + '</b> · M1 score ' + f.score + '<br>' + esc(m.text) + '</div>';
    }).join('') : '<div class="finding none"><b>No anomaly</b><br>' + esc(m.text) + '</div>';
    el.innerHTML =
      '<div class="result-h"><h3>Lane decision</h3><span class="pill ' + l + '">' + (l === 'high' ? 'FLAGGED' : l === 'mid' ? 'RE-SCAN' : 'CLEAR') + '</span></div>' +
      '<div class="score-big"><span class="n lvl-' + l + '">' + sc + '</span><span class="of">/ 100 fused risk</span></div>' +
      '<div class="meter"><i class="bg-' + l + '" style="width:' + sc + '%"></i></div>' +
      '<dl class="kv"><dt>Bag tag</dt><dd><b>' + b.tag + '</b></dd><dt>Lane</dt><dd>DXB ' + esc(b.lane) + '</dd><dt>Route</dt><dd>' + esc(b.route) + '</dd>' +
      '<dt>Pre-arrival</dt><dd>' + b.preScore + ' · ' + esc(b.preText) + '</dd><dt>M1 X-ray</dt><dd>' + m.m1 + '</dd></dl>' +
      fhtml +
      '<div class="decision ' + l + '"><span>' + decisionText(sc) + '</span>' +
      (L.caseId ? '<button class="btn primary" data-open-case="' + L.caseId + '">Open case ' + L.caseId + ' &rarr;</button>' : '') + '</div>';
  }

  function selectBag(i, done) {
    var b = NL.bags[i];
    S.bagIdx = i;
    S.lastLane = { bag: b, scanning: true };
    $('#laneTag').textContent = b.tag;
    renderBagStrip(); renderLaneResult();
    $('#latency').textContent = '…';
    NL.scanBag($('#xray'), b, {
      onDone: function (findings) {
        var m = NL.concealments[b.concealment];
        var tmp = { evidence: { pre: { score: b.preScore }, m1: { score: m.m1 } } };
        var fused = fuse(tmp).score;
        var caseId = null;
        S.stats.screened += 1;
        if (fused >= 60) {
          var c = caseByTag(b.tag);
          if (!c) {
            c = newCase({ tag: b.tag, site: b.site, lane: 'DXB ' + b.lane, route: b.route, preScore: b.preScore, preText: b.preText, m1: { score: m.m1, label: m.label, text: m.text } });
            S.stats.flags += 1;
            log('DXB', 'AI flag · ' + b.tag + ' · ' + m.label + ' (score ' + fused + ') → case ' + c.id, 'danger');
          }
          caseId = c.id;
          S.currentCase = c.id;
          S.bagStatus[b.tag] = 'flagged';
        } else {
          S.bagStatus[b.tag] = 'cleared';
          log('DXB', b.tag + ' cleared (score ' + fused + ')', 'ok');
        }
        $('#latency').textContent = (0.32 + ((b.seed * 7) % 17) / 100).toFixed(2) + ' s';
        S.lastLane = { bag: b, findings: findings, fused: fused, caseId: caseId };
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

  function renderLane() {
    renderBagStrip();
    renderLaneResult();
    if (S.bagIdx >= 0 && !$('#xray')._off) NL.scanBag($('#xray'), NL.bags[S.bagIdx], { fast: true });
    if (S.bagIdx < 0) drawIdleXray();
  }
  function drawIdleXray() {
    var cv = $('#xray'), ctx = cv.getContext('2d');
    ctx.fillStyle = '#1b1f24'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = '#8fa1b6'; ctx.font = '600 18px "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Waiting for next bag on the belt…', cv.width / 2, cv.height / 2);
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
      '<label class="muted small">Switch case <select id="caseSelect">' + opts + '</select></label>';

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

  function caseAction(act) {
    var c = current();
    if (!c) return;
    if (act === 'open') {
      if (!/Opened/.test(c.status)) {
        c.status = 'Opened · at inspection desk';
        addTimeline(c, 'OFFICER', 'Bag opened at inspection desk 2', 'Officer accepted the recommendation. Contents photographed with desk tablet.', '');
        log(c.site, c.id + ' opened at inspection desk', 'info');
      }
      go('desk');
    } else if (act === 'rescan') {
      addTimeline(c, 'OFFICER', 'Re-scan requested', 'Bag sent through second-angle scan.', '');
      renderCase();
    } else if (act === 'clear') {
      c.status = 'Cleared by officer';
      addTimeline(c, 'OFFICER', 'Cleared', 'Officer override recorded – used as feedback for model calibration.', 'ok');
      log(c.site, c.id + ' cleared by officer', 'ok');
      renderCase();
    } else if (act === 'seize') {
      c.status = 'Seized · lab confirmation pending';
      addTimeline(c, 'OFFICER', 'Seizure · sample sent to forensic lab', 'Chain of custody started. AI evidence pack (images, spectra, scores) attached.', 'danger');
      log(c.site, c.id + ' seized – sample to forensic lab', 'danger');
      renderCase();
    } else if (act === 'tolearn') {
      go('learn');
    }
  }

  // ---------------- M2 desk ----------------
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
    var el = $('#deskResult');
    if (!S.deskAnalysed) {
      el.innerHTML = '<div class="placeholder">Press <b>Analyse photo</b>. M2 detects pills, vials and packaging, reads imprints, and runs Arabic / English OCR on labels.</div>';
      return;
    }
    el.innerHTML =
      '<div class="result-h"><h3>M2 result</h3><span class="pill high">Evidence score ' + s.score + '</span></div>' +
      '<p><b>' + esc(s.summary) + '</b></p>' +
      '<ul class="det-list">' + s.detections.map(function (d) {
        return '<li><b>' + d.id + '</b> · ' + esc(d.label) + ' <span class="muted">(' + d.conf + '%)</span><div class="conf"><i style="width:' + d.conf + '%"></i></div></li>';
      }).join('') + '</ul>' +
      '<div class="ocr"><div class="muted small">OCR · label text</div>' + s.ocr.map(function (o) {
        return '<div><span class="lang">' + o.lang + '</span><span' + (o.rtl ? ' dir="rtl" lang="ar"' : '') + '>' + esc(o.text) + '</span></div>';
      }).join('') + '</div>' +
      '<div class="registry ' + (s.registry.ok ? 'pass' : 'fail') + '">' + esc(s.registry.text) + '</div>';
  }
  function analyseDesk() {
    return new Promise(function (resolve) {
      $('#deskResult').innerHTML = '<div class="placeholder"><span class="spinner"></span>Running detection, imprint matching and OCR&hellip;</div>';
      setTimeout(function () { S.deskAnalysed = true; renderDesk(); resolve(); }, 900);
    });
  }
  function attachDesk() {
    var c = current(), s = NL.deskSamples[S.deskSample];
    if (!c || !S.deskAnalysed) return;
    c.evidence.m2 = { score: s.score, text: s.summary };
    addTimeline(c, 'M2', s.summary + ' · score ' + s.score, s.registry.text.replace('✕ ', '') + '.', 'danger');
    log(c.site, c.id + ' · M2: ' + s.summary, 'danger');
    $('#deskAttach').textContent = 'Attached to ' + c.id + ' ✓';
    $('#deskAttach').disabled = true;
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
      }).join('') + '</ul>';
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
      R.illicit ? 'Identified through sealed inner pouch; ' + R.coverage + '% of tub contents. Spectra saved to evidence pack.' : 'Contents match benign library entries.', R.illicit ? 'danger' : 'ok');
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

  var RENDER = { dashboard: renderDashboard, lane: renderLane, 'case': renderCase, desk: renderDesk, hyper: renderHyper, predict: renderPredict, learn: renderLearn };

  // ---------------- demo runner ----------------
  function narrate(n, total, text) {
    $('#narration').hidden = false;
    $('#narrStep').textContent = n + ' / ' + total;
    $('#narrText').textContent = text;
  }
  function runDemo() {
    if (S.demo) { S.demo.stop = true; return; }
    var token = S.demo = { stop: false };
    $('#demoBtn').innerHTML = '&#9632; Stop demo';
    if (S.autoBelt) toggleAuto();
    var bagI = NL.bags.findIndex(function (b) { return b.demo; });
    var TOTAL = 8;
    function wait(ms) { return sleep(ms).then(function () { if (token.stop) throw new Error('stopped'); }); }
    function step(n, text, fn, ms) {
      return function () {
        if (token.stop) throw new Error('stopped');
        narrate(n, TOTAL, text);
        return Promise.resolve(fn && fn()).then(function () { return wait(ms); });
      };
    }
    Promise.resolve()
      .then(step(1, 'A bag on a high-risk transfer route reaches DXB Terminal 3. Before it lands, M5 has already given it a pre-arrival score of 52.', function () { go('lane'); }, 3200))
      .then(step(2, 'M1 reads the existing X-ray scan on the edge box and finds a dense block hidden inside a protein tub.', function () { return new Promise(function (res) { selectBag(bagI, res); }); }, 3600))
      .then(step(3, 'Fused score crosses the threshold, so a case opens. The officer sees exactly why: every factor is explained, and no nationality data is used.', function () { go('case'); }, 5200))
      .then(step(4, 'The officer opens the bag. M2 reads the label (Arabic + English), checks the registry and spots Captagon-style imprints.', function () {
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
      .then(function () {
        S.demo = null;
        $('#narration').hidden = true;
        $('#demoBtn').innerHTML = '&#9654; Run full demo';
      });
  }

  // ---------------- background activity ----------------
  var BG_EVENTS = [
    ['AUH', 'Bag cleared · Lane 2', 'ok'], ['JEA', 'Container scan cleared · Gantry 3', 'ok'], ['POST', 'Parcel cleared · Courier line 1', 'ok'],
    ['SHJ', 'Air-cargo pallet cleared', 'ok'], ['DWC', 'Bag cleared · Lane 1', 'ok'], ['KZP', 'Container scan cleared', 'ok'],
    ['POST', 'Parcel re-scan requested (score 51)', 'info'], ['AUH', 'AI flag · organic mass in shoe soles (score 68)', 'danger']
  ];
  function background() {
    S.stats.screened += 3 + Math.floor(Math.random() * 9);
    if (S.screen === 'dashboard') renderKpis();
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
    $('#overlayToggle').addEventListener('change', function () { NL.redrawXray($('#xray'), this.checked); });
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

    var start = (location.hash || '').replace('#', '');
    go(SCREENS[start] ? start : 'dashboard');
    setInterval(background, 2600);
  }

  NL.app = { go: go, runDemo: runDemo, state: S };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window.NL);
