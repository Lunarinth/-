/* ================= UI 2: HUD · 대화 · 컷신 · 지도 · 보상 · 상점 · 이벤트 · 캠프 · 파티 ================= */
function renderHud(){
  if(!G)return;
  $('#hudAct').textContent=`ACT ${G.act+1} / 3`;$('#hudNode').textContent=ACTS[G.act].n;
  $('#gold').textContent=G.gold;$('#stones').textContent=G.stones;
  $('#relics').innerHTML=G.relics.map(k=>`<div class="relic" data-tip="<b>${RELIC[k].n}</b><br>${RELIC[k].d}">${REL_ICON[k]||'✦'}</div>`).join('');
  let h='';
  for(let i=0;i<3;i++){const k=G.items[i];h+=k?`<div class="islot has" data-i="${i}" data-tip="<b>${ITEM[k].n}</b><br>${ITEM[k].d}">${ITEM[k].icon}</div>`:'<div class="islot"></div>'}
  $('#items').innerHTML=h;
  for(const n of $$('#items .islot.has'))n.addEventListener('click',()=>onItemClick(+n.dataset.i));
  $('#btnParty').disabled=!!(B&&!B.over&&$('#s-battle').classList.contains('on'));
}
async function onItemClick(i){
  const k=G.items[i];if(!k)return;const it=ITEM[k];Mus.sfx('ui');
  if(B&&$('#s-battle').classList.contains('on')){
    if(!B.playerTurn||B.busy)return;
    if(it.tgt==='a'){const l=aliveA();if(l.length>1){beginTarget('item',i,l);return}await useItem(i,l[0])}
    else await useItem(i);
    UI.refresh();return;
  }
  if(!it.field){toast('전투 중에만 쓸 수 있습니다');return}
  const u=await pickUnit(`${it.n}을(를) 사용할 동료`);
  if(u){await useItem(i,u);renderHud();if($('#overlay-party').classList.contains('on'))openParty()}
}
/* 동료 하나를 고르는 작은 모달 */
function pickUnit(title){
  return new Promise(res=>{
    const ov=$('#overlay-pile');ov.innerHTML=`<h2 class="ttl">${title}</h2><div class="pickrow" id="pu"></div><button class="btn sm ghost" id="puX">취소</button>`;
    ov.classList.add('on');
    for(const u of G.party){
      const c=el('div','panel pm');c.style.setProperty('--c',u.color);c.style.width='220px';c.style.cursor='pointer';
      c.innerHTML=`<div class="hd"><canvas width="96" height="96"></canvas><div><h3>${u.n}</h3><div class="ti">HP ${u.hp}/${emax(u)} · 상처 ${u.wound}</div></div></div>`;
      c.querySelector('canvas').getContext('2d').drawImage(iconCanvas(u.pal),0,0);
      c.addEventListener('click',()=>{ov.classList.remove('on');res(u)});$('#pu',ov).appendChild(c);
    }
    $('#puX').addEventListener('click',()=>{ov.classList.remove('on');res(null)});
  });
}
/* 카드 목록 오버레이 (보기 / 선택) */
function showPile(title,list,onPick){
  return new Promise(res=>{
    const ov=$('#overlay-pile');ov.innerHTML=`<h2 class="ttl">${title}</h2><div class="pcs" id="pcs"></div><button class="btn sm ghost" id="pcX">${onPick?'취소':'닫기'}</button>`;
    ov.classList.add('on');
    const g=$('#pcs',ov);
    if(!list.length)g.innerHTML='<div class="desc">비어 있습니다.</div>';
    const sorted=list.slice().sort((a,b)=>(CARD[a.id].o||'').localeCompare(CARD[b.id].o||'')||CARD[a.id].n.localeCompare(CARD[b.id].n));
    for(const e of sorted){
      const inst={uid:e.uid||UID++,id:e.id,p:e.p||0,rev:false,o:CARD[e.id].o};
      const c=cardEl(inst);
      if(onPick){c.style.cursor='pointer';c.addEventListener('click',()=>{ov.classList.remove('on');res(e)})}
      g.appendChild(c);
    }
    $('#pcX').addEventListener('click',()=>{ov.classList.remove('on');res(null)});
  });
}
let UID=1000;

/* ================= 대화 ================= */
let sceneResolve=null;
async function playScene(lines,opt={}){
  if(FAST||!lines||!lines.length)return;
  const sc=$('#scene'),box=$('.box',sc),tx=$('.tx',sc),who=$('.who',sc),L=$('#ptrL'),R=$('#ptrR');
  sc.classList.add('on');
  L.innerHTML='';R.innerHTML='';L.classList.remove('in');R.classList.remove('in');
  let i=0,typing=null,full='',done=false,sideL=null,sideR=null;
  const setPtr=(side,spk)=>{
    const node=side==='L'?L:R;
    if(!spk||(!spk.pal&&spk.kind!=='eye')){node.innerHTML='';return}
    const key=spk.kind==='eye'?'eye':spk.pal;
    if(node.dataset.k!==key){
      node.dataset.k=key;node.innerHTML='';
      const cv=cloneCanvas(spk.kind==='eye'?SP.eye:bustCanvas(spk.pal));
      if(side==='R')cv.style.transform='scaleX(-1)';
      if(spk.kind==='eye')cv.style.cssText+=';height:60%;align-self:center;filter:drop-shadow(0 0 30px #8ab4ff)';
      node.appendChild(cv);node.classList.remove('in');void node.offsetWidth;node.classList.add('in');
    }
  };
  function typeLine(text){
    full=text;tx.textContent='';let k=0;clearInterval(typing);
    typing=setInterval(()=>{k+=1;tx.textContent=full.slice(0,k);if(k%3===0)Mus.sfx('draw');if(k>=full.length){clearInterval(typing);typing=null}},20);
  }
  function showLine(){
    const ln=lines[i],spk=SPK[ln.w]||SPK.narr;
    sc.classList.toggle('narr',ln.w==='narr');
    who.style.display=spk.n?'':'none';who.textContent=spk.n;who.style.setProperty('--c',spk.color);
    const side=ln.pos||(ln.w==='gemini'?'L':'R');
    if(spk.pal||spk.kind==='eye'){
      if(side==='L'){setPtr('L',spk);L.classList.remove('dim');R.classList.add('dim')}
      else{setPtr('R',spk);R.classList.remove('dim');L.classList.add('dim')}
    }else{L.classList.add('dim');R.classList.add('dim')}
    if(ln.w!=='narr'&&ln.w!=='master'&&!L.dataset.k&&side==='R'&&ln.w!=='gemini'){/* 오른쪽만 있는 장면 */}
    typeLine(ln.t);
  }
  return new Promise(res=>{
    const finish=()=>{done=true;clearInterval(typing);sc.classList.remove('on');L.dataset.k='';R.dataset.k='';document.removeEventListener('keydown',key);sc.removeEventListener('click',adv);res()};
    function adv(e){
      if(e&&e.target.closest&&e.target.closest('.skip'))return;
      if(typing){clearInterval(typing);typing=null;tx.textContent=full;return}
      i++;if(i>=lines.length){finish();return}showLine();
    }
    const key=e=>{if(e.key==='Enter'||e.key===' '||e.key==='ArrowRight'){e.preventDefault();adv()}else if(e.key==='Escape')finish()};
    $('.skip',sc).onclick=finish;
    sc.addEventListener('click',adv);document.addEventListener('keydown',key);
    L.dataset.k='';R.dataset.k='';showLine();
  });
}
function askChoice(opts,prompt){
  return new Promise(res=>{
    if(FAST){res(0);return}
    const sc=$('#scene'),cb=$('#choiceBox');sc.classList.add('on');$('.box',sc).style.display='none';$('.skip',sc).style.display='none';
    cb.innerHTML=(prompt?`<div class="desc" style="text-align:center">${prompt}</div>`:'')+opts.map((o,i)=>`<button data-i="${i}">${o.t}<small>${o.d||''}</small></button>`).join('');
    cb.style.display='flex';
    for(const b of $$('button',cb))b.addEventListener('click',()=>{cb.style.display='none';sc.classList.remove('on');$('.box',sc).style.display='';$('.skip',sc).style.display='';Mus.sfx('ui');res(+b.dataset.i)});
  });
}

/* ================= 컷신 ================= */
function runCut(draw,dur,opts={}){
  return new Promise(res=>{
    if(FAST){res();return}
    const cut=$('#cut'),cv=$('canvas',cut),cap=$('.cap',cut);
    cut.classList.add('on');cap.classList.remove('on');
    const dpr=1;cv.width=innerWidth*dpr;cv.height=innerHeight*dpr;
    const c=cv.getContext('2d');let start=null,fin=false,capIdx=0;
    const caps=opts.caps||[];
    const end=()=>{if(fin)return;fin=true;cut.classList.remove('on');cap.classList.remove('on');cut.removeEventListener('click',end);res()};
    cut.addEventListener('click',end);
    function frame(ts){
      if(fin)return;if(!start)start=ts;const t=(ts-start)/1000;
      draw(c,cv.width,cv.height,t);
      while(capIdx<caps.length&&t>=caps[capIdx].at){cap.textContent=caps[capIdx].t;cap.classList.add('on');if(caps[capIdx].sfx)Mus.sfx(caps[capIdx].sfx);capIdx++}
      if(t>=dur){end();return}
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
function cutBg(c,w,h,a,b){const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,a);g.addColorStop(1,b);c.fillStyle=g;c.fillRect(0,0,w,h)}
function makeShards(cx,cy,cw,ch){
  const cols=8,rows=13,sh=[];
  for(let r=0;r<rows;r++)for(let q=0;q<cols;q++){
    const x0=q*cw/cols,x1=(q+1)*cw/cols,y0=r*ch/rows,y1=(r+1)*ch/rows;
    const j=()=>(Math.random()-.5)*cw/cols*.35;
    const p=[[x0+j(),y0+j()],[x1+j(),y0+j()],[x1+j(),y1+j()],[x0+j(),y1+j()]];
    const split=Math.random()<.5;
    const tris=split?[[p[0],p[1],p[2]],[p[0],p[2],p[3]]]:[[p[0],p[1],p[3]],[p[1],p[2],p[3]]];
    for(const t of tris){
      const mx=(t[0][0]+t[1][0]+t[2][0])/3-cw/2,my=(t[0][1]+t[1][1]+t[2][1])/3-ch/2,d=Math.hypot(mx,my)+30;
      sh.push({t,vx:mx/d*(5+Math.random()*9),vy:my/d*(5+Math.random()*9)-2,vr:(Math.random()-.5)*.14,mx:mx+cw/2,my:my+ch/2,delay:Math.random()*.25});
    }
  }
  return sh;
}
async function cutscene(kind){
  if(FAST)return;
  if(kind==='prologue'){
    const orig=SP.orig,cw0=orig.width,ch0=orig.height;let shards=null;
    await runCut((c,w,h,t)=>{
      cutBg(c,w,h,'#12041e','#05000a');
      const ch=h*.8,cw=ch*cw0/ch0,cx=w/2-cw/2,cy=h/2-ch/2;
      if(t<3.4){
        const a=Math.min(1,t/1.2),sk=t>2.2?(Math.random()-.5)*(t-2.2)*5:0;
        c.save();c.globalAlpha=a;c.shadowColor='#d64fa0';c.shadowBlur=60+Math.sin(t*4)*20;c.translate(sk,sk*.6);c.drawImage(orig,cx,cy,cw,ch);c.restore();
        if(t>2.2){c.strokeStyle='#fff';c.lineWidth=2;c.globalAlpha=.9;const n=Math.floor((t-2.2)/1.2*14);let seed=7;const R=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
          for(let i=0;i<n;i++){c.beginPath();let x=cx+cw*.5+(R()-.5)*cw*.2,y=cy+ch*.35+(R()-.5)*ch*.2;c.moveTo(x,y);const ang=R()*6.28;for(let k=0;k<6;k++){x+=Math.cos(ang+(R()-.5))*cw*.08;y+=Math.sin(ang+(R()-.5))*ch*.05;c.lineTo(x,y)}c.stroke()}c.globalAlpha=1}
      }else{
        if(!shards){shards=makeShards(cx,cy,cw,ch);flash(1,900);Mus.sfx('ult');shake(18,600)}
        const tt=t-3.4;
        for(const s of shards){
          const k=Math.max(0,tt-s.delay);if(k<=0&&tt<.02){}
          const px=s.vx*k*70,py=s.vy*k*70+k*k*140,rot=s.vr*k*60,al=Math.max(0,1-k/1.9);
          c.save();c.globalAlpha=al;c.translate(cx+s.mx+px,cy+s.my+py);c.rotate(rot);c.translate(-s.mx,-s.my);
          c.beginPath();c.moveTo(s.t[0][0],s.t[0][1]);c.lineTo(s.t[1][0],s.t[1][1]);c.lineTo(s.t[2][0],s.t[2][1]);c.closePath();c.clip();
          c.drawImage(orig,0,0,cw,ch);c.restore();
        }
      }
    },6.6,{caps:[{at:.4,t:'열두 번째 종이 울렸다',sfx:'ui'},{at:3.5,t:'……열세 번째 종은, 울리지 않았다.'}]});
    return;
  }
  if(kind==='twin'){
    const a=fullFigure('gemini'),b=fullFigure('mirror');
    await runCut((c,w,h,t)=>{
      cutBg(c,w,h,'#05000a','#1a0a30');
      const fh=h*.82,fw=fh*a.width/a.height,k=ease(Math.min(1,t/2));
      c.save();c.globalAlpha=Math.min(1,t/.8);c.drawImage(a,w/2-fw*1.05+(1-k)*-120,h-fh-h*.04,fw,fh);c.restore();
      c.save();c.globalAlpha=Math.min(1,t/.8);c.translate(w/2+fw*1.05-(1-k)*-120,0);c.scale(-1,1);c.drawImage(b,0,h-fh-h*.04,fw,fh);c.restore();
      const g=c.createLinearGradient(w/2-3,0,w/2+3,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,255,255,'+(.4+.4*Math.sin(t*9))+')');g.addColorStop(1,'rgba(255,255,255,0)');
      c.fillStyle=g;c.fillRect(w/2-3,0,6,h);
      for(let i=0;i<6;i++){c.fillStyle='rgba(180,200,255,'+(.08+Math.random()*.1)+')';c.fillRect(Math.random()*w,Math.random()*h,w*.3*Math.random(),2)}
    },5.2,{caps:[{at:.6,t:'멈춘 것은, 누구의 손이었을까.'}]});
    return;
  }
  if(kind==='dawn'){
    const figs=G.party.map(u=>fullFigure(u.pal));
    Mus.jingle('boss');
    await runCut((c,w,h,t)=>{
      const k=ease(Math.min(1,t/5));
      const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,`rgb(${20+k*60},${8+k*40},${40+k*40})`);g.addColorStop(.6,`rgb(${60+k*190},${20+k*120},${60+k*40})`);g.addColorStop(1,`rgb(${20+k*220},${10+k*170},${40+k*90})`);
      c.fillStyle=g;c.fillRect(0,0,w,h);
      const sy=h*.95-k*h*.45;c.save();c.globalCompositeOperation='lighter';
      for(let i=0;i<16;i++){c.save();c.translate(w/2,sy);c.rotate(i*Math.PI/8+t*.05);const gr=c.createLinearGradient(0,0,0,-h);gr.addColorStop(0,'rgba(255,220,150,'+(.25*k)+')');gr.addColorStop(1,'rgba(255,220,150,0)');c.fillStyle=gr;c.beginPath();c.moveTo(-14,0);c.lineTo(14,0);c.lineTo(60,-h);c.lineTo(-60,-h);c.fill();c.restore()}
      c.restore();
      c.fillStyle='#fff3c8';c.beginPath();c.arc(w/2,sy,h*.09,0,6.28);c.fill();
      const fh=h*.5,n=figs.length;
      figs.forEach((f,i)=>{const fw=fh*f.width/f.height,x=w/2+(i-(n-1)/2)*fw*.95-fw/2;c.save();c.globalAlpha=Math.min(1,t/1.5);c.drawImage(f,x,h-fh*(.98+.02*Math.sin(t*2+i)),fw,fh);c.restore()});
      if(Math.random()<.4)burst(Math.random()*innerWidth,Math.random()*innerHeight*.6,{n:2,col:['#ffe29a','#fff'],sp:1.5,g:-.02,life:1600});
    },8.5,{caps:[{at:.5,t:'열세 번째 종이 울렸다'},{at:4.5,t:'새벽이 거울 속까지 스며들었다'}]});
    return;
  }
  if(kind==='eternal'){
    const a=fullFigure('gemini'),b=fullFigure('mirror'),dial=makeDial(ACTS[2].colors);
    await runCut((c,w,h,t)=>{
      cutBg(c,w,h,'#0a0420','#25104a');
      c.save();c.translate(w/2,h*.45);c.rotate(Math.sin(t*.3)*.03);c.globalAlpha=.55;const ds=h*.95;c.drawImage(dial,-ds/2,-ds/2,ds,ds);c.restore();
      const fh=h*.66,fw=fh*a.width/a.height,sw=Math.sin(t*1.6)*.03;
      c.save();c.translate(w/2-fw*.35,h-fh*.02);c.rotate(sw);c.drawImage(a,-fw/2,-fh,fw,fh);c.restore();
      c.save();c.translate(w/2+fw*.35,h-fh*.02);c.rotate(-sw);c.scale(-1,1);c.drawImage(b,-fw/2,-fh,fw,fh);c.restore();
      if(Math.random()<.5)burst(Math.random()*innerWidth,innerHeight*(.3+Math.random()*.5),{n:2,col:['#ffd27a','#b58cff','#fff'],sp:1.4,g:-.01,life:2200});
    },8,{caps:[{at:.5,t:'시계탑의 바늘은 열두 시 십삼 분에 머물렀다'},{at:4.6,t:'끝나지 않는 야회'}]});
  }
}

/* ================= 지도 ================= */
const NT={battle:['⚔','전투'],elite:['☠','정예'],event:['？','이벤트'],shop:['◈','상점'],camp:['☾','휴식'],recruit:['♥','동료'],boss:['♜','보스']};
function genMap(a){
  const N=t=>({type:t,chosen:false});const rows=[];
  rows.push([N('battle'),N(Math.random()<.5?'event':'battle')]);
  const need=a<2&&G.recruited.length<a+2;
  rows.push(need?[N('recruit')]:[N(pick(['event','battle'])),N(pick(['battle','elite']))]);
  rows.push(shuffle([N(pick(['shop','event'])),N(pick(['elite','battle'])),N('battle')]));
  rows.push([N('camp'),N(pick(['shop','battle','event']))]);
  rows.push([N('boss')]);
  return rows;
}
function renderMap(){
  show('s-map');
  const wrap=$('#towerWrap');wrap.innerHTML='';
  const left=el('div','side panel');left.innerHTML='<h4>일행</h4>';
  for(const u of G.party){
    const m=el('div','mini');m.style.setProperty('--c',u.color);
    m.innerHTML=`<canvas width="96" height="96"></canvas><div style="flex:1"><div class="nm">${u.n} <small style="color:var(--dim)">Lv${u.lv}</small></div><div class="hp"><i style="width:${u.hp/u.maxHp*100}%"></i><u style="width:${u.wound/u.maxHp*100}%"></u></div><small style="color:var(--dim)">${u.hp}/${emax(u)}</small></div>`;
    m.querySelector('canvas').getContext('2d').drawImage(iconCanvas(u.pal),0,0);left.appendChild(m);
  }
  const tw=el('div','tower');
  G.map.forEach((row,ri)=>{
    const fl=el('div','floor');fl.appendChild(el('span','fl',ri===G.map.length-1?'TOP':`${ri+1}F`));
    for(const n of row){
      const b=el('button','node t-'+n.type+(n.type==='boss'?' boss':''),`<i>${NT[n.type][0]}</i>${NT[n.type][1]}`);
      if(ri<G.floor)b.classList.add(n.chosen?'done':'off');
      else if(ri===G.floor)b.classList.add('go');else b.classList.add('off');
      if(ri===G.floor)b.addEventListener('click',()=>enterNode(n));
      fl.appendChild(b);
    }
    tw.appendChild(fl);
  });
  const right=el('div','side panel');
  right.innerHTML=`<h4>${ACTS[G.act].n}</h4><div style="font-size:12.5px;line-height:1.7;color:#d9c8e6">${ACTS[G.act].sub}</div>
    <h4>안내</h4><div style="font-size:12px;line-height:1.8;color:var(--dim)">⚔ 전투 · ☠ 정예(유물)<br>？ 이벤트 · ◈ 상점<br>☾ 휴식 · ♥ 동료 · ♜ 보스<br>한 층에서 한 곳만 갈 수 있습니다.</div>
    <button class="btn sm" id="mapParty">파티 · 영혼석 사용</button>`;
  wrap.append(left,tw,right);
  $('#mapParty').addEventListener('click',openParty);
  Mus.play(ACTS[G.act].scene);
  setTimeout(()=>{const go=$('.node.go');if(go)go.scrollIntoView({block:'center'})},50);
}
function advance(){tr('advance floor='+G.floor+' '+(new Error().stack||'').split('\n').slice(2,5).map(s=>s.trim().replace(/\(.*\//,'(')).join(' < '));G.floor++;if(G.floor>=G.map.length)G.floor=G.map.length-1;renderMap()}

/* ================= 노드 처리 ================= */
const usedEvents=new Set();
async function enterNode(n){
  if(n.chosen||G.busyNode)return;tr('enterNode '+n.type);G.busyNode=true;n.chosen=true;Mus.sfx('open');
  try{
    const e=ENC[G.act+1];
    if(n.type==='battle')await runBattle(pick(e.normal),{type:'normal'});
    else if(n.type==='elite')await runBattle(pick(e.elite),{type:'elite'});
    else if(n.type==='boss'){
      const k=G.act+1;await playScene(STORY['boss'+k+'_pre']||(k===3?STORY.boss3_pre:null));
      if(k===3)await cutscene('twin');
      await runBattle([e.boss],{type:'boss'});
    }
    else if(n.type==='event')await runEvent();
    else if(n.type==='shop')await runShop();
    else if(n.type==='camp')await runCamp();
    else if(n.type==='recruit')await runRecruit();
  }finally{G.busyNode=false}
}
async function runBattle(keys,opts){
  show('s-battle');
  Mus.play(opts.type==='boss'?ACTS[G.act].boss:opts.type==='elite'?'elite':ACTS[G.act].battle);
  startBattle(keys,opts);setupBattleUI();
  const names=[...new Set(keys.map(k=>EN[k].n))].join(' · ');
  await splash(opts.type==='boss'?'BOSS':opts.type==='elite'?'ELITE':ACTS[G.act].n,names,opts.type==='boss'?ACTS[G.act].sub:'');
  if(opts.type==='boss')Mus.jingle('boss');
  await startPlayerTurn();UI.refresh();
}
async function battleFinished(won){tr('battleFinished '+won+' opts='+JSON.stringify(B&&B.opts));
  if(!won){await defeat();return}
  const o=B.opts,res=settleBattle(true);
  Mus.jingle('win');await sleep(900);
  await openReward(res,o);
}
async function defeat(){
  G.death={act:G.act,floor:G.floor,type:B.opts&&B.opts.type,en:B.enemies.map(e=>e.key+':'+e.hp)};
  Mus.jingle('lose');Mus.stop();settleBattle(false);
  await sleep(700);showEnd('defeat');
}

/* ================= 보상 ================= */
function openReward(res,o){tr('openReward '+JSON.stringify(res));
  return new Promise(resolve=>{
    show('s-reward');
    const type=res.type;
    let relicTxt='';
    $('#rwTitle').textContent=type==='boss'?'보스 격파':type==='elite'?'정예 격파':'승리';
    const pills=[`🪙 +${res.gold}`,`◆ +${res.stones}`];if(res.drop)pills.push(`${ITEM[res.drop].icon} ${ITEM[res.drop].n}`);
    if(type==='elite'){const r=giveRelic();if(r)pills.push(`${REL_ICON[r]||'✦'} ${RELIC[r].n}`)}
    $('#rwPills').innerHTML=pills.map(p=>`<span class="rpill">${p}</span>`).join('');
    const finishAll=async()=>{
      if(type==='boss'){await afterBoss()}else advance();
      resolve();
    };
    const cardStep=()=>{
      $('#rwDesc').innerHTML='아르카나를 한 장 고르십시오. 새 기술을 얻으면 해당 동료의 기본 카드가 한 장 빠집니다.';
      const ch=$('#rwChoices');ch.innerHTML='';
      for(const id of rollCardChoices(3,type==='boss'?'boss':type==='elite'?'elite':'normal')){
        const d=CARD[id],w=el('div','choice'),c=cardEl({uid:UID++,id,p:0,rev:false,o:d.o});
        const info=d.rev?`<div class="rinfo"><b>逆位置 · 비용 ${d.rev.c}</b>${fxText(d.rev.fx,d.rev.t).replace(/<br>/g,' / ')}</div>`:'';
        w.append(c);if(info)w.insertAdjacentHTML('beforeend',info);
        c.addEventListener('click',()=>{Mus.sfx('level');addSkill(id);finishAll()});ch.appendChild(w);
      }
      const sk=$('#rwSkip');sk.style.display='';sk.textContent='건너뛰기 (+10 골드)';sk.onclick=()=>{addGold(10);finishAll()};
    };
    const relicStep=()=>{
      const pool=Object.keys(RELIC).filter(k=>!G.relics.includes(k)&&RELIC[k].boss);
      const opts=pool.length?pool.sort(()=>Math.random()-.5).slice(0,2):[];
      if(!opts.length){cardStep();return}
      $('#rwDesc').innerHTML='보스가 남긴 유물을 하나 고르십시오.';
      const ch=$('#rwChoices');ch.innerHTML='';$('#rwSkip').style.display='none';$('#rwSkip').onclick=null;
      for(const k of opts){
        const b=el('button','panel tile',`<i>${REL_ICON[k]||'✦'}</i><b>${RELIC[k].n}</b>${RELIC[k].d}`);b.style.cursor='pointer';b.style.width='200px';
        b.addEventListener('click',()=>{G.relics.push(k);Mus.sfx('level');cardStep()});ch.appendChild(b);
      }
    };
    if(G.pendingCardReward){G.pendingCardReward=0}
    if(type==='boss')relicStep();else cardStep();
  });
}
async function afterBoss(){tr('afterBoss act='+G.act);
  const k=G.act+1;
  await playScene(STORY['boss'+k+'_post']);
  if(k<3){
    G.party.forEach(u=>{healUnit(u,Math.round(u.maxHp*.3));u.wound=Math.round(u.wound*.5)});
    await enterAct(G.act+1);
  }else{
    await finale();
  }
}

/* ================= 상점 ================= */
function priceOf(p){return Math.max(5,Math.round(p*(1+rs('shopMul')-0)*(RELIC.tray&&G.relics.includes('tray')?1:1)))}
function shopMul(){return G.relics.includes('tray')?.8:1}
function runShop(){
  return new Promise(resolve=>{
    show('s-shop');Mus.play('shop');
    const stock={cards:rollCardChoices(3,'normal').map(id=>({id,price:{c:45,u:72,r:115}[CARD[id].rar]})),
      items:[pick(Object.keys(ITEM)),pick(Object.keys(ITEM))].map(k=>({k,price:ITEM[k].price})),
      relic:(()=>{const p=Object.keys(RELIC).filter(k=>!G.relics.includes(k)&&!RELIC[k].boss);return p.length?{k:pick(p),price:140}:null})(),
      stones:{price:55,n:3},clean:{price:40}};
    function draw(){
      const sh=$('#shopShelf');sh.innerHTML='';renderHud();
      const P=p=>Math.round(p*shopMul());
      const mk=(node,price,fn,label)=>{const w=el('div','gd');w.appendChild(node);const b=el('button','buy',`🪙 ${P(price)}`);b.disabled=G.gold<P(price)||!!(label&&label.sold);
        b.addEventListener('click',()=>{if(G.gold<P(price))return;addGold(-P(price));Mus.sfx('coin');fn();draw()});w.appendChild(b);sh.appendChild(w)};
      stock.cards.forEach((c,i)=>{if(c.sold)return;const d=CARD[c.id];mk(cardEl({uid:UID++,id:c.id,p:0,rev:false,o:d.o}),c.price,()=>{addSkill(c.id);c.sold=1},c)});
      stock.items.forEach((it,i)=>{if(it.sold)return;mk(el('div','panel tile',`<i>${ITEM[it.k].icon}</i><b>${ITEM[it.k].n}</b>${ITEM[it.k].d}`),it.price,()=>{if(!giveItem(it.k)){addGold(P(it.price));toast('소모품 칸이 가득 찼습니다');return}it.sold=1},it)});
      if(stock.relic&&!stock.relic.sold){const r=stock.relic;mk(el('div','panel tile',`<i>${REL_ICON[r.k]||'✦'}</i><b>${RELIC[r.k].n}</b>${RELIC[r.k].d}`),r.price,()=>{G.relics.push(r.k);if(RELIC[r.k].maxHpAll)G.party.forEach(u=>{u.maxHp+=RELIC[r.k].maxHpAll;u.hp+=RELIC[r.k].maxHpAll});r.sold=1})}
      if(!stock.stones.sold)mk(el('div','panel tile',`<i>◆</i><b>영혼석 ${stock.stones.n}개</b>동료 육성에 쓴다`),stock.stones.price,()=>{addStones(stock.stones.n);stock.stones.sold=1});
      if(!stock.clean.sold)mk(el('div','panel tile',`<i>✂</i><b>카드 정리</b>기본 카드 한 장을 덱에서 뺀다`),stock.clean.price,()=>{stock.clean.pend=1;stock.clean.sold=1});
      if(stock.clean.pend){stock.clean.pend=0;setTimeout(async()=>{
        const list=[];G.party.forEach(u=>u.deck.forEach(c=>{if(CARD[c.id].rar==='b')list.push(Object.assign({u},c,{uid:UID++}))}));
        const pk=await showPile('제거할 기본 카드',list,true);
        if(pk){pk.u.deck.splice(pk.u.deck.findIndex(c=>c.id===pk.id&&!c.p),1);toast(`${CARD[pk.id].n} 제거`)}else{addGold(P(stock.clean.price));stock.clean.sold=0}
        draw();
      },10)}
    }
    draw();
    $('#shopLeave').onclick=()=>{Mus.sfx('ui');advance();resolve()};
  });
}

/* ================= 이벤트 ================= */
function evArt(key){
  const cv=mkc(300,180),c=cv.getContext('2d');
  const g=c.createLinearGradient(0,0,300,180);g.addColorStop(0,'#2a0b45');g.addColorStop(1,'#0b0414');c.fillStyle=g;c.fillRect(0,0,300,180);
  const put=(src,x,y,h,a=1)=>{c.save();c.globalAlpha=a;const w=h*src.width/src.height;c.drawImage(src,x-w/2,y,w,h);c.restore()};
  if(key==='mirror'){c.fillStyle='#10061c';c.fillRect(100,10,100,160);c.strokeStyle='#d9a94f';c.lineWidth=4;c.strokeRect(100,10,100,160);put(bustCanvas('mirror'),150,22,140,.9)}
  else if(key==='clock'){const d=makeDial(ACTS[2].colors);c.globalAlpha=.85;c.drawImage(d,70,-10,160,160);c.globalAlpha=1}
  else if(key==='piano'){put(silhouette(SP.ornA,'#ffd27a'),90,10,160,.8);put(silhouette(SP.ornAr,'#ff6aa8'),210,10,160,.8);put(SP.hand,150,60,90)}
  else if(key==='arch'){put(silhouette(SP.ornB,'#ff4a6a'),90,0,180);put(silhouette(SP.ornBr,'#ff4a6a'),210,0,180);put(paint(SP.head,'maid','h'),150,40,110)}
  else if(key==='book'){put(SP.hand,150,30,130);c.fillStyle='rgba(255,226,154,.25)';c.fillRect(60,150,180,3)}
  else if(key==='tarot'){c.fillStyle='#1a0830';c.fillRect(110,14,80,150);c.strokeStyle='#ffd27a';c.lineWidth=3;c.strokeRect(110,14,80,150);put(silhouette(SP.ornA,'#ffd27a'),150,30,110,.9)}
  else if(key==='withered'){put(paint(SP.bust,'ghost','b'),150,10,170,.8)}
  else if(key==='chandelier'){put(silhouette(SP.ornB,'#ffe29a'),100,0,180);put(silhouette(SP.ornBr,'#ffe29a'),200,0,180)}
  else put(SP.head,150,20,140);
  return cv;
}
function runEvent(){
  return new Promise(resolve=>{
    show('s-event');Mus.play('event');
    let key=pick(EVENT_KEYS.filter(k=>!usedEvents.has(k)))||pick(EVENT_KEYS);usedEvents.add(key);
    if(usedEvents.size>=EVENT_KEYS.length)usedEvents.clear();
    const ev=EVENTS[key];
    $('#evTitle').textContent=ev.n;$('#evTxt').textContent=ev.txt;
    const art=$('#evArt');art.innerHTML='';art.appendChild(evArt(key));
    const box=$('#evCh');box.innerHTML='';
    for(const ch of ev.ch){
      const b=el('button','',`${ch.t}<small>${ch.d||''}</small>`);
      if(ch.cond&&!ch.cond(G))b.disabled=true;
      b.addEventListener('click',async()=>{
        Mus.sfx('ui');
        const msg=ch.run(G);renderHud();
        $('#evTxt').textContent=msg;box.innerHTML='';
        const nb=el('button','btn',G.pendingCardReward?'아르카나를 고른다':'계속');box.appendChild(nb);
        nb.addEventListener('click',async()=>{
          if(G.pendingCardReward){G.pendingCardReward=0;await pickCardReward()}
          advance();resolve();
        });
      });
      box.appendChild(b);
    }
  });
}
function pickCardReward(){
  return new Promise(res=>{
    const ov=$('#overlay-pile');ov.innerHTML='<h2 class="ttl">아르카나를 고르십시오</h2><div class="pcs" id="pcs"></div><button class="btn sm ghost" id="pcX">건너뛰기</button>';ov.classList.add('on');
    for(const id of rollCardChoices(3,'normal')){const d=CARD[id],c=cardEl({uid:UID++,id,p:0,rev:false,o:d.o});c.style.cursor='pointer';c.addEventListener('click',()=>{addSkill(id);ov.classList.remove('on');Mus.sfx('level');res()});$('#pcs',ov).appendChild(c)}
    $('#pcX').addEventListener('click',()=>{ov.classList.remove('on');res()});
  });
}

/* ================= 동료 합류 ================= */
function pickCompanion(list,title){
  return new Promise(res=>{
    show('s-pick');$('#pickTitle').textContent=title;const row=$('#pickRow');row.innerHTML='';
    for(const id of list){
      const c=CH[id],p=el('div','panel pcard');p.style.setProperty('--c',c.color);
      p.innerHTML=`<canvas width="420" height="430"></canvas><h3>${c.n}</h3><div class="ti">${c.title} · HP ${c.hp}</div><p>${c.bio}</p>`;
      p.querySelector('canvas').getContext('2d').drawImage(bustCanvas(c.pal),0,0);
      p.addEventListener('click',()=>{Mus.sfx('level');res(id)});row.appendChild(p);
    }
  });
}
async function runRecruit(){
  const rem=RECRUITABLE.filter(id=>!G.recruited.includes(id));
  let id=rem[0];if(rem.length>1)id=await pickCompanion(rem,'함께할 동료를 고르십시오');
  Mus.play('story');await playScene(STORY['recruit_'+id]);
  G.recruited.push(id);G.party.push(mkUnit(id));addSkill({gemini:'magician',clem:'c_flurry',rosa:'r_thorn',opal:'o_poison'}[id]);G.party.forEach(applyHpRelics);addStones(1);
  toast(`${CH[id].n}이(가) 일행에 합류했습니다`,true);advance();
}
function applyHpRelics(){}

/* ================= 캠프 ================= */
function runCamp(){
  return new Promise(resolve=>{
    show('s-camp');Mus.play('camp');
    $('#campTxt').textContent='안개가 닿지 않는 작은 응접실. 난로 불빛이 거울에 비치지 않는 유일한 장소입니다.';
    const box=$('#campOpts');box.innerHTML='';
    const done=()=>{advance();resolve()};
    const mk=(i,t,d,fn)=>{const b=el('button','panel tile',`<i>${i}</i><b>${t}</b>${d}`);b.style.cursor='pointer';b.addEventListener('click',()=>{Mus.sfx('ui');fn()});box.appendChild(b)};
    mk('☾','휴식','전원 HP 40% 회복, 상처 절반 치유',()=>{G.party.forEach(u=>{u.wound=Math.floor(u.wound/2);healUnit(u,Math.round(u.maxHp*.4))});Mus.sfx('heal');toast('모두 한숨 돌렸습니다',true);done()});
    mk('✎','기술 강화','카드 한 장의 수치를 약 30% 올린다',async()=>{
      const list=[];G.party.forEach(u=>u.deck.forEach(c=>{if(!c.p)list.push(Object.assign({u},c,{uid:UID++}))}));
      const pk=await showPile('강화할 카드',list,true);
      if(pk){const e=pk.u.deck.find(c=>c.id===pk.id&&!c.p);if(e){e.p=1;Mus.sfx('level');toast(`${CARD[pk.id].n} 강화`,true);done()}}
    });
    mk('✉','대화','동료 한 명과 이야기한다 (최대 HP +4, 영혼석 +1)',async()=>{
      const u=await pickUnit('누구와 이야기할까요');if(!u)return;
      const n=G.talks[u.id]||0,arr=CAMP_TALK[u.id],lines=arr[Math.min(n,arr.length-1)];
      G.talks[u.id]=n+1;Mus.play('story');await playScene(lines);u.maxHp+=4;u.hp+=4;addStones(1);Mus.play('camp');toast(`${u.n}의 최대 HP +4`,true);done();
    });
  });
}

/* ================= 파티 화면 ================= */
function openParty(){
  const ov=$('#overlay-party');ov.classList.add('on');
  let h=`<div class="ptop"><h2 class="ttl">일행</h2><div style="display:flex;gap:8px;align-items:center"><span class="chip">◆ 영혼석 <b>${G.stones}</b></span><button class="btn sm ghost" id="ppX">닫기</button></div></div><div class="pgrid" id="pgrid"></div>`;
  h+=`<div class="sect panel"><h4>지휘자 강화 (제미나이)</h4><div class="cond-row" id="condRow"></div></div>`;
  h+=`<div class="sect panel"><h4>유물</h4><div class="relics" id="pRelics"></div></div>`;
  ov.innerHTML=h;
  $('#ppX').onclick=()=>{ov.classList.remove('on');if($('#s-map').classList.contains('on'))renderMap()};
  const grid=$('#pgrid');
  for(const u of G.party){
    const c=el('div','panel pm');c.style.setProperty('--c',u.color);
    const nextC=levelCost(u),pc=passiveChoices(u);
    c.innerHTML=`<div class="hd"><canvas width="96" height="96"></canvas><div><h3>${u.n}</h3><div class="ti">${u.title} · Lv ${u.lv}</div></div></div>
      <div class="ps">HP <b>${u.hp}</b> / ${u.maxHp} · 상처 <b>${u.wound}</b> (회복 한도 ${emax(u)})<br>덱 ${u.deck.length}장${u.passives.length?'<br>패시브: '+u.passives.map(p=>`<b>${p.n}</b> (${p.d})`).join(', '):''}</div>
      <div class="passbtn" id="pb-${u.id}"></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" data-lv="${u.id}" ${nextC==null||G.stones<nextC?'disabled':''}>${nextC==null?'최대 레벨':`레벨업 (◆ ${nextC})`}</button><button class="btn sm ghost" data-deck="${u.id}">덱 보기</button></div>`;
    c.querySelector('canvas').getContext('2d').drawImage(iconCanvas(u.pal),0,0);
    grid.appendChild(c);
    if(pc){const pb=$('#pb-'+u.id);for(const p of pc){const b=el('button','',`<b>${p.n}</b>${p.d}`);b.addEventListener('click',()=>{takePassive(u,p);Mus.sfx('level');openParty()});pb.appendChild(b)}
      pb.insertAdjacentHTML('beforebegin','<div class="ps" style="color:var(--gold)">★ 패시브를 하나 고르십시오</div>')}
  }
  for(const b of $$('[data-lv]',ov))b.addEventListener('click',()=>{const u=G.party.find(x=>x.id===b.dataset.lv);if(levelUp(u))openParty()});
  for(const b of $$('[data-deck]',ov))b.addEventListener('click',()=>{const u=G.party.find(x=>x.id===b.dataset.deck);showPile(`${u.n}의 덱 (${u.deck.length}장)`,u.deck.map(c=>Object.assign({},c)))});
  const cr=$('#condRow');
  for(const d of COND_UP){
    const c=condCost(d.k),lv=G.cond[d.k];
    const b=el('button','btn sm',`${d.n} ${lv}/${d.max}${c==null?' (최대)':` · ◆ ${c}`}`);b.disabled=c==null||G.stones<c;b.title=d.d;b.setAttribute('data-tip',d.d);
    b.addEventListener('click',()=>{if(buyCond(d.k))openParty()});cr.appendChild(b);
  }
  $('#pRelics').innerHTML=G.relics.length?G.relics.map(k=>`<div class="chip" data-tip="${RELIC[k].d}">${REL_ICON[k]||'✦'} ${RELIC[k].n}</div>`).join(''):'<span style="color:var(--dim);font-size:12px">아직 없습니다.</span>';
}

/* ================= 결말 ================= */
async function finale(){
  Mus.play('story');
  const c=await askChoice([{t:'열세 번째 종을 울린다',d:'야회를 끝내고, 멈춘 시간을 다시 흐르게 한다.'},{t:'종을 멈춘 채 지킨다',d:'끝나지 않는 야회를 이어 간다.'}],'종 줄이 손 닿는 곳에 걸려 있다.');
  if(c===0){Mus.play('dawn');await cutscene('dawn');await playScene(STORY.end_dawn);showEnd('dawn')}
  else{Mus.play('eternal');await cutscene('eternal');await playScene(STORY.end_eternal);showEnd('eternal')}
}
function showEnd(kind){
  show('s-end');
  const T={defeat:['점괘는 불길했습니다','지휘자가 쓰러졌습니다. 박자는 다시 어긋났지만, 안개는 아직 이 이야기를 기억하지 못합니다.'],
    dawn:['새벽의 야회','열세 번째 종이 울렸습니다. 거울에서 안개가 걷히고, 모두가 각자의 얼굴로 돌아왔습니다.'],
    eternal:['끝나지 않는 야회','시계탑의 바늘은 열두 시 십삼 분에 머물렀습니다. 거울마다 왈츠가 이어집니다.']}[kind];
  $('#endTitle').textContent=T[0];$('#endDesc').textContent=T[1];
  $('#endStats').innerHTML=[`막 ${Math.min(3,G.act+1)}`,`전투 ${G.battles}회`,`${G.turns}턴`,`쓰러뜨린 적 ${G.stats.kills}`,`사용한 카드 ${G.stats.cards}장`,`일행 ${G.party.length}명`].map(s=>`<span class="rpill">${s}</span>`).join('');
  if(kind==='defeat'){}else Mus.play(kind==='dawn'?'dawn':'eternal');
  $('#endCan').getContext('2d').clearRect(0,0,420,430);
  const pal=kind==='defeat'?'ghost':'gemini',b=bustCanvas(pal);$('#endCan').getContext('2d').drawImage(b,0,0);
}

/* ================= 막 · 시작 ================= */
async function enterAct(a){tr('enterAct '+a);
  show('s-void');G.act=a;G.floor=0;G.map=genMap(a);
  setDial();
  if(a>0||true){await playScene(STORY['act'+(a+1)])}
  await splash('ACT '+(a+1),ACTS[a].n,ACTS[a].sub);
  renderMap();
}
async function startRun(first){
  newGame(first);G.party.forEach(u=>{});
  Mus.play('story');show('s-void');
  await cutscene('prologue');
  await playScene(STORY.prologue);
  Mus.play('story');await playScene(STORY['recruit_'+first]);
  await enterAct(0);
}
async function beginFlow(){
  Mus.init();Mus.resume();
  const first=await pickCompanion(RECRUITABLE,'첫 번째 동료를 고르십시오');
  await startRun(first);
}
