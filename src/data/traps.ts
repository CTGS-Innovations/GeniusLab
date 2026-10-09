import type { LabId } from '../types';

/**
 * Common traps: documented spots where grade 9–11 students flip-flop.
 * Each trap names the wrong belief, the rule, and a teacher's quick tell.
 */
export interface Trap {
  id: string;
  lab: LabId;
  name: string;
  /** Grade/course where it shows up. */
  grade: string;
  /** What students wrongly believe or flip between. */
  wrong: string;
  /** The rule, in one short line. */
  right: string;
  /** Quick check a teacher would use. */
  tell: string;
  source: { label: string; url: string };
}

export const TRAPS: Trap[] = [];

export const trapById = (id: string) => TRAPS.find((t) => t.id === id);
export const trapsForLab = (lab: LabId) => TRAPS.filter((t) => t.lab === lab);
