// DOM ids and window events shared by the consent bar, the footer link and
// globals.css (`html:has(#fa-consent-bar)`). The footer link talks to the
// consent controller only through these events, so its chunk carries no
// controller code (Analytics.tsx owns the controller).
export const CONSENT_BAR_ID = 'fa-consent-bar';
export const CONSENT_TITLE_ID = 'fa-consent-title';
export const PRIVACY_SETTINGS_ID = 'fa-privacy-settings';

/** Analytics → footer link: `{ choice, barOpen }` after every change. */
export const CONSENT_UI_EVENT = 'fa:consent-ui';
/** Footer link → Analytics: reopen the bar. */
export const CONSENT_REOPEN_EVENT = 'fa:consent-reopen';
/** Footer link → Analytics: send the current state now (on subscribe). */
export const CONSENT_UI_REQUEST_EVENT = 'fa:consent-ui-request';

export interface ConsentUiState {
  choice: 'granted' | 'denied' | null;
  barOpen: boolean;
}
