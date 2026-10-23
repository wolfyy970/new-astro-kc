"""Stitch restored tiles back into the full tall page.

    python3 stitch_tiles.py bolt-color [bolt-typography ...]

Reads $WORK/tiles.json and $WORK/final2/<tile>.png (from restore.py) and writes
$WORK/final3/<page>.webp at the smallest tile scale, so no tile is upsampled beyond what
the model produced. Cuts sit on whitespace rows and each tile is colour-locked to the
original, so seams are invisible. Pages with transparency keep the original alpha, and
semi-transparent pixels (shadows) keep the original colour: the model only saw a
flattened copy of them.
"""
import json, os, sys
import numpy as np
import cv2
from PIL import Image
S=os.environ.get("WORK",os.path.join(os.getcwd(),".tmp","image-restore"))
SRC=os.environ.get("SRC","public/images/bolt")
Q=int(os.environ.get("Q","95"))
os.makedirs(f"{S}/final3",exist_ok=True)
tiles=json.load(open(f"{S}/tiles.json"))

for page in sys.argv[1:]:
    orig=Image.open(f"{SRC}/{page}.webp").convert("RGBA"); w,h=orig.size
    parts=tiles[page]
    finals=[Image.open(f"{S}/final2/{t['name']}.png").convert("RGB") for t in parts]
    s0=min(f.width/w for f in finals)
    W0,H0=round(w*s0),round(h*s0)
    canvas=Image.new("RGB",(W0,H0))
    for t,f in zip(parts,finals):
        y0,y1=round(t["y0"]*s0),round(t["y1"]*s0)
        canvas.paste(f.resize((W0,y1-y0),Image.LANCZOS),(0,y0))
    alpha=orig.getchannel("A")
    out=canvas
    kw={}
    if alpha.getextrema()[0]<255:
        a=alpha.resize((W0,H0),Image.LANCZOS)
        al=np.asarray(a,dtype=np.float32)/255
        base=np.asarray(orig.convert("RGB").resize((W0,H0),Image.BICUBIC),dtype=np.float32)
        solid=cv2.erode((al>=0.9).astype(np.uint8),np.ones((int(s0*2)|1,)*2,np.uint8)).astype(np.float32)
        sw=(np.clip((al-0.9)/0.1,0,1)*cv2.GaussianBlur(solid,(0,0),s0*0.7))[...,None]
        rgb=np.asarray(canvas,dtype=np.float32)*sw+base*(1-sw)
        out=Image.fromarray(np.clip(rgb+0.5,0,255).astype(np.uint8)).convert("RGBA"); out.putalpha(a)
        kw["exact"]=True
    out.save(f"{S}/final3/{page}.webp","WEBP",quality=Q,method=6,**kw)
    print(f"{page}: {w}x{h} -> {W0}x{H0} (scale {s0:.2f}), {os.path.getsize(f'{S}/final3/{page}.webp')/1e6:.2f} MB")
