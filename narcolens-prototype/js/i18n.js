/* NarcoLens – Arabic / English interface switch.
   A dictionary-based translator that watches the DOM: every text node (and title / aria-label /
   placeholder) whose English text is in the dictionary is shown in Arabic, and restored when the
   user switches back. The page direction flips to right-to-left. Data such as tags, codes and
   numbers stays as-is. */
(function (NL) {
  'use strict';
  var AR = {
    // brand, navigation
    'AI drug-detection network': 'شبكة كشف المخدرات بالذكاء الاصطناعي',
    'Command Dashboard': 'لوحة القيادة',
    'Live Lane · X-ray Vision': 'المسار المباشر · الرؤية بالأشعة',
    'Inspection Case · Fusion': 'قضية التفتيش · الدمج',
    'Inspection Desk · Pills & Labels': 'مكتب التفتيش · الأقراص والملصقات',
    'Hyperspectral ID': 'التعرّف الطيفي الفائق',
    'Novel-Drug Predictor': 'متنبّئ المخدرات الجديدة',
    'Learning Loop': 'حلقة التعلّم',
    'AI Models · live test': 'نماذج الذكاء الاصطناعي · اختبار مباشر',
    'Challenge · You vs AI': 'التحدي · أنت ضد الذكاء الاصطناعي',
    'Network analytics': 'تحليلات الشبكة',
    'Supervisor review': 'مراجعة المشرف', 'Inspector': 'مفتش', 'Supervisor': 'مشرف',
    'Supervisor Review · Approvals & Audit': 'مراجعة المشرف · الاعتمادات والتدقيق',
    'Sign off seizures, review cases where officers overrode the AI, and audit every action – human oversight built into the workflow.': 'اعتماد الضبطيات، ومراجعة القضايا التي خالف فيها الضباط الذكاء الاصطناعي، وتدقيق كل إجراء – رقابة بشرية مدمجة في سير العمل.',
    'Evidence Pack · Court-ready Report': 'حزمة الأدلة · تقرير جاهز للمحكمة',
    'Everything NarcoLens recorded about this case in one printable document, with the chain of custody.': 'كل ما سجّله NarcoLens عن هذه القضية في مستند واحد قابل للطباعة، مع سلسلة الحيازة.',
    'Approvals & audit from live case data': 'الاعتمادات والتدقيق من بيانات القضايا المباشرة', 'Demo supervisor account': 'حساب مشرف تجريبي',
    "Generated from this case's evidence": 'مُولّد من أدلة هذه القضية',
    '📄 Evidence pack': '📄 حزمة الأدلة', '💬 Ask NarcoLens': '💬 اسأل NarcoLens',
    '🖨 Print / Save as PDF': '🖨 طباعة / حفظ PDF', '← Back to case': '→ العودة إلى القضية',
    'Khalid Al Mansouri': 'خالد المنصوري', 'Supervisor · DXB T3 Command': 'مشرف · غرفة قيادة مطار دبي 3',
    'Network Analytics · Linked Cases': 'تحليلات الشبكة · القضايا المترابطة',
    'Cases linked by sender, route pattern and concealment method. Clusters across entry points reveal smuggling networks, not just single bags.': 'قضايا مترابطة حسب المرسل ونمط المسار وأسلوب الإخفاء. تكشف المجموعات عبر المنافذ شبكات التهريب، لا الحقائب المنفردة فقط.',
    'Link analysis · live algorithm': 'تحليل الروابط · خوارزمية مباشرة', 'Historical cases · simulated': 'قضايا سابقة · محاكاة',
    // screen titles
    'Live Lane · M1 X-ray Vision': 'المسار المباشر · M1 الرؤية بالأشعة السينية',
    'Inspection Case · M5 Risk Fusion': 'قضية التفتيش · M5 دمج المخاطر',
    'Inspection Desk · M2 Pills, Vials & Labels': 'مكتب التفتيش · M2 الأقراص والقوارير والملصقات',
    'Hyperspectral ID · M3 Substance Identification': 'التعرّف الطيفي الفائق · M3 تحديد المادة',
    'Novel-Drug Predictor · M4': 'متنبّئ المخدرات الجديدة · M4',
    'Learning Loop · Federated Retraining': 'حلقة التعلّم · إعادة التدريب الاتحادي',
    'Challenge · You vs the AI': 'التحدي · أنت ضد الذكاء الاصطناعي',
    'AI Models · Live Test': 'نماذج الذكاء الاصطناعي · اختبار مباشر',
    // screen subtitles
    'Network-wide view of every UAE entry point running NarcoLens: what was screened, what the AI flagged, and what officers are inspecting now.': 'عرض شامل لكل منافذ الدخول في الإمارات العاملة بنظام NarcoLens: ما تم فحصه، وما نبّه إليه الذكاء الاصطناعي، وما يفتّشه الضباط الآن.',
    'Edge AI reads each scan from the existing X-ray machine in under a second and highlights hidden organic masses for the operator.': 'يقرأ الذكاء الاصطناعي الطرفي كل صورة من جهاز الأشعة السينية الحالي في أقل من ثانية، ويُبرز الكتل العضوية المخفية للمشغّل.',
    'One case per bag tag. Every module adds evidence to it; the fusion engine explains its score and recommends an action. The officer decides.': 'قضية واحدة لكل بطاقة أمتعة. تضيف كل وحدة أدلتها إليها، ويشرح محرك الدمج درجته ويوصي بإجراء. القرار للضابط.',
    'The officer photographs what is found. AI reads pill imprints, vials and Arabic / English labels, and checks them against the product registry.': 'يصوّر الضابط ما يُعثر عليه. يقرأ الذكاء الاصطناعي نقوش الأقراص والقوارير والملصقات العربية والإنجليزية، ويطابقها مع سجل المنتجات.',
    "A hyperspectral camera sees chemistry through packaging. AI matches every pixel's spectrum to the drug library – without opening the pouch.": 'ترى الكاميرا فائقة الطيف التركيب الكيميائي عبر التغليف. يطابق الذكاء الاصطناعي طيف كل بكسل مع مكتبة المخدرات – دون فتح الكيس.',
    'Predicts the spectral fingerprint of new synthetic-drug variants before they are ever seized, and pushes them into the M3 library.': 'يتنبّأ بالبصمة الطيفية لأنواع المخدرات الاصطناعية الجديدة قبل ضبطها لأول مرة، ويضيفها إلى مكتبة M3.',
    'Every confirmed seizure makes every site smarter. Models train locally; only model updates – never raw images – leave a site.': 'كل ضبطية مؤكدة تجعل كل موقع أذكى. تتدرّب النماذج محلياً، ولا يغادر الموقع إلا تحديثات النموذج – وليس الصور الخام أبداً.',
    'Five random X-ray bags the model has never seen. Click where you think drugs are hidden, then see the live M1 heatmap and the ground truth.': 'خمس حقائب عشوائية بالأشعة السينية لم يرها النموذج من قبل. انقر حيث تعتقد أن المخدرات مخفية، ثم شاهد خريطة M1 الحرارية والحقيقة الفعلية.',
    'The trained models behind M1 and M2, their held-out test results, and buttons to test them on brand-new data right now – in this browser.': 'النماذج المدرّبة وراء M1 وM2، ونتائج اختبارها على بيانات لم ترها، وأزرار لاختبارها على بيانات جديدة كلياً الآن – داخل هذا المتصفح.',
    // badges
    'Simulated network data': 'بيانات شبكة محاكاة',
    'M1 trained CNN · running in this browser': 'شبكة M1 العصبية المدرّبة · تعمل في هذا المتصفح',
    'Fusion · live formula': 'الدمج · معادلة مباشرة',
    'M5 fusion · live formula': 'دمج M5 · معادلة مباشرة',
    'Evidence from live M1 / M2 / M3': 'أدلة من M1 / M2 / M3 المباشرة',
    'M2 imprint CNN · live': 'شبكة نقوش M2 · مباشرة',
    'Packaging detection & OCR · simulated': 'كشف التغليف وقراءة النصوص · محاكاة',
    'Spectral matching + unmixing · live': 'المطابقة الطيفية وفك الخلائط · مباشرة',
    'Camera spectra · simulated': 'أطياف الكاميرا · محاكاة',
    'M4 predictions · simulated': 'تنبؤات M4 · محاكاة',
    'Federated round · illustration': 'جولة اتحادية · توضيح',
    'Benchmarks run live in this browser': 'الاختبارات تعمل مباشرة في هذا المتصفح',
    'M1 trained CNN · live': 'شبكة M1 المدرّبة · مباشرة',
    'Fresh random bags every round': 'حقائب عشوائية جديدة في كل جولة',
    'Live model': 'نموذج مباشر', 'Live algorithm': 'خوارزمية مباشرة', 'Simulated': 'محاكاة',
    'Live measurement': 'قياس مباشر', 'Manual step': 'خطوة يدوية',
    // top bar
    '▶ Run full demo': '▶ تشغيل العرض الكامل', '■ Stop demo': '■ إيقاف العرض',
    'DXB local time': 'توقيت دبي المحلي', 'Judge tour': 'جولة المحكّمين',
    'Toggle light / dark theme': 'تبديل الوضع الفاتح / الداكن', 'Toggle theme': 'تبديل المظهر',
    'Sound alerts on': 'التنبيهات الصوتية مفعّلة', 'Sound alerts off': 'التنبيهات الصوتية متوقفة',
    'Sign out': 'تسجيل الخروج', 'Simulated local time at Dubai': 'التوقيت المحلي المحاكى في دبي',
    // dashboard
    'Bags & parcels screened today': 'الحقائب والطرود المفحوصة اليوم', 'AI flags raised': 'تنبيهات الذكاء الاصطناعي',
    'Seizures confirmed (YTD)': 'الضبطيات المؤكدة (منذ بداية العام)', 'Extra false alarms': 'الإنذارات الكاذبة الإضافية',
    'Time to identify substance': 'زمن تحديد المادة', 'across 7 entry points': 'عبر 7 منافذ دخول',
    'of items screened': 'من المواد المفحوصة', 'lab-confirmed': 'مؤكدة مخبرياً', 'target ≤ 5% per lane': 'الهدف ≤ 5% لكل مسار',
    'vs. ~3 days lab turnaround': 'مقابل ~3 أيام في المختبر',
    'UAE entry points running NarcoLens': 'منافذ الدخول الإماراتية العاملة بنظام NarcoLens', 'Click a site to zoom in': 'انقر على موقع للتكبير',
    '● Live': '● مباشر', 'Bag / parcel cleared': 'حقيبة / طرد مُجاز', 'AI flag raised': 'تنبيه من الذكاء الاصطناعي',
    'Inspection queue': 'قائمة التفتيش', 'Live event log': 'سجل الأحداث المباشر', 'No open cases': 'لا توجد قضايا مفتوحة',
    'How the five modules work together': 'كيف تعمل الوحدات الخمس معاً', 'Click a step to open it': 'انقر على خطوة لفتحها',
    'Pre-arrival risk score': 'درجة المخاطر قبل الوصول', 'route & booking patterns': 'أنماط المسار والحجز',
    'X-ray vision': 'الرؤية بالأشعة السينية', 'edge AI on existing scanner': 'ذكاء اصطناعي طرفي على الماسح الحالي',
    'One inspection case': 'قضية تفتيش واحدة', 'per bag tag · M5 fuses evidence': 'لكل بطاقة أمتعة · M5 يدمج الأدلة',
    'Pills, vials & labels': 'الأقراص والقوارير والملصقات', 'officer photo + OCR': 'صورة الضابط + قراءة النص',
    'chemistry through packaging': 'الكيمياء عبر التغليف', 'Novel-drug predictor': 'متنبّئ المخدرات الجديدة',
    'feeds the M3 library': 'يغذّي مكتبة M3', 'Officer + lab confirm': 'تأكيد الضابط والمختبر', 'federated retraining': 'إعادة تدريب اتحادي',
    'Screened today': 'المفحوص اليوم', 'AI flags': 'التنبيهات', 'Open cases': 'القضايا المفتوحة',
    'Open new case here': 'فتح قضية جديدة هنا', 'Zoom out': 'تصغير', 'No events yet today.': 'لا أحداث اليوم بعد.',
    'Awaiting inspection': 'بانتظار التفتيش',
    // map
    'DXB Airport': 'مطار دبي', 'Sharjah Cargo': 'الشارقة للشحن', 'Postal & Courier Hub': 'مركز البريد والشحن السريع',
    'Al Maktoum (DWC)': 'مطار آل مكتوم (DWC)', 'Jebel Ali Port': 'ميناء جبل علي', 'Khalifa Port': 'ميناء خليفة', 'Abu Dhabi Airport': 'مطار أبوظبي',
    'Arabian Gulf': 'الخليج العربي', 'Gulf of Oman': 'خليج عُمان', 'OMAN': 'عُمان', 'SAUDI ARABIA': 'السعودية', 'UNITED ARAB EMIRATES': 'الإمارات العربية المتحدة',
    'United Arab Emirates': 'الإمارات العربية المتحدة', 'Oman': 'عُمان', 'Saudi Arabia': 'السعودية', 'Qatar': 'قطر', 'Iran': 'إيران',
    // event log
    'Bag cleared': 'حقيبة مُجازة', 'Container scan cleared': 'فحص حاوية مُجاز', 'Parcel cleared': 'طرد مُجاز', 'Air-cargo pallet cleared': 'منصة شحن جوي مُجازة',
    'Gantry 3': 'البوابة 3', 'Courier line 1': 'خط الشحن 1',
    // lane
    'Belt · demo bags': 'السير · حقائب تجريبية', 'Build your own bag': 'ابنِ حقيبتك', 'Upload a scan': 'ارفع صورة مسح',
    'Add everyday items': 'أضف أغراضاً يومية', 'Hide drugs': 'أخفِ المخدرات', 'Randomise bag': 'حقيبة عشوائية', 'Empty bag': 'إفراغ الحقيبة',
    'Drag items to move them. The AI only sees pixels – never item names.': 'اسحب الأغراض لتحريكها. الذكاء الاصطناعي يرى البكسلات فقط – لا أسماء الأغراض.',
    '+ Clothes': '+ ملابس', '+ Shoes': '+ أحذية', '+ Laptop': '+ حاسوب محمول', '+ Toiletries': '+ أدوات استحمام', '+ Charger cable': '+ كابل شاحن',
    '+ Box of dates': '+ علبة تمر', '+ Books': '+ كتب', '+ Keys & coins': '+ مفاتيح وعملات', '+ Protein tub (clean)': '+ علبة بروتين (سليمة)',
    '+ Wrapped packet': '+ عبوة ملفوفة', '+ Packets in lining': '+ عبوات في البطانة', '+ Protein tub (block)': '+ علبة بروتين (كتلة)',
    '+ Shirt with dense buttons': '+ قميص بأزرار كثيفة', '+ Vial cluster': '+ مجموعة قوارير', '+ False bottom slab': '+ قاع مزيّف',
    'Choose an image…': 'اختر صورة…',
    'Experimental: the model was trained on synthetic dual-energy scans, so real X-ray photos are outside its training data. Results are shown as-is.': 'تجريبي: دُرّب النموذج على صور اصطناعية ثنائية الطاقة، لذا فإن صور الأشعة الحقيقية خارج بيانات تدريبه. تُعرض النتائج كما هي.',
    'X-ray ·': 'الأشعة السينية ·', 'select a bag': 'اختر حقيبة', 'your bag (not scanned yet)': 'حقيبتك (لم تُفحص بعد)', 'your bag': 'حقيبتك',
    'uploaded image': 'صورة مرفوعة', 'upload': 'رفع', 'AI heatmap': 'الخريطة الحرارية', 'Ground truth': 'الحقيقة الفعلية',
    'Scan next bag': 'فحص الحقيبة التالية', 'Auto belt: off': 'السير الآلي: متوقف', 'Auto belt: on': 'السير الآلي: يعمل', 'Scan with AI': 'افحص بالذكاء الاصطناعي',
    'M1 model inference in this browser:': 'زمن استدلال نموذج M1 في هذا المتصفح:', 'Organic': 'عضوي', 'Mixed': 'مختلط', 'Metal': 'معدن',
    'Lane decision': 'قرار المسار', 'FLAGGED': 'مُنبَّه', 'RE-SCAN': 'إعادة فحص', 'CLEAR': 'مُجاز', 'NOT AN X-RAY': 'ليست صورة أشعة',
    '/ 100 fused risk': '/ 100 مخاطر مدمجة', '/ 100 M1 score': '/ 100 درجة M1', '/ 100': '/ 100',
    'Bag tag': 'بطاقة الأمتعة', 'Route': 'المسار', 'Pre-arrival': 'قبل الوصول', 'M1 model': 'نموذج M1',
    'AI result · your bag': 'نتيجة الذكاء الاصطناعي · حقيبتك', 'AI result · uploaded image': 'نتيجة الذكاء الاصطناعي · صورة مرفوعة',
    'Ground truth (hidden from the AI):': 'الحقيقة الفعلية (مخفية عن الذكاء الاصطناعي):', '✓ correct': '✓ صحيح', '✗ wrong': '✗ خطأ', 'clean bag': 'حقيبة سليمة',
    'AI flagged it': 'نبّه إليها الذكاء الاصطناعي', 'AI did not flag it': 'لم ينبّه إليها الذكاء الاصطناعي', 'No anomaly': 'لا يوجد شذوذ',
    'Open bag · secondary inspection': 'افتح الحقيبة · تفتيش ثانوي', 'Re-scan at second angle': 'إعادة الفحص من زاوية ثانية', 'Clear': 'إجازة',
    'Seizure recommended': 'يوصى بالضبط', 'Scanning…': 'جارٍ الفحص…',
    // case
    'Case': 'القضية', 'Container tag': 'بطاقة الحاوية', 'Parcel tag': 'بطاقة الطرد', 'Site': 'الموقع', 'Lane': 'المسار', 'Status': 'الحالة',
    'Switch case': 'تبديل القضية', 'Evidence timeline': 'الخط الزمني للأدلة', 'every module writes to the same case': 'كل وحدة تكتب في القضية نفسها',
    'M5 fusion score': 'درجة دمج M5', 'explainable': 'قابلة للتفسير',
    'Opened · at inspection desk': 'مفتوحة · في مكتب التفتيش', 'Seized · lab confirmation pending': 'مضبوطة · بانتظار تأكيد المختبر',
    'Seizure confirmed by lab': 'ضبطية مؤكدة مخبرياً', 'Cleared by officer': 'أجازها الضابط',
    'Pre-arrival pattern': 'نمط ما قبل الوصول', 'M1 · X-ray anomaly': 'M1 · شذوذ الأشعة', 'M2 · Package & imprint check': 'M2 · فحص العبوة والنقش',
    'M3 · Spectral substance match': 'M3 · مطابقة المادة طيفياً', '· route, booking timing, weight': '· المسار وتوقيت الحجز والوزن',
    '· edge vision model': '· نموذج رؤية طرفي', '· officer photo + OCR': '· صورة الضابط + قراءة النص', '· hyperspectral camera': '· كاميرا فائقة الطيف',
    'pending': 'قيد الانتظار', 'Package & imprint check': 'فحص العبوة والنقش', 'Hyperspectral substance ID': 'تحديد المادة طيفياً',
    'Open bag → inspection desk': 'افتح الحقيبة ← مكتب التفتيش', 'Back to inspection desk': 'العودة إلى مكتب التفتيش', 'Re-scan': 'إعادة الفحص',
    'Seize · send sample to lab': 'ضبط · إرسال عينة للمختبر', 'Go to learning loop →': 'إلى حلقة التعلّم ←',
    '⚖ Risk factors use bag, route, booking-timing and sensor evidence only. Nationality, ethnicity, religion and gender are never model inputs. The officer makes every decision; the lab result is the legal proof.': '⚖ تعتمد عوامل المخاطر على أدلة الحقيبة والمسار وتوقيت الحجز والمستشعرات فقط. لا تُستخدم الجنسية أو العرق أو الدين أو الجنس مدخلاتٍ للنموذج أبداً. الضابط يتخذ كل قرار، ونتيجة المختبر هي الدليل القانوني.',
    'What-if: adjust the evidence and watch the decision change': 'ماذا لو: عدّل الأدلة وراقب تغيّر القرار', 'Reset to case': 'إعادة إلى القضية',
    'What-if fused score': 'الدرجة المدمجة الافتراضية',
    // desk
    'Supplement tub': 'علبة مكمل غذائي', 'Loose tablets': 'أقراص سائبة', 'Peptide vials': 'قوارير ببتيد', 'Mixed tablets': 'أقراص مختلطة',
    'Officer photo': 'صورة الضابط', 'Tablet camera · Inspection desk 2': 'كاميرا الجهاز اللوحي · مكتب التفتيش 2', 'Analyse photo': 'تحليل الصورة',
    'Attach to case': 'إرفاق بالقضية', 'M2 result': 'نتيجة M2', 'Tablets in this photo → M2 imprint model': 'الأقراص في هذه الصورة ← نموذج النقوش M2',
    'Imprint pad · test the model yourself': 'لوحة النقش · اختبر النموذج بنفسك', 'Random example': 'مثال عشوائي', 'Upload close-up': 'رفع صورة مقرّبة',
    'Forensic physical profile': 'الملف الفيزيائي الجنائي', 'Count': 'العدد', 'Diameter': 'القطر', 'Shape': 'الشكل', 'Colour': 'اللون',
    'Logo / imprint': 'الشعار / النقش', 'Score line': 'خط التقسيم', 'Thickness · weight': 'السماكة · الوزن',
    'Twin-crescent': 'هلالان', 'Plain': 'سادة', 'Letter stamp': 'ختم حرفي',
    'Twin-crescent (Captagon-style logo)': 'هلالان (شعار على نمط الكبتاغون)', 'Plain tablet, no imprint': 'قرص سادة بلا نقش',
    'Score line (typical licensed medicine)': 'خط تقسيم (دواء مرخّص عادةً)', 'Letter / number stamp': 'ختم حرف / رقم',
    'Packaging detection & OCR': 'كشف التغليف وقراءة النصوص', 'Waiting for your drawing…': 'بانتظار رسمك…',
    // hyperspectral
    'Hyperspectral image · false colour': 'صورة فائقة الطيف · ألوان كاذبة', 'AI substance map': 'خريطة المواد',
    'Auto-scan': 'مسح تلقائي', 'Tip: click any pixel to see its spectrum': 'تلميح: انقر أي بكسل لرؤية طيفه',
    'Spectrum vs. drug library': 'الطيف مقابل مكتبة المخدرات', 'no pixel selected': 'لم يُحدَّد بكسل', 'Selected pixel': 'البكسل المحدد',
    'Best library match': 'أفضل تطابق في المكتبة', 'Sealed tub (case bag)': 'علبة مغلقة (حقيبة القضية)',
    'Clean supplement (control)': 'مكمل سليم (عيّنة ضابطة)', 'Cut powder (zip bag)': 'مسحوق مغشوش (كيس بسحّاب)',
    // predictor
    'Predicted synthetic-drug variants': 'أنواع المخدرات الاصطناعية المتوقّعة', 'Run prediction cycle': 'تشغيل دورة التنبؤ', 'How M4 works': 'كيف يعمل M4',
    'Watch the trend.': 'راقب الاتجاه.', 'Predict the fingerprint.': 'تنبّأ بالبصمة.', 'Validate.': 'تحقّق.', 'Push to M3.': 'أرسل إلى M3.',
    'Seizure data, lab results and international early-warning feeds show which drug families are mutating.': 'تُظهر بيانات الضبطيات ونتائج المختبر وتنبيهات الإنذار المبكر الدولية أيّ عائلات المخدرات تتحوّر.',
    "A graph neural network predicts the spectrum a new variant would produce, from its family's known chemistry.": 'تتنبّأ شبكة عصبية بيانية بالطيف الذي سينتجه النوع الجديد، انطلاقاً من الكيمياء المعروفة لعائلته.',
    'Forensic chemists approve each prediction against reference samples.': 'يعتمد الكيميائيون الجنائيون كل تنبؤ مقارنةً بعينات مرجعية.',
    'Every hyperspectral camera in the network can now recognise the variant – before its first seizure.': 'تستطيع كل كاميرا فائقة الطيف في الشبكة الآن التعرّف على النوع – قبل أول ضبطية له.',
    'M3 library size': 'حجم مكتبة M3', 'Predicted by M4': 'تنبأ بها M4', 'Caught before first seizure': 'رُصدت قبل أول ضبطية',
    'substances & variants': 'مواد وأنواع', 'validated variants in library': 'أنواع معتمدة في المكتبة', 'variants recognised on first appearance': 'أنواع رُصدت عند أول ظهور',
    'Variant': 'النوع', 'Family': 'العائلة', 'Why predicted': 'سبب التنبؤ', 'Predicted fingerprint': 'البصمة المتوقعة', 'Conf.': 'الثقة', 'Seen?': 'رُصد؟',
    '✓ In M3 library': '✓ في مكتبة M3', 'Lab validation': 'تحقق مخبري', 'Predicting': 'جارٍ التنبؤ',
    'Chemical structures are withheld in this interface. Predictions are used only to extend the detection library and are validated against lab reference samples before going live.': 'تُحجب البُنى الكيميائية في هذه الواجهة. تُستخدم التنبؤات فقط لتوسيع مكتبة الكشف، وتُعتمد مقابل عينات مرجعية مخبرية قبل تفعيلها.',
    // learning loop
    'Federated network': 'الشبكة الاتحادية', 'Lab confirms → retrain network': 'المختبر يؤكد ← إعادة تدريب الشبكة', 'The loop': 'الحلقة',
    'Model performance': 'أداء النموذج', 'Officer confirms the seizure in the case': 'يؤكد الضابط الضبطية في القضية',
    'Forensic lab confirms the substance (legal proof)': 'يؤكد المختبر الجنائي المادة (دليل قانوني)',
    'Each site trains on its own confirmed cases – images never leave the site': 'يتدرّب كل موقع على قضاياه المؤكدة – ولا تغادر الصور الموقع أبداً',
    'Only encrypted model updates go to the NarcoLens core': 'تُرسل تحديثات النموذج المشفّرة فقط إلى نواة NarcoLens',
    'New model version is pushed to every scanner and desk': 'يُرسل إصدار النموذج الجديد إلى كل ماسح ومكتب',
    // models
    'M1 · X-ray concealment segmentation': 'M1 · تجزئة الإخفاء في صور الأشعة', 'M2 · Tablet imprint classifier': 'M2 · مصنّف نقوش الأقراص',
    'Test on 40 brand-new random bags': 'اختبر على 40 حقيبة عشوائية جديدة', 'Test on 200 brand-new tablets': 'اختبر على 200 قرص جديد',
    'Runs entirely in this browser.': 'يعمل بالكامل في هذا المتصفح.', 'What is real in this prototype': 'ما الحقيقي في هذا النموذج الأولي',
    'Bag-level recall': 'الاستدعاء على مستوى الحقيبة', 'False alarms (clean bags)': 'الإنذارات الكاذبة (حقائب سليمة)', 'Pixel IoU': 'تطابق البكسلات IoU',
    'Parameters': 'المعاملات', 'Test accuracy': 'دقة الاختبار', 'Crescent recall': 'استدعاء الهلال', 'Crescent false positives': 'الإيجابيات الكاذبة للهلال',
    'Component': 'المكوّن', 'How it works here': 'كيف يعمل هنا',
    // challenge
    'Looks clean': 'تبدو سليمة', 'Next bag →': 'الحقيبة التالية ←', 'Restart': 'إعادة البدء', 'Scoreboard': 'لوحة النتائج',
    'You': 'أنت', 'AI (M1)': 'الذكاء الاصطناعي (M1)', 'vs': 'ضد', 'Play again': 'العب مجدداً', 'See final score': 'عرض النتيجة النهائية',
    'Click where you think drugs are hidden – or press “Looks clean”.': 'انقر حيث تعتقد أن المخدرات مخفية – أو اضغط «تبدو سليمة».',
    'Game over – see the scoreboard.': 'انتهت اللعبة – شاهد لوحة النتائج.',
    // sign-in, officer, footer
    'Drug Detection Network · Officer sign-in': 'شبكة كشف المخدرات · دخول الضباط', 'Officer ID': 'رقم الضابط', 'Password': 'كلمة المرور',
    'Sign in': 'تسجيل الدخول', 'Incorrect officer ID or password. Use the demo account below.': 'رقم الضابط أو كلمة المرور غير صحيحة. استخدم الحساب التجريبي أدناه.',
    'Mariam Al Noor': 'مريم النور', 'Pharmaceutical Control Inspector · MOHAP Drug Control Dept': 'مفتشة رقابة دوائية · إدارة مكافحة المخدرات، وزارة الصحة ووقاية المجتمع',
    'MOHAP · DXB T3 Desk 2': 'وزارة الصحة · مطار دبي، مبنى 3، مكتب 2', 'Verifying officer credentials…': 'جارٍ التحقق من بيانات الضابط…',
    'Live AI models trained on synthetic data · Presight Eureka 3.0 prototype · No real passenger, bag or seizure data is used · The demo officer is fictional': 'نماذج ذكاء اصطناعي مباشرة مدرّبة على بيانات اصطناعية · نموذج أولي لمسابقة Presight Eureka 3.0 · لا تُستخدم أي بيانات حقيقية لمسافرين أو حقائب أو ضبطيات · الضابطة التجريبية شخصية خيالية',
    'Demo account · fictional officer · ID MOHAP-DC-0427 · password': 'حساب تجريبي · ضابطة خيالية · الرقم MOHAP-DC-0427 · كلمة المرور',
    'Switch to English': 'Switch to English',
    'Press ? for keyboard shortcuts':'اضغط ? لاختصارات لوحة المفاتيح',
    // demo narration
    'A bag on a high-risk transfer route reaches DXB Terminal 3. Before it lands, M5 has already given it a pre-arrival score of 52.': 'تصل حقيبة على مسار عبور عالي المخاطر إلى مبنى 3 في مطار دبي. وقبل هبوطها، منحها M5 درجة 52 قبل الوصول.',
    'M1 – a trained neural network running live in this browser – reads the X-ray and highlights the dense block hidden inside a protein tub.': 'يقرأ M1 – وهو شبكة عصبية مدرّبة تعمل مباشرة في هذا المتصفح – صورة الأشعة ويُبرز الكتلة الكثيفة المخفية داخل علبة بروتين.',
    'Fused score crosses the threshold, so a case opens. The officer sees exactly why: every factor is explained, and no nationality data is used.': 'تتجاوز الدرجة المدمجة العتبة فتُفتح قضية. يرى الضابط السبب بدقة: كل عامل مشروح، ولا تُستخدم بيانات الجنسية.',
    'The officer opens the bag and photographs it. The live M2 model classifies every tablet imprint as Captagon-style; the label is not in the registry.': 'يفتح الضابط الحقيبة ويصوّرها. يصنّف نموذج M2 المباشر كل نقش قرص على أنه على نمط الكبتاغون، والملصق غير موجود في السجل.',
    'M3: a hyperspectral camera identifies the powder through the sealed pouch – no need to open it.': 'M3: تحدّد الكاميرا فائقة الطيف المسحوق عبر الكيس المغلق – دون الحاجة إلى فتحه.',
    'All evidence is in the same case. Final score 99 → seizure; the sample goes to the lab as legal proof.': 'كل الأدلة في القضية نفسها. الدرجة النهائية 99 ← ضبط، وتُرسل العينة إلى المختبر دليلاً قانونياً.',
    'The lab confirms. Every site retrains on its own data; only model updates are shared – the whole network gets smarter.': 'يؤكد المختبر. يعيد كل موقع التدريب على بياناته، وتُشارَك تحديثات النموذج فقط – فتصبح الشبكة كلها أذكى.',
    'Back to the command view: one seizure at DXB improved detection at all seven UAE entry points.': 'العودة إلى لوحة القيادة: ضبطية واحدة في مطار دبي حسّنت الكشف في جميع منافذ الدخول السبعة.'
  };
  // Parameterised strings
  var PAT = [
    [/^Round (\d+) of (\d+)$/, 'الجولة $1 من $2'],
    [/^Step (\d+) of (\d+)$/, 'الخطوة $1 من $2'],
    [/^Attach to case (C-\d+)$/, 'إرفاق بالقضية $1'],
    [/^Attached to (C-\d+) ✓$/, 'أُرفق بالقضية $1 ✓'],
    [/^Open case (C-\d+) →$/, 'فتح القضية $1 ←'],
    [/^(\d+) open$/, '$1 مفتوحة'],
    [/^(\d+) min$/, '$1 دقائق'],
    [/^Lane (\d+)$/, 'المسار $1'],
    [/^Bag (\d+)$/, 'الحقيبة $1'],
    [/^Evidence score (\d+)$/, 'درجة الأدلة $1'],
    [/^Model v([\d.]+)$/, 'النموذج v$1'],
    [/^Tour (\d+) \/ (\d+)$/, 'الجولة $1 / $2']
  ];
  Object.assign(AR, {
    'CASE': 'قضية', 'LOOP': 'الحلقة',
    // lane placeholders, routes
    'Pick a bag on the belt or press': 'اختر حقيبة على السير أو اضغط',
    'Add items, hide drugs anywhere, drag things around – then press': 'أضف أغراضاً وأخفِ المخدرات في أي مكان وحرّكها – ثم اضغط',
    'The model has never seen your bag.': 'النموذج لم يرَ حقيبتك من قبل.',
    'Upload any image. M1 will produce a concealment heatmap for it.': 'ارفع أي صورة، وسيُنتج M1 خريطة حرارية للإخفاء لها.',
    'Direct arrival': 'وصول مباشر', 'Transfer': 'عبور', 'Tricky': 'حالة صعبة', 'two concealments': 'إخفاءان',
    'packet under laptop': 'عبوة تحت حاسوب محمول', 'clean but dense': 'سليمة لكن كثيفة', 'rotated packets': 'عبوات مائلة',
    'AI flagged it →': 'نبّه إليها الذكاء الاصطناعي ←', 'AI did not flag it →': 'لم ينبّه إليها الذكاء الاصطناعي ←',
    // case
    'Routed to inspection queue. Officer notified on tablet.': 'أُحيلت إلى قائمة التفتيش وأُبلغ الضابط على الجهاز اللوحي.',
    'Pending – officer photographs contents at the inspection desk': 'قيد الانتظار – يصوّر الضابط المحتويات في مكتب التفتيش',
    'Pending – scan sealed contents': 'قيد الانتظار – امسح المحتويات المغلقة',
    "Score = noisy-OR of independent evidence, each weighted by the module's validated precision. Threshold: ≥60 open, 45–59 re-scan, <45 clear.": 'الدرجة = دمج احتمالي (noisy-OR) لأدلة مستقلة، يُوزن كلٌّ منها بدقة الوحدة المعتمدة. العتبة: ≥60 فتح، 45–59 إعادة فحص، <45 إجازة.',
    // desk
    'Press': 'اضغط',
    '. The live M2 model classifies every tablet imprint; packaging detection and Arabic / English OCR are simulated in this prototype.': '. يصنّف نموذج M2 المباشر كل نقش قرص، أما كشف التغليف وقراءة النصوص العربية والإنجليزية فمحاكاة في هذا النموذج الأولي.',
    'to classify every tablet crop with the live model.': 'لتصنيف كل قرص بالنموذج المباشر.',
    'Draw an imprint on the tablet with your mouse or finger – e.g. two crescents': 'ارسم نقشاً على القرص بالفأرة أو بإصبعك – مثل هلالين',
    ', a line, or a letter.': '، أو خطاً، أو حرفاً.', 'Imprints:': 'النقوش:',
    '✕ Brand + batch WP-2291 not found in MOHAP product registry': '✕ العلامة والدفعة WP-2291 غير موجودتين في سجل منتجات وزارة الصحة',
    '✕ No registered medicine with this imprint, size and colour': '✕ لا يوجد دواء مسجّل بهذا النقش والحجم واللون',
    '✕ Injectable peptide not authorised for import or human use in the UAE': '✕ الببتيد القابل للحقن غير مصرّح باستيراده أو استخدامه البشري في الإمارات',
    '✕ Tablets with the twin-crescent logo match no registered medicine – lab to confirm the rest': '✕ الأقراص ذات شعار الهلالين لا تطابق أي دواء مسجّل – يؤكد المختبر البقية',
    'No Captagon-style logo': 'لا يوجد شعار نمط الكبتاغون', 'Present': 'موجود', 'None': 'لا يوجد',
    'Not measurable from a top-down photo – use calipers and a balance': 'لا يمكن قياسها من صورة علوية – استخدم الفرجار والميزان',
    '⚠ Consistent with the Captagon-style reference profile (illustrative): 7.0–8.5 mm, round, off-white, twin-crescent logo.': '⚠ يتوافق مع الملف المرجعي لنمط الكبتاغون (توضيحي): 7.0–8.5 مم، دائري، أبيض مائل للصفرة، شعار هلالين.',
    'Does not match the Captagon-style reference profile.': 'لا يتطابق مع الملف المرجعي لنمط الكبتاغون.',
    'No tablets in this photo.': 'لا توجد أقراص في هذه الصورة.',
    // hyperspectral library
    'Amphetamine-type stimulant': 'منشّط من نوع الأمفيتامين', 'Methamphetamine': 'الميثامفيتامين', 'Opiate (heroin profile)': 'أفيون (ملف الهيروين)',
    'Synthetic cannabinoid': 'قنّب اصطناعي', 'Nitazene-type opioid': 'أفيوني من نوع النيتازين', 'Pregabalin (controlled)': 'بريغابالين (خاضع للرقابة)',
    'Tramadol (controlled)': 'ترامادول (خاضع للرقابة)', 'Unregistered peptide hormone': 'هرمون ببتيدي غير مسجّل', 'Whey protein': 'بروتين مصل اللبن',
    'Sucrose / sweetener': 'سكروز / مُحلٍّ', 'Caffeine': 'كافيين',
    '· Captagon profile': '· ملف الكبتاغون', '· crystal / HCl salt': '· بلورات / ملح HCl', '· diacetylmorphine': '· ثنائي أسيتيل المورفين',
    '· prescription-only': '· بوصفة طبية فقط', '· SCRA on plant / paper': '· قنّب اصطناعي على نبات / ورق', '· synthetic opioid': '· أفيوني اصطناعي',
    '· BPC-157-like, lyophilised': '· شبيه BPC-157، مجفّد', '· benign food supplement': '· مكمل غذائي آمن', '· benign': '· آمن', '· common cutting agent': '· مادة غش شائعة',
    'to classify every pixel against 11 library substances (+ packaging materials).': 'لتصنيف كل بكسل مقابل 11 مادة في المكتبة (+ مواد التغليف).',
    'Mixture (non-negative least-squares unmixing):':'الخليط (فك الخلائط بالمربعات الصغرى غير السالبة):',
    // predictor
    'Amphetamine-type': 'من نوع الأمفيتامين', 'Peptide hormone': 'هرمون ببتيدي',
    'Captagon seizure trend ↑': 'ارتفاع ضبطيات الكبتاغون ↑', 'analogue series A': 'سلسلة النظائر A', 'EU early-warning feed': 'نظام الإنذار المبكر الأوروبي',
    'new tail-group pattern': 'نمط مجموعة طرفية جديد', 'Global early-warning reports': 'تقارير الإنذار المبكر العالمية', 'ring substitution': 'استبدال حلقي',
    'Parcel seizures of "research peptides" ↑': 'ضبطيات طرود «الببتيدات البحثية» ↑', 'Precursor-route change in regional seizures': 'تغيّر مسار السلائف في الضبطيات الإقليمية',
    'Not yet seen in UAE': 'لم يُرصد بعد في الإمارات', 'Seen in EU feeds, not GCC': 'رُصد في أوروبا، لا في الخليج', 'Not yet seen in GCC': 'لم يُرصد بعد في الخليج',
    // learning loop
    'Waiting for a seizure': 'بانتظار ضبطية', 'Pending lab result': 'نتيجة المختبر المعلّقة', 'Last confirmed seizure': 'آخر ضبطية مؤكدة',
    'Run the full demo, or seize a case after M3 identifies a substance. You can still trigger a scheduled retraining round below.': 'شغّل العرض الكامل، أو اضبط قضية بعد أن يحدّد M3 المادة. ويمكنك أيضاً تشغيل جولة إعادة تدريب مجدولة أدناه.',
    'Detection recall (held-out seizures)': 'استدعاء الكشف (ضبطيات للاختبار)', 'Extra false alarms per lane': 'الإنذارات الكاذبة الإضافية لكل مسار',
    'Sites on current model': 'المواقع على النموذج الحالي', 'Raw images shared between sites': 'الصور الخام المشتركة بين المواقع',
    'AI evidence pack: X-ray, officer photos, OCR, spectra and fusion scores, under chain of custody.': 'حزمة أدلة الذكاء الاصطناعي: الأشعة وصور الضابط وقراءة النصوص والأطياف ودرجات الدمج، ضمن سلسلة حيازة موثّقة.',
    // models
    'A fully-convolutional neural network that outputs a per-pixel probability of hidden drugs. Trained on 6,000 synthetic dual-energy bag scans with pixel-level ground truth; tested on 600 bags it never saw.': 'شبكة عصبية التفافية بالكامل تُخرج احتمال وجود مخدرات مخفية لكل بكسل. دُرّبت على 6,000 صورة اصطناعية ثنائية الطاقة لحقائب مع حقيقة فعلية على مستوى البكسل، واختُبرت على 600 حقيبة لم ترها.',
    'A convolutional classifier for 48×48 tablet close-ups: Captagon-style twin-crescent vs. plain, scored and letter-stamped tablets. Trained on 12,000 synthetic close-ups with random lighting, rotation, blur and noise.': 'مصنّف التفافي لصور أقراص مقرّبة 48×48: هلالان على نمط الكبتاغون مقابل أقراص سادة ومقسومة ومختومة بحروف. دُرّب على 12,000 صورة اصطناعية بإضاءة ودوران وتمويه وتشويش عشوائي.',
    'true ↓ / predicted →': 'الفعلي ↓ / المتوقع ←', 'Crescent': 'هلال', 'Scored': 'مقسوم', 'Letter': 'حرف',
    'M1 X-ray vision': 'M1 الرؤية بالأشعة', 'Trained CNN, pure-JS inference on every scan, Bag Builder and uploads': 'شبكة مدرّبة، استدلال بلغة JavaScript على كل صورة وفي منشئ الحقائب والصور المرفوعة',
    'M2 tablet imprints': 'M2 نقوش الأقراص', 'Trained CNN on every tablet crop, the imprint pad and uploads': 'شبكة مدرّبة على كل قرص ولوحة النقش والصور المرفوعة',
    'M2 packaging detection & OCR': 'M2 كشف التغليف وقراءة النصوص', 'Pre-written results for the three sample photos': 'نتائج معدّة مسبقاً لصور العيّنات',
    'M3 spectral ID': 'M3 التعرّف الطيفي', 'Pearson matching against an 11-substance library + non-negative least-squares unmixing': 'مطابقة بيرسون مع مكتبة من 11 مادة + فك الخلائط بالمربعات الصغرى غير السالبة',
    'M3 hyperspectral camera': 'M3 الكاميرا فائقة الطيف', 'Spectra are simulated (no sensor attached)': 'الأطياف محاكاة (لا يوجد مستشعر متصل)',
    'M4 novel-drug predictor': 'M4 متنبّئ المخدرات الجديدة', 'Illustrative predictions': 'تنبؤات توضيحية', 'M5 fusion': 'M5 الدمج',
    'Noisy-OR over live evidence scores': 'دمج احتمالي لدرجات الأدلة المباشرة', 'Federated learning loop': 'حلقة التعلّم الاتحادي',
    'Animated illustration of the training round': 'رسم متحرك توضيحي لجولة التدريب',
    'Production would retrain M1 and M2 on real customs scans and photos under a data-sharing MoU; the synthetic training here proves the pipeline and the in-browser/edge inference, not field accuracy.': 'في الإنتاج يُعاد تدريب M1 وM2 على صور جمركية حقيقية بموجب مذكرة تفاهم لمشاركة البيانات؛ أما التدريب الاصطناعي هنا فيُثبت سلسلة العمل والاستدلال داخل المتصفح/الطرف، لا الدقة الميدانية.',
    // challenge
    'You score when you click inside a hidden concealment, or say “Looks clean” on a clean bag. The AI scores when its flag (≥ 50) matches the truth. Every bag is generated fresh, so neither of you has seen it before.': 'تحصل على نقطة عندما تنقر داخل إخفاء حقيقي، أو تختار «تبدو سليمة» لحقيبة سليمة. ويحصل الذكاء الاصطناعي على نقطة عندما يطابق تنبيهه (≥ 50) الحقيقة. كل حقيبة تُولَّد من جديد، فلم يرها أيٌّ منكما من قبل.',
    'drugs hidden': 'مخدرات مخفية', 'clean': 'سليمة', 'Drugs were hidden (blue = ground truth).': 'كانت هناك مخدرات مخفية (الأزرق = الحقيقة الفعلية).', 'This bag was clean.': 'كانت هذه الحقيبة سليمة.'
  });
  var NAMES = function (s) { // translate substance names inside a composed string
    return s.replace(/Amphetamine-type stimulant|Methamphetamine|Opiate \(heroin profile\)|Synthetic cannabinoid|Nitazene-type opioid|Pregabalin \(controlled\)|Tramadol \(controlled\)|Unregistered peptide hormone|Whey protein|Sucrose \/ sweetener|Caffeine|Packaging plastic \(HDPE\)|Glass vial/g, function (m) { return AR[m] || ({ 'Packaging plastic (HDPE)': 'بلاستيك التغليف (HDPE)', 'Glass vial': 'قارورة زجاجية' })[m] || m; });
  };
  PAT.push(
    [/^Region (\d+)$/, 'المنطقة $1'],
    [/^· concealment probability (\d+)\/100 · ([\d.]+)% of scan area$/, '· احتمال الإخفاء $1/100 · $2% من مساحة الصورة'],
    [/^drugs hidden – (.+)$/, 'مخدرات مخفية – $1'],
    [/^M1 is a trained neural network \(([\d,]+) parameters\) running right here in your browser\.$/, 'M1 شبكة عصبية مدرّبة ($1 معامل) تعمل هنا في متصفحك.'],
    [/^M1 · trained CNN, ([\d,]+) parameters · (\d+) ms in this browser · no server, no internet$/, 'M1 · شبكة مدرّبة، $1 معامل · $2 ملّي ثانية في هذا المتصفح · دون خادم أو إنترنت'],
    [/^(\d+)\/(\d+) tablets classified Captagon-style \(avg (\d+)%\)(.*)$/, function (m, a, b, c, tail) {
      return a + '/' + b + ' أقراص صُنّفت على نمط الكبتاغون (متوسط ' + c + '%)' + tail.replace(' mm', ' مم').replace('label not in registry', 'الملصق غير مسجّل').replace('no registered medicine matches', 'لا يطابق أي دواء مسجّل').replace('unregistered injectable peptide', 'ببتيد قابل للحقن غير مسجّل');
    }],
    [/^(\d+) of (\d+) tablets → twin-crescent \(Captagon-style logo family\), mean confidence (\d+)%$/, '$1 من $2 أقراص ← هلالان (عائلة شعار الكبتاغون)، متوسط الثقة $3%'],
    [/^· calibrated from the scale bar \((\d+) ticks, ([\d.]+) px\/mm\)$/, '· معايرة من مسطرة القياس ($1 علامة، $2 بكسل/مم)'],
    [/^(\d+) tablets$/, '$1 أقراص'],
    [/^(Round|Irregular) · circularity ([\d.]+)$/, function (m, s, c) { return (s === 'Round' ? 'دائري' : 'غير منتظم') + ' · الاستدارة ' + c; }],
    [/^Twin crescents on (\d+) of (\d+) tablets$/, 'هلالان على $1 من $2 أقراص'],
    [/^⚠ (\d+) of (\d+) tablets carry the Captagon-style logo – separate them for lab testing\.$/, '⚠ $1 من $2 أقراص تحمل شعار نمط الكبتاغون – افصلها لفحصها مخبرياً.'],
    [/^([\d.]+) ± ([\d.]+) mm$/, '$1 ± $2 مم'],
    [/^⚠ (.+) · (\d+)% match$/, function (m, n, p) { return '⚠ ' + NAMES(n) + ' · تطابق ' + p + '%'; }],
    [/^✓ No controlled substance · (.+) (\d+)%$/, function (m, n, p) { return '✓ لا توجد مادة خاضعة للرقابة · ' + NAMES(n) + ' ' + p + '%'; }],
    [/^(\d+)% of contents · (\d+) px$/, '$1% من المحتوى · $2 بكسل'],
    [/^\d+% .+ \+ \d+% .+$/, function (m) { return NAMES(m); }],
    [/^· fit error ([\d.]+)$/, '· خطأ الملاءمة $1'],
    [/^pixel \((\d+), (\d+)\) → (.+)$/, function (m, x, y, rest) { return 'البكسل (' + x + '، ' + y + ') ← ' + NAMES(rest).replace('mix:', 'الخليط:'); }],
    [/^Route pattern (R-\d+)$/, 'نمط المسار $1'],
    [/^Pre-arrival score (\d+)$/, 'درجة ما قبل الوصول $1'],
    [/^Fused score (\d+) → (.+)$/, function (m, s, d) { return 'الدرجة المدمجة ' + s + ' ← ' + (AR[d] || d); }],
    [/^Gantry scanner (\d+)$/, 'ماسح البوابة $1'],
    [/^Models trained (\S+) · training code in narcolens-ml\/$/, 'دُرّبت النماذج في $1 · شيفرة التدريب في narcolens-ml/']
  );
  NL.AR = AR;

  function lookup(k) {
    if (Object.prototype.hasOwnProperty.call(AR, k)) return AR[k];
    for (var i = 0; i < PAT.length; i++) if (PAT[i][0].test(k)) return k.replace(PAT[i][0], PAT[i][1]);
    return null;
  }
  function tr(s) {
    var k = s.trim();
    if (!k || k.length > 400) return null;
    var t = lookup(k);
    if (t == null && k.indexOf(' · ') > 0) { // translate " · "-separated pieces when at least one is known
      var parts = k.split(' · '), any = false;
      parts = parts.map(function (p) { var q = lookup(p); if (q != null) { any = true; return q; } return p; });
      if (any) t = parts.join(' · ');
    }
    return t == null ? null : s.replace(k, t);
  }

  var lang = 'en', orig = new WeakMap(), mine = new WeakMap(), ATTRS = ['title', 'aria-label', 'placeholder'];
  function skip(el) { return !el || /^(SCRIPT|STYLE|TEXTAREA|OPTION)$/.test(el.nodeName) || (el.closest && el.closest('[data-noi18n]')); }
  function doText(n) {
    if (skip(n.parentNode)) return;
    if (mine.get(n) === n.nodeValue) return;
    var t = tr(n.nodeValue);
    if (t == null) return;
    orig.set(n, n.nodeValue); mine.set(n, t); n.nodeValue = t;
  }
  function doAttrs(el) {
    if (el.nodeType !== 1 || skip(el)) return;
    ATTRS.forEach(function (a) {
      if (!el.hasAttribute(a)) return;
      var key = 'en' + a.replace(/-./g, function (m) { return m[1].toUpperCase(); }).replace(/^./, function (m) { return m.toUpperCase(); });
      var v = el.getAttribute(a);
      if (el.dataset[key + 'Ar'] === v) return;
      var t = tr(v);
      if (t == null) return;
      el.dataset[key] = v; el.dataset[key + 'Ar'] = t; el.setAttribute(a, t);
    });
  }
  function walk(root) {
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1) return;
    doAttrs(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT), n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }
  function restore(root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT), n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) { if (orig.has(n) && mine.get(n) === n.nodeValue) { n.nodeValue = orig.get(n); mine.delete(n); } }
      else ATTRS.forEach(function (a) {
        var key = 'en' + a.replace(/-./g, function (m) { return m[1].toUpperCase(); }).replace(/^./, function (m) { return m.toUpperCase(); });
        if (n.dataset && n.dataset[key] != null) { if (n.getAttribute(a) === n.dataset[key + 'Ar']) n.setAttribute(a, n.dataset[key]); delete n.dataset[key]; delete n.dataset[key + 'Ar']; }
      });
    }
  }
  var obs = new MutationObserver(function (muts) {
    if (lang !== 'ar') return;
    muts.forEach(function (m) {
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doAttrs(m.target);
      else m.addedNodes.forEach(walk);
    });
  });

  NL.i18n = {
    get lang() { return lang; },
    t: function (s) { return lang === 'ar' ? (tr(s) || s) : s; },
    set: function (l) {
      lang = l === 'ar' ? 'ar' : 'en';
      var html = document.documentElement;
      html.lang = lang; html.dir = lang === 'ar' ? 'rtl' : 'ltr';
      if (lang === 'ar') walk(document.body); else restore(document.body);
      try { localStorage.setItem('nl-lang', lang); } catch (e) { }
      var b = document.getElementById('langBtn');
      if (b) { b.textContent = lang === 'ar' ? 'EN' : 'ع'; b.title = lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'; b.setAttribute('aria-label', b.title); }
      if (NL.onLang) NL.onLang(lang);
    },
    init: function () {
      obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
      var saved = null;
      try { saved = localStorage.getItem('nl-lang'); } catch (e) { }
      this.set(saved === 'ar' ? 'ar' : 'en');
    }
  };
})(window.NL);
