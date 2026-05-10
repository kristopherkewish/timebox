import { useEffect, useRef } from 'react';

const DURATIONS = [15, 25, 45] as const;

interface Props {
  title: string;
  duration: number;
  onTitle: (v: string) => void;
  onDuration: (v: number) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function PoolCompose({ title, duration, onTitle, onDuration, onSubmit, onCancel }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="tbm-pool-compose">
      <input
        ref={inputRef}
        value={title}
        placeholder="What to do?"
        onChange={(e) => onTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onSubmit();
          } else if (e.key === 'Escape') {
            onCancel();
          }
        }}
      />
      <div className="tbm-pool-compose-row">
        {DURATIONS.map((d) => (
          <button
            key={d}
            type="button"
            className={`mini${duration === d ? ' active' : ''}`}
            onClick={() => onDuration(d)}
          >
            {d}m
          </button>
        ))}
        <button type="button" className="save" onClick={onSubmit}>
          Save
        </button>
      </div>
    </div>
  );
}
