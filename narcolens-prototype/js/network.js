/* NarcoLens – network analytics: link graph of cases tied together by sender, route pattern and
   concealment method; cluster detection, ranked insights and an interactive force-directed view. */
(function (NL) {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var AR = function () { return NL.i18n && NL.i18n.lang === 'ar'; };
  var W = 760, H = 460;
  var TYPES = {
    sender: { en: 'Sender / consignee', ar: 'المرسل / المستلم', color: '#f59e0b' },
    route: { en: 'Route pattern', ar: 'نمط المسار', color: '#60a5fa' },
    method: { en: 'Concealment method', ar: 'أسلوب الإخفاء', color: '#a78bfa' }
  };
  var METHODS = {
    'soaked-paper': ['Drug-soaked paper', 'ورق مشبع بالمخدرات'], 'lining': ['Suitcase lining', 'بطانة الحقيبة'],
    'false-bottom': ['False bottom', 'قاع مزيّف'], 'buttons': ['Dense buttons', 'أزرار كثيفة'], 'protein-tub': ['Protein tub', 'علبة بروتين'],
    'door-panels': ['Door panels', 'ألواح الأبواب'], 'vials': ['Vials', 'قوارير'], 'shoe-soles': ['Shoe soles', 'نعال الأحذية'], 'packet': ['Wrapped packet', 'عبوة ملفوفة']
  };
  var KIND = { Bag: ['bag', 'bags', 'حقيبة', 'حقائب'], Parcel: ['parcel', 'parcels', 'طرد', 'طرود'], Container: ['container', 'containers', 'حاوية', 'حاويات'] };
  var OUT = { seized: ['Seized', 'مضبوطة'], flagged: ['Flagged', 'مُنبَّه'], cleared: ['Cleared', 'مُجازة'] };
  var CONC_METHOD = { lining: ['lining'], protein: ['protein-tub'], buttons: ['buttons'], vials: ['vials'], 'false-bottom': ['false-bottom'], double: ['packet', 'buttons'], 'under-laptop': ['packet'], rotated: ['packet'] };
  var ITEM_METHOD = { packet: 'packet', lining: 'lining', tub: 'protein-tub', buttons: 'buttons', vials: 'vials', falsebottom: 'false-bottom' };

  var ST = { types: { sender: true, route: true, method: true }, window: 60, multi: false, sel: null, focus: null, pos: {}, view: { x: 0, y: 0, w: W, h: H } };
  NL.net = ST;

  function siteName(id) { var s = NL.site(id); return s ? (AR() && NL.AR && NL.AR[s.name] ? NL.AR[s.name] : s.name) : id; }
  function methodName(m) { return (METHODS[m] || [m, m])[AR() ? 1 : 0]; }
  function entLabel(t, id) { return t === 'method' ? methodName(id) : id; }

  // ---------- data: history + live cases ----------
  function liveCases() {
    var S = NL.state;
    return (S && S.cases || []).map(function (c) {
      var seed = NL.seedLinks[c.tag], bag = NL.bags.find(function (b) { return b.tag === c.tag; });
      var route = seed ? seed.route : ((c.route || '').match(/R-\d+/) || [null])[0];
      var methods = seed ? [seed.method] : bag ? (CONC_METHOD[bag.concealment] || []) : [];
      if (!methods.length && c.scene) c.scene.items.forEach(function (it) { if (ITEM_METHOD[it.type] && methods.indexOf(ITEM_METHOD[it.type]) < 0) methods.push(ITEM_METHOD[it.type]); });
      if (!methods.length && c.kind === 'Container') methods = ['door-panels'];
      var st = c.status || '';
      return { id: c.id, tag: c.tag, kind: c.kind || 'Bag', site: c.site, days: 0, sender: seed ? seed.sender : null, route: route, methods: methods,
        outcome: /Seiz|confirmed/.test(st) ? 'seized' : /Cleared/.test(st) ? 'cleared' : 'flagged', live: true };
    });
  }
  function allCases() {
    return NL.history.map(function (h) { return { id: h.id, kind: h.kind, site: h.site, days: h.days, sender: h.sender || null, route: h.route, methods: [h.method], outcome: h.outcome, live: false }; })
      .concat(liveCases());
  }

  // ---------- graph ----------
  function build() {
    var cases = allCases().filter(function (c) { return c.days <= ST.window; });
    var ents = {};
    function link(c, t, id) { if (!id || !ST.types[t]) return; var k = t + ':' + id; (ents[k] = ents[k] || { key: k, type: t, id: id, cases: [] }).cases.push(c); }
    cases.forEach(function (c) { link(c, 'sender', c.sender); link(c, 'route', c.route); c.methods.forEach(function (m) { link(c, 'method', m); }); });
    // keep only entities that actually tie 2+ cases together
    var E = Object.keys(ents).map(function (k) { return ents[k]; }).filter(function (e) { return e.cases.length >= 2; });
    // clusters via union-find
    var parent = {};
    function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
    cases.forEach(function (c) { parent[c.id] = c.id; });
    E.forEach(function (e) { for (var i = 1; i < e.cases.length; i++) parent[find(e.cases[i].id)] = find(e.cases[0].id); });
    var groups = {};
    cases.forEach(function (c) { var r = find(c.id); (groups[r] = groups[r] || []).push(c); });
    var clusters = Object.keys(groups).map(function (k) { return groups[k]; }).filter(function (g) { return g.length >= 2; });
    var multi = clusters.filter(function (g) { return uniq(g.map(function (c) { return c.site; })).length >= 2; });
    if (ST.multi) {
      var keep = {}; multi.forEach(function (g) { g.forEach(function (c) { keep[c.id] = 1; }); });
      cases = cases.filter(function (c) { return keep[c.id]; });
      E = E.filter(function (e) { e.cases = e.cases.filter(function (c) { return keep[c.id]; }); return e.cases.length >= 2; });
    }
    var edges = [];
    E.forEach(function (e) { e.cases.forEach(function (c) { edges.push({ a: e.key, b: c.id, type: e.type }); }); });
    return { cases: cases, ents: E, edges: edges, clusters: clusters, multi: multi };
  }
  function uniq(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); }

  // ---------- insights ----------
  function insights(G) {
    var ar = AR();
    return G.ents.map(function (e) {
      var n = e.cases.length, sites = uniq(e.cases.map(function (c) { return c.site; })), seized = e.cases.filter(function (c) { return c.outcome === 'seized'; }).length;
      var days = e.cases.map(function (c) { return c.days; }), span = Math.max.apply(null, days) - Math.min.apply(null, days) + 1;
      var kinds = uniq(e.cases.map(function (c) { return c.kind; })), K = KIND[kinds.length === 1 ? kinds[0] : 'Bag'];
      var noun = kinds.length === 1 ? (n === 1 ? K[ar ? 2 : 0] : K[ar ? 3 : 1]) : (ar ? 'قضايا' : 'cases');
      var siteTxt = sites.map(siteName).join(ar ? '، ' : ', ');
      var txt, sub;
      if (e.type === 'sender') {
        txt = ar ? n + ' ' + noun + ' من المرسل نفسه ' + e.id + ' عبر ' + sites.length + (sites.length > 1 ? ' مواقع' : ' موقع') + ' خلال ' + span + ' يوماً'
          : n + ' ' + noun + ' from the same sender ' + e.id + ' across ' + sites.length + ' site' + (sites.length > 1 ? 's' : '') + ' in ' + span + ' days';
      } else if (e.type === 'route') {
        txt = ar ? 'نمط المسار ' + e.id + ' يربط ' + n + ' ' + noun + ' في ' + siteTxt : 'Route pattern ' + e.id + ' links ' + n + ' ' + noun + ' at ' + siteTxt;
      } else {
        txt = ar ? 'أسلوب «' + methodName(e.id) + '» ظهر في ' + sites.length + (sites.length > 1 ? ' مواقع' : ' موقع') + ' خلال ' + span + ' يوماً (' + n + ' قضايا)'
          : '“' + methodName(e.id) + '” concealment seen at ' + sites.length + ' site' + (sites.length > 1 ? 's' : '') + ' in ' + span + ' days (' + n + ' cases)';
      }
      sub = ar ? seized + ' مضبوطة · ' + siteTxt : seized + ' seized · ' + siteTxt;
      var live = e.cases.some(function (c) { return c.live; });
      var score = n * sites.length * (0.5 + seized / n) * (e.type === 'sender' ? 1.4 : e.type === 'route' ? 1.15 : 1) * (live ? 1.2 : 1);
      return { ent: e, text: txt, sub: sub, score: score, live: live, n: n, sites: sites.length, seized: seized };
    }).sort(function (a, b) { return b.score - a.score; });
  }

  // ---------- layout ----------
  function layout(G) {
    var nodes = G.ents.map(function (e) { return { id: e.key, ent: e }; }).concat(G.cases.map(function (c) { return { id: c.id, c: c }; }));
    var idx = {}; nodes.forEach(function (n, i) { idx[n.id] = i; });
    var r = NL.rng(7);
    nodes.forEach(function (n, i) {
      var p = ST.pos[n.id];
      if (p) { n.x = p.x; n.y = p.y; }
      else if (n.ent) { var a = i / Math.max(1, G.ents.length) * Math.PI * 2; n.x = W / 2 + Math.cos(a) * 170; n.y = H / 2 + Math.sin(a) * 140; }
      else {
        var linked = G.edges.filter(function (e) { return e.b === n.id; }).map(function (e) { return ST.pos[e.a] || null; }).filter(Boolean);
        n.x = linked.length ? linked[0].x + (r() - 0.5) * 60 : 40 + r() * (W - 80); n.y = linked.length ? linked[0].y + (r() - 0.5) * 60 : 40 + r() * (H - 80);
      }
      n.vx = 0; n.vy = 0;
    });
    var E = G.edges.map(function (e) { return [idx[e.a], idx[e.b]]; });
    for (var it = 0; it < 320; it++) {
      var cool = 1 - it / 320;
      for (var i = 0; i < nodes.length; i++) for (var j = i + 1; j < nodes.length; j++) {
        var a = nodes[i], b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy + 0.01, f = 1400 / d2;
        if (d2 > 90000) continue;
        var d = Math.sqrt(d2); dx /= d; dy /= d;
        a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
      }
      E.forEach(function (e) {
        var a = nodes[e[0]], b = nodes[e[1]], dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1, f = (d - 62) * 0.035;
        dx /= d; dy /= d; a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
      });
      nodes.forEach(function (n) {
        n.vx += (W / 2 - n.x) * 0.004; n.vy += (H / 2 - n.y) * 0.006;
        var step = 6 * cool + 0.5;
        n.vx = Math.max(-step, Math.min(step, n.vx)); n.vy = Math.max(-step, Math.min(step, n.vy));
        n.x = Math.max(24, Math.min(W - 24, n.x + n.vx)); n.y = Math.max(22, Math.min(H - 22, n.y + n.vy));
        n.vx *= 0.6; n.vy *= 0.6;
      });
    }
    nodes.forEach(function (n) { ST.pos[n.id] = { x: n.x, y: n.y }; });
    return nodes;
  }

  // ---------- render ----------
  var G = null, NODES = null;
  function shape(n) {
    var p = ST.pos[n.id], deg = n.ent ? n.ent.cases.length : 1;
    if (n.c) {
      var col = { seized: '#ef4444', flagged: '#f59e0b', cleared: '#22c55e' }[n.c.outcome];
      return '<circle class="nd-shape" r="7.5" fill="' + col + '"/>' + (n.c.live ? '<circle class="nd-live" r="11.5"/>' : '');
    }
    var s = 9 + Math.min(8, deg * 1.6), c = TYPES[n.ent.type].color;
    if (n.ent.type === 'sender') return '<rect class="nd-shape" x="' + -s + '" y="' + -s + '" width="' + 2 * s + '" height="' + 2 * s + '" rx="5" fill="' + c + '"/>';
    if (n.ent.type === 'route') return '<path class="nd-shape" d="M0,' + -s * 1.25 + 'L' + s * 1.25 + ',0L0,' + s * 1.25 + 'L' + -s * 1.25 + ',0Z" fill="' + c + '"/>';
    return '<path class="nd-shape" d="M0,' + -s * 1.2 + 'L' + s * 1.15 + ',' + s * 0.85 + 'L' + -s * 1.15 + ',' + s * 0.85 + 'Z" fill="' + c + '"/>';
  }
  function draw() {
    var svg = $('#netSvg'), h = '';
    G.edges.forEach(function (e, i) {
      var a = ST.pos[e.a], b = ST.pos[e.b];
      h += '<line class="ed ed-' + e.type + '" data-a="' + e.a + '" data-b="' + e.b + '" x1="' + a.x.toFixed(1) + '" y1="' + a.y.toFixed(1) + '" x2="' + b.x.toFixed(1) + '" y2="' + b.y.toFixed(1) + '"/>';
    });
    NODES.forEach(function (n) {
      var p = ST.pos[n.id], ar = AR();
      var title = n.c ? n.c.id + ' · ' + KIND[n.c.kind][ar ? 2 : 0] + ' · ' + siteName(n.c.site) + ' · ' + OUT[n.c.outcome][ar ? 1 : 0]
        : TYPES[n.ent.type][ar ? 'ar' : 'en'] + ': ' + entLabel(n.ent.type, n.ent.id) + ' (' + n.ent.cases.length + ')';
      h += '<g class="nd ' + (n.ent ? 'nd-ent nd-' + n.ent.type : 'nd-case') + '" data-id="' + n.id + '" transform="translate(' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ')" tabindex="0" role="button">' +
        '<title>' + title + '</title>' + shape(n) +
        '<text class="nd-lbl" y="' + (n.ent ? -18 - Math.min(8, n.ent.cases.length * 1.6) * 0.3 : 20) + '" text-anchor="middle">' + (n.ent ? entLabel(n.ent.type, n.ent.id) : n.c.id) + '</text></g>';
    });
    svg.innerHTML = h;
    applyView();
    highlight(ST.sel || ST.focus);
  }
  function neighbours(id) {
    var set = {}; set[id] = 1;
    G.edges.forEach(function (e) { if (e.a === id) set[e.b] = 1; if (e.b === id) set[e.a] = 1; });
    return set;
  }
  function highlight(id) {
    var svg = $('#netSvg');
    if (!svg) return;
    if (!id) { svg.classList.remove('dim'); svg.querySelectorAll('.hl').forEach(function (x) { x.classList.remove('hl'); }); return; }
    var set = neighbours(id);
    svg.classList.add('dim');
    svg.querySelectorAll('.nd').forEach(function (g) { g.classList.toggle('hl', !!set[g.dataset.id]); g.classList.toggle('sel', g.dataset.id === id); });
    svg.querySelectorAll('.ed').forEach(function (l) { l.classList.toggle('hl', (l.dataset.a === id || l.dataset.b === id)); });
  }
  function applyView() {
    var v = ST.view, svg = $('#netSvg');
    svg.setAttribute('viewBox', v.x.toFixed(1) + ' ' + v.y.toFixed(1) + ' ' + v.w.toFixed(1) + ' ' + v.h.toFixed(1));
    svg.style.setProperty('--k', (v.w / W).toFixed(3)); // keep labels and strokes a constant on-screen size when zoomed
  }
  function zoomTo(ids) {
    var xs = [], ys = [];
    ids.forEach(function (id) { var p = ST.pos[id]; if (p) { xs.push(p.x); ys.push(p.y); } });
    if (!xs.length) return;
    var x0 = Math.min.apply(null, xs) - 60, x1 = Math.max.apply(null, xs) + 60, y0 = Math.min.apply(null, ys) - 50, y1 = Math.max.apply(null, ys) + 50;
    var w = Math.max(x1 - x0, 260), h = w * H / W;
    if (y1 - y0 > h) { h = y1 - y0; w = h * W / H; }
    animate({ x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w: w, h: h });
  }
  function animate(to) {
    var from = { x: ST.view.x, y: ST.view.y, w: ST.view.w, h: ST.view.h }, t0 = performance.now();
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    (function f(now) {
      var p = reduce ? 1 : Math.min(1, (now - t0) / 550), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      ['x', 'y', 'w', 'h'].forEach(function (k) { ST.view[k] = from[k] + (to[k] - from[k]) * e; });
      applyView();
      if (p < 1) requestAnimationFrame(f);
    })(t0);
  }

  // ---------- panels ----------
  function L(en, ar) { return AR() ? ar : en; }
  function renderToolbar() {
    $('#netToolbar').innerHTML =
      '<span class="nt-lbl">' + L('Link by', 'الربط حسب') + '</span>' +
      Object.keys(TYPES).map(function (t) { return '<label class="nt-chip" style="--c:' + TYPES[t].color + '"><input type="checkbox" data-type="' + t + '"' + (ST.types[t] ? ' checked' : '') + '><i></i>' + TYPES[t][AR() ? 'ar' : 'en'] + '</label>'; }).join('') +
      '<span class="nt-lbl">' + L('Window', 'الفترة') + '</span><span class="seg">' + [7, 30, 60].map(function (d) { return '<button type="button" data-win="' + d + '" class="' + (ST.window === d ? 'on' : '') + '">' + d + L(' days', ' يوماً') + '</button>'; }).join('') + '</span>' +
      '<label class="nt-chip"><input type="checkbox" id="netMulti"' + (ST.multi ? ' checked' : '') + '><i></i>' + L('Multi-site clusters only', 'المجموعات متعددة المواقع فقط') + '</label>' +
      '<button type="button" class="btn" id="netReset">' + L('Reset view', 'إعادة العرض') + '</button>';
    $('#netLegend').innerHTML =
      '<span><i class="lg lg-seized"></i>' + L('Seized', 'مضبوطة') + '</span><span><i class="lg lg-flagged"></i>' + L('Flagged', 'مُنبَّه') + '</span><span><i class="lg lg-cleared"></i>' + L('Cleared', 'مُجازة') + '</span>' +
      '<span><i class="lg lg-live"></i>' + L('Live case (today)', 'قضية مباشرة (اليوم)') + '</span>' +
      '<span><i class="lg lg-sender"></i>' + TYPES.sender[AR() ? 'ar' : 'en'] + '</span><span><i class="lg lg-route"></i>' + TYPES.route[AR() ? 'ar' : 'en'] + '</span><span><i class="lg lg-method"></i>' + TYPES.method[AR() ? 'ar' : 'en'] + '</span>';
  }
  function renderKpis() {
    var linkedSeized = 0, seen = {};
    G.clusters.forEach(function (g) { g.forEach(function (c) { if (c.outcome === 'seized' && !seen[c.id]) { seen[c.id] = 1; linkedSeized++; } }); });
    $('#netKpis').innerHTML =
      '<div class="kpi"><div class="lbl">' + L('Linked clusters', 'المجموعات المترابطة') + '</div><div class="val">' + G.clusters.length + '</div><div class="sub">' + L('groups of 2+ related cases', 'مجموعات من قضيتين مترابطتين أو أكثر') + '</div></div>' +
      '<div class="kpi"><div class="lbl">' + L('Multi-site clusters', 'مجموعات متعددة المواقع') + '</div><div class="val">' + G.multi.length + '</div><div class="sub">' + L('span 2+ entry points', 'تمتد عبر منفذين أو أكثر') + '</div></div>' +
      '<div class="kpi"><div class="lbl">' + L('Linked seizures', 'الضبطيات المترابطة') + '</div><div class="val">' + linkedSeized + '</div><div class="sub">' + L('of ', 'من ') + G.cases.length + L(' cases in the last ', ' قضية خلال آخر ') + ST.window + L(' days', ' يوماً') + '</div></div>';
  }
  var INS = [];
  function renderInsights() {
    INS = insights(G);
    $('#netInsights').innerHTML =
      '<div class="result-h"><h3>' + L('Insights', 'الاستنتاجات') + '</h3><span class="badge algo">' + L('Auto-generated', 'مُولّدة تلقائياً') + '</span></div>' +
      (INS.length ? '<ol class="ins-list">' + INS.slice(0, 7).map(function (x, i) {
        return '<li><button type="button" class="ins ins-' + x.ent.type + (ST.focus === x.ent.key ? ' on' : '') + '" data-ins="' + i + '"><i style="background:' + TYPES[x.ent.type].color + '"></i><span><b>' + x.text + '</b><small>' + x.sub + (x.live ? ' · <em>' + L('includes a live case', 'تشمل قضية مباشرة') + '</em>' : '') + '</small></span></button></li>';
      }).join('') + '</ol>' : '<p class="muted">' + L('No links in this window. Widen the time window or enable more link types.', 'لا توجد روابط في هذه الفترة. وسّع الفترة أو فعّل أنواع ربط أكثر.') + '</p>') +
      '<p class="net-note">' + L('Links are investigative leads, not evidence. Senders are pseudonymous account IDs; passenger bags carry no sender; nationality is never used.', 'الروابط خيوط تحقيق وليست أدلة. المرسلون معرّفات حسابات مستعارة، ولا مرسل لحقائب المسافرين، ولا تُستخدم الجنسية أبداً.') + '</p>';
  }
  function renderDetail(id) {
    var el = $('#netDetail');
    if (!id) { el.innerHTML = '<p class="muted small">' + L('Click a node or an insight to inspect it. Drag nodes to rearrange.', 'انقر على عقدة أو استنتاج لفحصه. اسحب العقد لإعادة ترتيبها.') + '</p>'; return; }
    var n = NODES.find(function (x) { return x.id === id; });
    if (!n) return renderDetail(null);
    if (n.c) {
      var c = n.c, links = G.edges.filter(function (e) { return e.b === c.id; }).map(function (e) { var en = G.ents.find(function (x) { return x.key === e.a; }); return TYPES[en.type][AR() ? 'ar' : 'en'] + ': ' + entLabel(en.type, en.id); });
      el.innerHTML = '<div class="nd-card"><b>' + c.id + (c.tag ? ' · ' + c.tag : '') + '</b><span class="pill ' + ({ seized: 'high', flagged: 'mid', cleared: 'low' })[c.outcome] + '">' + OUT[c.outcome][AR() ? 1 : 0] + '</span>' +
        '<small>' + KIND[c.kind][AR() ? 2 : 0] + ' · ' + siteName(c.site) + ' · ' + (c.days ? (AR() ? 'قبل ' + c.days + ' يوماً' : c.days + ' days ago') : L('today', 'اليوم')) + (c.methods.length ? ' · ' + c.methods.map(methodName).join(', ') : '') + '</small>' +
        '<small>' + (links.length ? L('Linked by ', 'مرتبطة عبر ') + links.join(' · ') : L('No links in this view', 'لا روابط في هذا العرض')) + '</small>' +
        (c.live ? '<button class="btn primary" type="button" data-open="' + c.id + '">' + L('Open case', 'فتح القضية') + ' ' + c.id + '</button>' : '') + '</div>';
    } else {
      var e = n.ent;
      el.innerHTML = '<div class="nd-card"><b>' + TYPES[e.type][AR() ? 'ar' : 'en'] + ': ' + entLabel(e.type, e.id) + '</b>' +
        '<small>' + e.cases.length + L(' linked cases', ' قضايا مرتبطة') + '</small><div class="nd-cases">' +
        e.cases.map(function (c) { return '<button type="button" data-node="' + c.id + '" class="pill ' + ({ seized: 'high', flagged: 'mid', cleared: 'low' })[c.outcome] + '">' + c.id + ' · ' + siteName(c.site) + '</button>'; }).join('') + '</div></div>';
    }
  }

  // ---------- public ----------
  NL.netRender = function () {
    G = build(); NODES = layout(G);
    renderToolbar(); renderKpis(); renderInsights(); draw();
    renderDetail(ST.sel || ST.focus);
  };
  NL.netFocusCase = function (caseId) { ST.sel = caseId; ST.focus = null; ST.pendingZoom = caseId; };
  NL.netLinks = function (caseId) {
    var g = build(), c = g.cases.find(function (x) { return x.id === caseId; });
    if (!c) return null;
    var via = g.ents.filter(function (e) { return e.cases.some(function (x) { return x.id === caseId; }); });
    var others = {}; via.forEach(function (e) { e.cases.forEach(function (x) { if (x.id !== caseId) others[x.id] = 1; }); });
    return { n: Object.keys(others).length, via: via };
  };
  NL.netChip = function (caseId) {
    var r = NL.netLinks(caseId);
    if (!r || !r.n) return '';
    var v = r.via[0], what = v.type === 'sender' ? L('same sender ', 'المرسل نفسه ') + v.id : v.type === 'route' ? L('same route ', 'المسار نفسه ') + v.id : L('same method: ', 'الأسلوب نفسه: ') + methodName(v.id);
    return '<button type="button" class="link-chip" data-noi18n data-netcase="' + caseId + '">⛓ ' + r.n + L(' linked case' + (r.n > 1 ? 's' : ''), ' قضايا مرتبطة') + ' · ' + what + (r.via.length > 1 ? ' +' + (r.via.length - 1) : '') + ' →</button>';
  };
  NL.netTopInsight = function () {
    var g = build(), ins = insights(g);
    if (!ins.length) return '';
    return '<button type="button" class="net-tip" data-noi18n data-go-net="1"><span class="badge algo">' + L('Network', 'الشبكة') + '</span> ' + ins[0].text + ' →</button>';
  };

  function init() {
    var svg = $('#netSvg'), drag = null;
    function pt(e) { var r = svg.getBoundingClientRect(), v = ST.view; return { x: v.x + (e.clientX - r.left) / r.width * v.w, y: v.y + (e.clientY - r.top) / r.height * v.h }; }
    svg.addEventListener('pointerdown', function (e) {
      var g = e.target.closest('.nd'); if (!g) return;
      drag = { id: g.dataset.id, moved: false, p0: pt(e) }; svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove', function (e) {
      if (drag) {
        var p = pt(e);
        if (!drag.moved && Math.hypot(p.x - drag.p0.x, p.y - drag.p0.y) < 3) return;
        drag.moved = true; ST.pos[drag.id] = { x: p.x, y: p.y };
        var g = svg.querySelector('.nd[data-id="' + CSS.escape(drag.id) + '"]'); if (g) g.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ')');
        svg.querySelectorAll('.ed').forEach(function (l) {
          if (l.dataset.a === drag.id) { l.setAttribute('x1', p.x); l.setAttribute('y1', p.y); }
          if (l.dataset.b === drag.id) { l.setAttribute('x2', p.x); l.setAttribute('y2', p.y); }
        });
        return;
      }
      if (ST.sel || ST.focus) return;
      var h = e.target.closest('.nd'); highlight(h ? h.dataset.id : null);
    });
    svg.addEventListener('pointerup', function (e) {
      if (drag && !drag.moved) { ST.sel = ST.sel === drag.id ? null : drag.id; ST.focus = null; highlight(ST.sel); renderDetail(ST.sel); renderInsights(); }
      drag = null;
    });
    svg.addEventListener('pointerleave', function () { if (!ST.sel && !ST.focus) highlight(null); });
    svg.addEventListener('keydown', function (e) { var g = e.target.closest('.nd'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); ST.sel = g.dataset.id; highlight(ST.sel); renderDetail(ST.sel); } });
    $('#netToolbar').addEventListener('change', function (e) {
      if (e.target.dataset.type) ST.types[e.target.dataset.type] = e.target.checked;
      if (e.target.id === 'netMulti') ST.multi = e.target.checked;
      ST.focus = null; NL.netRender();
    });
    $('#netToolbar').addEventListener('click', function (e) {
      var b = e.target.closest('[data-win]'); if (b) { ST.window = +b.dataset.win; ST.focus = null; NL.netRender(); }
      if (e.target.id === 'netReset') { ST.sel = null; ST.focus = null; ST.pos = {}; ST.view = { x: 0, y: 0, w: W, h: H }; NL.netRender(); }
    });
    $('#netInsights').addEventListener('click', function (e) {
      var b = e.target.closest('[data-ins]'); if (!b) return;
      var x = INS[+b.dataset.ins]; ST.focus = ST.focus === x.ent.key ? null : x.ent.key; ST.sel = null;
      highlight(ST.focus); renderDetail(ST.focus); renderInsights();
      if (ST.focus) zoomTo([x.ent.key].concat(x.ent.cases.map(function (c) { return c.id; }))); else animate({ x: 0, y: 0, w: W, h: H });
    });
    $('#netDetail').addEventListener('click', function (e) {
      var o = e.target.closest('[data-open]'); if (o) { NL.state.currentCase = o.dataset.open; NL.app.go('case'); return; }
      var n = e.target.closest('[data-node]'); if (n) { ST.sel = n.dataset.node; ST.focus = null; highlight(ST.sel); renderDetail(ST.sel); zoomTo(Object.keys(neighbours(ST.sel))); }
    });
    document.addEventListener('click', function (e) {
      var c = e.target.closest('[data-netcase]'); if (c) { NL.netFocusCase(c.dataset.netcase); NL.app.go('network'); return; }
      if (e.target.closest('[data-go-net]')) NL.app.go('network');
    });
  }
  NL.netAfterRender = function () {
    if (ST.pendingZoom) { var id = ST.pendingZoom; ST.pendingZoom = null; if (ST.pos[id]) zoomTo(Object.keys(neighbours(id))); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window.NL);
