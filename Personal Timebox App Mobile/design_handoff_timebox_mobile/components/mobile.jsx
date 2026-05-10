// Mobile screens for Timebox web app
// Shared icon set + components for all phone-size screens.

const Icon = {
  chevL: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chevR: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  cal: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  week: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6"/><path d="M3.5 10h17" stroke="currentColor" strokeWidth="1.6"/><path d="M8 3v4M16 3v4M9 14h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  grid: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/></svg>,
  search: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7"/><path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  plus: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  more: <svg width="20" height="20" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="19" cy="12" r="1.7" fill="currentColor"/></svg>,
  close: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  check: <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  pause: <svg width="16" height="16" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>,
  done: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  skip: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 5l9 7-9 7V5z" fill="currentColor"/><rect x="17" y="5" width="2" height="14" rx="1" fill="currentColor"/></svg>,
  clock: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6"/><path d="M12 7.5v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  bell: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 16V11a6 6 0 0112 0v5l1.5 2H4.5L6 16z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M10 20a2 2 0 004 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  tag: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M11 3H4a1 1 0 00-1 1v7l9 9 9-9-9-9z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor"/></svg>,
  note: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 4h11l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M16 4v4h4M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  arr: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M14 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

function fmtTime(min) {
  const h = Math.floor(min / 60), m = min % 60;
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = ((h + 11) % 12) + 1;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}
function fmtDur(min) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min/60), m = min%60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/* ─────────── Tab bar — Today / Week / Month / Me ─────────── */
function TabBar({ active = 'today' }) {
  const tab = (id, label, icon) => (
    <button className={`tbm-tab ${active === id ? 'active' : ''}`}>
      {icon}
      <span className="lbl">{label}</span>
    </button>
  );
  return (
    <nav className="tbm-tabbar">
      {tab('today', 'Today', Icon.cal)}
      {tab('week', 'Week', Icon.week)}
      {tab('month', 'Month', Icon.grid)}
      {tab('me', 'Me', <div className="tbm-avatar" style={{ width: 22, height: 22, fontSize: 9 }}>MK</div>)}
    </nav>
  );
}

/* ─────────── Pool strip (unscheduled tasks) ───────────
   Mirrors the desktop left rail. Each view (day/week/month) has its own
   bucket of unscheduled tasks above the main content. */
function PoolStrip({ scope, count, items, mode = 'normal', freshIndex = -1, composeText = '', composeDur = '25m' }) {
  const labels = {
    day: 'Today · unscheduled',
    week: 'This week · unscheduled',
    month: 'This month · unscheduled',
  };
  return (
    <div className="tbm-pool">
      <div className="tbm-pool-head">
        <span className="tbm-pool-title">{labels[scope]}</span>
        <span className="tbm-pool-count">{count}</span>
      </div>
      <div className="tbm-pool-scroll">
        {mode === 'compose' && (
          <div className="tbm-pool-compose">
            <input defaultValue={composeText} placeholder="What to do?"/>
            <div className="tbm-pool-compose-row">
              <button className="mini">15m</button>
              <button className={`mini ${composeDur === '25m' ? 'active' : ''}`}>25m</button>
              <button className="mini">45m</button>
              <button className="save">Save</button>
            </div>
          </div>
        )}
        {items.map((t, i) => {
          const cls = `tbm-pool-card ${t.kind || ''} ${i === freshIndex ? 'fresh' : ''}`;
          return (
            <div key={i} className={cls}>
              <div className="tbm-pool-card-title">{t.title}</div>
              <div className="tbm-pool-card-meta">
                {i === freshIndex && <span className="badge">New</span>}
                {t.duration && <span className="dur">{fmtDur(t.duration)}</span>}
                {t.duration && t.note && <span className="dot"/>}
                {t.note && <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.note}</span>}
              </div>
            </div>
          );
        })}
        {mode !== 'compose' && <button className="tbm-pool-add">{Icon.plus} Add</button>}
      </div>
    </div>
  );
}

/* ─────────── Today (timeline) ─────────── */
function MobileToday({ withFab = true, activeTab = 'today', flow = 'normal' }) {
  const dayStart = 6 * 60, dayEnd = 20 * 60;
  const hours = (dayEnd - dayStart) / 60;
  const HOUR = 80;
  const baseBlocks = window.HERO_BLOCKS;
  const nowMin = 11 * 60 + 24;
  const baseTasks = window.HERO_TASKS;

  // Flow variants:
  //   'normal'        — Today as-is
  //   'compose'       — pool shows inline composer
  //   'pool-fresh'    — new task just landed in the pool, highlighted
  //   'scheduled'     — task removed from pool, new block on timeline
  let tasks = baseTasks;
  let blocks = baseBlocks;
  let freshIndex = -1;
  let poolMode = 'normal';
  if (flow === 'compose') {
    poolMode = 'compose';
  } else if (flow === 'pool-fresh') {
    tasks = [{ id: 'tnew', title: 'Read: Lenny on prioritisation', duration: 25 }, ...baseTasks];
    freshIndex = 0;
  } else if (flow === 'scheduled') {
    blocks = [
      ...baseBlocks,
      { id: 'bnew', title: 'Read: Lenny on prioritisation', start: 12 * 60 + 45, duration: 25, state: 'fresh' },
    ];
  }

  return (
    <div className="tbm">
      <header className="tbm-header">
        <div className="tbm-header-l">
          <div className="tbm-eyebrow">Mon · Week 19</div>
          <div className="tbm-title">May 4</div>
        </div>
        <button className="tbm-iconbtn">{Icon.search}</button>
        <div className="tbm-avatar">MK</div>
      </header>
      <div className="tbm-subhead">
        <div className="tbm-segmented">
          <button className="active">Day</button>
          <button>Week</button>
          <button>Month</button>
        </div>
        <span className="tbm-pill" style={{ marginLeft: 'auto' }}><span className="dot"/>3h 25m deep</span>
      </div>

      <div className="tbm-scroll">
        <div className="tbm-scroll-pad">

          <PoolStrip scope="day" count={tasks.length} items={tasks}
                     mode={poolMode} freshIndex={freshIndex}/>

          <div className="tbm-timeline" style={{ '--hour': HOUR + 'px' }}>
            {Array.from({ length: hours }, (_, i) => {
              const h = dayStart / 60 + i;
              return (
                <div className="tbm-hour" key={h}>
                  <div className="tbm-hour-label">{fmtTime(h * 60)}</div>
                  <div className="tbm-q q1"/>
                  <div className="tbm-q q2"/>
                  <div className="tbm-q q3"/>
                </div>
              );
            })}

            <div className="tbm-past" style={{ height: ((nowMin - dayStart) / 60) * HOUR + 'px' }}/>

            {blocks.map(b => {
              const top = ((b.start - dayStart) / 60) * HOUR;
              const h = (b.duration / 60) * HOUR;
              const cls = b.state === 'completed' ? 'done'
                       : b.state === 'in-progress' ? 'live'
                       : b.state === 'fresh' ? 'fresh' : '';
              return (
                <div className={`tbm-block ${cls}`} key={b.id} style={{ top, height: h - 4 }}>
                  <div className="tbm-block-title">
                    <span className="tbm-check">{b.state === 'completed' ? Icon.check : null}</span>
                    {b.title}
                  </div>
                  {h > 44 && (
                    <div className="tbm-block-meta">
                      {fmtTime(b.start)} – {fmtTime(b.start + b.duration)} · {fmtDur(b.duration)}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="tbm-now" style={{ top: ((nowMin - dayStart) / 60) * HOUR + 'px' }}>
              <div className="tbm-now-label">{fmtTime(nowMin)}</div>
            </div>
          </div>

        </div>
      </div>

      {withFab && <button className="tbm-fab">{Icon.plus}</button>}
      <TabBar active={activeTab}/>
    </div>
  );
}

/* ─────────── Schedule sheet — pick a slot for a pool task ─────────── */
function MobileScheduleSheet() {
  return (
    <div className="tbm" style={{ overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, filter: 'saturate(0.85) brightness(0.95)' }}>
        <MobileToday withFab={false} activeTab="today" flow="pool-fresh"/>
      </div>
      <div className="tbm-scrim"/>
      <div className="tbm-sheet">
        <div className="tbm-sheet-handle"/>
        <div className="tbm-sheet-head">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <div className="tbm-sheet-title">Schedule</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              Read: Lenny on prioritisation · 25m
            </div>
          </div>
          <button className="tbm-sheet-close">{Icon.close}</button>
        </div>
        <div className="tbm-sheet-body">
          <div>
            <div className="tbm-slot-eyebrow"><span className="pulse"/>Recommended for today</div>
            <div className="tbm-slot recommended">
              <div className="tbm-slot-time">12:45 pm</div>
              <div className="tbm-slot-info">
                <span className="ttl">After Design review</span>
                <span className="sub">Free until 1:00 pm · fits exactly</span>
              </div>
              <button className="pick">{Icon.arr}</button>
            </div>
          </div>

          <div>
            <div className="tbm-slots-other">Other open slots</div>
            <div className="tbm-slot">
              <div className="tbm-slot-time">1:30 pm</div>
              <div className="tbm-slot-info">
                <span className="ttl">After 1:1 with Sam</span>
                <span className="sub">30m free before deep work</span>
              </div>
              <button className="pick">{Icon.arr}</button>
            </div>
            <div className="tbm-slot">
              <div className="tbm-slot-time">5:00 pm</div>
              <div className="tbm-slot-info">
                <span className="ttl">Before Workout</span>
                <span className="sub">30m free after admin sweep</span>
              </div>
              <button className="pick">{Icon.arr}</button>
            </div>
            <div className="tbm-drag-hint">
              {Icon.clock} Or long-press the pool card and drop it on the timeline.
            </div>
          </div>
        </div>
        <button className="tbm-sheet-cta">Schedule for 12:45 pm</button>
      </div>
    </div>
  );
}

/* ─────────── Quick add bottom sheet (overlaid on Today) ─────────── */
function MobileQuickAdd() {
  return (
    <div className="tbm" style={{ overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, filter: 'saturate(0.85) brightness(0.95)' }}>
        <MobileToday withFab={false} activeTab="today"/>
      </div>
      <div className="tbm-scrim"/>
      <div className="tbm-sheet">
        <div className="tbm-sheet-handle"/>
        <div className="tbm-sheet-head">
          <div className="tbm-sheet-title">New timebox</div>
          <button className="tbm-sheet-close">{Icon.close}</button>
        </div>
        <div className="tbm-sheet-body">
          <div style={{ paddingTop: 4 }}>
            <input className="tbm-input" defaultValue="Draft hand-off doc" />
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>
              From today's pool · added Friday
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', marginBottom: 8 }}>Duration</div>
            <div className="tbm-chips-row">
              <button className="tbm-dur-chip">15m</button>
              <button className="tbm-dur-chip">30m</button>
              <button className="tbm-dur-chip">45m</button>
              <button className="tbm-dur-chip active">60m</button>
              <button className="tbm-dur-chip">90m</button>
              <button className="tbm-dur-chip">2h</button>
            </div>
          </div>

          <div>
            <div className="tbm-field">
              <span className="tbm-field-icon">{Icon.clock}</span>
              <span className="tbm-field-label">Starts</span>
              <span className="tbm-field-value">2:00 pm <span className="muted">today</span></span>
              <span style={{ color: 'var(--ink-4)' }}>{Icon.chevR}</span>
            </div>
            <div className="tbm-field">
              <span className="tbm-field-icon">{Icon.bell}</span>
              <span className="tbm-field-label">Reminder</span>
              <span className="tbm-field-value">5m before</span>
              <span style={{ color: 'var(--ink-4)' }}>{Icon.chevR}</span>
            </div>
            <div className="tbm-field">
              <span className="tbm-field-icon">{Icon.tag}</span>
              <span className="tbm-field-label">Tag</span>
              <span className="tbm-field-value" style={{ color: 'var(--accent-ink)' }}>Deep work</span>
              <span style={{ color: 'var(--ink-4)' }}>{Icon.chevR}</span>
            </div>
            <div className="tbm-field">
              <span className="tbm-field-icon">{Icon.note}</span>
              <span className="tbm-field-label">Note</span>
              <span className="tbm-field-value muted" style={{ color: 'var(--ink-3)' }}>For Tuesday</span>
              <span style={{ color: 'var(--ink-4)' }}>{Icon.chevR}</span>
            </div>
          </div>
        </div>
        <button className="tbm-sheet-cta">Schedule for 2:00 pm</button>
      </div>
    </div>
  );
}

/* ─────────── Block detail bottom sheet ─────────── */
function MobileBlockDetail() {
  return (
    <div className="tbm" style={{ overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, filter: 'saturate(0.85) brightness(0.95)' }}>
        <MobileToday withFab={false} activeTab="today"/>
      </div>
      <div className="tbm-scrim"/>
      <div className="tbm-sheet">
        <div className="tbm-sheet-handle"/>
        <div className="tbm-sheet-head">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <div className="tbm-sheet-title">Design review with Priya</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--accent)', boxShadow: '0 0 0 3px color-mix(in oklab, var(--accent) 30%, transparent)' }}/>
              In progress · 11:00 – 11:45
            </div>
          </div>
          <button className="tbm-sheet-close">{Icon.more}</button>
        </div>
        <div className="tbm-sheet-body">
          <div className="tbm-now-card" style={{ margin: 0 }}>
            <div className="tbm-now-card-time">
              <span className="big">21:00</span>
              <span className="small">remaining of 45m</span>
            </div>
            <div className="tbm-progress">
              <div className="tbm-progress-fill" style={{ width: '53%' }}/>
            </div>
            <div className="tbm-now-card-actions">
              <button className="tbm-now-card-btn">{Icon.pause} Pause</button>
              <button className="tbm-now-card-btn">{Icon.skip} +5 min</button>
              <button className="tbm-now-card-btn primary">{Icon.done} Done</button>
            </div>
          </div>

          <div>
            <div className="tbm-field">
              <span className="tbm-field-icon">{Icon.clock}</span>
              <span className="tbm-field-label">Time</span>
              <span className="tbm-field-value">11:00 – 11:45</span>
            </div>
            <div className="tbm-field">
              <span className="tbm-field-icon">{Icon.tag}</span>
              <span className="tbm-field-label">Tag</span>
              <span className="tbm-field-value" style={{ color: 'var(--accent-ink)' }}>Deep work</span>
            </div>
            <div className="tbm-field" style={{ alignItems: 'flex-start' }}>
              <span className="tbm-field-icon" style={{ marginTop: 2 }}>{Icon.note}</span>
              <span className="tbm-field-label" style={{ color: 'var(--ink)' }}>
                Walking through onboarding flow v3. Decide on the empty state for invites and confirm the warmth tone of the first screen.
              </span>
            </div>
          </div>
        </div>
        <button className="tbm-sheet-cta" style={{ background: 'var(--ink)', color: 'var(--bg)' }}>
          {Icon.done} Mark complete
        </button>
      </div>
    </div>
  );
}

/* ─────────── Week view ─────────── */
function MobileWeek() {
  const days = window.WEEK_DAYS;
  const pool = window.WEEK_POOL;
  const dowOf = (num) => {
    const idx = (num - 4) % 7;
    return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][idx];
  };
  const isToday = (num) => num === 4;
  const isWeekend = (num) => num === 9 || num === 10;

  return (
    <div className="tbm">
      <header className="tbm-header">
        <div className="tbm-header-l">
          <div className="tbm-eyebrow">Week 19 · May 4 – 10</div>
          <div className="tbm-title">This week</div>
        </div>
        <button className="tbm-iconbtn">{Icon.chevL}</button>
        <button className="tbm-iconbtn">{Icon.chevR}</button>
      </header>

      <div className="tbm-subhead">
        <div className="tbm-segmented">
          <button>Day</button>
          <button className="active">Week</button>
          <button>Month</button>
        </div>
        <span className="tbm-pill" style={{ marginLeft: 'auto' }}>14 tasks</span>
      </div>

      <div className="tbm-week-strip">
        {days.map(d => (
          <div key={d.num} className={`tbm-week-day ${isToday(d.num) ? 'today' : ''} ${isWeekend(d.num) ? 'weekend' : ''}`}>
            <span className="dow">{dowOf(d.num).slice(0,1)}</span>
            <span className="num">{d.num}</span>
            <span className="pips">
              {d.tasks.slice(0, Math.min(d.tasks.length, 3)).map((_, i) => <span className="pip" key={i}/>)}
            </span>
          </div>
        ))}
      </div>

      <div className="tbm-scroll">
        <div className="tbm-scroll-pad">

          <PoolStrip scope="week" count={pool.length} items={pool}/>

          {days.map(d => (
            <div key={d.num} className={`tbm-week-card ${isToday(d.num) ? 'today' : ''} ${isWeekend(d.num) ? 'weekend' : ''}`}>
              <div className="tbm-week-card-head">
                <div className="l">
                  <div className="num">{d.num}</div>
                  <div className="dow">{dowOf(d.num)}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                  {d.tasks.length} {d.tasks.length === 1 ? 'task' : 'tasks'}
                </div>
              </div>
              <div className="tbm-week-card-body">
                {d.tasks.map((t, i) => (
                  <div key={i} className={`tbm-week-task ${t.kind || ''}`}>
                    {t.title}
                    {t.note && <div className="note">{t.note}</div>}
                  </div>
                ))}
                {d.tasks.length === 0 && <div className="tbm-week-card-empty">Drop a task</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="tbm-fab">{Icon.plus}</button>
      <TabBar active="week"/>
    </div>
  );
}

/* ─────────── Month view ─────────── */
function MobileMonth() {
  const weeks = window.MONTH_WEEKS;
  const pool = window.MONTH_POOL;
  return (
    <div className="tbm">
      <header className="tbm-header">
        <div className="tbm-header-l">
          <div className="tbm-eyebrow">5 weeks · 14 tasks</div>
          <div className="tbm-title">May</div>
        </div>
        <button className="tbm-iconbtn">{Icon.chevL}</button>
        <button className="tbm-iconbtn">{Icon.chevR}</button>
      </header>

      <div className="tbm-subhead">
        <div className="tbm-segmented">
          <button>Day</button>
          <button>Week</button>
          <button className="active">Month</button>
        </div>
      </div>

      <div className="tbm-scroll">
        <div className="tbm-scroll-pad">

          <PoolStrip scope="month" count={pool.length} items={pool}/>

          {weeks.map((w, i) => (
            <div key={w.label} className={`tbm-month-week ${i === 1 ? 'current' : ''}`}>
              <div className="tbm-month-week-head">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="tbm-month-week-num">{w.label.replace('Week ', 'W')}</span>
                  <span className="tbm-month-week-range">{w.range}</span>
                </div>
                <span className="tbm-month-week-count">{w.tasks.length} {w.tasks.length === 1 ? 'task' : 'tasks'}</span>
              </div>
              {w.tasks.map((t, j) => (
                <div key={j} className={`tbm-month-task ${t.kind || ''}`}>
                  {t.title}
                  {t.note && <div className="note">{t.note}</div>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <button className="tbm-fab">{Icon.plus}</button>
      <TabBar active="month"/>
    </div>
  );
}

Object.assign(window, {
  MobileToday, MobileQuickAdd, MobileBlockDetail, MobileWeek, MobileMonth, MobileScheduleSheet,
});
