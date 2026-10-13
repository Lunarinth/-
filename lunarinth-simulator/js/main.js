import { Game } from './game.js';
import { installI18n } from './i18n.js';

installI18n(); // 영어 모드면 화면 문구를 영어로 바꿔 끼운다

const game = new Game();
game.init().catch((err) => {
  console.error(err);
  const l = document.getElementById('loading');
  if (l) l.querySelector('.l-text').textContent = '불러오기에 실패했습니다: ' + (err && err.message ? err.message : err);
});
