// 아이템 데이터베이스 (로그라이크). 아이템은 획득 즉시 플레이어의 능력치/탄/옵션/스킬을 바꾼다.
//  stats : 더하는 능력치  (dmg 공격력, rate 연사, shotSpeed 탄속, range 사거리, speed 이동, size 탄 크기, luck 행운, magnet 자석 범위,
//          crit 치명타 확률, homing 유도, pierce 관통, bounce 반사, split 분열, explode 폭발 반경, wave 파동, chain 연쇄, poison 독,
//          leech 흡혈, streams 탄 줄 추가, back 후방탄, side 측면탄, diag 대각탄, ring 고리탄(n발마다), slowAura 감속장)
//  mul   : 곱하는 능력치
//  shot  : 탄 형태 (kind 외형 · laser 레이저 · charge 모아쏘기 · boomerang 부메랑 · orbit 맴도는 탄)
//  options : 옵션(사역마) 추가    hp: 최대 체력 증감   onGet: 획득 즉시 효과   active: 액티브 스킬 id (skills.js)
//  tags  : 변신 세트 (같은 태그 3개 → 변신)
//  pools : 등장 장소 — treasure 보물방 · shop 시트라 상점 · boss 보스 보상 · infinite 인피니트 상점 · challenge 도전방
// 이 게임을 위한 창작 아이템이다.

export const RARITY = {
  common: { name: '일반', color: '#d8d8e8', price: 15 },
  rare: { name: '희귀', color: '#7fb8ff', price: 25 },
  unique: { name: '유니크', color: '#c48bff', price: 42 },
  legendary: { name: '레전더리', color: '#ffc04a', price: 64 },
};

const T = 'treasure', S = 'shop', B = 'boss', I = 'infinite', C = 'challenge';

export const ITEMS = [
  // ───────────── 능력치 ─────────────
  { id: 'whetstone', name: '성검의 숫돌', desc: '공격력 +0.5', rarity: 'common', pools: [T, S], tags: ['sword'], icon: { shape: 'sword', col: '#cfd8ff' }, stats: { dmg: 0.5 } },
  { id: 'silverEdge', name: '은빛 칼날', desc: '공격력 +0.3 · 탄속 +20%', rarity: 'common', pools: [T, S], tags: ['sword'], icon: { shape: 'sword', col: '#e8f0ff', glyph: '銀' }, stats: { dmg: 0.3, shotSpeed: 0.2 } },
  { id: 'lemonSoda', name: '레몬 소다', desc: '연사 +25% · 이동 +10%', rarity: 'common', pools: [T, S], tags: ['lemon'], icon: { shape: 'drop', col: '#ffe14a' }, stats: { rate: 0.25, speed: 0.1 } },
  { id: 'lemonTart', name: '레몬 타르트', desc: '최대 체력 +1 · 체력 모두 회복', rarity: 'common', pools: [T, S], tags: ['lemon'], icon: { shape: 'lemon', col: '#ffd84a', glyph: '+' }, hp: 1, onGet: (G, P) => P.heal(99) },
  { id: 'lightShoes', name: '가벼운 구두', desc: '이동 +20%', rarity: 'common', pools: [T, S], icon: { shape: 'feather', col: '#bff' }, stats: { speed: 0.2 } },
  { id: 'apron', name: '하녀장의 앞치마', desc: '최대 체력 +1', rarity: 'common', pools: [T, S], icon: { shape: 'shield', col: '#fff', glyph: '✚' }, hp: 1, onGet: (G, P) => P.heal(1) },
  { id: 'moonTear', name: '루나 티어', desc: '최대 체력 +2 · 공격력 -0.1', rarity: 'rare', pools: [T, B], tags: ['moon'], icon: { shape: 'drop', col: '#d6c4ff', glyph: '☾' }, hp: 2, stats: { dmg: -0.1 }, onGet: (G, P) => P.heal(2) },
  { id: 'brokenWatch', name: '깨진 회중시계', desc: '연사 +40% · 공격력 -0.15', rarity: 'common', pools: [T, S], icon: { shape: 'clock', col: '#e6d0a0' }, stats: { rate: 0.4, dmg: -0.15 } },
  { id: 'cursedVow', name: '저주받은 서약', desc: '공격력 +1.2 · 최대 체력 -1', rarity: 'rare', pools: [T, C], icon: { shape: 'eye', col: '#ff5a7a' }, hp: -1, stats: { dmg: 1.2 } },
  { id: 'bloodPact', name: '피의 계약', desc: '공격력 ×1.5 · 최대 체력 -2', rarity: 'unique', pools: [I, C], icon: { shape: 'heart', col: '#c0102a', glyph: '契' }, hp: -2, mul: { dmg: 1.5 } },
  { id: 'starInk', name: '별빛 잉크', desc: '사거리 +30% · 탄속 +15%', rarity: 'common', pools: [T, S], tags: ['book'], icon: { shape: 'drop', col: '#7fa8ff', glyph: '✦' }, stats: { range: 0.3, shotSpeed: 0.15 } },
  { id: 'croissant', name: '아침 크루아상', desc: '최대 체력 +1 · 이동 +10% · 회복 1', rarity: 'common', pools: [T, S, B], icon: { shape: 'bread', col: '#f0b35a' }, hp: 1, stats: { speed: 0.1 }, onGet: (G, P) => P.heal(1) },
  { id: 'luckyCoin', name: '행운의 동전', desc: '행운 +1 · 동전 +5', rarity: 'common', pools: [T, S], icon: { shape: 'circle', col: '#ffd34a', glyph: '幸' }, stats: { luck: 1 }, onGet: (G, P) => { P.coins += 5; } },
  { id: 'heavyTome', name: '무거운 마도서', desc: '공격력 +0.6 · 탄 크기 +30% · 이동 -10%', rarity: 'rare', pools: [T, B], tags: ['book'], icon: { shape: 'book', col: '#a07bff' }, stats: { dmg: 0.6, size: 0.3, speed: -0.1 } },
  { id: 'auditGlasses', name: '감사관의 안경', desc: '치명타 확률 +12% (3배 피해)', rarity: 'rare', pools: [T, S, B], tags: ['book'], icon: { shape: 'eye', col: '#c89bff', glyph: '◎' }, stats: { crit: 0.12 } },
  { id: 'grail', name: '성배', desc: '최대 체력 +1 · 체력 모두 회복 · 공격력 +0.3', rarity: 'unique', pools: [I, B], icon: { shape: 'crown', col: '#ffe9a6', glyph: '杯' }, hp: 1, stats: { dmg: 0.3 }, onGet: (G, P) => P.heal(99) },
  { id: 'clockHeart', name: '시계태엽 심장', desc: '체력이 1일 때 공격력 ×1.6', rarity: 'rare', pools: [T, C], icon: { shape: 'heart', col: '#d0a060', glyph: '⚙' }, flags: { lastStand: 1.6 } },
  { id: 'magnetGlove', name: '자석 장갑', desc: '아이템 자석 범위 ×2 · 동전이 더 자주 나온다', rarity: 'common', pools: [T, S], tags: ['lemon'], icon: { shape: 'shield', col: '#ff9a4a', glyph: 'U' }, stats: { magnet: 2.4, luck: 0.3 } },

  // ───────────── 탄 형태 ─────────────
  { id: 'crescentBlade', name: '초승달 칼날', desc: '탄이 초승달이 된다 · 관통 1 · 탄 크기 +20%', rarity: 'rare', pools: [T, B], tags: ['moon', 'sword'], icon: { shape: 'moon', col: '#e3d6ff' }, shot: { kind: 'crescent' }, stats: { pierce: 1, size: 0.2 } },
  { id: 'starShard', name: '별 조각', desc: '탄이 적을 쫓는다 (유도)', rarity: 'rare', pools: [T, S], tags: ['star'], icon: { shape: 'star', col: '#fff1a0' }, shot: { kind: 'star' }, stats: { homing: 4 } },
  { id: 'telescope', name: '접이식 망원경', desc: '사거리 +40% · 약한 유도', rarity: 'common', pools: [T, S], tags: ['star'], icon: { shape: 'eye', col: '#9cc3ff', glyph: '⌖' }, stats: { range: 0.4, homing: 1.5 } },
  { id: 'mirror', name: '거울 조각', desc: '뒤쪽으로도 쏜다', rarity: 'common', pools: [T, S], icon: { shape: 'mirror', col: '#dff' }, stats: { back: 1 } },
  { id: 'twinRibbon', name: '쌍둥이 리본', desc: '양옆으로도 쏜다', rarity: 'rare', pools: [T, S], icon: { shape: 'ring', col: '#ff9ad0', glyph: '∞' }, stats: { side: 1 } },
  { id: 'trinity', name: '삼위일체의 문장', desc: '탄 줄 +2 (넓게 퍼진다)', rarity: 'rare', pools: [T, B], tags: ['moon'], icon: { shape: 'moon', col: '#ffc4e8', glyph: '三' }, stats: { streams: 2 } },
  { id: 'rubberThread', name: '고무실', desc: '탄이 벽에 두 번 튕긴다', rarity: 'common', pools: [T, S], tags: ['string'], icon: { shape: 'thread', col: '#ff8a9a' }, stats: { bounce: 2, range: 0.4 } },
  { id: 'redThread', name: '붉은 실', desc: '관통 +2 · 맞은 적이 잠시 느려진다', rarity: 'rare', pools: [T, C], tags: ['string'], icon: { shape: 'thread', col: '#ff3045', glyph: '絲' }, stats: { pierce: 2 }, flags: { slowHit: 1 } },
  { id: 'splitSeed', name: '갈라지는 씨앗', desc: '명중하면 작은 탄 3발로 갈라진다', rarity: 'rare', pools: [T, C], icon: { shape: 'seed', col: '#9fe87f' }, stats: { split: 3 } },
  { id: 'lemonBomb', name: '레몬 폭탄탄', desc: '탄이 명중하면 작게 터진다', rarity: 'rare', pools: [T, S], tags: ['lemon'], icon: { shape: 'lemon', col: '#ffe14a', glyph: '✸' }, stats: { explode: 1.4 } },
  { id: 'sineWave', name: '사인 파동', desc: '탄이 물결치며 날아간다 · 공격력 +0.2', rarity: 'common', pools: [T, S], icon: { shape: 'bolt', col: '#7fe3ff', glyph: '∿' }, stats: { wave: 1, dmg: 0.2 } },
  { id: 'baguette', name: '부메랑 바게트', desc: '탄이 되돌아온다 · 공격력 +0.4', rarity: 'rare', pools: [T, B], tags: ['sword'], icon: { shape: 'bread', col: '#e0a050', glyph: '↺' }, shot: { boomerang: true }, stats: { dmg: 0.4 } },
  { id: 'staticSpark', name: '정전기', desc: '명중하면 근처 적에게 번개가 2번 튄다', rarity: 'rare', pools: [T, S], icon: { shape: 'bolt', col: '#ffffa0' }, stats: { chain: 2 } },
  { id: 'laserLens', name: '레이저 렌즈', desc: '탄 대신 꿰뚫는 광선을 쏜다', rarity: 'unique', pools: [I, B], tags: ['star'], icon: { shape: 'eye', col: '#ff4a6a', glyph: '━' }, shot: { laser: true } },
  { id: 'chargeSword', name: '모아 베는 성검', desc: 'Z를 누르고 있다가 놓으면 거대한 참격', rarity: 'rare', pools: [T, B], tags: ['sword'], icon: { shape: 'sword', col: '#ffe08a', glyph: '溜' }, shot: { charge: true } },
  { id: 'ringBurst', name: '고리 터뜨리개', desc: '10발마다 주변으로 8발이 터진다', rarity: 'common', pools: [T, S], icon: { shape: 'ring', col: '#ffd0a0', glyph: '✺' }, stats: { ring: 10 } },
  { id: 'rapidFire', name: '연발 장치', desc: '연사 +50% · 공격력 -0.2 · 탄 크기 -15%', rarity: 'common', pools: [T, S], icon: { shape: 'gear', col: '#bcd' }, stats: { rate: 0.5, dmg: -0.2, size: -0.15 } },
  { id: 'swollenLight', name: '부풀어 오른 성광', desc: '탄 크기 +60% · 공격력 +0.3', rarity: 'common', pools: [T, S], icon: { shape: 'circle', col: '#fff6c0', glyph: '大' }, stats: { size: 0.6, dmg: 0.3 } },
  { id: 'poisonInk', name: '독 먹물', desc: '맞은 적이 독에 걸려 지속 피해를 입는다', rarity: 'rare', pools: [T, C], tags: ['book'], icon: { shape: 'drop', col: '#8fe06a', glyph: '毒' }, stats: { poison: 1 } },
  { id: 'vampBlade', name: '흡혈 성검', desc: '적 40마리를 쓰러뜨릴 때마다 체력 1 회복', rarity: 'rare', pools: [T, C], tags: ['sword'], icon: { shape: 'sword', col: '#d02040', glyph: '血' }, stats: { leech: 1 } },
  { id: 'moonOrbit', name: '맴도는 달', desc: '탄이 잠깐 몸 주위를 돌다가 날아간다 · 관통 1', rarity: 'rare', pools: [T, B], tags: ['moon'], icon: { shape: 'moon', col: '#bfa8ff', glyph: '↻' }, shot: { orbit: true }, stats: { pierce: 1 } },
  { id: 'diagonalCross', name: '십자 성흔', desc: '대각선 네 방향으로도 쏜다', rarity: 'rare', pools: [T, S], tags: ['sword'], icon: { shape: 'star', col: '#ffe9c0', glyph: '✕' }, stats: { diag: 1 } },
  { id: 'pageBullet', name: '찢어진 책장', desc: '탄이 책장이 된다 · 관통 1 · 사거리 +20%', rarity: 'common', pools: [T, S], tags: ['book'], icon: { shape: 'book', col: '#ffe39a', glyph: '頁' }, shot: { kind: 'page' }, stats: { pierce: 1, range: 0.2 } },
  { id: 'petalShot', name: '장미 꽃잎', desc: '탄이 꽃잎이 되어 휘어 날아간다 · 연사 +15%', rarity: 'common', pools: [T, S], icon: { shape: 'flower', col: '#ff9fb8' }, shot: { kind: 'petal' }, stats: { rate: 0.15, wave: 0.5 } },

  // ───────────── 옵션(사역마) ─────────────
  { id: 'sunOption', name: '태양 구슬', desc: '유도탄을 쏘는 옵션', rarity: 'rare', pools: [T, S], tags: ['star'], icon: { shape: 'circle', col: '#ffb040', glyph: '☀' }, options: ['sun'] },
  { id: 'moonOption', name: '달 구슬', desc: '초승달을 쏘는 옵션', rarity: 'rare', pools: [T, B], tags: ['moon'], icon: { shape: 'moon', col: '#d9c8ff', glyph: '●' }, options: ['moon'] },
  { id: 'starOption', name: '별 구슬', desc: '흩어지는 별을 쏘는 옵션', rarity: 'common', pools: [T, S], tags: ['star'], icon: { shape: 'star', col: '#cfe0ff', glyph: '●' }, options: ['star'] },
  { id: 'lemonOption', name: '굴러다니는 레몬', desc: '튕기는 레몬 조각을 던지는 옵션', rarity: 'common', pools: [T, S], tags: ['lemon'], icon: { shape: 'lemon', col: '#ffe14a', glyph: '●' }, options: ['lemon'] },
  { id: 'bookOption', name: '떠다니는 서장', desc: '주위를 돌며 적탄을 막는 책장', rarity: 'rare', pools: [T, B], tags: ['book'], icon: { shape: 'book', col: '#9fe8c4', glyph: '◌' }, options: ['book'] },
  { id: 'puppetOption', name: '작은 꼭두각시', desc: '가까운 적을 찌르러 가는 인형', rarity: 'rare', pools: [T, C], tags: ['string'], icon: { shape: 'mask', col: '#ff8a9a' }, options: ['puppet'] },

  // ───────────── 방어 · 유틸 ─────────────
  { id: 'veil', name: '성모의 베일', desc: '방마다 한 번, 피격을 막아 주는 막', rarity: 'rare', pools: [T, B], tags: ['moon'], icon: { shape: 'shield', col: '#e8e0ff', glyph: '幕' }, flags: { roomShield: 1 } },
  { id: 'grazeCharm', name: '그레이즈 부적', desc: '탄을 스칠 때마다 파워가 조금 오른다', rarity: 'common', pools: [T, S], icon: { shape: 'feather', col: '#fff', glyph: '符' }, flags: { grazePower: 1 } },
  { id: 'keyRing', name: '열쇠 꾸러미', desc: '열쇠 +3', rarity: 'common', pools: [S, T], icon: { shape: 'key', col: '#ffd34a', glyph: '3' }, onGet: (G, P) => { P.keys += 3; } },
  { id: 'bombBag', name: '성광 주머니', desc: '성광 +2 · 최대 성광 +2', rarity: 'common', pools: [S, T], icon: { shape: 'bomb', col: '#ffe9a6' }, stats: { bombMax: 2 }, onGet: (G, P) => { P.ults += 2; } },
  { id: 'map', name: '저택 지도', desc: '이 층과 이후 층의 지도가 모두 보인다', rarity: 'common', pools: [S, T], tags: ['book'], icon: { shape: 'book', col: '#e8d8a0', glyph: '圖' }, flags: { map: 1 }, onGet: (G) => G.revealMap(true) },
  { id: 'compass', name: '나침반', desc: '특수 방의 위치가 보인다', rarity: 'common', pools: [S, T], tags: ['star'], icon: { shape: 'circle', col: '#bfe', glyph: '✧' }, flags: { compass: 1 }, onGet: (G) => G.revealMap(false) },
  { id: 'secondChance', name: '두 번째 기회', desc: '쓰러지면 한 번 체력 2로 되살아난다', rarity: 'legendary', pools: [I], icon: { shape: 'heart', col: '#ffe9a6', glyph: '再' }, flags: { revive: 1 } },
  { id: 'coupon', name: '시트라의 할인 쿠폰', desc: '상점 가격 -25%', rarity: 'rare', pools: [S], tags: ['lemon'], icon: { shape: 'lemon', col: '#ffef9a', glyph: '%' }, flags: { discount: 0.25 } },
  { id: 'stoppedHand', name: '멈춘 초침', desc: '몸 주위의 적탄이 느려진다', rarity: 'unique', pools: [I, C], icon: { shape: 'clock', col: '#c8d8ff', glyph: '止' }, stats: { slowAura: 1 } },
  { id: 'thornRose', name: '가시 장미', desc: '맞으면 가시가 사방으로 퍼진다', rarity: 'common', pools: [T, C], icon: { shape: 'flower', col: '#ff5a7a', glyph: '棘' }, flags: { thorns: 1 } },
  { id: 'powerUp', name: '응축된 성광', desc: '파워 +1.00', rarity: 'common', pools: [T, S, B], icon: { shape: 'circle', col: '#ff5a5a', glyph: 'P' }, onGet: (G, P) => P.addPower(1) },

  // ───────────── 보스 유물 ─────────────
  { id: 'opsirScope', name: '옵서의 망원경', desc: '유도 +3 · 사거리 +30% · 별 옵션', rarity: 'rare', pools: [B], tags: ['star'], icon: { shape: 'eye', col: '#cfe0ff', glyph: '★' }, stats: { homing: 3, range: 0.3 }, options: ['star'] },
  { id: 'astraCircuit', name: '아스트라의 회로', desc: '탄이 픽셀이 된다 · 연사 +35%', rarity: 'rare', pools: [B], icon: { shape: 'gear', col: '#9fd8ff', glyph: '回' }, shot: { kind: 'pixel' }, stats: { rate: 0.35 } },
  { id: 'tramontRapier', name: '트라몽의 레이피어', desc: '탄이 칼날이 된다 · 관통 2 · 탄속 +40%', rarity: 'rare', pools: [B], tags: ['sword'], icon: { shape: 'sword', col: '#9bc8ff', glyph: '⚔' }, shot: { kind: 'blade' }, stats: { pierce: 2, shotSpeed: 0.4 } },
  { id: 'indexKey', name: '인덱스의 황금 열쇠', desc: '열쇠 +2 · 떠다니는 서장', rarity: 'rare', pools: [B], tags: ['book'], icon: { shape: 'key', col: '#ffd36b', glyph: '鍵' }, options: ['book'], onGet: (G, P) => { P.keys += 2; } },
  { id: 'bellisTome', name: '벨리스의 마도서', desc: '탄이 룬 문자가 된다 · 명중 시 작은 폭발 · 치명타 +8%', rarity: 'rare', pools: [B], tags: ['book'], icon: { shape: 'book', col: '#c89bff', glyph: '律' }, shot: { kind: 'glyph' }, stats: { explode: 1.0, crit: 0.08 } },
  { id: 'arkesiaThread', name: '아르케시아의 실', desc: '탄이 붉은 실처럼 적을 꿰어 느리게 만든다 · 관통 3', rarity: 'unique', pools: [B], tags: ['string'], icon: { shape: 'thread', col: '#ff4f6e', glyph: '冠' }, stats: { pierce: 3 }, flags: { slowHit: 1 } },

  // ───────────── 유니크 · 레전더리 (인피니트) ─────────────
  { id: 'moonCrown', name: '달의 왕관', desc: '공격력 +1 · 모든 탄이 초승달 · 최대 체력 +1', rarity: 'legendary', pools: [I], tags: ['moon'], icon: { shape: 'crown', col: '#e3d6ff', glyph: '☾' }, shot: { kind: 'crescent' }, hp: 1, stats: { dmg: 1 } },
  { id: 'infCircuit', name: '∞ 회로', desc: '모든 능력치 소폭 상승 · 옵션 하나 추가', rarity: 'legendary', pools: [I], tags: ['infinite'], icon: { shape: 'infinity', col: '#5fe8c0' }, stats: { dmg: 0.3, rate: 0.2, speed: 0.1, shotSpeed: 0.1, range: 0.2, luck: 1 }, options: ['infinity'] },
  { id: 'infRibbon', name: '무한의 리본', desc: '적을 쓰러뜨릴수록 공격력이 오른다 (방을 나가면 초기화)', rarity: 'unique', pools: [I], tags: ['infinite'], icon: { shape: 'ring', col: '#5fe8c0', glyph: '∞' }, flags: { killStack: 1 } },
  { id: 'infKey', name: '무한 열쇠', desc: '잠긴 문을 열쇠 없이 연다', rarity: 'legendary', pools: [I], tags: ['infinite'], icon: { shape: 'key', col: '#5fe8c0', glyph: '∞' }, flags: { masterKey: 1 } },
  { id: 'infMagazine', name: '무한 탄창', desc: '탄 줄 +2 · 연사 +20%', rarity: 'legendary', pools: [I], tags: ['infinite'], icon: { shape: 'gear', col: '#5fe8c0', glyph: '∞' }, stats: { streams: 2, rate: 0.2 } },
  { id: 'eternalStar', name: '영원의 별', desc: '행운 +3 · 유도 +2', rarity: 'unique', pools: [I], tags: ['star'], icon: { shape: 'star', col: '#ffe9a6', glyph: '永' }, stats: { luck: 3, homing: 2 } },
  { id: 'lostScript', name: '잃어버린 대본', desc: '방에 들어갈 때마다 적 하나가 즉시 쓰러진다', rarity: 'unique', pools: [I, C], tags: ['book'], icon: { shape: 'book', col: '#ffffff', glyph: '本' }, flags: { scriptKill: 1 } },
  { id: 'needle', name: '은 바늘', desc: '관통 무한 · 탄 크기 -30% · 공격력 +0.4', rarity: 'unique', pools: [I, C], tags: ['string'], icon: { shape: 'sword', col: '#e0e0e0', glyph: '針' }, stats: { pierce: 99, size: -0.3, dmg: 0.4 } },

  // ───────────── 액티브 스킬 (C) ─────────────
  { id: 'a_barrier', name: '월광의 방벽', desc: '[액티브] 4초간 닿는 적탄을 지운다', rarity: 'common', pools: [T, S], tags: ['moon'], icon: { shape: 'shield', col: '#d9c8ff', glyph: 'C' }, active: 'barrier' },
  { id: 'a_timestop', name: '시간의 모래', desc: '[액티브] 3초간 적과 탄을 멈춘다', rarity: 'rare', pools: [T, B], icon: { shape: 'clock', col: '#ffe9a6', glyph: 'C' }, active: 'timestop' },
  { id: 'a_blink', name: '섬광 이동', desc: '[액티브] 이동 방향으로 순간이동하며 지나간 자리를 벤다', rarity: 'common', pools: [T, S], tags: ['sword'], icon: { shape: 'bolt', col: '#fff', glyph: 'C' }, active: 'blink' },
  { id: 'a_purify', name: '탄막 정화', desc: '[액티브] 모든 적탄을 지우고 점수 아이템으로 바꾼다', rarity: 'rare', pools: [T, S], icon: { shape: 'circle', col: '#9fe8ff', glyph: 'C' }, active: 'purify' },
  { id: 'a_clone', name: '성검의 분신', desc: '[액티브] 8초간 함께 싸우는 분신을 부른다', rarity: 'rare', pools: [T, B], tags: ['sword'], icon: { shape: 'mirror', col: '#ffe08a', glyph: 'C' }, active: 'clone' },
  { id: 'a_prayer', name: '하녀장의 기도', desc: '[액티브] 체력 1 회복', rarity: 'common', pools: [T, S], icon: { shape: 'heart', col: '#ff9ad0', glyph: 'C' }, active: 'prayer' },
  { id: 'a_berserk', name: '폭주', desc: '[액티브] 6초간 공격력 ×1.8 · 연사 ×1.5', rarity: 'common', pools: [T, S], icon: { shape: 'eye', col: '#ff5a5a', glyph: 'C' }, active: 'berserk' },
  { id: 'a_well', name: '중력 우물', desc: '[액티브] 적탄을 빨아들여 부수는 우물을 놓는다', rarity: 'rare', pools: [T, C], tags: ['star'], icon: { shape: 'ring', col: '#ffe36b', glyph: 'C' }, active: 'well' },
  { id: 'a_meteor', name: '별똥별', desc: '[액티브] 적들 머리 위로 별똥별이 떨어진다', rarity: 'rare', pools: [T, B], tags: ['star'], icon: { shape: 'star', col: '#ffd0a0', glyph: 'C' }, active: 'meteor' },
  { id: 'a_lemon', name: '레몬 수류탄', desc: '[액티브] 크게 터지는 레몬을 던진다', rarity: 'common', pools: [S, T], tags: ['lemon'], icon: { shape: 'lemon', col: '#ffe14a', glyph: 'C' }, active: 'lemon' },
  { id: 'a_moonMask', name: '달의 가면', desc: '[액티브] 10초간 달의 모습으로 변신한다', rarity: 'unique', pools: [I, B], tags: ['moon'], icon: { shape: 'mask', col: '#ff9ad8', glyph: 'C' }, active: 'moonMask' },
  { id: 'a_loop', name: '무한 루프', desc: '[액티브] 8초간 모든 탄이 두 배로 나간다', rarity: 'unique', pools: [I], tags: ['infinite'], icon: { shape: 'infinity', col: '#5fe8c0', glyph: 'C' }, active: 'loop' },
  { id: 'a_reroll', name: '운명의 실타래', desc: '[액티브] 이 방의 아이템을 다른 아이템으로 바꾼다', rarity: 'rare', pools: [T, S], tags: ['string'], icon: { shape: 'thread', col: '#ffd0e0', glyph: 'C' }, active: 'reroll' },
  { id: 'a_lens', name: '관측 렌즈', desc: '[액티브] 지도를 밝히고 10초간 탄이 유도된다', rarity: 'common', pools: [T, S], tags: ['star'], icon: { shape: 'eye', col: '#cfe0ff', glyph: 'C' }, active: 'lens' },
  { id: 'a_holyBurst', name: '성검 개방', desc: '[액티브] 정면으로 거대한 성검의 빛을 내리친다', rarity: 'rare', pools: [T, B], tags: ['sword'], icon: { shape: 'sword', col: '#fff1c9', glyph: 'C' }, active: 'holyBurst' },
];
export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((it) => [it.id, it]));

// 변신: 같은 태그 아이템 3개를 모으면 변신한다
export const TRANSFORMS = {
  sword: { name: '성검사', desc: '모든 탄이 관통하는 성검이 된다 · 공격력 +0.5', tint: [1.25, 1.15, 0.85], aura: 0xffe08a, stats: { pierce: 99, dmg: 0.5 }, shot: { kind: 'blade' } },
  moon: { name: '달의 무녀', desc: '초승달이 몸 주위를 돌며 탄을 막는다 · 최대 체력 +1', tint: [1.0, 0.92, 1.25], aura: 0xd9c8ff, hp: 1, options: ['moonGuard', 'moonGuard'] },
  star: { name: '별의 관측자', desc: '유도 +3 · 별 옵션 둘', tint: [0.9, 1.0, 1.3], aura: 0x9cc3ff, stats: { homing: 3 }, options: ['star', 'star'] },
  string: { name: '꼭두각시 주인', desc: '맞은 적이 느려지고, 인형 둘이 싸운다 · 공격력 +0.3', tint: [1.3, 0.85, 0.9], aura: 0xff4f6e, stats: { dmg: 0.3 }, flags: { slowHit: 1 }, options: ['puppet', 'puppet'] },
  lemon: { name: '레몬 하녀', desc: '연사 +30% · 자석 범위 증가 · 레몬이 사방으로 튄다', tint: [1.3, 1.25, 0.7], aura: 0xffe14a, stats: { rate: 0.3, magnet: 2 }, options: ['lemon'] },
  book: { name: '기록관', desc: '책장이 몸 주위를 돌며 탄을 막는다 · 성광 +2', tint: [1.0, 1.15, 1.05], aura: 0x7fe3b5, options: ['book', 'book'], onGet: (G, P) => { P.ults += 2; } },
  infinite: { name: '무한', desc: '모든 능력치 상승 · ∞ 옵션 둘', tint: [0.8, 1.25, 1.15], aura: 0x5fe8c0, stats: { dmg: 0.5, rate: 0.3, speed: 0.15, luck: 2 }, options: ['infinity', 'infinity'] },
};

// 픽업 (바닥에 떨어지는 것)
export const PICKUPS = {
  coin: { name: '동전', price: 0 },
  coin5: { name: '은화', price: 0 },
  heart: { name: '하트', price: 3 },
  key: { name: '열쇠', price: 5 },
  bomb: { name: '성광', price: 5 },
  p: { name: '파워', price: 0 },
  P: { name: '큰 파워', price: 8 },
  point: { name: '점수', price: 0 },
};

/** 가중 랜덤으로 풀에서 아이템 하나 (이미 가진 것 제외) */
export function rollItem(pool, owned = new Set(), rng = Math.random, rarityBias = 0) {
  const W = pool === 'infinite' ? { common: 0, rare: 0, unique: 62, legendary: 38 } : pool === 'boss' ? { common: 20, rare: 64, unique: 14, legendary: 2 } : pool === 'challenge' ? { common: 20, rare: 55, unique: 22, legendary: 3 } : { common: 62, rare: 31, unique: 6 + rarityBias, legendary: 1 + rarityBias * 0.3 };
  const cand = ITEMS.filter((it) => it.pools.includes(pool) && !owned.has(it.id) && W[it.rarity] > 0);
  if (!cand.length) return ITEMS.find((it) => it.id === 'powerUp');
  let tot = 0; for (const it of cand) tot += W[it.rarity];
  let r = rng() * tot; for (const it of cand) { r -= W[it.rarity]; if (r <= 0) return it; }
  return cand[cand.length - 1];
}
