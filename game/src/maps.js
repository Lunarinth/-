// 맵 정의. # 벽 / P 시작 / S 저장 지점(↑) / j 이단 점프 아이템 / B 보스 표지
// w 지상 적 / f 비행 적 / t 포대 / a~e 방 이동구(links로 다른 방과 연결)
// gx, gy 는 미니맵 좌표.
function makeRoom(w, h, name, gx, gy, links, edit) {
  const g = [];
  for (let y = 0; y < h; y++) {
    g.push([]);
    for (let x = 0; x < w; x++) g[y].push(x === 0 || x === w - 1 || y === 0 || y >= h - 2 ? '#' : '.');
  }
  const put = (x, y, c) => { g[y][x] = c; };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = c; };
  edit(put, rect);
  return { name, gx, gy, links, rows: g.map(r => r.join('')) };
}

const MAPS = {
  start: {
    name: '홍마관 정원', gx: 0, gy: 0,
    links: { a: ['hall', 'b'] },
    rows: [
      '################################################################',
      '#..............................................................#',
      '#..............................................................#',
      '#..............................................................#',
      '#..............................................................#',
      '#..........................f...................................#',
      '#..............................................#####...........#',
      '#.................................w............................#',
      '#.............#####..............#####.......................w.#',
      '#..............................................................#',
      '#.....................................................###......#',
      '#.........####.............................w..................#',
      '#............######........................#####...............#',
      '#...P.......................w..........f..t..................w..#',
      '#######.....##########..........#############..........#########',
      '#######.....##########..........#############..........#########',
    ],
  },
};
// 시작 방 오른쪽 끝을 이동구로 연다
(() => {
  const r = MAPS.start.rows.map(s => s.split(''));
  r[12][63] = 'a'; r[13][63] = 'a';
  MAPS.start.rows = r.map(a => a.join(''));
})();

MAPS.hall = makeRoom(40, 16, '홍마관 회랑', 1, 0, { b: ['start', 'a'], c: ['trial', 'd'] }, (put, rect) => {
  rect(0, 12, 0, 13, 'b');            // 왼쪽 이동구
  rect(39, 12, 39, 13, 'c');          // 오른쪽 이동구
  put(5, 13, 'S');                    // 저장 지점
  rect(12, 12, 15, 12, '#');          // 낮은 발판
  put(13, 11, 'j');                   // 이단 점프
  rect(27, 10, 28, 13, '#');          // 4칸 벽: 보통 점프로는 못 넘음
  put(20, 13, 'w'); put(33, 8, 'f'); put(35, 13, 't');
});

MAPS.trial = makeRoom(30, 16, '정문 앞마당', 2, 0, { d: ['hall', 'c'], e: ['arena', 'a'] }, (put, rect) => {
  rect(0, 12, 0, 13, 'd');
  put(4, 13, 'S');
  rect(9, 11, 12, 11, '#'); rect(17, 9, 20, 9, '#');
  put(12, 13, 'w'); put(18, 13, 'w'); put(24, 13, 't'); put(15, 6, 'f');
  rect(29, 12, 29, 13, 'e');          // 연무장으로
});

// ---- 보스 방 체인 ----
// 연무장(메이링) 오른쪽에서 이어지는 방들: [접근 방, 보스 방] x 보스 수
const AREAS = {
  patchouli: ['대도서관 입구', '대도서관', 'field3'],
  flandre: ['지하 계단', '지하의 방', 'field3'],
  remilia: ['대홀 앞 복도', '홍마관 대홀', 'field4'],
  youmu: ['명계의 계단', '백옥루 앞', 'field2'],
  yuyuko: ['백옥루 복도', '서행요 아래', 'field2'],
  reisen: ['미혹의 죽림', '죽림 깊은 곳', 'field3'],
  kaguya: ['영원정 복도', '영원정 가장 깊은 방', 'field4'],
};

MAPS.arena = makeRoom(30, 16, '연무장', 3, 0, { a: ['trial', 'e'], b: ['ap_patchouli', 'a'] }, (put, rect) => {
  rect(0, 12, 0, 13, 'a'); rect(29, 12, 29, 13, 'b');
  put(3, 13, 'S');
  put(24, 13, 'B');                   // 홍 메이링
});
MAPS.arena.boss = 'meiling';

(() => {
  let prevId = 'arena', gx = 4;
  BOSS_ORDER.slice(1).forEach((id, i) => {
    const [apName, arName, bgm] = AREAS[id], apId = 'ap_' + id, arId = 'ar_' + id;
    const last = i === BOSS_ORDER.length - 2, nextAp = last ? null : 'ap_' + BOSS_ORDER[i + 2];
    MAPS[apId] = makeRoom(36, 16, apName, gx++, 0, { a: [prevId, 'b'], b: [arId, 'a'] }, (put, rect) => {
      const o = i % 3;
      rect(0, 12, 0, 13, 'a'); rect(35, 12, 35, 13, 'b');
      put(4, 13, 'S');
      rect(9 + o, 11, 12 + o, 11, '#'); rect(18, 9, 21, 9, '#'); rect(26 - o, 11, 28 - o, 11, '#');
      put(14, 13, 'w'); put(22, 13, i % 2 ? 't' : 'w'); put(31, 13, 'w'); put(19 + o, 6, 'f');
      if (i >= 3) put(27, 5, 'f');
    });
    MAPS[arId] = makeRoom(30, 16, arName, gx++, 0, last ? { a: [apId, 'b'] } : { a: [apId, 'b'], b: [nextAp, 'a'] }, (put, rect) => {
      rect(0, 12, 0, 13, 'a'); if (!last) rect(29, 12, 29, 13, 'b');
      put(3, 13, 'S'); put(24, 13, 'B');
      rect(3, 10, 6, 10, '#'); rect(23, 10, 26, 10, '#');
    });
    MAPS[apId].bgm = MAPS[arId].bgm = bgm; MAPS[arId].boss = id;
    prevId = arId;
  });
})();
const MAP_COLS = Math.max(...Object.values(MAPS).map(r => r.gx)) + 1;

// 방 테마 (배경·타일 모양)
MAPS.start.theme = 'garden';
MAPS.hall.theme = MAPS.trial.theme = MAPS.arena.theme = 'mansion';
Object.assign(MAPS.ap_patchouli, { theme: 'library' }); Object.assign(MAPS.ar_patchouli, { theme: 'library' });
MAPS.ap_flandre.theme = MAPS.ar_flandre.theme = 'dungeon';
MAPS.ap_remilia.theme = MAPS.ar_remilia.theme = 'mansion';
MAPS.ap_youmu.theme = MAPS.ar_youmu.theme = MAPS.ap_yuyuko.theme = MAPS.ar_yuyuko.theme = 'nether';
MAPS.ap_reisen.theme = MAPS.ar_reisen.theme = 'bamboo';
MAPS.ap_kaguya.theme = MAPS.ar_kaguya.theme = 'eientei';
