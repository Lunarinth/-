#!/usr/bin/env python3
"""src/ 의 모듈과 assets/gemini.webp(그림 한 장)를 합쳐 단일 파일 index.html 을 만든다."""
import base64, pathlib
root = pathlib.Path(__file__).parent
img = base64.b64encode((root / 'assets/gemini.webp').read_bytes()).decode()
order = ['sprites.js', 'music.js', 'data.js', 'engine.js', 'ui1.js', 'ui2.js', 'main.js']
chars = {k: base64.b64encode((root / f'assets/chars/{k}.webp').read_bytes()).decode() for k in ['belis','obser','sol','claire']}
js = ''.join((root / 'src' / f).read_text(encoding='utf-8') + '\n' for f in order).replace('__IMG__', img)
for k, v in chars.items():
    js = js.replace(f'__CH_{k}__', v)
css = (root / 'src/style.css').read_text(encoding='utf-8')
body = (root / 'src/body.html').read_text(encoding='utf-8')
html = f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<title>루센트의 벨리스 — 열세 번째 종소리</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;900&family=Noto+Serif+KR:wght@500;900&display=swap" rel="stylesheet">
<style>
{css}
</style></head><body>
{body}
<script>
{js}
</script>
</body></html>'''
(root / 'index.html').write_text(html, encoding='utf-8')
print('index.html', len(html), 'bytes')
