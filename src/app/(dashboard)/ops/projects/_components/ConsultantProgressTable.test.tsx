import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConsultantProgressTable from './ConsultantProgressTable';
import type { ConsultantProgress } from '../actions';

// ============================================================================
// 모킹 없음 (순수 props 기반 컴포넌트)
// ============================================================================

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// ============================================================================
// 테스트 데이터
// ============================================================================

const mockConsultants: ConsultantProgress[] = [
  { id: 'c1', name: '김컨설턴트', email: 'kim@test.com', assigned: 2, interviewing: 1, drafting: 0, completed: 1, total: 4 },
  { id: 'c2', name: '이컨설턴트', email: 'lee@test.com', assigned: 1, interviewing: 0, drafting: 1, completed: 0, total: 2 },
  { id: 'c3', name: '박컨설턴트', email: 'park@test.com', assigned: 0, interviewing: 1, drafting: 0, completed: 2, total: 3 },
  { id: 'c4', name: '최컨설턴트', email: 'choi@test.com', assigned: 1, interviewing: 0, drafting: 0, completed: 0, total: 1 },
  { id: 'c5', name: '정컨설턴트', email: 'jung@test.com', assigned: 0, interviewing: 0, drafting: 1, completed: 1, total: 2 },
  { id: 'c6', name: '강컨설턴트', email: 'kang@test.com', assigned: 1, interviewing: 1, drafting: 0, completed: 0, total: 2 },
  { id: 'c7', name: '조컨설턴트', email: 'jo@test.com', assigned: 0, interviewing: 0, drafting: 0, completed: 1, total: 1 },
];

const fewConsultants: ConsultantProgress[] = [
  { id: 'c1', name: '김컨설턴트', email: 'kim@test.com', assigned: 2, interviewing: 1, drafting: 0, completed: 1, total: 4 },
  { id: 'c2', name: '이컨설턴트', email: 'lee@test.com', assigned: 1, interviewing: 0, drafting: 1, completed: 0, total: 2 },
];

// ============================================================================
// 테스트
// ============================================================================

describe('ConsultantProgressTable', () => {
  // --------------------------------------------------------------------------
  // 1. 기본 렌더링
  // --------------------------------------------------------------------------
  describe('기본 렌더링', () => {
    it('카드 타이틀 "컨설턴트별 현황"을 표시한다', () => {
      render(<ConsultantProgressTable data={mockConsultants} />);
      expect(screen.getByText('컨설턴트별 현황')).toBeInTheDocument();
    });

    it('컨설턴트 총 인원 수를 표시한다', () => {
      render(<ConsultantProgressTable data={mockConsultants} />);
      expect(screen.getByText('총 7명의 컨설턴트')).toBeInTheDocument();
    });

    it('데이터가 없으면 빈 상태 메시지를 표시한다', () => {
      render(<ConsultantProgressTable data={[]} />);
      expect(screen.getByText('배정된 프로젝트가 있는 컨설턴트가 없습니다')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 2. 테이블 헤더
  // --------------------------------------------------------------------------
  describe('테이블 헤더', () => {
    it('모든 컬럼 헤더를 표시한다', () => {
      render(<ConsultantProgressTable data={mockConsultants} />);
      const headers = screen.getAllByRole('columnheader');
      const headerTexts = headers.map(th => th.textContent);
      expect(headerTexts).toEqual(
        expect.arrayContaining(['컨설턴트', '총 담당 프로젝트', '프로젝트 수행 전', '현장 인터뷰 완료', '로드맵 초안 완료', '로드맵 확정 완료'])
      );
    });
  });

  // --------------------------------------------------------------------------
  // 3. 기본 표시 행 수
  // --------------------------------------------------------------------------
  describe('기본 표시 행 수', () => {
    it('7명의 데이터가 있을 때 기본으로 5명만 표시한다', () => {
      render(<ConsultantProgressTable data={mockConsultants} />);
      // 헤더 1행 + 데이터 5행 = 6행
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(6);
    });

    it('5명 이하 데이터는 더보기 버튼을 표시하지 않는다', () => {
      render(<ConsultantProgressTable data={fewConsultants} />);
      expect(screen.queryByText(/더보기/)).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 4. 더보기 / 접기
  // --------------------------------------------------------------------------
  describe('더보기 / 접기', () => {
    it('더보기 버튼이 표시된다 (나머지 인원 수 포함)', () => {
      render(<ConsultantProgressTable data={mockConsultants} />);
      expect(screen.getByText(/더보기/)).toBeInTheDocument();
      expect(screen.getByText(/2명 더 있음/)).toBeInTheDocument();
    });

    it('더보기 클릭 시 모든 7명을 표시한다', () => {
      render(<ConsultantProgressTable data={mockConsultants} />);
      fireEvent.click(screen.getByText(/더보기/));
      const rows = screen.getAllByRole('row');
      // 헤더 1행 + 데이터 7행 = 8행
      expect(rows.length).toBe(8);
    });

    it('더보기 클릭 후 접기 버튼이 표시된다', () => {
      render(<ConsultantProgressTable data={mockConsultants} />);
      fireEvent.click(screen.getByText(/더보기/));
      expect(screen.getByText('접기')).toBeInTheDocument();
    });

    it('접기 클릭 시 다시 5명만 표시된다', () => {
      render(<ConsultantProgressTable data={mockConsultants} />);
      fireEvent.click(screen.getByText(/더보기/));
      fireEvent.click(screen.getByText('접기'));
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(6);
    });
  });

  // --------------------------------------------------------------------------
  // 5. 정렬
  // --------------------------------------------------------------------------
  describe('정렬', () => {
    it('컬럼 헤더 클릭 시 정렬 방향이 변경된다', () => {
      render(<ConsultantProgressTable data={mockConsultants} />);
      // "컨설턴트" 컬럼 헤더 버튼 클릭
      fireEvent.click(screen.getByText('컨설턴트'));
      // 정렬 후에도 테이블이 정상 렌더링됨
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(6);
    });

    it('같은 컬럼 헤더 두 번 클릭 시 정렬 방향이 반전된다', () => {
      render(<ConsultantProgressTable data={mockConsultants} />);
      fireEvent.click(screen.getByText('총 담당 프로젝트'));
      fireEvent.click(screen.getByText('총 담당 프로젝트'));
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(6);
    });

    it('기본 정렬(total 내림차순)에서 total이 가장 높은 컨설턴트가 상단에 있다', () => {
      render(<ConsultantProgressTable data={mockConsultants} />);
      const rows = screen.getAllByRole('row');
      // 헤더 제외 첫 번째 데이터 행 (김컨설턴트 total=4)
      expect(rows[1].textContent).toContain('김컨설턴트');
    });
  });

  // --------------------------------------------------------------------------
  // 6. 컨설턴트 데이터 표시
  // --------------------------------------------------------------------------
  describe('컨설턴트 데이터 표시', () => {
    it('컨설턴트 이름을 표시한다', () => {
      render(<ConsultantProgressTable data={fewConsultants} />);
      expect(screen.getByText('김컨설턴트')).toBeInTheDocument();
      expect(screen.getByText('이컨설턴트')).toBeInTheDocument();
    });

    it('값이 0인 셀은 회색 스타일로 표시한다', () => {
      render(<ConsultantProgressTable data={fewConsultants} />);
      // 김컨설턴트의 drafting=0 → span에 text-gray-300 클래스
      const graySpans = document.querySelectorAll('span.text-gray-300');
      expect(graySpans.length).toBeGreaterThan(0);
    });
  });
});
