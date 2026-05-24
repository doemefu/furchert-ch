'use client';

// MOCKUP ONLY. No API, no persistence, no outbound fetch. The page
// banner (set in `page.tsx`) and the Step-4 "Beispiel-Report" badge
// make this unmistakable to the user. CLAUDE.md "Automation = mockup".
//
// State machine for the 4-step scan flow (worklog F-Q2 split — this
// shell owns state via a discriminated `WizardState` union + reducer;
// the 4 step files are presentational). Modelling state as a
// discriminated union makes structurally-invalid combinations
// unrepresentable: `step === 4` cannot coexist with empty answers,
// step 3 cannot exist without a `contact` draft, etc. Single source
// of truth: `state.step` (no redundant `submitted` flag — F10).
//
// Answers are keyed by question `id` (the literal `QuestionId` union
// derived from `SCAN_QUESTIONS`, so typos like `answers['compny_size']`
// are compile errors). Option answers are stored by their stable
// option `id` so a mid-flow locale switch preserves the selection
// (F-Q3).
import { useReducer } from 'react';
import type { Locale } from '@/i18n/routing';
import { SCAN_QUESTIONS, type QuestionId, type RoleId } from '@/data/scan';
import { Step1Website } from './Step1Website';
import { Step2Questions } from './Step2Questions';
import { Step3Contact } from './Step3Contact';
import { Step4Report } from './Step4Report';

export type Answers = Partial<Record<QuestionId, string | readonly string[]>>;
export type Answer = string | readonly string[];

export interface ContactDraft {
  name: string;
  email: string;
  phone: string;
  role: RoleId | '';
  consent: boolean;
}

const EMPTY_CONTACT: ContactDraft = {
  name: '',
  email: '',
  phone: '',
  role: '',
  consent: false,
};

export type WizardState =
  | { step: 1; website: string }
  | { step: 2; website: string; qIndex: number; answers: Answers }
  | { step: 3; website: string; answers: Answers; contact: ContactDraft }
  | { step: 4; website: string; answers: Answers; contact: ContactDraft };

export type WizardAction =
  | { type: 'setWebsite'; value: string }
  | { type: 'startQuestions'; skip?: boolean }
  | { type: 'setAnswer'; id: QuestionId; value: Answer }
  | { type: 'nextQuestion' }
  | { type: 'prevQuestion' }
  | { type: 'updateContact'; patch: Partial<ContactDraft> }
  | { type: 'submit' };

// Transitions enforce their preconditions structurally — any action
// dispatched in the wrong step is a no-op rather than a state
// corruption. UI buttons are also gated, so this is defence-in-depth
// (e.g. a stale dispatch from a closed component can't, say, push the
// flow into step 4 with no contact).
function reducer(s: WizardState, a: WizardAction): WizardState {
  switch (a.type) {
    case 'setWebsite':
      return s.step === 1 ? { ...s, website: a.value } : s;

    case 'startQuestions':
      if (s.step !== 1) return s;
      return {
        step: 2,
        website: a.skip ? '' : s.website,
        qIndex: 0,
        answers: {},
      };

    case 'setAnswer':
      if (s.step !== 2) return s;
      return { ...s, answers: { ...s.answers, [a.id]: a.value } };

    case 'nextQuestion':
      if (s.step !== 2) return s;
      if (s.qIndex < SCAN_QUESTIONS.length - 1) {
        return { ...s, qIndex: s.qIndex + 1 };
      }
      // Last question answered → transition to contact step.
      return {
        step: 3,
        website: s.website,
        answers: s.answers,
        contact: EMPTY_CONTACT,
      };

    case 'prevQuestion':
      if (s.step === 2 && s.qIndex > 0) {
        return { ...s, qIndex: s.qIndex - 1 };
      }
      if (s.step === 2 && s.qIndex === 0) {
        return { step: 1, website: s.website };
      }
      if (s.step === 3) {
        return {
          step: 2,
          website: s.website,
          qIndex: SCAN_QUESTIONS.length - 1,
          answers: s.answers,
        };
      }
      return s;

    case 'updateContact':
      if (s.step !== 3) return s;
      return { ...s, contact: { ...s.contact, ...a.patch } };

    case 'submit':
      if (s.step !== 3) return s;
      if (!s.contact.consent) return s;
      return {
        step: 4,
        website: s.website,
        answers: s.answers,
        contact: s.contact,
      };
  }
}

export function WizardShell({ locale }: { locale: Locale }) {
  const [state, dispatch] = useReducer(reducer, { step: 1, website: '' });

  return (
    <div className="container border-x" style={{ padding: '3rem 1.5rem' }}>
      {state.step === 1 && (
        <Step1Website
          website={state.website}
          onChange={(value) => dispatch({ type: 'setWebsite', value })}
          onNext={() => dispatch({ type: 'startQuestions' })}
          onSkip={() => dispatch({ type: 'startQuestions', skip: true })}
        />
      )}
      {state.step === 2 && (
        <Step2Questions
          locale={locale}
          questions={SCAN_QUESTIONS}
          qIndex={state.qIndex}
          answers={state.answers}
          onAnswer={(id, value) => dispatch({ type: 'setAnswer', id, value })}
          onBack={() => dispatch({ type: 'prevQuestion' })}
          onNext={() => dispatch({ type: 'nextQuestion' })}
        />
      )}
      {state.step === 3 && (
        <Step3Contact
          locale={locale}
          contact={state.contact}
          onChange={(patch) => dispatch({ type: 'updateContact', patch })}
          onBack={() => dispatch({ type: 'prevQuestion' })}
          onSubmit={() => dispatch({ type: 'submit' })}
        />
      )}
      {state.step === 4 && <Step4Report locale={locale} />}
    </div>
  );
}
