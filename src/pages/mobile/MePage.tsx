import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';
import { DeleteAccountModal } from '@/components/auth/DeleteAccountModal';
import { useAuth, useSignOut } from '@/hooks/useAuth';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { ACCENTS, useTheme } from '@/lib/theme';

const INCREMENTS = [5, 10, 15, 30, 60] as const;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function MePage() {
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

  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();

  return (
    <>
      <header className="tbm-header">
        <div className="tbm-header-l">
          <div className="tbm-eyebrow">Account</div>
          <div className="tbm-title">{user?.username ?? '…'}</div>
        </div>
        <div className="tbm-avatar">{initials}</div>
      </header>

      <div className="tbm-scroll">
        <div className="tbm-scroll-pad" style={{ paddingBottom: 100 }}>
          <Section title="Appearance">
            <Row title="Theme" desc="Light or dark.">
              <select
                className="tbm-list-select"
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </Row>
            <Row title="Accent" desc="Tints chrome and live state." stacked>
              <div className="accent-grid">
                {ACCENTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className="accent-chip"
                    onClick={() => setAccent(a)}
                    data-accent={a}
                    title={a}
                    aria-label={a}
                    aria-pressed={accent === a}
                  />
                ))}
              </div>
            </Row>
          </Section>

          <Section title="Timeline">
            <Row title="Default increment" desc="Snapping for drag and resize.">
              <select
                className="tbm-list-select"
                value={settings.defaultIncrementMin}
                onChange={(e) =>
                  update.mutate({ defaultIncrementMin: Number(e.target.value) })
                }
              >
                {INCREMENTS.map((m) => (
                  <option key={m} value={m}>
                    {m} min
                  </option>
                ))}
              </select>
            </Row>
            <Row title="Day starts" desc="Top of the daily timeline.">
              <select
                className="tbm-list-select"
                value={settings.dayStartMin}
                onChange={(e) => update.mutate({ dayStartMin: Number(e.target.value) })}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h * 60}>
                    {fmtHour(h)}
                  </option>
                ))}
              </select>
            </Row>
            <Row title="Day ends" desc="Bottom of the daily timeline.">
              <select
                className="tbm-list-select"
                value={settings.dayEndMin}
                onChange={(e) => update.mutate({ dayEndMin: Number(e.target.value) })}
              >
                {HOURS.slice(1).concat([24]).map((h) => (
                  <option key={h} value={h * 60}>
                    {fmtHour(h)}
                  </option>
                ))}
              </select>
            </Row>
            <Row title="Allow overlapping blocks" desc="Stack parallel activities.">
              <button
                type="button"
                className={`toggle${settings.allowOverlap ? ' on' : ''}`}
                aria-pressed={settings.allowOverlap}
                onClick={() => update.mutate({ allowOverlap: !settings.allowOverlap })}
              />
            </Row>
          </Section>

          <Section title="Week and calendar">
            <Row title="First day of week" desc="Used by the weekly planner.">
              <select
                className="tbm-list-select"
                value={settings.firstDayOfWeek}
                onChange={(e) =>
                  update.mutate({ firstDayOfWeek: Number(e.target.value) })
                }
              >
                <option value={1}>Monday</option>
                <option value={0}>Sunday</option>
              </select>
            </Row>
          </Section>

          <Section title="Account">
            <Row title="Email" desc={user?.email ?? ''}>
              <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{user?.username}</span>
            </Row>
            <ActionRow onClick={() => setShowChangePassword(true)}>
              Change password
            </ActionRow>
            <ActionRow onClick={handleExport}>Export data</ActionRow>
            <ActionRow onClick={handleSignOut}>Sign out</ActionRow>
            <ActionRow onClick={() => setShowDeleteAccount(true)} danger>
              Delete account
            </ActionRow>
          </Section>
        </div>
      </div>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
      {showDeleteAccount && <DeleteAccountModal onClose={() => setShowDeleteAccount(false)} />}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="tbm-list">
      <div className="tbm-list-header">
        <div className="tbm-list-title">{title}</div>
      </div>
      {children}
    </section>
  );
}

function Row({
  title,
  desc,
  children,
  stacked,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
  stacked?: boolean;
}) {
  return (
    <div
      className="tbm-list-row"
      style={
        stacked
          ? {
              flexDirection: 'column',
              alignItems: 'stretch',
              gap: 8,
            }
          : undefined
      }
    >
      <div className="info">
        <div className="ttl">{title}</div>
        {desc && <div className="meta">{desc}</div>}
      </div>
      {!stacked ? <div className="right">{children}</div> : children}
    </div>
  );
}

function ActionRow({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className="tbm-list-row tbm-list-action"
      onClick={onClick}
      style={{ width: '100%', textAlign: 'left', font: 'inherit' }}
    >
      <div className="info">
        <div className="ttl" style={danger ? { color: 'var(--warn)' } : undefined}>
          {children}
        </div>
      </div>
      <div className="right" style={{ color: 'var(--ink-4)' }}>
        <ChevRightIcon />
      </div>
    </button>
  );
}

function fmtHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  if (h === 24) return '12 AM (next)';
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

function ChevRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
