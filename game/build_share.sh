#!/bin/sh
# 공유용 단일 HTML 생성: sh game/build_share.sh > out.html
cd "$(dirname "$0")"
cat <<'HEAD'
<title>월식록 외전</title>
<style>
  :root{--bg:#0c0a14;--panel:#171327;--fg:#e6e2f5;--dim:#9a93b8;--accent:#8fb4ff;--line:#2c2646;color-scheme:dark}
  html,body{height:100%}
  body{background:var(--bg);color:var(--fg);font:14px/1.5 "Noto Sans KR",system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding-inline:16px;padding-block:12px;box-sizing:border-box}
  #wrap{position:relative;width:min(100%,calc((100vh - 120px)*16/9));max-width:960px}
  canvas{display:block;width:100%;aspect-ratio:16/9;background:#000;border:1px solid var(--line)}
  #start{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:rgba(12,10,20,.82);border:0;color:var(--fg);font:inherit;cursor:pointer}
  #start[hidden]{display:none}
  #start b{font-size:clamp(20px,4vw,34px);letter-spacing:.08em}
  #start span{color:var(--accent)}
  .keys{display:flex;flex-wrap:wrap;gap:6px 14px;justify-content:center;color:var(--dim);font-size:13px;margin:0;padding:0;list-style:none}
  kbd{background:var(--panel);border:1px solid var(--line);border-radius:4px;padding:1px 6px;color:var(--fg);font:12px monospace}
  #pad{display:none;width:100%;max-width:960px;justify-content:space-between;gap:8px}
  #pad div{display:flex;gap:8px}
  #pad button{width:56px;height:56px;border-radius:50%;border:1px solid var(--line);background:var(--panel);color:var(--fg);font:13px inherit;touch-action:none}
  @media (pointer:coarse){#pad{display:flex}.keys{display:none}}
</style>
<div id="wrap">
<canvas id="c" width="960" height="540"></canvas>
<button id="start" type="button"><b>月蝕録 外傳</b><span>클릭하면 시작합니다</span></button>
</div>
<ul class="keys">
<li><kbd>←</kbd><kbd>→</kbd> 이동</li><li><kbd>Space</kbd> 점프</li><li><kbd>Shift</kbd> 대시</li>
<li><kbd>Z</kbd> 나이프</li><li><kbd>X</kbd> 포물선</li><li><kbd>Q</kbd> 시간 감속장</li><li><kbd>R</kbd> 재시작</li>
</ul>
<div id="pad">
<div><button data-k="left">◀</button><button data-k="right">▶</button></div>
<div><button data-k="time">시간</button><button data-k="dash">대시</button><button data-k="lob">포물</button><button data-k="throw">던짐</button><button data-k="jump">점프</button></div>
</div>
HEAD
echo '<script>'
cat src/input.js src/maps.js src/game.js
cat <<'TAIL'

document.getElementById('start').addEventListener('click',function(){this.hidden=true;window.focus();});
document.querySelectorAll('#pad button').forEach(function(b){
  var k=b.dataset.k;
  b.addEventListener('pointerdown',function(e){e.preventDefault();window.__game.Input._set(k,true);});
  ['pointerup','pointerleave','pointercancel'].forEach(function(t){b.addEventListener(t,function(){window.__game.Input._set(k,false);});});
});
TAIL
echo '</script>'
