// Unit tests of the addresses (tracker F3): npm run test:unit
import assert from 'node:assert/strict';
import test from 'node:test';
import { WORK_PATH, matchRoute, projectPath } from './routes.ts';

const SLUGS = ['rplms-v2', 'relic'];

test('the home page answers to / and to /index.html', () => {
  assert.deepEqual(matchRoute('/', SLUGS), { page: 'home' });
  assert.deepEqual(matchRoute('', SLUGS), { page: 'home' });
  assert.deepEqual(matchRoute('/index.html', SLUGS), { page: 'home' });
});

test('a project page answers with and without the closing slash', () => {
  for (const path of ['/work/relic/', '/work/relic', '/work/relic/index.html']) {
    assert.deepEqual(matchRoute(path, SLUGS), { page: 'project', slug: 'relic' }, path);
  }
  assert.equal(projectPath('relic'), '/work/relic/');
  assert.deepEqual(matchRoute(projectPath('rplms-v2'), SLUGS), { page: 'project', slug: 'rplms-v2' });
});

// The list of work has an address of its own (tracker B6).
test('the list of work answers to /work/, with and without the closing slash', () => {
  for (const path of ['/work/', '/work', '/work/index.html']) {
    assert.deepEqual(matchRoute(path, SLUGS), { page: 'work' }, path);
  }
  assert.equal(WORK_PATH, '/work/');
});

test('an unknown project and any other address are "not found"', () => {
  for (const path of ['/work/nope/', '/about', '/work/relic/extra', '/WORK/relic/', '/works/']) {
    assert.deepEqual(matchRoute(path, SLUGS), { page: 'not-found' }, path);
  }
});
