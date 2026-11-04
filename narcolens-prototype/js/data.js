/* NarcoLens prototype – simulated data. Nothing here is real passenger, bag or seizure data. */
window.NL = window.NL || {};
(function (NL) {
  'use strict';

  // Seeded random generator so every render of a bag looks the same.
  NL.rng = function (seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  NL.gauss = function (r) {
    var u = 0, v = 0;
    while (!u) u = r();
    while (!v) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  // Entry points (positions on the schematic map, 600x340 viewBox).
  NL.sites = [
    { id: 'DXB', name: 'DXB Airport', x: 380, y: 150, lx: 12, ly: -8, anchor: 'start' },
    { id: 'SHJ', name: 'Sharjah Cargo', x: 412, y: 128, lx: 12, ly: -4, anchor: 'start' },
    { id: 'POST', name: 'Postal & Courier Hub', x: 352, y: 170, lx: 12, ly: 14, anchor: 'start' },
    { id: 'DWC', name: 'Al Maktoum (DWC)', x: 318, y: 204, lx: 10, ly: 18, anchor: 'start' },
    { id: 'JEA', name: 'Jebel Ali Port', x: 282, y: 186, lx: -12, ly: -10, anchor: 'end' },
    { id: 'KZP', name: 'Khalifa Port', x: 224, y: 216, lx: -10, ly: -10, anchor: 'end' },
    { id: 'AUH', name: 'Abu Dhabi Airport', x: 182, y: 238, lx: 0, ly: 24, anchor: 'middle' }
  ];
  NL.site = function (id) { return NL.sites.find(function (s) { return s.id === id; }); };

  // ---------- Spectral library (simulated SWIR absorbance, 1000–2500 nm) ----------
  NL.WL = [];
  for (var w = 1000; w <= 2500; w += 10) NL.WL.push(w);
  NL.spec = function (peaks, base) {
    return NL.WL.map(function (wl) {
      var v = base == null ? 0.1 : base;
      peaks.forEach(function (p) {
        var s = p[2] || 30;
        v += p[1] * Math.exp(-((wl - p[0]) * (wl - p[0])) / (2 * s * s));
      });
      return v;
    });
  };

  NL.library = [
    { id: 'ats', name: 'Amphetamine-type stimulant', note: 'Captagon profile', illicit: true,
      peaks: [[1150, .45, 25], [1690, .85, 28], [1728, .55, 20], [2262, .75, 32], [2318, .5, 24]] },
    { id: 'meth', name: 'Methamphetamine', note: 'crystal / HCl salt', illicit: true,
      peaks: [[1140, .4, 28], [1675, .75, 30], [2245, .8, 30], [2350, .45, 28]] },
    { id: 'heroin', name: 'Opiate (heroin profile)', note: 'diacetylmorphine', illicit: true,
      peaks: [[1180, .4, 30], [1720, .65, 30], [2140, .4, 30], [2280, .6, 35]] },
    { id: 'scra', name: 'Synthetic cannabinoid', note: 'SCRA on plant / paper', illicit: true,
      peaks: [[1400, .35, 40], [1660, .6, 30], [2140, .7, 35], [2300, .4, 30]] },
    { id: 'nitazene', name: 'Nitazene-type opioid', note: 'synthetic opioid', illicit: true,
      peaks: [[1130, .3, 25], [1640, .55, 25], [1950, .3, 40], [2210, .7, 30]] },
    { id: 'pregab', name: 'Pregabalin (controlled)', note: 'prescription-only', illicit: true,
      peaks: [[1490, .5, 35], [1940, .55, 45], [2190, .6, 35]] },
    { id: 'tram', name: 'Tramadol (controlled)', note: 'prescription-only', illicit: true,
      peaks: [[1210, .4, 30], [1705, .6, 30], [2290, .65, 30]] },
    { id: 'peptide', name: 'Unregistered peptide hormone', note: 'BPC-157-like, lyophilised', illicit: true,
      peaks: [[1500, .6, 45], [1572, .32, 30], [2055, .5, 40], [2172, .62, 32], [2292, .38, 28]] },
    { id: 'whey', name: 'Whey protein', note: 'benign food supplement', illicit: false,
      peaks: [[1510, .55, 50], [1735, .35, 40], [2050, .6, 45], [2180, .65, 40]] },
    { id: 'sugar', name: 'Sucrose / sweetener', note: 'benign', illicit: false,
      peaks: [[1440, .6, 60], [2080, .7, 45], [2280, .45, 40]] },
    { id: 'caffeine', name: 'Caffeine', note: 'common cutting agent', illicit: false,
      peaks: [[1670, .5, 25], [2150, .45, 30], [2450, .4, 30]] }
  ];
  NL.materials = [
    { id: 'bg', name: 'Background / tray', material: true, base: .08, peaks: [[1950, .05, 120]] },
    { id: 'hdpe', name: 'Packaging plastic (HDPE)', material: true,
      peaks: [[1210, .6, 20], [1728, .8, 18], [1765, .5, 18], [2310, .85, 22], [2355, .6, 20]] },
    { id: 'glass', name: 'Glass vial', material: true, base: .2, peaks: [[1450, .15, 80], [1930, .25, 80]] }
  ];
  NL.library.concat(NL.materials).forEach(function (l) { l.s = NL.spec(l.peaks, l.base); });
  NL.ref = function (id) {
    return NL.library.find(function (l) { return l.id === id; }) || NL.materials.find(function (l) { return l.id === id; });
  };

  // ---------- Bags on the DXB Terminal 3 belt ----------
  NL.concealments = {
    none: { m1: 7, label: 'No anomaly', text: 'Densities consistent with clothing, toiletries and electronics.' },
    lining: { m1: 88, label: 'Dense organic packets in shell lining', text: 'Two flat packets of uniform organic density inside the shell wall – not part of normal suitcase construction.' },
    protein: { m1: 87, label: 'Dense block inside supplement tub', text: 'Supplement tub holds a compact mass ~38% denser than loose protein powder, plus tablet-shaped objects.' },
    dates: { m1: 41, label: 'Dense organic food box', text: 'Food-like organic density (dates / sweets profile). Below threshold – cleared, image kept for learning.' },
    buttons: { m1: 79, label: 'Oversized dense buttons', text: 'Garment buttons ~3x denser and larger than typical – consistent with pressed tablets hidden in buttons.' },
    vials: { m1: 72, label: 'Cluster of liquid / powder vials', text: '14 small glass vials with organic contents in a toiletry bag – possible unregistered injectable peptides or hormones.' },
    'false-bottom': { m1: 84, label: 'Uniform slab under base panel', text: 'Continuous organic layer beneath the base panel – false-bottom construction suspected.' }
  };

  NL.bags = [
    { tag: 'BAG-T3-118204', site: 'DXB', lane: 'T3 · Lane 4', route: 'Transfer · Route pattern R-17', weight: 23.4, preScore: 34,
      preText: 'Route pattern linked to 2 earlier seizures; ticket bought 6 h before departure.', concealment: 'lining', seed: 11 },
    { tag: 'BAG-T3-118205', site: 'DXB', lane: 'T3 · Lane 4', route: 'Direct arrival', weight: 19.8, preScore: 8,
      preText: 'No risk indicators.', concealment: 'none', seed: 22 },
    { tag: 'BAG-T3-118211', site: 'DXB', lane: 'T3 · Lane 4', route: 'Transfer · Route pattern R-09', weight: 27.9, preScore: 52,
      preText: 'High-risk transfer pattern; bag 4.1 kg heavier than booking average; one-way ticket bought same day.', concealment: 'protein', seed: 33, demo: true },
    { tag: 'BAG-T3-118219', site: 'DXB', lane: 'T3 · Lane 4', route: 'Direct arrival', weight: 21.2, preScore: 12,
      preText: 'No risk indicators.', concealment: 'dates', seed: 44 },
    { tag: 'BAG-T3-118226', site: 'DXB', lane: 'T3 · Lane 4', route: 'Transfer · Route pattern R-22', weight: 18.6, preScore: 27,
      preText: 'Short-stay return trip pattern seen in 2025 button-concealment cases.', concealment: 'buttons', seed: 55 },
    { tag: 'BAG-T3-118230', site: 'DXB', lane: 'T3 · Lane 4', route: 'Direct arrival', weight: 16.1, preScore: 40,
      preText: 'Traveller account linked to 3 prior parcel shipments of "cosmetics".', concealment: 'vials', seed: 66 },
    { tag: 'BAG-T3-118237', site: 'DXB', lane: 'T3 · Lane 4', route: 'Transfer · Route pattern R-17', weight: 25.0, preScore: 30,
      preText: 'Route pattern R-17; bag checked at last minute.', concealment: 'false-bottom', seed: 77 }
  ];

  // Cases already open at other sites when the demo starts.
  NL.seedCases = [
    { id: 'C-24117', tag: 'PCL-POST-55120', kind: 'Parcel', site: 'POST', lane: 'Courier line 2',
      route: 'E-commerce parcel · declared "greeting cards"', preScore: 46,
      preText: 'Sender address linked to 5 earlier parcels; declared value very low for weight.',
      m1: { score: 76, label: 'Uniform organic sheets', text: 'Stacked paper sheets with uneven organic density – possible synthetic-cannabinoid-soaked paper.' } },
    { id: 'C-24118', tag: 'CGO-JEA-30988', kind: 'Container', site: 'JEA', lane: 'Gantry scanner 1',
      route: 'Furniture consignment · 40 ft', preScore: 38,
      preText: 'New consignee; routing via two transhipment ports.',
      m1: { score: 82, label: 'Dense voids inside door panels', text: 'Door panels show organic-density fill in normally hollow cores (seen in 651-door seizure pattern).' } }
  ];
})(window.NL);
