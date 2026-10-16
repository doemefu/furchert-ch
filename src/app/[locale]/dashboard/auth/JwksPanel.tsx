// JWKS tab, ported from prototype `auth-admin.jsx` AuthJwks. Shows the real
// public key set from GET /oauth2/jwks (public endpoint, no token). The
// prototype's created/rotated/fingerprint/source metadata and the "rotate"
// button have no API behind them and are omitted rather than invented.
import { getTranslations } from 'next-intl/server';
import { Icon } from '@/components/ui/Icon';
import type { JwksKey } from '@/lib/authadmin/client';
import { CopyButton } from './CopyButton';
import { MonoLabel, cardStyle } from './ui';

// Documented JWKS consumers (../auth-service/CLAUDE.md "Architecture Context").
const USED_BY = ['device-service', 'data-service', 'mcp-hub', 'mosquitto', 'open-webui', 'n8n', 'litellm'];

export async function JwksPanel({ keys }: { keys: JwksKey[] }) {
  const t = await getTranslations('dashboard.authAdmin.jwks');
  const tc = await getTranslations('dashboard.authAdmin.clients');
  const json = JSON.stringify({ keys: keys.map(({ kid, kty, alg, use }) => ({ kid, kty, alg, use })) }, null, 2);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
      <div style={{ ...cardStyle, padding: '1.25rem' }}>
        <MonoLabel mb=".75rem">{t('keys', { count: keys.length })}</MonoLabel>
        {keys.length === 0 && <p style={{ fontFamily: 'var(--mono)', fontSize: '.75rem', color: 'var(--n-50)' }}>{t('noKeys')}</p>}
        {keys.map((k, i) => (
          <div key={k.kid ?? i} style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.85rem' }}>
              <span
                style={{
                  width: 36,
                  height: 36,
                  background: 'var(--n-100)',
                  color: 'var(--white)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '2px',
                }}
              >
                <Icon name="lock" size={14} />
              </span>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '.9rem', fontWeight: 500, color: 'var(--n-100)', wordBreak: 'break-all' }}>{k.kid ?? '—'}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '.65rem', color: 'var(--n-50)' }}>
                  {[k.alg, k.bits ? t('bits', { bits: k.bits }) : null, k.use ? `use=${k.use}` : null].filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '.4rem .9rem', fontFamily: 'var(--mono)', fontSize: '.72rem' }}>
              <span style={{ color: 'var(--n-50)' }}>{t('kid')}</span>
              <span style={{ color: 'var(--n-90)', wordBreak: 'break-all' }}>{k.kid ?? '—'}</span>
              <span style={{ color: 'var(--n-50)' }}>{t('algorithm')}</span>
              <span style={{ color: 'var(--n-90)' }}>{k.alg ?? '—'}</span>
              <span style={{ color: 'var(--n-50)' }}>{t('keyType')}</span>
              <span style={{ color: 'var(--n-90)' }}>{k.kty}</span>
              <span style={{ color: 'var(--n-50)' }}>{t('size')}</span>
              <span style={{ color: 'var(--n-90)' }}>{k.bits ? t('bits', { bits: k.bits }) : '—'}</span>
            </div>
          </div>
        ))}

        <div style={{ marginTop: '1.25rem', padding: '.85rem', background: 'var(--blue-wash)', border: '1px solid rgba(14,60,166,.2)', borderRadius: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.3rem' }}>
            <Icon name="lock" size={11} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: '.65rem', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--blue-base)' }}>
              {t('rotation')}
            </span>
          </div>
          <p style={{ fontSize: '.78rem', color: 'var(--n-80)', lineHeight: 1.5 }}>{t('rotationBody')}</p>
        </div>
      </div>

      <div style={{ background: 'var(--n-100)', borderRadius: '2px', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '.65rem', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--n-30)' }}>
            GET /oauth2/jwks
          </span>
          <CopyButton
            text={json}
            label={tc('copy')}
            copiedLabel={tc('copied')}
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '.62rem',
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,.2)',
              borderRadius: '2px',
              padding: '.3rem .5rem',
              cursor: 'pointer',
              color: 'var(--white)',
            }}
          />
        </div>
        <pre style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: '.72rem', lineHeight: 1.55, color: 'var(--n-30)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
          {json}
        </pre>
        <div style={{ marginTop: '1rem', paddingTop: '.85rem', borderTop: '1px solid rgba(255,255,255,.1)', display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '.62rem', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--n-40)' }}>{t('usedBy')}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
            {USED_BY.map((c) => (
              <span key={c} style={{ fontFamily: 'var(--mono)', fontSize: '.65rem', color: 'var(--n-30)', padding: '.2rem .55rem', border: '1px solid rgba(255,255,255,.18)', borderRadius: '2px' }}>
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
