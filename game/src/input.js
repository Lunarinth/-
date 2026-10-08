// 키 입력: held = 누르고 있는 중, pressed = 이번 프레임에 처음 눌림
const Input = (() => {
  const held = {}, pressed = {};
  const alias = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'jump', Space: 'jump',
    ArrowDown: 'down', KeyS: 'down',
    ShiftLeft: 'dash', ShiftRight: 'dash', KeyC: 'dash',
    KeyZ: 'throw', KeyJ: 'throw',
    KeyX: 'lob', KeyK: 'lob',
    KeyR: 'restart',
  };
  window.addEventListener('keydown', e => {
    const k = alias[e.code];
    if (!k) return;
    e.preventDefault();
    if (!held[k]) pressed[k] = true;
    held[k] = true;
  });
  window.addEventListener('keyup', e => {
    const k = alias[e.code];
    if (k) held[k] = false;
  });
  window.addEventListener('blur', () => { for (const k in held) held[k] = false; });
  return {
    held: k => !!held[k],
    pressed: k => !!pressed[k],
    endFrame() { for (const k in pressed) pressed[k] = false; },
    // 테스트용: 가상 입력
    _set(k, v) { if (v && !held[k]) pressed[k] = true; held[k] = v; },
  };
})();
