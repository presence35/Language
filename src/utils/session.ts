import type { Phrase, PracticeMode, ClozeData } from '../types';
import { isDue, daysOverdue } from './sm2';

const ALL_MODES: PracticeMode[] = ['listenChoose', 'listenRepeat', 'audioCloze'];

export interface SessionCard {
  phrase: Phrase;
  mode: PracticeMode;
  clozeData?: ClozeData;
  distractors?: Phrase[];
}

export function generateSession(
  allPhrases: Phrase[],
  count: number = 10,
): SessionCard[] {
  if (allPhrases.length === 0) return [];

  const due = allPhrases.filter(isDue);
  const notDue = allPhrases.filter(p => !isDue(p));

  due.sort((a, b) => daysOverdue(b) - daysOverdue(a));

  let selected: Phrase[];
  if (due.length >= count) {
    selected = due.slice(0, count);
  } else {
    notDue.sort((a, b) => a.nextReviewDate - b.nextReviewDate);
    selected = [...due, ...notDue.slice(0, count - due.length)];
  }

  return selected.map(phrase => {
    const mode = ALL_MODES[Math.floor(Math.random() * ALL_MODES.length)];
    const card: SessionCard = { phrase, mode };

    if (mode === 'listenChoose' || mode === 'audioCloze') {
      card.distractors = getDistractors(phrase, allPhrases, 3);
    }

    if (mode === 'audioCloze') {
      card.clozeData = generateCloze(phrase, card.distractors || []);
    }

    return card;
  });
}

function getDistractors(target: Phrase, allPhrases: Phrase[], count: number): Phrase[] {
  const candidates = allPhrases.filter(p => p.id !== target.id);
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function generateClozeData(phrase: Phrase, allPhrases: Phrase[]): ClozeData {
  const distractors = getDistractors(phrase, allPhrases, 3);
  return generateCloze(phrase, distractors);
}

function generateCloze(phrase: Phrase, distractors: Phrase[]): ClozeData {
  const words = phrase.nativePhrase.split(/\s+/).filter(w => w.length > 1);

  if (words.length <= 1) {
    const wrongOptions = distractors.slice(0, 3).map(d => d.nativePhrase);
    while (wrongOptions.length < 3) {
      wrongOptions.push(`вариант${wrongOptions.length + 1}`);
    }
    return {
      fullPhrase: phrase.nativePhrase,
      blankedPhrase: '___',
      correctWord: phrase.nativePhrase,
      options: shuffle([phrase.nativePhrase, ...wrongOptions]),
    };
  }

  const blankIdx = Math.floor(Math.random() * words.length);
  const correctWord = words[blankIdx];
  const blankedWords = [...words];
  blankedWords[blankIdx] = '___';

  const wrongWords = distractors
    .map(d => {
      const dWords = d.nativePhrase.split(/\s+/).filter(w => w.length > 1);
      return dWords[Math.floor(Math.random() * dWords.length)];
    })
    .filter(w => w !== correctWord && w.length > 0);

  const uniqueWrong = [...new Set(wrongWords)].slice(0, 3);
  while (uniqueWrong.length < 3) {
    uniqueWrong.push(`вариант${uniqueWrong.length + 1}`);
  }

  return {
    fullPhrase: phrase.nativePhrase,
    blankedPhrase: blankedWords.join(' '),
    correctWord,
    options: shuffle([correctWord, ...uniqueWrong]),
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
