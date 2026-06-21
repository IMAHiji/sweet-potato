import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DATA_DIR } from '../sources.js';

const AUDIO_CACHE_DIR = resolve(DATA_DIR, 'audio');

export interface TtsConfig {
  key: string;
  region: string;
  voice: string;
  format: string;
}

export interface RenderedAudio {
  mime: string;
  bytes: Buffer;
  voice: string;
}

/**
 * Read the Azure Speech config from the environment. Returns null when the
 * key/region aren't set, so the seed can run without audio. Azure credentials
 * are seed-time only — the app server never needs them.
 */
export function ttsConfigFromEnv(): TtsConfig | null {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) return null;
  return {
    key,
    region,
    voice: process.env.AZURE_TTS_VOICE ?? 'zh-TW-HsiaoChenNeural',
    format: process.env.AZURE_TTS_FORMAT ?? 'audio-24khz-48kbitrate-mono-mp3',
  };
}

/** MIME type for an Azure `X-Microsoft-OutputFormat` value. */
function mimeForFormat(format: string): string {
  if (format.includes('mp3')) return 'audio/mpeg';
  if (format.includes('opus') || format.includes('ogg')) return 'audio/ogg';
  if (format.includes('webm')) return 'audio/webm';
  return 'audio/wav';
}

const xmlEscape = (s: string): string =>
  s.replace(/[&<>"']/g, (c) =>
    c === '&'
      ? '&amp;'
      : c === '<'
        ? '&lt;'
        : c === '>'
          ? '&gt;'
          : c === '"'
            ? '&quot;'
            : '&apos;',
  );

function cachePath(cfg: TtsConfig, text: string): string {
  const hash = createHash('sha1')
    .update(`${cfg.voice}|${cfg.format}|${text}`)
    .digest('hex');
  return resolve(AUDIO_CACHE_DIR, `${hash}.audio`);
}

/**
 * Render `text` to zh-TW speech via the Azure Speech REST API, caching the
 * bytes on disk by (voice, format, text) so re-seeding never re-bills. Throws
 * on a non-2xx response.
 */
export async function renderAudio(
  text: string,
  cfg: TtsConfig,
): Promise<RenderedAudio> {
  const mime = mimeForFormat(cfg.format);
  const cache = cachePath(cfg, text);
  mkdirSync(AUDIO_CACHE_DIR, { recursive: true });

  if (existsSync(cache)) {
    return { mime, bytes: readFileSync(cache), voice: cfg.voice };
  }

  const ssml =
    `<speak version='1.0' xml:lang='zh-TW'>` +
    `<voice xml:lang='zh-TW' name='${cfg.voice}'>${xmlEscape(text)}</voice>` +
    `</speak>`;

  const res = await fetch(
    `https://${cfg.region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': cfg.key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': cfg.format,
        'User-Agent': 'sweet-potato-seed',
      },
      body: ssml,
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Azure TTS ${res.status} ${res.statusText} ${detail}`.trim());
  }

  const bytes = Buffer.from(await res.arrayBuffer());
  writeFileSync(cache, bytes);
  return { mime, bytes, voice: cfg.voice };
}
