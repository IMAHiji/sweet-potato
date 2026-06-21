import { pinyinToZhuyin } from '../src/server/lib/zhuyin.js';

// Fixed table of known pinyin -> zhuyin pairs. Fails loudly on any mismatch.
const cases: ReadonlyArray<readonly [string, string]> = [
  ['ni3', 'ㄋㄧˇ'], // 你
  ['zhong1', 'ㄓㄨㄥ'], // 中
  ['lü4', 'ㄌㄩˋ'], // 綠
  ['lv4', 'ㄌㄩˋ'], // 綠 (v spelling)
  ['er2', 'ㄦˊ'], // 兒
  ['hao3', 'ㄏㄠˇ'], // 好
  ['wo3', 'ㄨㄛˇ'], // 我
  ['shi4', 'ㄕˋ'], // 是 (empty rime)
  ['ri4', 'ㄖˋ'], // 日 (empty rime)
  ['zi5', '˙ㄗ'], // neutral tone, empty rime
  ['yi1', 'ㄧ'], // 一
  ['wu3', 'ㄨˇ'], // 五
  ['yu2', 'ㄩˊ'], // 魚
  ['nü3', 'ㄋㄩˇ'], // 女
  ['jun1', 'ㄐㄩㄣ'], // 軍
  ['xue2', 'ㄒㄩㄝˊ'], // 學
  ['xiong2', 'ㄒㄩㄥˊ'], // 熊
  ['zhuang1', 'ㄓㄨㄤ'], // 莊
  ['liu2', 'ㄌㄧㄡˊ'], // 流
  ['gui4', 'ㄍㄨㄟˋ'], // 貴
  ['lun2', 'ㄌㄨㄣˊ'], // 輪
  ['yan2', 'ㄧㄢˊ'], // 言
  ['ying1', 'ㄧㄥ'], // 英
  ['weng1', 'ㄨㄥ'], // 翁
  ['yuan2', 'ㄩㄢˊ'], // 元
  ['de5', '˙ㄉㄜ'], // 的 (neutral)
  ['ma5', '˙ㄇㄚ'], // 嗎 (neutral)
  ['er2 zi5', 'ㄦˊ ˙ㄗ'], // 兒子 (multi-syllable)
];

let failures = 0;
for (const [pinyin, expected] of cases) {
  let actual: string;
  try {
    actual = pinyinToZhuyin(pinyin);
  } catch (err) {
    actual = `ERROR: ${(err as Error).message}`;
  }
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(
    `${ok ? '✓' : '✗'}  ${pinyin.padEnd(10)} -> ${actual}${ok ? '' : `   (expected ${expected})`}`,
  );
}

if (failures > 0) {
  console.error(`\n✖ ${failures} zhuyin case(s) failed.`);
  process.exit(1);
}
console.log(`\n✓ All ${cases.length} zhuyin cases passed.`);
