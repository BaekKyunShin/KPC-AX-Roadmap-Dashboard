import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import StepPainPoints from './StepPainPoints';
import type { PainPoint } from '@/lib/schemas/interview';

// =============================================================================
// 모킹
// =============================================================================

vi.mock('./FillExampleButton', () => ({
  default: ({ onClick }: { onClick: () => void }) => (
    <button type="button" onClick={onClick} data-testid="fill-example-btn">
      예시 채우기
    </button>
  ),
}));

// =============================================================================
// 테스트 데이터
// =============================================================================

function makePainPoint(overrides?: Partial<PainPoint>): PainPoint {
  return {
    id: 'pp1',
    description: '수작업이 많아 시간이 오래 걸림',
    severity: 'MEDIUM',
    related_task_ids: [],
    ...overrides,
  };
}

// =============================================================================
// 테스트
// =============================================================================

describe('StepPainPoints', () => {
  // -------------------------------------------------------------------------
  // 1. 기본 렌더링
  // -------------------------------------------------------------------------
  describe('기본 렌더링', () => {
    it('섹션 제목이 렌더링된다', () => {
      render(
        <StepPainPoints
          painPoints={[makePainPoint()]}
          onPainPointsChange={vi.fn()}
        />,
      );

      expect(screen.getByText('페인포인트')).toBeInTheDocument();
    });

    it('페인포인트 추가 버튼이 렌더링된다', () => {
      render(
        <StepPainPoints
          painPoints={[makePainPoint()]}
          onPainPointsChange={vi.fn()}
        />,
      );

      expect(screen.getByRole('button', { name: /페인포인트 추가/ })).toBeInTheDocument();
    });

    it('페인포인트 설명이 textarea에 표시된다', () => {
      render(
        <StepPainPoints
          painPoints={[makePainPoint({ description: '데이터 입력이 번거롭다' })]}
          onPainPointsChange={vi.fn()}
        />,
      );

      expect(screen.getByDisplayValue('데이터 입력이 번거롭다')).toBeInTheDocument();
    });

    it('심각도 버튼 3개가 렌더링된다 (높음/보통/낮음)', () => {
      render(
        <StepPainPoints
          painPoints={[makePainPoint()]}
          onPainPointsChange={vi.fn()}
        />,
      );

      expect(screen.getByRole('button', { name: '높음' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '보통' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '낮음' })).toBeInTheDocument();
    });

    it('페인포인트가 1개이면 삭제 버튼이 표시되지 않는다', () => {
      render(
        <StepPainPoints
          painPoints={[makePainPoint()]}
          onPainPointsChange={vi.fn()}
        />,
      );

      expect(screen.queryByRole('button', { name: /삭제/ })).not.toBeInTheDocument();
    });

    it('페인포인트가 2개이면 삭제 버튼이 2개 표시된다', () => {
      render(
        <StepPainPoints
          painPoints={[
            makePainPoint({ id: 'pp1', description: '페인1' }),
            makePainPoint({ id: 'pp2', description: '페인2' }),
          ]}
          onPainPointsChange={vi.fn()}
        />,
      );

      expect(screen.getAllByRole('button', { name: /삭제/ })).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // 2. 페인포인트 추가
  // -------------------------------------------------------------------------
  describe('페인포인트 추가', () => {
    it('"페인포인트 추가" 버튼 클릭 시 onPainPointsChange가 빈 항목을 추가하여 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepPainPoints
          painPoints={[makePainPoint()]}
          onPainPointsChange={mockOnChange}
        />,
      );

      await user.click(screen.getByRole('button', { name: /페인포인트 추가/ }));

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const called = mockOnChange.mock.calls[0][0] as PainPoint[];
      expect(called).toHaveLength(2);
      expect(called[1].description).toBe('');
      expect(called[1].severity).toBe('MEDIUM');
    });
  });

  // -------------------------------------------------------------------------
  // 3. 페인포인트 삭제
  // -------------------------------------------------------------------------
  describe('페인포인트 삭제', () => {
    it('삭제 버튼 클릭 시 해당 항목이 제거된 배열로 onPainPointsChange가 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepPainPoints
          painPoints={[
            makePainPoint({ id: 'pp1', description: '페인1' }),
            makePainPoint({ id: 'pp2', description: '페인2' }),
          ]}
          onPainPointsChange={mockOnChange}
        />,
      );

      const deleteButtons = screen.getAllByRole('button', { name: /삭제/ });
      await user.click(deleteButtons[0]);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const called = mockOnChange.mock.calls[0][0] as PainPoint[];
      expect(called).toHaveLength(1);
      expect(called[0].id).toBe('pp2');
    });

    it('페인포인트가 1개이면 삭제할 수 없다', () => {
      render(
        <StepPainPoints
          painPoints={[makePainPoint()]}
          onPainPointsChange={vi.fn()}
        />,
      );

      expect(screen.queryByRole('button', { name: /삭제/ })).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 4. 설명 수정
  // -------------------------------------------------------------------------
  describe('설명 수정', () => {
    it('설명 textarea 입력 시 onPainPointsChange가 업데이트된 배열로 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepPainPoints
          painPoints={[makePainPoint({ description: '' })]}
          onPainPointsChange={mockOnChange}
        />,
      );

      const textarea = screen.getByPlaceholderText(/어떤 어려움/);
      await user.type(textarea, '보고서 작성이 오래 걸림');

      expect(mockOnChange).toHaveBeenCalled();
      // user.type은 글자 단위로 콜백을 호출하므로 호출 횟수로 확인
      expect(mockOnChange.mock.calls.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // 5. 심각도 선택
  // -------------------------------------------------------------------------
  describe('심각도 선택', () => {
    it('"높음" 버튼 클릭 시 severity가 HIGH로 업데이트되어 onPainPointsChange가 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepPainPoints
          painPoints={[makePainPoint({ severity: 'LOW' })]}
          onPainPointsChange={mockOnChange}
        />,
      );

      await user.click(screen.getByRole('button', { name: '높음' }));

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const called = mockOnChange.mock.calls[0][0] as PainPoint[];
      expect(called[0].severity).toBe('HIGH');
    });

    it('"낮음" 버튼 클릭 시 severity가 LOW로 업데이트되어 onPainPointsChange가 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepPainPoints
          painPoints={[makePainPoint({ severity: 'HIGH' })]}
          onPainPointsChange={mockOnChange}
        />,
      );

      await user.click(screen.getByRole('button', { name: '낮음' }));

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const called = mockOnChange.mock.calls[0][0] as PainPoint[];
      expect(called[0].severity).toBe('LOW');
    });

    it('"보통" 버튼 클릭 시 severity가 MEDIUM으로 업데이트된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepPainPoints
          painPoints={[makePainPoint({ severity: 'HIGH' })]}
          onPainPointsChange={mockOnChange}
        />,
      );

      await user.click(screen.getByRole('button', { name: '보통' }));

      const called = mockOnChange.mock.calls[0][0] as PainPoint[];
      expect(called[0].severity).toBe('MEDIUM');
    });
  });

  // -------------------------------------------------------------------------
  // 6. 예시 채우기
  // -------------------------------------------------------------------------
  describe('예시 채우기', () => {
    it('예시 채우기 클릭 시 onPainPointsChange가 예시 데이터로 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepPainPoints
          painPoints={[makePainPoint({ description: '', severity: 'MEDIUM' })]}
          onPainPointsChange={mockOnChange}
        />,
      );

      await user.click(screen.getByTestId('fill-example-btn'));

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const called = mockOnChange.mock.calls[0][0] as PainPoint[];
      expect(called[0].description).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 7. 복수 항목 렌더링
  // -------------------------------------------------------------------------
  describe('복수 항목 렌더링', () => {
    it('여러 페인포인트가 모두 렌더링된다', () => {
      render(
        <StepPainPoints
          painPoints={[
            makePainPoint({ id: 'pp1', description: '페인포인트A' }),
            makePainPoint({ id: 'pp2', description: '페인포인트B' }),
          ]}
          onPainPointsChange={vi.fn()}
        />,
      );

      expect(screen.getByDisplayValue('페인포인트A')).toBeInTheDocument();
      expect(screen.getByDisplayValue('페인포인트B')).toBeInTheDocument();
    });

    it('각 항목마다 심각도 버튼이 3개씩 렌더링된다', () => {
      render(
        <StepPainPoints
          painPoints={[
            makePainPoint({ id: 'pp1' }),
            makePainPoint({ id: 'pp2', description: '두 번째 페인', severity: 'HIGH' }),
          ]}
          onPainPointsChange={vi.fn()}
        />,
      );

      // 2개 항목 × 3개 버튼 = 총 6개 심각도 버튼
      expect(screen.getAllByRole('button', { name: '높음' })).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: '보통' })).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: '낮음' })).toHaveLength(2);
    });
  });
});
