// Timebox — Weekly & Monthly Planner Components (v2)

function WeeklyView({ pool = [], days = [], todayIdx = 2 }) {
  const dows = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div className="tb-week">
      <aside className="tb-inbox">
        <div className="tb-inbox-header">
          <div className="tb-inbox-title">Weekly pool</div>
          <div className="tb-inbox-count">{pool.length}</div>
        </div>
        <div className="tb-inbox-list">
          {pool.map((t,i) => (
            <div key={i} className="tb-inbox-card">
              <div className="grip"><Icon name="grip" size={14}/></div>
              <div className="tb-inbox-card-title">{t.title}</div>
              {t.note && <div className="tb-inbox-card-meta"><span>{t.note}</span></div>}
            </div>
          ))}
        </div>
        <button className="tb-inbox-add">
          <Icon name="plus" size={12}/>
          <span>Add to weekly pool…</span>
        </button>
      </aside>
      <div className="tb-week-grid">
        {days.map((d, i) => (
          <div key={i} className="tb-day-col">
            <div className={`tb-day-col-head ${i === todayIdx ? "today" : ""} ${i >= 5 ? "weekend" : ""}`}>
              <div className="dow">{dows[i]}</div>
              <div className="num">{d.num}</div>
            </div>
            <div className="tb-day-col-body">
              {d.tasks.map((t, j) => (
                <div key={j} className={`tb-week-card ${t.kind || ""}`}>
                  <div>{t.title}</div>
                  {t.note && <div className="tb-week-card-note">{t.note}</div>}
                </div>
              ))}
              {i === todayIdx && (
                <div className="tb-week-card" style={{
                  background: "var(--accent-soft)",
                  border: "1.5px dashed var(--accent)",
                  borderLeft: "1.5px dashed var(--accent)",
                  color: "var(--accent-ink)"
                }}>Draft brand presentation</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Monthly: list of weeks (no day grid) ---------- */
function MonthlyView({ pool = [], weeks = [], currentWeekIdx = 1 }) {
  return (
    <div className="tb-month">
      <aside className="tb-inbox">
        <div className="tb-inbox-header">
          <div className="tb-inbox-title">Monthly pool</div>
          <div className="tb-inbox-count">{pool.length}</div>
        </div>
        <div className="tb-inbox-list">
          {pool.map((t,i) => (
            <div key={i} className="tb-inbox-card">
              <div className="grip"><Icon name="grip" size={14}/></div>
              <div className="tb-inbox-card-title">{t.title}</div>
              {t.note && <div className="tb-inbox-card-meta"><span>{t.note}</span></div>}
            </div>
          ))}
        </div>
        <button className="tb-inbox-add">
          <Icon name="plus" size={12}/>
          <span>Add to monthly pool…</span>
        </button>
      </aside>
      <div className="tb-month-list">
        {weeks.map((wk, i) => (
          <div key={i} className={`tb-month-week ${i === currentWeekIdx ? "current" : ""}`}>
            <div className="tb-month-week-meta">
              <div className="tb-month-week-eyebrow">{i === currentWeekIdx ? "This week" : "Week"}</div>
              <div className="tb-month-week-num">{wk.label}</div>
              <div className="tb-month-week-range">{wk.range}</div>
              <div className="tb-month-week-count">
                {wk.tasks.length === 0 ? "Nothing planned" :
                 wk.tasks.length === 1 ? "1 task" : `${wk.tasks.length} tasks`}
                {i === currentWeekIdx && " · 1 drafting"}
              </div>
            </div>
            <div className="tb-month-week-body">
              {wk.tasks.map((t, j) => (
                <div key={j} className={`tb-month-week-card ${t.kind || ""}`}>
                  <div>{t.title}</div>
                  {t.note && <div className="tb-month-week-card-note">{t.note}</div>}
                </div>
              ))}
              {i === currentWeekIdx && (
                <div className="tb-month-week-ghost">Q3 OKR review</div>
              )}
              {wk.tasks.length === 0 && (
                <div className="tb-month-week-empty">
                  <Icon name="plus" size={12}/>
                  <span>Drag a task from the pool, or add one here</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.WeeklyView = WeeklyView;
window.MonthlyView = MonthlyView;
