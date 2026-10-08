/* ================= 시작 ================= */
const IMG_B64="__IMG__";
const CHAR_B64={belis:"__CH_belis__",obser:"__CH_obser__",sol:"__CH_sol__",claire:"__CH_claire__"};
async function loadImg(b64){const bin=atob(b64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);const url=URL.createObjectURL(new Blob([u8],{type:'image/webp'}));const img=new Image();img.src=url;await img.decode();return{img,url}}
let userStarted=false;
async function boot(){
  const base=await loadImg(IMG_B64);
  document.documentElement.style.setProperty('--img',`url(${base.url})`);
  const chs={};for(const k in CHAR_B64)chs[k]=(await loadImg(CHAR_B64[k])).img;
  buildSprites(base.img);buildChars(chs);buildVariants();
  await buildHeroes();
  initStars();resize();requestAnimationFrame(loop);
  $('#loading').style.display='none';
  bindEvents();
}
async function buildHeroes(){
  const box=$('#heroes');if(!box)return;box.innerHTML='';
  const cfg=[['belis',{left:'24%',h:'92%',z:1,flip:0}],['obser',{left:'-2%',h:'72%',z:2,flip:0}],['claire',{right:'-2%',h:'74%',z:2,flip:1}],['sol',{left:'35%',h:'50%',z:3,flip:0}]];
  for(const [k,c] of cfg){
    const im=new Image();im.src=await toURL(CH_SPR[k]);im.className='hp hp-'+k;
    im.style.cssText=`height:${c.h};z-index:${c.z};${c.left?'left:'+c.left:'right:'+c.right};${c.flip?'transform:scaleX(-1)':''}`;
    box.appendChild(im);
  }
}
function firstGesture(){
  if(userStarted)return;userStarted=true;
  Mus.init();Mus.resume();
  if($('#s-title').classList.contains('on'))Mus.play('title');
}
function bindEvents(){
  document.addEventListener('pointerdown',firstGesture,{once:false});
  $('#btnStart').addEventListener('click',()=>{firstGesture();Mus.sfx('open');beginFlow()});
  $('#btnAgain').addEventListener('click',()=>{Mus.sfx('ui');G=null;B=null;show('s-title');Mus.play('title')});
  $('#btnMute').addEventListener('click',e=>{Mus.setMuted(!Mus.muted);e.currentTarget.textContent=Mus.muted?'✕':'♪'});
  $('#btnParty').addEventListener('click',()=>{Mus.sfx('ui');openParty()});
  $('#endBtn').addEventListener('click',async()=>{Mus.sfx('ui');clearTarget();await endTurn();UI.refresh()});
  $('#conduct').addEventListener('click',async()=>{clearTarget();await conduct();UI.refresh()});
  $('#drawBtn').addEventListener('click',()=>B&&showPile('뽑을 더미 (순서 무작위)',B.draw.map(c=>({id:c.id,p:c.p,uid:c.uid}))));
  $('#discBtn').addEventListener('click',()=>B&&showPile('버린 더미',B.disc.map(c=>({id:c.id,p:c.p,uid:c.uid}))));
  $('#exhBtn').addEventListener('click',()=>B&&showPile('소멸한 카드',B.exh.map(c=>({id:c.id,p:c.p,uid:c.uid}))));
  $('#bf').addEventListener('click',e=>{if(e.target.closest('.unit'))return;clearTarget()});
  window.addEventListener('resize',resize);
  window.addEventListener('keydown',e=>{
    if($('#scene').classList.contains('on'))return;
    if(e.key==='Escape'){clearTarget();$('#overlay-pile').classList.remove('on');return}
    if(!$('#s-battle').classList.contains('on')||!B||$('#overlay-pile').classList.contains('on'))return;
    if(e.key>='1'&&e.key<='9'){const c=B.hand[+e.key-1];if(c){const node=$('#hand').querySelector(`[data-uid="${c.uid}"]`);onCardClick(c,node)}}
    else if(e.key==='Enter'||e.key===' '){e.preventDefault();$('#endBtn').click()}
    else if(e.key==='c'||e.key==='C')$('#conduct').click();
  });
}
window.__g={TR,playScene,cutscene,STORY,askChoice,get G(){return G},get B(){return B},CARD,EN,ENC,CH,RELIC,ITEM,playCard,endTurn,conduct,useItem,startBattle,startPlayerTurn,newGame,
  levelUp,takePassive,passiveChoices,addSkill,rollCardChoices,settleBattle,genMap,mkUnit,canPlay,cost,cardView,validTargets,needsTarget,aliveA,aliveE,allyOf,
  set fast(v){FAST=!!v;Mus.setFast(!!v)},get fast(){return FAST},UI,show,renderMap,enterNode,enterAct,beginFlow,startRun,battleFinished,openReward,advance,
  runBattle,openParty,showEnd,finale,runShop,runEvent,runCamp,runRecruit,setupBattleUI,SP,Mus};
boot();
