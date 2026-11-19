#!/usr/bin/env node
'use strict';
// Commits never name an AI tool as author or co-author (a working rule of this repo): no "Co-Authored-By" trailer
// of an assistant, no "Generated with ..." line, no bot author. Read-only; exit 1 on any finding.
//   node tools/dev/commit-attribution.cjs --file <message file>    (.githooks/commit-msg)
//   node tools/dev/commit-attribution.cjs --range <base>..<head>   (the gate)
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const TOOLS = 'claude|anthropic|copilot|chatgpt|openai|cursor|gemini|codex';
const ATTRIBUTION = new RegExp(
  `co-authored-by:[^\\n]*(${TOOLS})|generated (with|by) \\[?(${TOOLS})|noreply@anthropic\\.com`,
  'i',
);
const BOT_AUTHOR = /claude|anthropic|copilot\[bot\]/i;
const HINT = 'Remove the line and commit again.';

/** The first line of a commit message that names an AI tool, or undefined. */
function attributionLine(message) {
  return message.split('\n').find((line) => ATTRIBUTION.test(line));
}

function main() {
  const [mode, value] = process.argv.slice(2);
  const findings = [];

  if (mode === '--file' && value) {
    // Like git: the message ends at the scissors line ("git commit -v" puts the diff below it); comment lines are
    // not part of it.
    const raw = fs.readFileSync(value, 'utf8');
    const scissors = raw.search(/^# -+ >8 -+$/m);
    const text = (scissors > -1 ? raw.slice(0, scissors) : raw).replace(/^#.*$/gm, '');
    const line = attributionLine(text);
    if (line) findings.push(`commit message: "${line.trim()}"`);
  } else if (mode === '--range' && value) {
    // %x1f between fields, %x1e between commits; merge commits are checked too.
    const out = execFileSync('git', ['log', '--format=%h%x1f%an <%ae>%x1f%B%x1e', value], { encoding: 'utf8' });
    for (const entry of out.split('\x1e')) {
      const [sha, author, body = ''] = entry.replace(/^\s+/, '').split('\x1f');
      if (!sha) continue;
      if (BOT_AUTHOR.test(author)) findings.push(`${sha}: author ${author}`);
      const line = attributionLine(body);
      if (line) findings.push(`${sha}: "${line.trim()}"`);
    }
  } else {
    console.error('usage: commit-attribution.cjs --file <message file> | --range <base>..<head>');
    return 2;
  }

  if (findings.length) {
    console.error(`Commits never name an AI tool as author or co-author:\n  ${findings.join('\n  ')}\n${HINT}`);
    return 1;
  }
  return 0;
}

if (require.main === module) process.exit(main());

module.exports = { attributionLine };
