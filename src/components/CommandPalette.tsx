import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent } from 'react';
import { content } from '../content/index.ts';
import { filterCommands, moveActive, paletteCommands } from '../lib/palette.js';
import { toggleTheme } from '../lib/theme.js';

type Run = { go?: string; open?: string; copy?: string; theme?: string };
type Command = { id: string; label: string; kind: string; run: Run };

/**
 * The command palette (tracker F7): Ctrl+K (Cmd+K on a Mac) or the Search button opens a small window to jump
 * to a section or a project, switch the theme or copy a link - the way developers drive their tools.
 * It is a native <dialog>, so the browser keeps the keyboard inside it and Escape closes it. The list follows
 * the "combobox with a listbox" pattern: the cursor stays in the field, the arrow keys move the highlight.
 */
export default function CommandPalette({ home, sections }: { home: boolean; sections: { id: string; label: string }[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [note, setNote] = useState('');
  const listId = useId();

  const commands: Command[] = paletteCommands({ home, sections, projects: content.projects, links: content.profile.links });
  const shown: Command[] = filterCommands(commands, query);
  const current = shown[Math.min(active, shown.length - 1)];

  const open = () => {
    if (dialog.current?.open) return;
    setQuery('');
    setActive(0);
    setNote('');
    dialog.current?.showModal();
    input.current?.focus();
  };
  const close = () => dialog.current?.close();

  // Ctrl+K or Cmd+K, anywhere on the page.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (dialog.current?.open) dialog.current.close();
        else {
          setQuery('');
          setActive(0);
          setNote('');
          dialog.current?.showModal();
          input.current?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Keep the highlighted command in view while the arrow keys move through a long list.
  useEffect(() => {
    if (current) document.getElementById(`${listId}-${current.id}`)?.scrollIntoView({ block: 'nearest' });
  }, [current, listId]);

  const run = async (command: Command) => {
    const { go, open: address, copy, theme } = command.run;
    if (theme) {
      toggleTheme();
      close();
    } else if (copy) {
      try {
        await navigator.clipboard.writeText(copy);
        setNote('Copied to the clipboard.');
      } catch {
        // No clipboard access (an old browser, or a page without HTTPS): show the text to copy by hand.
        setNote(copy);
      }
    } else if (address) {
      window.open(address, '_blank', 'noopener,noreferrer');
      close();
    } else if (go) {
      close();
      window.location.assign(go);
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(moveActive(Math.min(active, shown.length - 1), event.key === 'ArrowDown' ? 1 : -1, shown.length));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setActive(event.key === 'Home' ? 0 : Math.max(shown.length - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (current) void run(current);
    }
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    setActive(0);
    setNote('');
  };

  // A click on the dimmed page around the window closes it; a click inside does not.
  const onDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialog.current) close();
  };

  return (
    <>
      <button type="button" className="palette-button" onClick={open} aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
          <circle cx="10.5" cy="10.5" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.9" />
          <path d="M15.2 15.2 20.5 20.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
        <span>Search</span>
        <kbd aria-hidden="true">Ctrl K</kbd>
      </button>

      <dialog ref={dialog} className="palette" aria-label="Search the site" onClick={onDialogClick}>
        <div className="palette__box">
          <label htmlFor={`${listId}-input`} className="sr-only">
            Go to a section or a project, or run an action
          </label>
          <input
            ref={input}
            id={`${listId}-input`}
            className="palette__input"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={current ? `${listId}-${current.id}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            placeholder="Search sections, projects, actions"
            value={query}
            onChange={onChange}
            onKeyDown={onKeyDown}
          />

          <ul id={listId} className="palette__list" role="listbox" aria-label="Commands">
            {shown.map((command) => (
              <li
                key={command.id}
                id={`${listId}-${command.id}`}
                role="option"
                aria-selected={command.id === current?.id}
                onClick={() => void run(command)}
                onMouseMove={() => setActive(shown.indexOf(command))}
              >
                <span>{command.label}</span>
                <span className="palette__kind">{command.kind}</span>
              </li>
            ))}
          </ul>

          <p className="palette__note" role="status">
            {note || (shown.length === 0 ? 'Nothing matches. Try the name of a project or a technology.' : '')}
          </p>

          <p className="palette__keys" aria-hidden="true">
            <span>
              <kbd>↑</kbd> <kbd>↓</kbd> move
            </span>
            <span>
              <kbd>Enter</kbd> choose
            </span>
            <span>
              <kbd>Esc</kbd> close
            </span>
          </p>
        </div>
      </dialog>
    </>
  );
}
