'use client';

// Ported from the prototype (pages.jsx PageContact form). The prototype's
// optimistic `onSubmit -> setSent(true)` (a silent fake success) is
// deliberately replaced: success renders ONLY after the real server action
// returns {ok:true}; a thrown/invalid result shows a visible error and never
// shows success (worklog F7, CLAUDE.md "no silent fake success").
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';
import { Btn } from '@/components/ui/Btn';
import { submitContact } from './actions';

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

export function ContactForm() {
  const t = useTranslations('contact');
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await submitContact(form);
      if (res.ok) {
        setSent(true);
      } else {
        setError(t('errorInvalid'));
      }
    } catch {
      // Thrown/network error -> visible error, NEVER a success state.
      setError(t('errorServer'));
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <span style={{ color: '#22c55e' }}>
            <Icon name="check" size={20} />
          </span>
          <span style={{ fontFamily: 'var(--sans)', fontSize: '1.125rem', fontWeight: 500 }}>
            {t('sent')}
          </span>
        </div>
        <p style={{ fontSize: '.9375rem', color: 'var(--n-60)' }}>{t('sentSub')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {(['name', 'email'] as const).map((id) => (
        <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
          <label htmlFor={`contact-${id}`} style={labelStyle}>
            {t(id)}
          </label>
          <input
            id={`contact-${id}`}
            type={id === 'email' ? 'email' : 'text'}
            value={form[id]}
            onChange={(e) => setForm({ ...form, [id]: e.target.value })}
            required
            style={inputStyle}
          />
        </div>
      ))}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
        <label htmlFor="contact-message" style={labelStyle}>
          {t('msg')}
        </label>
        <textarea
          id="contact-message"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          required
          rows={5}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>
      {error && (
        <p role="alert" style={{ fontSize: '.875rem', color: '#dc2626', lineHeight: 1.5 }}>
          {error}
        </p>
      )}
      <Btn type="submit" dark disabled={pending}>
        {pending ? '…' : t('send')} <Icon name="arrow" size={12} />
      </Btn>
    </form>
  );
}
