/**
 * StepSttAttach 어댑터 컴포넌트 테스트
 *
 * 본 어댑터는 `StepSttUpload` 를 `FormSection` 으로 감싸 다른 Step 컴포넌트
 * (StepNecessity, StepHrdReportPdf 등)와 시각 일관성을 확보한다.
 * - FormSection 헤더(번호·제목·라벨·설명) 노출
 * - StepSttUpload 에는 showHeader={false} 를 전달해 내부 h3 중복 방지
 * - onChange / onExtract / value 는 그대로 끌어올림 (passthrough)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { SttInsights } from '@/lib/schemas/interview-roadmap';

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
  };
});

import { StepSttAttach } from './StepSttAttach';

const SAMPLE_INSIGHTS: SttInsights = {
  추가_업무: ['주간 KPI 리포트 작성'],
  추가_페인포인트: ['수작업 시간이 너무 많음'],
  숨은_니즈: ['자동화 기대'],
  조직_맥락: '부서 간 협업 부족',
  AI_태도: '관심은 있으나 사용 경험 적음',
  주요_인용: ['"사람이 너무 많은 시간을 쓴다"'],
};

describe('StepSttAttach', () => {
  it('FormSection 헤더로 양식 번호 "선택" 과 제목 "인터뷰 녹취 STT 첨부" 를 노출한다', () => {
    render(
      <StepSttAttach value={undefined} onChange={vi.fn()} onExtract={vi.fn()} />,
    );

    // FormSection 의 양식 번호 (예: "선택")
    expect(screen.getByText('선택')).toBeInTheDocument();
    // 절 제목
    expect(screen.getByText('인터뷰 녹취 STT 첨부')).toBeInTheDocument();
    // 라벨 배지
    expect(screen.getByText('[인터뷰 입력]')).toBeInTheDocument();
  });

  it('StepSttUpload 자체 h3 헤더는 렌더되지 않는다 (showHeader=false 전달)', () => {
    render(
      <StepSttAttach value={undefined} onChange={vi.fn()} onExtract={vi.fn()} />,
    );

    // StepSttUpload 내부의 h3 "STT 인사이트 추출 (선택)" 가 미렌더되어야 함
    expect(screen.queryByRole('heading', { level: 3, name: /STT 인사이트 추출/ })).toBeNull();
  });

  it('STT 파일 input 과 업로드 영역이 그대로 렌더된다 (본문 위임)', () => {
    render(
      <StepSttAttach value={undefined} onChange={vi.fn()} onExtract={vi.fn()} />,
    );
    expect(screen.getByLabelText('STT 파일')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /STT 파일 업로드/ })).toBeInTheDocument();
  });

  it('value(insights) 가 있으면 6 카테고리 카드가 표시된다', () => {
    render(
      <StepSttAttach value={SAMPLE_INSIGHTS} onChange={vi.fn()} onExtract={vi.fn()} />,
    );
    expect(screen.getByText('추가 업무')).toBeInTheDocument();
    expect(screen.getByText('주간 KPI 리포트 작성')).toBeInTheDocument();
  });

  it('.txt 파일 업로드 시 부모가 넘긴 onExtract 콜백을 trim 된 텍스트로 호출한다', async () => {
    const onExtract = vi
      .fn()
      .mockResolvedValue({ success: true as const, data: SAMPLE_INSIGHTS });
    const onChange = vi.fn();
    render(
      <StepSttAttach value={undefined} onChange={onChange} onExtract={onExtract} />,
    );

    const content = '  STT 본문 — 충분히 긴 텍스트.  ';
    const file = new File([content], 'interview.txt', { type: 'text/plain' });
    Object.defineProperty(file, 'text', {
      value: () => Promise.resolve(content),
      configurable: true,
    });
    const input = screen.getByLabelText('STT 파일');
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    (await import('@testing-library/react')).fireEvent.change(input);

    const { waitFor } = await import('@testing-library/react');
    await waitFor(() =>
      expect(onExtract).toHaveBeenCalledWith('STT 본문 — 충분히 긴 텍스트.'),
    );
  });
});
