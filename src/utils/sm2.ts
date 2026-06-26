import type { Phrase } from '../types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export interface SM2Result {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewDate: number;
  lastReviewDate: number;
}

export function sm2Review(phrase: Phrase, quality: number): SM2Result {
  const now = Date.now();
  let { easeFactor, intervalDays, repetitions } = phrase;

  if (quality >= 3) {
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    repetitions += 1;
  } else {
    repetitions = 0;
    intervalDays = 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const nextReviewDate = now + intervalDays * MS_PER_DAY;

  return {
    easeFactor,
    intervalDays,
    repetitions,
    nextReviewDate,
    lastReviewDate: now,
  };
}

export function isDue(phrase: Phrase): boolean {
  return phrase.nextReviewDate <= Date.now();
}

export function daysOverdue(phrase: Phrase): number {
  const overdue = Date.now() - phrase.nextReviewDate;
  return overdue > 0 ? overdue / MS_PER_DAY : 0;
}

export function defaultSM2Fields(dateAdded?: number): Pick<Phrase, 'easeFactor' | 'intervalDays' | 'repetitions' | 'nextReviewDate' | 'lastReviewDate'> {
  const ts = dateAdded || Date.now();
  return {
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    nextReviewDate: ts,
    lastReviewDate: 0,
  };
}
