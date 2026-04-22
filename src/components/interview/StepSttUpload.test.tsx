/**
 * StepSttUpload 컴포넌트 테스트 (ISSUE-16)
 *
 * 시나리오:
 * 1. 빈 textarea → 추출 버튼 disabled
 * 2. 텍스트 입력 → 추출 버튼 활성화 → 클릭 시 onExtract 호출
 * 3. onExtract 성공 → onChange(데이터), 결과 카드 렌더, success 토스트
 * 4. onExtract 실패 → error 토스트
 * 5. insights 가 이미 있으면 결과 카드 + "초기화" 버튼 노출, 클릭 시 onChange(undefined)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SttInsights } from '@/lib/schemas/interview-roadmap';

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
  };
});

import { StepSttUpload } from './StepSttUpload';
import { showSuccessToast, showErrorToast } from '@/lib/utils';

const SAMPLE_INSIGHTS: SttInsights = {
  추가_업무: ['주간 KPI 리포트 작성'],
  추가_페인포인트: ['수작업 시간이 너무 많음'],
  숨은_니즈: ['자동화 기대'],
  조직_맥락: '부서 간 협업 부족',
  AI_태도: '관심은 있으나 사용 경험 적음',
  주요_인용: ['"사람이 너무 많은 시간을 쓴다"'],
};

describe('StepSttUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('빈 textarea 에서 "인사이트 추출" 버튼이 비활성화된다', () => {
    const onChange = vi.fn();
    const onExtract = vi.fn();
    render(<StepSttUpload insights={undefined} onChange={onChange} onExtract={onExtract} />);
    const btn = screen.getByRole('button', { name: /인사이트 추출/ });
    expect(btn).toBeDisabled();
  });

  it('텍스트를 입력하면 추출 버튼이 활성화되고, 클릭 시 onExtract 가 trim 된 텍스트로 호출된다', async () => {
    const onChange = vi.fn();
    const onExtract = vi.fn().mockResolvedValue({ success: true, data: SAMPLE_INSIGHTS });
    render(<StepSttUpload insights={undefined} onChange={onChange} onExtract={onExtract} />);

    const textarea = screen.getByLabelText('STT 원문');
    await userEvent.type(textarea, '  안녕하세요, 인터뷰입니다.  ');

    const btn = screen.getByRole('button', { name: /인사이트 추출/ });
    expect(btn).not.toBeDisabled();
    await userEvent.click(btn);

    await waitFor(() => {
      expect(onExtract).toHaveBeenCalledWith('안녕하세요, 인터뷰입니다.');
    });
  });

  it('onExtract 성공 시 onChange 가 추출 결과로 호출되고 카드들이 렌더된다', async () => {
    const onChange = vi.fn();
    const onExtract = vi.fn().mockResolvedValue({ success: true, data: SAMPLE_INSIGHTS });

    const { rerender } = render(
      <StepSttUpload insights={undefined} onChange={onChange} onExtract={onExtract} />,
    );

    const textarea = screen.getByLabelText('STT 원문');
    await userEvent.type(textarea, 'STT 본문');
    await userEvent.click(screen.getByRole('button', { name: /인사이트 추출/ }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(SAMPLE_INSIGHTS);
      expect(showSuccessToast).toHaveBeenCalled();
    });

    // 부모가 insights 를 내려준 상태로 rerender → 카드가 렌더되는지 확인
    rerender(<StepSttUpload insights={SAMPLE_INSIGHTS} onChange={onChange} onExtract={onExtract} />);
    expect(screen.getByText('추가 업무')).toBeInTheDocument();
    expect(screen.getByText('주간 KPI 리포트 작성')).toBeInTheDocument();
    expect(screen.getByText('조직 맥락')).toBeInTheDocument();
    expect(screen.getByText('부서 간 협업 부족')).toBeInTheDocument();
  });

  it('onExtract 실패 시 error 토스트가 호출된다', async () => {
    const onChange = vi.fn();
    const onExtract = vi.fn().mockResolvedValue({ success: false, error: 'LLM 실패' });

    render(<StepSttUpload insights={undefined} onChange={onChange} onExtract={onExtract} />);
    await userEvent.type(screen.getByLabelText('STT 원문'), 'STT 본문');
    await userEvent.click(screen.getByRole('button', { name: /인사이트 추출/ }));

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith('추출 실패', 'LLM 실패');
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  it('insights 가 이미 있으면 카드 + "초기화" 버튼이 노출되고, 초기화 클릭 시 onChange(undefined) 가 호출된다', async () => {
    const onChange = vi.fn();
    const onExtract = vi.fn();

    render(<StepSttUpload insights={SAMPLE_INSIGHTS} onChange={onChange} onExtract={onExtract} />);

    expect(screen.getByText('추가 업무')).toBeInTheDocument();
    const clearBtn = screen.getByRole('button', { name: '초기화' });
    expect(clearBtn).toBeInTheDocument();

    await userEvent.click(clearBtn);
    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
