import { resolve } from 'node:path';

export const DATA_DIR = resolve(process.cwd(), 'scripts/data');

// Primary source: an open, maintained HSK 3.0 vocabulary dataset that already
// bundles simplified, traditional, pinyin and English meanings per entry.
export const HSK_URL =
  'https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.min.json';
export const HSK_FILE = resolve(DATA_DIR, 'hsk-complete.min.json');

// Optional enrichment: CC-CEDICT (traditional + English definitions). Used only
// as a fallback when the HSK dataset lacks a meaning for an entry.
export const CEDICT_URL =
  'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz';
export const CEDICT_FILE = resolve(DATA_DIR, 'cedict_ts.u8');

// Shape of the minified HSK dataset entries (keys are abbreviated upstream).
export interface HskTranscriptions {
  y: string; // pinyin, tone-marked
  n: string; // pinyin, numbered tones
  w?: string; // wade-giles
  b?: string; // zhuyin (bopomofo) — provided upstream; we derive our own
  g?: string;
}
export interface HskForm {
  t: string; // traditional
  i: HskTranscriptions;
  m: string[]; // meanings
  c?: string[]; // classifiers
}
export interface HskEntry {
  s: string; // simplified
  r?: string; // radical
  l: string[]; // levels, e.g. ["n1","o1","t1"]
  q?: number; // frequency rank
  p?: string[]; // parts of speech
  f: HskForm[]; // forms / readings
}
