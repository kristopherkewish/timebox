// Timebox — Shared chrome (Windows shell, header, rail)
const { useState, useEffect, useMemo } = React;

/* ---------- Tiny SVG icons (16px, 1.5 stroke) ---------- */
const Icon = ({ name, size = 16, stroke = 1.5 }) => {
  const props = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round"
  };
  switch (name) {
    case "calendar":
      return (<svg {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>);
    case "calendar-week":
      return (<svg {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4M9 13h6M9 17h6"/></svg>);
    case "calendar-month":
      return (<svg {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M8 3v4M16 3v4M9 14v6M15 14v6"/></svg>);
    case "inbox":
      return (<svg {...props}><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>);
    case "settings":
      return (<svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>);
    case "search":
      return (<svg {...props}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>);
    case "chevron-left":
      return (<svg {...props}><path d="m15 18-6-6 6-6"/></svg>);
    case "chevron-right":
      return (<svg {...props}><path d="m9 18 6-6-6-6"/></svg>);
    case "plus":
      return (<svg {...props}><path d="M12 5v14M5 12h14"/></svg>);
    case "check":
      return (<svg {...props}><path d="M20 6 9 17l-5-5"/></svg>);
    case "grip":
      return (<svg {...props}><circle cx="9" cy="6" r="0.6" fill="currentColor"/><circle cx="9" cy="12" r="0.6" fill="currentColor"/><circle cx="9" cy="18" r="0.6" fill="currentColor"/><circle cx="15" cy="6" r="0.6" fill="currentColor"/><circle cx="15" cy="12" r="0.6" fill="currentColor"/><circle cx="15" cy="18" r="0.6" fill="currentColor"/></svg>);
    case "bell":
      return (<svg {...props}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>);
    case "note":
      return (<svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13h6M9 17h4"/></svg>);
    case "user":
      return (<svg {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);
    case "moon":
      return (<svg {...props}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>);
    case "sun":
      return (<svg {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>);
    default: return null;
  }
};

/* ---------- Windows app frame ---------- */
function WinFrame({ children }) {
  return (
    <div className="win-frame">
      <div className="win-titlebar">
        <div className="win-titlebar-app">
          <div className="win-titlebar-app-icon">T</div>
          <span>Timebox</span>
        </div>
        <div className="win-titlebar-spacer" />
        <div className="win-titlebar-controls">
          <button>—</button>
          <button>▢</button>
          <button className="close">✕</button>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ---------- Left rail ---------- */
function Rail({ active = "day", initials = "MK" }) {
  const items = [
    { id: "day",   icon: "calendar",        label: "Day" },
    { id: "week",  icon: "calendar-week",   label: "Week" },
    { id: "month", icon: "calendar-month",  label: "Month" },
    { id: "inbox", icon: "inbox",           label: "Inbox" },
  ];
  return (
    <div className="tb-rail">
      {items.map(it => (
        <div key={it.id} className={`tb-rail-item ${active === it.id ? "active" : ""}`} title={it.label}>
          <Icon name={it.icon} size={16} />
        </div>
      ))}
      <div className="tb-rail-spacer" />
      <div className="tb-rail-item" title="Notifications"><Icon name="bell" size={16}/></div>
      <div className="tb-rail-item" title="Settings"><Icon name="settings" size={16}/></div>
      <div style={{height: 8}} />
      <div className="tb-rail-avatar">{initials}</div>
    </div>
  );
}

/* ---------- Header ---------- */
function Header({ eyebrow, title, sub, dateLabel, view = "day", right }) {
  return (
    <div className="tb-header">
      <div className="tb-header-left">
        <div className="tb-header-eyebrow">{eyebrow}</div>
        <div className="tb-header-title">{title}</div>
        {sub && <div className="tb-header-sub">{sub}</div>}
      </div>
      <div className="tb-header-right">
        <div className="tb-segmented">
          <button className={view === "day" ? "active" : ""}>Day</button>
          <button className={view === "week" ? "active" : ""}>Week</button>
          <button className={view === "month" ? "active" : ""}>Month</button>
        </div>
        <div className="tb-date-step">
          <button><Icon name="chevron-left" size={14}/></button>
          <div className="label">{dateLabel}</div>
          <button><Icon name="chevron-right" size={14}/></button>
        </div>
        <button className="tb-btn">Today</button>
        {right}
      </div>
    </div>
  );
}

window.Icon = Icon;
window.WinFrame = WinFrame;
window.Rail = Rail;
window.Header = Header;
