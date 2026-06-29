/**
 * Global test setup: set required env vars before any server module is imported.
 * This file is listed in vitest.config.ts -> test.setupFiles and runs in each
 * test worker before the test file's own imports are resolved.
 */
process.env['DATABASE_URL'] = ':memory:';
process.env['SESSION_SECRET'] = 'test-secret-at-least-32-characters-long!!';
process.env['NODE_ENV'] = 'test';
process.env['ADMIN_EMAIL'] = 'admin@test.example.com';
process.env['ADMIN_PASSWORD'] = 'testpassword123';
process.env['TEST_USER_EMAIL'] = 'testuser@test.example.com';
process.env['TEST_USER_PASSWORD'] = 'testpassword123';
process.env['HSK_LEVELS'] = '1-3';
