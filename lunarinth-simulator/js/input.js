// 키보드 / 마우스 입력. 게임은 매 프레임 poll 하고, 일회성 입력은 consume 한다.

const MOVE_KEYS = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
};

export class Input {
  constructor(target) {
    this.down = new Set();
    this.pressed = new Set();   // 이번 프레임에 눌린 액션
    this.mouseLeft = false;
    this.mouseRight = false;
    this.onAny = null;          // 첫 입력 콜백 (오디오 잠금 해제)

    window.addEventListener('keydown', (e) => {
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
    window.addEventListener('blur', () => { this.down.clear(); this.mouseLeft = this.mouseRight = false; });
    target.addEventListener('mousedown', (e) => {
      if (e.button === 0) { this.mouseLeft = true; this.pressed.add('click'); }
      if (e.button === 2) { this.mouseRight = true; this.pressed.add('parry'); }
      if (this.onAny) this.onAny(e);
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseLeft = false;
      if (e.button === 2) this.mouseRight = false;
    });
    target.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _owns(e) {
    return e.code in MOVE_KEYS || ['Space', 'ShiftLeft', 'ShiftRight', 'KeyJ', 'KeyZ', 'KeyK', 'KeyX'].includes(e.code);
  }

  _action(code) {
    if (code in MOVE_KEYS) return MOVE_KEYS[code];
    switch (code) {
      case 'KeyJ': case 'KeyZ': return 'attack';
      case 'KeyK': case 'KeyX': return 'parry';
      case 'ShiftLeft': case 'ShiftRight': case 'Space': return 'dash';
      case 'Escape': case 'KeyP': return 'pause';
      case 'Enter': return 'confirm';
      default: return null;
    }
  }

  held(a) { return this.down.has(a); }
  get attackHeld() { return this.down.has('attack') || this.mouseLeft; }
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
