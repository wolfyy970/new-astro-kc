"""Register a generated image onto the original's geometry, then colour-lock flat regions.

    python3 restore.py <name> [<name> ...]     # reads $WORK/raw/<name>.png, writes $WORK/final2/<name>.png

final = model output (flow-registered, sharp edges + text)  where the source has detail
        the original's own colour                             where the source is flat

The model is good at crisp glyphs and bad at flat colour (tints, halos, vignettes), so it
only keeps the pixels near real detail; flat fills come from the source. Needs numpy,
pillow and opencv-python-headless.
"""
import json, os, sys
import numpy as np
import cv2
from PIL import Image, ImageFilter
S=os.environ.get("WORK",os.path.join(os.getcwd(),".tmp","image-restore"))
SRC=os.environ.get("SRC","public/images/bolt")
meta=json.load(open(f"{S}/meta.json"))
for d in ("raw","final2","report"): os.makedirs(f"{S}/{d}",exist_ok=True)

def load_orig(n):
    c=f"{S}/crops/{n}.png"
    return Image.open(c).convert("RGB") if os.path.exists(c) else Image.open(f"{SRC}/{n}.webp").convert("RGB")

def box(a,r):
    """mean filter, window (2r+1), reflect pad; a: HxW or HxWxC"""
    k=2*r+1
    a=a.astype(np.float64)
    p=np.pad(a,((r,r),(r,r))+((0,0),)*(a.ndim-2),mode="reflect")
    c=np.cumsum(np.cumsum(p,0),1)
    c=np.pad(c,((1,0),(1,0))+((0,0),)*(a.ndim-2))
    s=c[k:,k:]-c[:-k,k:]-c[k:,:-k]+c[:-k,:-k]
    return (s/(k*k)).astype(np.float32)

def bbox_content(rgb,thr=14):
    h,w,_=rgb.shape
    border=np.concatenate([rgb[0],rgb[-1],rgb[:,0],rgb[:,-1]]).reshape(-1,3)
    bg=np.median(border,0)
    m=np.abs(rgb.astype(np.float32)-bg).sum(-1)>thr
    ys,xs=np.nonzero(m)
    if len(xs)<20: return None
    return xs.min(),ys.min(),xs.max()+1,ys.max()+1

def warp(raw,T,sx,sy,tx,ty):
    """T=(Tw,Th) target canvas. x_src = sx*x_T + tx ... sx=raw px per T px."""
    img=raw.transform(T,Image.AFFINE,(sx,0,tx,0,sy,ty),resample=Image.BICUBIC)
    valid=Image.new("L",raw.size,255).transform(T,Image.AFFINE,(sx,0,tx,0,sy,ty),resample=Image.BILINEAR)
    return img,np.asarray(valid,dtype=np.float32)/255

def score(a,b):
    """mean abs diff on grayscale at low res"""
    return float(np.abs(a-b).mean())

def register(n,raw,orig):
    m=meta[n]; w,h=orig.size
    W,H=raw.size
    K=W/m["W"]; Ky=H/m["H"]
    T=(round(w*K),round(h*K))
    # low-res working copies: one orig px == f low px
    lw=min(640,w); f=lw/w; lh=round(h*f)
    q=f/K                                    # raw -> low scale
    raw_l=raw.resize((max(1,round(W*q)),max(1,round(H*q))),Image.BILINEAR)
    og=np.asarray(orig.convert("L").resize((lw,lh),Image.BILINEAR),dtype=np.float32)
    def ev(sx_,sy_,tx_,ty_):
        a=raw_l.convert("L").transform((lw,lh),Image.AFFINE,(sx_/K,0,tx_*q,0,sy_/K,ty_*q),resample=Image.BILINEAR)
        return float(np.abs(np.asarray(a,dtype=np.float32)-og).mean())
    cands=[("pad",K,Ky,m["l"]*K,m["t"]*Ky)]
    bo=bbox_content(np.asarray(orig),30); br=bbox_content(np.asarray(raw),44)
    if bo and br:
        sxr=(br[2]-br[0])/(bo[2]-bo[0]); syr=(br[3]-br[1])/(bo[3]-bo[1])
        cands.append(("bbox",sxr,syr,br[0]-bo[0]*sxr,br[1]-bo[1]*syr))
    best=None
    for name,sx_,sy_,tx_,ty_ in cands:
        e=ev(sx_,sy_,tx_,ty_)
        if best is None or e<best[0]: best=(e,name,(sx_,sy_,tx_,ty_))
    ce,name,cur=best
    step=0.6/q
    for it in range(14):
        improved=False
        for dsx in (-0.003,0,0.003):
            for dsy in (-0.003,0,0.003):
                for dtx in (-step,0,step):
                    for dty in (-step,0,step):
                        c=(cur[0]*(1+dsx),cur[1]*(1+dsy),cur[2]+dtx,cur[3]+dty)
                        v=ev(*c)
                        if v<ce-1e-4: ce,cur,improved=v,c,True
        if not improved:
            step/=2
            if step*q<0.04: break
    return T,K,cur,name,ce

def refine(orig,A,T):
    """dense flow (DIS) so the model output lands on the original's geometry (local warps)"""
    ow,oh=orig.size
    f=min(2.0,3000/ow); lw,lh=round(ow*f),round(oh*f)
    go=cv2.resize(np.asarray(orig.convert("L")),(lw,lh),interpolation=cv2.INTER_CUBIC)
    Anp=np.ascontiguousarray(np.asarray(A))
    ga=cv2.resize(cv2.cvtColor(Anp,cv2.COLOR_RGB2GRAY),(lw,lh),interpolation=cv2.INTER_AREA)
    go=cv2.GaussianBlur(go,(0,0),f*0.8); ga=cv2.GaussianBlur(ga,(0,0),f*0.8)
    dis=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    flow=dis.calc(go,ga,None)
    flow=cv2.GaussianBlur(flow,(0,0),f*1.5)
    mag=np.hypot(flow[...,0],flow[...,1])/f   # orig px
    fx=cv2.resize(flow[...,0],T,interpolation=cv2.INTER_LINEAR)*(T[0]/lw)
    fy=cv2.resize(flow[...,1],T,interpolation=cv2.INTER_LINEAR)*(T[1]/lh)
    xs,ys=np.meshgrid(np.arange(T[0],dtype=np.float32),np.arange(T[1],dtype=np.float32))
    out=cv2.remap(Anp,xs+fx,ys+fy,cv2.INTER_CUBIC,borderMode=cv2.BORDER_REFLECT)
    return Image.fromarray(out),(float(mag.mean()),float(np.percentile(mag,99)),float(mag.max()))

def flat_color_field(orig,r_std=2,thr=2.2,erode=4,sigma_r=1):
    o=np.asarray(orig,dtype=np.float32)
    g=o.max(-1)-0  # use per-channel std instead
    var=np.zeros(o.shape[:2],dtype=np.float32)
    for c in range(3):
        ch=o[...,c]; m1=box(ch,r_std); m2=box(ch*ch,r_std)
        var=np.maximum(var,m2-m1*m1)
    flat=(np.sqrt(np.maximum(var,0))<thr).astype(np.float32)
    # erode so pixels near any edge/detail are never locked
    flat=(box(flat,erode)>0.999).astype(np.float32)
    # smooth local-mean colour via normalised convolution (3 box passes ~ gaussian)
    num=o*flat[...,None]; den=flat.copy()
    for _ in range(2):
        num=box(num,sigma_r); den=box(den,sigma_r)
    col=num/np.maximum(den[...,None],1e-4)
    return flat,col

def tint_field(orig,out,T,flat):
    """local colour bias of the model output, measured on flat source regions and spread (normalised conv) into detail zones"""
    o=np.asarray(orig,dtype=np.float32)
    Alo=cv2.resize(out,orig.size,interpolation=cv2.INTER_AREA)
    D=o-Alo
    w=flat
    def spread(r,passes):
        num=D*w[...,None]; den=w.copy()
        for _ in range(passes):
            num=box(num,r); den=box(den,r)
        return num,den
    nf,df=spread(3,3); nc,dc=spread(9,3)
    fine=nf/np.maximum(df[...,None],1e-6); coarse=nc/np.maximum(dc[...,None],1e-6)
    a=np.clip(df/0.05,0,1)[...,None]
    Dc=fine*a+coarse*(1-a)
    Dc[dc<1e-4]=0
    return cv2.resize(Dc.astype(np.float32),T,interpolation=cv2.INTER_CUBIC)

def thin_mask(orig):
    """1 where the original has thin structure (text strokes, hairlines), 0 on large shapes and flat fills.
    Large shapes keep the original's geometry; only thin structure is taken from the model."""
    g=np.asarray(orig.convert("L"),dtype=np.float32)
    k=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7))
    th=np.maximum(g-cv2.morphologyEx(g,cv2.MORPH_OPEN,k),cv2.morphologyEx(g,cv2.MORPH_CLOSE,k)-g)
    m=(th>10).astype(np.uint8)
    m=cv2.dilate(m,np.ones((5,5),np.uint8))
    return cv2.GaussianBlur(m.astype(np.float32),(0,0),0.8)

def shape_layer(orig,T,K):
    """The original upscaled with edge-sharpening (shock-style): crisp edges, exact colours, soft gradients untouched."""
    up=cv2.resize(np.asarray(orig,dtype=np.float32),T,interpolation=cv2.INTER_CUBIC)
    g=up@np.array([.299,.587,.114],np.float32)
    ker=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(max(3,int(round(K*1.6))|1),)*2)
    lo,hi=cv2.erode(up,ker),cv2.dilate(up,ker)
    glo,ghi=cv2.erode(g,ker),cv2.dilate(g,ker)
    rng=ghi-glo
    t=np.clip((g-(glo+ghi)/2)/np.maximum(0.2*rng,1e-3),-1,1)*0.5+0.5
    sharp=lo+(hi-lo)*t[...,None]
    amt=np.clip((rng-8)/20,0,1)[...,None]
    return up*(1-amt)+sharp*amt

def assemble(n):
    m=meta[n]
    orig=load_orig(n); raw=Image.open(f"{S}/raw/{n}.png").convert("RGB")
    T,K,(sx,sy,tx,ty),how,err=register(n,raw,orig)
    img,valid=warp(raw,T,sx/K,sy/K,tx,ty)
    img,fst=refine(orig,img,T)
    base=orig.resize(T,Image.BICUBIC)
    A=np.asarray(img,dtype=np.float32); Bv=np.asarray(base,dtype=np.float32)
    v=valid[...,None]
    out=A*v+Bv*(1-v)
    flat_t,_=flat_color_field(orig,r_std=2,erode=int(os.environ.get('TINT_ERODE','3')))
    out=out+tint_field(orig,out,T,flat_t)
    if not os.environ.get("NO_STRUCT"):
        tm=cv2.resize(thin_mask(orig),T,interpolation=cv2.INTER_LINEAR)[...,None]
        out=out*tm+shape_layer(orig,T,K)*(1-tm)
    flat,col=flat_color_field(orig,r_std=1,erode=int(os.environ.get('LOCK_ERODE','2')))
    Alo=np.asarray(Image.fromarray(np.clip(out+0.5,0,255).astype(np.uint8)).resize(orig.size,Image.BOX),dtype=np.float32)
    vA=np.zeros(flat.shape,dtype=np.float32)
    for c in range(3):
        m1=box(Alo[...,c],2); m2=box(Alo[...,c]**2,2); vA=np.maximum(vA,m2-m1*m1)
    flatA=(box((np.sqrt(np.maximum(vA,0))<5).astype(np.float32),2)>0.999).astype(np.float32)
    if os.environ.get('GATE_A'): flat=flat*flatA
    fm=Image.fromarray((flat*255).astype(np.uint8)).resize(T,Image.BICUBIC).filter(ImageFilter.GaussianBlur(max(0.6,K*0.5)))
    fm=np.asarray(fm,dtype=np.float32)[...,None]/255
    cf=np.asarray(Image.fromarray(np.clip(col,0,255).astype(np.uint8)).resize(T,Image.BICUBIC),dtype=np.float32)
    # lock only where the source is flat; keep model output elsewhere
    out=out*(1-fm)+cf*fm
    if m["has_alpha"]:
        a=Image.open(f"{S}/in/{n}.alpha.png").resize(T,Image.LANCZOS)
        al=np.asarray(a,dtype=np.float32)/255
        solid=cv2.erode((al>=0.9).astype(np.uint8),np.ones((int(K*2)|1,)*2,np.uint8)).astype(np.float32)
        sw=(np.clip((al-0.9)/0.1,0,1)*cv2.GaussianBlur(solid,(0,0),K*0.7))[...,None]   # soft / semi-transparent pixels (shadows) keep the original's own colour
        out=out*sw+Bv*(1-sw)
    res=Image.fromarray(np.clip(out+0.5,0,255).astype(np.uint8))
    if m["has_alpha"]:
        res=res.convert("RGBA"); res.putalpha(a)
    res.save(f"{S}/final2/{n}.png")
    info=dict(name=n,how=how,reg_err=round(err,2),K=round(K,2),T=T,scale=(round(sx/K,3),round(sy/K,3)),flat_frac=round(float(flat.mean()),3),coverage=round(float(valid.mean()),3),flow=tuple(round(x,1) for x in fst))
    return res,info

def ncc_report(n,res):
    orig=load_orig(n)
    d=np.asarray(res.convert("RGB").resize(orig.size,Image.LANCZOS),dtype=np.float32); o=np.asarray(orig,dtype=np.float32)
    go=o@np.array([.299,.587,.114],dtype=np.float32); gd=d@np.array([.299,.587,.114],dtype=np.float32)
    go=box(go,1); gd=box(gd,1)
    bs=16; h,w=go.shape; gh,gw=h//bs,w//bs
    A=go[:gh*bs,:gw*bs].reshape(gh,bs,gw,bs).transpose(0,2,1,3).reshape(gh,gw,-1)
    Bk=gd[:gh*bs,:gw*bs].reshape(gh,bs,gw,bs).transpose(0,2,1,3).reshape(gh,gw,-1)
    Am=A-A.mean(-1,keepdims=True); Bm=Bk-Bk.mean(-1,keepdims=True)
    sa=np.sqrt((Am**2).mean(-1)); sb=np.sqrt((Bm**2).mean(-1))
    ncc=(Am*Bm).mean(-1)/np.maximum(sa*sb,1e-6); valid=(sa>=6)|(sb>=6)
    low=(ncc<0.8)&valid
    sd=(d-o).mean((0,1))
    print(f"   NCC<0.8 blocks {low.sum()}/{valid.sum()} ({100*low.sum()/max(valid.sum(),1):.1f}%)  signed RGB shift {np.round(sd,1)}  mean|d| {np.round(np.abs(d-o).mean((0,1)),1)}")
    from PIL import ImageDraw
    vis=orig.copy(); dr=ImageDraw.Draw(vis)
    for gy,gx in zip(*np.nonzero(low)): dr.rectangle([gx*bs,gy*bs,gx*bs+bs,gy*bs+bs],outline=(255,0,0),width=1)
    vis.save(f"{S}/report/{n}_lowncc2.png")

if __name__=="__main__":
    for n in sys.argv[1:]:
        r,info=assemble(n); print(json.dumps(info)); ncc_report(n,r)
