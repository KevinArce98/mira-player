import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface ComboboxOption {
  id: string | undefined;
  label: string;
}

export function CategoryCombobox({
  options,
  selectedId,
  onSelect,
  placeholder,
}: {
  options: ComboboxOption[];
  selectedId: string | undefined;
  onSelect: (id: string | undefined) => void;
  placeholder: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const wasOpenRef = useRef(false);
  const scrollNeededRef = useRef(false);

  const selectedLabel = options.find((o) => o.id === selectedId)?.label ?? placeholder;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  useEffect(() => {
    if (highlighted >= filtered.length) setHighlighted(filtered.length > 0 ? filtered.length - 1 : 0);
  }, [filtered.length, highlighted]);

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;

    if (!open) return;

    if (justOpened) {
      const selectedIdx = filtered.findIndex((o) => o.id === selectedId);
      const targetIdx = selectedIdx >= 0 ? selectedIdx : 0;
      setHighlighted(targetIdx);
      listRef.current?.querySelector<HTMLElement>(`[data-idx="${targetIdx}"]`)
        ?.scrollIntoView({ block: 'center' });
      return;
    }

    if (scrollNeededRef.current) {
      scrollNeededRef.current = false;
      listRef.current?.querySelector<HTMLElement>(`[data-idx="${highlighted}"]`)
        ?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted, open, filtered, selectedId]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const choose = (option: ComboboxOption) => {
    onSelect(option.id);
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      scrollNeededRef.current = true;
      setHighlighted((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      scrollNeededRef.current = true;
      setHighlighted((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const option = filtered[highlighted];
      if (option) choose(option);
    } else if (e.key === 'Escape') {
      close();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div
        className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-surface border border-border cursor-text"
        onClick={() => setOpen(true)}>
        <Search size={16} className="text-muted shrink-0" />
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="category-listbox"
          value={open ? query : selectedLabel}
          placeholder={selectedLabel}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlighted(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm text-fg placeholder:text-fg"
        />
        <ChevronDown
          size={16}
          className={`text-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {open ? (
        <ul
          ref={listRef}
          id="category-listbox"
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-lg bg-surface border border-border shadow-lg py-1">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">{query}</li>
          ) : (
            filtered.map((o, idx) => {
              const active = o.id === selectedId;
              const isHighlighted = idx === highlighted;
              return (
                <li
                  key={o.id ?? '__all__'}
                  data-idx={idx}
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setHighlighted(idx)}
                  onClick={() => choose(o)}
                  className={`flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer
                    ${isHighlighted ? 'bg-selected' : ''} ${active ? 'text-tint font-medium' : 'text-fg'}`}>
                  <span className="truncate">{o.label}</span>
                  {active ? <Check size={15} className="text-tint shrink-0" /> : null}
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
