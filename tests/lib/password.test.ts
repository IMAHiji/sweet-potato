import { describe, it, expect } from 'vitest';
import { hash, verify } from '../../src/server/lib/password.js';

describe('hash()', () => {
  it('returns a string', async () => {
    const result = await hash('mypassword');
    expect(typeof result).toBe('string');
  });

  it('includes a salt separator (salt:hash format)', async () => {
    const result = await hash('mypassword');
    expect(result).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
  });

  it('produces different hashes for the same input (salting)', async () => {
    const h1 = await hash('samepassword');
    const h2 = await hash('samepassword');
    expect(h1).not.toBe(h2);
  });
});

describe('verify()', () => {
  it('returns true for a correct password', async () => {
    const stored = await hash('correct-horse-battery-staple');
    expect(await verify('correct-horse-battery-staple', stored)).toBe(true);
  });

  it('returns false for an incorrect password', async () => {
    const stored = await hash('correct-horse-battery-staple');
    expect(await verify('wrong-password', stored)).toBe(false);
  });

  it('returns false for an empty stored value', async () => {
    expect(await verify('anything', '')).toBe(false);
  });

  it('returns false when stored value has no colon separator', async () => {
    expect(await verify('anything', 'invalidstoredvalue')).toBe(false);
  });
});
