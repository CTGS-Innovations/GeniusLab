import type { Lab, LabId, Question, Skill } from '../types';
import { englishQuestions, englishSkills } from './english';
import { mathQuestions, mathSkills } from './math';
import { scienceQuestions, scienceSkills } from './science';

export const LABS: Lab[] = [
  { id: 'math', name: 'Math Lab', tagline: 'What comes next?', icon: '➗', color: '#4f8cff' },
  { id: 'english', name: 'English Lab', tagline: 'Spot the structure', icon: '✍️', color: '#ff7a59' },
  { id: 'science', name: 'Science Lab', tagline: 'Think like a scientist', icon: '🔬', color: '#2bc48a' },
];

export const SKILLS: Skill[] = [...mathSkills, ...englishSkills, ...scienceSkills];
export const QUESTIONS: Question[] = [...mathQuestions, ...englishQuestions, ...scienceQuestions];

export const labById = (id: LabId) => LABS.find((l) => l.id === id)!;
export const skillById = (id: string) => SKILLS.find((s) => s.id === id)!;
export const skillsForLab = (lab: LabId) => SKILLS.filter((s) => s.lab === lab);
export const questionsForSkill = (skill: string) => QUESTIONS.filter((q) => q.skill === skill);

export const MODE_INFO = {
  spot: { name: 'Spot It', icon: '👀', blurb: 'Recognize patterns, mistakes, and key details.' },
  breakdown: { name: 'Break It Down', icon: '🧩', blurb: 'Identify the building blocks and why they matter.' },
  next: { name: "What's Next?", icon: '➡️', blurb: 'Choose the next logical move.' },
} as const;

export const KIND_INFO = {
  mc: { name: 'Quick Pick', icon: '🔘' },
  spot: { name: 'Tap It', icon: '👆' },
  match: { name: 'Mapping', icon: '🔗' },
  order: { name: 'Sequence', icon: '🔢' },
  chain: { name: 'Multi-Step', icon: '🪜' },
} as const;
