// Trade stories for /automation (stub; content follows).
import type { Locale } from '@/i18n/routing';

export interface AutomationStoryCopy {
  tag: string;
  title: string;
  today: string;
  withAi: string;
  decide: string;
  dataPath: string[];
  dataNote?: string;
  fit: string;
}

export interface AutomationStory {
  id: string;
  hoursBefore: number;
  hoursAfter: number;
  i18n: Record<Locale, AutomationStoryCopy>;
}

export const STORIES: AutomationStory[] = [];
