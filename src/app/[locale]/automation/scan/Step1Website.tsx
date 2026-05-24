'use client';

// MOCKUP ONLY. The URL input is decorative; advancing the wizard does
// not validate, scrape or store anything (CLAUDE.md "Automation =
// mockup"; worklog F4 dropped the `pattern` attribute).
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';
import { Btn } from '@/components/ui/Btn';

interface Step1WebsiteProps {
  website: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onSkip: () => void;
}

const labelMono = {
  fontFamily: 'var(--mono)',
  fontSize: '.8125rem',
  letterSpacing: '.06em',
  textTransform: 'uppercase' as const,
  color: 'var(--n-50)',
};

export function Step1Website({ website, onChange, onNext, onSkip }: Step1WebsiteProps) {
  const t = useTranslations('pages.scan');

  return (
    <div>
      <p style={{ ...labelMono, marginBottom: '1rem' }}>{t('step1HeaderLabel')}</p>
      <h1
        style={{
          fontFamily: 'var(--sans)',
          fontSize: 'clamp(1.8rem,4vw,2.75rem)',
          fontWeight: 500,
          letterSpacing: '-.03em',
          color: 'var(--n-100)',
          maxWidth: '22ch',
          lineHeight: 1.09,
          textWrap: 'balance',
          marginBottom: '1rem',
        }}
      >
        {t('step1HeaderTitle')}
      </h1>
      <p
        style={{
          fontSize: 'clamp(1rem,1.4vw,1.25rem)',
          color: 'var(--n-60)',
          maxWidth: '58ch',
          lineHeight: 1.4,
          marginBottom: '2.5rem',
        }}
      >
        {t('step1HeaderSub')}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', maxWidth: '40rem' }}>
        <label htmlFor="scan-website" style={{ ...labelMono, fontSize: '.75rem' }}>
          {t('step1InputLabel')}
        </label>
        <input
          id="scan-website"
          type="url"
          inputMode="url"
          value={website}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('step1InputPlaceholder')}
          style={{
            padding: '.75rem 1rem',
            border: '1px solid rgba(162,167,176,.35)',
            borderRadius: '2px',
            background: 'var(--n-10)',
            fontFamily: 'var(--sans)',
            fontSize: '1rem',
            color: 'var(--n-100)',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Btn type="button" dark onClick={onNext}>
          {t('step1Submit')} <Icon name="arrow" size={12} />
        </Btn>
        {/* worklog F-Q6: stateful link must be a <button>, not <a href>. */}
        <button
          type="button"
          onClick={onSkip}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '.5rem 0',
            fontFamily: 'var(--mono)',
            fontSize: '.75rem',
            letterSpacing: '.04em',
            textTransform: 'uppercase',
            color: 'var(--blue-base)',
          }}
        >
          {t('step1Skip')} →
        </button>
      </div>

      <ul
        style={{
          listStyle: 'none',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginTop: '3rem',
        }}
      >
        {(['step1Trust1', 'step1Trust2', 'step1Trust3'] as const).map((key) => (
          <li
            key={key}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '.5rem',
              fontSize: '.875rem',
              color: 'var(--n-70)',
              lineHeight: 1.5,
            }}
          >
            <span style={{ color: 'var(--blue-base)', flexShrink: 0, marginTop: '.15rem' }}>
              <Icon name="check" size={14} />
            </span>
            {t(key)}
          </li>
        ))}
      </ul>

      <p style={{ ...labelMono, fontSize: '.72rem', marginTop: '3rem' }}>
        {t('stepIndicator', { n: 1 })}
      </p>
    </div>
  );
}
