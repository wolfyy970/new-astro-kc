"""prep_grid.py <image-name> <rows> <cols> [overlap=80]

Cut an image into an overlapping grid of tiles (seams placed on low-detail rows/columns), pad each tile to a
supported ratio and record them in $WORK/meta.json + grid.json. Use it for UI mockups whose tiny text or icons
the model misreads at ~3x: at ~6x (a 2x2 grid) it reads them correctly. Send $WORK/in/<tile>.png; the rest
of the pipeline (restore.py) treats each tile as an image."""
import sys, json, math, os
import numpy as np, cv2
S=os.environ.get('WORK',os.path.join(os.getcwd(),'.tmp','image-restore'))
SRC=os.environ.get('SRC','public/images/upwave')
for d in ('crops','in'): os.makedirs(f'{S}/{d}',exist_ok=True)
from PIL import Image
n=sys.argv[1]; R=int(sys.argv[2]); C=int(sys.argv[3]); OV=int(sys.argv[4]) if len(sys.argv)>4 else 80
RATIOS={"1:1":1,"3:2":3/2,"2:3":2/3,"4:3":4/3,"3:4":3/4,"4:5":4/5,"5:4":5/4,"9:16":9/16,"16:9":16/9,"21:9":21/9}
src=f"{SRC}/{n}.webp" if os.path.exists(f"{SRC}/{n}.webp") else f"{S}/crops/{n}.png"
rgb=np.asarray(Image.open(src).convert("RGB")); h,w=rgb.shape[:2]
g=cv2.GaussianBlur(cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY).astype(np.float32),(0,0),1.5)
gx=np.abs(cv2.Sobel(g,cv2.CV_32F,1,0)); gy=np.abs(cv2.Sobel(g,cv2.CV_32F,0,1))
colact=(gx+gy).sum(0); rowact=(gx+gy).sum(1)
def seams(total,parts,act):
    cuts=[0]
    for i in range(1,parts):
        nom=round(total*i/parts); lo,hi=int(nom-0.12*total/parts*parts*0.5),int(nom+0.12*total/parts*parts*0.5)
        lo,hi=max(lo,OV),min(hi,total-OV)
        sm=np.convolve(act,np.ones(15)/15,mode="same"); cuts.append(int(lo+np.argmin(sm[lo:hi])))
    cuts.append(total); return cuts
xs=seams(w,C,colact); ys=seams(h,R,rowact)
meta=json.load(open(f"{S}/meta.json")) if os.path.exists(f"{S}/meta.json") else {}; grid=json.load(open(f"{S}/grid.json")) if os.path.exists(f"{S}/grid.json") else {}
tiles=[]
for i in range(R):
    for j in range(C):
        x0=max(xs[j]-(OV//2 if j>0 else 0),0); x1=min(xs[j+1]+(OV//2 if j<C-1 else 0),w)
        y0=max(ys[i]-(OV//2 if i>0 else 0),0); y1=min(ys[i+1]+(OV//2 if i<R-1 else 0),h)
        t=rgb[y0:y1,x0:x1]; th,tw=t.shape[:2]; r=tw/th
        key=min(RATIOS,key=lambda k:abs(math.log(RATIOS[k]/r))); tr=RATIOS[key]
        if r>tr: H,W=round(tw/tr),tw
        else: H,W=th,round(th*tr)
        py,px=H-th,W-tw; t0,l0=py//2,px//2
        name=f"{n}-r{i}c{j}"
        Image.fromarray(t).save(f"{S}/crops/{name}.png")
        Image.fromarray(np.pad(t,((t0,py-t0),(l0,px-l0),(0,0)),mode="edge")).save(f"{S}/in/{name}.png")
        meta[name]=dict(w=tw,h=th,ratio=key,W=W,H=H,l=l0,t=t0,has_alpha=False)
        tiles.append(dict(name=name,x0=int(x0),y0=int(y0),x1=int(x1),y1=int(y1)))
        print(name,(x0,y0,x1,y1),f"{tw}x{th}",key)
grid[n]=dict(w=w,h=h,xs=xs,ys=ys,ov=OV,tiles=tiles)
json.dump(meta,open(f"{S}/meta.json","w"),indent=1); json.dump(grid,open(f"{S}/grid.json","w"))
