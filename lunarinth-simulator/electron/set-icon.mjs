// Windows exe 의 아이콘 · 버전 정보를 바꾼다 (Linux 에서도 동작 — wine 불필요).
//   node electron/set-icon.mjs <exe> <ico>        (먼저: npm i resedit@2 pe-library@1)
import fs from 'fs';
import * as ResEdit from 'resedit';
import * as PELibrary from 'pe-library';

const [exePath, icoPath] = process.argv.slice(2);
const exe = PELibrary.NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true });
const res = PELibrary.NtExecutableResource.from(exe);
const ico = ResEdit.Data.IconFile.from(fs.readFileSync(icoPath));
// 기존 아이콘 그룹을 모두 새 아이콘으로 교체
const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
const ids = groups.length ? groups.map((g) => [g.id, g.lang]) : [[1, 1033]];
for (const [id, lang] of ids) ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, id, lang, ico.icons.map((i) => i.data));
// 버전 정보
const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0] || ResEdit.Resource.VersionInfo.createEmpty();
const lang = { lang: 1033, codepage: 1200 };
vi.setStringValues(lang, { ProductName: 'LUCENT NOCTURNE', FileDescription: 'LUCENT NOCTURNE — 루센트 야상곡', CompanyName: 'Lunarinth', InternalName: 'LucentNocturne', OriginalFilename: 'LucentNocturne.exe', LegalCopyright: '', ProductVersion: '5.1.0', FileVersion: '5.1.0' });
vi.setFileVersion(5, 1, 0, 0, 1033); vi.setProductVersion(5, 1, 0, 0, 1033);
vi.outputToResourceEntries(res.entries);
res.outputResource(exe);
fs.writeFileSync(exePath, Buffer.from(exe.generate()));
console.log('icon set:', exePath);
