'use client';

// MOCKUP ONLY. The "Beispiel-Report / Sample report" badge and the
// disclaimer at the bottom make the demo nature unmistakable even if
// the page is screenshotted. CLAUDE.md "Automation = mockup",
// review-guidelines.md "no fake 'success' presented as real".
//
// No PDF download CTA: there is no real PDF to deliver, and the rule
// is to never present non-functional UI as functional (worklog F2 / C7).
import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import { Icon } from '@/components/ui/Icon';
import { Btn } from '@/components/ui/Btn';
import { DEMO_REPORT, type ReportTier } from './_demo-report';

// Tier colours come from the ETHON token set (see globals.css `:root`
// — `--tier-high`, `--tier-mid`, `--tier-long`).
const TIER_COLOR: Record<ReportTier, string> = {
  high: 'var(--tier-high)',
  mid: 'var(--tier-mid)',
  long: 'var(--tier-long)',
};

const labelMono = {
  fontFamily: 'var(--mono)',
  fontSize: '.8125rem',
  letterSpacing: '.06em',
  textTransform: 'uppercase' as const,
  color: 'var(--n-50)',
};

export function Step4Report({ locale }: { locale: Locale }) {
  const t = useTranslations('pages.scan');
  const r = DEMO_REPORT.i18n[locale];

  const tierLabelKey: Record<ReportTier, 'step4TierHigh' | 'step4TierMid' | 'step4TierLong'> = {
    high: 'step4TierHigh',
    mid: 'step4TierMid',
    long: 'step4TierLong',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '.7rem',
            letterSpacing: '.06em',
            textTransform: 'uppercase',
            padding: '.2rem .6rem',
            border: '1px solid var(--blue-base)',
            borderRadius: '2px',
            color: 'var(--blue-base)',
            background: 'var(--blue-wash)',
          }}
        >
          {t('step4SampleBadge')}
        </span>
        <span style={{ ...labelMono }}>{t('stepIndicator', { n: 4 })}</span>
      </div>

      <h1
        style={{
          fontFamily: 'var(--sans)',
          fontSize: 'clamp(1.8rem,4vw,2.75rem)',
          fontWeight: 500,
          letterSpacing: '-.03em',
          color: 'var(--n-100)',
          margin: '0 0 2rem',
        }}
      >
        {t('step4Title')}
      </h1>

      {/* Section 1 */}
      <section style={{ paddingBottom: '2rem', borderBottom: '1px solid rgba(162,167,176,.22)' }}>
        <p style={{ ...labelMono, marginBottom: '1rem' }}>{t('step4Section1')}</p>
        <p style={{ fontSize: '1rem', color: 'var(--n-70)', lineHeight: 1.55, maxWidth: '64ch' }}>{r.section1}</p>
      </section>

      {/* Section 2 — potentials */}
      <section style={{ padding: '2rem 0', borderBottom: '1px solid rgba(162,167,176,.22)' }}>
        <p style={{ ...labelMono, marginBottom: '1.5rem' }}>{t('step4Section2')}</p>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {r.potentials.map((p, i) => (
            <article
              key={i}
              style={{
                border: '1px solid rgba(162,167,176,.22)',
                borderLeft: `3px solid ${TIER_COLOR[p.tier]}`,
                borderRadius: '2px',
                padding: '1.25rem 1.5rem',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '.7rem',
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  color: TIER_COLOR[p.tier],
                  marginBottom: '.5rem',
                }}
              >
                {t(tierLabelKey[p.tier])}
              </div>
              <div
                style={{
                  fontFamily: 'var(--sans)',
                  fontSize: '1.125rem',
                  fontWeight: 500,
                  letterSpacing: '-.02em',
                  color: 'var(--n-100)',
                  marginBottom: '.5rem',
                }}
              >
                {p.title}
              </div>
              <p style={{ fontSize: '.9375rem', color: 'var(--n-70)', lineHeight: 1.55, marginBottom: '.5rem' }}>
                {p.what}
              </p>
              <div style={{ fontSize: '.875rem', color: 'var(--n-60)' }}>
                {p.effort} · {p.saving}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Section 3 */}
      <section style={{ padding: '2rem 0', borderBottom: '1px solid rgba(162,167,176,.22)' }}>
        <p style={{ ...labelMono, marginBottom: '1rem' }}>{t('step4Section3')}</p>
        <p
          style={{
            fontSize: '1rem',
            color: 'var(--n-80)',
            lineHeight: 1.6,
            maxWidth: '60ch',
            padding: '1rem 1.25rem',
            background: 'var(--blue-wash)',
            border: '1px solid rgba(14,60,166,.15)',
            borderRadius: '2px',
          }}
        >
          {r.recommended}
        </p>
      </section>

      {/* Section 4 — next steps */}
      <section style={{ padding: '2rem 0', borderBottom: '1px solid rgba(162,167,176,.22)' }}>
        <p style={{ ...labelMono, marginBottom: '1rem' }}>{t('step4Section4')}</p>
        <p style={{ fontSize: '.9375rem', color: 'var(--n-70)', lineHeight: 1.55, maxWidth: '60ch', marginBottom: '1.5rem' }}>
          {r.next}
        </p>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <article style={{ border: '1px solid rgba(162,167,176,.22)', borderRadius: '2px', padding: '1.25rem' }}>
            <div
              style={{
                fontFamily: 'var(--sans)',
                fontSize: '1rem',
                fontWeight: 500,
                letterSpacing: '-.02em',
                color: 'var(--n-100)',
                marginBottom: '.5rem',
              }}
            >
              {t('step4DeepTitle')}
            </div>
            <p style={{ fontSize: '.875rem', color: 'var(--n-60)', lineHeight: 1.5, marginBottom: '1rem' }}>
              {t('step4DeepDesc')}
            </p>
            <Btn href="/contact" dark>
              {t('step4DeepCta')} <Icon name="arrow" size={12} />
            </Btn>
          </article>
          <article style={{ border: '1px solid rgba(162,167,176,.22)', borderRadius: '2px', padding: '1.25rem' }}>
            <div
              style={{
                fontFamily: 'var(--sans)',
                fontSize: '1rem',
                fontWeight: 500,
                letterSpacing: '-.02em',
                color: 'var(--n-100)',
                marginBottom: '.5rem',
              }}
            >
              {t('step4CallTitle')}
            </div>
            <p style={{ fontSize: '.875rem', color: 'var(--n-60)', lineHeight: 1.5, marginBottom: '1rem' }}>
              {t('step4CallDesc')}
            </p>
            <Btn href="/contact">{t('step4CallCta')}</Btn>
          </article>
        </div>
      </section>

      {/* Disclaimer */}
      <section style={{ padding: '1.5rem 0 0' }}>
        <p style={{ ...labelMono, fontSize: '.7rem', marginBottom: '.5rem' }}>{t('step4Disclaimer')}</p>
        <p style={{ fontSize: '.8125rem', color: 'var(--n-50)', lineHeight: 1.55, maxWidth: '64ch' }}>
          {r.disclaimer}
        </p>
      </section>
    </div>
  );
}
