import { Game } from './game.js';

const game = new Game();
game.init().catch((err) => {
  console.error(err);
  const l = document.getElementById('loading');
  if (l) l.querySelector('.l-text').textContent = '불러오기에 실패했습니다: ' + (err && err.message ? err.message : err);
});
