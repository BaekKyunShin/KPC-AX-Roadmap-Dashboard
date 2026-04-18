'use client';

import { useState, useTransition } from 'react';
import { generateTestPBL, cancelTestPBLGeneration, type TestPBLResult } from '../actions';
import type { PBLInterviewSample } from '../../../../../e2e/fixtures/pbl-interview-sample';

interface UseTestPBLActionsProps {
  sampleData: PBLInterviewSample;
}

export function useTestPBLActions({ sampleData }: UseTestPBLActionsProps) {
  const [isGenerating, startTransition] = useTransition();
  const [result, setResult] = useState<TestPBLResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await generateTestPBL(sampleData);
      if (res.success) {
        setResult(res.data);
      } else {
        setError(res.error);
      }
    });
  };

  const handleCancel = async () => {
    await cancelTestPBLGeneration();
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  return {
    isGenerating,
    result,
    error,
    handleGenerate,
    handleCancel,
    handleReset,
  };
}
