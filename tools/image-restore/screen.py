"""screen.py <name> <threshold> <out.png> [orig] [final] [n_spots]

Fine screen of a restored image against its original: 8x8-block correlation, clusters of blocks below the
threshold written out as side-by-side crops (original | restored) for a by-eye check of changed digits,
glyphs and icons. Photo texture also flags (extra detail, not a change): judge by eye."""
import sys, numpy as np
import cv2
from PIL import Image
n=sys.argv[1]; thr=float(sys.argv[2]); out=sys.argv[3]; orig_path=sys.argv[4] if len(sys.argv)>4 else f"/home/user/new-astro-kc/public/images/upwave/{n}.webp"
fin=sys.argv[5] if len(sys.argv)>5 else f"final2/{n}.png"
o=Image.open(orig_path).convert("RGB"); F=Image.open(fin).convert("RGB"); S=F.width/o.width
f=F.resize(o.size,Image.LANCZOS)
g=lambda im: cv2.GaussianBlur(cv2.cvtColor(np.asarray(im),cv2.COLOR_RGB2GRAY).astype(np.float32),(0,0),0.8)
a,b=g(o),g(f); h,w=a.shape; bs=8; gh,gw=h//bs,w//bs
A=a[:gh*bs,:gw*bs].reshape(gh,bs,gw,bs).transpose(0,2,1,3).reshape(gh,gw,-1)
B=b[:gh*bs,:gw*bs].reshape(gh,bs,gw,bs).transpose(0,2,1,3).reshape(gh,gw,-1)
Am=A-A.mean(-1,keepdims=True); Bm=B-B.mean(-1,keepdims=True)
sa=np.sqrt((Am**2).mean(-1)); sb=np.sqrt((Bm**2).mean(-1))
ncc=(Am*Bm).mean(-1)/np.maximum(sa*sb,1e-6); valid=(sa>6)&(sb>6); low=(ncc<thr)&valid
print(n,"valid",int(valid.sum()),"low",int(low.sum()),f"({100*low.sum()/max(valid.sum(),1):.1f}%) median {np.median(ncc[valid]):.3f}")
m=cv2.dilate(low.astype(np.uint8),np.ones((5,9),np.uint8))
nc,lab,st,_=cv2.connectedComponentsWithStats(m)
boxes=sorted([(x*bs,y*bs,(x+w_)*bs,(y+h_)*bs,ar) for x,y,w_,h_,ar in st[1:]],key=lambda b:-b[4])
print(len(boxes),"clusters; biggest:",[(int(a),int(b),int(c),int(d)) for a,b,c,d,_ in boxes[:10]])
vis=o.copy()
from PIL import ImageDraw
d=ImageDraw.Draw(vis)
for gy,gx in zip(*np.nonzero(low)): d.rectangle([gx*bs,gy*bs,gx*bs+bs,gy*bs+bs],outline=(255,0,0))
vis.save(out.replace(".png","_map.png"))
tiles=[]
for x0,y0,x1,y1,_ in boxes[:int(sys.argv[6]) if len(sys.argv)>6 else 8]:
    pad=12; box=(max(x0-pad,0),max(y0-pad,0),min(x1+pad,o.width),min(y1+pad,o.height))
    sc=min(560/(box[2]-box[0]),260/(box[3]-box[1]),6)
    sz=(max(int((box[2]-box[0])*sc),8),max(int((box[3]-box[1])*sc),8))
    ca=o.crop(box).resize(sz,Image.LANCZOS); cb=F.crop(tuple(int(v*S) for v in box)).resize(sz,Image.LANCZOS)
    t=Image.new("RGB",(sz[0]*2+10,sz[1]),(255,0,0)); t.paste(ca,(0,0)); t.paste(cb,(sz[0]+10,0)); tiles.append(t)
if tiles:
    W=max(t.width for t in tiles); H=sum(t.height+6 for t in tiles)
    im=Image.new("RGB",(W,H),(60,60,60)); y=0
    for t in tiles: im.paste(t,(0,y)); y+=t.height+6
    im.save(out); print(out,im.size)
