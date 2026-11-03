// Trade stories (src/data/automation-stories.ts): who, the work today, what
// changes with AI, what the owner keeps deciding, where the data goes and
// which package fits. Server component. The two bars per story are
// decorative (aria-hidden); the hours are in the text next to them.
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { Tag } from '@/components/ui/Tag';
import { STORIES } from '@/data/automation-stories';
import {
  HAIRLINE,
  bodyText,
  cardTitle,
  fieldLabel,
  h2Style,
  labelMono,
  leadStyle,
  sectionStyle,
} from './sectionStyles';

const ddStyle = { ...bodyText, margin: '.35rem 0 1.25rem' };

function HoursBar({
  label,
  value,
  share,
  strong,
}: {
  label: string;
  value: string;
  share: number;
  strong?: boolean;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '4.5rem 1fr 4.5rem',
        alignItems: 'center',
        gap: '.75rem',
        fontSize: '.875rem',
        color: 'var(--n-70)',
      }}
    >
      <span>{label}</span>
      <span
        aria-hidden="true"
        style={{ display: 'block', height: 8, background: 'rgba(162,167,176,.15)' }}
      >
        <span
          style={{
            display: 'block',
            height: '100%',
            width: `${Math.round(share * 100)}%`,
            background: strong ? 'var(--blue-base)' : 'var(--n-20)',
          }}
        />
      </span>
      <span style={{ fontFamily: 'var(--mono)', color: 'var(--n-100)', textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
}

export async function AutomationStories({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'pages.automation' });

  return (
    <section aria-labelledby="stories-heading" style={sectionStyle}>
      <p style={labelMono}>{t('useCaseLabel')}</p>
      <h2 id="stories-heading" style={h2Style}>
        {t('useCaseHeading')}
      </h2>
      <p style={leadStyle}>{t('useCaseLead')}</p>
      <div
        style={{
          display: 'grid',
          // At most two columns; one column on phones.
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, max(24rem, 40%)), 1fr))',
          borderTop: HAIRLINE,
        }}
      >
        {STORIES.map((story) => {
          const c = story.i18n[locale];
          // "Beispiel · Trade · Size": the label in the tag, the rest beside
          // it so long trade names can wrap on phones.
          const [tagLabel, ...tagRest] = c.tag.split(' · ');
          return (
            <article
              key={story.id}
              style={{ padding: '2rem', borderRight: HAIRLINE, borderBottom: HAIRLINE }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '.5rem' }}>
                <Tag blue>{tagLabel}</Tag>
                <span style={fieldLabel}>{tagRest.join(' · ')}</span>
              </div>
              <h3 style={{ ...cardTitle, margin: '1rem 0 1.5rem', textWrap: 'balance' }}>
                {c.title}
              </h3>

              <p style={{ ...fieldLabel, marginBottom: '.6rem' }}>{t('storyHoursNote')}</p>
              <div style={{ display: 'grid', gap: '.5rem', marginBottom: '1.75rem' }}>
                <HoursBar
                  label={t('storyToday')}
                  value={t('storyHoursValue', { hours: story.hoursBefore })}
                  share={1}
                />
                <HoursBar
                  label={t('storyWithAi')}
                  value={t('storyHoursValue', { hours: story.hoursAfter })}
                  share={story.hoursAfter / story.hoursBefore}
                  strong
                />
              </div>

              <dl style={{ margin: 0 }}>
                <dt style={fieldLabel}>{t('storyToday')}</dt>
                <dd style={ddStyle}>{c.today}</dd>
                <dt style={fieldLabel}>{t('storyWithAi')}</dt>
                <dd style={ddStyle}>{c.withAi}</dd>
                <dt style={fieldLabel}>{t('storyDecide')}</dt>
                <dd style={ddStyle}>{c.decide}</dd>
                <dt style={fieldLabel}>{t('storyData')}</dt>
                <dd style={ddStyle}>
                  <ol
                    style={{
                      listStyle: 'none',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '.4rem',
                      padding: 0,
                      margin: '.15rem 0 0',
                    }}
                  >
                    {c.dataPath.map((station, i) => (
                      <li
                        key={station}
                        style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}
                      >
                        <span
                          style={{
                            fontSize: '.8125rem',
                            color: 'var(--n-80)',
                            background: 'var(--white)',
                            border: '1px solid rgba(162,167,176,.3)',
                            borderRadius: '2px',
                            padding: '.2rem .5rem',
                          }}
                        >
                          {station}
                        </span>
                        {i < c.dataPath.length - 1 && (
                          <span aria-hidden="true" style={{ color: 'var(--n-50)' }}>
                            →
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                  {c.dataNote && (
                    <p style={{ marginTop: '.6rem', fontSize: '.875rem' }}>{c.dataNote}</p>
                  )}
                </dd>
                <dt style={fieldLabel}>{t('storyFit')}</dt>
                <dd style={{ ...ddStyle, marginBottom: 0, color: 'var(--n-100)' }}>{c.fit}</dd>
              </dl>
            </article>
          );
        })}
      </div>
      <p
        style={{
          marginTop: '2rem',
          fontSize: '1rem',
          color: 'var(--n-70)',
          fontStyle: 'italic',
          maxWidth: '68ch',
        }}
      >
        {t('useCaseFooter')}
      </p>
    </section>
  );
}
