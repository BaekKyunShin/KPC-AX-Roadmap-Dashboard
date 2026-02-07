export interface DimensionScore {
  dimension: string;
  score: number;
  max_score: number;
}

export interface SelfAssessmentScores {
  total_score?: number;
  max_possible_score?: number;
  dimension_scores?: DimensionScore[];
}

interface ScoreColor {
  /** Recharts 등 SVG fill에 사용하는 hex 값 */
  hex: string;
  bg: string;
  text: string;
  light: string;
}

export function getScoreColor(pct: number): ScoreColor {
  if (pct > 60) return { hex: '#22c55e', bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-50' };
  if (pct >= 30) return { hex: '#f59e0b', bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50' };
  return { hex: '#ef4444', bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-50' };
}
