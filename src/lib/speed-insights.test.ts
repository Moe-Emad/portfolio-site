// Unit tests of Speed Insights (tracker F28): npm run test:unit
import assert from 'node:assert/strict';
import test from 'node:test';
import { startSpeedInsights } from './speed-insights.ts';

/** A stand-in for the package that counts how often it was loaded and started. */
function fakePackage() {
  const calls = { loaded: 0, started: 0 };
  const load = async () => {
    calls.loaded += 1;
    return { injectSpeedInsights: () => void (calls.started += 1) };
  };
  return { calls, load };
}

test('Speed Insights starts in the production build on Vercel', async () => {
  const { calls, load } = fakePackage();
  assert.equal(startSpeedInsights('production', load), true);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(calls, { loaded: 1, started: 1 });
});

test('Speed Insights is not even loaded anywhere else', async () => {
  // A preview of a pull request, the dev server, the test build and any other host: '' when not built by Vercel.
  for (const vercelEnv of ['preview', 'development', '']) {
    const { calls, load } = fakePackage();
    assert.equal(startSpeedInsights(vercelEnv, load), false, vercelEnv || '(not on Vercel)');
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(calls, { loaded: 0, started: 0 }, vercelEnv || '(not on Vercel)');
  }
});

test('a package that cannot be loaded leaves the page alone', async () => {
  const failed: unknown[] = [];
  const onUnhandled = (reason: unknown) => failed.push(reason);
  process.on('unhandledRejection', onUnhandled);
  try {
    assert.equal(startSpeedInsights('production', () => Promise.reject(new Error('offline'))), true);
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.deepEqual(failed, [], 'a failed load must not surface as an error on the page');
  } finally {
    process.off('unhandledRejection', onUnhandled);
  }
});
