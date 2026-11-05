"""Train the NarcoLens M1 (X-ray concealment segmentation) and M2 (tablet imprint) models
on synthetic data rendered by gen_data.js, evaluate on held-out sets, and export weights
for the prototype's dependency-free JS inference engine (narcolens-prototype/js/nn.js).

Usage: python train.py <dataDir> <outDir>
"""
import base64, json, sys, time, os
import numpy as np
import torch, torch.nn as nn, torch.nn.functional as F

torch.manual_seed(0); np.random.seed(0)
torch.set_num_threads(os.cpu_count() or 4)
D, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)


def load(name, shape):
    return np.fromfile(os.path.join(D, name), np.uint8).reshape(shape)


# ------------------------------------------------------------------ M1
class M1(nn.Module):
    """Tiny fully-convolutional segmenter: 3x128x224 image -> 1x64x112 concealment logits."""
    def __init__(self):
        super().__init__()
        self.c1 = nn.Conv2d(3, 16, 3, padding=1)
        self.c2 = nn.Conv2d(16, 32, 3, padding=1)
        self.c3 = nn.Conv2d(32, 32, 3, padding=2, dilation=2)
        self.c4 = nn.Conv2d(32, 32, 3, padding=4, dilation=4)
        self.c5 = nn.Conv2d(32, 16, 1)
        self.c6 = nn.Conv2d(32, 16, 3, padding=1)
        self.c7 = nn.Conv2d(16, 1, 1)

    def forward(self, x):
        a = F.max_pool2d(F.relu(self.c1(x)), 2)          # 16x64x112
        b = F.max_pool2d(F.relu(self.c2(a)), 2)          # 32x32x56
        b = F.relu(self.c3(b)); b = F.relu(self.c4(b))
        b = F.relu(self.c5(b))                            # 16x32x56
        b = F.interpolate(b, scale_factor=2, mode='bilinear', align_corners=False)  # 16x64x112
        h = F.relu(self.c6(torch.cat([b, a], 1)))
        return self.c7(h)


class M2(nn.Module):
    """Tablet imprint classifier: 1x48x48 grayscale -> 4 classes."""
    def __init__(self):
        super().__init__()
        self.c1 = nn.Conv2d(1, 16, 3, padding=1)
        self.c2 = nn.Conv2d(16, 32, 3, padding=1)
        self.c3 = nn.Conv2d(32, 32, 3, padding=1)
        self.f1 = nn.Linear(32 * 6 * 6, 64)
        self.f2 = nn.Linear(64, 4)

    def forward(self, x):
        x = F.max_pool2d(F.relu(self.c1(x)), 2)
        x = F.max_pool2d(F.relu(self.c2(x)), 2)
        x = F.max_pool2d(F.relu(self.c3(x)), 2)
        x = F.relu(self.f1(x.flatten(1)))
        return self.f2(x)


def prep_x1(X):  # uint8 NHWC -> float NCHW in [-0.5, 0.5]
    return torch.from_numpy(X).permute(0, 3, 1, 2).float().div(255).sub(0.5)


def train_m1():
    Xtr = load('m1_train_X.u8', (-1, 128, 224, 3)); Ytr = load('m1_train_Y.u8', (-1, 64, 112))
    Xte = load('m1_test_X.u8', (-1, 128, 224, 3)); Yte = load('m1_test_Y.u8', (-1, 64, 112)); Lte = load('m1_test_L.u8', (-1,))
    m = M1(); opt = torch.optim.Adam(m.parameters(), 3e-3)
    EP, BS = 14, 32
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, 3e-3, total_steps=EP * ((len(Xtr) + BS - 1) // BS))
    posw = torch.tensor(4.0)
    for ep in range(EP):
        m.train(); perm = np.random.permutation(len(Xtr)); t0 = time.time(); tot = 0
        for i in range(0, len(perm), BS):
            idx = perm[i:i + BS]
            x = prep_x1(Xtr[idx]); y = torch.from_numpy(Ytr[idx]).float().div(255).unsqueeze(1)
            if np.random.rand() < 0.5: x = x.flip(3); y = y.flip(3)
            x = x * (0.85 + 0.3 * torch.rand(len(idx), 1, 1, 1)) + 0.05 * torch.randn(len(idx), 1, 1, 1)
            lo = m(x)
            p = torch.sigmoid(lo)
            dice = 1 - (2 * (p * y).sum() + 1) / (p.sum() + y.sum() + 1)
            loss = F.binary_cross_entropy_with_logits(lo, y, pos_weight=posw) + dice
            opt.zero_grad(); loss.backward(); opt.step(); sched.step(); tot += loss.item() * len(idx)
        print(f'M1 epoch {ep + 1}/{EP} loss {tot / len(Xtr):.4f} ({time.time() - t0:.0f}s)', flush=True)
    m.eval()
    with torch.no_grad():
        P = torch.cat([torch.sigmoid(m(prep_x1(Xte[i:i + 100]))) for i in range(0, len(Xte), 100)]).squeeze(1).numpy()
    Yb = Yte > 127
    inter = ((P > 0.5) & Yb).sum(); union = ((P > 0.5) | Yb).sum()
    # bag-level score = max of 3x3-smoothed heatmap (same as JS post-processing)
    Ps = F.avg_pool2d(torch.from_numpy(P).unsqueeze(1), 3, 1, 1).squeeze(1).numpy()
    score = Ps.reshape(len(P), -1).max(1)
    th = 0.5
    rec = float(((score >= th) & (Lte == 1)).sum() / max(1, (Lte == 1).sum()))
    far = float(((score >= th) & (Lte == 0)).sum() / max(1, (Lte == 0).sum()))
    acc = float(((score >= th) == (Lte == 1)).mean())
    met = dict(pixel_iou=float(inter / max(1, union)), bag_recall=rec, bag_false_alarm=far, bag_accuracy=acc,
               threshold=th, test_bags=int(len(Lte)), test_positive=int((Lte == 1).sum()), train_bags=int(len(Xtr)),
               epochs=EP, params=int(sum(p.numel() for p in m.parameters())))
    print('M1 metrics', json.dumps(met), flush=True)
    return m, met, Xte[:8], P[:8]


def train_m2():
    Xtr = load('m2_train_X.u8', (-1, 48, 48)); Ltr = load('m2_train_L.u8', (-1,))
    Xte = load('m2_test_X.u8', (-1, 48, 48)); Lte = load('m2_test_L.u8', (-1,))
    prep = lambda X: torch.from_numpy(X).float().div(255).sub(0.5).unsqueeze(1)
    m = M2(); opt = torch.optim.Adam(m.parameters(), 2e-3)
    EP, BS = 12, 64
    for ep in range(EP):
        m.train(); perm = np.random.permutation(len(Xtr)); tot = 0
        for i in range(0, len(perm), BS):
            idx = perm[i:i + BS]
            x = prep(Xtr[idx]); y = torch.from_numpy(Ltr[idx]).long()
            if np.random.rand() < 0.5: x = x.flip(3)
            loss = F.cross_entropy(m(x), y)
            opt.zero_grad(); loss.backward(); opt.step(); tot += loss.item() * len(idx)
        print(f'M2 epoch {ep + 1}/{EP} loss {tot / len(Xtr):.4f}', flush=True)
    m.eval()
    with torch.no_grad():
        pr = m(prep(Xte)).argmax(1).numpy()
    cm = np.zeros((4, 4), int)
    for t, p in zip(Lte, pr): cm[t, p] += 1
    crescent_recall = cm[0, 0] / cm[0].sum()
    crescent_fp = cm[1:, 0].sum() / cm[1:].sum()
    met = dict(accuracy=float((pr == Lte).mean()), crescent_recall=float(crescent_recall), crescent_false_positive=float(crescent_fp),
               confusion=cm.tolist(), test_crops=int(len(Lte)), train_crops=int(len(Xtr)), epochs=EP,
               params=int(sum(p.numel() for p in m.parameters())))
    print('M2 metrics', json.dumps(met), flush=True)
    with torch.no_grad():
        ref = torch.softmax(m(prep(Xte[:8])), 1).numpy()
    return m, met, Xte[:8], ref


def export(m, name):
    layers = []
    for n, mod in m.named_children():
        w = mod.weight.detach().numpy().astype(np.float32); b = mod.bias.detach().numpy().astype(np.float32)
        layers.append(dict(name=n, shape=list(w.shape), w=base64.b64encode(w.tobytes()).decode(), b=base64.b64encode(b.tobytes()).decode()))
    return layers


m1, met1, xr1, pr1 = train_m1()
m2, met2, xr2, pr2 = train_m2()
models = {'m1': export(m1, 'm1'), 'm2': export(m2, 'm2')}
with open(os.path.join(OUT, 'models.js'), 'w') as f:
    f.write('/* Trained NarcoLens model weights (generated by narcolens-ml/train.py). */\n')
    f.write('window.NL = window.NL || {};\nNL.MODEL_WEIGHTS = ' + json.dumps(models) + ';\n')
    f.write('NL.MODEL_METRICS = ' + json.dumps({'m1': met1, 'm2': met2, 'trained': time.strftime('%Y-%m-%d')}) + ';\n')
# parity references (not shipped)
np.save(os.path.join(OUT, 'ref_m1_x.npy'), xr1); np.save(os.path.join(OUT, 'ref_m1_p.npy'), pr1)
np.save(os.path.join(OUT, 'ref_m2_x.npy'), xr2); np.save(os.path.join(OUT, 'ref_m2_p.npy'), pr2)
torch.save({'m1': m1.state_dict(), 'm2': m2.state_dict()}, os.path.join(OUT, 'models.pt'))
print('exported', os.path.getsize(os.path.join(OUT, 'models.js')) // 1024, 'KB')
