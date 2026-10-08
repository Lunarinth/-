/* ================= 엔진: 상태 · 전투 규칙 ================= */
let G=null,B=null,FAST=false;
const sleep=ms=>FAST?Promise.resolve():new Promise(r=>setTimeout(r,ms));
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const pickRand=pick;
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const REVP=.3;

/* ---- 런 상태 ---- */
function mkUnit(id,noSig){
  const c=CH[id];
  const u={id,n:c.n,title:c.title,pal:c.pal,color:c.color,maxHp:c.hp,hp:c.hp,wound:0,lv:1,passives:[],deck:c.basics.map(k=>({id:k,p:0})),down:false};
  return u;
}
function newGame(first){
  G={act:0,floor:0,gold:60,stones:3,party:[mkUnit('belis'),mkUnit(first)],relics:[],items:['bread'],
     cond:{mana:0,draw:0,skill:0},talks:{},turns:0,battles:0,hazeNext:0,recruited:[first],node:null,pendingCardReward:0,
     log:[],stats:{kills:0,cards:0}};
  /* 시작 기술: 각자 대표 기술 1장 (새 기술을 얻으면 기본 카드가 빠지는 규칙 적용) */
  const SIG={belis:'magician',obser:'c_flurry',claire:'r_thorn',sol:'o_poison'};
  for(const u of G.party)addSkill(SIG[u.id]);
  return G;
}
const pp=(u,k)=>u.passives.reduce((s,p)=>s+(p[k]||0),0);
const rs=(k)=>G.relics.reduce((s,r)=>s+(RELIC[r][k]||0),0);
const emax=u=>Math.max(1,u.maxHp-u.wound);
function addGold(n){G.gold=Math.max(0,G.gold+n);if(n>0)Mus.sfx('coin')}
function addStones(n){G.stones+=n;if(n>0)Mus.sfx('stone')}
function giveItem(k){if(G.items.length>=3)return false;G.items.push(k);return true}
function giveRelic(boss){
  const pool=Object.keys(RELIC).filter(k=>!G.relics.includes(k)&&(boss?RELIC[k].boss:!RELIC[k].boss));
  if(!pool.length)return null;const k=pick(pool);G.relics.push(k);
  if(RELIC[k].maxHpAll)G.party.forEach(u=>{u.maxHp+=RELIC[k].maxHpAll;u.hp+=RELIC[k].maxHpAll});
  return k;
}
function healUnit(u,n){if(u.down)return;u.hp=Math.min(emax(u),u.hp+n)}
function dmgUnit(u,n){u.hp=Math.max(1,u.hp-n);u.wound=Math.min(u.maxHp-1,u.wound+Math.ceil(n/3));if(u.hp>emax(u))u.hp=emax(u)}
function levelCost(u){return u.lv<5?LV_COST[u.lv]:null}
function levelUp(u){
  const c=levelCost(u);if(c==null||G.stones<c)return false;
  G.stones-=c;u.lv++;u.maxHp+=6;u.hp=Math.min(emax(u),u.hp+6);Mus.sfx('level');return true;
}
function passiveChoices(u){
  /* 레벨 2·4에서 고를 패시브 (아직 선택하지 않은 슬롯) */
  const slots=[];const list=PASS[u.id];
  if(u.lv>=2&&u.passives.length<1)slots.push(list[0]);
  if(u.lv>=4&&u.passives.length<2)slots.push(list[1]);
  return slots.length?slots[0]:null;
}
function takePassive(u,p){u.passives.push(p);if(p.maxHp){u.maxHp+=p.maxHp;u.hp+=p.maxHp}}
function condMaxMana(){return 3+G.cond.mana+rs('manaBonus')}
function condDraw(){return 5+G.cond.draw+rs('drawBonus')}
function condCost(k){const d=COND_UP.find(c=>c.k===k),lv=G.cond[k];return lv>=d.max?null:d.costs[lv]}
function buyCond(k){const c=condCost(k);if(c==null||G.stones<c)return false;G.stones-=c;G.cond[k]++;Mus.sfx('level');return true}
const cardOf=e=>CARD[e.id];
function cardView(inst){
  /* 현재 상태(역방향·강화)를 반영한 {c,t,fx} */
  const d=CARD[inst.id];
  if(d.unplay)return{c:d.c,t:'s',fx:{}};
  let b=inst.rev&&d.rev?{c:d.rev.c,t:d.rev.t,fx:d.rev.fx}:{c:d.c,t:d.t,fx:d.fx};
  if(inst.p)b={c:b.c,t:b.t,fx:plusFx(b.fx)};
  return b;
}
function upgradeCard(entry){if(entry.p)return false;entry.p=1;return true}

/* ---- 전투 생성 ---- */
function mkEnemy(key){
  const d=EN[key];
  const e={key,def:d,n:d.n,hp:d.hp,max:d.hp,block:0,st:{},idx:0,pat:d.pat.slice(),boss:!!d.boss,elite:!!d.elite,p2done:false,intent:null,tgt:null,dead:false,el:null,spawn:0};
  return e;
}
function startBattle(keys,opts={}){
  const allies=G.party.filter(u=>!u.down).map(u=>({u,id:u.id,block:0,st:{},stunned:false,dead:false,el:null}));
  B={allies,enemies:keys.map(mkEnemy),draw:[],hand:[],disc:[],exh:[],mana:0,maxMana:condMaxMana(),turn:0,over:false,won:false,
     uid:1,conductUsed:false,discount:0,nextMana:0,opts,playerTurn:false,busy:false,firstDraw:0,firstMana:0,kills:0,cardsPlayed:0};
  /* 공용 덱 구성: 모든 파티원의 카드를 한 덱으로 섞는다 */
  for(const a of allies)for(const c of a.u.deck)B.draw.push({uid:B.uid++,o:a.id,id:c.id,p:c.p,rev:false});
  for(let i=0;i<(G.hazeNext||0);i++)B.draw.push({uid:B.uid++,o:null,id:'haze',p:0,rev:false});
  G.hazeNext=0;
  shuffle(B.draw);
  /* 시작 효과: 패시브 + 유물 */
  for(const a of allies){
    const u=a.u;
    if(pp(u,'startBlock'))a.block+=pp(u,'startBlock');
    for(const p of u.passives){
      if(p.startSt)for(const k in p.startSt)a.st[k]=(a.st[k]||0)+p.startSt[k];
      if(p.startAst)for(const o of allies)for(const k in p.startAst)o.st[k]=(o.st[k]||0)+p.startAst[k];
      if(p.ablockStart)for(const o of allies)o.block+=p.ablockStart;
      B.firstDraw+=p.firstDraw||0;B.firstMana+=p.firstMana||0;
    }
  }
  const rb=rs('ablockStart');if(rb)for(const a of allies)a.block+=rb;
  B.firstDraw+=rs('firstDraw');B.firstMana+=rs('firstMana');
  const est=G.relics.map(r=>RELIC[r].startEst).filter(Boolean);
  for(const e of B.enemies){for(const s of est)for(const k in s)e.st[k]=(e.st[k]||0)+s[k];setIntent(e)}
  return B;
}
const aliveA=()=>B.allies.filter(a=>!a.dead);
const aliveE=()=>B.enemies.filter(e=>!e.dead);
const allyOf=id=>B.allies.find(a=>a.id===id);
function ownerAlive(inst){return inst.o===null?false:!!aliveA().find(a=>a.id===inst.o)}

/* ---- 인텐트 ---- */
function setIntent(e){
  const it=e.pat[e.idx++%e.pat.length];e.intent=it;
  const al=aliveA();
  e.tgt=null;
  if(it.atk&&!it.all&&al.length){
    const tk=al.find(a=>a.st.taunt>0);
    e.tgt=tk?tk.id:pick(al).id;
  }
}
function foeDmg(e,it,tgtA){
  let d=(it.atk+(e.st.str||0));
  if(e.st.weak>0)d*=.75;
  if(tgtA&&tgtA.st.vuln>0)d*=1.5;
  return Math.max(0,Math.floor(d));
}
function intentPreview(e){
  const it=e.intent;if(!it)return null;
  const tgt=e.tgt?allyOf(e.tgt):null;
  return{it,tgt,dmg:it.atk?foeDmg(e,it,tgt):0};
}

/* ---- 수치 계산 ---- */
function calcDmg(srcA,base,tgtE,extra={}){
  let d=base+(srcA?(srcA.st.str||0):0);
  if(srcA){d+=pp(srcA.u,'dmgBonus')+rs('dmgBonusAll')}
  d+=extra.add||0;
  if(srcA&&srcA.st.weak>0)d*=.75;
  if(tgtE&&tgtE.st.vuln>0)d*=1.5;
  return Math.max(0,Math.floor(d));
}
function applySt(X,st,src){
  for(const k in st){
    let v=st[k];
    if(k==='poison'&&src)v+=pp(src.u,'poisonBonus');
    X.st[k]=(X.st[k]||0)+v;
    if(k==='stun'||k==='taunt')X.st[k]=Math.min(X.st[k],2);
  }
  UI.status(X);
}
function addBlock(X,n){X.block+=n;UI.block(X,n)}
function healAlly(A,n,src){
  if(A.dead)return;
  n+=src?pp(src.u,'healBonus'):0;
  const before=A.u.hp;A.u.hp=Math.min(emax(A.u),A.u.hp+n);
  UI.heal(A,A.u.hp-before);
}
function cureAlly(A,n){const w=Math.min(A.u.wound,n);if(w>0){A.u.wound-=w;UI.cure(A,w)}}

/* ---- 피해 ---- */
async function hurtEnemy(e,amount,srcA,opt={}){
  if(e.dead)return 0;
  if(e.st.evade>0&&amount>0&&!opt.pierce&&!opt.poison&&!opt.thorns){e.st.evade--;UI.float(e,'빗나감','sys');UI.status(e);await sleep(200);return 0}
  const absorbed=opt.pierce?0:Math.min(e.block,amount);e.block-=absorbed;
  const real=amount-absorbed;e.hp=Math.max(0,e.hp-real);
  UI.hitEnemy(e,amount,absorbed,real,opt);
  if(srcA&&real>0){
    const po=pp(srcA.u,'poisonOnHit');if(po&&e.hp>0){e.st.poison=(e.st.poison||0)+po;UI.status(e)}
  }
  await sleep(opt.fast?60:140);
  if(e.hp<=0)await killEnemy(e);
  else await checkPhase(e);
  return real;
}
async function killEnemy(e){
  if(e.dead)return;
  e.dead=true;B.kills++;G.stats.kills++;
  UI.enemyDie(e);Mus.sfx('die');
  await sleep(480);
}
async function checkPhase(e){
  const p=e.def.ph2;
  if(p&&!e.p2done&&e.hp>0&&e.hp<=e.max*p.at){
    e.p2done=true;e.pat=p.pat.slice();e.idx=0;e.st.str=(e.st.str||0)+p.str;setIntent(e);
    await UI.phase2(e);
  }
}
async function hurtAlly(A,amount,srcE,opt={}){
  if(A.dead)return 0;
  const absorbed=Math.min(A.block,amount);A.block-=absorbed;
  const real=amount-absorbed;
  if(real>0){
    A.u.hp=Math.max(0,A.u.hp-real);
    A.u.wound=Math.min(A.u.maxHp-1,A.u.wound+Math.ceil(real/3));
    if(A.u.hp>emax(A.u)&&A.u.hp>0)A.u.hp=emax(A.u);
  }
  UI.hitAlly(A,amount,absorbed,real);
  /* 가시 반격 */
  if(srcE&&!srcE.dead&&A.st.thorns>0&&!opt.noThorns){
    await hurtEnemy(srcE,A.st.thorns,null,{pierce:true,thorns:true,fast:true});
  }
  if(A.u.hp<=0){A.dead=true;A.u.down=true;UI.allyDie(A);Mus.sfx('die');
    B.hand=B.hand.filter(c=>c.o!==A.id);await sleep(500)}
  return real;
}

/* ---- 카드 ---- */
function canPlay(inst){
  if(!B||!B.playerTurn||B.busy||B.over)return false;
  const d=CARD[inst.id];if(d.unplay)return false;
  const a=allyOf(inst.o);if(!a||a.dead||a.stunned)return false;
  const v=cardView(inst);return cost(inst)<=B.mana;
}
function cost(inst){const v=cardView(inst);return Math.max(0,v.c-(B.discount||0))}
function needsTarget(inst){const t=cardView(inst).t;return t==='e'||t==='a'}
function validTargets(inst){
  const t=cardView(inst).t;
  if(t==='e')return aliveE();
  if(t==='a')return aliveA();
  return[];
}
async function playCard(uid,target){
  if(!B||B.busy||B.over||!B.playerTurn)return false;
  const idx=B.hand.findIndex(c=>c.uid===uid);if(idx<0)return false;
  const inst=B.hand[idx];if(!canPlay(inst))return false;
  const v=cardView(inst),src=allyOf(inst.o);
  let tgt=target;
  if(v.t==='e'){const es=aliveE();if(!tgt||tgt.dead||!es.includes(tgt)){if(es.length===1)tgt=es[0];else return false}}
  if(v.t==='a'){const al=aliveA();if(!tgt||tgt.dead||!al.includes(tgt)){if(al.length===1)tgt=al[0];else return false}}
  B.busy=true;
  const c=cost(inst);B.mana-=c;B.discount=0;B.hand.splice(idx,1);B.cardsPlayed++;G.stats.cards++;
  UI.cardPlayed(inst,v,src,tgt);
  await sleep(300);
  await execFx(src,v.fx,v.t,tgt,inst);
  if(inst.rev&&CARD[inst.id].o==='belis'){const rb=pp(src.u,'revBlock');if(rb)for(const a of aliveA())addBlock(a,rb)}
  B.cardsPlayed;
  if(v.fx.exh)B.exh.push(inst);else B.disc.push(inst);
  UI.refresh();
  B.busy=false;
  await checkEnd();
  UI.refresh();
  return true;
}
async function execFx(src,f,t,tgt,inst){
  const es=aliveE(),al=aliveA();
  let tAl=t==='A'?al:t==='a'?[tgt]:t==='s'?[src]:[];
  const stats=f.st;
  /* 방어·치유·강화 */
  if(f.sblock)addBlock(src,f.sblock);
  if(f.block)for(const a of tAl)addBlock(a,f.block);
  if(f.ablock)for(const a of al)addBlock(a,f.ablock);
  if(f.sheal)healAlly(src,f.sheal,src);
  if(f.heal)for(const a of tAl)healAlly(a,f.heal,src);
  if(f.aheal)for(const a of al)healAlly(a,f.aheal,src);
  if(f.cure)for(const a of tAl)cureAlly(a,f.cure);
  if(f.acure)for(const a of al)cureAlly(a,f.acure);
  if(f.sst)applySt(src,f.sst,src);
  if(f.ast)for(const a of al)applySt(a,f.ast,src);
  if(stats&&(t==='a'||t==='s'||t==='A'))for(const a of tAl)applySt(a,stats,src);
  if(f.est)for(const e of es)applySt(e,f.est,src);
  /* 공격 */
  const hits=f.hits||1;
  const eTargets=()=>t==='E'?aliveE():t==='e'?(tgt&&!tgt.dead?[tgt]:[]):t==='r'?(aliveE().length?[pick(aliveE())]:[]):[];
  if(f.rand){const tg=eTargets();for(const e of tg)await hurtEnemy(e,calcDmg(src,rnd(f.rand[0],f.rand[1]),e),src)}
  if(f.dmg!==undefined){
    for(let i=0;i<hits;i++){
      const tg=eTargets();if(!tg.length)break;
      UI.swing(src);
      for(const e of tg){
        let add=(f.bonusLow&&e.hp<=e.max*.5)?f.bonusLow:0;
        await hurtEnemy(e,calcDmg(src,f.dmg,e,{add}),src,{pierce:!!f.pierce,aoe:t==='E'});
      }
      if(i<hits-1)await sleep(90);
    }
  }
  if(f.blockdmg){const tg=eTargets();for(const e of tg)await hurtEnemy(e,calcDmg(src,Math.floor(src.block*f.blockdmg),e),src)}
  if(stats&&(t==='e'||t==='E'||t==='r')){for(const e of eTargets())applySt(e,stats,src)}
  if(f.self){await hurtAlly(src,f.self,null,{noThorns:true});if(src.dead){await checkEnd();return}}
  if(f.mana){B.mana+=f.mana;UI.mana(f.mana)}
  if(f.nextMana)B.nextMana+=f.nextMana;
  if(f.draw)await drawCards(f.draw);
}

/* ---- 드로우 / 턴 ---- */
async function drawCards(n){
  let drew=0;
  for(let i=0;i<n;i++){
    if(B.hand.length>=10)break;
    if(!B.draw.length){
      if(!B.disc.length)break;
      B.draw=shuffle(B.disc);B.disc=[];UI.shuffle();
    }
    /* 소유자가 쓰러진 카드는 이번 전투에서 제외 */
    const c=B.draw.pop();
    if(c.o!==null&&!allyOf(c.o)||(c.o!==null&&allyOf(c.o).dead)){B.exh.push(c);i--;continue}
    const gp=aliveA().some(a=>a.id==='belis')?pp(allyOf('belis').u,'revP'):0;
    c.rev=c.o==='belis'&&CARD[c.id].rev&&Math.random()<REVP+gp;
    B.hand.push(c);drew++;
  }
  UI.drawn(drew);
  return drew;
}
async function startPlayerTurn(){
  B.turn++;G.turns++;
  B.conductUsed=false;B.discount=0;
  B.maxMana=condMaxMana();
  B.mana=B.maxMana+B.nextMana+(B.turn===1?B.firstMana:0);B.nextMana=0;
  for(const a of aliveA()){
    a.block=0;
    a.stunned=a.st.stun>0;if(a.st.stun>0)a.st.stun--;
    if(a.st.poison>0){await hurtAllyDirect(a,a.st.poison);a.st.poison=Math.max(0,a.st.poison-1)}
    if(a.dead)continue;
    if(a.st.regen>0){healAlly(a,3,null);a.st.regen--}
    const ab=pp(a.u,'turnABlock');if(ab)for(const o of aliveA())addBlock(o,ab);
    const th=pp(a.u,'turnHealLow');if(th){const low=aliveA().sort((x,y)=>(x.u.hp/emax(x.u))-(y.u.hp/emax(y.u)))[0];healAlly(low,th,a)}
  }
  await checkEnd();if(B.over)return;
  B.playerTurn=true;
  UI.turnStart();
  await sleep(350);
  await drawCards(condDraw()+(B.turn===1?B.firstDraw:0));
  UI.refresh();
}
async function hurtAllyDirect(A,n){
  A.u.hp=Math.max(0,A.u.hp-n);A.u.wound=Math.min(A.u.maxHp-1,A.u.wound+Math.ceil(n/3));if(A.u.hp>emax(A.u)&&A.u.hp>0)A.u.hp=emax(A.u);
  UI.hitAlly(A,n,0,n);
  if(A.u.hp<=0){A.dead=true;A.u.down=true;UI.allyDie(A);B.hand=B.hand.filter(c=>c.o!==A.id);await sleep(400)}
}
async function conduct(){
  if(!B||!B.playerTurn||B.busy||B.over||B.conductUsed)return false;
  B.conductUsed=true;B.discount=1;UI.conduct();
  const gem=allyOf('belis');
  const drawN=(G.cond.skill?1:0)+rs('conductDraw')+(gem&&!gem.dead?pp(gem.u,'conductDraw'):0);
  if(drawN)await drawCards(drawN);
  UI.refresh();return true;
}
async function endTurn(){
  if(!B||B.busy||B.over||!B.playerTurn)return false;
  B.busy=true;B.playerTurn=false;
  for(const c of B.hand){if(c.id==='haze')B.exh.push(c);else B.disc.push(c)}
  B.hand=[];B.discount=0;UI.refresh();
  await enemyPhase();
  if(B.over){B.busy=false;return true}
  await startPlayerTurn();
  B.busy=false;UI.refresh();
  return true;
}
async function enemyPhase(){
  UI.banner('적의 차례',true);await sleep(600);
  for(const e of B.enemies.slice()){
    if(e.dead||B.over)continue;
    e.block=0;
    if(e.st.poison>0){await hurtEnemy(e,e.st.poison,null,{pierce:true,poison:true,fast:true});e.st.poison=Math.max(0,e.st.poison-1);UI.status(e);if(e.dead)continue}
    if(B.over)break;
    if(e.st.stun>0){e.st.stun--;UI.status(e);UI.float(e,'기절','sys');await sleep(400);setIntent(e);continue}
    await enemyAct(e);
    if(B.over)break;
  }
  if(B.over)return;
  /* 상태 만료 */
  for(const a of aliveA()){if(a.st.weak>0)a.st.weak--;if(a.st.vuln>0)a.st.vuln--;if(a.st.taunt>0)a.st.taunt--;UI.status(a)}
  for(const e of aliveE()){if(e.st.weak>0)e.st.weak--;if(e.st.vuln>0)e.st.vuln--;UI.status(e)}
  for(const e of aliveE())setIntent(e);
  UI.refresh();
  await sleep(250);
}
async function enemyAct(e){
  const it=e.intent;
  UI.enemyLunge(e);await sleep(260);
  if(it.def){e.block+=it.def;UI.block(e,it.def)}
  if(it.heal){const h=Math.min(e.max-e.hp,it.heal);e.hp+=h;UI.heal(e,h)}
  if(it.sst){for(const k in it.sst)e.st[k]=(e.st[k]||0)+it.sst[k];UI.status(e);Mus.sfx('buff')}
  if(it.summon&&aliveE().length<4){
    const n=mkEnemy(it.summon);B.enemies.push(n);setIntent(n);UI.spawn(n);await sleep(400);
  }
  if(it.curse){
    for(let i=0;i<it.curse;i++)B.disc.push({uid:B.uid++,o:null,id:'haze',p:0,rev:false});
    UI.curse(e,it.curse);await sleep(300);
  }
  if(it.aoeSt){for(const a of aliveA())applySt(a,it.aoeSt,null);Mus.sfx('poison')}
  if(it.atk){
    const hits=it.hits||1;
    for(let i=0;i<hits;i++){
      if(B.over)return;
      let targets;
      if(it.all)targets=aliveA();
      else{
        const tk=aliveA().find(a=>a.st.taunt>0);
        let t=tk||(e.tgt&&allyOf(e.tgt)&&!allyOf(e.tgt).dead?allyOf(e.tgt):pick(aliveA()));
        targets=t?[t]:[];
      }
      for(const a of targets){
        if(a.dead)continue;
        const d=foeDmg(e,it,a);
        const real=await hurtAlly(a,d,e);
        if(it.st&&!a.dead){applySt(a,it.st,null);Mus.sfx('debuff')}
        if(it.drain&&real>0){const h=Math.min(e.max-e.hp,real);e.hp+=h;UI.heal(e,h)}
      }
      await checkEnd();if(B.over)return;
      await sleep(it.all?200:240);
    }
  }
  else if(it.st){
    const t=e.tgt&&allyOf(e.tgt)&&!allyOf(e.tgt).dead?allyOf(e.tgt):pick(aliveA());
    if(t){applySt(t,it.st,null);Mus.sfx('debuff')}
  }
  await sleep(160);
}

/* ---- 종료 판정 ---- */
async function checkEnd(){
  if(!B||B.over)return;
  const gem=allyOf('belis');
  if(!aliveA().length||(gem&&gem.dead)){B.over=true;B.won=false;await sleep(500);UI.battleEnd(false);return}
  if(!aliveE().length){B.over=true;B.won=true;await sleep(400);UI.battleEnd(true)}
}
/* ---- 소모품 사용 ---- */
async function useItem(idx,target){
  const k=G.items[idx];if(!k)return false;const it=ITEM[k];
  if(B&&B.over)return false;
  if(B){
    if(!B.playerTurn||B.busy)return false;
    B.busy=true;
    const src=allyOf('belis')||aliveA()[0];
    let t=it.tgt;
    if(t==='a'&&!target)target=aliveA()[0];
    await execFx(src,it.fx,t==='s'?'s':t,target,null);
    G.items.splice(idx,1);B.busy=false;UI.refresh();await checkEnd();return true;
  }
  if(!it.field)return false;
  /* 필드에서 사용: 대상은 파티원(unit) */
  const u=target;if(!u)return false;
  if(it.fx.cure)u.wound=Math.max(0,u.wound-it.fx.cure);
  if(it.fx.heal)healUnit(u,it.fx.heal);
  G.items.splice(idx,1);Mus.sfx('heal');return true;
}
/* ---- 전투 종료 후 정산 ---- */
function settleBattle(won){
  /* 쓰러진 동료는 HP 1로 일으켜 세운다 */
  for(const u of G.party){if(u.down){u.down=false;u.hp=1}if(u.hp>emax(u))u.hp=emax(u);if(u.hp<1)u.hp=1}
  if(!won)return null;
  const o=B.opts,type=o.type||'normal';
  const gold=Math.round(({normal:rnd(14,22),elite:rnd(32,44),boss:rnd(55,70)}[type])*(1+rs('goldMul')));
  const stones=({normal:rnd(1,2),elite:3,boss:5}[type])+rs('stoneBonus');
  addGold(gold);addStones(stones);
  G.party.forEach(u=>healUnit(u,Math.round(u.maxHp*.08)));
  const heal=rs('healAfter');if(heal)G.party.forEach(u=>healUnit(u,heal));
  const cure=rs('cureAfter');if(cure)G.party.forEach(u=>{u.wound=Math.max(0,u.wound-cure)});
  G.battles++;
  const drop=Math.random()<.35?pick(Object.keys(ITEM)):null;
  if(drop)giveItem(drop);
  return{gold,stones,drop,type};
}
/* ---- 카드 보상 ---- */
function rollCardChoices(n=3,bias='normal'){
  const party=G.party.map(u=>u.id);
  const w=bias==='boss'?{c:10,u:50,r:40}:bias==='elite'?{c:30,u:50,r:20}:{c:60,u:33,r:7};
  const out=[];let guard=0;
  while(out.length<n&&guard++<200){
    const roll=Math.random()*(w.c+w.u+w.r),rar=roll<w.c?'c':roll<w.c+w.u?'u':'r';
    const pool=SKILL_POOL.filter(c=>c.rar===rar&&party.includes(c.o)&&!out.includes(c.id));
    if(pool.length)out.push(pick(pool).id);
  }
  return out;
}
function addSkill(cardId){
  const d=CARD[cardId],u=G.party.find(x=>x.id===d.o);if(!u)return false;
  u.deck.push({id:cardId,p:0});
  /* 크로노 아크 규칙: 새 기술을 얻으면 기본 카드가 하나 빠진다 */
  const bi=u.deck.findIndex(c=>CARD[c.id].rar==='b');
  if(bi>=0&&u.deck.length>5)u.deck.splice(bi,1);
  return true;
}
