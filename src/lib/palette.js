// The commands of the palette (tracker F7), kept apart from the page so they can be tested without a browser.

/**
 * Every command the palette offers, in the order it shows them.
 * home: true on the home page (sections are "#work" there, "/#work" elsewhere).
 * Returns [{ id, label, kind, words, run }] where run is one of
 *   { go: address }      move to an address of the site
 *   { open: address }    open another site in a new tab
 *   { copy: text }       put a text on the clipboard
 *   { theme: 'toggle' }  switch between the light and the dark theme
 */
export function paletteCommands({ home, sections, projects, links }) {
  const base = home ? '' : '/';
  return [
    ...sections.map((section) => ({
      id: `section-${section.id}`,
      label: section.label,
      kind: 'Section',
      words: section.id,
      run: { go: `${base}#${section.id}` },
    })),
    ...projects.map((project) => ({
      id: `project-${project.slug}`,
      label: project.title,
      kind: 'Project',
      // A project is found by its name, what it is and what it was built with.
      words: [project.titleArabic, project.kind, project.summary, ...project.stack].filter(Boolean).join(' '),
      run: { go: `/work/${project.slug}/` },
    })),
    { id: 'theme', label: 'Switch between the light and the dark theme', kind: 'Action', words: 'colour color mode night day', run: { theme: 'toggle' } },
    { id: 'copy-linkedin', label: 'Copy the LinkedIn address', kind: 'Action', words: 'contact share link', run: { copy: links.linkedin } },
    { id: 'open-linkedin', label: 'Open LinkedIn', kind: 'Action', words: 'contact profile', run: { open: links.linkedin } },
    ...(links.github ? [{ id: 'open-github', label: 'Open GitHub', kind: 'Action', words: 'code repositories profile', run: { open: links.github } }] : []),
    // The email address (tracker F62): found by the words a recruiter or a client would type.
    ...(links.email
      ? [
          { id: 'write-email', label: 'Write an email', kind: 'Action', words: `contact hire job mail ${links.email}`, run: { go: `mailto:${links.email}` } },
          { id: 'copy-email', label: 'Copy the email address', kind: 'Action', words: `contact hire job mail ${links.email}`, run: { copy: links.email } },
        ]
      : []),
  ];
}

const plain = (text) => text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

/**
 * The commands that match what was typed: every typed word must appear in the label, the kind or the extra
 * words of a command. Commands whose label matches come before those found only by their extra words.
 * Nothing typed: all commands.
 */
export function filterCommands(commands, query) {
  const words = plain(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return commands;
  const scored = [];
  for (const command of commands) {
    const label = plain(command.label);
    const all = `${label} ${plain(command.kind)} ${plain(command.words ?? '')}`;
    if (!words.every((word) => all.includes(word))) continue;
    scored.push({ command, inLabel: words.every((word) => label.includes(word)) });
  }
  return [...scored.filter((entry) => entry.inLabel), ...scored.filter((entry) => !entry.inLabel)].map((entry) => entry.command);
}

/** The next position in a list of the given length, going round at the ends. step: +1 or -1. */
export function moveActive(index, step, length) {
  if (length === 0) return 0;
  return (index + step + length) % length;
}
