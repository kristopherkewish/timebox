import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/shell/Header';
import { ACCENTS, useTheme } from '@/lib/theme';
import type { Accent } from '@/lib/theme';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { useAuth, useSignOut } from '@/hooks/useAuth';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';
import { DeleteAccountModal } from '@/components/auth/DeleteAccountModal';

const INCREMENTS = [5, 10, 15, 30, 60] as const;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function SettingsPage() {
  const { user } = useAuth();
  const { theme, accent, setTheme, setAccent } = useTheme();
  const { settings } = useSettings();
  const update = useUpdateSettings();
  const signOut = useSignOut();
  const navigate = useNavigate();

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  const handleSignOut = async () => {
    await signOut.mutateAsync();
    navigate('/sign-in', { replace: true });
  };

  const handleExport = async () => {
    const res = await fetch('/api/account/export', { credentials: 'include' });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timebox-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Header eyebrow="Settings" title="Settings" />
      <div className="settings-wrap">
        <section className="settings-section">
          <h2>Appearance</h2>
          <div className="settings-row">
            <div>
              <div className="label">Theme</div>
              <div className="desc">Light is easier in daylight; dark is calmer at night.</div>
            </div>
            <div className="control">
              <select
                className="settings-select"
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="label">Accent</div>
              <div className="desc">Tints the timeline, rail indicator, and chrome.</div>
            </div>
            <div className="control accent-grid">
              {ACCENTS.map((a) => (
                <AccentChip key={a} accent={a} active={accent === a} onSelect={setAccent} />
              ))}
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2>Timeline</h2>
          <div className="settings-row">
            <div>
              <div className="label">Default increment</div>
              <div className="desc">Snapping granularity for drag-drop and resize.</div>
            </div>
            <div className="control">
              <select
                className="settings-select"
                value={settings.defaultIncrementMin}
                onChange={(e) => update.mutate({ defaultIncrementMin: Number(e.target.value) })}
              >
                {INCREMENTS.map((m) => (
                  <option key={m} value={m}>
                    {m} min
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="label">Visible day starts</div>
              <div className="desc">Top of the daily view.</div>
            </div>
            <div className="control">
              <select
                className="settings-select"
                value={settings.dayStartMin}
                onChange={(e) => update.mutate({ dayStartMin: Number(e.target.value) })}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h * 60}>
                    {fmtHour(h)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="label">Visible day ends</div>
              <div className="desc">Bottom of the daily view.</div>
            </div>
            <div className="control">
              <select
                className="settings-select"
                value={settings.dayEndMin}
                onChange={(e) => update.mutate({ dayEndMin: Number(e.target.value) })}
              >
                {HOURS.slice(1).concat([24]).map((h) => (
                  <option key={h} value={h * 60}>
                    {fmtHour(h)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="label">Allow overlapping timeboxes</div>
              <div className="desc">Off by default. On lets you stack parallel activities.</div>
            </div>
            <div className="control">
              <button
                type="button"
                className={`toggle ${settings.allowOverlap ? 'on' : ''}`}
                aria-pressed={settings.allowOverlap}
                onClick={() => update.mutate({ allowOverlap: !settings.allowOverlap })}
              />
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2>Week and calendar</h2>
          <div className="settings-row">
            <div>
              <div className="label">First day of week</div>
              <div className="desc">Used by the weekly planner.</div>
            </div>
            <div className="control">
              <select
                className="settings-select"
                value={settings.firstDayOfWeek}
                onChange={(e) => update.mutate({ firstDayOfWeek: Number(e.target.value) })}
              >
                <option value={1}>Monday</option>
                <option value={0}>Sunday</option>
              </select>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2>Account</h2>
          <div className="settings-row">
            <div>
              <div className="label">Signed in as</div>
              <div className="desc">{user?.email}</div>
            </div>
            <div className="control">
              <span style={{ fontSize: 13, color: 'var(--ink)' }}>{user?.username}</span>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="label">Password</div>
              <div className="desc">Other devices will be signed out after a change.</div>
            </div>
            <div className="control">
              <button type="button" className="tb-btn" onClick={() => setShowChangePassword(true)}>
                Change password
              </button>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="label">Export data</div>
              <div className="desc">Downloads a JSON file with every task, plan, and note.</div>
            </div>
            <div className="control">
              <button type="button" className="tb-btn" onClick={handleExport}>
                Export
              </button>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="label">Sign out</div>
              <div className="desc">Ends the current session on this browser.</div>
            </div>
            <div className="control">
              <button type="button" className="tb-btn" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="label">Delete account</div>
              <div className="desc">Permanent. Removes all of your data.</div>
            </div>
            <div className="control">
              <button type="button" className="tb-btn danger" onClick={() => setShowDeleteAccount(true)}>
                Delete…
              </button>
            </div>
          </div>
        </section>
      </div>
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
      {showDeleteAccount && <DeleteAccountModal onClose={() => setShowDeleteAccount(false)} />}
    </>
  );
}

function AccentChip({
  accent,
  active,
  onSelect,
}: {
  accent: Accent;
  active: boolean;
  onSelect: (a: Accent) => void;
}) {
  return (
    <button
      type="button"
      className="accent-chip"
      onClick={() => onSelect(accent)}
      data-accent={accent}
      title={accent}
      aria-label={accent}
      aria-pressed={active}
    />
  );
}

function fmtHour(h: number): string {
  if (h === 0) return '12:00 AM (midnight)';
  if (h === 12) return '12:00 PM (noon)';
  if (h === 24) return '12:00 AM (next day)';
  if (h < 12) return `${h}:00 AM`;
  return `${h - 12}:00 PM`;
}
