import { existsSync } from 'node:fs';
import { z } from 'zod';

// In dev/local we load a .env file; in production the platform injects env vars.
// `process.loadEnvFile` is available on Node 20.12+ / 21+.
const envFile = process.env.ENV_FILE ?? '.env';
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const EnvSchema = z.object({
  // Filesystem path to the SQLite database file. The directory is created on
  // startup if missing.
  DATABASE_PATH: z.string().min(1).default('./data/sweet-potato.db'),
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters'),
  ADMIN_EMAIL: z.string().min(3),
  ADMIN_PASSWORD: z.string().min(1),
  TEST_USER_EMAIL: z.string().min(3),
  TEST_USER_PASSWORD: z.string().min(1),
  HSK_LEVELS: z
    .string()
    .regex(/^\d+(-\d+)?$/, 'HSK_LEVELS must look like "1-3" or "2"')
    .default('1-3'),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    console.error(
      `\n✖ Invalid environment configuration:\n${issues}\n\nCopy .env.example to .env and fill in the values.\n`,
    );
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();

export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';

/** Parse `HSK_LEVELS` ("1-3" | "2") into an inclusive numeric range. */
export function parseHskLevels(value: string = env.HSK_LEVELS): {
  min: number;
  max: number;
} {
  const parts = value.split('-').map((n) => parseInt(n, 10));
  const min = parts[0] ?? 1;
  const max = parts[1] ?? min;
  return { min: Math.min(min, max), max: Math.max(min, max) };
}
