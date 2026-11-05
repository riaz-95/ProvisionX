/* NarcoLens – alert cues, keyboard shortcuts, guided tour, user menu, UAE time and the AI Lab fan menu. */
(function (NL) {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var T = function (s) { return NL.i18n ? NL.i18n.t(s) : s; };
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  // ---------------- alert cue: visual flash + vibration on phones (no sound) ----------------
  // kind: 'flag' (AI raised an alert) or 'clear'. el: element to flash.
  NL.cue = function (kind, el) {
    if (el) { el.classList.remove('flash-flag', 'flash-ok'); void el.offsetWidth; el.classList.add(kind === 'flag' ? 'flash-flag' : 'flash-ok'); }
    if (kind === 'flag' && navigator.vibrate) { try { navigator.vibrate([90, 60, 140]); } catch (e) { } }
  };

  // ---------------- keyboard shortcuts ----------------
  var KEYS = [
    ['N', 'Scan the next bag on the belt', 'تفحّص الحقيبة التالية على السير'],
    ['D', 'Start / stop the full demo', 'تشغيل / إيقاف العرض الكامل'],
    ['T', 'Take a Tour', 'بدء الجولة التعريفية'],
    ['L', 'Switch Arabic / English', 'التبديل بين العربية والإنجليزية'],
    ['1 – 9', 'Jump to a screen in the menu', 'الانتقال إلى شاشة في القائمة'],
    ['0', 'Open network analytics', 'فتح تحليلات الشبكة'],
    ['A', 'Ask the case assistant', 'اسأل مساعد القضية'],
    ['E', 'Open the evidence pack', 'فتح حزمة الأدلة'],
    ['G', 'Open the AI Lab (live tests & challenge)', 'فتح مختبر الذكاء الاصطناعي'],
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
    if (e.key === 'Escape') { if (!$('#kbHelp').hidden) hideHelp(); if (TOUR.on) endTour(); closeUserMenu(true); toggleFan(false); return; }
    if (typing(e)) return;
    var k = e.key.toLowerCase(), A = NL.app;
    if (e.key === '?') { e.preventDefault(); $('#kbHelp').hidden ? showHelp() : hideHelp(); return; }
    if (k === 'n') { e.preventDefault(); A.go('lane'); A.setLaneMode && NL.state.laneMode !== 'belt' && A.setLaneMode('belt'); A.scanNext(); }
    else if (k === 'd') { e.preventDefault(); A.runDemo(); }
    else if (k === 't') { e.preventDefault(); startTour(); }
    else if (k === 'l') { e.preventDefault(); NL.i18n.set(NL.i18n.lang === 'ar' ? 'en' : 'ar'); }
    else if (k === 'g') { e.preventDefault(); toggleFan(); }
    else if (k === '0') { e.preventDefault(); A.go('network'); }
    else if (k === 'a') { e.preventDefault(); if (NL.state.screen !== 'case') A.go('case'); setTimeout(function () { A.caseAction('assist'); }, 60); }
    else if (k === 'e') { e.preventDefault(); var c = A.current(); if (c) { NL.reportCase = c.id; A.go('report'); } }
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

  // ---------------- UAE time ----------------
  function L(en, ar) { return NL.i18n && NL.i18n.lang === 'ar' ? ar : en; }
  function updateClock() {
    var c = $('#clock'); if (!c) return;
    c.innerHTML = '<span>' + L('UAE time', 'توقيت الإمارات') + '</span> <b>' + NL.uaeNow().toTimeString().slice(0, 5) + '</b>';
    c.title = L('Current time in the UAE (GST, UTC+4)', 'الوقت الحالي في الإمارات (توقيت الخليج، UTC+4)');
  }

  // ---------------- user menu (avatar) ----------------
  var ICON = {
    globe: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    moon: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    keys: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>',
    out: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>'
  };
  function isDark() { var t = document.documentElement.getAttribute('data-theme'); return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches; }
  // a settings row with a two-option segmented switch
  function seg(key, icon, label, opts, cur) {
    return '<div class="um-row">' + icon + '<span>' + label + '</span><div class="um-seg" role="radiogroup" aria-label="' + label + '">' +
      opts.map(function (o) { return '<button type="button" role="radio" data-um="' + key + '" data-v="' + o[0] + '" aria-checked="' + (o[0] === cur) + '"' + (o[0] === 'ar' ? ' lang="ar"' : '') + '>' + o[1] + '</button>'; }).join('') + '</div></div>';
  }
  function renderUserMenu() {
    var o = NL.officer, ar = NL.i18n && NL.i18n.lang === 'ar', name = ar && NL.AR[o.name] ? NL.AR[o.name] : o.name;
    $('#umAvatar').textContent = o.initials;
    $('#userBtn').title = name + ' · ' + L('account & settings', 'الحساب والإعدادات');
    $('#userMenu').innerHTML =
      '<div class="um-head"><span class="avatar">' + o.initials + '</span><div><b>' + name + '</b><small>' + (o.role === 'supervisor' ? L('Duty Supervisor · Dubai Customs (demo)', 'مشرف مناوب · جمارك دبي (تجريبي)') : L('Pharmaceutical Control Inspector · MOHAP (demo)', 'مفتشة رقابة دوائية · وزارة الصحة (تجريبي)')) + '</small><small>' + o.id + '</small></div></div>' +
      seg('lang', ICON.globe, L('Language', 'اللغة'), [['en', 'English'], ['ar', 'العربية']], ar ? 'ar' : 'en') +
      seg('theme', ICON.moon, L('Theme', 'المظهر'), [['light', L('Light', 'فاتح')], ['dark', L('Dark', 'داكن')]], isDark() ? 'dark' : 'light') +
      '<button type="button" role="menuitem" data-um="keys">' + ICON.keys + '<span>' + L('Keyboard shortcuts', 'اختصارات لوحة المفاتيح') + '</span><em class="um-v">?</em></button>' +
      '<hr><button type="button" role="menuitem" class="um-out" data-um="out">' + ICON.out + '<span>' + L('Sign out', 'تسجيل الخروج') + '</span></button>';
  }
  function openUserMenu() { renderUserMenu(); $('#userMenu').hidden = false; $('#userBtn').setAttribute('aria-expanded', 'true'); var f = $('#userMenu button'); if (f) f.focus(); }
  function closeUserMenu(focusBtn) { var m = $('#userMenu'); if (!m || m.hidden) return; m.hidden = true; $('#userBtn').setAttribute('aria-expanded', 'false'); if (focusBtn) $('#userBtn').focus(); }

  // ---------------- AI Lab fan menu ----------------
  function toggleFan(force) {
    var fan = $('#fan'); if (!fan) return;
    var open = force === undefined ? !fan.classList.contains('open') : force;
    fan.classList.toggle('open', open); $('#fanBtn').setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function renderFan() {
    $('#fanLbl').innerHTML = '<b>' + L('AI Lab', 'مختبر الذكاء') + '</b><small>' + L('Test & play', 'اختبر والعب') + '</small>';
    $('#fanBtn').title = L('AI Lab – test the live models or challenge the AI', 'مختبر الذكاء – اختبر النماذج المباشرة أو تحدَّ الذكاء الاصطناعي');
    $('#fanBtn').setAttribute('aria-label', $('#fanBtn').title);
    $('#fanModels span').textContent = L('AI Models · live test', 'نماذج الذكاء · اختبار مباشر');
    $('#fanChallenge span').textContent = L('Challenge · You vs AI', 'التحدي · أنت ضد الذكاء');
    var sc = NL.state && NL.state.screen;
    $('#fan').classList.toggle('active', sc === 'models' || sc === 'challenge');
    ['models', 'challenge'].forEach(function (k) { var el = $('#fan [data-fango="' + k + '"]'); if (sc === k) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
  }

  // ---------------- wiring ----------------
  function init() {
    var actions = document.querySelector('.top-actions'), theme = $('#themeBtn');
    actions.insertBefore(Object.assign(document.createElement('button'), {
      className: 'btn tour-btn nudge', id: 'tourBtn', type: 'button', title: 'Learn how to use NarcoLens, step by step.',
      innerHTML: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg><span>Take a Tour</span><span class="tip" role="tooltip">Learn how to use NarcoLens, step by step.</span>'
    }), $('#demoBtn'));
    // user avatar menu (language, theme, shortcuts, sign out) replaces the separate top-bar buttons
    var um = document.createElement('div'); um.className = 'um'; um.id = 'userMenuWrap'; um.setAttribute('data-noi18n', '');
    um.innerHTML = '<button type="button" class="um-btn" id="userBtn" aria-haspopup="menu" aria-expanded="false"><span class="avatar" id="umAvatar">MN</span><svg class="um-caret" viewBox="0 0 10 6" width="10" height="6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button><div class="um-pop" id="userMenu" role="menu" hidden></div>';
    actions.appendChild(um);
    // AI Lab fan menu at the bottom-left of the side menu
    var fan = document.createElement('div'); fan.className = 'fan'; fan.id = 'fan'; fan.setAttribute('data-noi18n', '');
    fan.innerHTML =
      '<div class="fan-items">' +
      '<button type="button" class="fan-item" id="fanModels" data-fango="models" style="--i:0"><i><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/><path d="M10 12l1.5 1.5L14 10.5"/></svg></i><span></span></button>' +
      '<button type="button" class="fan-item" id="fanChallenge" data-fango="challenge" style="--i:1"><i><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg></i><span></span></button>' +
      '</div>' +
      '<button type="button" class="fan-btn" id="fanBtn" aria-expanded="false" aria-controls="fan">' +
      '<span class="lab-orb" aria-hidden="true"><svg viewBox="0 0 48 48" width="46" height="46">' +
      '<defs><radialGradient id="orbG" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#5eead4"/><stop offset=".55" stop-color="#14b8a6"/><stop offset="1" stop-color="#6d28d9"/></radialGradient></defs>' +
      '<circle cx="24" cy="24" r="17" fill="url(#orbG)"/>' +
      '<g class="lab-net" stroke="#ecfeff" stroke-width="1.6" stroke-linecap="round" opacity=".95"><path d="M17 19l7 7 7-9M24 26l-6 6M24 26l7 6"/></g>' +
      '<g class="lab-nodes" fill="#fff"><circle cx="17" cy="19" r="2.3"/><circle cx="31" cy="17" r="2.3"/><circle cx="24" cy="26" r="2.8"/><circle cx="18" cy="32" r="2.1"/><circle cx="31" cy="32" r="2.1"/></g>' +
      '<g class="lab-orbit"><circle cx="24" cy="24" r="22" fill="none" stroke="#2dd4bf" stroke-width="1" stroke-dasharray="2 4" opacity=".7"/><circle cx="24" cy="2" r="3.2" fill="#facc15"/><circle cx="24" cy="46" r="3.2" fill="#f472b6"/></g>' +
      '<path class="lab-spark" d="M40 6l1.2 3 3 1.2-3 1.2L40 14.4l-1.2-3-3-1.2 3-1.2z" fill="#fde68a"/>' +
      '</svg></span><span class="fan-lbl" id="fanLbl"></span></button>';
    // on phones the sidebar's glass blur would trap position:fixed, so the fan floats from <body>
    var mq = window.matchMedia('(max-width: 900px)');
    var placeFan = function () { var host = mq.matches ? document.body : document.querySelector('.sidebar'); if (fan.parentNode !== host) host.appendChild(fan); };
    placeFan(); if (mq.addEventListener) mq.addEventListener('change', placeFan); else mq.addListener(placeFan);
    // login screen also gets a language switch
    var lb = Object.assign(document.createElement('button'), { className: 'btn ghost lang-login', id: 'langLogin', type: 'button', textContent: 'العربية / English' });
    $('#loginForm').appendChild(lb);
    document.body.insertAdjacentHTML('beforeend',
      '<div class="tour" id="tour" hidden><div class="tour-spot" id="tourSpot"></div><div class="tour-card" id="tourCard" role="dialog" aria-live="polite"></div></div>' +
      '<div class="kb-help" id="kbHelp" hidden></div>');
    $('.disclaimer').insertAdjacentHTML('beforeend', ' &middot; <button type="button" class="kb-link" id="kbLink">Press ? for keyboard shortcuts</button>');

    $('#tourBtn').addEventListener('click', startTour);
    $('#userBtn').addEventListener('click', function (e) { e.stopPropagation(); $('#userMenu').hidden ? openUserMenu() : closeUserMenu(); });
    $('#userMenu').addEventListener('click', function (e) {
      e.stopPropagation();
      var b = e.target.closest('[data-um]'); if (!b) return;
      var k = b.dataset.um;
      if (b.getAttribute('aria-checked') === 'true') return;
      if (k === 'lang') { NL.i18n.set(b.dataset.v); renderUserMenu(); var r = $('#userMenu [data-um="lang"][aria-checked="true"]'); if (r) r.focus(); }
      else if (k === 'theme') { $('#themeBtn').click(); renderUserMenu(); var t = $('#userMenu [data-um="theme"][aria-checked="true"]'); if (t) t.focus(); }
      else if (k === 'keys') { closeUserMenu(); showHelp(); }
      else if (k === 'out') { closeUserMenu(); $('#signOut').click(); }
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#userMenuWrap, #themeBtn')) closeUserMenu();
      if (!e.target.closest('#fan')) toggleFan(false);
    });
    $('#fanBtn').addEventListener('click', function () { toggleFan(); });
    fan.addEventListener('click', function (e) { var b = e.target.closest('[data-fango]'); if (b) { toggleFan(false); NL.app.go(b.dataset.fango); renderFan(); } });
    // keep avatar + labels in sync with sign-in, language and screen changes
    new MutationObserver(function () { renderUserMenu(); }).observe($('#offName'), { childList: true, characterData: true, subtree: true });
    document.addEventListener('click', function (e) { if (e.target.closest('#nav a, [data-go], .brand')) setTimeout(renderFan, 0); });
    updateClock(); setInterval(updateClock, 15000);
    renderUserMenu(); renderFan();
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
    NL.onLang = function () { updateClock(); renderFan(); renderUserMenu(); if (TOUR.on) showStep(); if (!$('#kbHelp').hidden) showHelp(); if (NL.app && NL.state && $('#login').hidden) NL.app.go(NL.state.screen); };
    NL.i18n.init();
    setTimeout(function () { var b = $('#tourBtn'); if (b) b.classList.remove('nudge'); }, 12000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window.NL);
