# NarcoLens – Clickable Prototype (Presight Eureka 3.0)

**Theme:** Defense & Policing
**Type:** Prototype (web build, simulated data)

NarcoLens is an AI software platform that turns the UAE's existing customs X-ray scanners and inspection desks into one connected drug-detection network. Every bag or parcel gets one **Inspection Case**, and five AI modules add evidence to it:

| Module | What it does |
|---|---|
| M1 X-ray Vision | Edge AI on the existing scanner highlights hidden organic masses |
| M2 Pills, Vials & Labels | Officer photo → pill-imprint match, Arabic/English OCR, registry check |
| M3 Hyperspectral ID | Identifies the substance through packaging by matching spectra to a drug library |
| M4 Novel-Drug Predictor | Predicts fingerprints of new synthetic-drug variants and adds them to the M3 library |
| M5 Risk Fusion | Combines all evidence into one explainable score; officer decides |

A federated learning loop retrains every site after each lab-confirmed seizure. Raw images never leave a site.

**New in v2: real AI models.** M1 (X-ray concealment segmentation) and M2 (tablet imprint classifier) are **trained neural networks running live in the browser**. They were trained on thousands of synthetic scans with pixel-level ground truth (see `../narcolens-ml`). Judges can build their own bag, hide drugs anywhere, draw a pill imprint, or upload an image, and the models respond to inputs they have never seen. M3 spectral matching and unmixing and M5 fusion are live algorithms. Every screen has a badge saying what is **live** and what is **simulated**.

> All data is synthetic or simulated. Nothing comes from real passengers, bags or seizures. No nationality or ethnicity data is used.

## How to open it
- Unzip and open `index.html` in Chrome, Edge or Safari. No internet connection, install or login is needed.
- Or serve the folder: `python3 -m http.server`, then open `http://localhost:8000`.

## How to test it (paste into Eureka)
0. **Sign in** with the pre-filled demo account: officer ID `MOHAP-DC-0427`, password `demo`. Mariam Al Noor, MOHAP Pharmaceutical Control Inspector, is a fictional officer.
1. New to the prototype? Press **Judge tour** (top right) for a 5-step guided tour of the things to try. Press **ع** to switch the whole interface to Arabic (right-to-left). Press **?** for keyboard shortcuts (N next bag, D demo, T tour, L language, M mute). Flagged bags trigger a sound and a vibration on phones.
2. Press **▶ Run full demo** (top right). It plays one bag end to end in about 60 seconds, with captions: X-ray flag → case → officer photo → hyperspectral ID → seizure → federated retraining.
3. Or explore each screen from the left menu:
   - **Command Dashboard:** click any entry point on the UAE map. It zooms in and shows site stats. *Open new case here* runs the live model on a fresh scan and opens the case.
   - **Live Lane (M1):** the live model scans each belt bag, including 4 *tricky* bags. Tick *Ground truth* to check the AI's answer.
     - **Build your own bag:** add items, hide drugs, drag things around, then press *Scan with AI*.
     - **Upload a scan:** run the model on any image.
   - **Inspection Case (M5):** see the evidence timeline and how each module moves the fused score. Try *Open bag*, *Re-scan* or *Clear*. Open **What-if** and move the sliders to see how each piece of evidence changes the decision.
   - **Inspection Desk (M2):** press *Analyse photo*. The live model classifies every tablet crop, and a **forensic physical profile** measures diameter, shape and colour from the mm scale bar. *Mixed tablets* shows the model separating Captagon-style tablets from licensed-looking ones. Then use the **Imprint pad**: draw two crescents ( ), a line or a letter, or press *Random example*.
   - **Hyperspectral ID (M3):** press *Auto-scan*, then click any pixel to see its spectrum against the library. *Cut powder* shows unmixing of methamphetamine and caffeine. *Clean supplement* is a control sample.
   - **Challenge · You vs AI:** 5 fresh random bags. Click where you think drugs are hidden, then compare with the model.
   - **Novel-Drug Predictor (M4):** press *Run prediction cycle*.
   - **Learning Loop:** press *Lab confirms → retrain network*.
   - **AI Models:** model cards with held-out test metrics. Press *Test on 40 brand-new random bags* to benchmark the model live.
4. The theme button (top right) switches between light and dark mode. The layout works on mobile.

## Files
```
index.html            app shell and screens
css/style.css         styles (light/dark, responsive)
js/nn.js              dependency-free neural-network runtime (PyTorch-equivalent ops)
js/models/models.js   trained M1 + M2 weights and test metrics
js/data.js            simulated bags, sites, spectral library
js/xray.js            M1 X-ray renderer and AI overlay
js/pills.js           M2 officer photos and recognition results
js/hyperspectral.js   M3 hyperspectral cube and spectral matching
js/app.js             cases, fusion, screens, demo runner
```
