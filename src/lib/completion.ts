export type BlockState = 'upcoming' | 'in-progress' | 'completed' | 'incomplete';

export interface CompletionInput {
  date: string; // YYYY-MM-DD (local)
  startMin: number | null;
  durationMin: number;
  completionState: BlockState;
  completionOverridden: 0 | 1 | boolean;
}

function localStartMs(date: string, startMin: number): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, Math.floor(startMin / 60), startMin % 60).getTime();
}

export function deriveState(now: number, block: CompletionInput): BlockState {
  if (block.completionOverridden) return block.completionState;
  if (block.startMin == null) return 'upcoming';
  const start = localStartMs(block.date, block.startMin);
  const end = start + block.durationMin * 60_000;
  if (now >= end) return 'completed';
  if (now >= start) return 'in-progress';
  return 'upcoming';
}
