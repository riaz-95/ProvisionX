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

> All data, images and scores in this prototype are **simulated**. Nothing comes from real passengers, bags or seizures. No nationality or ethnicity data is used.

## How to open it
- Unzip and open `index.html` in Chrome, Edge or Safari. No internet connection, install or login is needed.
- Or serve the folder: `python3 -m http.server`, then open `http://localhost:8000`.

## How to test it (paste into Eureka)
1. Press **▶ Run full demo** (top right). It plays one bag end to end in about 60 seconds, with captions: X-ray flag → case → officer photo → hyperspectral ID → seizure → federated retraining.
2. Or explore each screen from the left menu:
   - **Live Lane (M1):** press *Scan next bag* or pick a bag. Toggle *AI overlay* to compare the raw scan with AI highlights. Some bags are clean, and one (dates box) stays below the threshold.
   - **Inspection Case (M5):** see the evidence timeline and how each module moves the fused score. Try *Open bag*, *Re-scan* or *Clear*.
   - **Inspection Desk (M2):** choose a sample photo and press *Analyse photo*.
   - **Hyperspectral ID (M3):** press *Auto-scan*, then click any pixel to see its spectrum against the library. *Clean supplement* is a control sample.
   - **Novel-Drug Predictor (M4):** press *Run prediction cycle*.
   - **Learning Loop:** press *Lab confirms → retrain network*.
3. The theme button (top right) switches between light and dark mode. The layout works on mobile.

## Files
```
index.html            app shell and screens
css/style.css         styles (light/dark, responsive)
js/data.js            simulated bags, sites, spectral library
js/xray.js            M1 X-ray renderer and AI overlay
js/pills.js           M2 officer photos and recognition results
js/hyperspectral.js   M3 hyperspectral cube and spectral matching
js/app.js             cases, fusion, screens, demo runner
```
