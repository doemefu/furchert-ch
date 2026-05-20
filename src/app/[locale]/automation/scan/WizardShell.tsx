'use client';

// MOCKUP ONLY. No API, no persistence, no outbound fetch. The page
// banner (set in `page.tsx`) and the Step-4 "Beispiel-Report" badge
// make this unmistakable to the user. CLAUDE.md "Automation = mockup".
//
// State machine for the 4-step scan flow (worklog F-Q2 split — this
// shell owns state; the 4 step files are presentational). Single
// source of truth: `step` ∈ {1,2,3,4}; no redundant `submitted` flag
// (F10). Answers are keyed by question `id`, and option answers are
// stored by their stable option `id` so a mid-flow locale switch does
// not corrupt the selection (F-Q3).
import { useState } from 'react';
import type { Locale } from '@/i18n/routing';
import { SCAN_QUESTIONS } from '@/data/scan';
import { Step1Website } from './Step1Website';
import { Step2Questions } from './Step2Questions';
import { Step3Contact } from './Step3Contact';
import { Step4Report } from './Step4Report';

export type StepIndex = 1 | 2 | 3 | 4;

export interface ContactDraft {
  name: string;
  email: string;
  phone: string;
  role: string;
  consent: boolean;
}

// Each entry is either a single option `id` or an array of option `id`s
// for multi-choice questions / free text for the textarea question.
export type Answer = string | string[];

export function WizardShell({ locale }: { locale: Locale }) {
  const [step, setStep] = useState<StepIndex>(1);
  const [website, setWebsite] = useState('');
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [contact, setContact] = useState<ContactDraft>({
    name: '',
    email: '',
    phone: '',
    role: '',
    consent: false,
  });

  return (
    <div className="container border-x" style={{ padding: '3rem 1.5rem' }}>
      {step === 1 && (
        <Step1Website
          website={website}
          onChange={setWebsite}
          onNext={() => setStep(2)}
          onSkip={() => {
            setWebsite('');
            setStep(2);
          }}
        />
      )}
      {step === 2 && (
        <Step2Questions
          locale={locale}
          questions={SCAN_QUESTIONS}
          qIndex={qIndex}
          answers={answers}
          onAnswer={(id, value) => setAnswers((prev) => ({ ...prev, [id]: value }))}
          onBack={() => {
            if (qIndex === 0) setStep(1);
            else setQIndex(qIndex - 1);
          }}
          onNext={() => {
            if (qIndex === SCAN_QUESTIONS.length - 1) setStep(3);
            else setQIndex(qIndex + 1);
          }}
        />
      )}
      {step === 3 && (
        <Step3Contact
          locale={locale}
          contact={contact}
          onChange={setContact}
          onBack={() => setStep(2)}
          onSubmit={() => setStep(4)}
        />
      )}
      {step === 4 && <Step4Report locale={locale} />}
    </div>
  );
}
