// Timebox — Daily View Component
// A pure presentational component. Time math: minutes from dayStart map to pixels.
// dayStart/dayEnd in minutes. pxPerMin computed from --hour CSS var (96px = 60min).

function fmtTime(mins) {
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  let h = h24 % 12; if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2,"0")} ${ampm}`;
}
function fmtTimeShort(mins) {
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h24 >= 12 ? "p" : "a";
  let h = h24 % 12; if (h === 0) h = 12;
  if (m === 0) return `${h}${ampm}`;
  return `${h}:${m.toString().padStart(2,"0")}${ampm}`;
}
function fmtDur(mins) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/* ---------- Inbox card ---------- */
function InboxCard({ task }) {
  return (
    <div className="tb-inbox-card">
      <div className="grip"><Icon name="grip" size={14}/></div>
      <div className="tb-inbox-card-title">{task.title}</div>
      <div className="tb-inbox-card-meta">
        <span className="tb-inbox-card-dur">{fmtDur(task.duration)}</span>
        {task.note && (<><span className="tb-inbox-card-dot"/><span>{task.note}</span></>)}
      </div>
    </div>
  );
}

/* ---------- Inbox panel ---------- */
function Inbox({ tasks, layout = "left" }) {
  const total = tasks.reduce((s,t) => s + t.duration, 0);
  return (
    <aside className="tb-inbox">
      <div className="tb-inbox-header">
        <div className="tb-inbox-title">Unscheduled</div>
        <div className="tb-inbox-count">{tasks.length} · {fmtDur(total)}</div>
      </div>
      <div className="tb-inbox-list">
        {tasks.map(t => <InboxCard key={t.id} task={t} />)}
      </div>
      <button className="tb-inbox-add">
        <Icon name="plus" size={12}/>
        <span>Add a task…</span>
      </button>
    </aside>
  );
}

/* ---------- Timeline block ---------- */
function Block({ block, hourPx = 96, dayStart = 6 * 60 }) {
  const top = ((block.start - dayStart) / 60) * hourPx;
  const height = (block.duration / 60) * hourPx;
  const cls = [
    "tb-block",
    block.state || "upcoming",
    block.dragging ? "dragging" : "",
    block.ghost ? "ghost" : "",
  ].filter(Boolean).join(" ");

  const style = { top: `${top}px`, height: `${height}px` };
  if (block.dragging) style.transform = `translateY(${block.dragOffset || 0}px) rotate(-0.4deg)`;

  const showNote = !block.dragging && !block.ghost && block.note && height >= 70;
  const showMeta = height >= 36;

  return (
    <div className={cls} style={style}>
      <div className="tb-resize top" />
      <div className="tb-block-title">
        <span className="tb-check">{block.state === "completed" && <Icon name="check" size={9} stroke={2.5}/>}</span>
        <span>{block.title}</span>
      </div>
      {showMeta && (
        <div className="tb-block-meta">
          <span>{fmtTime(block.start)} – {fmtTime(block.start + block.duration)}</span>
          <span>·</span>
          <span>{fmtDur(block.duration)}</span>
          {block.note && height < 64 && <><span>·</span><Icon name="note" size={10}/></>}
        </div>
      )}
      {showNote && <div className="tb-block-note">{block.note}</div>}
      <div className="tb-resize bot" />
    </div>
  );
}

/* ---------- Hour grid ---------- */
function HourGrid({ dayStart = 6, dayEnd = 22, hourPx = 96 }) {
  const hours = [];
  for (let h = dayStart; h < dayEnd; h++) hours.push(h);
  return (
    <>
      {hours.map((h, i) => {
        let label;
        if (h === 12) label = "12 noon";
        else if (h === 0) label = "12 mid";
        else if (h < 12) label = `${h} AM`;
        else label = `${h - 12} PM`;
        return (
          <div key={h} className="tb-hour-row" style={{height: hourPx}}>
            <div className="tb-hour-label">{label}</div>
            <div className="tb-quarter q1"/>
            <div className="tb-quarter q2"/>
            <div className="tb-quarter q3"/>
          </div>
        );
      })}
    </>
  );
}

/* ---------- Drop label (hovering pill near drag) ---------- */
function DropLabel({ time, top }) {
  return <div className="tb-drop-label" style={{top, left: 64}}>Drop at {fmtTimeShort(time)}</div>;
}

/* ---------- Daily View ---------- */
function DailyView({
  tasks = [],
  blocks = [],
  layout = "left",       // left | right | bottom
  density = "default",   // default | dense
  style = "default",     // default | expressive
  dayStart = 6 * 60,     // minutes
  dayEnd = 22 * 60,
  nowTime = 11 * 60 + 24, // mins
  hourPx = 96,
  showDrag = true,
  showStats = true,
}) {
  const totalH = (dayEnd - dayStart) / 60;
  const nowTop = ((nowTime - dayStart) / 60) * hourPx;
  const pastWashH = nowTop;

  const dayCls = [
    "tb-day",
    `layout-${layout}`,
    density === "dense" ? "dense" : "",
    style === "expressive" ? "expressive" : "",
  ].filter(Boolean).join(" ");

  // Stats
  const planned = blocks.reduce((s,b) => s + b.duration, 0);
  const completed = blocks.filter(b => b.state === "completed").reduce((s,b) => s + b.duration, 0);
  const remaining = planned - completed;

  const inboxEl = <Inbox tasks={tasks} layout={layout} />;

  const timelineEl = (
    <div className="tb-timeline-wrap">
      {showStats && (
        <div className="tb-stats">
          <div className="tb-stat">
            <div className="tb-stat-label">Planned</div>
            <div className="tb-stat-value">{Math.floor(planned/60)}<span className="unit">h </span>{planned%60}<span className="unit">m</span></div>
          </div>
          <div className="tb-stat">
            <div className="tb-stat-label">Completed</div>
            <div className="tb-stat-value">{Math.floor(completed/60)}<span className="unit">h </span>{completed%60}<span className="unit">m</span></div>
          </div>
          <div className="tb-stat">
            <div className="tb-stat-label">Remaining</div>
            <div className="tb-stat-value">{Math.floor(remaining/60)}<span className="unit">h </span>{remaining%60}<span className="unit">m</span></div>
          </div>
          <div className="tb-stat">
            <div className="tb-stat-label">Increment</div>
            <div className="tb-stat-value">15<span className="unit">min</span></div>
          </div>
          <div style={{flex: 1}}/>
          <div style={{display:"flex", alignItems:"flex-end", gap: 8, paddingBottom: 2}}>
            <span className="tb-filter-chip"><span className="dot"/>In progress · Deep work block</span>
          </div>
        </div>
      )}
      <div className="tb-timeline" style={{"--hour": `${hourPx}px`}}>
        <div className="tb-timeline-grid" style={{position: "relative"}}>
          {/* past wash */}
          <div className="tb-past-wash" style={{height: pastWashH}}/>
          <HourGrid dayStart={dayStart/60} dayEnd={dayEnd/60} hourPx={hourPx}/>
          {/* now line */}
          <div className="tb-now" style={{top: nowTop}}>
            <div className="tb-now-label">{fmtTime(nowTime).replace(" ","")}</div>
          </div>
          {/* blocks */}
          <div style={{position: "absolute", top: 0, left: 0, right: 0, bottom: 0}}>
            {blocks.map(b => <Block key={b.id} block={b} hourPx={hourPx} dayStart={dayStart}/>)}
            {showDrag && <DropLabel time={14*60 + 30} top={((14*60 + 30 - dayStart)/60)*hourPx - 10}/>}
          </div>
        </div>
      </div>
    </div>
  );

  if (layout === "bottom") {
    return (
      <div className={dayCls}>
        {timelineEl}
        {inboxEl}
      </div>
    );
  }
  if (layout === "right") {
    return (
      <div className={dayCls}>
        {timelineEl}
        {inboxEl}
      </div>
    );
  }
  return (
    <div className={dayCls}>
      {inboxEl}
      {timelineEl}
    </div>
  );
}

window.DailyView = DailyView;
window.fmtTime = fmtTime;
window.fmtDur = fmtDur;
