"""stitch_grid.py <image-name> ...

Blend the registered tiles ($WORK/final2/<tile>.png from restore.py) back into the full image with linear
feathers in the overlaps; writes $WORK/final3/<name>.png at the smallest tile scale, capped at $MAX_WIDTH (5400)."""
import sys, json, os
import numpy as np, cv2
from PIL import Image
S=os.environ.get("WORK",os.path.join(os.getcwd(),".tmp","image-restore"))
MAXW=int(os.environ.get("MAX_WIDTH","5400"))
grid=json.load(open(f"{S}/grid.json")); os.makedirs(f"{S}/final3",exist_ok=True)
for n in sys.argv[1:]:
    g=grid[n]; w,h,ov=g["w"],g["h"],g["ov"]
    finals={t["name"]:Image.open(f"{S}/final2/{t['name']}.png").convert("RGB") for t in g["tiles"]}
    s0=min(min(finals[t["name"]].width/(t["x1"]-t["x0"]) for t in g["tiles"]),MAXW/w)
    W0,H0=round(w*s0),round(h*s0)
    acc=np.zeros((H0,W0,3),np.float32); wsum=np.zeros((H0,W0,1),np.float32)
    xs,ys=g["xs"],g["ys"]; C=len(xs)-1; R=len(ys)-1
    for idx,t in enumerate(g["tiles"]):
        i,j=divmod(idx,C)
        x0,y0,x1,y1=[round(v*s0) for v in (t["x0"],t["y0"],t["x1"],t["y1"])]
        tw,th=x1-x0,y1-y0
        img=np.asarray(finals[t["name"]].resize((tw,th),Image.LANCZOS),dtype=np.float32)
        wx=np.ones(tw,np.float32); wy=np.ones(th,np.float32); r=max(int(ov*s0),1)
        if j>0: wx[:r]=np.minimum(wx[:r],np.linspace(0,1,r,dtype=np.float32))
        if j<C-1: wx[-r:]=np.minimum(wx[-r:],np.linspace(1,0,r,dtype=np.float32))
        if i>0: wy[:r]=np.minimum(wy[:r],np.linspace(0,1,r,dtype=np.float32))
        if i<R-1: wy[-r:]=np.minimum(wy[-r:],np.linspace(1,0,r,dtype=np.float32))
        wt=(wy[:,None]*wx[None,:])[...,None]+1e-6
        acc[y0:y1,x0:x1]+=img*wt; wsum[y0:y1,x0:x1]+=wt
    out=np.clip(acc/np.maximum(wsum,1e-6)+0.5,0,255).astype(np.uint8)
    Image.fromarray(out).save(f"{S}/final3/{n}.png"); print(n,(w,h),"->",(W0,H0),f"scale {s0:.2f}")
