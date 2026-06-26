import { Phrase } from '../types';
import { defaultSM2Fields } from '../utils/sm2';

const now = Date.now();

function seed(id: number, russianPhrase: string, englishPhrase: string, wordBreakdown: { word: string; translation: string }[], categories: string[]): Phrase {
  return {
    id: `seed_${id}`,
    russianPhrase,
    englishPhrase,
    wordBreakdown,
    dateAdded: now,
    difficultyScore: 50,
    masteryScore: 0,
    categories,
    ...defaultSM2Fields(now),
  };
}

export const SEED_WORDS: Phrase[] = [
  seed(1, "Шо?", "What? (Instead of Что)", [{ word: "Шо", translation: "What" }], ['Odesa Slang', 'Questions']),
  seed(2, "Таки да", "Yes, indeed / You bet", [{ word: "Таки", translation: "Indeed/Still" }, { word: "да", translation: "yes" }], ['Odesa Slang']),
  seed(3, "Тю!", "Expression of surprise or dismissal", [{ word: "Тю", translation: "Wow/Whatever" }], ['Odesa Slang']),
  seed(4, "Азохен вей!", "Oh my god! / What a nightmare!", [{ word: "Азохен", translation: "Oh" }, { word: "вей", translation: "woe/pain" }], ['Odesa Slang']),
  seed(5, "Ша!", "Quiet! / Stop it!", [{ word: "Ша", translation: "Quiet" }], ['Odesa Slang', 'Discipline']),
  seed(6, "Делать базар", "To go grocery shopping", [{ word: "Делать", translation: "To do/make" }, { word: "базар", translation: "market" }], ['Odesa Slang', 'Shopping']),
  seed(7, "Понты", "Showing off / Flexing", [{ word: "Понты", translation: "Showing off" }], ['Odesa Slang']),
  seed(8, "На шару", "For free", [{ word: "На", translation: "On" }, { word: "шару", translation: "freebie" }], ['Odesa Slang']),
  seed(9, "Гэвалт", "Noise, shouting, panic", [{ word: "Гэвалт", translation: "Noise/Commotion" }], ['Odesa Slang']),
  seed(10, "Семочки", "Sunflower seeds", [{ word: "Семочки", translation: "Sunflower seeds" }], ['Food & Drink']),
  seed(11, "Мансы", "Tricks / funny business / rumors", [{ word: "Мансы", translation: "Tricks/Rumors" }], ['Odesa Slang']),
  seed(12, "Кастрюля", "Gypsy cab / Hitchhiking", [{ word: "Кастрюля", translation: "Pot/Pan (Slang for cab)" }], ['Odesa Slang', 'Transport']),
  seed(13, "Привоз", "Privoz (Famous Odesa market)", [{ word: "Привоз", translation: "Privoz market" }], ['Places']),
  seed(14, "Бычки", "Gobies (small fish popular in Odesa)", [{ word: "Бычки", translation: "Goby fish" }], ['Food & Drink']),
  seed(15, "Иди гуляй", "Get lost / Take a walk", [{ word: "Иди", translation: "Go" }, { word: "гуляй", translation: "walk" }], ['Phrases']),
  seed(16, "Шикарно", "Gorgeous / Luxurious", [{ word: "Шикарно", translation: "Luxurious/Awesome" }], ['Adjectives']),
  seed(17, "Не фонтан", "Not great / subpar", [{ word: "Не", translation: "Not" }, { word: "фонтан", translation: "fountain (great)" }], ['Odesa Slang']),
  seed(18, "Шоб я так жил!", "I wish I lived like that! (expression of envy/admiration)", [{ word: "Шоб", translation: "So that (Slang)" }, { word: "я", translation: "I" }, { word: "так", translation: "so/like that" }, { word: "жил", translation: "lived" }], ['Odesa Slang']),
  seed(19, "Майсы", "Stories / excuses", [{ word: "Майсы", translation: "Stories" }], ['Odesa Slang']),
  seed(20, "Ляля", "A beauty / perfect thing", [{ word: "Ляля", translation: "Doll/Beauty" }], ['Odesa Slang']),
];
