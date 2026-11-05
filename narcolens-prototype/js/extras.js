/* NarcoLens – sound + haptic alerts, keyboard shortcuts, judge tour, language switch wiring. */
(function (NL) {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var T = function (s) { return NL.i18n ? NL.i18n.t(s) : s; };
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  // ---------------- sound + haptic cue ----------------
  var SND = { on: store('nl-sound') !== 'off', ctx: null };
  function tone(ctx, f, t0, dur, vol) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  // kind: 'flag' (AI raised an alert) or 'clear'. el: element to flash.
  NL.cue = function (kind, el) {
    if (el) { el.classList.remove('flash-flag', 'flash-ok'); void el.offsetWidth; el.classList.add(kind === 'flag' ? 'flash-flag' : 'flash-ok'); }
    if (kind === 'flag' && navigator.vibrate) { try { navigator.vibrate([90, 60, 140]); } catch (e) { } }
    if (!SND.on) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      SND.ctx = SND.ctx || new AC();
      if (SND.ctx.state === 'suspended') SND.ctx.resume();
      var t = SND.ctx.currentTime + 0.01;
      if (kind === 'flag') { tone(SND.ctx, 880, t, 0.16, 0.18); tone(SND.ctx, 660, t + 0.18, 0.22, 0.18); }
      else tone(SND.ctx, 520, t, 0.08, 0.05);
    } catch (e) { }
  };
  function setSound(on) {
    SND.on = on; store('nl-sound', on ? 'on' : 'off');
    var b = $('#soundBtn');
    if (b) {
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.title = on ? 'Sound alerts on' : 'Sound alerts off'; b.setAttribute('aria-label', b.title);
      b.classList.toggle('muted-snd', !on);
    }
  }

  // ---------------- keyboard shortcuts ----------------
  var KEYS = [
    ['N', 'Scan the next bag on the belt', 'تفحّص الحقيبة التالية على السير'],
    ['D', 'Start / stop the full demo', 'تشغيل / إيقاف العرض الكامل'],
    ['T', 'Start the judge tour', 'بدء جولة المحكّمين'],
    ['L', 'Switch Arabic / English', 'التبديل بين العربية والإنجليزية'],
    ['M', 'Mute / unmute alert sounds', 'كتم / تشغيل صوت التنبيهات'],
    ['1 – 9', 'Jump to a screen in the menu', 'الانتقال إلى شاشة في القائمة'],
    ['?', 'Show this help', 'عرض هذه المساعدة'],
    ['Esc', 'Close panels, tour or help', 'إغلاق اللوحات أو الجولة أو المساعدة']
  ];
  function showHelp() {
    var ar = NL.i18n && NL.i18n.lang === 'ar', d = $('#kbHelp');
    d.innerHTML = '<div class="kb-card" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" tabindex="-1">' +
      '<div class="info-pop-h"><b data-noi18n>' + (ar ? 'اختصارات لوحة المفاتيح' : 'Keyboard shortcuts') + '</b><button class="info-x" type="button" aria-label="Close">&times;</button></div>' +
      '<table data-noi18n>' + KEYS.map(function (k) { return '<tr><td><kbd>' + k[0] + '</kbd></td><td>' + (ar ? k[2] : k[1]) + '</td></tr>'; }).join('') + '</table></div>';
    d.hidden = false; d.querySelector('.kb-card').focus();
  }
  function hideHelp() { $('#kbHelp').hidden = true; }

  function typing(e) { var t = e.target; return t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.nodeName) || t.isContentEditable); }
  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!$('#login').hidden) return;
    if (e.key === 'Escape') { if (!$('#kbHelp').hidden) hideHelp(); if (TOUR.on) endTour(); return; }
    if (typing(e)) return;
    var k = e.key.toLowerCase(), A = NL.app;
    if (e.key === '?') { e.preventDefault(); $('#kbHelp').hidden ? showHelp() : hideHelp(); return; }
    if (k === 'n') { e.preventDefault(); A.go('lane'); A.setLaneMode && NL.state.laneMode !== 'belt' && A.setLaneMode('belt'); A.scanNext(); }
    else if (k === 'd') { e.preventDefault(); A.runDemo(); }
    else if (k === 't') { e.preventDefault(); startTour(); }
    else if (k === 'l') { e.preventDefault(); NL.i18n.set(NL.i18n.lang === 'ar' ? 'en' : 'ar'); }
    else if (k === 'm') { e.preventDefault(); setSound(!SND.on); if (SND.on) NL.cue('clear'); }
    else if (/^[1-9]$/.test(k)) {
      var links = document.querySelectorAll('#nav a'), a = links[+k - 1];
      if (a) { e.preventDefault(); A.go(a.dataset.screen); }
    }
  }

  // ---------------- judge tour ----------------
  var STEPS = [
    { screen: 'lane', mode: 'build', sel: '#builder', title: ['1 · Build a bag and hide drugs', '١ · ابنِ حقيبة وأخفِ المخدرات'],
      text: ['Add everyday items, hide drugs anywhere, then press “Scan with AI”. The trained model has never seen your bag.', 'أضف أغراضاً يومية وأخفِ المخدرات في أي مكان، ثم اضغط «افحص بالذكاء الاصطناعي». النموذج المدرّب لم يرَ حقيبتك من قبل.'] },
    { screen: 'desk', sel: '#pad', title: ['2 · Draw a pill imprint', '٢ · ارسم نقش قرص'],
      text: ['Draw two crescents ( ) on the tablet. The live imprint model recognises the Captagon-style logo in milliseconds.', 'ارسم هلالين ( ) على القرص. يتعرّف نموذج النقوش المباشر على شعار نمط الكبتاغون في أجزاء من الثانية.'] },
    { screen: 'challenge', sel: '#chCanvas', title: ['3 · Beat the AI', '٣ · تحدَّ الذكاء الاصطناعي'],
      text: ['Five fresh X-ray bags. Click where you think drugs are hidden, then compare your answer with the model.', 'خمس حقائب أشعة جديدة. انقر حيث تعتقد أن المخدرات مخفية، ثم قارن إجابتك بالنموذج.'] },
    { screen: 'dashboard', sel: '#map', title: ['4 · Open a case from the map', '٤ · افتح قضية من الخريطة'],
      text: ['Click any UAE entry point, then “Open new case here” – the model scans a new bag live and opens the case.', 'انقر على أي منفذ دخول إماراتي، ثم «فتح قضية جديدة هنا» – يفحص النموذج حقيبة جديدة مباشرة ويفتح القضية.'] },
    { screen: 'models', sel: '#benchM1', title: ['5 · Benchmark the model', '٥ · اختبر أداء النموذج'],
      text: ['Test M1 on 40 brand-new random bags, right here in your browser – no server, no internet.', 'اختبر M1 على 40 حقيبة عشوائية جديدة هنا في متصفحك – دون خادم ودون إنترنت.'] }
  ];
  var TOUR = { on: false, i: 0, raf: null };
  function startTour() {
    if (!$('#login').hidden) return;
    if (NL.state.demo) NL.app.runDemo(); // stop a running demo
    TOUR.on = true; TOUR.i = 0; $('#tour').hidden = false;
    $('#tourBtn').classList.remove('nudge');
    showStep();
    loop();
  }
  function endTour() {
    TOUR.on = false; $('#tour').hidden = true;
    if (TOUR.raf) cancelAnimationFrame(TOUR.raf);
  }
  function showStep() {
    var s = STEPS[TOUR.i], ar = NL.i18n && NL.i18n.lang === 'ar', L = ar ? 1 : 0;
    NL.app.go(s.screen);
    if (s.mode && NL.app.setLaneMode && NL.state.laneMode !== s.mode) NL.app.setLaneMode(s.mode);
    var el = $(s.sel);
    if (el) el.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    var last = TOUR.i === STEPS.length - 1;
    $('#tourCard').innerHTML =
      '<div class="tour-top" data-noi18n><span class="tour-n">' + (TOUR.i + 1) + ' / ' + STEPS.length + '</span>' +
      '<button class="info-x" type="button" id="tourX" aria-label="' + (ar ? 'إنهاء الجولة' : 'End tour') + '">&times;</button></div>' +
      '<b data-noi18n>' + s.title[L] + '</b><p data-noi18n>' + s.text[L] + '</p>' +
      '<div class="tour-dots">' + STEPS.map(function (x, j) { return '<i class="' + (j === TOUR.i ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      '<div class="row" data-noi18n><button class="btn" type="button" id="tourBack"' + (TOUR.i ? '' : ' disabled') + '>' + (ar ? 'السابق' : 'Back') + '</button>' +
      '<button class="btn primary" type="button" id="tourNext">' + (last ? (ar ? 'إنهاء' : 'Finish') : (ar ? 'التالي' : 'Next')) + '</button>' +
      '<button class="btn ghost" type="button" id="tourSkip">' + (ar ? 'تخطي' : 'Skip') + '</button></div>';
    var c = $('#tourCard'); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
    setTimeout(function () { var n = $('#tourNext'); if (n) n.focus({ preventScroll: true }); }, 50);
  }
  function place() {
    var s = STEPS[TOUR.i], el = $(s.sel), spot = $('#tourSpot'), card = $('#tourCard');
    if (!el) return;
    var r = el.getBoundingClientRect(), pad = 8;
    spot.style.left = (r.left - pad) + 'px'; spot.style.top = (r.top - pad) + 'px';
    spot.style.width = (r.width + pad * 2) + 'px'; spot.style.height = (r.height + pad * 2) + 'px';
    var cw = card.offsetWidth, ch = card.offsetHeight, vw = innerWidth, vh = innerHeight;
    var top = r.bottom + 16;
    if (top + ch > vh - 12) top = r.top - ch - 16;
    if (top < 12) top = Math.max(12, vh - ch - 12);
    var left = Math.min(Math.max(12, r.left + r.width / 2 - cw / 2), vw - cw - 12);
    card.style.top = top + 'px'; card.style.left = left + 'px';
  }
  function loop() { if (!TOUR.on) return; place(); TOUR.raf = requestAnimationFrame(loop); }

  // ---------------- wiring ----------------
  function init() {
    var actions = document.querySelector('.top-actions'), theme = $('#themeBtn');
    actions.insertBefore(Object.assign(document.createElement('button'), {
      className: 'btn tour-btn nudge', id: 'tourBtn', type: 'button',
      innerHTML: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V4"/><path d="M4 4h12l-2 4 2 4H4"/></svg><span>Judge tour</span>'
    }), $('#demoBtn'));
    var snd = Object.assign(document.createElement('button'), {
      className: 'btn ghost icon', id: 'soundBtn', type: 'button',
      innerHTML: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4z"/><path class="wave" d="M15.5 8.5a5 5 0 0 1 0 7"/><path class="wave" d="M18.5 5.5a9 9 0 0 1 0 13"/><path class="mute" d="M22 9l-6 6M16 9l6 6"/></svg>'
    });
    actions.insertBefore(snd, theme);
    var lang = Object.assign(document.createElement('button'), { className: 'btn ghost icon lang-btn', id: 'langBtn', type: 'button', textContent: 'ع' });
    actions.insertBefore(lang, theme);
    // login screen also gets a language switch
    var lb = Object.assign(document.createElement('button'), { className: 'btn ghost lang-login', id: 'langLogin', type: 'button', textContent: 'العربية / English' });
    $('#loginForm').appendChild(lb);
    document.body.insertAdjacentHTML('beforeend',
      '<div class="tour" id="tour" hidden><div class="tour-spot" id="tourSpot"></div><div class="tour-card" id="tourCard" role="dialog" aria-live="polite"></div></div>' +
      '<div class="kb-help" id="kbHelp" hidden></div>');
    $('.disclaimer').insertAdjacentHTML('beforeend', ' &middot; <button type="button" class="kb-link" id="kbLink">Press ? for keyboard shortcuts</button>');

    $('#tourBtn').addEventListener('click', startTour);
    snd.addEventListener('click', function () { setSound(!SND.on); if (SND.on) NL.cue('clear'); });
    lang.addEventListener('click', function () { NL.i18n.set(NL.i18n.lang === 'ar' ? 'en' : 'ar'); });
    lb.addEventListener('click', function (e) { e.preventDefault(); NL.i18n.set(NL.i18n.lang === 'ar' ? 'en' : 'ar'); });
    $('#kbLink').addEventListener('click', showHelp);
    $('#kbHelp').addEventListener('click', function (e) { if (e.target.id === 'kbHelp' || e.target.closest('.info-x')) hideHelp(); });
    $('#tourCard').addEventListener('click', function (e) {
      var id = e.target.closest('button') && e.target.closest('button').id;
      if (id === 'tourNext') { if (TOUR.i < STEPS.length - 1) { TOUR.i++; showStep(); } else endTour(); }
      else if (id === 'tourBack' && TOUR.i > 0) { TOUR.i--; showStep(); }
      else if (id === 'tourSkip' || id === 'tourX') endTour();
    });
    document.addEventListener('keydown', onKey);
    setSound(SND.on);
    NL.onLang = function () { if (TOUR.on) showStep(); if (!$('#kbHelp').hidden) showHelp(); if (NL.app && NL.state && $('#login').hidden) NL.app.go(NL.state.screen); };
    NL.i18n.init();
    setTimeout(function () { var b = $('#tourBtn'); if (b) b.classList.remove('nudge'); }, 12000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window.NL);
