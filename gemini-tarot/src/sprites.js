/* ================= 스프라이트 가공: 그림 한 장에서 모든 그래픽을 만든다 ================= */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mkc=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c};
const SP={ready:false};

function rgb2hsv(r,g,b){
  r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;
  if(d){if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}
  return [h,mx?d/mx:0,mx];
}
function hsv2rgb(h,s,v){
  h=((h%360)+360)%360;const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;let r=0,g=0,b=0;
  if(h<60)[r,g,b]=[c,x,0];else if(h<120)[r,g,b]=[x,c,0];else if(h<180)[r,g,b]=[0,c,x];
  else if(h<240)[r,g,b]=[0,x,c];else if(h<300)[r,g,b]=[x,0,c];else[r,g,b]=[c,0,x];
  return [(r+m)*255,(g+m)*255,(b+m)*255];
}
/* 보라·자홍 계열(망토 안감, 머리 포인트, 눈동자)만 골라 색조를 돌린다. 피부와 금색 지휘봉은 그대로. */
function tint(src,dh,satMul=1,valMul=1){
  const o=mkc(src.width,src.height),c=o.getContext('2d',{willReadFrequently:true});
  c.drawImage(src,0,0);
  if(!dh&&satMul===1&&valMul===1)return o;
  const id=c.getImageData(0,0,o.width,o.height),d=id.data;
  for(let i=0;i<d.length;i+=4){
    if(!d[i+3])continue;
    const [h,s,v]=rgb2hsv(d[i],d[i+1],d[i+2]);
    if(s>.28&&h>=245&&h<=352&&v>.25){
      const [r,g,b]=hsv2rgb(h+dh,clamp(s*satMul,0,1),clamp(v*valMul,0,1));
      d[i]=r;d[i+1]=g;d[i+2]=b;
    }
  }
  c.putImageData(id,0,0);return o;
}
function crop(src,x,y,w,h,scale=1){
  const o=mkc(w*scale,h*scale),c=o.getContext('2d');c.imageSmoothingQuality='high';
  c.drawImage(src,x,y,w,h,0,0,o.width,o.height);return o;
}
function circleMask(src,feather=.18){
  const o=mkc(src.width,src.height),c=o.getContext('2d');
  c.drawImage(src,0,0);c.globalCompositeOperation='destination-in';
  const r=o.width/2,g=c.createRadialGradient(r,o.height/2,r*(1-feather),r,o.height/2,r);
  g.addColorStop(0,'#fff');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,o.width,o.height);return o;
}
function silhouette(src,color){
  const o=mkc(src.width,src.height),c=o.getContext('2d');
  c.drawImage(src,0,0);c.globalCompositeOperation='source-in';c.fillStyle=color;c.fillRect(0,0,o.width,o.height);return o;
}
function flipX(src){const o=mkc(src.width,src.height),c=o.getContext('2d');c.translate(o.width,0);c.scale(-1,1);c.drawImage(src,0,0);return o}
function flipY(src){const o=mkc(src.width,src.height),c=o.getContext('2d');c.translate(0,o.height);c.scale(1,-1);c.drawImage(src,0,0);return o}
function invertColors(src){
  const o=mkc(src.width,src.height),c=o.getContext('2d',{willReadFrequently:true});c.drawImage(src,0,0);
  const id=c.getImageData(0,0,o.width,o.height),d=id.data;
  for(let i=0;i<d.length;i+=4){d[i]=255-d[i];d[i+1]=255-d[i+1];d[i+2]=255-d[i+2]}
  c.putImageData(id,0,0);return o;
}
function toURL(c){return new Promise(res=>c.toBlob(b=>res(URL.createObjectURL(b)),'image/png'))}

function buildSprites(img){
  const W=img.naturalWidth,H=img.naturalHeight;
  const base=mkc(W,H),bx=base.getContext('2d',{willReadFrequently:true});bx.drawImage(img,0,0);
  SP.orig=base;
  const id=bx.getImageData(0,0,W,H),d=id.data,key=new Uint8ClampedArray(d.length);
  /* 1) 배경(베이지)·붉은 바닥 제거. 검은 윤곽선의 반투명 가장자리는 알파로 복원한다 */
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=(y*W+x)*4;let r=d[i],g=d[i+1],b=d[i+2],a=255;
    if(x<118||x>684||y<58||y>1264||(y>=1246&&x>445))a=0;
    else if(y>1160&&r>85&&g<85&&b<105&&r-g>45)a=0;
    else{
      const dist=Math.abs(r-222)+Math.abs(g-208)+Math.abs(b-194);
      if(dist<16)a=0;
      else if(dist<62){
        const lum=(r+g+b)/3,s=lum/208;
        const er=Math.abs(r-222*s)+Math.abs(g-208*s)+Math.abs(b-194*s);
        if(er<26){a=Math.round(255*clamp(1-s,0,1));r=g=b=0}else a=Math.round(255*(dist-16)/46);
      }
    }
    key[i]=r;key[i+1]=g;key[i+2]=b;key[i+3]=a;
  }
  /* 2) 작은 찌꺼기 제거 (연결 성분) */
  const seen=new Uint8Array(W*H),stack=new Int32Array(W*H);
  for(let p=0;p<W*H;p++){
    if(seen[p]||key[p*4+3]<40)continue;
    let sp=0,n=0;const members=[];stack[sp++]=p;seen[p]=1;
    while(sp){
      const q=stack[--sp];members.push(q);n++;const qx=q%W,qy=(q/W)|0;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const nx=qx+dx,ny=qy+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;
        const np=ny*W+nx;if(!seen[np]&&key[np*4+3]>=40){seen[np]=1;stack[sp++]=np}
      }
    }
    if(n<260)for(const q of members)key[q*4+3]=0;
  }
  /* 3) 경계 상자 */
  let x0=W,y0=H,x1=0,y1=0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(key[(y*W+x)*4+3]>40){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
  x0=Math.max(0,x0-2);y0=Math.max(0,y0-2);x1=Math.min(W-1,x1+2);y1=Math.min(H-1,y1+2);
  const keyed=mkc(W,H);keyed.getContext('2d').putImageData(new ImageData(key,W,H),0,0);
  SP.keyed=keyed;SP.bb={x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};
  const full=crop(keyed,x0,y0,SP.bb.w,SP.bb.h);
  /* 4) 지휘봉을 몸에서 분리 → 휘두르는 연출용 레이어 */
  const WR={x:120,y:190,w:118,h:175};
  const wand=crop(keyed,WR.x,WR.y,WR.w,WR.h);
  const body=mkc(full.width,full.height),bc=body.getContext('2d');bc.drawImage(full,0,0);
  bc.clearRect(WR.x-x0,WR.y-y0,WR.w,WR.h);
  SP.full=full;SP.body=body;SP.wand=wand;SP.wandRect={x:WR.x-x0,y:WR.y-y0,w:WR.w,h:WR.h};
  SP.origin={x:x0,y:y0};
  /* 5) 파츠 */
  SP.head=crop(keyed,282,60,230,225);
  SP.bust=crop(keyed,170,60,420,430);
  SP.eye=circleMask(crop(base,382,160,60,50,5),.25);
  SP.shoes=crop(keyed,225,1110,240,154);
  SP.skirt=crop(keyed,160,820,330,444);
  SP.ruffle=crop(keyed,190,840,270,200);
  SP.cape=crop(keyed,150,370,520,420);
  SP.hand=crop(keyed,205,260,260,200);
  /* 6) 장식 문양: 어두운 정도를 알파로 삼아 어떤 색으로도 칠할 수 있는 실루엣 */
  const orn=(x,y,w,h)=>{
    const c=crop(base,x,y,w,h),cx=c.getContext('2d',{willReadFrequently:true});
    const o=cx.getImageData(0,0,w,h),dd=o.data;
    for(let i=0;i<dd.length;i+=4){const lum=(dd[i]+dd[i+1]+dd[i+2])/3,a=clamp((165-lum)/110,0,1);dd[i]=dd[i+1]=dd[i+2]=0;dd[i+3]=a*255}
    cx.putImageData(o,0,0);return c;
  };
  SP.ornA=orn(10,95,80,205);
  SP.ornB=orn(8,890,86,260);
  SP.ornAr=flipX(SP.ornA);SP.ornBr=flipX(SP.ornB);
  SP.ready=true;
}

/* ================= 도색(분신 만들기) ================= */
const PALETTES={
  gemini:{dh:0,sat:1,val:1},
  astra:{dh:-118,sat:1.05,val:1.05},
  maid:{dh:44,sat:1.1,val:.95},
  sol:{dh:170,sat:1.15,val:1.05},
  mirror:{dh:0,sat:1,val:1,invert:true},
  ghost:{dh:-40,sat:.35,val:1.1,grey:true}
};
function greyOut(src,k=.7){
  const o=mkc(src.width,src.height),c=o.getContext('2d',{willReadFrequently:true});c.drawImage(src,0,0);
  const id=c.getImageData(0,0,o.width,o.height),d=id.data;
  for(let i=0;i<d.length;i+=4){const l=.3*d[i]+.59*d[i+1]+.11*d[i+2];d[i]+=(l-d[i])*k;d[i+1]+=(l-d[i+1])*k;d[i+2]+=(l-d[i+2])*k}
  c.putImageData(id,0,0);return o;
}
const _cache={};
function paint(src,pal,key){
  const k=key+'|'+pal;if(_cache[k])return _cache[k];
  const p=PALETTES[pal]||PALETTES.gemini;
  let o=tint(src,p.dh,p.sat,p.val);
  if(p.grey)o=greyOut(o,.7);
  if(p.invert)o=invertColors(o);
  return(_cache[k]=o);
}
const paletteBody=pal=>paint(SP.body,pal,'body');
const paletteWand=pal=>paint(SP.wand,pal,'wand');
/* ---- 동료 일러스트(별도 4장): 오른쪽을 보도록 좌우 반전해 둔다 ---- */
const CH_SPR={};
function buildChars(imgs){
  for(const k in imgs){const im=imgs[k],c=mkc(im.naturalWidth,im.naturalHeight);c.getContext('2d').drawImage(im,0,0);CH_SPR[k]=flipX(c)}
  CH_SPR.belis_inv=invertColors(CH_SPR.belis);
}
/* 상반신·얼굴 크롭 (반전 후 좌표, 비율) */
const CH_BUST={belis:[.02,0,.54,.46],obser:[0,0,.6,.46],sol:[.1,0,.7,.46],claire:[.04,0,.76,.43]};
const CH_FACE={belis:[.04,.0,.52],obser:[.0,.0,.58],sol:[.08,.0,.56],claire:[.06,.0,.62]};
function chBase(k){return String(k).split('_')[0]}
/* 지휘봉까지 합친 전신 */
function fullFigure(pal){
  if(CH_SPR[pal])return CH_SPR[pal];
  const k='full|'+pal;if(_cache[k])return _cache[k];
  const b=paletteBody(pal),w=paletteWand(pal),o=mkc(b.width,b.height),c=o.getContext('2d');
  c.drawImage(b,0,0);c.drawImage(w,SP.wandRect.x,SP.wandRect.y);
  return(_cache[k]=o);
}
/* 상반신(대화창용) */
function bustCanvas(pal){
  const k='bust|'+pal;if(_cache[k])return _cache[k];
  if(CH_SPR[pal]){
    const f=CH_SPR[pal],b=CH_BUST[chBase(pal)],x=b[0]*f.width,y=b[1]*f.height,w=(b[2]-b[0])*f.width,h=(b[3]-b[1])*f.height;
    return(_cache[k]=crop(f,x,y,w,h));
  }
  const f=fullFigure(pal),o=mkc(420,430),c=o.getContext('2d');
  c.drawImage(f,-(170-SP.origin.x),-(60-SP.origin.y));
  return(_cache[k]=o);
}
/* 작은 얼굴 아이콘(카드·파티 목록용) */
function iconCanvas(pal){
  const k='icon|'+pal;if(_cache[k])return _cache[k];
  if(CH_SPR[pal]){
    const f=CH_SPR[pal],fc=CH_FACE[chBase(pal)],sz=fc[2]*f.width,o=mkc(96,96),c=o.getContext('2d');
    c.imageSmoothingQuality='high';c.drawImage(f,fc[0]*f.width,fc[1]*f.height,sz,sz,0,0,96,96);
    return(_cache[k]=o);
  }
  const f=fullFigure(pal),o=mkc(96,96),c=o.getContext('2d');
  c.imageSmoothingQuality='high';
  c.drawImage(f,-(316-SP.origin.x)*.82,-(128-SP.origin.y)*.82,f.width*.82,f.height*.82);
  return(_cache[k]=o);
}
/* 적 스프라이트 명세 → 캔버스 */
function enemyCanvas(spec){
  const pal=spec.pal||'gemini',k='en|'+spec.kind+'|'+pal+'|'+(spec.color||'')+'|'+(spec.key||'');
  if(_cache[k])return _cache[k];
  let c;
  switch(spec.kind){
    case'figure':c=fullFigure(pal);break;
    case'ch':c=spec.frames?variantCanvas(spec.key.split('_')[0],'twist',0):CH_SPR[spec.key];break;
    case'eye':c=SP.eye;break;
    case'wand':c=paletteWand(pal);break;
    case'shoes':c=paint(SP.shoes,pal,'shoes');break;
    case'skirt':c=paint(SP.skirt,pal,'skirt');break;
    case'hand':c=paint(SP.hand,pal,'hand');break;
    case'cape':c=paint(SP.cape,pal,'cape');break;
    case'head':c=paint(SP.head,pal,'head');break;
    case'orn':{
      const a=silhouette(SP.ornB,spec.color||'#7a1230'),b=silhouette(SP.ornBr,spec.color||'#7a1230');
      const o=mkc(a.width*2+10,a.height),x=o.getContext('2d');x.drawImage(a,0,0);x.drawImage(b,a.width+10,0);c=o;break}
    default:c=fullFigure(pal);
  }
  return(_cache[k]=c);
}
function cloneCanvas(src){const o=mkc(src.width,src.height);o.getContext('2d').drawImage(src,0,0);return o}

/* ================= 안개에 먹힌 분신: 4장의 일러스트를 변형해 적 스프라이트로 ================= */
function mapPix(src,fn){
  const o=mkc(src.width,src.height),c=o.getContext('2d',{willReadFrequently:true});c.drawImage(src,0,0);
  const id=c.getImageData(0,0,o.width,o.height),d=id.data,W=o.width;
  for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;const p=i>>2,r=fn(d[i],d[i+1],d[i+2],p%W,(p/W)|0);if(r){d[i]=r[0];d[i+1]=r[1];d[i+2]=r[2]}}
  c.putImageData(id,0,0);return o;
}
const EYEPOS={claire:[[.335,.215],[.46,.21]],obser:[[.33,.325],[.46,.33]],sol:[[.345,.285],[.47,.28]],belis:[[.255,.205],[.37,.21]]};
function dripEyes(c,w,h,pts,col,len){
  for(const [fx,fy] of pts){
    const x=fx*w,y=fy*h,g=c.createLinearGradient(x,y,x,y+len*h);g.addColorStop(0,col);g.addColorStop(1,'rgba(90,0,10,0)');
    c.fillStyle=g;c.beginPath();c.moveTo(x-3,y);c.lineTo(x+3,y);c.lineTo(x+1.5,y+len*h);c.lineTo(x-1.5,y+len*h);c.fill();
    c.beginPath();c.arc(x,y+len*h*.92,3.4,0,6.3);c.fillStyle='#7a0010';c.fill();
  }
}
function variantCanvas(ch,style,frame=0){
  const k='var|'+ch+'|'+style+'|'+frame;if(_cache[k])return _cache[k];
  const base=CH_SPR[ch],W=base.width,H=base.height;let o;
  if(style==='horror'){
    /* 클레르: 창백한 회청색 + 녹슨 붉은 금속, 검게 빈 눈, 흘러내리는 피 */
    o=mapPix(base,(r,g,b,x,y)=>{
      const [hh,ss,vv]=rgb2hsv(r,g,b),l=.3*r+.59*g+.11*b;
      const amber=hh>12&&hh<55&&ss>.5&&vv>.55;
      if(amber){const eye=y>H*.17&&y<H*.28&&x>W*.25&&x<W*.58;return eye?[8,0,0]:[Math.min(255,vv*150+20),vv*18,vv*20]}
      const m=.72;return[l*.9+(r-l)*(1-m)*.4,l*.92+(g-l)*(1-m)*.4,l*1.06+(b-l)*(1-m)*.4].map(v=>Math.max(0,Math.min(255,v*.86)));
    });
    const c=o.getContext('2d');c.save();c.globalCompositeOperation='source-atop';
    for(const [fx,fy] of EYEPOS.claire){const x=fx*W,y=fy*H,rg=c.createRadialGradient(x,y,0,x,y,W*.05);rg.addColorStop(0,'rgba(255,40,40,.95)');rg.addColorStop(.25,'rgba(120,0,0,.85)');rg.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=rg;c.fillRect(x-W*.06,y-W*.06,W*.12,W*.12)}
    dripEyes(c,W,H,EYEPOS.claire,'rgba(150,0,16,.95)',.11);
    let sd=11;const R=()=>{sd=(sd*16807)%2147483647;return sd/2147483647};
    for(let i=0;i<26;i++){const x=W*(.1+.8*R()),y=H*(.34+.58*R()),rr=W*(.012+.03*R());c.fillStyle=`rgba(${100+R()*50|0},0,${R()*14|0},${.5+R()*.4})`;c.beginPath();c.ellipse(x,y,rr,rr*(1+R()*1.6),R()*3,0,6.3);c.fill()}
    c.restore();
  }else if(style==='twist'){
    /* 솔: 산성 녹색으로 썩은 색, 줄마다 어긋나는 물결 왜곡 (프레임마다 위상이 다르다) */
    const col=mapPix(base,(r,g,b)=>{const [hh,ss,vv]=rgb2hsv(r,g,b);if(ss>.35&&hh>20&&hh<70){const [nr,ng,nb]=hsv2rgb(hh+62,Math.min(1,ss*1.1),vv*.9);return[nr,ng,nb]}if(ss<.2&&vv>.8)return[r*.86,g*.97,b*.8];return null});
    o=mkc(W*1.25,H);const c=o.getContext('2d'),ph=frame*1.05,amp=W*.045;
    c.globalAlpha=.32;c.save();c.translate(W*.1,0);c.drawImage(col,W*.08,0,W,H);c.restore();c.globalAlpha=1;
    for(let y=0;y<H;y++){const t=y/H,dx=Math.sin(y*.05+ph)*amp*(.4+t)+Math.sin(y*.013-ph*.7)*amp*.8;c.drawImage(col,0,y,W,1,W*.12+dx,y,W,1)}
  }else if(style==='overwork'){
    /* 옵서: 핏기 없는 회녹색, 짙은 다크서클 */
    o=mapPix(base,(r,g,b)=>{const l=.3*r+.59*g+.11*b;return[l*.86+(r-l)*.3,l*.94+(g-l)*.3,l*.88+(b-l)*.3].map(v=>Math.max(0,Math.min(255,v*.9)))});
    const c=o.getContext('2d');c.save();c.globalCompositeOperation='source-atop';
    for(const [fx,fy] of EYEPOS.obser){const x=fx*W,y=fy*H+H*.02,rg=c.createRadialGradient(x,y,0,x,y,W*.045);rg.addColorStop(0,'rgba(60,30,90,.85)');rg.addColorStop(1,'rgba(60,30,90,0)');c.fillStyle=rg;c.beginPath();c.ellipse(x,y,W*.05,W*.028,0,0,6.3);c.fill()}
    c.restore();
  }else{ /* trick: 벨리스를 반쪽씩 다른 색으로 (어릿광대) */
    const alt=tint(base,150,1.1,1.05),cut=mkc(W,H),x=cut.getContext('2d');
    o=mkc(W,H);const c=o.getContext('2d');c.drawImage(base,0,0);
    x.drawImage(alt,0,0);x.globalCompositeOperation='destination-in';x.fillStyle='#000';x.beginPath();x.moveTo(0,0);x.lineTo(W*.52,0);x.lineTo(W*.42,H);x.lineTo(0,H);x.fill();
    c.drawImage(cut,0,0);
  }
  return(_cache[k]=o);
}
function buildVariants(){
  CH_SPR.claire_horror=variantCanvas('claire','horror');
  CH_SPR.sol_twist=variantCanvas('sol','twist',0);
  CH_SPR.obser_over=variantCanvas('obser','overwork');
  CH_SPR.belis_trick=variantCanvas('belis','trick');
}
