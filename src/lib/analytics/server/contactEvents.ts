// Goal and enquiry of a successful contact submission (spec 100 §5.9, C11,
// Q4; WA-2b #154). Called by the contact Server Action after the mail went
// out; never throws and never changes the form result.
//
// - enquiry: every successful submission without an Auth.js session cookie
//   while ANALYTICS_COLLECT_ENABLED is on, independent of the UI flag (live
//   from WA-2b on, §1.4). No identifier, no content, server-generated id.
// - goal: only when the form says tracking is allowed (`analytics === true`),
//   an existing current `fa_vid` is present (the action never mints), there
//   is no session cookie and both switches are on.
import { currentVisitorId, hasSessionCookie, readVisitorCookie } from './cookie';
import { enquiryEvent, goalEvent, type ForwardEvent } from './forwardModel';
import type { SiteLocale } from '../registry';

export interface ContactEventDeps {
  enqueue(events: ForwardEvent[], opts: { priority: true }): void;
  now: () => number;
  uiEnabled: boolean;
  collectEnabled: boolean;
}

export interface ContactSubmission {
  analytics: unknown;
  cookieHeader: string | null;
  locale: SiteLocale;
}

export function recordContactSubmission(s: ContactSubmission, deps: ContactEventDeps): void {
  try {
    if (!deps.collectEnabled || hasSessionCookie(s.cookieHeader)) return;
    const now = deps.now();
    const events = [enquiryEvent(now)];
    const visitorId = currentVisitorId(readVisitorCookie(s.cookieHeader));
    if (deps.uiEnabled && s.analytics === true && visitorId) events.push(goalEvent(visitorId, s.locale, now));
    deps.enqueue(events, { priority: true });
  } catch {
    // never affects the form result
  }
}
