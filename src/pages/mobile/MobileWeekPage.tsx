export function MobileWeekPage() {
  return (
    <>
      <header className="tbm-header">
        <div className="tbm-header-l">
          <div className="tbm-eyebrow">Phase 11</div>
          <div className="tbm-title">This week</div>
        </div>
      </header>
      <div className="tbm-scroll">
        <div className="tbm-scroll-pad" style={{ padding: '8px 20px 100px' }}>
          <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>
            Mobile Week view scaffolds in Phase 11 (week strip, pool, day cards).
          </p>
        </div>
      </div>
    </>
  );
}
