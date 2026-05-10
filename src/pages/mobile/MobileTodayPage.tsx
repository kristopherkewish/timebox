import { useSheet } from '@/hooks/useSheet';

export function MobileTodayPage() {
  const open = useSheet((s) => s.open);

  return (
    <>
      <header className="tbm-header">
        <div className="tbm-header-l">
          <div className="tbm-eyebrow">Phase 10</div>
          <div className="tbm-title">Today</div>
        </div>
      </header>
      <div className="tbm-scroll">
        <div className="tbm-scroll-pad" style={{ padding: '8px 20px 100px' }}>
          <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>
            Mobile Today view scaffolds in Phase 10 (timeline, pool strip, FAB, sheets).
          </p>
          <button
            type="button"
            className="tbm-iconbtn"
            style={{ marginTop: 16, width: 'auto', padding: '0 14px', height: 36 }}
            onClick={() => open('demo')}
          >
            Open demo sheet
          </button>
        </div>
      </div>
    </>
  );
}
