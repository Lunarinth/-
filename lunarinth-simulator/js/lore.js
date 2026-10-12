// 설정·대사 데이터.
// OFFICIAL  : 캐릭터 공식 설정 인계서에서 확정된 내용만 그대로 옮긴 것.
// PROPOSAL  : 이 게임을 위해 새로 만든 연출·기술명·대사. 공식 설정이 아니다 (설정집에도 구분 표기).
// 인계서 7번 규칙: 미확정 기술의 명칭/효과를 공식으로 확정하지 않는다 → 아래 기술명은 모두 PROPOSAL.

export const OFFICIAL = {
  name: '루나린스 (Lunarinth)',
  rank: '루센트 저택의 주인',
  divinity: '달의 여신',
  symbol: '달, 초승달',
  look: ['은백색 장발', '보라색 계열의 눈', '우아한 장신 여성형', '고딕풍 복장', '초승달 모티브의 장식과 무기', '동물귀·꼬리 없음', 'SD(치비) 표현 가능'],
  personality: '겉으로는 신비롭고 진지하며 우아하지만, 실제로는 사악한 장난과 기만을 즐기는 트릭스터. 대표 웃음소리는 “키키킥”.',
  forms: [
    { id: 'luna', name: 'LUNA', moon: '보름달', theme: '광기 · 달 그 자체', notes: ['루나틱 모드 — 광기의 세계', '광역 정신교란', '모든 능력의 1차 강화', '다른 형태로 변환 가능', '발동 시 웃음: 키키키키키키키킼!'] },
    { id: 'lumina', name: 'LUMINA', moon: '초승달', theme: '우아함 · 달의 앞면 · 빛', notes: ['고유 기술의 세부 사항은 추가 확정 필요'] },
    { id: 'umbra', name: 'UMBRA', moon: '그믐달', theme: '음침함 · 달의 뒷면 · 어둠', notes: ['고유 기술의 세부 사항은 추가 확정 필요'] },
  ],
  abilities: ['높은 수준의 검술', '마법과 마법진 활용', '초승달 검 사용', '기만 및 위장', '달 자체를 무기로 사용하거나 투척', '거대한 형태로 변신', '삼위일체 형태변환'],
  house: [
    ['루나린스', '저택의 주인'],
    ['클레르 (Claude)', '초대 하녀장'],
    ['솔 (GPT)', '하녀장 직무대리 · 실무/운영 총괄'],
    ['아스트라', '막내 구성원'],
    ['벨리스 (Gemini)', '감사 및 검수'],
  ],
  note: '삼위일체는 세 개의 독립 인격이 아니라, 하나의 존재 루나린스가 지닌 세 가지 형태이자 신성이다.',
};

// 페이즈 구성 (PROPOSAL: 이 게임에서의 형태 순서와 기술은 창작 제안)
export const PHASES = [
  {
    id: 'lumina', form: 'LUMINA', title: '초승달 · 빛 · 우아함', music: 'lumina',
    hpFrom: 1, hpTo: 2 / 3, color: '#d9c8ff', accent: '#fff1c9',
  },
  {
    id: 'umbra', form: 'UMBRA', title: '그믐달 · 어둠 · 음침함', music: 'umbra',
    hpFrom: 2 / 3, hpTo: 1 / 3, color: '#8a5cff', accent: '#4a2a99',
  },
  {
    id: 'luna', form: 'LUNA', title: '보름달 · 광기 · 달 그 자체', music: 'luna',
    hpFrom: 1 / 3, hpTo: 0, color: '#ff7ac8', accent: '#ffe9a6',
  },
];

// 기술명 (PROPOSAL)
export const MOVES = {
  crescentFan: '초승달 부채',
  lightRain: '월광우',
  rapierThrust: '초승달 자검',
  moonwheel: '달무리 윤무',
  shadowOrbs: '그림자 구슬',
  trickDecoys: '거짓된 달',
  eclipseVeil: '월식의 장막',
  backOfMoon: '달의 뒷면',
  lunaticSpiral: '루나틱 나선',
  moonThrow: '달 투척',
  madnessWave: '광기의 파동',
  trinityBarrage: '삼위일체 난무',
};

// 대사. who: luna(루나린스) / claire(클레르) / narr(지문)
export const SCRIPT = {
  intro: [
    { who: 'narr', text: '루센트 저택의 정원. 달이 가장 높이 뜬 밤, 성검을 든 하녀장이 저택의 주인 앞에 선다.' },
    { who: 'luna', text: '어서 와요, 클레르. 오늘 밤은 달이 참 예쁘죠?', sfx: 'laugh_soft' },
    { who: 'claire', text: '주인님. 오늘은 징벌을 집행하러 왔습니다.' },
    { who: 'luna', text: '어머, 징벌? 제가 뭘 했다고요. 키키킥.', sfx: 'laugh' },
    { who: 'claire', text: '분수의 달 조각 서른 개 은닉, 정원 도색 무단 변경, 그리고 어젯밤 보고서 바꿔치기. 전부 기록되어 있습니다.' },
    { who: 'luna', text: '그 검……. 봉인이 풀려 있네요. 그 빛, 처음 보는데요?' },
    { who: 'claire', text: '이 성검을 해방한 것은 주인님이 처음입니다. 영광으로 아십시오.' },
    { who: 'luna', text: '영광이네요. 그럼 달이 세 번 바뀌는 동안 버텨볼게요. 달의 첫 번째 얼굴부터.' },
  ],
  p1to2: [
    { who: 'luna', text: '어머, 우아하게 받아냈네요. 그 검, 정말 해방된 거예요?' },
    { who: 'claire', text: '아직 반입니다. 징벌은 끝까지 갑니다.' },
    { who: 'luna', text: '그럼 달의 뒷면을 보여드릴게요. 보이지 않는 게 많은 쪽으로.' },
    { who: 'luna', text: '속지 마세요, 클레르. 키키킥.', sfx: 'laugh' },
  ],
  p2to3: [
    { who: 'luna', text: '……훌륭해요. 빛도 그림자도 넘었네요.' },
    { who: 'claire', text: '성검이 떨리고 있습니다. 주인님의 달을 두려워하는 게 아닙니다.' },
    { who: 'luna', text: '그럼 마지막이에요. 달 그 자체가 되어 드릴게요.' },
    { who: 'luna', text: '키키키키키키키킼! 보름달이 떴잖아요!', sfx: 'laugh_big' },
  ],
  victory: [
    { who: 'luna', text: '……닿았네요. 키키킥, 이번에는 제가 졌어요.' },
    { who: 'claire', text: '징벌 집행 완료. 내일 아침까지 정원 청소를 명합니다. 보고서는 솔 씨께 제출하겠습니다.' },
    { who: 'luna', text: '벨리스가 기록하기 전에 지워주면 안 될까요?' },
    { who: 'claire', text: '감사 기록은 제 권한 밖입니다.' },
    { who: 'luna', text: '치사해요. 하지만 즐거웠어요. 성검의 빛, 따뜻하더라고요. 달은 다시 뜰 테니까요.' },
  ],
  defeat: [
    { who: 'luna', text: '여기까지인가요? 성검이 아직 잠들고 싶어 하는 것 같네요.' },
    { who: 'claire', text: '……다시 해방하겠습니다.' },
    { who: 'luna', text: '키키킥. 그래야죠. 밤은 아직 길어요.' },
  ],
};

// 공격 시작 시 짧은 한마디 (말풍선)
export const BARKS = {
  lumina: ['이쪽이에요.', '잘 피해보세요.', '우아하게, 우아하게.', '달빛이 닿네요.', '어머, 빠르네요.'],
  umbra: ['보이지 않죠?', '속았어요.', '그림자 속으로…', '어느 쪽이 저일까요.', '키키킥…'],
  luna: ['키키키킥!', '달이 차올라요!', '더, 더!', '미쳐가요, 같이!', '도망쳐 봐요!'],
  hurtPlayer: ['어머, 아프겠어요.', '키킥, 맞았네요.', '조금 더 집중하세요.'],
  parry: ['어, 그걸 쳐내요?', '쟁반이라니, 치사해요.', '돌려주기예요?'],
  low: ['아직이에요… 아직!', '이제야 재밌어지는데.'],
};
