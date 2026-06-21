import { resolve } from 'node:path';

export const DATA_DIR = resolve(process.cwd(), 'scripts/data');

// HSK 3.0 vocabulary dataset. Drives *selection + grading* only: which
// characters to include, their HSK level and frequency rank, and their
// traditional form (used as the MOEDICT lookup key).
export const HSK_URL =
  'https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.min.json';
export const HSK_FILE = resolve(DATA_DIR, 'hsk-complete.min.json');

// CC-CEDICT: the source of the English gloss (keyed by traditional headword).
export const CEDICT_URL =
  'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz';
export const CEDICT_FILE = resolve(DATA_DIR, 'cedict_ts.u8');

// MOEDICT 國語 (萌典 / 教育部國語辭典): the source of authoritative Zhuyin and the
// Chinese definition. The full dictionary is only published as an .xz dump
// (~75 MB uncompressed, needs an LZMA dep Node lacks), and we only need the
// HSK-selected single characters — so we fetch those per character from the
// per-entry API and cache them under MOEDICT_DIR. Reproducible offline once
// the cache is populated.
export const MOEDICT_API_BASE = 'https://www.moedict.tw/uni/';
export const MOEDICT_DIR = resolve(DATA_DIR, 'moedict');

/** One MOEDICT 國語 reading (heteronym) of a headword. */
export interface MoedictDefinition {
  type?: string; // part of speech, e.g. "代", "名", "動"
  def: string; // the Chinese definition text
  example?: string[];
  quote?: string[];
  link?: string[];
}
export interface MoedictHeteronym {
  bopomofo?: string; // zhuyin, e.g. "ㄋㄧˇ"
  bopomofo2?: string;
  pinyin?: string; // tone-marked pinyin, e.g. "nǐ"
  definitions?: MoedictDefinition[];
}
export interface MoedictEntry {
  title: string; // headword (traditional)
  heteronyms?: MoedictHeteronym[];
}

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
