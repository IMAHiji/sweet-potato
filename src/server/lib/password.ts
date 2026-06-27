import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);
const KEY_LEN = 64;

export async function hash(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}

export async function verify(password: string, stored: string): Promise<boolean> {
  const [salt, storedHash] = stored.split(':');
  if (!salt || !storedHash) return false;
  const key = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  const storedBuf = Buffer.from(storedHash, 'hex');
  if (key.length !== storedBuf.length) return false;
  return timingSafeEqual(key, storedBuf);
}
