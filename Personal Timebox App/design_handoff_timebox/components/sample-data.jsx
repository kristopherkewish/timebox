// Timebox — Sample data (v2)

window.HERO_TASKS = [
  { id: "t1", title: "Reply to Anika re: contract", duration: 10, note: "Just yes/no" },
  { id: "t2", title: "Walk + podcast", duration: 30 },
  { id: "t3", title: "Draft hand-off doc", duration: 60, note: "For Tuesday" },
  { id: "t4", title: "Read: Lenny on prioritisation", duration: 25 },
  { id: "t5", title: "Submit expense report", duration: 15 },
];

window.HERO_BLOCKS = [
  { id: "b1", title: "Morning pages + coffee", start: 6*60+30, duration: 30, state: "completed", note: "Loose. Worried about Q3 plan." },
  { id: "b2", title: "Inbox triage", start: 7*60+30, duration: 30, state: "completed" },
  { id: "b3", title: "Standup", start: 8*60+30, duration: 15, state: "completed" },
  { id: "b4", title: "Deep work — Onboarding redesign", start: 9*60, duration: 2*60, state: "completed", note: "Got the empty state into a good place." },
  { id: "b5", title: "Design review with Priya", start: 11*60, duration: 45, state: "in-progress", note: "Walking through onboarding flow v3" },
  { id: "b6", title: "Lunch — leftovers + walk", start: 12*60, duration: 45 },
  { id: "b7", title: "1:1 with Sam", start: 13*60, duration: 30 },
  { id: "b8", title: "Deep work — Settings spec", start: 14*60, duration: 90, note: "Themes section needs a draft." },
  { id: "b9", title: "Critique — onboarding round 2", start: 16*60, duration: 60 },
  { id: "b10", title: "Inbox + admin sweep", start: 17*60+30, duration: 30 },
  { id: "b11", title: "Workout", start: 18*60+30, duration: 60 },
];

window.SIMPLE_TASKS = [
  { id: "t1", title: "Draft hand-off doc", duration: 60 },
  { id: "t2", title: "Reply to Anika", duration: 10 },
  { id: "t3", title: "Walk + podcast", duration: 30 },
  { id: "t4", title: "Submit expenses", duration: 15 },
];
window.SIMPLE_BLOCKS = [
  { id: "b1", title: "Standup", start: 8*60+30, duration: 15, state: "completed" },
  { id: "b2", title: "Deep work — Onboarding", start: 9*60, duration: 120, state: "completed" },
  { id: "b3", title: "Design review", start: 11*60, duration: 45, state: "in-progress" },
  { id: "b4", title: "Lunch", start: 12*60, duration: 45 },
  { id: "b5", title: "1:1 with Sam", start: 13*60, duration: 30 },
  { id: "b6", title: "Settings spec", start: 14*60, duration: 90 },
  { id: "b7", title: "Critique", start: 16*60, duration: 60 },
];

// Weekly
window.WEEK_POOL = [
  { title: "Finalize onboarding spec", note: "Aim for Wed handoff" },
  { title: "Q3 planning prep", note: "Read draft, take notes" },
  { title: "Design system audit" },
  { title: "Coffee w/ Marisol", note: "Career chat" },
  { title: "Draft brand presentation" },
];
window.WEEK_DAYS = [
  { num: 4, tasks: [
    { title: "Onboarding final review" },
    { title: "Submit expenses", kind: "muted", note: "End of pay cycle" },
  ]},
  { num: 5, tasks: [
    { title: "Q3 planning prep", note: "Block 2h" },
    { title: "Coffee w/ Marisol", kind: "info" },
  ]},
  { num: 6, tasks: [
    { title: "Onboarding handoff", kind: "success", note: "Hard deadline" },
    { title: "Design system audit" },
  ]},
  { num: 7, tasks: [
    { title: "Critique day", kind: "info" },
  ]},
  { num: 8, tasks: [
    { title: "Buffer day", kind: "muted", note: "No meetings if possible" },
  ]},
  { num: 9, tasks: [
    { title: "Long run", kind: "muted" },
  ]},
  { num: 10, tasks: [
    { title: "Mom's birthday", kind: "info" },
    { title: "Read Q3 doc" },
  ]},
];

// Monthly — list of weeks, each with a bucket of tasks (no duration)
window.MONTH_POOL = [
  { title: "Ship onboarding v3" },
  { title: "Run Q3 planning offsite", note: "Half-day in week 3" },
  { title: "Hire senior designer", note: "Close 2 candidates" },
  { title: "Brand refresh kickoff" },
  { title: "Annual review prep" },
];
window.MONTH_WEEKS = [
  { label: "Week 18", range: "Apr 27 – May 3", tasks: [
    { title: "Onboarding v3 ship", kind: "success" },
    { title: "Final design reviews", kind: "info" },
    { title: "Close two candidate loops", note: "Senior designer" },
  ]},
  { label: "Week 19", range: "May 4 – May 10", tasks: [
    { title: "Brand refresh kickoff", kind: "info" },
    { title: "Hiring panels", note: "Wed + Thu" },
    { title: "Mom's birthday", kind: "muted", note: "Saturday" },
  ]},
  { label: "Week 20", range: "May 11 – May 17", tasks: [
    { title: "Q3 planning offsite", kind: "success", note: "Half-day Tue" },
    { title: "Annual reviews start" },
    { title: "Brand R1 review" },
  ]},
  { label: "Week 21", range: "May 18 – May 24", tasks: [
    { title: "Reviews continue" },
    { title: "Brand R2", kind: "muted" },
  ]},
  { label: "Week 22", range: "May 25 – May 31", tasks: [
    { title: "Wrap reviews", kind: "success" },
  ]},
];
