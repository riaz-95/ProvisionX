# NarcoLens ML: training the prototype's live models

This folder trains the two neural networks that run live inside the NarcoLens prototype (`../narcolens-prototype`):

| Model | Task | Input → output |
|---|---|---|
| **M1** | X-ray concealment segmentation | 3×128×224 dual-energy scan → 64×112 per-pixel probability of hidden drugs |
| **M2** | Tablet imprint classifier | 48×48 grayscale close-up → twin-crescent (Captagon-style) / plain / scored / letter-stamped |

## Pipeline
1. **Synthetic data.** `gen_data.js` opens `gen.html` in headless Chromium and calls the prototype's own renderers (`js/xray.js`, `js/pills.js`). This produces:
   - 6,000 training and 600 test bag scans with **pixel-level ground-truth masks**. Each scan has random clutter, including hard negatives such as dates, books, shoes and clean protein tubs, plus 0–2 concealments: packets, lining, a block in a protein tub, dense buttons, vials or a false bottom.
   - 12,000 training and 1,200 test tablet close-ups with random lighting, rotation, blur and noise.
2. **Training.** `train.py` (PyTorch) trains both models on CPU:
   - M1: BCE + Dice loss, one-cycle Adam, flip and brightness augmentation.
   - M2: cross-entropy.
   - It evaluates both on the held-out sets and exports the weights and metrics to `models.js`.
3. **Inference.** `../narcolens-prototype/js/nn.js` is a dependency-free JavaScript runtime that matches PyTorch's operations (conv with dilation, max-pool, bilinear upsampling with align_corners=False, dense layers). Models run in the browser, offline, including from `file://`.

## Reproduce
```bash
node gen_data.js ./data            # needs Playwright + Chromium
pip install torch numpy
python train.py ./data ./out       # ~12 min on 4 CPU cores
cp ./out/models.js ../narcolens-prototype/js/models/models.js
```

## Honest scope
The models are trained on **synthetic** data. This proves the full pipeline: data generation with ground truth, training, held-out evaluation, export, and edge/browser inference. It does not prove field accuracy on real customs scans. Production would retrain the same architectures on real, labelled scans obtained under a data-sharing MoU.
