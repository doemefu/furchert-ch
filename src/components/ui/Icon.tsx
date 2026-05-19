// Icon set ported verbatim from the prototype (shared.jsx Icon).
import type { CSSProperties, ReactElement } from 'react';

export type IconName =
  | 'arrow' | 'lock' | 'github' | 'ext' | 'server' | 'globe' | 'code' | 'chip'
  | 'spark' | 'chart' | 'db' | 'flow' | 'git' | 'users' | 'mic' | 'boat'
  | 'iot' | 'ai' | 'check' | 'cpu';

export function Icon({ name, size = 16 }: { name: IconName | string; size?: number }) {
  const s: CSSProperties = { width: size, height: size, display: 'block', flexShrink: 0 };
  const icons: Record<string, ReactElement> = {
    arrow: <svg style={s} viewBox="0 0 12 12" fill="none"><path d="M1 2L6 6.583L1 11.167" stroke="currentColor" strokeWidth="1.2" /><path d="M6 2L11 6.583L6 11.167" stroke="currentColor" strokeWidth="1.2" /></svg>,
    lock: <svg style={s} viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.2" /></svg>,
    github: <svg style={s} viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>,
    ext: <svg style={s} viewBox="0 0 12 12" fill="none"><path d="M5 2H2v8h8V7M7 1h4v4M11 1L5.5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>,
    server: <svg style={s} viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" /><rect x="1" y="10" width="14" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" /><circle cx="12.5" cy="3.5" r=".75" fill="currentColor" /><circle cx="12.5" cy="12.5" r=".75" fill="currentColor" /></svg>,
    globe: <svg style={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" /><path d="M8 1.5C8 1.5 5 4.5 5 8s3 6.5 3 6.5M8 1.5C8 1.5 11 4.5 11 8s-3 6.5-3 6.5M1.5 8h13" stroke="currentColor" strokeWidth="1.2" /></svg>,
    code: <svg style={s} viewBox="0 0 16 16" fill="none"><path d="M2 4l4 4-4 4M7 12h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    chip: <svg style={s} viewBox="0 0 16 16" fill="none"><rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M6 1v3M10 1v3M6 12v3M10 12v3M1 6h3M1 10h3M12 6h3M12 10h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>,
    spark: <svg style={s} viewBox="0 0 16 16" fill="none"><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.2" /></svg>,
    chart: <svg style={s} viewBox="0 0 16 16" fill="none"><path d="M1 12l4-4 3 3 4-5 3 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M1 15h14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>,
    db: <svg style={s} viewBox="0 0 16 16" fill="none"><ellipse cx="8" cy="4" rx="6" ry="2" stroke="currentColor" strokeWidth="1.2" /><path d="M2 4v4c0 1.1 2.69 2 6 2s6-.9 6-2V4" stroke="currentColor" strokeWidth="1.2" /><path d="M2 8v4c0 1.1 2.69 2 6 2s6-.9 6-2V8" stroke="currentColor" strokeWidth="1.2" /></svg>,
    flow: <svg style={s} viewBox="0 0 16 16" fill="none"><circle cx="3" cy="3" r="2" stroke="currentColor" strokeWidth="1.2" /><circle cx="13" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" /><circle cx="3" cy="13" r="2" stroke="currentColor" strokeWidth="1.2" /><path d="M5 3h3a3 3 0 013 3v2M5 13h3a3 3 0 003-3V8" stroke="currentColor" strokeWidth="1.2" /></svg>,
    git: <svg style={s} viewBox="0 0 16 16" fill="none"><circle cx="4" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" /><circle cx="12" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" /><circle cx="4" cy="12" r="2" stroke="currentColor" strokeWidth="1.2" /><path d="M6 4h4M4 6v4" stroke="currentColor" strokeWidth="1.2" /></svg>,
    users: <svg style={s} viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" /><path d="M1 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><path d="M11 3c1.38 0 2.5 1.12 2.5 2.5S12.38 8 11 8M15 14c0-2.21-1.79-4-4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>,
    mic: <svg style={s} viewBox="0 0 16 16" fill="none"><rect x="5" y="1" width="6" height="9" rx="3" stroke="currentColor" strokeWidth="1.2" /><path d="M2 8a6 6 0 0012 0M8 14v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>,
    boat: <svg style={s} viewBox="0 0 16 16" fill="none"><path d="M2 10l6 4 6-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 2v8M5 5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>,
    iot: <svg style={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" /><path d="M4.5 4.5a5 5 0 000 7M11.5 4.5a5 5 0 010 7M2.5 2.5a8 8 0 000 11M13.5 2.5a8 8 0 010 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>,
    ai: <svg style={s} viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" /><circle cx="5.5" cy="6.5" r="1" fill="currentColor" /><circle cx="10.5" cy="6.5" r="1" fill="currentColor" /><path d="M5 10c.5 1 1.5 1.5 3 1.5s2.5-.5 3-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>,
    check: <svg style={s} viewBox="0 0 16 16" fill="none"><path d="M2 8l4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    cpu: <svg style={s} viewBox="0 0 16 16" fill="none"><rect x="3" y="3" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" /><rect x="5.5" y="5.5" width="5" height="5" stroke="currentColor" strokeWidth="1" /><path d="M5 1v2M8 1v2M11 1v2M5 13v2M8 13v2M11 13v2M1 5h2M1 8h2M1 11h2M13 5h2M13 8h2M13 11h2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" /></svg>,
  };
  return icons[name] || icons.code;
}
