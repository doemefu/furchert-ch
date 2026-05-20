'use client';

// MOCKUP ONLY. The submit handler simply advances to Step 4. There is
// NO network call, NO server action, NO `Report per E-Mail` checkbox
// (worklog F7 — we cannot send an email without a backend, so we do
// not offer it). CLAUDE.md "Automation = mockup".
import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import { Icon } from '@/components/ui/Icon';
import { Btn } from '@/components/ui/Btn';
import { SCAN_ROLES } from '@/data/scan';
import type { ContactDraft } from './WizardShell';

interface Step3ContactProps {
  locale: Locale;
  contact: ContactDraft;
  onChange: (next: ContactDraft) => void;
  onBack: () => void;
  onSubmit: () => void;
}

const labelMono = {
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

export function Step3Contact({ locale, contact, onChange, onBack, onSubmit }: Step3ContactProps) {
  const t = useTranslations('pages.scan');
  const disabled =
    contact.name.trim() === '' ||
    contact.email.trim() === '' ||
    !contact.consent;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '46rem' }}>
      <p style={{ ...labelMono, fontSize: '.8125rem', color: 'var(--n-50)' }}>
        {t('stepIndicator', { n: 3 })}
      </p>
      <h2
        style={{
          fontFamily: 'var(--sans)',
          fontSize: 'clamp(1.4rem,3vw,2rem)',
          fontWeight: 500,
          letterSpacing: '-.03em',
          color: 'var(--n-100)',
          margin: 0,
        }}
      >
        {t('step3HeaderTitle')}
      </h2>
      <p style={{ fontSize: '1rem', color: 'var(--n-60)', lineHeight: 1.5, maxWidth: '54ch' }}>
        {t('step3HeaderSub')}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
        <label htmlFor="scan-name" style={labelMono}>
          {t('step3Name')}
        </label>
        <input
          id="scan-name"
          type="text"
          required
          value={contact.name}
          onChange={(e) => onChange({ ...contact, name: e.target.value })}
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
        <label htmlFor="scan-email" style={labelMono}>
          {t('step3Email')}
        </label>
        <input
          id="scan-email"
          type="email"
          required
          value={contact.email}
          onChange={(e) => onChange({ ...contact, email: e.target.value })}
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
        <label htmlFor="scan-phone" style={labelMono}>
          {t('step3Phone')}
        </label>
        <input
          id="scan-phone"
          type="tel"
          value={contact.phone}
          onChange={(e) => onChange({ ...contact, phone: e.target.value })}
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
        <label htmlFor="scan-role" style={labelMono}>
          {t('step3Role')}
        </label>
        <select
          id="scan-role"
          value={contact.role}
          onChange={(e) => onChange({ ...contact, role: e.target.value })}
          style={inputStyle}
        >
          <option value="">{t('step3RolePlaceholder')}</option>
          {SCAN_ROLES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.i18n[locale].label}
            </option>
          ))}
        </select>
      </div>

      <label style={{ display: 'flex', gap: '.75rem', alignItems: 'flex-start', fontSize: '.9rem', color: 'var(--n-70)', lineHeight: 1.5 }}>
        <input
          type="checkbox"
          checked={contact.consent}
          onChange={(e) => onChange({ ...contact, consent: e.target.checked })}
          style={{ marginTop: '.25rem', flexShrink: 0 }}
        />
        <span>{t('step3Consent')}</span>
      </label>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '.5rem' }}>
        <Btn type="button" onClick={onBack}>
          {t('back')}
        </Btn>
        <Btn type="submit" dark disabled={disabled}>
          {t('step3Submit')} <Icon name="arrow" size={12} />
        </Btn>
      </div>
    </form>
  );
}
