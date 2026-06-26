import type { Phrase, PracticeMode, ClozeData } from '../types';
import { isDue, daysOverdue } from './sm2';

const ALL_MODES: PracticeMode[] = ['listenChoose', 'listenRepeat', 'listenTranslate', 'audioCloze'];
const NO_TYPING_MODES: PracticeMode[] = ['listenChoose', 'listenRepeat', 'audioCloze'];

export interface SessionCard {
  phrase: Phrase;
  mode: PracticeMode;
  clozeData?: ClozeData;
  distractors?: Phrase[];
}

export function generateSession(
  allPhrases: Phrase[],
  count: number = 10,
  noTyping: boolean = false,
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

  const availableModes = noTyping ? NO_TYPING_MODES : ALL_MODES;

  return selected.map(phrase => {
    const mode = availableModes[Math.floor(Math.random() * availableModes.length)];
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

function generateCloze(phrase: Phrase, distractors: Phrase[]): ClozeData {
  const words = phrase.russianPhrase.split(/\s+/).filter(w => w.length > 1);

  if (words.length <= 1) {
    return {
      fullPhrase: phrase.russianPhrase,
      blankedPhrase: '___',
      correctWord: phrase.russianPhrase,
      options: shuffle([phrase.russianPhrase, ...distractors.slice(0, 3).map(d => d.russianPhrase)]),
    };
  }

  const blankIdx = Math.floor(Math.random() * words.length);
  const correctWord = words[blankIdx];
  const blankedWords = [...words];
  blankedWords[blankIdx] = '___';

  const wrongWords = distractors
    .map(d => {
      const dWords = d.russianPhrase.split(/\s+/).filter(w => w.length > 1);
      return dWords[Math.floor(Math.random() * dWords.length)];
    })
    .filter(w => w !== correctWord && w.length > 0);

  const uniqueWrong = [...new Set(wrongWords)].slice(0, 3);
  while (uniqueWrong.length < 3) {
    const filler = `вариант${uniqueWrong.length}`;
    uniqueWrong.push(filler);
  }

  return {
    fullPhrase: phrase.russianPhrase,
    blankedPhrase: blankedWords.join(' '),
    correctWord,
    options: shuffle([correctWord, ...uniqueWrong]).slice(0, 4),
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
