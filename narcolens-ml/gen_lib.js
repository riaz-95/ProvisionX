/* Runs inside the browser: renders synthetic training data with the app's own renderers. */
(function () {
  var MW = 224, MH = 128, OW = 112, OH = 64;
  var full = document.createElement('canvas'); full.width = NL.XRAY.W; full.height = NL.XRAY.H;
  var mfull = document.createElement('canvas'); mfull.width = NL.XRAY.W; mfull.height = NL.XRAY.H;
  var small = document.createElement('canvas'); small.width = MW; small.height = MH;
  var msmall = document.createElement('canvas'); msmall.width = OW; msmall.height = OH;
  function b64(u8) { var s = ''; for (var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }

  // M1: X-ray scenes -> image (224x128 RGB) + soft mask (112x64)
  window.genXray = function (seed0, n) {
    var X = new Uint8Array(n * MH * MW * 3), Y = new Uint8Array(n * OH * OW), L = new Uint8Array(n);
    var sc_ = small.getContext('2d'), ms_ = msmall.getContext('2d');
    for (var k = 0; k < n; k++) {
      var sc = NL.randomScene(seed0 + k);
      NL.renderScene(sc, full.getContext('2d'), mfull.getContext('2d'));
      sc_.drawImage(full, 0, 0, MW, MH);
      ms_.drawImage(mfull, 0, 0, OW, OH);
      var d = sc_.getImageData(0, 0, MW, MH).data, md = ms_.getImageData(0, 0, OW, OH).data;
      for (var i = 0, j = k * MH * MW * 3; i < d.length; i += 4) { X[j++] = d[i]; X[j++] = d[i + 1]; X[j++] = d[i + 2]; }
      for (var p = 0, q = k * OH * OW; p < md.length; p += 4) Y[q++] = md[p];
      L[k] = NL.sceneHasConcealment(sc) ? 1 : 0;
    }
    return { X: b64(X), Y: b64(Y), L: b64(L) };
  };

  // M2: tablet close-ups (48x48 grayscale), 4 classes
  window.genPills = function (seed0, n) {
    var S = 48, c = document.createElement('canvas'); c.width = S; c.height = S;
    var X = new Uint8Array(n * S * S), L = new Uint8Array(n);
    for (var k = 0; k < n; k++) {
      var r = NL.rng(seed0 + k), cls = Math.floor(r() * 4);
      NL.drawTabletCrop(c.getContext('2d'), S, cls, r);
      var d = c.getContext('2d').getImageData(0, 0, S, S).data;
      for (var i = 0, j = k * S * S; i < d.length; i += 4) X[j++] = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      L[k] = cls;
    }
    return { X: b64(X), L: b64(L) };
  };
})();
