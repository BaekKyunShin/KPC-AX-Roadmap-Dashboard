import type { PBLOutcomeAnalysis } from '../pbl-types';

export function createEmptyOutcomeAnalysis(): PBLOutcomeAnalysis {
  return {
    outcome_metrics: {
      selected_goals: [],
      quantitative: '',
      qualitative: '',
    },
    diffusion_strategy: {
      internalization: '',
      company_wide_diffusion: '',
    },
  };
}
