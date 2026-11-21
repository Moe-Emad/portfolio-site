// Unit tests of the palette commands (tracker F7): npm run test:unit
import assert from 'node:assert/strict';
import test from 'node:test';
import { filterCommands, moveActive, paletteCommands } from './palette.js';

const INPUT = {
  sections: [
    { id: 'work', label: 'Work' },
    { id: 'contact', label: 'Contact' },
  ],
  projects: [
    { slug: 'relic', title: 'Relic', kind: 'Own product', summary: 'Reads an old codebase.', stack: ['Python', 'Next.js'] },
    { slug: 'molok-el-sook', title: 'Molok El-Sook', titleArabic: 'ملوك السوق', kind: 'Own product', summary: 'A party game.', stack: ['JavaScript'] },
  ],
  links: { linkedin: 'https://www.linkedin.com/in/someone/', github: 'https://github.com/someone' },
};
const ids = (commands) => commands.map((command) => command.id);

test('sections lead within the home page, and back to it from any other page', () => {
  const home = paletteCommands({ ...INPUT, home: true });
  const other = paletteCommands({ ...INPUT, home: false });
  assert.deepEqual(home.find((command) => command.id === 'section-work').run, { go: '#work' });
  assert.deepEqual(other.find((command) => command.id === 'section-work').run, { go: '/#work' });
  assert.deepEqual(home.find((command) => command.id === 'project-relic').run, { go: '/work/relic/' });
});

test('the commands come in a fixed order: sections, projects, actions', () => {
  assert.deepEqual(ids(paletteCommands({ ...INPUT, home: true })), [
    'section-work',
    'section-contact',
    'project-relic',
    'project-molok-el-sook',
    'theme',
    'copy-linkedin',
    'open-linkedin',
    'open-github',
  ]);
  const withoutGithub = paletteCommands({ ...INPUT, home: true, links: { linkedin: INPUT.links.linkedin } });
  assert.ok(!ids(withoutGithub).includes('open-github'));
});

test('nothing typed shows everything; typing narrows it down', () => {
  const commands = paletteCommands({ ...INPUT, home: true });
  assert.equal(filterCommands(commands, '   ').length, commands.length);
  assert.deepEqual(ids(filterCommands(commands, 'rel')), ['project-relic']);
  assert.deepEqual(ids(filterCommands(commands, 'DARK')), ['theme']);
  assert.deepEqual(ids(filterCommands(commands, 'xyz')), []);
});

test('a project is found by what it was built with and by its Arabic name', () => {
  const commands = paletteCommands({ ...INPUT, home: true });
  assert.deepEqual(ids(filterCommands(commands, 'python')), ['project-relic']);
  assert.deepEqual(ids(filterCommands(commands, 'ملوك')), ['project-molok-el-sook']);
  assert.deepEqual(ids(filterCommands(commands, 'project')), ['project-relic', 'project-molok-el-sook']);
});

test('every typed word must match, and a match in the name comes first', () => {
  const commands = paletteCommands({ ...INPUT, home: true });
  assert.deepEqual(ids(filterCommands(commands, 'own game')), ['project-molok-el-sook']);
  // "contact" is the name of a section and an extra word of two actions.
  assert.deepEqual(ids(filterCommands(commands, 'contact')), ['section-contact', 'copy-linkedin', 'open-linkedin']);
});

// The email address (tracker F62): before, the palette's hint invited "the name of a project or a technology", yet
// "email", "hire" or "cv" found nothing.
test('with an email address the palette writes or copies it, and finds it by email, mail, hire or contact', () => {
  const email = 'someone@example.com';
  const commands = paletteCommands({ ...INPUT, home: true, links: { ...INPUT.links, email } });
  assert.deepEqual(commands.find((command) => command.id === 'write-email').run, { go: `mailto:${email}` });
  assert.deepEqual(commands.find((command) => command.id === 'copy-email').run, { copy: email });
  for (const word of ['email', 'mail', 'hire']) assert.deepEqual(ids(filterCommands(commands, word)), ['write-email', 'copy-email'], word);
  assert.ok(ids(filterCommands(commands, 'contact')).includes('write-email'));
  assert.ok(!ids(paletteCommands({ ...INPUT, home: true })).includes('write-email'), 'no address, no command');
});

test('the arrow keys go round at the ends of the list', () => {
  assert.equal(moveActive(0, 1, 3), 1);
  assert.equal(moveActive(2, 1, 3), 0);
  assert.equal(moveActive(0, -1, 3), 2);
  assert.equal(moveActive(0, 1, 0), 0);
});
