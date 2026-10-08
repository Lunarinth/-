// 보스 정의. 각 phase.run(A) 는 매 프레임(감속장 반영된 시간 A.s)마다 호출된다.
// A: b(보스) s(dt) cx cy px py g(지면 접촉) L R ceil floor
//    shot(x,y,vx,vy,{w,h,c,life}) aim(speed,spreads,opt) ring(n,speed,offset,opt) moveTo(tx,ty,speed) rnd()
// 스펠카드 이름 중 일부는 원작의 이름을 빌렸고, 나머지는 이 게임용 오리지널입니다.
const BOSSES = {
  meiling: {
    name: '홍 메이링', w: 26, h: 46, hp: 70, color: '#c33', accent: '#2a7a4a', fly: false,
    intro: [
      ['홍 메이링', '사쿠야 씨, 오늘도 한 수 부탁드립니다.'],
      ['사쿠야', '순찰 중이에요. ……뭐, 잠깐이라면.'],
      ['홍 메이링', '봐주시면 안 됩니다! 저도 오늘은 진심이에요!'],
    ],
    outro: [
      ['홍 메이링', '……참 많이 늘으셨네요. 오늘은 제가 졌습니다.'],
      ['사쿠야', '당신이 봐줬을 뿐이에요. 다음엔 정말로 상대해 드리죠.'],
      ['홍 메이링', '파츄리 님이 찾으세요. 도서관에서 이상한 소리가 났다고요.'],
    ],
    phases: [
      { name: '정권 연무', at: 0.65, run(A) {
        const b = A.b, st = b.st;
        if (st.cd === undefined) Object.assign(st, { cd: 1.5, dashCd: 4, dashT: 0, tele: 0 });
        b.warn = st.tele > 0;
        if (st.dashT > 0) { st.dashT -= A.s; b.vx = b.dir * 430; }
        else if (st.tele > 0) { st.tele -= A.s; b.vx = 0; if (st.tele <= 0) st.dashT = 0.5; }
        else {
          b.vx = b.dir * 75; st.cd -= A.s; st.dashCd -= A.s;
          if (st.cd <= 0) { st.cd = 1.5; A.aim(230, [-0.3, 0, 0.3]); }
          if (st.dashCd <= 0) { st.dashCd = 4; st.tele = 0.55; }
        }
      } },
      { name: '기공 「채광 난무」', at: 0.30, spell: true, run(A) {
        const st = A.b.st; A.b.vx = 0; st.cd = (st.cd ?? 0.5) - A.s; st.ang = st.ang ?? 0;
        if (st.cd <= 0) { st.cd = 0.6; st.ang += 0.27; A.ring(12, 150, st.ang); }
      } },
      { name: '굉권 「홍염의 비」', at: 0, spell: true, run(A) {
        const b = A.b, st = b.st; b.vx = 0;
        st.hop = (st.hop ?? 1) - A.s; st.rain = (st.rain ?? 0.5) - A.s; st.wave = (st.wave ?? 2) - A.s;
        if (st.hop <= 0 && A.g) { b.vy = -760; st.hop = 2.6; }
        if (st.rain <= 0) { st.rain = 0.16; A.shot(A.L + A.rnd() * (A.R - A.L), A.ceil + 4, 0, 210); }
        if (st.wave <= 0) { st.wave = 2.8; A.shot(A.cx - 5, A.floor - 12, (A.px < A.cx ? -1 : 1) * 250, 0, { w: 12, h: 12 }); }
      } },
    ],
  },

  patchouli: {
    name: '파츄리 널릿지', w: 24, h: 40, hp: 55, color: '#7a4fb0', accent: '#d8b0ff', fly: true,
    intro: [
      ['파츄리', '……왔구나. 레밀리아가 부탁했으니 어쩔 수 없지.'],
      ['사쿠야', '서가의 책들이 멋대로 날아다니고 있어요. 원인이 뭔가요?'],
      ['파츄리', '내가 쓴 적 없는 문장이 책에 늘고 있어. 먼저 네 실력부터 보겠어.'],
    ],
    outro: [
      ['파츄리', '……나쁘지 않아. 시간을 멈추는 사람이 이런 걸 읽으면 곤란하지.'],
      ['파츄리', '그 문장들의 끝에는 달이 있어. 그리고 달에는 영원을 아는 자가 있고.'],
      ['사쿠야', '아가씨께 말씀드리죠. 플랑드르 님의 방 쪽이 이상하다고요.'],
    ],
    phases: [
      { name: '오행 마법', at: 0.66, run(A) {
        const st = A.b.st; st.cd = (st.cd ?? 1) - A.s; st.big = (st.big ?? 2.5) - A.s;
        A.moveTo(A.px, A.ceil + 110 + Math.sin(A.b.pt * 1.5) * 20, 90);
        if (st.cd <= 0) { st.cd = 0.9; A.aim(210, [-0.34, -0.17, 0, 0.17, 0.34], { c: '#f74' }); }
        if (st.big <= 0) { st.big = 3; A.aim(105, [0], { w: 16, h: 16, c: '#4af' }); }
      } },
      { name: '화부 「아그니 샤인」', at: 0.33, spell: true, run(A) {
        const st = A.b.st; st.cd = (st.cd ?? 0.2) - A.s; st.a = st.a ?? 0;
        A.moveTo((A.L + A.R) / 2, A.ceil + 120, 80);
        if (st.cd <= 0) {
          st.cd = 0.13; st.a += 0.45;
          for (let k = 0; k < 2; k++) { const a = st.a + k * Math.PI; A.shot(A.cx - 4, A.cy - 4, Math.cos(a) * 150, Math.sin(a) * 150, { c: '#f63' }); }
        }
      } },
      { name: '수부 「프린세스 운디네」', at: 0, spell: true, run(A) {
        const st = A.b.st; st.cd = (st.cd ?? 0.8) - A.s;
        A.moveTo((A.L + A.R) / 2 + Math.sin(A.b.pt) * 200, A.ceil + 100, 100);
        if (st.cd <= 0) {
          st.cd = 1.5; const fromLeft = A.rnd() < 0.5, gap = A.ceil + 40 + Math.floor(A.rnd() * 6) * 40;
          for (let y = A.ceil + 8; y < A.floor - 8; y += 30) {
            if (y > gap - 50 && y < gap + 50) continue;
            A.shot(fromLeft ? A.L : A.R, y, fromLeft ? 150 : -150, 0, { c: '#5bf', w: 10, h: 10 });
          }
        }
      } },
    ],
  },

  flandre: {
    name: '플랑드르 스칼렛', w: 22, h: 34, hp: 65, color: '#d33', accent: '#fe8', fly: true,
    intro: [
      ['플랑드르', '어? 사쿠야다! 놀아 줄 거야?'],
      ['사쿠야', '아가씨께서 걱정하세요. 방으로 돌아가시지요.'],
      ['플랑드르', '싫어. 밖이 시끄러운데 왜 나만 못 가? 그럼 부수고 갈래!'],
    ],
    outro: [
      ['플랑드르', '……재미없어. 사쿠야는 안 부서지네.'],
      ['사쿠야', '부서지지 않아요. 약속드리죠.'],
      ['플랑드르', '그럼 언니한테 가 봐. 언니, 오늘 이상해. 달을 안 쳐다봐.'],
    ],
    phases: [
      { name: '파괴 · 장난', at: 0.66, run(A) {
        const b = A.b, st = b.st; st.cd = (st.cd ?? 1) - A.s;
        b.vx = b.vy = 0;
        if (st.cd <= 0) {
          st.cd = 1.7;
          b.x = Math.max(A.L, Math.min(A.R - b.w, A.px + (A.rnd() < 0.5 ? -170 : 170)));
          b.y = Math.max(A.ceil + 10, A.py - 70 - A.rnd() * 60);
          A.ring(10, 170, A.rnd() * 3, { c: '#fa4' });
        }
      } },
      { name: '금기 「레바테인」', at: 0.33, spell: true, run(A) {
        const st = A.b.st; st.cd = (st.cd ?? 0.2) - A.s;
        A.moveTo((A.L + A.R) / 2, A.ceil + 140, 120);
        if (st.cd <= 0) {
          st.cd = 0.05;
          const a = Math.PI / 2 + Math.sin(A.b.pt * 1.1) * 1.25;
          A.shot(A.cx - 4, A.cy - 4, Math.cos(a) * 280, Math.sin(a) * 280, { c: '#f95' });
        }
      } },
      { name: '금기 「카고메 카고메」', at: 0, spell: true, run(A) {
        const st = A.b.st; st.cd = (st.cd ?? 0.4) - A.s; st.k = st.k ?? 0;
        A.moveTo((A.L + A.R) / 2, A.ceil + 60, 100);
        if (st.cd <= 0) {
          st.cd = 1.2; st.k++;
          for (let x = A.L + (st.k % 2) * 40; x < A.R; x += 80) A.shot(x, A.ceil + 6, 0, 130, { c: '#fc4' });
          for (let y = A.ceil + 50 + (st.k % 2) * 36; y < A.floor - 20; y += 72)
            A.shot(st.k % 2 ? A.L : A.R, y, st.k % 2 ? 130 : -130, 0, { c: '#f84' });
        }
      } },
    ],
  },

  remilia: {
    name: '레밀리아 스칼렛', w: 24, h: 36, hp: 70, color: '#b0204a', accent: '#6a1030', fly: true,
    intro: [
      ['레밀리아', '사쿠야. 파츄리와 플랑까지 상대하고 왔나.'],
      ['사쿠야', '아가씨. 달이 이상합니다. 제가 보기엔 아가씨께서도.'],
      ['레밀리아', '내 운명이 흐려졌어. 네가 그 한가운데 서 있다는 것만 보여. 시험하겠다.'],
    ],
    outro: [
      ['레밀리아', '……운명이 틀렸으면 좋겠구나.'],
      ['사쿠야', '아가씨?'],
      ['레밀리아', '영원정으로 가라. 그곳의 주인이 너를 기다린다. 나는 따라갈 수 없다.'],
    ],
    phases: [
      { name: '운명 「창의 시험」', at: 0.7, run(A) {
        const b = A.b, st = b.st; st.cd = (st.cd ?? 0.8) - A.s; st.dash = (st.dash ?? 3) - A.s;
        b.warn = (st.tele ?? 0) > 0;
        if ((st.tele ?? 0) > 0) { st.tele -= A.s; b.vx = b.vy = 0; if (st.tele <= 0) st.dT = 0.5; }
        else if ((st.dT ?? 0) > 0) { st.dT -= A.s; b.vx = b.dir * 520; b.vy = 0; }
        else {
          A.moveTo(A.px - b.dir * 200, A.py, 120);
          if (st.cd <= 0) { st.cd = 0.9; A.aim(340, [0], { w: 18, h: 8, c: '#f55' }); A.ring(8, 120, A.b.pt, { c: '#a3c' }); }
          if (st.dash <= 0) { st.dash = 3.5; st.tele = 0.55; }
        }
      } },
      { name: '홍부 「스칼렛 슈트」', at: 0.35, spell: true, run(A) {
        const st = A.b.st; st.cd = (st.cd ?? 0.5) - A.s; st.a = st.a ?? 0;
        A.moveTo((A.L + A.R) / 2, A.ceil + 130, 90);
        if (st.cd <= 0) { st.cd = 0.75; st.a += 0.21; A.ring(18, 175, st.a, { c: '#e33' }); if (A.rnd() < 0.5) A.aim(260, [-0.12, 0.12]); }
      } },
      { name: '신창 「스피어 더 궁니르」', at: 0, spell: true, run(A) {
        const b = A.b, st = b.st; st.cd = (st.cd ?? 1) - A.s;
        b.warn = st.cd < 0.5;
        A.moveTo(A.L + (A.R - A.L) * (0.5 + 0.4 * Math.sin(b.pt * 0.7)), A.ceil + 110, 100);
        if (st.cd <= 0) {
          st.cd = 2.1;
          A.aim(520, [0], { w: 28, h: 14, c: '#f22' });
          A.ring(24, 130, A.rnd() * 6, { c: '#d46' });
        }
      } },
    ],
  },

  youmu: {
    name: '콘파쿠 요우무', w: 22, h: 40, hp: 75, color: '#7a9', accent: '#ddd', fly: false,
    intro: [
      ['요우무', '여기서부터는 서행요의 영역입니다. 돌아가 주십시오.'],
      ['사쿠야', '이변을 쫓고 있어요. 죽은 자들이 길을 잃었다고 들었습니다.'],
      ['요우무', '유유코 님께는 가시게 할 수 없습니다. 제 검이 허락하지 않습니다.'],
    ],
    outro: [
      ['요우무', '……강하시군요. 하지만 한 가지만 약속해 주십시오.'],
      ['사쿠야', '뭐죠?'],
      ['요우무', '유유코 님을 죽은 자라고만 생각하지 말아 주십시오.'],
    ],
    phases: [
      { name: '인귀 「미래영겁참」', at: 0.65, run(A) {
        const b = A.b, st = b.st;
        if (st.cd === undefined) Object.assign(st, { cd: 1.1, dashT: 0, tele: 0 });
        b.warn = st.tele > 0;
        if (st.dashT > 0) { st.dashT -= A.s; b.vx = b.dir * 560; }
        else if (st.tele > 0) { st.tele -= A.s; b.vx = 0; if (st.tele <= 0) { st.dashT = 0.4; A.shot(A.cx, A.cy, b.dir * 320, 0, { w: 26, h: 8, c: '#bfe' }); } }
        else { b.vx = b.dir * 90; st.cd -= A.s; if (st.cd <= 0) { st.cd = 2; st.tele = 0.5; if (A.g && A.rnd() < 0.5) b.vy = -700; } }
      } },
      { name: '요괴 「반령의 춤」', at: 0.33, spell: true, run(A) {
        const b = A.b, st = b.st; st.cd = (st.cd ?? 0.4) - A.s; st.hop = (st.hop ?? 1) - A.s; b.vx = b.dir * 60;
        if (st.hop <= 0 && A.g) { b.vy = -720; st.hop = 1.8; }
        if (st.cd <= 0) { st.cd = 0.7; A.aim(200, [-0.5, -0.25, 0, 0.25, 0.5], { c: '#9fc' }); }
      } },
      { name: '인귀 「슬금성불 베기」', at: 0, spell: true, run(A) {
        const b = A.b, st = b.st; st.cd = (st.cd ?? 0.6) - A.s; st.k = st.k ?? 0;
        b.warn = (st.tele ?? 0) > 0;
        if ((st.tele ?? 0) > 0) { st.tele -= A.s; b.vx = 0; if (st.tele <= 0) { st.dT = 0.35; st.k++; } }
        else if ((st.dT ?? 0) > 0) {
          st.dT -= A.s; b.vx = b.dir * 650; A.shot(A.cx, A.floor - 16 - (st.k % 2) * 30, 0, -40 - (st.k % 2) * 40, { w: 10, h: 10, c: '#dfe' });
          A.shot(A.cx, A.floor - 16, b.dir * 150, 0, { c: '#8ec' });
        }
        else { b.vx = 0; st.cd -= A.s; if (st.cd <= 0) { st.cd = 1.3; st.tele = 0.45; } }
      } },
    ],
  },

  yuyuko: {
    name: '사이교우지 유유코', w: 24, h: 40, hp: 70, color: '#e9b6cf', accent: '#79a', fly: true,
    intro: [
      ['유유코', '어머, 손님이네. 홍마관의 메이드지?'],
      ['사쿠야', '이변을 멈추러 왔습니다. 당신이 죽은 자를 붙들고 있다고 들었어요.'],
      ['유유코', '붙들고 있는 게 아니야. 놓아 주면 모두 돌아와 버리거든. 보여 줄게.'],
    ],
    outro: [
      ['유유코', '합격. 아직 사람을 죽이는 것과 이변을 해결하는 건 구분할 수 있나 보네.'],
      ['사쿠야', '무슨 말씀이시죠?'],
      ['유유코', '앞으로 필요할 거야. 영원정의 주인은 네 시간을 노리고 있으니까.'],
    ],
    phases: [
      { name: '사접 「서행요의 낙화」', at: 0.66, run(A) {
        const st = A.b.st; st.cd = (st.cd ?? 0.8) - A.s; st.p = (st.p ?? 0.3) - A.s;
        A.moveTo(A.px, A.ceil + 120, 70);
        if (st.cd <= 0) { st.cd = 1.1; A.aim(170, [-0.54, -0.36, -0.18, 0, 0.18, 0.36, 0.54], { c: '#f8c' }); }
        if (st.p <= 0) { st.p = 0.28; A.shot(A.L + A.rnd() * (A.R - A.L), A.ceil + 4, 0, 105, { c: '#fcd' }); }
      } },
      { name: '영부 「반혼접」', at: 0.33, spell: true, run(A) {
        const st = A.b.st; st.cd = (st.cd ?? 0.5) - A.s; st.a = st.a ?? 0;
        A.moveTo((A.L + A.R) / 2, A.ceil + 120, 70);
        if (st.cd <= 0) { st.cd = 1.3; st.a += 0.4; A.ring(24, 110, st.a, { c: '#d8f' }); setTimeout; }
        st.cd2 = (st.cd2 ?? 0.6) - A.s;
        if (st.cd2 <= 0) { st.cd2 = 1.6; A.aim(300, [-0.1, 0.1], { c: '#fff' }); }
      } },
      { name: '「죽음의 만개 -서행요-」', at: 0, spell: true, run(A) {
        const st = A.b.st; st.cd = (st.cd ?? 0.4) - A.s; st.a = (st.a ?? 0);
        A.moveTo((A.L + A.R) / 2 + Math.sin(A.b.pt * 0.6) * 220, A.ceil + 110, 90);
        if (st.cd <= 0) {
          st.cd = 0.16; st.a += 0.38;
          for (let k = 0; k < 3; k++) { const a = st.a + k * 2.094; A.shot(A.cx - 4, A.cy - 4, Math.cos(a) * 140, Math.sin(a) * 140, { c: '#fbd' }); }
        }
        st.cd2 = (st.cd2 ?? 1) - A.s;
        if (st.cd2 <= 0) { st.cd2 = 1.8; A.aim(250, [-0.4, -0.2, 0, 0.2, 0.4]); }
      } },
    ],
  },

  reisen: {
    name: '레이센 우동게인 이나바', w: 22, h: 40, hp: 70, color: '#c8a8e0', accent: '#e33', fly: true,
    intro: [
      ['레이센', '돌아가세요. 이번에는 진짜로 돌아가는 게 좋아요.'],
      ['사쿠야', '당신 눈이 흔들리고 있어요. 누가 시켰죠?'],
      ['레이센', '공주님을 방해하게 둘 수 없어요. ……설령 알고 있더라도.'],
    ],
    outro: [
      ['레이센', '……들어가세요. 제가 막을 수 없으니까.'],
      ['사쿠야', '당신은 막고 싶지 않았던 것 같군요.'],
      ['레이센', '공주님은…… 누군가 막아야 해요. 그게 저는 아니었을 뿐이에요.'],
    ],
    phases: [
      { name: '광안 「환시의 눈동자」', at: 0.66, run(A) {
        const st = A.b.st; st.cd = (st.cd ?? 0.6) - A.s;
        A.moveTo(A.px + Math.sin(A.b.pt * 1.3) * 200, A.ceil + 100, 120);
        if (st.cd <= 0) { st.cd = 1; st.burst = 3; }
        if (st.burst > 0) { st.bt = (st.bt ?? 0) - A.s; if (st.bt <= 0) { st.bt = 0.11; st.burst--; A.aim(400, [0], { c: '#f66' }); } }
      } },
      { name: '광부 「환시조율」', at: 0.33, spell: true, run(A) {
        const st = A.b.st; st.cd = (st.cd ?? 0.15) - A.s; st.a = st.a ?? 0;
        A.moveTo((A.L + A.R) / 2, A.ceil + 130, 80);
        if (st.cd <= 0) {
          st.cd = 0.14; st.a += 0.33;
          A.shot(A.cx - 4, A.cy - 4, Math.cos(st.a) * 160, Math.sin(st.a) * 160, { c: '#f44' });
          A.shot(A.cx - 4, A.cy - 4, Math.cos(-st.a) * 160, Math.sin(-st.a) * 160, { c: '#fa4' });
        }
      } },
      { name: '환상 「월광의 파장」', at: 0, spell: true, run(A) {
        const st = A.b.st; st.cd = (st.cd ?? 0.6) - A.s;
        A.moveTo(A.L + (A.R - A.L) * (0.5 + 0.35 * Math.sin(A.b.pt * 0.8)), A.ceil + 90, 120);
        if (st.cd <= 0) { st.cd = 1.15; A.ring(20, 190, A.rnd() * 6, { c: '#f66' }); A.aim(300, [-0.2, 0, 0.2], { c: '#fff' }); }
        st.cd2 = (st.cd2 ?? 2) - A.s;
        if (st.cd2 <= 0) { st.cd2 = 2.4; for (let y = A.ceil + 30; y < A.floor; y += 56) A.shot(A.R, y + (A.rnd() < 0.5 ? 0 : 26), -210, 0, { c: '#e8f' }); }
      } },
    ],
  },

  kaguya: {
    name: '호라이산 카구야', w: 24, h: 42, hp: 120, color: '#222a55', accent: '#fff', fly: true,
    intro: [
      ['카구야', '와 줬구나, 시간을 멈추는 인간.'],
      ['사쿠야', '당신이군요. 달빛 아래에서 모든 걸 어긋나게 만든 건.'],
      ['카구야', '나는 시작한 적 없어. 단지 이 밤을 즐겼을 뿐이야. 시간이 멈추는 걸 보고 싶었거든.'],
    ],
    outro: null,   // 엔딩 연출은 game.js 에서 처리
    phases: [
      { name: '난제 「불사의 연기」', at: 0.8, spell: true, run(A) {
        const st = A.b.st; st.cd = (st.cd ?? 0.3) - A.s; st.a = st.a ?? 0;
        A.moveTo((A.L + A.R) / 2, A.ceil + 120, 90);
        if (st.cd <= 0) { st.cd = 0.1; st.a += 0.17; for (let k = 0; k < 3; k++) { const a = st.a + k * 2.094; A.shot(A.cx - 4, A.cy - 4, Math.cos(a) * 130, Math.sin(a) * 130, { c: '#bbd' }); } }
      } },
      { name: '난제 「용의 목의 구슬 -오색의 탄환-」', at: 0.6, spell: true, run(A) {
        const st = A.b.st; st.cd = (st.cd ?? 0.5) - A.s;
        A.moveTo(A.px, A.ceil + 100, 90);
        if (st.cd <= 0) {
          st.cd = 1.1;
          const cs = ['#e44', '#fa3', '#ee4', '#4d6', '#49f'];
          A.aim(300, [-0.5, -0.25, 0, 0.25, 0.5], { c: cs[Math.floor(A.rnd() * 5)] });
          A.ring(10, 120, A.rnd() * 6, { c: '#fff' });
        }
      } },
      { name: '난제 「제비의 자안패」', at: 0.4, spell: true, run(A) {
        const st = A.b.st; st.cd = (st.cd ?? 0.4) - A.s;
        A.moveTo(A.L + (A.R - A.L) * (0.5 + 0.4 * Math.sin(A.b.pt * 1.2)), A.ceil + 80, 160);
        if (st.cd <= 0) { st.cd = 0.5; for (let i = 0; i < 6; i++) A.shot(A.cx, A.cy, (A.rnd() - 0.5) * 360, 140 + A.rnd() * 160, { c: '#fd6' }); }
      } },
      { name: '난제 「부처의 돌 바리때」', at: 0.2, spell: true, run(A) {
        const st = A.b.st; st.cd = (st.cd ?? 0.5) - A.s; st.k = st.k ?? 0;
        A.moveTo((A.L + A.R) / 2, A.ceil + 70, 100);
        if (st.cd <= 0) {
          st.cd = 1.25; st.k++; const L = st.k % 2, gap = A.ceil + 60 + Math.floor(A.rnd() * 7) * 36;
          for (let y = A.ceil + 8; y < A.floor - 8; y += 26) {
            if (Math.abs(y - gap) < 56) continue;
            A.shot(L ? A.L : A.R, y, L ? 190 : -190, 0, { c: '#cbb', w: 12, h: 12 });
          }
        }
      } },
      { name: '난제 「봉래의 옥 가지 -꿈의 세계-」', at: 0, spell: true, run(A) {
        const st = A.b.st; st.cd = (st.cd ?? 0.2) - A.s; st.a = st.a ?? 0; st.f = (st.f ?? 1) - A.s; st.r = (st.r ?? 2) - A.s;
        A.moveTo((A.L + A.R) / 2 + Math.sin(A.b.pt * 0.5) * 240, A.ceil + 110, 80);
        if (st.cd <= 0) { st.cd = 0.13; st.a += 0.31; for (let k = 0; k < 4; k++) { const a = st.a + k * 1.571; A.shot(A.cx - 4, A.cy - 4, Math.cos(a) * 150, Math.sin(a) * 150, { c: '#8cf' }); } }
        if (st.f <= 0) { st.f = 1.6; A.aim(320, [-0.3, -0.15, 0, 0.15, 0.3], { c: '#fe8' }); }
        if (st.r <= 0) { st.r = 2.6; A.ring(20, 100, A.rnd() * 6, { c: '#f8c' }); }
      } },
    ],
  },
};

// 보스 순서와 방 정보 (maps.js 가 사용)
const BOSS_ORDER = ['meiling', 'patchouli', 'flandre', 'remilia', 'youmu', 'yuyuko', 'reisen', 'kaguya'];
