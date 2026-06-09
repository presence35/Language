import type { Phrase } from '../types';

export function generateSession(
  allPhrases: Phrase[],
  count: number = 10,
  includeMastered: boolean = false
): Phrase[] {
  if (allPhrases.length === 0) return [];
  const now = Date.now();
  const sorted = [...allPhrases].sort((a, b) => {
    const daysSinceA = Math.max(0.1, (now - a.dateAdded) / (1000 * 60 * 60 * 24));
    const daysSinceB = Math.max(0.1, (now - b.dateAdded) / (1000 * 60 * 60 * 24));

    const recentBoostA = (a.difficultyScore > 20 && daysSinceA <= 3) ? 60 : 0;
    const recentBoostB = (b.difficultyScore > 20 && daysSinceB <= 3) ? 60 : 0;

    const randomA = Math.random() * 30;
    const randomB = Math.random() * 30;

    const isMasteredA = (!includeMastered && a.difficultyScore <= 20) ? -150 : 0;
    const isMasteredB = (!includeMastered && b.difficultyScore <= 20) ? -150 : 0;

    const scoreA = a.difficultyScore + recentBoostA + randomA + isMasteredA;
    const scoreB = b.difficultyScore + recentBoostB + randomB + isMasteredB;

    return scoreB - scoreA;
  });
  return sorted.slice(0, Math.min(count, sorted.length));
}
