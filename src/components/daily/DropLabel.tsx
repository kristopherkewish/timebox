import { fmtTimeShort } from '@/lib/time';

export function DropLabel({ time, top }: { time: number; top: number }) {
  return (
    <div className="tb-drop-label" style={{ top, left: 64 }}>
      Drop at {fmtTimeShort(time)}
    </div>
  );
}
