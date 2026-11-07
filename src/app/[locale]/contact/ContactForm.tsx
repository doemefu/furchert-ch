'use client';

// Ported from the prototype (pages.jsx PageContact form). The prototype's
// optimistic `onSubmit -> setSent(true)` (a silent fake success) is
// deliberately replaced: success renders ONLY after the real server action
// returns {ok:true}; a thrown/invalid result shows a visible error and never
// shows success (worklog F7, CLAUDE.md "no silent fake success").
//
// Topic, call back and source (#145, spec v2 §5.2 and §5.3). «Rückruf
// gewünscht» starts unchecked; only the «Rückruf anfordern» link
// (`?from=automation-callback`) ticks it. The page stays prerendered, so
// `?from=` is read in the browser only (useSyncExternalStore, null on the
// server): an id on FROM_IDS preselects the demo topic and is sent with the
// enquiry, then the parameter leaves the address bar. A missing parameter
// never resets what the visitor chose. No cookie, no storage. The phone
// number shown on success is the visitor's own input, never sent back by the
// server.
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/ui/Icon';
import { Btn } from '@/components/ui/Btn';
import { HEARD_VIA_IDS, heardViaMessageKey, isFromId, type FromId } from '@/data/contact-sources';
import { submitContact, type ContactTopic } from './actions';

const labelStyle = {
  fontFamily: 'var(--mono)',
  fontSize: '.75rem',
  letterSpacing: '.05em',
  textTransform: 'uppercase' as const,
  color: 'var(--n-60)',
};
const inputStyle = {
  padding: '.75rem 1rem',
  border: '1px solid rgba(162,167,176,.35)',
  borderRadius: '2px',
  background: 'var(--n-10)',
  fontFamily: 'var(--sans)',
  fontSize: '1rem',
  color: 'var(--n-100)',
  outline: 'none',
};
const fieldStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '.4rem' };
const helpStyle: CSSProperties = { fontSize: '.8125rem', color: 'var(--n-60)', lineHeight: 1.5 };
// Radio and checkbox rows: the whole row is the label, at least 44 px high.
const choiceStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '.75rem',
  minHeight: 44,
  fontFamily: 'var(--sans)',
  fontSize: '1rem',
  lineHeight: 1.4,
  color: 'var(--n-100)',
  cursor: 'pointer',
};
const choiceInputStyle: CSSProperties = {
  width: '1.125rem',
  height: '1.125rem',
  flexShrink: 0,
  accentColor: 'var(--blue-base)',
};
const textLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 44,
  fontFamily: 'var(--mono)',
  fontSize: '.75rem',
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  color: 'var(--blue-base)',
  textDecoration: 'none',
};

type ErrorCode = 'invalid' | 'phone' | 'server' | 'rate_limited';

const noSubscribe = () => () => {};
// The allowlisted `from` of the current address, or null.
const readFrom = (): FromId | null => {
  const raw = new URLSearchParams(window.location.search).get('from');
  return isFromId(raw) ? raw : null;
};
const noFrom = () => null;

export function ContactForm() {
  const t = useTranslations('contact');
  const urlFrom = useSyncExternalStore(noSubscribe, readFrom, noFrom);
  // The `from` of this visit, kept after the parameter leaves the address bar.
  const [from, setFrom] = useState<FromId | null>(null);
  if (urlFrom !== null && urlFrom !== from) {
    // Adjusting state while rendering (react.dev, "Storing information from
    // previous renders"); `urlFrom` is null again once the URL is cleaned.
    setFrom(urlFrom);
  }
  // The visitor's own choices; null until they touch the control.
  const [topicChoice, setTopicChoice] = useState<ContactTopic | null>(null);
  const [callbackChoice, setCallbackChoice] = useState<boolean | null>(null);
  // Defaults: every call-to-action id asks for the live demo; only the
  // «Rückruf anfordern» link ticks the call back (spec v2 c2 M7).
  const topic: ContactTopic | null = topicChoice ?? (from ? 'demo' : null);
  const callback = callbackChoice ?? from === 'automation-callback';

  const [sent, setSent] = useState<{ topic: ContactTopic | null; phone: string | null } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ErrorCode | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', heardVia: '', form_check: '' });
  const phoneRef = useRef<HTMLInputElement>(null);
  const sentRef = useRef<HTMLHeadingElement>(null);

  // Remove `?from=` from the address bar once it is kept in state, so a
  // reload or a shared link does not count the button twice. The state
  // Next.js keeps in history is passed on unchanged.
  useEffect(() => {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get('from');
    if (raw === null || (isFromId(raw) && raw !== from)) return;
    url.searchParams.delete('from');
    window.history.replaceState(window.history.state, '', url);
  }, [from]);

  useEffect(() => {
    if (sent) sentRef.current?.focus();
  }, [sent]);

  const errorText = (code: ErrorCode) => {
    switch (code) {
      case 'phone':
        return t('errorPhone');
      case 'server':
        return t('errorServer');
      case 'rate_limited':
        return t('errorRateLimited');
      default:
        return t('errorInvalid');
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await submitContact({
        ...form,
        topic: topic ?? undefined,
        callback,
        from: from ?? undefined,
      });
      if (res.ok) {
        setSent({ topic, phone: callback ? form.phone.trim() : null });
      } else {
        setError(res.error);
        if (res.error === 'phone') phoneRef.current?.focus();
      }
    } catch {
      // Thrown/network error -> visible error, NEVER a success state.
      setError('server');
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div role="status" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <span style={{ color: '#22c55e' }}>
            <Icon name="check" size={20} />
          </span>
          <h2
            ref={sentRef}
            tabIndex={-1}
            style={{ fontFamily: 'var(--sans)', fontSize: '1.125rem', fontWeight: 500, color: 'var(--n-100)' }}
          >
            {t('sent')}
          </h2>
        </div>
        <p style={{ fontSize: '.9375rem', color: 'var(--n-60)', lineHeight: 1.55 }}>
          {sent.topic === 'demo' ? t('sentSubDemo') : t('sentSub')}
        </p>
        {sent.phone && (
          <p style={{ fontSize: '.9375rem', color: 'var(--n-70)', lineHeight: 1.55 }}>
            {t('sentPhone', { phone: sent.phone })}
          </p>
        )}
        {sent.topic === 'demo' && (
          <Link href="/automation" style={textLinkStyle}>
            {t('sentBack')}
          </Link>
        )}
      </div>
    );
  }

  const phoneInvalid = error === 'phone';

  return (
    <form
      onSubmit={handleSubmit}
      className="contact-form"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      {/* Honeypot: hidden from sighted users (off-canvas, not display:none so
          bots still see it), not tab-reachable, no visible label. A filled
          value silently marks the submission invalid in the server action. */}
      <input
        type="text"
        name="form_check"
        value={form.form_check}
        onChange={(e) => setForm({ ...form, form_check: e.target.value })}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
      />
      <fieldset
        aria-describedby="contact-topic-help"
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}
      >
        <legend style={{ ...labelStyle, padding: 0, marginBottom: '.4rem' }}>{t('topicLegend')}</legend>
        <label style={choiceStyle}>
          <input
            type="radio"
            name="topic"
            value="demo"
            checked={topic === 'demo'}
            onChange={() => setTopicChoice('demo')}
            style={choiceInputStyle}
          />
          {t('topicDemo')}
        </label>
        <label style={choiceStyle}>
          <input
            type="radio"
            name="topic"
            value="other"
            checked={topic === 'other'}
            onChange={() => setTopicChoice('other')}
            style={choiceInputStyle}
          />
          {t('topicOther')}
        </label>
        <p id="contact-topic-help" style={{ ...helpStyle, marginTop: '.25rem' }}>
          {t('topicHelp')}
        </p>
      </fieldset>
      <div style={fieldStyle}>
        <label htmlFor="contact-name" style={labelStyle}>
          {t('name')}
        </label>
        <input
          id="contact-name"
          type="text"
          autoComplete="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          maxLength={200}
          style={inputStyle}
        />
      </div>
      <div style={fieldStyle}>
        <label htmlFor="contact-email" style={labelStyle}>
          {callback ? t('emailOptional') : t('email')}
        </label>
        <input
          id="contact-email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required={!callback}
          maxLength={254}
          aria-describedby="contact-email-help"
          style={inputStyle}
        />
        <p id="contact-email-help" style={helpStyle}>
          {t('reachHelp')}
        </p>
      </div>
      <div style={fieldStyle}>
        <label style={choiceStyle}>
          <input
            id="contact-callback"
            type="checkbox"
            checked={callback}
            onChange={(e) => setCallbackChoice(e.target.checked)}
            aria-describedby="contact-callback-help"
            style={choiceInputStyle}
          />
          {t('callback')}
        </label>
        <p id="contact-callback-help" style={helpStyle}>
          {t('callbackHelp')}
        </p>
      </div>
      <div style={fieldStyle}>
        <label htmlFor="contact-phone" style={labelStyle}>
          {callback ? t('phoneRequired') : t('phone')}
        </label>
        <input
          id="contact-phone"
          ref={phoneRef}
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          required={callback}
          maxLength={40}
          aria-invalid={phoneInvalid || undefined}
          aria-describedby={phoneInvalid ? 'contact-error' : undefined}
          style={inputStyle}
        />
      </div>
      <div style={fieldStyle}>
        <label htmlFor="contact-message" style={labelStyle}>
          {t('msg')}
        </label>
        <textarea
          id="contact-message"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder={t('msgPlaceholder')}
          rows={5}
          maxLength={5000}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>
      <div style={fieldStyle}>
        <label htmlFor="contact-heard-via" style={labelStyle}>
          {t('heardVia')}
        </label>
        <select
          id="contact-heard-via"
          value={form.heardVia}
          onChange={(e) => setForm({ ...form, heardVia: e.target.value })}
          style={{ ...inputStyle, width: '100%', minWidth: 0 }}
        >
          <option value="">{t('heardViaNone')}</option>
          {HEARD_VIA_IDS.map((id) => (
            <option key={id} value={id}>
              {t(heardViaMessageKey(id))}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p id="contact-error" role="alert" style={{ fontSize: '.875rem', color: '#dc2626', lineHeight: 1.5 }}>
          {errorText(error)}
        </p>
      )}
      <Btn type="submit" dark disabled={pending}>
        {pending ? '…' : topic === 'demo' ? t('sendDemo') : t('send')} <Icon name="arrow" size={12} />
      </Btn>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        <p style={helpStyle}>{t('noPressure')}</p>
        <p style={helpStyle}>{t('privacyNote')}</p>
      </div>
    </form>
  );
}
