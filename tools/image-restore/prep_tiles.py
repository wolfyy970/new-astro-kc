"""Cut the tall Bolt pages into ~3:2 tiles at whitespace rows and pad each tile to a supported ratio.

    python3 prep_tiles.py            # writes $WORK/crops (unpadded tiles), $WORK/in (padded, send these), meta.json, tiles.json
"""
import json, math, os
import numpy as np
from PIL import Image
S=os.environ.get("WORK",os.path.join(os.getcwd(),".tmp","image-restore"))
SRC=os.environ.get("SRC","public/images/bolt")
RATIOS={"1:1":1,"3:2":3/2,"2:3":2/3,"4:3":4/3,"3:4":3/4,"4:5":4/5,"5:4":5/4,"9:16":9/16,"16:9":16/9,"21:9":21/9}
for d in ("crops","in"): os.makedirs(f"{S}/{d}",exist_ok=True)
meta=json.load(open(f"{S}/meta.json")) if os.path.exists(f"{S}/meta.json") else {}; tiles={}
TARGET=1000
def runs_for(rgb):
    h,w=rgb.shape[:2]; r=rgb[:, :w-30].astype(np.float32)
    dev=np.abs(r-np.median(r,axis=1,keepdims=True)).max(-1).max(1)
    clean=dev<14; runs=[]; s=None
    for y in range(h+1):
        c=clean[y] if y<h else False
        if c and s is None: s=y
        if not c and s is not None:
            if y-s>=12: runs.append((s,y))
            s=None
    return runs
for page in ["bolt-color","bolt-typography","bolt-depth","bolt-grid"]:
    im=Image.open(f"{SRC}/{page}.webp").convert("RGBA"); rgb=np.asarray(im.convert("RGB")); h,w=rgb.shape[:2]
    runs=runs_for(rgb); centers=[(a+b)//2 for a,b in runs if a>100 and b<h-100]
    n=max(1,round(h/TARGET)); cuts=[0]
    for i in range(1,n):
        goal=round(h*i/n); c=min(centers,key=lambda y:abs(y-goal)) 
        cuts.append(c)
    cuts.append(h); cuts=sorted(set(cuts))
    print(page,(w,h),"cuts",cuts,"tile heights",[b-a for a,b in zip(cuts,cuts[1:])])
    for i,(a,b) in enumerate(zip(cuts,cuts[1:])):
        name=f"{page}-t{i}"; t=rgb[a:b]; th=b-a; r=w/th
        key=min(RATIOS,key=lambda k:abs(math.log(RATIOS[k]/r))); tr=RATIOS[key]
        if r>tr: H,W=round(w/tr),w
        else: H,W=th,round(th*tr)
        py,px=H-th,W-w; t0,l0=py//2,px//2
        Image.fromarray(t).save(f"{S}/crops/{name}.png")
        out=np.pad(t,((t0,py-t0),(l0,px-l0),(0,0)),mode="edge")
        Image.fromarray(out).save(f"{S}/in/{name}.png")
        meta[name]=dict(w=w,h=th,ratio=key,W=W,H=H,l=l0,t=t0,has_alpha=False)
        tiles.setdefault(page,[]).append(dict(name=name,y0=a,y1=b))
        print(f"   {name} {w}x{th} -> {key} {W}x{H}")
json.dump(meta,open(f"{S}/meta.json","w"),indent=1); json.dump(tiles,open(f"{S}/tiles.json","w"),indent=1)
