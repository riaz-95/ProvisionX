/* NarcoLens – interactive federated-learning simulator (Learning Loop screen).
   Sites train locally and send only encrypted model updates; the core aggregates them robustly
   and pushes a new version to every site that is online. Everything here is an illustration. */
(function (NL) {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var AR = function () { return NL.i18n && NL.i18n.lang === 'ar'; };
  var L = function (en, ar) { return AR() ? ar : en; };
  var CORE = { x: 300, y: 180 }, NS = 'http://www.w3.org/2000/svg';
  var PRIV = { low: { f: 1, eps: 8, en: 'Low', ar: 'منخفضة' }, medium: { f: 0.8, eps: 3, en: 'Medium', ar: 'متوسطة' }, high: { f: 0.55, eps: 1, en: 'High', ar: 'عالية' } };
  var STEPS = [['Lab confirms', 'تأكيد المختبر'], ['Local training', 'تدريب محلي'], ['Encrypted Δ → core', 'Δ مشفّرة ← النواة'], ['Robust aggregation', 'تجميع متين'], ['Deploy new model', 'نشر النموذج الجديد']];
  var LOCAL = { DXB: 41, SHJ: 12, POST: 27, DWC: 9, JEA: 14, KZP: 8, AUH: 23 };

  var F = NL.fed = { round: null, rounds: 0, history: [], log: [], privacy: 'medium', poison: false, auto: false, busy: false, sel: null, step: -1, pending: null, done: null, sites: {} };

  function model() { return NL.state.model; }
  function ver(v) { return 'v' + v.join('.'); }
  function siteName(s) { return AR() && NL.AR && NL.AR[s.name] ? NL.AR[s.name] : s.name; }
  function initSites() {
    NL.sites.forEach(function (s) {
      if (!F.sites[s.id]) F.sites[s.id] = { online: true, v: model().v.slice(), local: LOCAL[s.id] || 10, ready: false, lastSync: null, kb: 110 + (s.id.charCodeAt(0) * 7 + s.id.length * 13) % 40 };
    });
    if (!F.history.length) F.history.push({ r: 0, recall: model().recall, far: model().far });
  }
  function pos(i) { var a = -Math.PI / 2 + i * 2 * Math.PI / NL.sites.length; return { x: CORE.x + Math.cos(a) * 150, y: CORE.y + Math.sin(a) * 138 }; }
  function gainPerRound(nAccepted, nReady) {
    var m = model(), head = Math.max(0.15, 1 - (m.recall - 88) / 12);
    return 0.5 * (nAccepted / NL.sites.length) * PRIV[F.privacy].f * head * (1 + 0.25 * nReady);
  }
  function upToDate(id) { return F.sites[id].v.join('.') === model().v.join('.'); }

  // ---------- rendering ----------
  function drawNet() {
    var svg = $('#fedNet'), h = '';
    NL.sites.forEach(function (s, i) { var p = pos(i), st = F.sites[s.id]; h += '<line class="link' + (st.online ? '' : ' off') + '" x1="' + CORE.x + '" y1="' + CORE.y + '" x2="' + p.x + '" y2="' + p.y + '"/>'; });
    NL.sites.forEach(function (s, i) {
      var p = pos(i), st = F.sites[s.id], below = p.y > CORE.y + 20, cls = 'fnode' + (st.online ? '' : ' off') + (upToDate(s.id) ? '' : ' stale') + (st.ready ? ' ready' : '') + (F.sel === s.id ? ' sel' : '');
      h += '<g class="' + cls + '" data-site="' + s.id + '" tabindex="0" role="button" aria-label="' + siteName(s) + '"><title>' + siteName(s) + '</title>' +
        '<circle class="fn-ring" cx="' + p.x + '" cy="' + p.y + '" r="24"/><circle class="node" cx="' + p.x + '" cy="' + p.y + '" r="16"/>' +
        '<text class="fn-ver" x="' + p.x + '" y="' + (p.y + 3.5) + '" text-anchor="middle">' + st.v[2] + '</text>' +
        '<text class="site-lbl" x="' + p.x + '" y="' + (below ? p.y + 36 : p.y - 28) + '" text-anchor="middle">' + siteName(s) + '</text></g>';
    });
    h += '<g class="fcore' + (F.sel === 'core' ? ' sel' : '') + '" data-site="core" tabindex="0" role="button"><circle class="core" cx="' + CORE.x + '" cy="' + CORE.y + '" r="42"/>' +
      '<text class="core-lbl" x="' + CORE.x + '" y="' + (CORE.y - 4) + '" text-anchor="middle">NarcoLens</text>' +
      '<text class="core-lbl sm" x="' + CORE.x + '" y="' + (CORE.y + 12) + '" text-anchor="middle">' + L('core', 'النواة') + ' · ' + ver(model().v) + '</text></g><g id="packets"></g>';
    svg.innerHTML = h;
  }
  function drawControls() {
    var lab = !!F.pending;
    $('#learnGo').innerHTML = lab ? L('Lab confirms → retrain network', 'المختبر يؤكد ← إعادة تدريب الشبكة') : L('▶ Run 1 round', '▶ تشغيل جولة واحدة');
    $('#learnGo').disabled = F.busy;
    $('#fedAuto').innerHTML = F.auto ? L('⏸ Pause auto-run', '⏸ إيقاف التشغيل الآلي') : L('⟳ Auto-run rounds', '⟳ تشغيل جولات آلياً');
    $('#fedAuto').classList.toggle('on', F.auto);
    $('#fedPriv').innerHTML = '<span class="nt-lbl">' + L('Privacy', 'الخصوصية') + '</span><span class="seg">' + Object.keys(PRIV).map(function (k) {
      return '<button type="button" data-priv="' + k + '" class="' + (F.privacy === k ? 'on' : '') + '" title="ε = ' + PRIV[k].eps + '">' + PRIV[k][AR() ? 'ar' : 'en'] + '</button>';
    }).join('') + '</span>';
    drawInfo();
    $('#fedPoisonLbl').textContent = L('Simulate a poisoned update', 'محاكاة تحديث مسموم');
    $('#fedPoison').checked = F.poison;
    var online = NL.sites.filter(function (s) { return F.sites[s.id].online; }).length, ready = NL.sites.filter(function (s) { return F.sites[s.id].ready && F.sites[s.id].online; }).length;
    $('#fedGain').innerHTML = L('Expected gain next round: ', 'المكسب المتوقع للجولة القادمة: ') + '<b>+' + gainPerRound(online - (F.poison && online ? 1 : 0), ready).toFixed(2) + L(' pts recall', ' نقطة استدعاء') + '</b> · ε = ' + PRIV[F.privacy].eps +
      ' · ' + online + '/' + NL.sites.length + L(' sites online', ' مواقع متصلة');
    $('#fedSteps').innerHTML = STEPS.map(function (s, i) { return '<span class="fs' + (i < F.step ? ' done' : i === F.step ? ' on' : '') + '">' + (i + 1) + '. ' + s[AR() ? 1 : 0] + '</span>'; }).join('<i>›</i>');
  }
  function drawKpis() {
    var m = model(), stale = NL.sites.filter(function (s) { return !upToDate(s.id); }).length, h0 = F.history[0];
    $('#fedKpis').innerHTML =
      '<div class="kpi"><div class="lbl">' + L('Global model', 'النموذج العام') + '</div><div class="val">' + ver(m.v) + '</div><div class="sub">' + F.rounds + L(' federated rounds this session', ' جولات اتحادية في هذه الجلسة') + '</div></div>' +
      '<div class="kpi"><div class="lbl">' + L('Detection recall', 'استدعاء الكشف') + '</div><div class="val">' + m.recall.toFixed(1) + '%</div><div class="sub"><b>+' + (m.recall - h0.recall).toFixed(1) + '</b> ' + L('since start · false alarms ', 'منذ البداية · الإنذارات الكاذبة ') + m.far.toFixed(1) + '%</div></div>' +
      '<div class="kpi"><div class="lbl">' + L('Sites up to date', 'المواقع المحدّثة') + '</div><div class="val">' + (NL.sites.length - stale) + ' / ' + NL.sites.length + '</div><div class="sub">' + L('raw images shared: ', 'الصور الخام المشتركة: ') + '<b>0</b></div></div>';
  }
  function drawSiteCard() {
    var el = $('#fedSite');
    if (!F.sel) { el.innerHTML = '<p class="muted small">' + L('Click a site to inspect it, train it locally or take it offline. Click the core to see how updates are combined.', 'انقر على موقع لفحصه أو تدريبه محلياً أو فصله. انقر على النواة لمعرفة كيفية دمج التحديثات.') + '</p>'; return; }
    if (F.sel === 'core') {
      el.innerHTML = '<div class="nd-card"><b>' + L('NarcoLens core · on-prem', 'نواة NarcoLens · محلية') + '</b>' +
        '<small>' + L('Combines encrypted model updates with a robust median: an update far from the others is rejected before it can poison the model.', 'تدمج تحديثات النموذج المشفّرة بوسيط متين: يُرفض أي تحديث بعيد عن البقية قبل أن يُفسد النموذج.') + '</small>' +
        '<small>' + L('Stores: model versions and audit log. Never stores: scans, photos or passenger data.', 'تخزّن: إصدارات النموذج وسجل التدقيق. لا تخزّن أبداً: الصور أو بيانات المسافرين.') + '</small></div>';
      return;
    }
    var s = NL.site(F.sel), st = F.sites[F.sel], m = model(), uptd = upToDate(F.sel);
    el.innerHTML = '<div class="nd-card"><b>' + siteName(s) + '</b>' +
      '<span class="pill ' + (st.online ? (uptd ? 'low' : 'mid') : 'high') + '">' + (st.online ? (uptd ? L('Online · up to date', 'متصل · محدّث') : L('Online · out of date', 'متصل · غير محدّث')) : L('Offline', 'غير متصل')) + '</span>' +
      '<div class="sc-stats"><div><small>' + L('Local model', 'النموذج المحلي') + '</small><b>' + ver(st.v) + '</b></div><div><small>' + L('Confirmed cases', 'قضايا مؤكدة') + '</small><b>' + st.local + '</b></div><div><small>' + L('Update size', 'حجم التحديث') + '</small><b>' + st.kb + ' KB</b></div></div>' +
      '<small>' + L('Last sync: ', 'آخر مزامنة: ') + (st.lastSync || L('before this session', 'قبل هذه الجلسة')) + ' · ' + L('raw images shared: 0', 'الصور الخام المشتركة: 0') + (st.ready ? ' · <b class="lvl-low">' + L('fresh local update ready', 'تحديث محلي جديد جاهز') + '</b>' : '') + '</small>' +
      '<div class="row"><button class="btn" type="button" data-fed="train"' + (st.online && !F.busy ? '' : ' disabled') + '>' + L('Train locally', 'تدريب محلي') + '</button>' +
      '<button class="btn ' + (st.online ? '' : 'primary') + '" type="button" data-fed="toggle"' + (F.busy ? ' disabled' : '') + '>' + (st.online ? L('Take offline', 'فصل الموقع') : L('Bring online', 'إعادة الاتصال')) + '</button></div></div>';
  }
  function drawChart() {
    var H = F.history, W = 320, Hh = 130, pad = { l: 34, r: 8, t: 10, b: 22 };
    var n = Math.max(5, H.length - 1), lo = Math.min.apply(null, H.map(function (h) { return h.recall; })) - 0.4, hi = Math.max.apply(null, H.map(function (h) { return h.recall; })) + 0.4;
    var X = function (r) { return pad.l + r / n * (W - pad.l - pad.r); }, Y = function (v) { return pad.t + (hi - v) / (hi - lo) * (Hh - pad.t - pad.b); };
    var pts = H.map(function (h) { return X(h.r).toFixed(1) + ',' + Y(h.recall).toFixed(1); }).join(' ');
    var grid = ''; for (var g = 0; g <= 2; g++) { var v = lo + (hi - lo) * g / 2; grid += '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" class="cg"/><text x="' + (pad.l - 4) + '" y="' + (Y(v) + 3) + '" text-anchor="end" class="ct">' + v.toFixed(1) + '</text>'; }
    $('#fedChart').innerHTML = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" class="fchart" role="img" aria-label="Recall per round">' + grid +
      '<polyline points="' + pts + '" class="cl"/>' + H.map(function (h) { return '<circle cx="' + X(h.r) + '" cy="' + Y(h.recall) + '" r="3.2" class="cd' + (h.rej ? ' rej' : '') + '"><title>R' + h.r + ': ' + h.recall.toFixed(2) + '%</title></circle>'; }).join('') +
      '<text x="' + (W - pad.r) + '" y="' + (Hh - 5) + '" text-anchor="end" class="ct">' + L('round', 'الجولة') + ' →</text></svg>';
  }
  function drawLog() {
    $('#fedLog').innerHTML = F.log.length ? F.log.slice(0, 8).map(function (e) { return '<li class="' + (e.bad ? 'bad' : '') + '"><time>' + e.t + '</time><span>' + e.txt[AR() ? 1 : 0] + '</span></li>'; }).join('')
      : '<li class="muted">' + L('No rounds yet – press “Run 1 round”.', 'لا جولات بعد – اضغط «تشغيل جولة واحدة».') + '</li>';
  }
  function drawCase() {
    var c = F.pending, d = F.done;
    $('#learnCase').innerHTML = c
      ? '<div class="card-h"><h3>' + L('Pending lab result', 'نتيجة المختبر المعلّقة') + '</h3><span class="pill high">' + c.id + '</span></div><p><b>' + c.tag + '</b> · ' + c.text + '</p><p class="muted small">' + L('The next round starts with the lab confirmation of this seizure.', 'تبدأ الجولة القادمة بتأكيد المختبر لهذه الضبطية.') + '</p>'
      : d ? '<div class="card-h"><h3>' + L('Last confirmed seizure', 'آخر ضبطية مؤكدة') + '</h3><span class="pill low">' + d.id + '</span></div><p><b>' + d.tag + '</b></p>'
        : '<div class="card-h"><h3>' + L('Scheduled training rounds', 'جولات تدريب مجدولة') + '</h3></div><p class="muted small">' + L('No seizure waiting for the lab. Rounds use each site\'s newly confirmed cases from routine operations.', 'لا ضبطية بانتظار المختبر. تستخدم الجولات القضايا المؤكدة حديثاً من العمليات الاعتيادية في كل موقع.') + '</p>';
  }
  function render() { initSites(); drawNet(); drawControls(); drawKpis(); drawSiteCard(); drawChart(); drawLog(); drawCase(); }
  NL.fedRender = function (ctx) { ctx = ctx || {}; F.pending = ctx.pending || null; F.done = ctx.done || null; render(); };

  // ---------- animation ----------
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function packets(ids, toCore, color, dur, poisonId) {
    return new Promise(function (resolve) {
      var g = $('#packets'); if (!g || !ids.length) return resolve();
      var dots = ids.map(function (id, k) {
        var i = NL.sites.findIndex(function (s) { return s.id === id; }), c = document.createElementNS(NS, 'g'), bad = id === poisonId;
        c.innerHTML = '<circle r="' + (bad ? 9 : 7) + '" fill="' + (bad ? '#ef4444' : color) + '"/><text y="3.5" text-anchor="middle" class="pk">' + (toCore ? 'Δ' : '✓') + '</text>';
        g.appendChild(c); return { el: c, p: pos(i), delay: k * 80 };
      });
      var t0 = performance.now(), reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      (function f(now) {
        var all = true;
        dots.forEach(function (d) {
          var t = reduce ? 1 : Math.max(0, Math.min(1, (now - t0 - d.delay) / dur)); if (t < 1) all = false;
          var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, a = toCore ? d.p : CORE, b = toCore ? CORE : d.p;
          d.el.setAttribute('transform', 'translate(' + (a.x + (b.x - a.x) * e).toFixed(1) + ',' + (a.y + (b.y - a.y) * e).toFixed(1) + ')');
        });
        if (!all) requestAnimationFrame(f); else { dots.forEach(function (d) { d.el.remove(); }); resolve(); }
      })(t0);
    });
  }
  function nodeClass(ids, cls, on) { ids.forEach(function (id) { var g = document.querySelector('#fedNet [data-site="' + id + '"]'); if (g) g.classList.toggle(cls, on); }); }
  // ⓘ "How it works" popover next to the privacy switch
  function drawInfo() {
    var t = L('How privacy works', 'كيف تعمل الخصوصية');
    $('#fedInfoTitle').textContent = t;
    $('#fedInfoBtn').setAttribute('aria-label', t); $('#fedInfoBtn').title = t; $('#fedInfo').setAttribute('aria-label', t);
    $('.fed-info .info-x').setAttribute('aria-label', L('Close', 'إغلاق'));
    var noise = { low: L('Light', 'خفيف'), medium: L('Moderate', 'متوسط'), high: L('Strong', 'قوي') };
    $('#fedInfoBody').innerHTML =
      '<ol class="steps plain">' +
      '<li><b>' + L('Train locally.', 'تدريب محلي.') + '</b> ' + L('Each site retrains on its own lab-confirmed seizures. Raw X-ray images never leave the site.', 'يعيد كل موقع التدريب على ضبطياته المؤكدة مخبرياً. لا تغادر صور الأشعة الخام الموقع أبداً.') + '</li>' +
      '<li><b>' + L('Add noise.', 'إضافة ضجيج.') + '</b> ' + L('Before sending, the site adds random noise to its model update (differential privacy), so no single bag or seizure can be worked out from it. The privacy level sets how much noise.', 'قبل الإرسال، يضيف الموقع ضجيجاً عشوائياً إلى تحديث النموذج (الخصوصية التفاضلية)، فلا يمكن استنتاج أي حقيبة أو ضبطية بعينها منه. يحدد مستوى الخصوصية مقدار الضجيج.') + '</li>' +
      '<li><b>' + L('Encrypt and combine.', 'التشفير والتجميع.') + '</b> ' + L('Updates travel encrypted and are averaged at the core. Outliers, such as a poisoned update, are rejected.', 'تنتقل التحديثات مشفّرة وتُجمَّع في النواة. وتُرفض التحديثات الشاذة مثل التحديث المسموم.') + '</li>' +
      '<li><b>' + L('Deploy.', 'النشر.') + '</b> ' + L('The improved model goes back to every site.', 'يعود النموذج المحسَّن إلى كل المواقع.') + '</li>' +
      '</ol>' +
      '<table class="fed-ptbl"><thead><tr><th>' + L('Level', 'المستوى') + '</th><th>ε</th><th>' + L('Noise', 'الضجيج') + '</th><th>' + L('Learning speed', 'سرعة التعلّم') + '</th></tr></thead><tbody>' +
      Object.keys(PRIV).map(function (k) {
        return '<tr' + (F.privacy === k ? ' class="on"' : '') + '><td>' + PRIV[k][AR() ? 'ar' : 'en'] + (F.privacy === k ? ' ✓' : '') + '</td><td>' + PRIV[k].eps + '</td><td>' + noise[k] + '</td><td>' + Math.round(PRIV[k].f * 100) + '%</td></tr>';
      }).join('') + '</tbody></table>' +
      '<p class="muted small">' + L('Smaller ε = stronger privacy but slower learning. The ε values are realistic; the learning-speed effect is simulated.', 'كلما صغرت ε زادت الخصوصية وتباطأ التعلّم. قيم ε واقعية، أما أثرها على سرعة التعلّم فمحاكاة.') + '</p>';
  }
  function setStep(i) { F.step = i; if ($('#fedSteps')) drawControls(); }
  function status(en, ar) { var s = $('#learnStatus'); if (s) s.textContent = L(en, ar); }
  function now() { return NL.state.clock.toTimeString().slice(0, 5); }

  // One federated round. opts.fromLab: the round starts from a lab-confirmed seizure.
  F.round = function (opts) {
    opts = opts || {};
    if (F.busy) return Promise.resolve();
    initSites();
    var online = NL.sites.filter(function (s) { return F.sites[s.id].online; }).map(function (s) { return s.id; });
    if (!online.length) { status('No sites online – bring a site back online first.', 'لا توجد مواقع متصلة – أعد اتصال موقع أولاً.'); return Promise.resolve(); }
    F.busy = true; drawControls(); drawSiteCard();
    var poisonId = F.poison && online.length > 1 ? online[(F.rounds * 3 + 1) % online.length] : null;
    var accepted = online.filter(function (id) { return id !== poisonId; }), ready = accepted.filter(function (id) { return F.sites[id].ready; }).length;
    var kb = accepted.reduce(function (a, id) { return a + F.sites[id].kb; }, 0);
    setStep(opts.fromLab ? 0 : 1);
    status(opts.fromLab ? 'Forensic lab confirms the substance…' : 'Starting scheduled round…', opts.fromLab ? 'المختبر الجنائي يؤكد المادة…' : 'بدء جولة مجدولة…');
    return sleep(opts.fromLab ? 700 : 200).then(function () {
      setStep(1); status('Sites train locally on their own confirmed cases…', 'تتدرّب المواقع محلياً على قضاياها المؤكدة…');
      nodeClass(online, 'train', true); return sleep(900);
    }).then(function () {
      nodeClass(online, 'train', false);
      setStep(2); status('Encrypted model updates → core (no images leave a site)', 'تحديثات نموذج مشفّرة ← النواة (لا تغادر أي صورة الموقع)');
      return packets(online, true, '#f59e0b', 1000, poisonId);
    }).then(function () {
      setStep(3); status('Core aggregates with a robust median…', 'النواة تجمع التحديثات بوسيط متين…');
      var core = document.querySelector('#fedNet .fcore'); if (core) core.classList.add('agg');
      if (poisonId) { nodeClass([poisonId], 'poisoned', true); if (NL.cue) NL.cue('flag'); }
      return sleep(800);
    }).then(function () {
      var core = document.querySelector('#fedNet .fcore'); if (core) core.classList.remove('agg');
      var m = model(), before = m.recall, gain = gainPerRound(accepted.length, ready);
      m.v[2] += 1; m.recall = Math.min(99, m.recall + gain); m.far = Math.max(1, m.far - gain * 0.45);
      NL.state.stats.far = m.far;
      F.rounds++;
      var sigma = (3.8 + ((F.rounds * 7) % 14) / 10).toFixed(1);
      if (poisonId) F.log.unshift({ t: now(), bad: true, txt: ['Update from ' + NL.site(poisonId).name + ' rejected – ' + sigma + 'σ from the median (it would have cut recall by ~' + (2 + F.rounds % 3) + ' pts)', 'رُفض تحديث ' + (NL.AR[NL.site(poisonId).name] || poisonId) + ' – يبعد ' + sigma + 'σ عن الوسيط (كان سيخفض الاستدعاء ~' + (2 + F.rounds % 3) + ' نقاط)'] });
      F.log.unshift({ t: now(), txt: ['Round ' + F.rounds + ' · ' + accepted.length + '/' + NL.sites.length + ' sites · ' + kb + ' KB of updates · privacy ε=' + PRIV[F.privacy].eps + ' · ' + ver(m.v) + ' (+' + (m.recall - before).toFixed(2) + ' recall)',
        'الجولة ' + F.rounds + ' · ' + accepted.length + '/' + NL.sites.length + ' مواقع · ' + kb + ' KB تحديثات · خصوصية ε=' + PRIV[F.privacy].eps + ' · ' + ver(m.v) + ' (+' + (m.recall - before).toFixed(2) + ' استدعاء)'] });
      F.history.push({ r: F.rounds, recall: m.recall, far: m.far, rej: !!poisonId });
      setStep(4); status('Deploying ' + ver(m.v) + ' to online sites…', 'نشر ' + ver(m.v) + ' إلى المواقع المتصلة…');
      drawKpis(); drawChart(); drawLog();
      var core2 = document.querySelector('#fedNet .core-lbl.sm'); if (core2) core2.textContent = L('core', 'النواة') + ' · ' + ver(m.v);
      return packets(online, false, '#2dd4bf', 1000, null);
    }).then(function () {
      var m = model();
      online.forEach(function (id) { F.sites[id].v = m.v.slice(); F.sites[id].ready = false; F.sites[id].lastSync = now(); });
      if (poisonId) nodeClass([poisonId], 'poisoned', false);
      F.busy = false; F.step = 5;
      var off = NL.sites.length - online.length;
      status(online.length + ' site' + (online.length > 1 ? 's' : '') + ' on ' + ver(m.v) + (off ? ' · ' + off + ' offline site' + (off > 1 ? 's' : '') + ' still on an older version' : ''),
        online.length + ' مواقع على ' + ver(m.v) + (off ? ' · ' + off + ' مواقع غير متصلة ما زالت على إصدار أقدم' : ''));
      if (NL.app && NL.app.log) NL.app.log('DXB', 'Federated round ' + F.rounds + ': ' + ver(m.v) + ' deployed to ' + online.length + ' sites' + (poisonId ? ' · 1 poisoned update rejected' : ''), poisonId ? 'danger' : 'info');
      render();
    });
  };
  function autoLoop() {
    if (!F.auto) return;
    if (NL.state.screen !== 'learn') { F.auto = false; return; }
    (F.busy ? sleep(400) : F.round().then(function () { return sleep(1400); })).then(autoLoop);
  }

  // ---------- events ----------
  function init() {
    var svg = $('#fedNet');
    function pick(e) { var g = e.target.closest('[data-site]'); if (!g) return; F.sel = F.sel === g.dataset.site ? null : g.dataset.site; drawNet(); drawSiteCard(); }
    svg.addEventListener('click', pick);
    svg.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(e); } });
    $('#fedSite').addEventListener('click', function (e) {
      var b = e.target.closest('[data-fed]'); if (!b || !F.sel || F.sel === 'core') return;
      var st = F.sites[F.sel];
      if (b.dataset.fed === 'toggle') {
        st.online = !st.online;
        F.log.unshift({ t: now(), txt: [NL.site(F.sel).name + (st.online ? ' back online' : ' taken offline'), (NL.AR[NL.site(F.sel).name] || F.sel) + (st.online ? ' عاد للاتصال' : ' فُصل عن الشبكة')] });
        render();
      } else if (b.dataset.fed === 'train') {
        b.disabled = true;
        nodeClass([F.sel], 'train', true);
        sleep(1100).then(function () { st.ready = true; st.local += 1; nodeClass([F.sel], 'train', false); F.log.unshift({ t: now(), txt: [NL.site(F.sel).name + ' trained locally – fresh update ready (raw images stay on site)', (NL.AR[NL.site(F.sel).name] || F.sel) + ' تدرّب محلياً – تحديث جديد جاهز (الصور الخام تبقى في الموقع)'] }); render(); });
      }
    });
    $('#fedAuto').addEventListener('click', function () { F.auto = !F.auto; drawControls(); if (F.auto) autoLoop(); });
    $('#fedPriv').addEventListener('click', function (e) { var b = e.target.closest('[data-priv]'); if (b) { F.privacy = b.dataset.priv; drawControls(); } });
    $('#fedPoison').addEventListener('change', function () { F.poison = this.checked; drawControls(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window.NL);
