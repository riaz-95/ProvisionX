/* NarcoLens – add-ons: supervisor review, evidence pack, case assistant, shift heat calendar. */
(function (NL) {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var AR = function () { return NL.i18n && NL.i18n.lang === 'ar'; };
  var L = function (en, ar) { return AR() ? ar : en; };
  var A, S;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function siteName(id) { var s = NL.site(id); return s ? (AR() && NL.AR[s.name] ? NL.AR[s.name] : s.name) : id; }
  function caseById(id) { return S.cases.find(function (c) { return c.id === id; }); }
  function ts() { return S.clock.toTimeString().slice(0, 5); }
  function dateStr() { var d = S.clock; return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  // =====================================================================
  // 1. SUPERVISOR REVIEW
  // =====================================================================
  function seedSupervisorCases() {
    var c1 = A.newCase({ tag: 'BAG-AUH-104882', site: 'AUH', lane: 'AUH T1 · Lane 6', route: 'Transfer · Route pattern R-17', preScore: 44,
      preText: 'Route pattern R-17; bag weight 3.2 kg above booking average.',
      m1: { score: 93, label: 'Concealment-like density (2 regions)', text: 'Two dense flat packets inside the shell lining.' } });
    c1.evidence.m3 = { score: 96, illicit: true, text: 'Amphetamine-type stimulant', mix: '81% Amphetamine-type stimulant + 19% Caffeine' };
    c1.timeline.push({ t: '07:52', mod: 'OFFICER', title: 'Bag opened by Insp. R. Al Hammadi · AUH desk 1', text: 'Two flat packets found inside the lining.', cls: '' });
    c1.timeline.push({ t: '07:58', mod: 'M3', title: 'Amphetamine-type stimulant · 96% spectral match', text: 'Mixture: 81% amphetamine-type + 19% caffeine.', cls: 'danger' });
    c1.timeline.push({ t: '08:05', mod: 'OFFICER', title: 'Seizure by Insp. R. Al Hammadi · sample sent to forensic lab', text: 'Chain of custody started.', cls: 'danger' });
    c1.timeline.push({ t: '08:41', mod: 'LAB', title: 'Lab confirmed: amphetamine-type stimulant', text: 'Lab reference AUH-FL-2291.', cls: 'danger' });
    c1.status = 'Seizure confirmed by lab'; c1.sup = 'pending';
    var c2 = A.newCase({ tag: 'BAG-DWC-220415', site: 'DWC', lane: 'DWC · Lane 2', route: 'Direct arrival', preScore: 22, preText: 'No risk indicators.',
      m1: { score: 74, label: 'Dense organic mass in toiletry bag', text: 'Uniform organic density in two jar-shaped containers.' } });
    c2.timeline.push({ t: '08:12', mod: 'OFFICER', title: 'Cleared by Insp. S. Al Ketbi', text: 'Officer override: sealed honey jars, declared on arrival card.', cls: 'ok' });
    c2.status = 'Cleared by officer'; c2.override = 'pending'; c2.overrideReason = ['Sealed honey jars, declared on arrival card', 'برطمانات عسل مغلقة، مُصرّح عنها في بطاقة الوصول'];
    S.cases.forEach(function (c) { c.timeline.forEach(function (t) { t.fresh = false; }); });
  }
  var SITE_PERF = { DXB: [61240, 214, 31], SHJ: [18320, 41, 6], POST: [39870, 162, 22], DWC: [14410, 38, 4], JEA: [9120, 57, 9], KZP: [6480, 31, 5], AUH: [34773, 69, 11] };
  NL.supRender = function () {
    if (NL.officer.role !== 'supervisor') { $('#supQueue').innerHTML = '<p class="muted">' + L('Supervisor sign-in required.', 'يلزم تسجيل دخول المشرف.') + '</p>'; return; }
    var queue = S.cases.filter(function (c) { return (/Seized|confirmed/.test(c.status) || c.sup === 'pending') && c.sup !== 'approved' && c.sup !== 'returned'; });
    var overrides = S.cases.filter(function (c) { return /Cleared/.test(c.status) && A.fuse(c).score >= 45 && c.override === 'pending'; });
    var audit = [];
    S.cases.forEach(function (c) { c.timeline.forEach(function (t) { if (/OFFICER|LAB|SUP/.test(t.mod)) audit.push({ t: t.t, c: c.id, mod: t.mod, title: t.title }); }); });
    audit.sort(function (a, b) { return b.t.localeCompare(a.t); });
    $('#supKpis').innerHTML =
      '<div class="kpi"><div class="lbl">' + L('Awaiting your sign-off', 'بانتظار اعتمادك') + '</div><div class="val">' + queue.length + '</div><div class="sub">' + L('seizures to approve', 'ضبطيات للاعتماد') + '</div></div>' +
      '<div class="kpi"><div class="lbl">' + L('Officer overrides', 'مخالفات الضباط للنظام') + '</div><div class="val">' + overrides.length + '</div><div class="sub">' + L('AI flagged, officer cleared', 'نبّه الذكاء الاصطناعي وأجاز الضابط') + '</div></div>' +
      '<div class="kpi"><div class="lbl">' + L('Audited actions', 'إجراءات مدقّقة') + '</div><div class="val">' + audit.length + '</div><div class="sub">' + L('every action is logged', 'كل إجراء مسجّل') + '</div></div>';
    $('#supQueue').innerHTML = '<div class="card-h"><h3>' + L('Seizures awaiting sign-off', 'ضبطيات بانتظار الاعتماد') + '</h3></div>' +
      (queue.length ? queue.map(function (c) {
        var f = A.fuse(c).score;
        return '<div class="sup-item"><div><b>' + c.id + ' · ' + esc(c.tag) + '</b><small>' + siteName(c.site) + ' · ' + esc(c.evidence.m3 ? c.evidence.m3.text : '') + ' · ' + L('fused ', 'الدرجة ') + f + ' · ' + esc(c.status) + '</small></div>' +
          '<div class="row"><button class="btn primary" data-sup="approve" data-id="' + c.id + '">' + L('Approve', 'اعتماد') + '</button><button class="btn" data-sup="return" data-id="' + c.id + '">' + L('Return to officer', 'إعادة للضابط') + '</button><button class="btn ghost" data-sup="pack" data-id="' + c.id + '">' + L('Evidence pack', 'حزمة الأدلة') + '</button></div></div>';
      }).join('') : '<p class="muted small">' + L('Nothing waiting. Seize a case (or run the full demo) to see it here.', 'لا شيء بالانتظار. اضبط قضية (أو شغّل العرض الكامل) لتظهر هنا.') + '</p>');
    $('#supOverrides').innerHTML = '<div class="card-h"><h3>' + L('Overrides to review', 'مخالفات للمراجعة') + '</h3><span class="badge algo">' + L('Feeds model calibration', 'تغذي معايرة النموذج') + '</span></div>' +
      (overrides.length ? overrides.map(function (c) {
        return '<div class="sup-item"><div><b>' + c.id + ' · ' + esc(c.tag) + '</b><small>' + L('AI fused score ', 'درجة الذكاء الاصطناعي ') + A.fuse(c).score + ' · ' + L('officer cleared: ', 'أجازها الضابط: ') + esc((c.overrideReason || ['', ''])[AR() ? 1 : 0]) + '</small></div>' +
          '<div class="row"><button class="btn" data-sup="agree" data-id="' + c.id + '">' + L('Agree with officer', 'موافقة الضابط') + '</button><button class="btn" data-sup="reinspect" data-id="' + c.id + '">' + L('Order re-inspection', 'طلب إعادة التفتيش') + '</button></div></div>';
      }).join('') : '<p class="muted small">' + L('No overrides waiting.', 'لا توجد مخالفات بالانتظار.') + '</p>');
    $('#supSites').innerHTML = '<div class="card-h"><h3>' + L('Site performance today', 'أداء المواقع اليوم') + '</h3></div><div class="table-wrap"><table class="tbl" style="min-width:0"><thead><tr><th>' + L('Site', 'الموقع') + '</th><th>' + L('Screened', 'المفحوص') + '</th><th>' + L('AI flags', 'التنبيهات') + '</th><th>' + L('Opened', 'المفتوحة') + '</th><th>' + L('Flag rate', 'نسبة التنبيه') + '</th></tr></thead><tbody>' +
      NL.sites.map(function (s) { var p = SITE_PERF[s.id]; return '<tr><td>' + siteName(s.id) + '</td><td>' + p[0].toLocaleString('en-US') + '</td><td>' + p[1] + '</td><td>' + p[2] + '</td><td>' + (p[1] / p[0] * 100).toFixed(2) + '%</td></tr>'; }).join('') + '</tbody></table></div>';
    $('#supAudit').innerHTML = '<div class="card-h"><h3>' + L('Audit log', 'سجل التدقيق') + '</h3><span class="muted small">' + L('officer, lab and supervisor actions', 'إجراءات الضباط والمختبر والمشرف') + '</span></div><ol class="fed-log">' +
      audit.slice(0, 12).map(function (e) { return '<li class="' + (e.mod === 'SUP' ? 'sup' : '') + '"><time>' + e.t + '</time><span><b>' + e.c + '</b> · ' + esc(e.title) + '</span></li>'; }).join('') + '</ol>';
  };
  function supAction(act, id) {
    var c = caseById(id); if (!c) return;
    var who = NL.officer.short;
    if (act === 'approve') { c.sup = 'approved'; A.addTimeline(c, 'SUP', 'Seizure approved by ' + who, 'Evidence pack reviewed; case released to the prosecution file.', 'ok'); A.log(c.site, c.id + ' approved by ' + who, 'info'); if (NL.cue) NL.cue('clear'); }
    else if (act === 'return') { c.sup = 'returned'; A.addTimeline(c, 'SUP', 'Returned to officer by ' + who, 'More evidence requested before sign-off.', ''); A.log(c.site, c.id + ' returned to officer', 'info'); }
    else if (act === 'agree') { c.override = 'agreed'; A.addTimeline(c, 'SUP', 'Override confirmed by ' + who, 'Labelled as a false alarm – used to calibrate the model.', 'ok'); }
    else if (act === 'reinspect') { c.override = 'reinspect'; c.status = 'Awaiting inspection'; A.addTimeline(c, 'SUP', 'Re-inspection ordered by ' + who, 'Case returned to the inspection queue.', 'danger'); A.log(c.site, c.id + ' re-inspection ordered', 'danger'); }
    else if (act === 'pack') { NL.reportCase = id; A.go('report'); return; }
    NL.supRender();
  }

  // =====================================================================
  // 2. EVIDENCE PACK
  // =====================================================================
  function hash(str) { var h1 = 0x811c9dc5, h2 = 0x01000193; for (var i = 0; i < str.length; i++) { h1 ^= str.charCodeAt(i); h1 = Math.imul(h1, 16777619) >>> 0; h2 = Math.imul(h2 ^ str.charCodeAt(i), 2654435761) >>> 0; } return ('00000000' + h1.toString(16)).slice(-8) + ('00000000' + h2.toString(16)).slice(-8); }
  NL.reportRender = function () {
    var c = caseById(NL.reportCase) || A.current();
    if (!c) return;
    var f = A.fuse(c), e = c.evidence, scene = c.scene || ((NL.bags.find(function (b) { return b.tag === c.tag; }) || {}).scene);
    var h = hash(JSON.stringify({ id: c.id, tag: c.tag, t: c.timeline.map(function (x) { return x.t + x.title; }), s: f.score }));
    var sec = function (n, en, ar) { return '<h2><span>' + n + '</span>' + L(en, ar) + '</h2>'; };
    var html = '<header class="rep-h"><div><div class="rep-brand">NarcoLens · ' + L('Evidence pack', 'حزمة الأدلة') + '</div><div class="rep-conf">' + L('CONFIDENTIAL · LAW-ENFORCEMENT USE · PROTOTYPE (SIMULATED DATA)', 'سري · للاستخدام الأمني · نموذج أولي (بيانات محاكاة)') + '</div></div>' +
      '<div class="rep-id"><b>' + c.id + '</b><small>' + L('Report hash', 'بصمة التقرير') + ' ' + h + '</small></div></header>' +
      '<dl class="rep-kv">' + [[L('Tag', 'البطاقة'), esc(c.tag)], [L('Type', 'النوع'), esc(c.kind || 'Bag')], [L('Site / lane', 'الموقع / المسار'), siteName(c.site) + ' · ' + esc(c.lane)], [L('Route', 'المسار'), esc(c.route)],
        [L('Status', 'الحالة'), esc(c.status) + (c.sup === 'approved' ? L(' · supervisor approved', ' · معتمدة من المشرف') : '')], [L('Prepared by', 'أعدّه'), esc(NL.officer.name) + ' · ' + esc(NL.officer.title || NL.officer.role)], [L('Generated', 'أُنشئ'), dateStr() + ' ' + ts()]]
        .map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl>';
    html += sec(1, 'Summary', 'الملخص') + '<p class="rep-sum">' + L('Fused risk score ', 'درجة المخاطر المدمجة ') + '<b>' + f.score + '/100</b> → ' + esc(e.m3 && e.m3.illicit ? L('Seizure recommended', 'يوصى بالضبط') : A.decisionText(f.score)) +
      (e.m3 ? '. ' + L('Substance indication: ', 'المادة المرجّحة: ') + '<b>' + esc(e.m3.text) + '</b> (' + e.m3.score + '% ' + L('spectral match', 'تطابق طيفي') + (e.m3.mix ? '; ' + esc(e.m3.mix) : '') + ')' : '') + '.</p>';
    html += sec(2, 'X-ray with AI heatmap (M1)', 'صورة الأشعة مع خريطة الذكاء الاصطناعي (M1)') + (scene ? '<canvas id="repXray" width="760" height="440"></canvas><p class="rep-cap">' + L('M1 score ', 'درجة M1 ') + (e.m1 ? e.m1.score : '–') + ' · ' + esc(e.m1 ? e.m1.text : '') + '</p>' : '<p class="muted">' + L('Scan image is held on the site scanner system (not embedded in this prototype).', 'صورة المسح محفوظة في نظام ماسح الموقع (غير مضمّنة في هذا النموذج).') + '</p>');
    html += sec(3, 'Evidence fusion (M5)', 'دمج الأدلة (M5)') + '<table class="rep-tbl">' + f.parts.map(function (p) { return '<tr><td>' + esc(p.label) + '</td><td><i style="width:' + (p.v || 0) + '%"></i></td><td>' + (p.v == null ? L('not collected', 'لم تُجمع') : p.v) + '</td></tr>'; }).join('') + '</table>';
    if (e.m2) {
      html += sec(4, 'Tablets and packaging (M2)', 'الأقراص والتغليف (M2)') + '<p>' + esc(e.m2.text) + '</p>' +
        (e.m2.crops && e.m2.crops.length ? '<div class="rep-crops">' + e.m2.crops.map(function (x) { return '<figure><img src="' + x.img + '" alt=""><figcaption>' + ['Crescent', 'Plain', 'Scored', 'Letter'][x.top] + ' ' + Math.round(x.p * 100) + '%</figcaption></figure>'; }).join('') + '</div>' : '') +
        (e.m2.profile ? '<p class="rep-cap">' + L('Physical profile: ', 'الملف الفيزيائي: ') + e.m2.profile.n + L(' tablets · ', ' أقراص · ') + e.m2.profile.dMean.toFixed(1) + ' ± ' + e.m2.profile.dSd.toFixed(1) + ' mm · ' + L('circularity ', 'الاستدارة ') + e.m2.profile.circ.toFixed(2) + ' · ' + e.m2.profile.hex.toUpperCase() + '</p>' : '');
    }
    if (e.m3) html += sec(e.m2 ? 5 : 4, 'Spectral identification (M3)', 'التعرّف الطيفي (M3)') + (e.m3.spectrum ? '<img class="rep-spec" src="' + e.m3.spectrum + '" alt="">' : '') + '<p class="rep-cap">' + esc(e.m3.text) + ' · ' + e.m3.score + '%' + (e.m3.mix ? ' · ' + esc(e.m3.mix) : '') + '</p>';
    var n = 4 + (e.m2 ? 1 : 0) + (e.m3 ? 1 : 0);
    html += sec(n, 'Chain of custody and timeline', 'سلسلة الحيازة والخط الزمني') + '<table class="rep-tbl rep-tl"><thead><tr><th>' + L('Time', 'الوقت') + '</th><th>' + L('Source', 'المصدر') + '</th><th>' + L('Action', 'الإجراء') + '</th></tr></thead><tbody>' +
      c.timeline.map(function (t) { return '<tr><td>' + t.t + '</td><td>' + t.mod + '</td><td><b>' + esc(t.title) + '</b><br><small>' + esc(t.text) + '</small></td></tr>'; }).join('') + '</tbody></table>';
    html += sec(n + 1, 'Declarations', 'الإقرارات') + '<p class="rep-note">' + L('AI findings in this pack are investigative leads produced by NarcoLens models. The forensic laboratory result is the legal proof. No nationality, ethnicity, religion or gender data was used in any risk score.', 'نتائج الذكاء الاصطناعي في هذه الحزمة خيوط تحقيق من نماذج NarcoLens. نتيجة المختبر الجنائي هي الدليل القانوني. لم تُستخدم أي بيانات عن الجنسية أو العرق أو الدين أو الجنس في أي درجة مخاطر.') + '</p>' +
      '<div class="rep-sign">' + [L('Inspecting officer', 'الضابط المفتّش'), L('Duty supervisor', 'المشرف المناوب'), L('Forensic laboratory', 'المختبر الجنائي')].map(function (x) { return '<div><span></span><small>' + x + '</small></div>'; }).join('') + '</div>';
    $('#report').innerHTML = html;
    if (scene) {
      var cv = $('#repXray'), off = document.createElement('canvas'); off.width = NL.XRAY.W; off.height = NL.XRAY.H;
      NL.renderScene(scene, off.getContext('2d'), null);
      var res = NL.m1.run(off), ctx = cv.getContext('2d'); ctx.drawImage(off, 0, 0); NL.drawOverlay(ctx, res);
    }
    $('#repBack').innerHTML = L('← Back to case', '→ العودة إلى القضية');
    $('#repPrint').innerHTML = L('🖨 Print / Save as PDF', '🖨 طباعة / حفظ PDF');
  };

  // =====================================================================
  // 3. CASE ASSISTANT (scripted, offline)
  // =====================================================================
  var CHAT = {};
  var CHIPS = [['why', 'Why was this flagged?', 'لماذا نُبّه إليها؟'], ['links', 'What is linked to this case?', 'ما المرتبط بهذه القضية؟'], ['next', 'What should I do next?', 'ما الخطوة التالية؟'], ['report', 'Draft the seizure report', 'صياغة تقرير الضبط']];
  function intent(q) {
    q = q.toLowerCase();
    if (/why|flag|score|reason|لماذا|سبب|درجة/.test(q)) return 'why';
    if (/link|network|related|sender|route|مرتبط|شبكة|مرسل/.test(q)) return 'links';
    if (/next|do|should|step|التالي|أفعل|خطوة/.test(q)) return 'next';
    if (/report|draft|write|summar|تقرير|صياغة|ملخص/.test(q)) return 'report';
    return 'help';
  }
  function answer(c, kind) {
    var f = A.fuse(c), e = c.evidence, parts = f.parts.filter(function (p) { return p.v != null; }).sort(function (a, b) { return b.v - a.v; });
    if (kind === 'why') {
      var top = parts[0];
      var dec = e.m3 && e.m3.illicit ? L('seizure recommended', 'يوصى بالضبط') : A.decisionText(f.score);
      return L('Fused risk is <b>' + f.score + '/100</b> (' + dec + '). Evidence: ', 'الدرجة المدمجة <b>' + f.score + '/100</b> (' + dec + '). الأدلة: ') +
        '<ul>' + parts.map(function (p) { return '<li>' + esc(p.label) + ': <b>' + p.v + '</b></li>'; }).join('') + '</ul>' +
        L('The strongest signal is <b>' + esc(top.label) + '</b>. Pieces of evidence are combined with a noisy-OR, each weighted by the module\'s validated precision; 60+ means open the bag. No nationality or ethnicity is used.',
          'أقوى إشارة هي <b>' + esc(top.label) + '</b>. تُدمج الأدلة بطريقة noisy-OR موزونة بدقة كل وحدة؛ 60 فأكثر تعني فتح الحقيبة. لا تُستخدم الجنسية أو العرق.');
    }
    if (kind === 'links') {
      var r = NL.netLinks && NL.netLinks(c.id);
      if (!r || !r.n) return L('No linked cases in the last 60 days by sender, route pattern or concealment method.', 'لا قضايا مرتبطة خلال 60 يوماً حسب المرسل أو نمط المسار أو أسلوب الإخفاء.');
      return L('<b>' + r.n + ' linked case' + (r.n > 1 ? 's' : '') + '</b> via ', '<b>' + r.n + ' قضايا مرتبطة</b> عبر ') + r.via.map(function (v) { return '<b>' + esc(v.id) + '</b> (' + v.cases.length + ')'; }).join(', ') +
        ': ' + r.via[0].cases.filter(function (x) { return x.id !== c.id; }).slice(0, 4).map(function (x) { return x.id + ' · ' + siteName(x.site); }).join('; ') +
        '. <button class="link-chip" data-netcase="' + c.id + '">' + L('Open in network view →', 'فتح في عرض الشبكة ←') + '</button>';
    }
    if (kind === 'next') {
      var st = c.status, steps;
      if (/Awaiting/.test(st)) steps = L('Open the bag at the inspection desk, photograph the contents (M2), then scan any sealed packs with the hyperspectral camera (M3).', 'افتح الحقيبة في مكتب التفتيش، وصوّر المحتويات (M2)، ثم امسح العبوات المغلقة بالكاميرا فائقة الطيف (M3).');
      else if (/Opened/.test(st) && !e.m2) steps = L('Photograph the contents and press “Analyse photo” to check imprints and labels (M2).', 'صوّر المحتويات واضغط «تحليل الصورة» لفحص النقوش والملصقات (M2).');
      else if (/Opened/.test(st) && !e.m3) steps = L('Scan the sealed contents with the hyperspectral camera (M3) to identify the substance without opening it.', 'امسح المحتويات المغلقة بالكاميرا فائقة الطيف (M3) لتحديد المادة دون فتحها.');
      else if (e.m3 && e.m3.illicit && !/Seiz|confirmed/.test(st)) steps = L('Seize the item and send a sample to the forensic lab – this starts the chain of custody. The evidence pack is ready.', 'اضبط المادة وأرسل عينة إلى المختبر الجنائي – تبدأ بذلك سلسلة الحيازة. حزمة الأدلة جاهزة.');
      else if (/Seized/.test(st)) steps = L('Await lab confirmation. A supervisor can then approve the seizure; the confirmed case feeds the next federated training round.', 'انتظر تأكيد المختبر، ثم يعتمد المشرف الضبطية، وتغذي القضية المؤكدة جولة التدريب الاتحادي التالية.');
      else steps = L('This case is closed. Its labelled evidence improves the models at every site in the next federated round.', 'هذه القضية مغلقة، وتحسّن أدلتها الموسومة النماذج في كل موقع في الجولة الاتحادية القادمة.');
      return '<b>' + L('Next step: ', 'الخطوة التالية: ') + '</b>' + steps;
    }
    if (kind === 'report') {
      var txt = (AR() ? ['تقرير ضبط – مسودة', 'القضية: ' + c.id + ' · ' + c.tag, 'الموقع: ' + siteName(c.site) + ' · ' + c.lane, 'الضابط: ' + NL.officer.name, 'التاريخ: ' + dateStr() + ' ' + ts(),
        'الملخص: نبّه NarcoLens إلى ' + (c.kind === 'Parcel' ? 'الطرد' : 'الحقيبة') + ' بدرجة مخاطر مدمجة ' + f.score + '/100.' + (e.m1 ? ' درجة الأشعة M1: ' + e.m1.score + '.' : '') + (e.m2 ? ' العبوة/الأقراص (M2): ' + e.m2.text + '.' : '') + (e.m3 ? ' المادة المرجّحة (M3): ' + e.m3.text + ' بتطابق ' + e.m3.score + '%' + (e.m3.mix ? ' (' + e.m3.mix + ')' : '') + '.' : ''),
        'الحالة: ' + c.status, 'المرفقات: صورة الأشعة مع خريطة الذكاء الاصطناعي، صور الضابط، الأطياف، الخط الزمني.', 'ملاحظة: نتائج الذكاء الاصطناعي خيوط تحقيق؛ نتيجة المختبر الجنائي هي الدليل القانوني.']
        : ['SEIZURE REPORT – DRAFT', 'Case: ' + c.id + ' · ' + c.tag, 'Location: ' + NL.site(c.site).name + ' · ' + c.lane, 'Officer: ' + NL.officer.name + ' (' + (NL.officer.title || NL.officer.role) + ')', 'Date: ' + dateStr() + ' ' + ts(),
          'Summary: NarcoLens flagged this ' + (c.kind || 'bag').toLowerCase() + ' with a fused risk of ' + f.score + '/100.' + (e.m1 ? ' X-ray (M1) score ' + e.m1.score + ': ' + e.m1.text : '') + (e.m2 ? ' Packaging/tablets (M2): ' + e.m2.text + '.' : '') + (e.m3 ? ' Substance indication (M3): ' + e.m3.text + ', ' + e.m3.score + '% spectral match' + (e.m3.mix ? ' (' + e.m3.mix + ')' : '') + '.' : ''),
          'Status: ' + c.status, 'Attachments: X-ray with AI heatmap, officer photos, spectra, full timeline (see evidence pack).', 'Note: AI findings are investigative leads; the forensic laboratory result is the legal proof.']).join('\n');
      return '<pre class="draft">' + esc(txt) + '</pre><div class="row"><button class="btn" data-copy="1">' + L('Copy text', 'نسخ النص') + '</button><button class="btn" data-pack="' + c.id + '">' + L('Open evidence pack', 'فتح حزمة الأدلة') + '</button></div>';
    }
    return L('I can explain why a case was flagged, show linked cases, suggest the next step or draft the seizure report. Try one of the buttons.', 'يمكنني شرح سبب التنبيه، وعرض القضايا المرتبطة، واقتراح الخطوة التالية، وصياغة تقرير الضبط. جرّب أحد الأزرار.');
  }
  NL.assistRender = function (c) {
    var box = $('#assistCard'); if (!box || !c) return;
    var msgs = CHAT[c.id] || (CHAT[c.id] = [{ who: 'ai', greet: true }]);
    var greet = L('Hello ' + NL.officer.name.split(' ')[0] + '. Ask me about case ' + c.id + '.', 'مرحباً ' + (NL.AR[NL.officer.name] || NL.officer.name).split(' ')[0] + '. اسألني عن القضية ' + c.id + '.');
    box.innerHTML = '<div class="card-h"><h3>💬 ' + L('Ask NarcoLens', 'اسأل NarcoLens') + ' · ' + c.id + '</h3><span class="badge sim">' + L('Scripted assistant · uses this case\'s evidence · no external AI', 'مساعد مُعدّ مسبقاً · يستخدم أدلة هذه القضية · دون ذكاء اصطناعي خارجي') + '</span></div>' +
      '<div class="chat" id="chatLog">' + msgs.map(function (m) { return '<div class="msg ' + m.who + '">' + (m.greet ? greet : m.html) + '</div>'; }).join('') + '</div>' +
      '<div class="chips">' + CHIPS.map(function (k) { return '<button type="button" class="chip" data-ask="' + k[0] + '">' + (AR() ? k[2] : k[1]) + '</button>'; }).join('') + '</div>' +
      '<form class="ask" id="assistForm"><input id="assistInput" placeholder="' + L('Ask about this case…', 'اسأل عن هذه القضية…') + '" autocomplete="off"><button class="btn primary" type="submit">' + L('Ask', 'اسأل') + '</button></form>';
    var log = $('#chatLog'); log.scrollTop = log.scrollHeight;
  };
  function ask(text, kind) {
    var c = A.current(); if (!c) return;
    var msgs = CHAT[c.id] || (CHAT[c.id] = []);
    msgs.push({ who: 'me', html: esc(text) });
    msgs.push({ who: 'ai typing', html: '<span class="dots"><i></i><i></i><i></i></span>' });
    NL.assistRender(c);
    setTimeout(function () { msgs.pop(); msgs.push({ who: 'ai', html: answer(c, kind || intent(text)) }); NL.assistRender(c); }, 550);
  }

  // =====================================================================
  // 4. SHIFT HEAT CALENDAR
  // =====================================================================
  var PEAKS = { DXB: [[[3, 4], 22, 5, 4], [null, 1, 3, 1.5]], AUH: [[null, 1, 3, 2.5], [[4, 5], 20, 3, 2]], POST: [[[0, 1, 2, 3, 4], 9, 4, 3], [[0, 2], 14, 2, 1.5]], SHJ: [[null, 14, 4, 2.2]], DWC: [[null, 3, 3, 2.4]], JEA: [[null, 6, 4, 2.6], [null, 18, 2, 1.5]], KZP: [[[0, 1, 2, 3], 7, 4, 2.2]] };
  var DAYS = [['Mon', 'الإثنين'], ['Tue', 'الثلاثاء'], ['Wed', 'الأربعاء'], ['Thu', 'الخميس'], ['Fri', 'الجمعة'], ['Sat', 'السبت'], ['Sun', 'الأحد']];
  var HC = { site: 'all', cache: {} };
  function grid(site) {
    if (HC.cache[site]) return HC.cache[site];
    var g = [];
    if (site === 'all') { g = []; for (var d0 = 0; d0 < 7; d0++) { g.push([]); for (var h0 = 0; h0 < 24; h0++) g[d0].push(0); } NL.sites.forEach(function (s) { var x = grid(s.id); for (var d = 0; d < 7; d++) for (var h = 0; h < 24; h++) g[d][h] += x[d][h]; }); return (HC.cache[site] = g); }
    var r = NL.rng(site.charCodeAt(0) * 131 + site.length * 7);
    for (var d = 0; d < 7; d++) {
      g.push([]);
      for (var h = 0; h < 24; h++) {
        var lam = 0.25;
        (PEAKS[site] || []).forEach(function (p) {
          if (p[0] && p[0].indexOf(d) < 0 && !(p[1] + p[2] > 24 && p[0].indexOf((d + 6) % 7) >= 0 && h < (p[1] + p[2]) % 24)) return;
          for (var k = 0; k < p[2]; k++) { var hh = (p[1] + k) % 24; if (hh === h) lam += p[3] * (1 - Math.abs(k - (p[2] - 1) / 2) / p[2]); }
        });
        g[d].push(Math.round(lam * (0.6 + r() * 0.8) * 2));
      }
    }
    return (HC.cache[site] = g);
  }
  function bestWindows(site, n) {
    var g = grid(site), wins = [], tot = 0;
    for (var d = 0; d < 7; d++) for (var h = 0; h < 24; h++) {
      var s = 0; for (var k = 0; k < 4; k++) { var hh = h + k, dd = d + Math.floor(hh / 24); s += g[dd % 7][hh % 24]; }
      wins.push({ site: site, d: d, h: h, s: s }); tot += s;
    }
    var avg = tot / wins.length;
    wins.sort(function (a, b) { return b.s - a.s; });
    var out = [];
    wins.forEach(function (w) { if (out.length < n && out.every(function (o) { return o.d !== w.d || Math.abs(o.h - w.h) >= 4; })) { w.ratio = w.s / avg; out.push(w); } });
    return out;
  }
  function heatRender() {
    var box = $('#heatCard'); if (!box) return;
    var g = grid(HC.site), max = Math.max.apply(null, g.map(function (r) { return Math.max.apply(null, r); })) || 1;
    var recs = HC.site === 'all' ? NL.sites.map(function (s) { return bestWindows(s.id, 1)[0]; }).sort(function (a, b) { return b.ratio - a.ratio; }).slice(0, 3) : bestWindows(HC.site, 3);
    var col = function (v) { var t = v / max; if (!v) return 'var(--panel-2)'; var hue = 170 - t * 170; return 'hsl(' + hue.toFixed(0) + ' 75% ' + (52 - t * 8).toFixed(0) + '% / ' + (0.25 + t * 0.75).toFixed(2) + ')'; };
    box.innerHTML = '<div class="card-h"><h3>' + L('Seizure heat calendar · shift planning', 'تقويم الضبطيات الحراري · تخطيط المناوبات') + '</h3><span class="badge sim">' + L('Simulated history · live recommendation', 'تاريخ محاكى · توصية مباشرة') + '</span></div>' +
      '<div class="hc-sites">' + [['all', L('All sites', 'كل المواقع')]].concat(NL.sites.map(function (s) { return [s.id, siteName(s.id)]; })).map(function (x) { return '<button type="button" data-hsite="' + x[0] + '" class="' + (HC.site === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div class="hc-wrap"><div class="hc-grid">' + '<span></span>' + Array.from({ length: 24 }, function (_, h) { return '<span class="hc-h">' + (h % 3 ? '' : ('0' + h).slice(-2)) + '</span>'; }).join('') +
      g.map(function (row, d) { return '<span class="hc-d">' + DAYS[d][AR() ? 1 : 0] + '</span>' + row.map(function (v, h) { return '<i class="hc-c" style="background:' + col(v) + '" title="' + DAYS[d][AR() ? 1 : 0] + ' ' + ('0' + h).slice(-2) + ':00 · ' + v + L(' seizures (60 days)', ' ضبطية (60 يوماً)') + '"></i>'; }).join(''); }).join('') + '</div>' +
      '<div class="hc-recs"><b>' + L('Recommended deployments – next week', 'توزيع مقترح – الأسبوع القادم') + '</b>' + recs.map(function (w, i) {
        var h2 = (w.h + 4) % 24;
        return '<div class="hc-rec"><span class="hc-n">' + (i + 1) + '</span><span>' + L('Place K9 team ' + (i + 1) + ' at ', 'ضع فريق K9 رقم ' + (i + 1) + ' في ') + '<b>' + siteName(w.site) + '</b> · ' + DAYS[w.d][AR() ? 1 : 0] + ' ' + ('0' + w.h).slice(-2) + ':00–' + ('0' + h2).slice(-2) + ':00 <em>(' + w.ratio.toFixed(1) + L('× average', '× المتوسط') + ')</em></span></div>';
      }).join('') + '<p class="muted small">' + L('Windows with the most seizures over the last 60 days, compared with an average 4-hour window.', 'أكثر الفترات ضبطاً خلال 60 يوماً، مقارنةً بمتوسط فترة 4 ساعات.') + '</p></div></div>';
  }

  // =====================================================================
  // wiring
  // =====================================================================
  function init() {
    A = NL.app; S = NL.state;
    seedSupervisorCases();
    var host = document.getElementById('screen-case');
    var card = document.createElement('div'); card.className = 'card'; card.id = 'assistCard'; card.setAttribute('data-noi18n', ''); host.appendChild(card);
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sup]'); if (b) { supAction(b.dataset.sup, b.dataset.id); return; }
      var q = e.target.closest('[data-ask]'); if (q) { ask(q.textContent, q.dataset.ask); return; }
      if (e.target.closest('[data-copy]')) { var pre = e.target.closest('.msg').querySelector('pre'); try { navigator.clipboard.writeText(pre.textContent); } catch (err) { } e.target.textContent = L('Copied ✓', 'نُسخ ✓'); return; }
      var p = e.target.closest('[data-pack]'); if (p) { NL.reportCase = p.dataset.pack; A.go('report'); return; }
      var hs = e.target.closest('[data-hsite]'); if (hs) { HC.site = hs.dataset.hsite; heatRender(); return; }
    });
    document.addEventListener('submit', function (e) { if (e.target.id === 'assistForm') { e.preventDefault(); var v = $('#assistInput').value.trim(); if (v) ask(v); } });
    $('#repPrint').addEventListener('click', function () { window.print(); });
    $('#repBack').addEventListener('click', function () { if (NL.reportCase) S.currentCase = NL.reportCase; A.go('case'); });
    NL.onRolePick = function (role) {
      var o = NL.officers[role], d = $('#demoAcct');
      d.querySelector('.avatar').textContent = o.initials;
      d.querySelector('b').textContent = AR() ? (NL.AR[o.name] || o.name) : o.name;
      d.querySelector('small').textContent = role === 'supervisor' ? L('Duty Supervisor · Dubai Customs (demo)', 'مشرف مناوب · جمارك دبي (تجريبي)') : L('Pharmaceutical Control Inspector · MOHAP Drug Control Dept', 'مفتشة رقابة دوائية · إدارة مكافحة المخدرات، وزارة الصحة ووقاية المجتمع');
      d.querySelector('.demo-note').innerHTML = (AR() ? 'حساب تجريبي · شخصية خيالية · الرقم ' : 'Demo account · fictional · ID ') + o.id + (AR() ? ' · كلمة المرور ' : ' · password ') + '<code>demo</code>';
    };
    heatRender();
    setTimeout(function () { var prev = NL.onLang; NL.onLang = function (l) { if (prev) prev(l); heatRender(); var c = A.current(); if (c && S.screen === 'case') NL.assistRender(c); }; }, 0);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window.NL);
