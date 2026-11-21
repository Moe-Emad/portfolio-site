#!/usr/bin/env node
'use strict';
// The admin panel (tracker F6): Pages CMS (https://pagescms.org) edits the files of content/ through forms and
// saves by committing to the repository. There is no database, and nothing is added to the public site.
// Pages CMS reads its settings from .pages.yml in the root of the repo. That file is written by this script from
// the description below, so there is one place to change:
//   npm run cms-config      writes .pages.yml
// Pages CMS saves only the fields named in its settings - a field left out here would be dropped from the JSON
// file on the next save. tools/build/pages-cms.test.cjs fails when a field of the content is missing here, or
// when .pages.yml is not the output of this script.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

// Shorthands for the fields. "required" is the default: the schema (src/content/schema.ts) wants most fields.
const text = (name, label, extra = {}) => ({ name, label, type: 'string', required: true, ...extra });
const long = (name, label, extra = {}) => ({ name, label, type: 'text', required: true, ...extra });
const choice = (name, label, values) => ({ name, label, type: 'select', required: true, options: { values } });

const CONFIG = {
  media: {
    input: 'public/images',
    output: '/images',
  },
  content: [
    {
      name: 'profile',
      label: 'Profile',
      type: 'file',
      path: 'content/profile.json',
      format: 'json',
      fields: [
        text('name', 'Name'),
        text('nameArabic', 'Name in Arabic'),
        text('role', 'Role', { description: 'For example: Software engineer' }),
        text('location', 'Country'),
        long('headline', 'Headline', { description: 'One sentence under the name on the home page.' }),
        long('about', 'About', { list: true, description: 'The paragraphs of "How I work".' }),
        {
          name: 'links',
          label: 'Links',
          type: 'object',
          fields: [
            text('linkedin', 'LinkedIn address', { description: 'Starts with https://' }),
            text('github', 'GitHub address', { required: false }),
            text('email', 'Email address', { required: false, description: 'Shown in the contact section and at the end of every project page, with a copy button.' }),
          ],
        },
        text('availability', 'Availability', { required: false, description: 'One line beside the contact form: what you are open to and where you work from.' }),
      ],
    },
    {
      name: 'experience',
      label: 'Experience',
      type: 'file',
      path: 'content/experience.json',
      format: 'json',
      list: true,
      fields: [
        text('id', 'Short id', { description: 'Lower-case words with hyphens. Never change it once set.' }),
        text('role', 'Role'),
        text('organisation', 'Organisation'),
        text('organisationNote', 'What the organisation is', { required: false }),
        text('start', 'Start month', { description: 'YYYY-MM, for example 2023-07', pattern: { regex: '^\\d{4}-(0[1-9]|1[0-2])$', message: 'Write the month as YYYY-MM' } }),
        text('end', 'End month', { required: false, description: 'YYYY-MM. Leave empty for a job that is still going.' }),
        long('highlights', 'What I did', { list: true }),
        text('project', 'Project on this site', { required: false, description: 'The short name of its project page, for example jpro-website. Leave empty when there is none.' }),
      ],
    },
    {
      name: 'skills',
      label: 'Skills',
      type: 'file',
      path: 'content/skills.json',
      format: 'json',
      list: true,
      fields: [
        text('group', 'Group'),
        text('note', 'What the group is for'),
        text('skills', 'Skills', { list: true, description: 'Write each one exactly as in the "Built with" lists of the projects.' }),
      ],
    },
    {
      name: 'projects',
      label: 'Projects',
      type: 'collection',
      path: 'content/projects',
      format: 'json',
      filename: '{fields.slug}.json',
      view: { fields: ['title', 'kind', 'status'], primary: 'title', sort: ['order'] },
      fields: [
        text('slug', 'Address of the page', { description: 'Lower-case words with hyphens, like "rental-platform". The page is /work/<this>/.', pattern: { regex: '^[a-z0-9]+(-[a-z0-9]+)*$', message: 'Lower-case words joined by hyphens' } }),
        text('title', 'Title'),
        text('titleArabic', 'Title in Arabic', { required: false }),
        long('summary', 'Summary', { description: 'One line, at most 180 characters. Shown in lists and link previews.' }),
        choice('kind', 'Kind', ['Client work', 'Own product', 'Modernization', 'Work experience', 'Earlier work']),
        text('year', 'Year', { required: false }),
        choice('status', 'Status', ['Live', 'In progress', 'Finished', 'Prototype']),
        { name: 'featured', label: 'Show with a picture on the home page', type: 'boolean' },
        { name: 'draft', label: 'Draft: hide it from the whole site', type: 'boolean', description: 'The file is kept. Switch it off to show the project again.' },
        { name: 'order', label: 'Position in the list', type: 'number', required: true, description: 'Low numbers come first.' },
        long('role', 'My part'),
        text('stack', 'Built with', { list: true }),
        long('description', 'What it is', { list: true, description: 'One entry per paragraph.' }),
        {
          name: 'highlights',
          label: 'Worth a closer look',
          type: 'object',
          list: true,
          fields: [text('title', 'Title'), long('text', 'Text')],
        },
        {
          name: 'facts',
          label: 'Measured facts',
          type: 'object',
          list: true,
          description: 'Only figures that were counted. Never an estimate.',
          fields: [text('value', 'Figure'), text('label', 'What it counts')],
        },
        {
          name: 'images',
          label: 'Pictures',
          type: 'object',
          list: true,
          description: 'The first picture is the cover. After adding pictures, run "npm run pictures" to fill in their sizes.',
          fields: [
            { name: 'src', label: 'Picture', type: 'image', required: true },
            long('alt', 'What the picture shows', { description: 'For people who cannot see it.' }),
            text('caption', 'Caption', { required: false }),
            choice('device', 'Taken on', ['desktop', 'phone']),
            { name: 'width', label: 'Width in pixels', type: 'number' },
            { name: 'height', label: 'Height in pixels', type: 'number' },
          ],
        },
        {
          name: 'links',
          label: 'Links',
          type: 'object',
          fields: [text('live', 'Address of the live site', { required: false }), text('liveLabel', 'Text of the button', { required: false })],
        },
      ],
    },
    {
      name: 'archive',
      label: 'Smaller and earlier work',
      type: 'file',
      path: 'content/archive.json',
      format: 'json',
      list: true,
      fields: [text('title', 'Title'), text('tech', 'Built with'), text('summary', 'Summary')],
    },
  ],
};

/** A JS value as YAML, block style. Strings are written with double quotes, which YAML reads like JSON. */
function toYaml(value, indent = 0) {
  const pad = '  '.repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.every((item) => typeof item !== 'object')) return `[${value.map((item) => JSON.stringify(item)).join(', ')}]`;
    return value
      .map((item) => {
        const body = toYaml(item, indent + 1);
        return `${pad}- ${body.trimStart()}`;
      })
      .join('\n');
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value)
      .map(([key, inner]) => {
        const nested = inner !== null && typeof inner === 'object' && !(Array.isArray(inner) && inner.every((item) => typeof item !== 'object'));
        return nested ? `${pad}${key}:\n${toYaml(inner, indent + 1)}` : `${pad}${key}: ${toYaml(inner, indent + 1)}`;
      })
      .join('\n');
  }
  return JSON.stringify(value);
}

const HEADER = [
  '# Settings of the admin panel (Pages CMS, https://pagescms.org) - tracker F6.',
  '# Do not edit this file by hand: it is written by "npm run cms-config" from tools/build/pages-cms.cjs.',
  '# How to use the panel: docs/admin.md',
  '',
].join('\n');

function configYaml() {
  return `${HEADER}${toYaml(CONFIG)}\n`;
}

/**
 * The fields of a content file that the settings do not name: Pages CMS would drop them on the next save.
 * value: the parsed JSON (an object, or one entry of a list); fields: the field list of the settings.
 */
function missingFields(value, fields, trail = '') {
  const missing = [];
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return missing;
  for (const [key, inner] of Object.entries(value)) {
    const field = fields.find((candidate) => candidate.name === key);
    if (!field) {
      missing.push(`${trail}${key}`);
      continue;
    }
    if (field.type === 'object' && field.fields) {
      const entries = Array.isArray(inner) ? inner : [inner];
      for (const entry of entries) missing.push(...missingFields(entry, field.fields, `${trail}${key}.`));
    }
  }
  return [...new Set(missing)];
}

if (require.main === module) {
  fs.writeFileSync(path.join(ROOT, '.pages.yml'), configYaml());
  console.log('cms-config: .pages.yml written');
}

module.exports = { CONFIG, configYaml, missingFields, toYaml };
