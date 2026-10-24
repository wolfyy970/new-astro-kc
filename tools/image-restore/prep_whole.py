"""Pad whole images to a supported aspect ratio for the model (no tiling).

    python3 prep_whole.py <name>=<path> [<name>=<path> ...]    # path relative to $SRC (default public/images)

Writes $WORK/crops/<name>.png (the original, flattened over white if transparent), $WORK/in/<name>.png
(padded, send this one), $WORK/in/<name>.alpha.png when the source has transparency, and adds the padding
geometry to $WORK/meta.json for restore.py.
"""
import json, math, os, sys
import numpy as np
from PIL import Image
S = os.environ.get("WORK", os.path.join(os.getcwd(), ".tmp", "image-restore"))
SRC = os.environ.get("SRC", "public/images")
RATIOS = {"1:1": 1, "3:2": 3 / 2, "2:3": 2 / 3, "4:3": 4 / 3, "3:4": 3 / 4, "4:5": 4 / 5, "5:4": 5 / 4, "9:16": 9 / 16, "16:9": 16 / 9, "21:9": 21 / 9}
for d in ("crops", "in"):
    os.makedirs(f"{S}/{d}", exist_ok=True)
meta_path = f"{S}/meta.json"
meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
for arg in sys.argv[1:]:
    name, path = arg.split("=", 1)
    im = Image.open(f"{SRC}/{path}")
    has_alpha = im.mode in ("RGBA", "LA", "PA") or "transparency" in im.info
    rgba = im.convert("RGBA")
    if has_alpha:
        rgba.getchannel("A").save(f"{S}/in/{name}.alpha.png")
        rgba.save(f"{S}/in/{name}.straight.png")   # straight-alpha original: semi-transparent pixels keep their true colour
    flat = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
    flat.alpha_composite(rgba)
    rgb = np.asarray(flat.convert("RGB"))
    h, w = rgb.shape[:2]
    r = w / h
    key = min(RATIOS, key=lambda k: abs(math.log(RATIOS[k] / r)))
    tr = RATIOS[key]
    if r > tr:
        H, W = round(w / tr), w
    else:
        H, W = h, round(h * tr)
    py, px = H - h, W - w
    t0, l0 = py // 2, px // 2
    Image.fromarray(rgb).save(f"{S}/crops/{name}.png")
    Image.fromarray(np.pad(rgb, ((t0, py - t0), (l0, px - l0), (0, 0)), mode="edge")).save(f"{S}/in/{name}.png")
    meta[name] = dict(w=w, h=h, ratio=key, W=W, H=H, l=l0, t=t0, has_alpha=bool(has_alpha))
    print(f"{name}: {w}x{h} -> {key} {W}x{H} alpha={has_alpha}")
json.dump(meta, open(meta_path, "w"), indent=1)
