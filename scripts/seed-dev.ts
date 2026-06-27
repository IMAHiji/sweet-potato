import { eq } from 'drizzle-orm';
import { db, sqlite } from '../src/server/db/client.js';
import { characters, exampleSentences } from '../src/server/db/schema.js';
import { seedUsers } from './seed-users.js';

await seedUsers(db);

const sampleChars = [
  { traditional: '你', simplified: '你', pinyin: 'nǐ', pinyinSearch: 'ni', zhuyin: 'ㄋㄧˇ', definition: 'you (singular)', hskLevel: 1 },
  { traditional: '好', simplified: '好', pinyin: 'hǎo', pinyinSearch: 'hao', zhuyin: 'ㄏㄠˇ', definition: 'good; well', hskLevel: 1 },
  { traditional: '中', simplified: '中', pinyin: 'zhōng', pinyinSearch: 'zhong', zhuyin: 'ㄓㄨㄥ', definition: 'middle; center; China', hskLevel: 1 },
  { traditional: '文', simplified: '文', pinyin: 'wén', pinyinSearch: 'wen', zhuyin: 'ㄨㄣˊ', definition: 'language; writing; culture', hskLevel: 2 },
  { traditional: '學', simplified: '学', pinyin: 'xué', pinyinSearch: 'xue', zhuyin: 'ㄒㄩㄝˊ', definition: 'to study; to learn', hskLevel: 1 },
  { traditional: '語', simplified: '语', pinyin: 'yǔ', pinyinSearch: 'yu', zhuyin: 'ㄩˇ', definition: 'language; words', hskLevel: 2 },
];

for (const char of sampleChars) {
  const existing = db.select().from(characters).where(eq(characters.traditional, char.traditional)).get();
  if (!existing) {
    db.insert(characters).values(char).run();
    console.log(`Seeded: ${char.traditional}`);
  }
}

const niChar = db.select().from(characters).where(eq(characters.traditional, '你')).get();
if (niChar) {
  const existing = db.select().from(exampleSentences)
    .where(eq(exampleSentences.characterId, niChar.id)).get();
  if (!existing) {
    db.insert(exampleSentences).values([
      {
        characterId: niChar.id,
        traditional: '你好嗎？',
        simplified: '你好吗？',
        pinyin: 'nǐ hǎo ma?',
        zhuyin: 'ㄋㄧˇ ㄏㄠˇ ㄇㄚ？',
        translation: 'How are you?',
        sortOrder: 0,
      },
      {
        characterId: niChar.id,
        traditional: '你是哪裡人？',
        simplified: '你是哪里人？',
        pinyin: 'nǐ shì nǎlǐ rén?',
        translation: 'Where are you from?',
        sortOrder: 1,
      },
    ]).run();
    console.log('Seeded example sentences for 你');
  }
}

console.log('Dev seed complete.');
sqlite.close();
