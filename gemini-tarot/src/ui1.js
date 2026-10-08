/* ================= UI 1: 유틸 · 연출 · 유닛 · 전투 화면 ================= */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!==undefined)e.innerHTML=h;return e};
const REL_ICON={watch:'⏱',score:'🎼',glove:'🧤',key:'🗝',rosary:'📿',shard:'🪞',tray:'🍽',metronome:'🎵',tip:'🪄',moonjar:'🌙',heart:'⚙',stonepin:'📌',crown:'👑',redcloak:'🧣'};
const CROP={
  face:{x:.51,y:.137,s:3.4},eyes:{x:.5,y:.143,s:6.5},wand:{x:.235,y:.215,s:4.4},hand:{x:.4,y:.265,s:3.6},
  cape:{x:.6,y:.47,s:2.6},ruffle:{x:.42,y:.73,s:3.2},shoes:{x:.45,y:.95,s:4.2},ornTL:{x:.05,y:.12,s:5},
  ornBR:{x:.95,y:.85,s:5},bow:{x:.51,y:.225,s:6.5},capeP:{x:.6,y:.75,s:4},frameTop:{x:.5,y:.012,s:3.2},hair:{x:.4,y:.08,s:5}
};
const BW=112,BH=78;
function artCss(key,hue=0){
  const c=CROP[key]||CROP.face,iw=c.s*BW,ih=iw*1280/768;
  const px=clamp((BW/2-c.x*iw)/(BW-iw)*100,0,100),py=clamp((BH/2-c.y*ih)/(BH-ih)*100,0,100);
  return `background-size:${c.s*100}% auto;background-position:${px}% ${py}%;filter:hue-rotate(${hue}deg) saturate(1.15)`;
}
const _iconURL={};
function iconURL(pal){if(!_iconURL[pal])_iconURL[pal]=iconCanvas(pal).toDataURL();return _iconURL[pal]}

/* ---- 화면 ---- */
const HUD_SCREENS=['s-map','s-battle','s-shop','s-event','s-camp','s-reward'];
const TR=[];const tr=s=>{TR.push(s);if(TR.length>80)TR.shift()};
function show(id){tr('show '+id);
  for(const s of $$('.screen'))s.classList.toggle('on',s.id===id);
  $('#hud').classList.toggle('on',HUD_SCREENS.includes(id));
  renderHud();
}
function toast(t,hi){const d=el('div','toast'+(hi?' hi':''),t);document.body.appendChild(d);setTimeout(()=>d.remove(),1750)}
function banner(t,foe){const b=$('#banner');$('#bannerTxt').textContent=t;b.classList.toggle('foe',!!foe);b.classList.remove('on');void b.offsetWidth;b.classList.add('on')}
async function splash(a,b,c=''){
  if(FAST)return;
  $('#spA').textContent=a;$('#spB').textContent=b;$('#spC').textContent=c;const s=$('#splash');s.classList.remove('on');void s.offsetWidth;s.classList.add('on');await sleep(1900);s.classList.remove('on');
}
function shake(p=10,d=360){if(FAST)return;$('#app').animate([{transform:'translate(0,0)'},{transform:`translate(${-p}px,${p/2}px)`},{transform:`translate(${p}px,${-p/2}px)`},{transform:`translate(${-p/2}px,${p}px)`},{transform:`translate(${p/3}px,0)`},{transform:'translate(0,0)'}],{duration:d,easing:'ease-out'})}
function flash(a=.6,d=420,col='#fff'){if(FAST)return;const f=$('#flash');f.style.background=col;f.animate([{opacity:a},{opacity:0}],{duration:d,easing:'ease-out'})}

/* ---- 배경 별 + 입자 ---- */
const bgc=$('#bg'),fxc=$('#fxc'),bctx=bgc.getContext('2d'),fctx=fxc.getContext('2d');
let VW=0,VH=0;const stars=[],parts=[];
function resize(){
  const dpr=Math.min(2,window.devicePixelRatio||1);VW=innerWidth;VH=innerHeight;
  for(const c of[bgc,fxc]){c.width=VW*dpr;c.height=VH*dpr}
  bctx.setTransform(dpr,0,0,dpr,0,0);fctx.setTransform(dpr,0,0,dpr,0,0);fitHand();
}
function initStars(){for(let i=0;i<110;i++)stars.push({x:Math.random(),y:Math.random(),r:Math.random()*1.8+.4,s:Math.random()*.02+.004,t:Math.random()*6.28,c:pick(['#ffd27a','#ff7ac0','#b58cff','#ffffff'])})}
function sparkle(c,x,y,r){c.beginPath();c.moveTo(x,y-r);c.quadraticCurveTo(x,y,x+r,y);c.quadraticCurveTo(x,y,x,y+r);c.quadraticCurveTo(x,y,x-r,y);c.quadraticCurveTo(x,y,x,y-r);c.fill()}
function burst(x,y,o={}){
  if(FAST)return;
  const n=o.n||24,cols=o.col||['#ff4fa8','#a46bff','#ffd27a','#ffffff'],sp=o.sp||7;
  for(let i=0;i<n;i++){
    const a=Math.random()*6.28,v=sp*(.3+Math.random()*.9);
    parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:o.g===undefined?.12:o.g,life:0,max:(o.life||750)*(.6+Math.random()*.6),size:(o.size||9)*(.4+Math.random()),rot:Math.random()*6.28,vr:(Math.random()-.5)*.3,col:pick(cols),shape:o.shape||(Math.random()<.7?'s':'c')});
  }
}
let lastT=0;
function loop(t){
  const dt=Math.min(50,t-lastT||16);lastT=t;
  bctx.clearRect(0,0,VW,VH);
  for(const s of stars){s.t+=s.s*dt*.2;s.y-=s.s*dt*.0035;if(s.y<-.02){s.y=1.02;s.x=Math.random()}bctx.globalAlpha=.35+.65*Math.abs(Math.sin(s.t));bctx.fillStyle=s.c;sparkle(bctx,s.x*VW,s.y*VH,s.r*2.2)}
  bctx.globalAlpha=1;fctx.clearRect(0,0,VW,VH);
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i];p.life+=dt;if(p.life>=p.max){parts.splice(i,1);continue}
    p.vy+=p.g*dt*.06;p.x+=p.vx*dt*.06;p.y+=p.vy*dt*.06;p.rot+=p.vr;
    const k=1-p.life/p.max;fctx.globalAlpha=Math.min(1,k*1.6);fctx.fillStyle=p.col;fctx.save();fctx.translate(p.x,p.y);fctx.rotate(p.rot);
    if(p.shape==='s')sparkle(fctx,0,0,p.size*(.4+k));else{fctx.beginPath();fctx.arc(0,0,p.size*k*.5,0,6.28);fctx.fill()}fctx.restore();
  }
  fctx.globalAlpha=1;requestAnimationFrame(loop);
}
function center(node){const r=(node.querySelector?node.querySelector('.fig')||node:node).getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height*.45,r}}
function floatAt(node,text,cls,dx=0){
  if(FAST||!node)return;
  const c=center(node);const d=el('div','float '+cls,text);d.style.left=(c.x+rnd(-20,20)+dx)+'px';d.style.top=(c.y+rnd(-12,12)-c.r.height*.1)+'px';
  document.body.appendChild(d);setTimeout(()=>d.remove(),1200);
}
function slashAt(node,n=1){
  if(FAST||!node)return;const c=center(node);
  for(let i=0;i<n;i++)setTimeout(()=>{const s=el('div','slash');s.style.left=(c.x+rnd(-24,24))+'px';s.style.top=(c.y+rnd(-50,50))+'px';s.style.setProperty('--r',rnd(-35,35)+'deg');document.body.appendChild(s);setTimeout(()=>s.remove(),340)},i*70);
}
function animCls(node,cls,ms=450){if(!node||FAST)return;node.classList.remove(cls);void node.offsetWidth;node.classList.add(cls);setTimeout(()=>node.classList.remove(cls),ms)}

/* ---- 툴팁 ---- */
const tip=$('#tip');
document.addEventListener('mousemove',e=>{
  const t=e.target.closest&&e.target.closest('[data-tip]');
  if(!t){tip.style.display='none';return}
  tip.innerHTML=t.dataset.tip;tip.style.display='block';
  const w=tip.offsetWidth,h=tip.offsetHeight;
  tip.style.left=Math.min(innerWidth-w-8,e.clientX+14)+'px';tip.style.top=Math.min(innerHeight-h-8,e.clientY+16)+'px';
});

/* ---- 상태 아이콘 ---- */
const STINFO={str:'힘: 공격 피해가 증가한다',weak:'약화: 주는 피해 25% 감소 (턴이 지나면 줄어든다)',vuln:'취약: 받는 피해 50% 증가',poison:'독: 턴 시작 시 피해를 입고 1 감소',regen:'재생: 턴 시작 시 HP 3 회복',taunt:'도발: 적의 단일 공격이 이 유닛에게 집중된다',thorns:'가시: 공격받으면 반격 피해',stun:'기절: 다음 턴 행동할 수 없다'};
const BUFFK=['str','regen','taunt','thorns'];
function statHtml(X,isAlly){
  return Object.entries(X.st).filter(([k,v])=>v>0).map(([k,v])=>{
    const good=BUFFK.includes(k)===isAlly;
    return`<span class="st ${good?'good':'bad'}" data-tip="${STINFO[k]}">${STN[k]}${k==='taunt'||k==='stun'?'':' '+v}</span>`;
  }).join('');
}

/* ================= 유닛 요소 ================= */
const KIND_H={figure:1,eye:.4,wand:.64,shoes:.28,skirt:.58,hand:.36,cape:.72,head:.5,orn:.74};
function makeAllyFig(u){
  const fig=el('div','fig');
  if(CH_SPR[u.pal]){const cv=cloneCanvas(CH_SPR[u.pal]);cv.className='body';fig.appendChild(cv);fig.style.aspectRatio=`${cv.width}/${cv.height}`;return fig}
  const bodySrc=paletteBody(u.pal),body=cloneCanvas(bodySrc);body.className='body';
  const w=cloneCanvas(paletteWand(u.pal));w.className='wand';
  const r=SP.wandRect;
  w.style.left=(r.x/body.width*100)+'%';w.style.top=(r.y/body.height*100)+'%';w.style.width=(r.w/body.width*100)+'%';
  fig.append(body,w);fig.style.aspectRatio=`${body.width}/${body.height}`;
  return fig;
}
function buildAlly(a){
  const u=a.u,root=el('div','unit ally');root.style.setProperty('--c',u.color);root.dataset.id=u.id;
  root.innerHTML=`<div class="blk"></div><div class="uname">${u.n} <small>Lv${u.lv}</small></div><div class="stat"></div>`;
  const fig=makeAllyFig(u);root.insertBefore(fig,root.querySelector('.stat'));
  fig.style.animation=`float ${3.6+Math.random()*1.2}s ease-in-out ${Math.random()*2}s infinite`;
  const hp=el('div','hpb','<i class="g"></i><i class="h"></i><i class="w"></i><span></span>');
  root.insertBefore(hp,root.querySelector('.stat'));
  root.addEventListener('click',()=>onUnitClick(a));
  a.el=root;return root;
}
function buildEnemy(e){
  const sp=e.def.spr,root=el('div','unit enemy'+(e.boss?' bossu':'')+` k-${sp.kind}`);root.dataset.key=e.key;
  root.innerHTML=`<div class="intent"></div><div class="blk"></div><div class="uname">${e.n}${e.boss?' <small>BOSS</small>':e.elite?' <small>ELITE</small>':''}</div>`;
  const fig=el('div','fig');
  const cv=cloneCanvas(enemyCanvas(sp));
  fig.style.height=`calc(var(--uh)*${(KIND_H[sp.kind]||1)*(sp.scale||1)})`;
  fig.style.aspectRatio=`${cv.width}/${cv.height}`;
  if(sp.filter)cv.style.filter=sp.filter+' drop-shadow(0 0 12px rgba(0,0,0,.7))';
  if(sp.kind==='figure')cv.style.transform='scaleX(-1)';
  fig.appendChild(cv);root.appendChild(fig);
  const idle=sp.kind==='eye'?`pulseEye ${2+Math.random()}s ease-in-out infinite`:sp.kind==='wand'?`sway ${2.4+Math.random()}s ease-in-out infinite`:`float ${3.8+Math.random()*1.2}s ease-in-out ${Math.random()*2}s infinite`;
  fig.style.animation=idle;
  root.appendChild(el('div','hpb','<i class="g"></i><i class="h"></i><span></span>'));
  root.appendChild(el('div','stat'));
  root.addEventListener('click',()=>onUnitClick(e));
  e.el=root;return root;
}
function renderUnit(X){
  if(!X||!X.el)return;
  const isA=!!X.u,root=X.el;
  const hp=isA?X.u.hp:X.hp,max=isA?X.u.maxHp:X.max,wd=isA?X.u.wound:0;
  const pct=clamp(hp/max*100,0,100)+'%';
  const h=$('.h',root),g=$('.g',root),w=$('.w',root),sp=$('.hpb span',root);
  if(h)h.style.width=pct;if(g)g.style.width=pct;
  if(w)w.style.width=(wd/max*100)+'%';
  if(sp)sp.textContent=`${Math.max(0,hp)} / ${max}${wd?` (상처 ${wd})`:''}`;
  const b=$('.blk',root);b.classList.toggle('on',X.block>0);b.textContent='🛡 '+X.block;
  $('.stat',root).innerHTML=statHtml(X,isA);
  if(!isA)renderIntent(X);
  else $('.uname small',root).textContent='Lv'+X.u.lv;
  root.classList.toggle('dead',!!(X.dead));
}
function renderIntent(e){
  const box=$('.intent',e.el);
  if(e.dead||!e.intent||B.over){box.innerHTML='';return}
  const p=intentPreview(e),it=p.it;let cls='',txt=[],nm=[];
  if(it.atk){txt.push(`⚔ ${p.dmg}${it.hits>1?'×'+it.hits:''}${it.all?' 전체':''}`);nm.push(it.name||(it.drain?'생명 흡수':'공격'))}
  if(it.def){txt.push(`🛡 ${it.def}`);nm.push(it.name||'방어');if(!it.atk)cls='def'}
  if(it.sst){txt.push('✦ 강화');nm.push(it.name||'강화');if(!it.atk&&!it.def)cls='cur'}
  if(it.heal){txt.push(`✚ ${it.heal}`);nm.push(it.name||'회복');if(!it.atk)cls='cur'}
  if(it.curse){txt.push(`☁ 안개 ${it.curse}`);nm.push(it.name||'점괘 오염');if(!it.atk)cls='cur'}
  if(it.summon){txt.push('✚ 소환');nm.push(it.name||'소환');cls='cur'}
  if(it.aoeSt){txt.push('☠ 독');if(!it.atk)cls='cur'}
  if(it.st&&!it.atk){txt.push('⬇ '+stTxt(it.st).replace(/ \d+/,''));nm.push(it.name||'저주');cls='cur'}
  else if(it.st)txt.push('+'+stTxt(it.st).replace(/ \d+/,''));
  const tgt=p.tgt&&it.atk&&!it.all?` → ${p.tgt.u.n}`:'';
  box.innerHTML=`<div class="bub ${cls}" data-tip="${(it.name||nm[0]||'')}${tgt}">${txt.join('  ')}</div><div class="nm">${[...new Set(nm)].join(' · ')}${tgt}</div>`;
}

/* ================= 전투 화면 ================= */
const ACT_DIAL={};
function makeDial(c){
  const key=c.a+c.b;if(ACT_DIAL[key])return ACT_DIAL[key];
  const S=1100,o=mkc(S,S),x=o.getContext('2d');x.translate(S/2,S/2);
  x.strokeStyle=c.c;x.fillStyle=c.c;x.lineWidth=5;
  for(const r of[520,500,410,300]){x.globalAlpha=r===500?.5:.9;x.beginPath();x.arc(0,0,r,0,6.28);x.stroke()}
  x.globalAlpha=.7;x.lineWidth=2;
  for(let i=0;i<60;i++){x.save();x.rotate(i*Math.PI/30);x.beginPath();x.moveTo(0,-500);x.lineTo(0,-(i%5?485:462));x.stroke();x.restore()}
  const orn=silhouette(SP.ornA,c.a);
  for(let i=0;i<12;i++){x.save();x.rotate(i*Math.PI/6);x.globalAlpha=.95;x.drawImage(orn,-24,-466,48,48*orn.height/orn.width*.8);x.restore()}
  x.font='900 54px "Noto Serif KR",serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle=c.b;x.globalAlpha=.9;
  const rom=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];
  rom.forEach((t,i)=>{const a=i*Math.PI/6;x.save();x.translate(Math.sin(a)*355,-Math.cos(a)*355);x.rotate(a);x.fillText(t,0,0);x.restore()});
  /* 지휘봉 실루엣을 시계 바늘로 */
  const wd=silhouette(SP.wand,c.c);
  x.save();x.rotate(-.2);x.globalAlpha=.85;x.drawImage(wd,-30,-300,wd.width*1.25,wd.height*1.25);x.restore();
  x.save();x.rotate(2.4);x.globalAlpha=.7;x.scale(.8,.8);x.drawImage(wd,-30,-300,wd.width*1.25,wd.height*1.25);x.restore();
  x.globalAlpha=1;x.beginPath();x.arc(0,0,16,0,6.28);x.fill();
  return ACT_DIAL[key]=o;
}
function setDial(){
  const cv=$('#dial'),src=makeDial(ACTS[G.act].colors);cv.width=src.width;cv.height=src.height;
  const c=cv.getContext('2d');c.clearRect(0,0,cv.width,cv.height);c.drawImage(src,0,0);
}
let TG=null; /* 대상 지정 상태 */
function clearTarget(){TG=null;document.body.classList.remove('targeting');$$('.unit.tgtable').forEach(u=>u.classList.remove('tgtable'));$$('#hand .card.sel').forEach(c=>c.classList.remove('sel'))}
function beginTarget(kind,ref,list){
  clearTarget();TG={kind,ref,list};document.body.classList.add('targeting');
  for(const X of list)X.el.classList.add('tgtable');
  toast('대상을 선택하십시오',true);
}
async function onUnitClick(X){
  if(!TG||!TG.list.includes(X))return;
  const t=TG;clearTarget();
  if(t.kind==='card')await playCard(t.ref,X);
  else if(t.kind==='item')await useItem(t.ref,X);
  UI.refresh();
}
function setupBattleUI(){
  const al=$('#allies'),en=$('#enemies');al.innerHTML='';en.innerHTML='';
  for(const a of B.allies)al.appendChild(buildAlly(a));
  for(const e of B.enemies)en.appendChild(buildEnemy(e));
  B.allies.concat(B.enemies).forEach(renderUnit);
  setDial();
  handUids=new Set();$('#hand').innerHTML='';
  UI.refresh();
}
let handUids=new Set();
function cardEl(inst,opt={}){
  const d=CARD[inst.id],v=cardView(inst),own=d.o?CH[d.o]:null;
  const cn=['card',d.rar==='u'?'u':d.rar==='r'?'r':'',inst.rev?'rev':'',d.unplay?'haze':'',inst.p?'plus':''].filter(Boolean).join(' ');
  const c=el('div',cn);c.dataset.uid=inst.uid;c.style.setProperty('--oc',own?own.color:'#8a7aa0');
  const txt=d.unplay?'점괘가 흐려진다.<br>사용할 수 없다.<br>턴이 끝나면 소멸.':fxText(v.fx,v.t);
  let costShown=v.c,dc=false;
  if(opt.live&&typeof v.c==='number'&&B){const cc=cost(inst);if(cc<v.c){costShown=cc;dc=true}}
  c.innerHTML=`<div class="cost${dc?' dc':''}">${costShown}</div>${own?`<div class="oi" style="background-image:url(${iconURL(own.pal)})"></div>`:''}<div class="art" style="${artCss(d.art,d.h)}"></div>${inst.rev?'<div class="revtag">역 방 향</div>':''}<div class="nm">${d.n}${inst.p?'+':''}</div><div class="tx${txt.length>70?' sm':''}">${txt}</div>`;
  return c;
}
function renderHand(){
  const h=$('#hand'),prev=handUids;handUids=new Set();h.innerHTML='';
  B.hand.forEach((inst,i)=>{
    const c=cardEl(inst,{live:true});handUids.add(inst.uid);
    if(!prev.has(inst.uid)&&!FAST){c.classList.add('drawin');c.style.animationDelay=(i*50)+'ms'}
    if(!canPlay(inst))c.classList.add('dis');
    if(i<9)c.appendChild(el('div','kb',String(i+1)));
    c.addEventListener('click',()=>onCardClick(inst,c));
    h.appendChild(c);
  });
  fitHand();
}
function refreshHandState(){
  if(!B)return;
  for(const c of $('#hand').children){
    const inst=B.hand.find(x=>x.uid==c.dataset.uid);if(inst)c.classList.toggle('dis',!canPlay(inst));
  }
}
function fitHand(){
  const h=$('#hand');if(!h||!h.children.length)return;
  const n=h.children.length,cz=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cz'))||1;
  const avail=h.getBoundingClientRect().width/cz-8,cw=124,gap=6;
  const ml=n*(cw+gap)-gap<=avail?gap:-((n*cw-avail)/(n-1));
  [...h.children].forEach((c,i)=>{c.style.marginLeft=(i?ml:0)+'px'})
}
async function onCardClick(inst,node){
  clearTarget();
  if(!canPlay(inst)){
    const a=allyOf(inst.o);
    if(CARD[inst.id].unplay)toast('안개는 사용할 수 없습니다');
    else if(!a||a.dead)toast('쓰러진 동료의 카드입니다');
    else if(a.stunned)toast(`${a.u.n}은(는) 기절해 있습니다`);
    else if(cost(inst)>B.mana)toast('마나가 부족합니다');
    return;
  }
  Mus.sfx('ui');
  if(needsTarget(inst)){
    const l=validTargets(inst);
    if(l.length>1){node&&node.classList.add('sel');beginTarget('card',inst.uid,l);return}
    await playCard(inst.uid,l[0]);
  }else await playCard(inst.uid);
  UI.refresh();
}
function updateBattleHud(){
  if(!B)return;
  $('#orbTxt').textContent=`${B.mana}/${B.maxMana}`;
  $('#drawCnt').textContent=B.draw.length;$('#discCnt').textContent=B.disc.length;$('#exhCnt').textContent=B.exh.length;
  const cd=$('#conduct');cd.classList.toggle('used',B.conductUsed);cd.classList.toggle('active',B.discount>0);
  cd.disabled=!B.playerTurn||B.busy||B.conductUsed||B.over;
  $('#endBtn').disabled=!B.playerTurn||B.busy||B.over;
  $('#turnLbl').textContent=`TURN ${B.turn}`;
}
/* ---- 동료별 공격 연출 ---- */
const CHFX={
  belis:{org:[.80,.17],col:['#c89bff','#ff6ad5','#ffffff','#7b45d6'],kind:'bolt'},
  obser:{org:[.97,.20],col:['#9fc0ff','#e8f0ff','#ffffff','#5a82ff'],kind:'beam'},
  sol:{org:[.90,.46],col:['#ffe45a','#fff6a0','#ffb300','#ffffff'],kind:'lemon'},
  claire:{org:[.97,.92],col:['#ffb347','#fff0b0','#ffffff','#ff7a00'],kind:'slash'}
};
function figRect(src){const f=src.el.querySelector('.fig');return f.getBoundingClientRect()}
function charAttack(src,tnode){
  const cfg=CHFX[src.u.id];if(!cfg||FAST||!tnode)return;
  const fig=src.el.querySelector('.fig'),r=fig.getBoundingClientRect(),t=center(tnode);
  const ox=r.left+r.width*cfg.org[0],oy=r.top+r.height*cfg.org[1];
  const dx=t.x-ox,dy=t.y-oy,dist=Math.hypot(dx,dy),ang=Math.atan2(dy,dx)*180/Math.PI;
  if(cfg.kind==='slash'){
    const go=Math.max(0,(t.x-(r.left+r.width/2))*.62);
    fig.animate([{transform:'translateX(0) rotate(0)'},{transform:`translateX(${go}px) rotate(8deg) scale(1.07)`,offset:.42},{transform:'translateX(0) rotate(0)'}],{duration:520,easing:'cubic-bezier(.3,.7,.3,1)'});
    setTimeout(()=>{for(let i=0;i<3;i++)setTimeout(()=>{const s=el('div','slash gold');s.style.left=(t.x+rnd(-22,22))+'px';s.style.top=(t.y+rnd(-60,60))+'px';s.style.setProperty('--r',(i%2?-1:1)*rnd(18,50)+'deg');document.body.appendChild(s);setTimeout(()=>s.remove(),360)},i*90);
      burst(t.x,t.y,{n:30,sp:9,col:cfg.col,size:12});Mus.sfx('big')},210);
  }else if(cfg.kind==='beam'){
    fig.animate([{transform:'translateX(0)'},{transform:'translateX(-16px) rotate(-2deg)',offset:.18},{transform:'translateX(0)'}],{duration:420,easing:'ease-out'});
    burst(ox,oy,{n:18,sp:6,col:cfg.col,size:10,life:500});
    const b=el('div','beam');b.style.left=ox+'px';b.style.top=oy+'px';b.style.width=dist+'px';b.style.transform=`rotate(${ang}deg) scaleX(0)`;document.body.appendChild(b);
    b.animate([{transform:`rotate(${ang}deg) scaleX(0)`,opacity:1},{transform:`rotate(${ang}deg) scaleX(1)`,opacity:1,offset:.45},{transform:`rotate(${ang}deg) scaleX(1)`,opacity:0}],{duration:360,easing:'ease-out'}).onfinish=()=>b.remove();
    for(let i=0;i<8;i++)setTimeout(()=>burst(ox+dx*i/8,oy+dy*i/8,{n:3,sp:2,col:cfg.col,size:8,life:450}),i*28);
    setTimeout(()=>burst(t.x,t.y,{n:26,sp:8,col:cfg.col,size:11}),170);
  }else if(cfg.kind==='lemon'){
    fig.animate([{transform:'scale(1)'},{transform:'scale(1.06) translateY(-6px)',offset:.3},{transform:'scale(1)'}],{duration:420});
    for(let i=0;i<3;i++){
      const p=el('div','proj','🍋');p.style.left=ox+'px';p.style.top=oy+'px';document.body.appendChild(p);
      const mid={x:dx*.5,y:dy*.5-70-i*14};
      p.animate([{transform:'translate(0,0) rotate(0) scale(.6)',opacity:1},{transform:`translate(${mid.x}px,${mid.y}px) rotate(300deg) scale(1.2)`,offset:.5,opacity:1},{transform:`translate(${dx}px,${dy}px) rotate(640deg) scale(.9)`,opacity:1}],{duration:320,delay:i*70,easing:'ease-in-out',fill:'both'}).onfinish=()=>{p.remove();burst(t.x+rnd(-14,14),t.y+rnd(-14,14),{n:14,sp:7,col:cfg.col,size:10})};
    }
    burst(ox,oy,{n:16,sp:5,col:cfg.col,size:9,life:500});
  }else{ /* bolt: 마법진 + 보라색 탄 */
    const rg=el('div','ring');rg.style.left=ox+'px';rg.style.top=oy+'px';document.body.appendChild(rg);
    rg.animate([{transform:'scale(.2) rotate(0)',opacity:0},{transform:'scale(1.1) rotate(120deg)',opacity:1,offset:.45},{transform:'scale(1.3) rotate(240deg)',opacity:0}],{duration:420,easing:'ease-out'}).onfinish=()=>rg.remove();
    fig.animate([{transform:'translateX(0)'},{transform:'translateX(10px) rotate(2deg)',offset:.3},{transform:'translateX(0)'}],{duration:420});
    for(let i=0;i<10;i++)setTimeout(()=>burst(ox+dx*i/10,oy+dy*i/10,{n:4,sp:2.2,col:cfg.col,size:9,life:520}),120+i*26);
    setTimeout(()=>burst(t.x,t.y,{n:32,sp:9,col:cfg.col,size:12}),400);
  }
}
function muzzleFx(src){
  const cfg=CHFX[src.u.id];if(!cfg||FAST)return;
  const fig=src.el.querySelector('.fig'),r=fig.getBoundingClientRect();
  burst(r.left+r.width*cfg.org[0],r.top+r.height*cfg.org[1],{n:8,sp:4,col:cfg.col,size:8,life:420});
}
/* ---- 엔진이 호출하는 UI 콜백 ---- */
const UI={
  refresh(){
    if(!B)return;
    B.allies.concat(B.enemies).forEach(renderUnit);
    updateBattleHud();refreshHandState();renderHud();
  },
  status(X){renderUnit(X)},
  block(X,n){if(n>0){floatAt(X.el,'🛡 +'+n,'blk');Mus.sfx('block');const c=center(X.el);burst(c.x,c.y,{n:12,col:['#7dd3fc','#3b82f6','#fff'],sp:4,life:600})}renderUnit(X)},
  heal(X,n){if(n>0){floatAt(X.el,'+'+n,'heal');Mus.sfx('heal');const c=center(X.el);burst(c.x,c.y,{n:16,col:['#6ee7a0','#c8ffe0','#fff'],sp:3.5,g:-.04,life:900})}renderUnit(X)},
  cure(X,n){floatAt(X.el,'상처 -'+n,'heal');renderUnit(X)},
  hitEnemy(e,amt,abs,real,opt){
    const big=amt>=18;
    if(opt&&opt.poison){floatAt(e.el,String(real),'psn');Mus.sfx('poison')}
    else{
      floatAt(e.el,abs&&!real?'🛡 '+abs:String(amt),big?'big':'dmg');if(abs&&real)floatAt(e.el,'🛡-'+abs,'blk',-46);
      slashAt(e.el,big?3:1);Mus.sfx(big?'big':'hit');
      if(!(opt&&opt.thorns)){shake(big?14:5,big?460:240);if(big)flash(.3,260,'#ff9ad0')}
    }
    const c=center(e.el);burst(c.x,c.y,{n:big?40:16,sp:big?10:7,size:big?13:9});
    animCls(e.el,'hit',420);renderUnit(e);
  },
  hitAlly(a,amt,abs,real){
    if(real>0){floatAt(a.el,'-'+real,'hurt');Mus.sfx('hurt');shake(real>=14?14:6,300);flash(.15,240,'#ff2d4f')}else{floatAt(a.el,'🛡 막음','blk');Mus.sfx('block')}
    if(abs&&real)floatAt(a.el,'🛡-'+abs,'blk',-46);
    slashAt(a.el,real>=14?2:1);
    const c=center(a.el);burst(c.x,c.y,{n:real>0?16:8,col:real>0?['#ff4d6a','#ffb3c1','#fff']:['#7dd3fc','#fff'],sp:6});
    animCls(a.el,'hit',420);renderUnit(a);
  },
  enemyDie(e){
    const c=center(e.el);burst(c.x,c.y,{n:70,sp:11,size:14,life:1300,col:['#ffe29a','#ff4fa8','#a46bff','#fff']});
    e.el.classList.add('dying');setTimeout(()=>{if(e.el)e.el.style.display='none'},950);renderUnit(e);
    const bi=$('.intent',e.el);if(bi)bi.innerHTML='';
  },
  allyDie(a){floatAt(a.el,'쓰러짐','sys');a.el.classList.add('dead');renderUnit(a);renderHand()},
  async phase2(e){
    shake(24,700);flash(.7,700,'#7a0030');Mus.sfx('big');banner('제 2 막',true);
    const c=center(e.el);burst(c.x,c.y,{n:80,sp:11,col:['#ff2d6f','#7b45d6','#000','#ffd27a'],size:14});
    renderUnit(e);
    if(e.key==='finalmirror'){await sleep(500);Mus.play('boss3b');await playScene(STORY.boss3_phase2,{keepBg:1})}
  },
  cardPlayed(inst,v,src,tgt){
    const node=$('#hand').querySelector(`[data-uid="${inst.uid}"]`);
    const att=v.fx.dmg!==undefined||v.fx.rand||v.fx.blockdmg;
    const tnode=att?(tgt&&tgt.el?tgt.el:$('#enemies .unit:not(.dead)')):(tgt&&tgt.el?tgt.el:src.el);
    if(node&&!FAST&&tnode){
      const r=node.getBoundingClientRect(),t=center(tnode);
      const cl=node.cloneNode(true);cl.className=node.className.replace(/drawin|dis|sel/g,'')+' fly';
      cl.style.cssText=`left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;zoom:1;transform-origin:center`;
      cl.querySelectorAll('.kb').forEach(k=>k.remove());document.body.appendChild(cl);
      cl.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${(t.x-r.left-r.width/2)*.5}px,${(t.y-r.top-r.height/2)*.5-60}px) scale(1.25) rotate(${att?10:-8}deg)`,opacity:1,offset:.45},{transform:`translate(${t.x-r.left-r.width/2}px,${t.y-r.top-r.height/2}px) scale(.45) rotate(${att?30:-18}deg)`,opacity:0}],{duration:430,easing:'cubic-bezier(.3,.7,.3,1)'}).onfinish=()=>cl.remove();
    }
    if(att&&src.el)charAttack(src,tnode);
    if(inst.rev)floatAt(src.el,'逆位置','sys');
    renderHand();updateBattleHud();
  },
  swing(src){if(src&&src.el)muzzleFx(src)},
  mana(n){const o=$('#orb');o.classList.remove('pop');void o.offsetWidth;o.classList.add('pop');Mus.sfx('buff')},
  drawn(n){if(n)Mus.sfx('draw');renderHand();updateBattleHud()},
  shuffle(){toast('더미를 섞는다…')},
  turnStart(){banner('당신의 차례');const o=$('#orb');o.classList.remove('pop');void o.offsetWidth;o.classList.add('pop');UI.refresh()},
  conduct(){Mus.sfx('buff');const g=B.allies.find(a=>a.id==='belis');if(g&&g.el){floatAt(g.el,'지휘','buff');const c=center(g.el);burst(c.x,c.y,{n:24,col:['#ffe29a','#ff4fa8']})}renderHand();updateBattleHud()},
  banner,
  float(X,t,c){floatAt(X.el,t,c)},
  enemyLunge(e){animCls(e.el,'lunge-l',450)},
  spawn(e){const n=buildEnemy(e);n.classList.add('spawn');$('#enemies').appendChild(n);renderUnit(e);Mus.sfx('flip')},
  curse(e,n){floatAt(e.el,'안개 +'+n,'sys');Mus.sfx('flip');const c=center($('#allies'));burst(c.x,c.y,{n:34,col:['#5b4a78','#2a1a40','#b27cff'],sp:3,g:-.03,life:1100,shape:'c',size:16})},
  battleEnd(won){clearTarget();battleFinished(won)}
};
