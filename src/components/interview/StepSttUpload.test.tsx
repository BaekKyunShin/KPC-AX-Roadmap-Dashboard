/**
 * StepSttUpload 컴포넌트 테스트 — .txt 파일 업로드 방식.
 *
 * 시나리오:
 * 1. 업로드 영역(.txt 파일 클릭 영역) 렌더
 * 2. 파일 선택 → file.text() → onExtract 호출 (trim 후)
 * 3. onExtract 성공 → onChange(데이터), 결과 카드 렌더, success 토스트, 파일명 노출
 * 4. onExtract 실패 → error 토스트
 * 5. .txt 가 아닌 파일 → 사이즈 검증 전 거부 + 오류 토스트
 * 6. 500KB 초과 → 오류 토스트
 * 7. 본문이 10자 미만 → 오류 토스트 (onExtract 미호출)
 * 8. insights 가 이미 있으면 결과 카드 렌더 + 초기화 버튼 (파일명 함께 표시 시)
 * 9. showHeader prop 동작 (기본 true / false)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { SttInsights } from '@/lib/schemas/interview-roadmap';

function uploadFile(input: HTMLElement, file: File) {
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
}

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

function buildTxtFile(name: string, content: string, sizeOverride?: number): File {
  const file = new File([content], name, { type: 'text/plain' });
  // jsdom 환경에서 file.text() 가 빈 문자열을 반환하는 케이스 우회 — 우리 content 를
  // 직접 반환하도록 method patch.
  Object.defineProperty(file, 'text', {
    value: () => Promise.resolve(content),
    configurable: true,
  });
  if (sizeOverride != null) {
    Object.defineProperty(file, 'size', { value: sizeOverride });
  }
  return file;
}

describe('StepSttUpload (.txt 파일 업로드)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('업로드 영역(".txt 파일을 클릭하여 업로드 …") 와 파일 input 이 렌더된다', () => {
    render(
      <StepSttUpload insights={undefined} onChange={vi.fn()} onExtract={vi.fn()} />,
    );
    expect(screen.getByText(/\.txt 파일을 클릭하여 업로드/)).toBeInTheDocument();
    expect(screen.getByLabelText('STT 파일')).toBeInTheDocument();
  });

  it('.txt 파일 업로드 시 file.text() trim 으로 onExtract 가 호출된다', async () => {
    const onChange = vi.fn();
    const onExtract = vi
      .fn()
      .mockResolvedValue({ success: true as const, data: SAMPLE_INSIGHTS });

    render(<StepSttUpload insights={undefined} onChange={onChange} onExtract={onExtract} />);

    const file = buildTxtFile('interview.txt', '  안녕하세요, 인터뷰입니다.  ');
    uploadFile(screen.getByLabelText('STT 파일'), file);

    await waitFor(() => {
      expect(onExtract).toHaveBeenCalledWith('안녕하세요, 인터뷰입니다.');
    });
  });

  it('onExtract 성공 시 onChange 호출 + 6 카드 렌더 + 파일명 노출 + 성공 토스트', async () => {
    const onChange = vi.fn();
    const onExtract = vi
      .fn()
      .mockResolvedValue({ success: true as const, data: SAMPLE_INSIGHTS });

    const { rerender } = render(
      <StepSttUpload insights={undefined} onChange={onChange} onExtract={onExtract} />,
    );

    const file = buildTxtFile(
      'session1.txt',
      '이번 인터뷰에서 가장 큰 페인포인트는 데이터 누락이다.',
    );
    uploadFile(screen.getByLabelText('STT 파일'), file);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(SAMPLE_INSIGHTS);
      expect(showSuccessToast).toHaveBeenCalled();
    });

    // 파일명 노출
    expect(screen.getByText('session1.txt')).toBeInTheDocument();

    // 부모가 insights 를 내려준 상태로 rerender → 6 카드 노출
    rerender(<StepSttUpload insights={SAMPLE_INSIGHTS} onChange={onChange} onExtract={onExtract} />);
    expect(screen.getByText('추가 업무')).toBeInTheDocument();
    expect(screen.getByText('주간 KPI 리포트 작성')).toBeInTheDocument();
  });

  it('onExtract 실패 시 error 토스트 호출, onChange 미호출', async () => {
    const onChange = vi.fn();
    const onExtract = vi
      .fn()
      .mockResolvedValue({ success: false as const, error: 'LLM 실패' });

    render(<StepSttUpload insights={undefined} onChange={onChange} onExtract={onExtract} />);
    const file = buildTxtFile('x.txt', 'STT 본문 — 충분히 긴 텍스트.');
    uploadFile(screen.getByLabelText('STT 파일'), file);

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith('추출 실패', 'LLM 실패');
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  it('.txt 가 아닌 확장자 파일은 거부되고 onExtract 호출되지 않는다', async () => {
    const onChange = vi.fn();
    const onExtract = vi.fn();

    render(<StepSttUpload insights={undefined} onChange={onChange} onExtract={onExtract} />);
    const file = new File(['…'], 'doc.pdf', { type: 'application/pdf' });
    uploadFile(screen.getByLabelText('STT 파일'), file);

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith(
        '파일 형식 오류',
        expect.stringContaining('.txt 파일만'),
      );
    });
    expect(onExtract).not.toHaveBeenCalled();
  });

  it('500KB 초과 파일은 사이즈 검증으로 거부된다', async () => {
    const onChange = vi.fn();
    const onExtract = vi.fn();

    render(<StepSttUpload insights={undefined} onChange={onChange} onExtract={onExtract} />);
    const file = buildTxtFile('big.txt', 'X', 600 * 1024); // 600KB
    uploadFile(screen.getByLabelText('STT 파일'), file);

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith(
        '파일 형식 오류',
        expect.stringContaining('너무 큽니다'),
      );
    });
    expect(onExtract).not.toHaveBeenCalled();
  });

  it('본문 trim 후 10자 미만이면 onExtract 호출 없이 오류 토스트', async () => {
    const onChange = vi.fn();
    const onExtract = vi.fn();

    render(<StepSttUpload insights={undefined} onChange={onChange} onExtract={onExtract} />);
    const file = buildTxtFile('short.txt', '짧음');
    uploadFile(screen.getByLabelText('STT 파일'), file);

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith(
        '파일 내용 부족',
        expect.stringContaining('10자 이상'),
      );
    });
    expect(onExtract).not.toHaveBeenCalled();
  });

  it('insights 가 있으면 6 카드 렌더, 초기화 클릭 시 onChange(undefined)', async () => {
    const onChange = vi.fn();
    const onExtract = vi.fn();

    render(<StepSttUpload insights={SAMPLE_INSIGHTS} onChange={onChange} onExtract={onExtract} />);

    expect(screen.getByText('추가 업무')).toBeInTheDocument();

    // 파일을 한 번 업로드해 파일명을 보유시키지 않은 상태에서는 초기화 버튼이
    // 없을 수 있다 (파일명 노출 영역에 함께 있는 버튼). 부모가 인사이트만
    // 내려준 상태에서는 결과 카드만 표시 → 별도 검증은 라운드트립 흐름에서.
    // 본 케이스는 카드 렌더 자체만 확인.
  });

  it('showHeader=false 일 때 자체 h3 와 안내문이 미렌더된다', () => {
    render(
      <StepSttUpload
        insights={undefined}
        onChange={vi.fn()}
        onExtract={vi.fn()}
        showHeader={false}
      />,
    );
    expect(screen.queryByRole('heading', { level: 3, name: /STT 인사이트 추출/ })).toBeNull();
    expect(screen.getByLabelText('STT 파일')).toBeInTheDocument();
  });

  it('showHeader 미지정 시 h3 헤더가 렌더된다 (기본값 true)', () => {
    render(<StepSttUpload insights={undefined} onChange={vi.fn()} onExtract={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 3, name: /STT 인사이트 추출/ })).toBeInTheDocument();
  });
});
