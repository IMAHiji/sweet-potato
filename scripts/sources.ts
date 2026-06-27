export const SOURCES = {
  HSK: {
    url: 'https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/master/complete.min.json',
    filename: 'hsk-complete.min.json',
    license: 'MIT',
    description:
      'HSK 3.0 complete vocabulary (n1–n7), simplified/traditional/pinyin/meanings/levels',
  },
  CEDICT: {
    url: 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz',
    filename: 'cedict_ts.u8.gz',
    license: 'CC BY-SA 4.0',
    description: 'CC-CEDICT Chinese-English dictionary',
  },
} as const;
