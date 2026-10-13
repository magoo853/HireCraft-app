/**
 * RIASEC career-quiz data and scoring (Discover tab). Split out of
 * ./careers so only the Discover tab pays for it in First Load JS.
 */
import type { RiasecLetter } from "./careers-core";
export const RIASEC_NAMES: Record<RiasecLetter, string> = {
  R: "Realistic",
  I: "Investigative",
  A: "Artistic",
  S: "Social",
  E: "Enterprising",
  C: "Conventional",
};
export const RIASEC_BLURBS: Record<RiasecLetter, string> = {
  R: "hands-on builder — you like practical work with tools, machines, and tangible results",
  I: "analytical thinker — you like digging into data and solving complex problems",
  A: "creative original — you like designing, expressing, and unconventional approaches",
  S: "people helper — you energize from teaching, coaching, and supporting others",
  E: "driven leader — you like persuading, deciding, and chasing ambitious goals",
  C: "organized operator — you like structure, accuracy, and well-run processes",
};
export interface QuizQuestion {
  text: string;
  dimension: RiasecLetter;
}
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  { text: "I enjoy working with my hands to build or fix things.", dimension: "R" },
  { text: "I like operating tools, machines, or vehicles.", dimension: "R" },
  { text: "I prefer practical, hands-on problems over abstract ones.", dimension: "R" },
  { text: "I enjoy analyzing data to find patterns.", dimension: "I" },
  { text: "I like solving complex, abstract problems.", dimension: "I" },
  { text: "I'm curious about how things work and why.", dimension: "I" },
  { text: "I enjoy expressing myself creatively.", dimension: "A" },
  { text: "I like designing how things look or feel.", dimension: "A" },
  { text: "I prefer original, unconventional approaches.", dimension: "A" },
  { text: "I enjoy helping people work through personal problems.", dimension: "S" },
  { text: "I like teaching, coaching, or mentoring others.", dimension: "S" },
  { text: "I get energy from working closely with people.", dimension: "S" },
  { text: "I enjoy persuading people and leading projects.", dimension: "E" },
  { text: "I like taking charge and making decisions.", dimension: "E" },
  { text: "I'm motivated by competition and ambitious goals.", dimension: "E" },
  { text: "I enjoy organizing information and keeping detailed records.", dimension: "C" },
  { text: "I like clear rules and structured processes.", dimension: "C" },
  { text: "I take pride in accuracy and thoroughness.", dimension: "C" },
];
export const LIKERT_LABELS = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"];
/* ------------------------------------------------------------------ */
/* Quiz scoring                                                        */
/* ------------------------------------------------------------------ */
export type RiasecScores = Record<RiasecLetter, number>; // 0..100 normalized
export function scoreQuiz(answers: number[]): { scores: RiasecScores; code: string; top: RiasecLetter[] } {
  const sums: Record<RiasecLetter, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  const counts: Record<RiasecLetter, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  QUIZ_QUESTIONS.forEach((q, i) => {
    sums[q.dimension] += answers[i] ?? 3;
    counts[q.dimension] += 1;
  });
  const scores = {} as RiasecScores;
  (Object.keys(sums) as RiasecLetter[]).forEach((k) => {
    const avg = sums[k] / Math.max(1, counts[k]); // 1..5
    scores[k] = Math.round(((avg - 1) / 4) * 100);
  });
  const top = (Object.keys(scores) as RiasecLetter[]).sort((a, b) => scores[b] - scores[a]);
  return { scores, code: top.slice(0, 3).join(""), top };
}
