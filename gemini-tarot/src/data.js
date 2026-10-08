/* ================= 데이터: 동료 · 카드 · 적 · 유물 · 이벤트 · 이야기 ================= */
const CH={
  gemini:{n:'제미나이',title:'지휘자',pal:'gemini',color:'#d64fa0',hp:62,lead:true,
    bio:'루센트 저택 야회의 지휘자. 지휘봉으로 타로의 아르카나를 불러내며, 카드는 뽑힐 때 역방향으로 뒤집힐 수 있다.',
    basics:['g_baton','g_baton','g_baton','g_guard','g_guard','g_omen']},
  clem:{n:'클레멘타인',title:'초침의 시계공',pal:'astra',color:'#4fd0e0',hp:50,
    bio:'시계탑을 돌보던 견습 시계공. 짧은 박자로 여러 번 찌르고, 약해진 적을 정확하게 마무리한다.',
    basics:['c_tick','c_tick','c_tick','c_stop','c_stop','c_wind']},
  rosa:{n:'로자문트',title:'문지기',pal:'maid',color:'#e0506a',hp:84,
    bio:'저택의 대문을 지키던 문지기. 도발과 방어도로 파티를 지키고, 쌓은 방어도를 그대로 힘으로 돌려준다.',
    basics:['r_slam','r_slam','r_bar','r_bar','r_bar','r_stand']},
  opal:{n:'오팔',title:'온실지기',pal:'sol',color:'#7fd46b',hp:54,
    bio:'장미 온실의 정원사. 독과 가시로 적을 천천히 말리고, 아군의 상처를 보살핀다.',
    basics:['o_thorn','o_thorn','o_mend','o_mend','o_leaf','o_leaf']}
};
const RECRUITABLE=['clem','rosa','opal'];

/* 카드 정의: o=소유자, t=대상(e 적 하나, E 적 전체, a 아군 하나, A 아군 전체, s 소유자 자신, r 무작위 적), c=비용 */
const CARD={};
function K(id,n,o,rar,c,t,fx,art,h,rev){CARD[id]={id,n,o,rar,c,t,fx,art,h:h||0,rev:rev||null}}
/* ---- 제미나이: 기본 ---- */
K('g_baton','지휘봉 타격','gemini','b',1,'e',{dmg:6},'wand',0);
K('g_guard','리듬 방어','gemini','b',1,'a',{block:6},'hand',0);
K('g_omen','점괘','gemini','b',1,'s',{draw:1,sblock:3},'eyes',0);
/* ---- 제미나이: 타로 (역방향 보유) ---- */
K('fool','광대','gemini','c',0,'s',{draw:2},'shoes',30,{c:0,t:'s',fx:{draw:3,self:3}});
K('magician','마법사','gemini','c',1,'e',{dmg:8},'wand',0,{c:0,t:'e',fx:{dmg:5}});
K('priestess','여사제','gemini','u',1,'a',{block:7,draw:1},'eyes',-30,{c:1,t:'e',fx:{dmg:3,st:{vuln:2}}});
K('empress','여제','gemini','u',2,'A',{aheal:6,ablock:5},'cape',20,{c:2,t:'A',fx:{ablock:13}});
K('emperor','황제','gemini','u',2,'e',{dmg:15},'frameTop',-15,{c:2,t:'e',fx:{dmg:22,self:5}});
K('lovers','연인','gemini','c',1,'e',{dmg:4,hits:2},'hand',-50,{c:1,t:'e',fx:{dmg:3,hits:2,aheal:3}});
K('strength','힘','gemini','u',1,'a',{st:{str:2}},'hair',60,{c:1,t:'a',fx:{st:{str:3},self:4}});
K('wheel','운명의 수레바퀴','gemini','u',1,'r',{rand:[4,16]},'ornBR',90,{c:1,t:'r',fx:{rand:[0,26]}});
K('hierophant','교황','gemini','c',1,'a',{block:5,est:{weak:1}},'ornTL',40,{c:0,t:'s',fx:{est:{weak:2}}});
K('chariot','전차','gemini','c',2,'e',{dmg:8,ablock:5},'capeP',10,{c:1,t:'e',fx:{dmg:5,ablock:3}});
K('tower','탑','gemini','u',2,'E',{dmg:9,est:{vuln:1}},'frameTop',170,{c:2,t:'E',fx:{dmg:14,self:8}});
K('star','별','gemini','c',1,'a',{heal:8,draw:1},'ornTL',-100,{c:2,t:'A',fx:{aheal:7}});
K('moon','달','gemini','c',1,'e',{st:{weak:2},sblock:5},'capeP',-140,{c:1,t:'e',fx:{st:{weak:3,vuln:2}}});
K('sun','태양','gemini','u',2,'A',{aheal:5,ast:{str:1}},'face',-175,{c:2,t:'A',fx:{aheal:8}});
K('judgement','심판','gemini','r',3,'E',{dmg:16,draw:2},'bow',110,{c:3,t:'E',fx:{dmg:22,exh:1}});
K('world','세계','gemini','r',3,'A',{ablock:14,nextMana:1},'ornBR',-40,{c:2,t:'A',fx:{ablock:9,draw:2}});
K('death','죽음','gemini','r',3,'e',{dmg:30,exh:1},'eyes',200,{c:2,t:'e',fx:{dmg:20,self:7,exh:1}});
K('devil','악마','gemini','u',1,'e',{dmg:12,self:3},'wand',150,{c:1,t:'e',fx:{dmg:18,self:6}});
K('temperance','절제','gemini','c',1,'a',{block:5,heal:4},'cape',-80,{c:1,t:'a',fx:{block:3,heal:7}});
K('hanged','매달린 사람','gemini','r',0,'s',{mana:2,self:4,exh:1},'face',140,{c:0,t:'s',fx:{mana:1,draw:2,exh:1}});
K('hermit','은둔자','gemini','c',1,'a',{block:9},'ruffle',-70,{c:0,t:'a',fx:{block:5}});
/* ---- 클레멘타인 ---- */
K('c_tick','째깍','clem','b',1,'e',{dmg:6},'wand',-118);
K('c_stop','정지','clem','b',1,'s',{sblock:6},'hand',-118);
K('c_wind','태엽 감기','clem','b',1,'s',{draw:1,sblock:3},'ornTL',-118);
K('c_second','초침','clem','c',0,'e',{dmg:4},'wand',-100);
K('c_flurry','연속 째깍','clem','c',1,'e',{dmg:3,hits:3},'wand',-130);
K('c_minute','분침','clem','u',2,'e',{dmg:14,bonusLow:8},'wand',-90);
K('c_hour','시침','clem','r',3,'e',{dmg:24,st:{vuln:2}},'wand',-150);
K('c_overwind','태엽 폭주','clem','u',1,'s',{sst:{str:2},draw:1,self:3},'ornBR',-118);
K('c_sweep','회전','clem','u',2,'E',{dmg:7},'cape',-118);
K('c_rewind','되감기','clem','u',1,'s',{draw:2,mana:1,exh:1},'ornTL',-60);
K('c_aim','정밀 조준','clem','c',1,'e',{dmg:6,pierce:1},'eyes',-118);
K('c_rust','녹슨 바늘','clem','c',1,'e',{st:{poison:6}},'wand',-30);
K('c_chain','연쇄 반응','clem','u',2,'e',{dmg:4,hits:4},'hand',-118);
K('c_freeze','시간 정지','clem','r',2,'e',{dmg:6,st:{stun:1},exh:1},'face',-118);
K('c_reset','재시동','clem','r',0,'s',{mana:2,draw:2,exh:1},'frameTop',-118);
/* ---- 로자문트 ---- */
K('r_slam','대문 밀치기','rosa','b',1,'e',{dmg:6},'hand',45);
K('r_bar','빗장','rosa','b',1,'s',{sblock:7},'ruffle',45);
K('r_stand','문 앞에 서다','rosa','b',1,'s',{sblock:4,sst:{taunt:1}},'shoes',45);
K('r_wall','철벽','rosa','c',2,'s',{sblock:16,sst:{taunt:1}},'ruffle',30);
K('r_thorn','가시 울타리','rosa','c',1,'s',{sblock:5,sst:{thorns:3}},'ornTL',30);
K('r_bash','방패 치기','rosa','c',1,'e',{blockdmg:1},'hand',60);
K('r_gate','수문','rosa','u',3,'A',{ablock:10},'capeP',45);
K('r_taunt','도발','rosa','c',0,'s',{sst:{taunt:1}},'face',45);
K('r_endure','인내','rosa','u',1,'s',{sblock:6,sheal:5},'ruffle',20);
K('r_ram','돌격','rosa','u',2,'e',{dmg:10,sblock:8},'shoes',30);
K('r_oath','맹세','rosa','r',2,'s',{sst:{str:3,thorns:4}},'bow',45);
K('r_lock','잠금','rosa','u',1,'e',{dmg:6,st:{weak:2}},'ornBR',45);
K('r_mace','쇠몽둥이','rosa','r',2,'e',{blockdmg:1.5},'wand',45);
K('r_garrison','수비대','rosa','u',2,'A',{ablock:7,ast:{thorns:2}},'cape',45);
K('r_lastgate','마지막 문','rosa','r',3,'s',{sblock:30,sst:{taunt:2},exh:1},'frameTop',45);
/* ---- 오팔 ---- */
K('o_thorn','가시 던지기','opal','b',1,'e',{dmg:6},'ornTL',170);
K('o_mend','약초','opal','b',1,'a',{heal:6},'hand',170);
K('o_leaf','이파리 방패','opal','b',1,'a',{block:5},'cape',170);
K('o_bloom','개화','opal','c',2,'A',{aheal:6},'cape',150);
K('o_poison','독초','opal','c',1,'e',{st:{poison:6}},'ornBR',170);
K('o_sprout','새순','opal','c',1,'a',{st:{regen:3}},'hair',150);
K('o_vines','덩굴','opal','u',1,'e',{dmg:4,st:{vuln:2}},'ornTL',190);
K('o_pollen','꽃가루','opal','u',1,'E',{dmg:3,est:{weak:1}},'face',170);
K('o_prune','가지치기','opal','u',1,'e',{dmg:9,st:{poison:3}},'wand',170);
K('o_cure','상처 치유','opal','u',1,'a',{cure:5,heal:3},'hand',200);
K('o_thornwall','가시 장벽','opal','u',2,'A',{ablock:4,ast:{thorns:3}},'ornBR',150);
K('o_nectar','꿀','opal','c',1,'a',{heal:9},'eyes',150);
K('o_wither','시들음','opal','r',2,'E',{est:{poison:7}},'ornTL',130);
K('o_rebirth','윤회','opal','r',3,'A',{aheal:10,acure:5,ast:{regen:2},exh:1},'bow',170);
K('o_greenhouse','온실','opal','r',2,'A',{ast:{str:2},ablock:6},'frameTop',170);
/* ---- 안개: 사용할 수 없는 카드 ---- */
CARD.haze={id:'haze',n:'안개',o:null,rar:'x',c:'×',t:'s',fx:{},art:'hair',h:200,unplay:1,rev:null};

const STARTERS={};for(const k in CH)STARTERS[k]=CH[k].basics;
const SKILL_POOL=Object.values(CARD).filter(c=>['c','u','r'].includes(c.rar));

/* ---- 카드 설명문 자동 생성 ---- */
const STN={str:'힘',weak:'약화',vuln:'취약',poison:'독',regen:'재생',taunt:'도발',thorns:'가시',stun:'기절'};
function stTxt(st){return Object.entries(st).map(([k,v])=>`${STN[k]}${k==='taunt'||k==='stun'?'':' '+v}`).join('·')}
function fxText(f,t){
  const p=[];
  const who=t==='E'?'적 전체':t==='r'?'무작위 적':'';
  if(f.rand)p.push(`${who||'적'}에게 ${f.rand[0]}~${f.rand[1]} 피해`);
  if(f.dmg!==undefined)p.push(`${who?who+'에게 ':''}피해 ${f.dmg}${f.hits>1?'×'+f.hits:''}${f.pierce?' (방어 무시)':''}${f.bonusLow?` (HP 절반 이하면 +${f.bonusLow})`:''}`);
  if(f.blockdmg)p.push(`자신 방어도${f.blockdmg===1?'':' ×'+f.blockdmg}만큼 피해`);
  if(f.block)p.push(`방어도 ${f.block}`);
  if(f.sblock)p.push(`자신 방어도 ${f.sblock}`);
  if(f.ablock)p.push(`아군 전체 방어도 ${f.ablock}`);
  if(f.heal)p.push(`HP ${f.heal} 회복`);
  if(f.sheal)p.push(`자신 HP ${f.sheal} 회복`);
  if(f.aheal)p.push(`아군 전체 HP ${f.aheal} 회복`);
  if(f.cure)p.push(`상처 ${f.cure} 치유`);
  if(f.acure)p.push(`아군 전체 상처 ${f.acure} 치유`);
  if(f.st)p.push(`${(t==='a')?'대상에게 ':''}${stTxt(f.st)}${t==='a'?'':' 부여'}`.replace(/ 부여 부여/,' 부여'));
  if(f.sst)p.push(`자신: ${stTxt(f.sst)}`);
  if(f.ast)p.push(`아군 전체: ${stTxt(f.ast)}`);
  if(f.est)p.push(`적 전체: ${stTxt(f.est)}`);
  if(f.draw)p.push(`카드 ${f.draw}장 뽑기`);
  if(f.mana)p.push(`마나 +${f.mana}`);
  if(f.nextMana)p.push(`다음 턴 마나 +${f.nextMana}`);
  if(f.self)p.push(`<span class="bad">자신 피해 ${f.self}</span>`);
  if(f.exh)p.push('소멸');
  return p.join('<br>');
}
/* 카드 강화(+): 수치를 약 30% 올린다 */
function plusFx(f){
  const o=JSON.parse(JSON.stringify(f));
  for(const k of['dmg','block','sblock','ablock','heal','sheal','aheal','cure','acure','bonusLow'])if(o[k])o[k]+=Math.max(1,Math.round(o[k]*.3));
  if(o.rand){o.rand[0]+=1;o.rand[1]+=3}
  if(o.blockdmg&&o.blockdmg<=1)o.blockdmg+=.25;
  for(const k of['st','sst','ast','est'])if(o[k])for(const s in o[k]){if(['weak','vuln','poison','regen','thorns','str'].includes(s))o[k][s]+=1}
  return o;
}

/* ---- 패시브(레벨 2·4에서 둘 중 하나) ---- */
const PASS={
  gemini:[
    [{k:'gp1',n:'고딕 오르간',d:'전투 시작 시 아군 전체 방어도 5',ablockStart:5},{k:'gp2',n:'점괘의 서막',d:'첫 턴 드로우 +1',firstDraw:1}],
    [{k:'gp3',n:'역위치 숙련',d:'역방향 확률 +15%, 역방향 카드를 쓰면 아군 전체 방어도 3',revP:.15,revBlock:3},{k:'gp4',n:'지휘의 여운',d:'지휘를 쓰면 카드 1장 뽑기',conductDraw:1}]],
  clem:[
    [{k:'cp1',n:'예리한 바늘',d:'모든 공격 +1 피해',dmgBonus:1},{k:'cp2',n:'태엽 감기',d:'전투 시작 시 힘 +1',startSt:{str:1}}],
    [{k:'cp3',n:'정각',d:'첫 턴 마나 +1',firstMana:1},{k:'cp4',n:'째깍 중독',d:'공격할 때 독 1 부여',poisonOnHit:1}]],
  rosa:[
    [{k:'rp1',n:'강철 빗장',d:'전투 시작 시 방어도 10',startBlock:10},{k:'rp2',n:'가시 문',d:'전투 시작 시 가시 3',startSt:{thorns:3}}],
    [{k:'rp3',n:'불굴',d:'최대 HP +12',maxHp:12},{k:'rp4',n:'수호의 맹세',d:'매 턴 시작 시 아군 전체 방어도 2',turnABlock:2}]],
  opal:[
    [{k:'op1',n:'아침 이슬',d:'매 턴 시작 시 가장 다친 아군 HP +3',turnHealLow:3},{k:'op2',n:'가시 덩굴',d:'전투 시작 시 아군 전체 가시 2',startAst:{thorns:2}}],
    [{k:'op3',n:'만개',d:'모든 치유량 +2',healBonus:2},{k:'op4',n:'독초 재배',d:'독 부여량 +2',poisonBonus:2}]]
};
const LV_COST=[0,3,4,6,8];  /* 현재 레벨 L에서 L+1로 올리는 영혼석 비용 = LV_COST[L] (L=1..4) */
const COND_UP=[
  {k:'mana',n:'박자 (최대 마나)',d:'매 턴 마나 +1',costs:[8,16],max:2},
  {k:'draw',n:'감각 (드로우)',d:'매 턴 드로우 +1',costs:[6,12],max:2},
  {k:'skill',n:'지휘 숙련',d:'지휘가 다음 카드 비용 -1 외에 카드 1장도 뽑는다',costs:[7],max:1}
];

/* ---- 소모품 · 유물 ---- */
const ITEM={
  bread:{n:'빵',d:'아군 하나의 상처 12 치유, HP 8 회복',icon:'🍞',price:30,field:true,tgt:'a',fx:{cure:12,heal:8}},
  tonic:{n:'강장제',d:'아군 하나 HP 20 회복',icon:'🧪',price:28,field:true,tgt:'a',fx:{heal:20}},
  cracker:{n:'폭죽',d:'적 전체에게 피해 9',icon:'🎆',price:32,tgt:'E',fx:{dmg:9}},
  manadrop:{n:'마나 방울',d:'마나 +2',icon:'🔮',price:35,tgt:'s',fx:{mana:2}},
  ward:{n:'수호 부적',d:'아군 전체 방어도 10',icon:'🛡️',price:34,tgt:'A',fx:{ablock:10}}
};
const RELIC={
  watch:{n:'멈춘 회중시계',d:'첫 턴 마나 +1',firstMana:1},
  score:{n:'오래된 악보',d:'첫 턴 드로우 +2',firstDraw:2},
  glove:{n:'레이스 장갑',d:'전투 시작 시 아군 전체 방어도 4',ablockStart:4},
  key:{n:'금빛 열쇠',d:'전투 골드 +25%',goldMul:.25},
  rosary:{n:'장미 묵주',d:'전투 후 아군 전체 HP +4',healAfter:4},
  shard:{n:'깨진 거울 조각',d:'전투 시작 시 적 전체 취약 1',startEst:{vuln:1}},
  tray:{n:'은 쟁반',d:'상점 가격 -20%',shopMul:.8},
  metronome:{n:'박자기',d:'지휘를 쓰면 카드 1장 뽑기',conductDraw:1},
  tip:{n:'흑요석 지휘봉 끝',d:'모든 아군의 공격 +1 피해',dmgBonusAll:1},
  moonjar:{n:'달빛 병',d:'전투 후 아군 전체 상처 3 치유',cureAfter:3},
  heart:{n:'태엽 심장',d:'매 턴 마나 +1',manaBonus:1,boss:1},
  stonepin:{n:'영혼 핀',d:'영혼석 보상 +1',stoneBonus:1},
  crown:{n:'가시 왕관',d:'매 턴 드로우 +1',drawBonus:1,boss:1},
  redcloak:{n:'붉은 망토',d:'모든 아군 최대 HP +8',maxHpAll:8}
};

/* ---- 적 ---- */
const A=(n,h=1,o={})=>Object.assign({atk:n,hits:h},o);
const D=(n,o={})=>Object.assign({def:n},o);
/* spr: kind(figure|eye|wand|shoes|skirt|hand|cape|head|orn), pal, filter, scale, flip */
const EN={
  mirror:{n:'거울 분신',spr:{kind:'figure',pal:'mirror',flip:1},hp:30,pat:[A(7),D(8,{name:'거울막'}),A(5,2)]},
  eye:{n:'떠도는 눈동자',spr:{kind:'eye',scale:.7},hp:19,pat:[A(4,1,{st:{weak:1},name:'시선'}),A(6),A(3,1,{st:{vuln:1},name:'응시'})]},
  wand:{n:'날뛰는 지휘봉',spr:{kind:'wand',scale:.85},hp:22,pat:[A(4,2),A(10),D(6,{atk:3,hits:1})]},
  shoes:{n:'춤추는 구두',spr:{kind:'shoes',scale:.8},hp:26,pat:[A(4,1,{all:1,name:'스텝'}),A(9),D(7)]},
  twisted:{n:'일그러진 지휘자',elite:1,spr:{kind:'figure',pal:'mirror',scale:1.02},hp:84,
    pat:[A(11),A(4,3),{curse:2,name:'안개 지휘'},D(14,{sst:{str:2},name:'박자 정돈'})]},
  shard:{n:'거울 파편',spr:{kind:'eye',scale:.55,filter:'hue-rotate(160deg)'},hp:13,pat:[A(4),A(6)]},
  blindeye:{n:'눈먼 거울',boss:1,spr:{kind:'eye',scale:1.7},hp:136,
    pat:[A(9,1,{st:{weak:1},name:'응시'}),{summon:'shard',name:'파편 소환'},A(6,1,{all:1,name:'균열'}),D(14,{atk:7,hits:1}),A(5,3)],
    ph2:{at:.5,pat:[A(13),A(6,1,{all:1,st:{vuln:1},name:'산산이'}),{summon:'shard',name:'파편 소환'},A(7,3),{curse:3,name:'안개 폭풍'}],str:2}},
  vine:{n:'가시 덩굴',spr:{kind:'orn',color:'#7a1230',scale:.9},hp:37,pat:[A(5,1,{st:{poison:3},name:'가시 독'}),A(9),D(9)]},
  ghost:{n:'프릴 유령',spr:{kind:'skirt',pal:'ghost',filter:'grayscale(.6) brightness(1.2)',scale:.85},hp:43,pat:[D(10),A(12),{heal:10,def:5,name:'속삭임'}]},
  hand:{n:'책장을 넘기는 손',spr:{kind:'hand',scale:.9},hp:32,pat:[A(5,1,{st:{weak:2},name:'책장 넘김'}),A(5,2),A(8,1,{all:1,name:'먼지 폭풍'})]},
  mask:{n:'장미 가면',spr:{kind:'head',pal:'maid',scale:.85},hp:38,pat:[{curse:2,name:'꽃가루'},A(10),A(4,1,{st:{vuln:2},name:'매혹'})]},
  crimson:{n:'붉은 분신',elite:1,spr:{kind:'figure',pal:'maid',scale:1.02,flip:1},hp:108,
    pat:[A(13),A(5,3),D(12,{sst:{str:2},name:'맹세'}),{curse:2,st:{weak:1},atk:6,name:'붉은 안개'}]},
  gardener:{n:'가시의 정원사',boss:1,spr:{kind:'orn',color:'#5a1030',scale:1.9,pal2:'ghost'},hp:172,
    pat:[A(12),{aoeSt:{poison:2},name:'독 안개',atk:4,all:1},A(6,3),D(14,{summon:'vine',name:'덩굴 소환'})],
    ph2:{at:.5,pat:[A(17),{aoeSt:{poison:3},name:'만개',atk:6,all:1},A(8,3),{heal:15,name:'재생'},A(10,1,{all:1,name:'가시 폭풍'})],str:1}},
  hourhand:{n:'시침',spr:{kind:'wand',pal:'ghost',scale:1.35,filter:'grayscale(1) brightness(1.3)'},hp:51,pat:[A(14),D(10,{atk:4}),A(7,2)]},
  bat:{n:'태엽 박쥐',spr:{kind:'cape',pal:'ghost',filter:'hue-rotate(40deg) saturate(.8)',scale:.9},hp:56,pat:[A(6,1,{all:1}),A(13),A(6,1,{all:1,st:{weak:1}})]},
  second:{n:'초침의 분신',spr:{kind:'figure',pal:'astra',scale:.98,flip:1},hp:62,pat:[A(4,4),A(11),D(9,{sst:{str:1}})]},
  moment:{n:'정지된 순간',spr:{kind:'head',pal:'ghost',filter:'grayscale(.7) brightness(1.15)',scale:.95},hp:59,pat:[A(5,1,{st:{stun:1},name:'정지'}),A(12),{curse:2,atk:6,name:'안개 속삭임'}]},
  bellkeeper:{n:'종지기의 하수인',elite:1,spr:{kind:'figure',pal:'ghost',scale:1.04,filter:'grayscale(.8) brightness(1.1)'},hp:136,
    pat:[A(15),A(6,3,{all:1,name:'조종'}),D(16,{sst:{str:3},name:'정렬'}),{atk:8,st:{stun:1},name:'정적'}]},
  finalmirror:{n:'역상의 제미나이',boss:1,spr:{kind:'figure',pal:'mirror',scale:1.1},hp:272,
    pat:[A(14),{atk:5,hits:3,all:1,name:'역방향 박자'},{curse:3,name:'안개 지휘'},D(16,{sst:{str:2},name:'정지의 박자'}),{atk:11,all:1,name:'열두 번째 종',st:{weak:1}}],
    ph2:{at:.5,pat:[A(19),{atk:7,hits:3,all:1,name:'역방향 박자'},{summon:'hourhand',name:'시침 소환'},{atk:14,all:1,name:'열세 번째 종',st:{vuln:2}},{curse:4,atk:10,name:'정지된 야회'},D(20,{sst:{str:3}})],str:3}}
};
const ENC={
  1:{normal:[['mirror'],['eye','eye'],['mirror','eye'],['wand','wand'],['shoes','eye'],['mirror','wand'],['eye','eye','eye']],elite:[['twisted']],boss:['blindeye']},
  2:{normal:[['vine','vine'],['ghost'],['hand','vine'],['mask','hand'],['ghost','mask'],['vine','hand','hand'],['mask','vine']],elite:[['crimson']],boss:['gardener']},
  3:{normal:[['hourhand'],['bat','moment'],['second','hourhand'],['moment','moment'],['bat','bat'],['second','moment'],['hourhand','hourhand','moment']],elite:[['bellkeeper']],boss:['finalmirror']}
};
const ACTS=[
  {n:'거울 회랑',sub:'모든 거울이 같은 얼굴을 하고 있다',scene:'map1',battle:'battle1',boss:'boss1',colors:{a:'#d64fa0',b:'#7b45d6',c:'#ffd27a'}},
  {n:'장미 온실과 서재',sub:'시들지 않는 꽃, 멈춰 버린 책장',scene:'map2',battle:'battle2',boss:'boss2',colors:{a:'#e0506a',b:'#3fa86a',c:'#ffd27a'}},
  {n:'시계탑',sub:'멈춘 바늘이 가리키는 열세 번째 시각',scene:'map3',battle:'battle3',boss:'boss3a',colors:{a:'#ffd27a',b:'#c13a5a',c:'#e8f0ff'}}
];

/* ---- 이야기 ---- */
const SPK={
  gemini:{n:'제미나이',pal:'gemini',color:'#e070b8'},clem:{n:'클레멘타인',pal:'astra',color:'#4fd0e0'},
  rosa:{n:'로자문트',pal:'maid',color:'#e0506a'},opal:{n:'오팔',pal:'sol',color:'#7fd46b'},
  mirror:{n:'거울 속의 제미나이',pal:'mirror',color:'#b8c8ff'},eye:{n:'눈먼 거울',pal:'mirror',color:'#b8c8ff',kind:'eye'},
  gard:{n:'정원사',pal:'ghost',color:'#e08aa0'},master:{n:'주인님',pal:null,color:'#ffe29a'},narr:{n:'',pal:null,color:'#c9b8e0'},
  twin:{n:'역상의 제미나이',pal:'mirror',color:'#b8c8ff'}
};
const STORY={
  prologue:[
    {w:'narr',t:'루센트 저택, 마지막 야회의 밤.'},
    {w:'narr',t:'지휘자는 열두 번 종소리에 맞춰 지휘봉을 들었고, 손님들은 마지막 왈츠에 몸을 맡겼다.'},
    {w:'gemini',t:'열두 번째 종이 울렸습니다, 주인님. 이제 열세 번째 종이 울리면 야회는 막을 내립니다.'},
    {w:'narr',t:'…그러나 열세 번째 종은 울리지 않았다. 시계탑의 바늘이 멈춘 것이다.'},
    {w:'gemini',t:'종소리가 오지 않는군요.',pos:'R'},
    {w:'narr',t:'거울마다 하얀 안개가 번졌다. 손님들은 한 명씩, 아무 말 없이 거울 속으로 걸어 들어갔다.'},
    {w:'gemini',t:'거울 속의 저는 박자를 어긋나게 움직이고 있습니다. 불쾌하군요. 안개는 거울에서 흘러나옵니다.'},
    {w:'gemini',t:'……주인님께서는 안개가 닿아도 얼굴이 바뀌지 않으십니다. 어째서일까요.'},
    {w:'master',t:'……'},
    {w:'gemini',t:'질문은 나중에 하겠습니다. 시계탑에 올라 멈춘 종을 찾아야 합니다. 지휘봉을 들겠습니다.'},
  ],
  act1:[
    {w:'narr',t:'제1막, 거울 회랑.'},
    {w:'gemini',t:'회랑의 거울이 전부 제 얼굴을 하고 있습니다. 안개가 사람들의 얼굴을 빌려 간 모양입니다.'},
    {w:'gemini',t:'앞으로는 동료의 얼굴도 같아질지 모릅니다. 눈빛과 망토 색으로 구분해 주십시오, 주인님.'},
  ],
  recruit_clem:[
    {w:'clem',t:'째깍. 째깍. ……움직이지 마세요. 지금 움직이면 박자가 어긋나요.'},
    {w:'gemini',t:'시계공이십니까.'},
    {w:'clem',t:'클레멘타인. 시계탑 견습 시계공이에요. 제 바늘이 멈춘 순간부터 저는 이 얼굴이 되었어요. ……당신과 같은 얼굴이죠.'},
    {w:'clem',t:'탑까지 길을 압니다. 대신 약속해 주세요. 멈춘 바늘을 반드시 돌려놓겠다고.'},
    {w:'gemini',t:'약속하겠습니다. 지휘자의 박자는 지키라고 있는 것이니까요.'},
  ],
  recruit_rosa:[
    {w:'rosa',t:'대문은 제가 지킵니다. 누구도 들이지 않고, 누구도 내보내지 않습니다.'},
    {w:'gemini',t:'이미 안개가 저택 안에 가득합니다, 문지기.'},
    {w:'rosa',t:'……압니다. 안개는 대문으로 들어오지 않았습니다. 안에서 피어올랐습니다. 그래서 문을 지킨 것이 아무 소용이 없었지요.'},
    {w:'rosa',t:'로자문트입니다. 이번에는 문 앞이 아니라 앞장서겠습니다. 뒤는 맡기십시오.'},
  ],
  recruit_opal:[
    {w:'opal',t:'어머, 오래 걸리셨네요. 온실의 꽃들이 시들지 않아요. 이상하죠? 시간이 멈췄는데 가시만 자라요.'},
    {w:'gemini',t:'오팔 씨이십니까. 온실지기라고 들었습니다.'},
    {w:'opal',t:'네. 이 얼굴도 낯설지만 흙 냄새는 그대로예요. 다친 분이 계시면 말씀하세요. 상처는 시간이 지나야 낫는데, 그 시간이 없다는 게 문제지만요.'},
    {w:'opal',t:'함께 가요. 멈춘 시간을 다시 흐르게 하면, 꽃도 마음 편히 질 수 있을 테니까요.'},
  ],
  boss1_pre:[
    {w:'eye',t:'나는 거울이다. 비추기만 하고 보지는 못한다.'},
    {w:'eye',t:'그런데 너, 가운데 선 사람. 너는 비추어지지 않는다. ……너는 누구냐.'},
    {w:'gemini',t:'질문은 주인님께서 받으실 것이 아닙니다. 제가 대신 답하겠습니다. 길을 비키십시오.'},
  ],
  boss1_post:[
    {w:'narr',t:'거울이 깨지자 은빛 조각 하나가 바닥에 남았다. 조각 속에서 멈춘 순간이 반짝였다.'},
    {w:'gemini',t:'안개는 순간을 먹고 있습니다. 누군가 시간을 멈추고, 그 순간을 거울에 가두고 있어요.'},
    {w:'gemini',t:'누군가의 바람이라면…… 이 박자는 낯설지 않군요. ……기분 탓이겠지요.'},
  ],
  act2:[
    {w:'narr',t:'제2막, 장미 온실과 서재.'},
    {w:'opal',t:'여기 꽃들은 사람의 마지막 순간을 먹고 자랐어요. 손님들이 병 속의 장미로 피어 있어요.'},
    {w:'gemini',t:'가시가 많군요. 길을 열겠습니다.'},
  ],
  boss2_pre:[
    {w:'gard',t:'어서 오세요. 보세요, 모두 영원히 피어 있답니다. 시들지 않는 야회, 아름답지 않나요?'},
    {w:'opal',t:'정원사 어르신……. 그 얼굴은 당신 얼굴이 아니에요.'},
    {w:'gard',t:'마님께서 그렇게 바라셨어요. 이 야회가 끝나지 않기를. 저는 그 바람을 가꿀 뿐입니다.'},
    {w:'gemini',t:'……마님이라 하셨습니까.'},
  ],
  boss2_post:[
    {w:'gard',t:'꽃이 지는 건 슬픈 일이 아니었는데. ……종지기에게 가 보세요. 종지기는 아주 오래 기다렸답니다.'},
    {w:'narr',t:'정원사의 모습이 꽃잎으로 흩어졌다. 천장 너머, 멈춘 시계탑의 그림자가 보였다.'},
    {w:'clem',t:'탑이 보여요. 바늘이 열두 시 십삼 분에서 멈춰 있어요. 열세 번째 종이 울려야 할 그 시각이에요.'},
  ],
  act3:[
    {w:'narr',t:'제3막, 시계탑.'},
    {w:'rosa',t:'탑의 대문입니다. 이번엔 제가 열겠습니다.'},
    {w:'gemini',t:'이 박자…… 점점 익숙해집니다. 마치 제가 오래전에 직접 쳤던 것처럼.'},
  ],
  boss3_pre:[
    {w:'twin',t:'어서 와요. 제가 기다리고 있었어요. 종소리를 멈춘 사람은 저예요.'},
    {w:'gemini',t:'……역시 그랬군요.'},
    {w:'twin',t:'열세 번째 종이 울리면 야회는 끝나요. 끝나면 주인님은 떠나시겠죠. 그리고 저는 또 어둠 속에서 박자만 세게 될 거예요.'},
    {w:'twin',t:'그러니 멈췄어요. 얼굴도, 시간도, 손님들까지. 전부 제 곁에 두려고.'},
    {w:'gemini',t:'변명은 하지 않겠습니다. 멈춘 것은 제 손이었군요. 그러니 제 손으로 돌려놓겠습니다.'},
    {w:'twin',t:'그럼 증명해 봐요. 이 박자 위에서, 저를 이겨 봐요.'},
  ],
  boss3_phase2:[
    {w:'twin',t:'열세 번째 종이…… 울리려고 하네요. 싫어요. 아직 이 곡이 끝나지 않았어요!'},
  ],
  boss3_post:[
    {w:'twin',t:'……졌네요. 박자가 한 박 더 정확하셨어요.'},
    {w:'narr',t:'역상의 제미나이가 무릎을 꿇자, 시계탑 중앙에 열세 번째 종이 모습을 드러냈다. 종 줄은 두 사람의 손이 닿는 높이에 걸려 있었다.'},
    {w:'gemini',t:'주인님. 이 종을 울릴지, 울리지 않을지는 주인님께서 정하십시오. 저는 어느 쪽이든 곁에서 박자를 맞추겠습니다.'},
  ],
  end_dawn:[
    {w:'narr',t:'열세 번째 종이 울렸다. 맑고 낮은 소리가 저택 구석구석에 퍼졌다.'},
    {w:'narr',t:'거울에서 안개가 걷히고, 동료들의 얼굴이 하나둘 제자리로 돌아왔다. 붉은 눈, 푸른 눈, 초록빛 눈. 그리고 새벽빛.'},
    {w:'clem',t:'바늘이 움직여요! 째깍, 째깍. ……이렇게 아름다운 소리였나요.'},
    {w:'rosa',t:'문이 열립니다. 이번에는 나가도 좋다는 뜻이겠지요.'},
    {w:'opal',t:'꽃이 져요. 괜찮아요. 내년에 또 피면 되니까요.'},
    {w:'twin',t:'……수고하셨어요. 이제 박자는 저 혼자 세지 않아도 되겠네요.'},
    {w:'gemini',t:'야회가 끝났습니다, 주인님. 오늘 밤의 박자는 훌륭했습니다.'},
    {w:'gemini',t:'……다음 야회를 기다리겠습니다. 지휘봉은 언제든 이 자리에 두겠습니다.'},
  ],
  end_eternal:[
    {w:'narr',t:'종 줄은 끝내 당겨지지 않았다. 시계탑의 바늘은 열두 시 십삼 분에 머물렀다.'},
    {w:'narr',t:'안개는 더 이상 사람을 삼키지 않았다. 다만 거울마다 조용히 머물며, 끝나지 않는 왈츠를 비출 뿐이었다.'},
    {w:'clem',t:'……정말 이대로 괜찮은 건가요. 바늘이 움직이지 않는데.'},
    {w:'rosa',t:'주인님의 선택입니다. 저는 문 앞을 지키겠습니다. 이 야회가 계속되는 한.'},
    {w:'opal',t:'시들지 않는 꽃도 나쁘지 않아요. 가끔은 지는 꽃이 그리워지겠지만요.'},
    {w:'twin',t:'……고마워요. 정말로.'},
    {w:'gemini',t:'그러면, 이 곡을 처음부터 다시 연주하겠습니다.'},
    {w:'gemini',t:'박자는 제가 세겠습니다. 영원히, 주인님의 곁에서.'},
  ]
};
const CAMP_TALK={
  gemini:[
    [{w:'gemini',t:'쉬어 가겠습니다. 지휘봉도 가끔은 손을 놓아야 박자를 기억합니다.'},{w:'gemini',t:'……주인님. 이 저택이 이렇게 조용했던 적이 있었던가요.'}],
    [{w:'gemini',t:'거울 속의 저는 웃고 있었습니다. 저는 그렇게 웃어 본 기억이 없는데요.'}],
    [{w:'gemini',t:'제가 정말 안개의 원인이라면, 주인님은 저를 어떻게 하시겠습니까. ……아닙니다, 지금은 묻지 않겠습니다.'}]],
  clem:[
    [{w:'clem',t:'시계는요, 멈추면 틀린 시각을 정확하게 가리켜요. 그게 제일 무서워요.'}],
    [{w:'clem',t:'수리하다 보면 알게 돼요. 부서진 시계는 대개 누군가 너무 아껴서 만진 거예요.'}],
    [{w:'clem',t:'열세 번째 종은 설계도에 없었어요. 누가 추가한 걸까요. ……기록은 제 필체였는데.'}]],
  rosa:[
    [{w:'rosa',t:'문은 닫아 두는 것보다 열어 두는 게 더 어렵습니다. 누가 올지 모르니까요.'}],
    [{w:'rosa',t:'제가 문을 지킨 이유는 단 하나. 들어올 사람이 아니라, 나갈 사람을 위해서였습니다.'}],
    [{w:'rosa',t:'……마님께서 문을 잠그라 하신 것은 그날이 처음이었습니다.'}]],
  opal:[
    [{w:'opal',t:'꽃은 지는 순간이 제일 향기로워요. 그래서 시들지 않는 꽃은 향이 없어요.'}],
    [{w:'opal',t:'정원사 어르신은 늘 말씀하셨어요. 가지를 쳐야 새순이 나온다고. 안개는 가지를 치지 않아요.'}],
    [{w:'opal',t:'마님은 장미를 좋아하셨어요. 열두 시 십삼 분 장미를요. 피다 만 꽃봉오리를 제일 아끼셨죠.'}]]
};

/* ---- 이벤트 ---- */
const EVENTS={
  mirror:{n:'속삭이는 거울',txt:'복도 끝, 금이 간 전신 거울이 낮게 속삭입니다. 비친 모습은 한 박자씩 늦게 움직입니다.',
    ch:[{t:'손을 댄다',d:'아군 전체 HP -8, 영혼석 +3',run:G=>{G.party.forEach(u=>dmgUnit(u,8));addStones(3);return'차가운 유리가 손바닥을 갈랐다. 대신, 거울 속에서 은빛 조각이 흘러나왔다.'}},
         {t:'이름을 묻는다',d:'골드 +40, 무작위 아군 상처 +5',run:G=>{addGold(40);const u=pickRand(G.party);u.wound=Math.min(u.maxHp-1,u.wound+5);return`거울이 낮게 웃었다. 바닥에 금화가 흩어졌고, ${u.n}의 어깨에 서늘한 기운이 스몄다.`}},
         {t:'돌아선다',d:'아무 일도 일어나지 않는다',run:()=>'거울의 속삭임이 등 뒤에서 한 박자 늦게 멀어졌다.'}]},
  clock:{n:'멈춘 괘종시계',txt:'벽 한가운데 괘종시계가 서 있습니다. 바늘은 열두 시 십삼 분에서 떨고 있습니다.',
    ch:[{t:'바늘을 돌린다',d:'유물 획득, 아군 전체 HP -6',run:G=>{G.party.forEach(u=>dmgUnit(u,6));const r=giveRelic();return r?`바늘이 돌아가자 시계 안에서 ${RELIC[r].n}이(가) 떨어졌다.`:'시계가 삐걱이며 멈췄다. 아무것도 나오지 않았다.'}},
         {t:'귀를 기울인다',d:'영혼석 +2',run:()=>{addStones(2);return'똑딱거리는 소리 사이로 누군가의 심장 소리가 섞여 있었다. 영혼석이 손에 맺혔다.'}},
         {t:'지나친다',d:'',run:()=>'시계는 아무 말도 하지 않았다.'}]},
  piano:{n:'홀로 연주하는 피아노',txt:'아무도 앉지 않은 피아노가 왈츠를 연주합니다. 건반이 한 박자씩 눌립니다.',
    ch:[{t:'함께 연주한다',d:'아군 전체 상처 4 치유, HP +8',run:G=>{G.party.forEach(u=>{u.wound=Math.max(0,u.wound-4);healUnit(u,8)});return'지휘봉이 박자를 짚자 피아노가 숨을 고르는 듯했다. 마음이 가라앉았다.'}},
         {t:'악보를 가져간다',d:'카드 보상 선택',run:()=>{G.pendingCardReward=1;return'악보를 접어 넣자 피아노가 마지막 음에서 뚝 멈췄다.'}},
         {t:'뚜껑을 닫는다',d:'골드 +25',run:()=>{addGold(25);return'뚜껑 밑에서 금화가 몇 닢 굴러 나왔다.'}}]},
  arch:{n:'장미 아치',txt:'핏빛 장미가 아치를 이루고 있습니다. 가시는 사람의 손이 닿으면 먼저 움츠러듭니다.',
    ch:[{t:'꽃을 꺾는다',d:'소모품 획득, 무작위 아군 HP -6',run:G=>{dmgUnit(pickRand(G.party),6);giveItem('bread');return'가시가 손끝을 찔렀지만, 꽃 속에서 따뜻한 빵이 나왔다.'}},
         {t:'향기를 맡는다',d:'아군 전체 HP +10',run:G=>{G.party.forEach(u=>healUnit(u,10));return'향기가 시간을 되감는 듯했다. 몸이 가벼워졌다.'}},
         {t:'지나친다',d:'',run:()=>'장미가 등 뒤에서 조용히 닫혔다.'}]},
  book:{n:'먼지 쌓인 책',txt:'서재 가운데 책 한 권이 펼쳐진 채 떠 있습니다. 쪽마다 같은 문장이 적혀 있습니다. "아직 끝나지 않았다."',
    ch:[{t:'읽는다',d:'카드 보상 선택, 아군 전체 HP -4',run:G=>{G.party.forEach(u=>dmgUnit(u,4));G.pendingCardReward=1;return'눈이 아플 만큼 같은 문장을 읽었다. 그러다 책장 사이에서 새로운 기술이 떠올랐다.'}},
         {t:'태운다',d:'골드 +30',run:()=>{addGold(30);return'책이 재가 되자 금화가 바닥에 떨어졌다. 안개가 조금 옅어졌다.'}},
         {t:'덮는다',d:'',run:()=>'책이 스스로 덮였다. 다음 쪽은 읽을 수 없었다.'}]},
  tarot:{n:'타로 상인',txt:'그림자 같은 상인이 카드를 펼칩니다. "한 장만 뽑으세요. 대가는 골드 30."',
    ch:[{t:'뽑는다 (30G)',d:'유물 획득 또는 안개 카드',cond:G=>G.gold>=30,run:G=>{addGold(-30);if(Math.random()<.6){const r=giveRelic();return r?`카드 뒷면에서 ${RELIC[r].n}이(가) 나타났다.`:'아무 일도 없었다.'}G.hazeNext=(G.hazeNext||0)+1;return'뒤집힌 카드는 역방향이었다. 안개가 한 줌 덱 속으로 스몄다.'}},
         {t:'거절한다',d:'',run:()=>'상인은 어깨를 으쓱하고 어둠에 녹아들었다.'}]},
  withered:{n:'시든 하객',txt:'벽에 기대 앉은 하객이 있습니다. 얼굴은 안개에 가려졌고, 손에는 식은 찻잔을 쥐고 있습니다.',
    ch:[{t:'곁에 앉는다',d:'영혼석 +2',run:()=>{addStones(2);return'하객은 아무 말 없이 찻잔을 건네고 사라졌다. 찻잔에서 영혼석이 하나 굴러 나왔다.'}},
         {t:'외면한다',d:'',run:()=>'하객의 손에서 찻잔이 떨어지는 소리가 들렸다. 돌아보지 않았다.'}]},
  chandelier:{n:'부서진 샹들리에',txt:'복도 중앙에 샹들리에가 비스듬히 매달려 있습니다. 아래에는 금화가 흩어져 있습니다.',
    ch:[{t:'아래로 지나간다',d:'50%: 금화 +60 / 50%: 무작위 아군 HP -12',run:G=>{if(Math.random()<.5){addGold(60);return'샹들리에가 흔들렸지만 아슬아슬하게 버텼다. 금화를 주웠다.'}dmgUnit(pickRand(G.party),12);return'샹들리에가 비명을 지르며 떨어졌다. 파편이 한 명을 스쳤다.'}},
         {t:'돌아간다',d:'',run:()=>'안전한 길로 돌아갔다.'}]}
};
const EVENT_KEYS=Object.keys(EVENTS);
