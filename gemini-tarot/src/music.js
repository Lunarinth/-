/* ================= 브금 엔진: 파이프 오르간 · 현악 · 합창 · 종 · 팀파니를 코드로 합성 ================= */
const Mus=(()=>{
  let ac=null,master,comp,musicBus,sfxBus,revIn,noiseBuf;
  let muted=false,fast=false,musVol=.62,sfxVol=.9;
  let cur=null,timer=null,sceneGain=null,sceneId=null;
  const SC={minor:[0,2,3,5,7,8,10],harm:[0,2,3,5,7,8,11],phryg:[0,1,3,5,7,8,10],dorian:[0,2,3,5,7,9,10],major:[0,2,4,5,7,9,11]};
  const mtof=n=>440*Math.pow(2,(n-69)/12);
  const deg=(sc,key,d)=>key+SC[sc][((d%7)+7)%7]+12*Math.floor(d/7);
  const rand=seed=>{let s=seed>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296}};

  function init(){
    if(ac)return true;
    try{ac=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return false}
    comp=ac.createDynamicsCompressor();comp.threshold.value=-16;comp.ratio.value=4;comp.attack.value=.01;comp.release.value=.3;
    master=ac.createGain();master.gain.value=muted?0:1;master.connect(comp);comp.connect(ac.destination);
    musicBus=ac.createGain();musicBus.gain.value=musVol;musicBus.connect(master);
    sfxBus=ac.createGain();sfxBus.gain.value=sfxVol;sfxBus.connect(master);
    /* 성당 잔향 */
    const len=ac.sampleRate*3.4,ir=ac.createBuffer(2,len,ac.sampleRate);
    for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++){const t=i/len;d[i]=(Math.random()*2-1)*Math.pow(1-t,2.6)*(1-.55*t)}}
    const cv=ac.createConvolver();cv.buffer=ir;revIn=ac.createGain();revIn.gain.value=.55;revIn.connect(cv);
    const rg=ac.createGain();rg.gain.value=.8;cv.connect(rg);rg.connect(master);
        noiseBuf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);const nd=noiseBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
    return true;
  }
  /* 파이프 오르간: 배음 합성 파형 + 서브 옥타브 */
  let organWave=null;
  function organW(){
    if(organWave)return organWave;
    const re=new Float32Array(10),im=new Float32Array(10);
    [0,1,.55,.38,.3,.18,.12,.09,.06,.04].forEach((v,i)=>im[i]=v);
    return organWave=ac.createPeriodicWave(re,im);
  }
  function env(g,t,a,d,v,rel){g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(v,t+a);g.gain.setValueAtTime(v,t+Math.max(a,d-rel));g.gain.exponentialRampToValueAtTime(.0001,t+d+.02)}
  function out(node,dest,send=.3){node.connect(dest);if(send){const s=ac.createGain();s.gain.value=send;node.connect(s);s.connect(revIn)}}
  const I={
    organ(t,f,d,v=.12,dest){
      const g=ac.createGain(),o=ac.createOscillator(),o2=ac.createOscillator(),g2=ac.createGain();
      o.setPeriodicWave(organW());o.frequency.value=f;o2.type='sine';o2.frequency.value=f/2;g2.gain.value=.55;
      env(g,t,.05,d,v,.3);o.connect(g);o2.connect(g2);g2.connect(g);
      const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=Math.min(6000,f*9);g.connect(lp);
      out(lp,dest||musicBus,.28);o.start(t);o2.start(t);o.stop(t+d+.1);o2.stop(t+d+.1);
    },
    strings(t,f,d,v=.07,att=.35,bright=1700){
      const g=ac.createGain(),lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=bright;lp.Q.value=.6;
      env(g,t,att,d,v,.5);
      for(const dt of[-9,0,9]){const o=ac.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=dt;o.connect(g);o.start(t);o.stop(t+d+.6)}
      g.connect(lp);out(lp,musicBus,.35);
    },
    stac(t,f,d,v=.06){I.strings(t,f,d,v,.012,2800)},
    pizz(t,f,v=.1){
      const g=ac.createGain(),o=ac.createOscillator(),o2=ac.createOscillator(),lp=ac.createBiquadFilter();
      o.type='triangle';o.frequency.value=f;o2.type='sawtooth';o2.frequency.value=f;lp.type='lowpass';lp.frequency.setValueAtTime(3200,t);lp.frequency.exponentialRampToValueAtTime(500,t+.3);
      g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+.34);
      const g2=ac.createGain();g2.gain.value=.4;o.connect(g);o2.connect(g2);g2.connect(g);g.connect(lp);out(lp,musicBus,.22);
      o.start(t);o2.start(t);o.stop(t+.4);o2.stop(t+.4);
    },
    choir(t,f,d,v=.06){
      const g=ac.createGain();env(g,t,.6,d,v,.7);
      for(const dt of[-12,6]){const o=ac.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=dt;
        const fs=[[780,1],[1250,.7],[2600,.25]];for(const[fr,q]of fs){const bp=ac.createBiquadFilter();bp.type='bandpass';bp.frequency.value=fr;bp.Q.value=7;const gg=ac.createGain();gg.gain.value=q*.55;o.connect(bp);bp.connect(gg);gg.connect(g)}
        o.start(t);o.stop(t+d+.9)}
      out(g,musicBus,.6);
    },
    bell(t,f,v=.07,d=2.6){
      const g=ac.createGain();g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);
      for(const[mul,amp,dec]of[[1,1,1],[2.01,.5,.7],[2.76,.35,.5],[4.2,.2,.3],[.5,.4,1.3]]){
        const o=ac.createOscillator(),gg=ac.createGain();o.type='sine';o.frequency.value=f*mul;gg.gain.setValueAtTime(amp,t);gg.gain.exponentialRampToValueAtTime(.0001,t+d*dec);o.connect(gg);gg.connect(g);o.start(t);o.stop(t+d*dec+.05)}
      out(g,musicBus,.55);
    },
    church(t,f,v=.2){I.bell(t,f,v,5.5);},
    timp(t,v=.45,f=80){
      const g=ac.createGain(),o=ac.createOscillator();o.type='sine';o.frequency.setValueAtTime(f*1.9,t);o.frequency.exponentialRampToValueAtTime(f*.6,t+.28);
      g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+.55);o.connect(g);
      const n=ac.createBufferSource(),ng=ac.createGain(),lp=ac.createBiquadFilter();n.buffer=noiseBuf;lp.type='lowpass';lp.frequency.value=700;ng.gain.setValueAtTime(v*.5,t);ng.gain.exponentialRampToValueAtTime(.0001,t+.12);n.connect(lp);lp.connect(ng);ng.connect(g);
      out(g,musicBus,.3);o.start(t);o.stop(t+.6);n.start(t);n.stop(t+.2);
    },
    snare(t,v=.15){
      const n=ac.createBufferSource(),g=ac.createGain(),hp=ac.createBiquadFilter();n.buffer=noiseBuf;hp.type='highpass';hp.frequency.value=1800;
      g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+.14);n.connect(hp);hp.connect(g);out(g,musicBus,.25);n.start(t);n.stop(t+.2);
    },
    tick(t,v=.08,hi=true){
      const n=ac.createBufferSource(),g=ac.createGain(),bp=ac.createBiquadFilter();n.buffer=noiseBuf;bp.type='bandpass';bp.frequency.value=hi?3600:2100;bp.Q.value=9;
      g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+.04);n.connect(bp);bp.connect(g);out(g,musicBus,.12);n.start(t);n.stop(t+.06);
    },
    bass(t,f,d,v=.2){
      const g=ac.createGain(),o=ac.createOscillator(),o2=ac.createOscillator(),lp=ac.createBiquadFilter();
      o.type='sawtooth';o.frequency.value=f;o2.type='sine';o2.frequency.value=f/2;lp.type='lowpass';lp.frequency.value=420;
      env(g,t,.012,d,v,.12);o.connect(g);const g2=ac.createGain();g2.gain.value=.8;o2.connect(g2);g2.connect(g);g.connect(lp);out(lp,musicBus,.1);
      o.start(t);o2.start(t);o.stop(t+d+.2);o2.stop(t+d+.2);
    }
  };

  /* ---------- 장면별 곡 정의 ---------- */
  const P4=(a)=>a;
  const SCENES={
    title:{key:50,mode:'harm',bpm:52,steps:16,prog:[0,5,3,4],pad:1,choir:.9,str:.9,bell:1,mel:'bell',melDens:.18,bass:'long',perc:0,tick:0,seed:11},
    story:{key:45,mode:'minor',bpm:46,steps:16,prog:[0,0,5,4],pad:.8,choir:.4,str:.5,bell:.7,mel:'bell',melDens:.1,bass:'long',perc:0,tick:.3,seed:5},
    map1:{key:57,mode:'minor',bpm:76,steps:16,prog:[0,5,2,6],pad:.7,str:.7,arp:'pizz',arpPat:[0,2,1,2,0,2,1,3],mel:'str',melDens:.3,bass:'pizz',perc:0,tick:.8,seed:21},
    map2:{key:52,mode:'harm',bpm:72,steps:16,prog:[0,3,5,4],pad:.8,str:.8,arp:'pizz',arpPat:[0,1,2,3,2,1,2,1],mel:'str',melDens:.3,bass:'pizz',perc:0,tick:.8,seed:22},
    map3:{key:49,mode:'phryg',bpm:66,steps:16,prog:[0,1,0,6],pad:.9,str:.8,choir:.5,arp:'bell',arpPat:[0,2,4,2],mel:'organ',melDens:.25,bass:'long',perc:0,tick:1,seed:23},
    battle1:{key:52,mode:'minor',bpm:124,steps:16,prog:[0,5,2,6],pad:.4,ost:'stac',bass:'drive',perc:1,tick:0,mel:'organ',melDens:.5,arp:null,seed:31},
    battle2:{key:50,mode:'harm',bpm:134,steps:16,prog:[0,5,3,4],pad:.4,ost:'stac',bass:'drive',perc:1,mel:'organ',melDens:.55,arp:'pizz',arpPat:[0,2,1,2],choir:.3,seed:32},
    battle3:{key:48,mode:'phryg',bpm:142,steps:16,prog:[0,1,0,6],pad:.5,ost:'stac',bass:'drive',perc:1,mel:'organ',melDens:.55,arp:'pizz',arpPat:[0,1,2,1],choir:.5,tick:.6,seed:33},
    elite:{key:47,mode:'harm',bpm:148,steps:16,prog:[0,6,5,4],pad:.5,ost:'stac',bass:'drive',perc:1.2,mel:'organ',melDens:.6,choir:.8,off:1,seed:41},
    boss1:{key:50,mode:'harm',bpm:158,steps:12,prog:[0,4,0,5,3,4,0,4],pad:.6,ost:'waltz',bass:'waltz',perc:1,mel:'organ',melDens:.6,choir:.9,bell:.5,seed:51},
    boss2:{key:45,mode:'phryg',bpm:152,steps:16,prog:[0,1,5,4],pad:.7,ost:'trem',bass:'drive',perc:1.2,mel:'organ',melDens:.6,choir:1,accent:1,tick:.7,seed:52},
    boss3a:{key:46,mode:'harm',bpm:140,steps:16,prog:[0,5,3,4],pad:.8,ost:'stac',bass:'drive',perc:1.2,mel:'organ',melDens:.6,choir:.9,church:1,tick:1,seed:61},
    boss3b:{key:46,mode:'harm',bpm:168,steps:16,prog:[0,6,5,4,0,3,4,4],pad:.9,ost:'trem',bass:'drive',perc:1.6,mel:'organ',melDens:.8,choir:1.2,church:1,tick:1.4,off:1,seed:62},
    camp:{key:55,mode:'major',bpm:62,steps:16,prog:[0,4,5,3],pad:.8,str:.6,arp:'bell',arpPat:[0,1,2,1],mel:'bell',melDens:.3,bass:'long',perc:0,tick:.2,seed:71},
    shop:{key:53,mode:'major',bpm:104,steps:12,prog:[0,3,4,0],pad:.2,ost:'waltz',bass:'waltz',perc:0,mel:'organ',melDens:.5,bell:.4,tick:.3,seed:72},
    event:{key:46,mode:'dorian',bpm:58,steps:16,prog:[0,6,0,3],pad:.8,str:.5,choir:.5,bell:.6,mel:'bell',melDens:.14,bass:'long',tick:.5,seed:73},
    dawn:{key:50,mode:'major',bpm:68,steps:16,prog:[0,4,5,3,0,4,3,4],pad:1,str:1,choir:1,bell:.8,arp:'bell',arpPat:[0,1,2,3,2,1],mel:'str',melDens:.4,bass:'long',seed:81},
    eternal:{key:50,mode:'minor',bpm:60,steps:16,prog:[0,5,2,6],pad:.9,str:.6,choir:.7,bell:1,arp:'bell',arpPat:[0,2,1,3],mel:'bell',melDens:.3,bass:'long',tick:1,seed:82}
  };

  /* ---------- 시퀀서 ---------- */
  function makeMelody(sc,s){
    const R=rand(s.seed*977),notes=[];
    /* 모티프: 4마디 프레이즈를 만들고 5~8마디에서 변형 */
    const motif=[];const len=s.steps;
    let d=4;
    for(let bar=0;bar<4;bar++){
      const m=[];
      for(let st=0;st<len;st+=(len===12?3:2)){
        if(R()<s.melDens*(st%4===0?1.5:.8)){
          d+=[-2,-1,-1,0,1,1,2,3][Math.floor(R()*8)];d=Math.max(0,Math.min(11,d));
          m.push({st,d,len:[2,2,4,6][Math.floor(R()*4)]});
        }
      }
      motif.push(m);
    }
    return motif;
  }
  function chordOf(s,rootDeg){return[deg(s.mode,s.key,rootDeg),deg(s.mode,s.key,rootDeg+2),deg(s.mode,s.key,rootDeg+4),deg(s.mode,s.key,rootDeg+7)]}

  let state=null;
  function startScene(id){
    if(!ac||!SCENES[id])return;
    if(sceneId===id&&timer)return;
    sceneId=id;
    const s=SCENES[id];
    /* 이전 장면 페이드아웃 */
    if(sceneGain){const old=sceneGain,t=ac.currentTime;old.gain.cancelScheduledValues(t);old.gain.setValueAtTime(old.gain.value,t);old.gain.linearRampToValueAtTime(0,t+1.1);setTimeout(()=>{try{old.disconnect()}catch(e){}},1500)}
    sceneGain=ac.createGain();sceneGain.gain.value=0;sceneGain.gain.linearRampToValueAtTime(1,ac.currentTime+.9);
    sceneGain.connect(musicBus);
    state={s,bar:0,step:0,t:ac.currentTime+.12,mel:makeMelody(s.mode,s),gain:sceneGain,R:rand(s.seed)};
    if(!timer)timer=setInterval(tickSched,45);
  }
  function tickSched(){
    if(!ac||!state)return;
    const st=state;
    while(st.t<ac.currentTime+.25){
      scheduleStep(st);
      const stepDur=60/st.s.bpm/(st.s.steps===12?3:4);
      st.t+=stepDur;st.step++;
      if(st.step>=st.s.steps){st.step=0;st.bar++}
    }
  }
  /* 장면 전용 연결 지점: 악기들이 musicBus로 가지 않고 장면 게인을 통과하도록 임시 교체 */
  function scheduleStep(st){
    const s=st.s,t=st.t,step=st.step,bar=st.bar;
    const waltz=s.steps===12,beat=waltz?3:4;
    const prog=s.prog,rootDeg=prog[bar%prog.length];
    const ch=chordOf(s,rootDeg);
    const sd=60/s.bpm/beat;
    const barDur=sd*s.steps;
    const vol=(k)=>(k||0);
    const oldBus=musicBus;
    /* 장면 게인으로 라우팅 */
    musicBus=st.gain;
    try{
      /* 패드: 마디 시작 */
      if(step===0){
        if(s.pad){ch.slice(0,3).forEach((n,i)=>I.organ(t,mtof(n+(i?0:-12)),barDur*.98,.045*s.pad,musicBus));I.organ(t,mtof(ch[0]-24),barDur*.98,.06*s.pad,musicBus)}
        if(s.str&&!s.ost){ch.slice(0,3).forEach(n=>I.strings(t,mtof(n),barDur*1.02,.045*s.str,.5))}
        if(s.choir){[ch[0]+12,ch[1]+12,ch[2]].forEach(n=>I.choir(t,mtof(n),barDur*.98,.035*s.choir))}
        if(s.church&&bar%4===0){I.church(t,mtof(ch[0]-12),.14)}
        if(s.perc&&!s.off){I.timp(t,.4*Math.min(1.2,s.perc),mtof(ch[0]-24))}
      }
      /* 베이스 */
      if(s.bass==='long'){if(step===0)I.bass(t,mtof(ch[0]-24),barDur*.9,.12)}
      else if(s.bass==='pizz'){if(step%(waltz?6:8)===0)I.pizz(t,mtof(ch[0]-12),.14);if(!waltz&&step===12)I.pizz(t,mtof(ch[2]-12),.1)}
      else if(s.bass==='drive'){if(step%2===0){const oct=(step%8===6)?0:-12;I.bass(t,mtof(ch[0]+oct-12),sd*1.7,.16)}}
      else if(s.bass==='waltz'){if(step===0)I.bass(t,mtof(ch[0]-24),sd*3,.18)}
      /* 반주 */
      if(s.ost==='stac'&&step%2===0){const n=[ch[0],ch[2],ch[1],ch[2]][(step/2|0)%4];I.stac(t,mtof(n),sd*1.6,.045)}
      if(s.ost==='trem'){const n=ch[(step>>1)%3];I.stac(t,mtof(n),sd*.9,.04)}
      if(s.ost==='waltz'&&(step===4||step===8)){ch.slice(0,3).forEach(n=>I.pizz(t,mtof(n),.07))}
      if(s.arp){const pat=s.arpPat,idx=pat[(step>>(waltz?1:1))%pat.length];if(step%2===0){const n=ch[idx%4]+12;if(s.arp==='pizz')I.pizz(t,mtof(n),.06);else I.bell(t,mtof(n+12),.034,1.8)}}
      /* 타악기 */
      if(s.perc&&!waltz){
        const p=s.perc;
        if(s.accent){ if([0,3,6,8,11,14].includes(step))I.timp(t,.28*p,mtof(ch[0]-24));if([4,12].includes(step))I.snare(t,.1*p) }
        else if(s.off){ if(step%4===0)I.timp(t,.32*p,mtof(ch[0]-24));if([4,12].includes(step))I.snare(t,.13*p);if(step%4===2)I.tick(t,.06*p,true) }
        else { if(step===8)I.timp(t,.3*p,mtof(ch[0]-24));if(step===4||step===12)I.snare(t,.09*p);if(step===14&&(bar%4===3))I.snare(t,.12*p) }
      }
      if(s.perc&&waltz){if(step===0)I.timp(t,.34,mtof(ch[0]-24));if(step===4||step===8)I.snare(t,.06)}
      /* 시계 소리 */
      if(s.tick&&step%(waltz?3:4)===0){I.tick(t,.06*s.tick,(step/(waltz?3:4)|0)%2===0)}
      if(s.bell&&step===0&&bar%2===0){I.bell(t,mtof(ch[2]+12),.04*s.bell,3)}
      /* 선율 */
      const phrase=st.mel[bar%4],variation=Math.floor(bar/4)%2;
      for(const m of phrase){
        if(m.st!==step)continue;
        let d=m.d+(variation&&m.st%4===0?2:0);
        const note=deg(s.mode,s.key,d)+12;
        const dur=sd*m.len;
        if(s.mel==='organ'){I.organ(t,mtof(note),dur*.95,.07,musicBus)}
        else if(s.mel==='bell'){I.bell(t,mtof(note+12),.05,2.4)}
        else if(s.mel==='str'){I.strings(t,mtof(note),dur*1.1,.05,.12,2400)}
        if(s.choir&&s.choir>.8&&m.st%8===0)I.choir(t,mtof(note-12),dur,.03)
      }
    }finally{musicBus=oldBus}
  }

  /* ---------- 효과음 ---------- */
  function tone(f,d,type='sine',vol=.1,slide=0,delay=0){
    if(!ac||muted||fast)return;
    const t=ac.currentTime+delay,o=ac.createOscillator(),g=ac.createGain();
    o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f*slide),t+d);
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(sfxBus);const s=ac.createGain();s.gain.value=.2;g.connect(s);s.connect(revIn);o.start(t);o.stop(t+d+.03);
  }
  function noise(d,vol=.12,delay=0,ff=2400){
    if(!ac||muted||fast)return;
    const t=ac.currentTime+delay,s=ac.createBufferSource(),g=ac.createGain(),f=ac.createBiquadFilter();
    s.buffer=noiseBuf;f.type='lowpass';f.frequency.value=ff;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    s.connect(f);f.connect(g);g.connect(sfxBus);s.start(t);s.stop(t+d+.05);
  }
  const SFX={
    hit(){tone(240,.2,'sawtooth',.1,.35);noise(.14,.14)},
    big(){tone(120,.5,'sawtooth',.16,.3);noise(.4,.2);tone(60,.6,'sine',.2,.5)},
    hurt(){tone(140,.3,'square',.1,.4);noise(.2,.14)},
    block(){tone(620,.18,'triangle',.1,.6);tone(930,.1,'triangle',.05,.7,.03)},
    heal(){[523,659,784,1047].forEach((f,i)=>tone(f,.28,'sine',.07,1,i*.07))},
    draw(){tone(700+Math.random()*200,.05,'square',.02)},
    flip(){tone(300,.3,'sine',.09,2.2);tone(450,.3,'triangle',.05,2,.05)},
    buff(){tone(440,.2,'triangle',.08,1.8);tone(660,.25,'triangle',.07,1.5,.08)},
    debuff(){tone(330,.25,'sawtooth',.06,.6);tone(220,.3,'sawtooth',.05,.6,.08)},
    poison(){tone(200,.3,'triangle',.07,1.5)},
    ready(){[392,523,659,784,1047].forEach((f,i)=>tone(f,.3,'triangle',.08,1,i*.06))},
    ult(){tone(80,1.4,'sawtooth',.18,3.5);noise(1,.2,.4);[262,330,392,523,659,784].forEach((f,i)=>tone(f,.5,'sine',.08,1,.5+i*.06))},
    ui(){tone(520,.08,'triangle',.06,1.3)},
    coin(){tone(1320,.08,'square',.04);tone(1760,.18,'square',.04,1,.07)},
    stone(){tone(880,.4,'sine',.07,1.4);tone(1320,.4,'sine',.05,1.2,.08)},
    level(){[392,494,587,784,988].forEach((f,i)=>tone(f,.4,'triangle',.08,1,i*.08))},
    die(){tone(180,.8,'sawtooth',.1,.3);noise(.5,.12)},
    open(){tone(300,.4,'sine',.08,1.6)}
  };
  function jingle(kind){
    if(!ac||muted)return;
    const t=ac.currentTime+.05,old=musicBus;
    if(kind==='win'){
      [[0,62],[.18,66],[.36,69],[.54,74]].forEach(([d,n])=>{I.organ(t+d,mtof(n),1.6-d,.09,musicBus);I.bell(t+d,mtof(n+12),.06,2.4)});
      [50,57,62,66].forEach(n=>I.choir(t,mtof(n),2.2,.04));I.timp(t,.5,70);
    }else if(kind==='lose'){
      [[0,57],[.5,53],[1,50],[1.6,45]].forEach(([d,n])=>{I.organ(t+d,mtof(n),1.8,.09,musicBus);I.bell(t+d,mtof(n-12),.1,4)});I.church(t,mtof(33),.2);
    }else if(kind==='boss'){
      for(let i=0;i<13;i++)I.church(t+i*.55,mtof(33+(i%2?7:0)),.1+i*.008);
      I.choir(t+6,mtof(50),4,.05);
    }else if(kind==='clock'){
      for(let i=0;i<12;i++)I.tick(t+i*.18,.1,i%2===0);
    }
  }
  return{
    init,play:startScene,jingle,sfx:n=>{try{SFX[n]&&SFX[n]()}catch(e){}},
    get scene(){return sceneId},
    stop(){if(sceneGain){const g=sceneGain,t=ac.currentTime;g.gain.setValueAtTime(g.gain.value,t);g.gain.linearRampToValueAtTime(0,t+.6)}sceneId=null;state=null},
    setMuted(m){muted=m;if(master)master.gain.value=m?0:1},get muted(){return muted},
    setFast(v){fast=v},
    resume(){if(ac&&ac.state==='suspended')ac.resume()}
  };
})();
