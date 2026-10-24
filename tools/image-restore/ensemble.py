"""Patch glitches in a restored tile from alternative generations of the same tile.

    python3 ensemble.py <tile> <alt_work_dir> [<alt_work_dir> ...]

Each alt dir is a $WORK-shaped folder whose final2/<tile>.png came from restore.py on a
different seed. Where the base tile disagrees with the original (blockwise correlation
below THRESH: a changed digit, a smudged glyph) the best-matching alternative is pasted
in with a soft edge. All candidates share the original's geometry and flat colours, so
patches blend invisibly. The base is backed up to $WORK/final2_base/ first.
"""
import os, shutil, sys
import numpy as np
import cv2
from PIL import Image
S=os.environ.get("WORK",os.path.join(os.getcwd(),".tmp","image-restore"))
THRESH=float(os.environ.get("THRESH","0.95"))
BS=8

def gray(im):
    return cv2.GaussianBlur(cv2.cvtColor(np.asarray(im),cv2.COLOR_RGB2GRAY).astype(np.float32),(0,0),0.8)

def ncc_map(orig_g,cand,size):
    b=gray(cand.resize(size,Image.LANCZOS))
    h,w=orig_g.shape; gh,gw=h//BS,w//BS
    def blocks(a): return a[:gh*BS,:gw*BS].reshape(gh,BS,gw,BS).transpose(0,2,1,3).reshape(gh,gw,-1)
    A,B=blocks(orig_g),blocks(b)
    Am=A-A.mean(-1,keepdims=True); Bm=B-B.mean(-1,keepdims=True)
    sa=np.sqrt((Am**2).mean(-1)); sb=np.sqrt((Bm**2).mean(-1))
    return (Am*Bm).mean(-1)/np.maximum(sa*sb,1e-6),(sa>8)&(sb>8)

tile=sys.argv[1]; alts=sys.argv[2:]
orig=Image.open(f"{S}/crops/{tile}.png").convert("RGB")
base=Image.open(f"{S}/final2/{tile}.png").convert("RGB")
cands=[Image.open(f"{a}/final2/{tile}.png").convert("RGB") for a in alts]
assert all(c.size==base.size for c in cands),"candidates must share the base size"
og=gray(orig); K=base.width/orig.width
nb,vb=ncc_map(og,base,orig.size)
low=((nb<THRESH)&vb).astype(np.uint8)
m=cv2.dilate(low,np.ones((3,7),np.uint8))
n,lab,st,_=cv2.connectedComponentsWithStats(m)
alt_maps=[ncc_map(og,c,orig.size)[0] for c in cands]
out=np.asarray(base,dtype=np.float32).copy(); patched=0
for x,y,w,h,_ in st[1:]:
    sl=(slice(y,y+h),slice(x,x+w))
    bm=nb[sl][low[sl]>0].mean()
    scores=[am[sl][low[sl]>0].mean() for am in alt_maps]
    k=int(np.argmax(scores))
    if scores[k]<bm+0.02: 
        print(f"  keep base  box=({x*BS},{y*BS},{(x+w)*BS},{(y+h)*BS}) base {bm:.3f} best alt {scores[k]:.3f}"); continue
    pad=1
    x0,y0,x1,y1=[int(v*BS*K) for v in (x-pad,y-pad,x+w+pad,y+h+pad)]
    x0,y0=max(x0,0),max(y0,0)
    mask=np.zeros(base.size[::-1],np.float32); mask[y0:y1,x0:x1]=1
    mask=cv2.GaussianBlur(mask,(0,0),K*1.2)[...,None]
    out=out*(1-mask)+np.asarray(cands[k],dtype=np.float32)*mask
    patched+=1; print(f"  patch from {alts[k]}  box=({x*BS},{y*BS},{(x+w)*BS},{(y+h)*BS}) base {bm:.3f} -> {scores[k]:.3f}")
if patched:
    os.makedirs(f"{S}/final2_base",exist_ok=True)
    bak=f"{S}/final2_base/{tile}.png"
    if not os.path.exists(bak): shutil.copy(f"{S}/final2/{tile}.png",bak)
    Image.fromarray(np.clip(out+0.5,0,255).astype(np.uint8)).save(f"{S}/final2/{tile}.png")
print(f"{tile}: {int(low.sum())} flagged blocks, {patched} patches")
