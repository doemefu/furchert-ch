'use client';

// MOCKUP ONLY. Renders one question per screen; answers are stored by
// the question's `id` and (for single/multi-choice) by the stable
// option `id` so a mid-flow locale switch preserves the selection
// (worklog F-Q3). Optionality is data-driven (F9 — `q.optional`).
import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import type { ScanQuestion } from '@/data/scan';
import { Icon } from '@/components/ui/Icon';
import { Btn } from '@/components/ui/Btn';
import type { Answer } from './WizardShell';

interface Step2QuestionsProps {
  locale: Locale;
  questions: ScanQuestion[];
  qIndex: number;
  answers: Record<string, Answer>;
  onAnswer: (questionId: string, value: Answer) => void;
  onBack: () => void;
  onNext: () => void;
}

const labelMono = {
  fontFamily: 'var(--mono)',
  fontSize: '.8125rem',
  letterSpacing: '.06em',
  textTransform: 'uppercase' as const,
  color: 'var(--n-50)',
};

const optionRowStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '.75rem',
  padding: '.75rem 1rem',
  border: '1px solid rgba(162,167,176,.22)',
  borderRadius: '2px',
  background: 'var(--white)',
  cursor: 'pointer',
  fontSize: '.9375rem',
  color: 'var(--n-80)',
  lineHeight: 1.4,
};

function answerIsEmpty(a: Answer | undefined): boolean {
  if (a === undefined) return true;
  if (typeof a === 'string') return a.trim() === '';
  return a.length === 0;
}

export function Step2Questions({
  locale,
  questions,
  qIndex,
  answers,
  onAnswer,
  onBack,
  onNext,
}: Step2QuestionsProps) {
  const t = useTranslations('pages.scan');
  const q = questions[qIndex];
  const current = answers[q.id];
  const required = q.optional !== true;
  const nextDisabled = required && answerIsEmpty(current);

  return (
    <div>
      <p style={{ ...labelMono, marginBottom: '.5rem' }}>
        {t('stepIndicator', { n: 2 })} · {t('questionCounter', { n: qIndex + 1, total: questions.length })}
      </p>
      <h2
        style={{
          fontFamily: 'var(--sans)',
          fontSize: 'clamp(1.4rem,3vw,2rem)',
          fontWeight: 500,
          letterSpacing: '-.03em',
          color: 'var(--n-100)',
          maxWidth: '34ch',
          lineHeight: 1.2,
          margin: '0 0 2rem',
        }}
      >
        {q.i18n[locale].text}
      </h2>

      {q.type === 'single' && q.options && (
        <div style={{ display: 'grid', gap: '.5rem', maxWidth: '46rem' }}>
          {q.options.map((opt) => {
            const checked = current === opt.id;
            return (
              <label
                key={opt.id}
                style={{ ...optionRowStyle, borderColor: checked ? 'var(--blue-base)' : 'rgba(162,167,176,.22)' }}
              >
                <input
                  type="radio"
                  name={q.id}
                  checked={checked}
                  onChange={() => onAnswer(q.id, opt.id)}
                  style={{ marginTop: '.15rem' }}
                />
                <span>{opt.i18n[locale].label}</span>
              </label>
            );
          })}
        </div>
      )}

      {q.type === 'multi' && q.options && (
        <div style={{ display: 'grid', gap: '.5rem', maxWidth: '46rem' }}>
          {q.options.map((opt) => {
            const arr = Array.isArray(current) ? current : [];
            const checked = arr.includes(opt.id);
            return (
              <label
                key={opt.id}
                style={{ ...optionRowStyle, borderColor: checked ? 'var(--blue-base)' : 'rgba(162,167,176,.22)' }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked ? arr.filter((id) => id !== opt.id) : [...arr, opt.id];
                    onAnswer(q.id, next);
                  }}
                  style={{ marginTop: '.15rem' }}
                />
                <span>{opt.i18n[locale].label}</span>
              </label>
            );
          })}
        </div>
      )}

      {q.type === 'textarea' && (
        <textarea
          value={typeof current === 'string' ? current : ''}
          onChange={(e) => onAnswer(q.id, e.target.value)}
          rows={5}
          placeholder={q.i18n[locale].placeholder ?? ''}
          style={{
            width: '100%',
            maxWidth: '46rem',
            padding: '.75rem 1rem',
            border: '1px solid rgba(162,167,176,.35)',
            borderRadius: '2px',
            background: 'var(--n-10)',
            fontFamily: 'var(--sans)',
            fontSize: '1rem',
            color: 'var(--n-100)',
            outline: 'none',
            resize: 'vertical',
          }}
        />
      )}

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Btn type="button" onClick={onBack}>
          {t('back')}
        </Btn>
        <Btn type="button" dark onClick={onNext} disabled={nextDisabled}>
          {t('next')} <Icon name="arrow" size={12} />
        </Btn>
      </div>
    </div>
  );
}
