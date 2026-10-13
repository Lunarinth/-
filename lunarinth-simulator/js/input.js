// 키보드 입력 (동방식). 게임은 매 프레임 poll 하고, 일회성 입력은 take() 로 소비한다.
//   방향키 / WASD : 이동        Z : 샷(누르고 있으면 연사)
//   X : 궁극기                  Shift : 저속 이동(피탄점 표시)
//   C : 액티브 스킬              E · Space : 물건 줍기 / 구매
//   Esc / P : 일시정지          Enter · Z : 확인

const MOVE_KEYS = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
};
const OWNED = ['Space', 'ShiftLeft', 'ShiftRight', 'KeyZ', 'KeyX', 'KeyC', 'KeyE'];

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();   // 이번 프레임에 눌린 액션
    this.onAny = null;          // 첫 입력 콜백 (오디오 잠금 해제)
    this.block = null;          // true 를 돌려주면 그 키 입력은 게임 액션으로 등록하지 않는다 (대사 중 등)

    window.addEventListener('keydown', (e) => {
      if (this.block && this.block(e)) { if (this._owns(e)) e.preventDefault(); if (this.onAny) this.onAny(e); return; }
      if (e.repeat) { if (this._owns(e)) e.preventDefault(); return; }
      const a = this._action(e.code);
      if (a) { this.down.add(a); this.pressed.add(a); }
      if (this._owns(e)) e.preventDefault();
      if (this.onAny) this.onAny(e);
    });
    window.addEventListener('keyup', (e) => {
      const a = this._action(e.code);
      if (a) this.down.delete(a);
    });
    window.addEventListener('blur', () => { this.down.clear(); });
    window.addEventListener('mousedown', (e) => { if (this.onAny) this.onAny(e); });
  }

  _owns(e) { return e.code in MOVE_KEYS || OWNED.includes(e.code); }

  _action(code) {
    if (code in MOVE_KEYS) return MOVE_KEYS[code];
    switch (code) {
      case 'KeyZ': return 'shot';
      case 'KeyX': return 'ult';
      case 'KeyC': return 'skill';
      case 'KeyE': case 'Space': return 'take';
      case 'ShiftLeft': case 'ShiftRight': return 'focus';
      case 'Escape': case 'KeyP': return 'pause';
      case 'Enter': return 'confirm';
      default: return null;
    }
  }

  held(a) { return this.down.has(a); }
  get shotHeld() { return this.down.has('shot'); }
  get focusHeld() { return this.down.has('focus'); }
  take(a) { const had = this.pressed.has(a); this.pressed.delete(a); return had; }
  /** 이동 벡터 (정규화). invert=true면 조작 반전. */
  move(invert = false) {
    let x = (this.held('right') ? 1 : 0) - (this.held('left') ? 1 : 0);
    let z = (this.held('down') ? 1 : 0) - (this.held('up') ? 1 : 0);
    if (invert) { x = -x; z = -z; }
    const l = Math.hypot(x, z);
    return l > 0 ? [x / l, z / l] : [0, 0];
  }
  endFrame() { this.pressed.clear(); }
}
