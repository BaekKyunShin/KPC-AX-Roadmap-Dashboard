import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  Skeleton,
  TableRowSkeleton,
  ProjectTableSkeleton,
  ConsultantProjectTableSkeleton,
  AuditLogTableSkeleton,
  UserTableSkeleton,
  QuotaTableSkeleton,
  TemplateTableSkeleton,
  TemplateFormSkeleton,
  TemplatePreviewSkeleton,
  CardSkeleton,
  DetailPageSkeleton,
  StatsCardSkeleton,
  PaginationSkeleton,
  RoadmapPageSkeleton,
  OpsRoadmapPageSkeleton,
  InterviewFormSkeleton,
  ProfileFormSkeleton,
} from './Skeleton';

// ============================================================================
// 테스트
// ============================================================================

describe('Skeleton', () => {
  // --------------------------------------------------------------------------
  // 기본 Skeleton
  // --------------------------------------------------------------------------

  describe('Skeleton (기본)', () => {
    it('렌더링된다', () => {
      const { container } = render(<Skeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('animate-shimmer 클래스가 존재한다', () => {
      const { container } = render(<Skeleton />);
      expect(container.firstChild).toHaveClass('animate-shimmer');
    });

    it('className prop이 적용된다', () => {
      const { container } = render(<Skeleton className="h-4 w-full" />);
      expect(container.firstChild).toHaveClass('h-4', 'w-full');
    });
  });

  // --------------------------------------------------------------------------
  // TableRowSkeleton
  // --------------------------------------------------------------------------

  describe('TableRowSkeleton', () => {
    it('렌더링된다', () => {
      const { container } = render(
        <table>
          <tbody>
            <TableRowSkeleton />
          </tbody>
        </table>,
      );
      const row = container.querySelector('tr');
      expect(row).toBeInTheDocument();
    });

    it('기본 컬럼 수(5)만큼 td가 생성된다', () => {
      const { container } = render(
        <table>
          <tbody>
            <TableRowSkeleton />
          </tbody>
        </table>,
      );
      const cells = container.querySelectorAll('td');
      expect(cells).toHaveLength(5);
    });

    it('columns prop으로 컬럼 수를 지정할 수 있다', () => {
      const { container } = render(
        <table>
          <tbody>
            <TableRowSkeleton columns={3} />
          </tbody>
        </table>,
      );
      const cells = container.querySelectorAll('td');
      expect(cells).toHaveLength(3);
    });
  });

  // --------------------------------------------------------------------------
  // ProjectTableSkeleton
  // --------------------------------------------------------------------------

  describe('ProjectTableSkeleton', () => {
    it('렌더링된다', () => {
      const { container } = render(<ProjectTableSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('animate-shimmer 클래스를 포함한 요소가 존재한다', () => {
      const { container } = render(<ProjectTableSkeleton />);
      expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
    });

    it('기본 rows=5만큼 행이 렌더링된다', () => {
      const { container } = render(<ProjectTableSkeleton />);
      // 테이블 body의 tr 수 확인
      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(5);
    });

    it('rows prop으로 행 수를 커스텀할 수 있다', () => {
      const { container } = render(<ProjectTableSkeleton rows={3} />);
      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(3);
    });

    it('6개 컬럼 헤더가 존재한다 (기업명, 업종, 진행 상태, 담당 컨설턴트, 프로젝트 생성일, 작업)', () => {
      const { container } = render(<ProjectTableSkeleton />);
      const headers = container.querySelectorAll('th');
      // 데스크톱 테이블 기준 6개
      expect(headers.length).toBeGreaterThanOrEqual(6);
    });
  });

  // --------------------------------------------------------------------------
  // ConsultantProjectTableSkeleton
  // --------------------------------------------------------------------------

  describe('ConsultantProjectTableSkeleton', () => {
    it('렌더링된다', () => {
      const { container } = render(<ConsultantProjectTableSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('animate-shimmer 클래스를 포함한 요소가 존재한다', () => {
      const { container } = render(<ConsultantProjectTableSkeleton />);
      expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
    });

    it('기본 rows=5만큼 행이 렌더링된다', () => {
      const { container } = render(<ConsultantProjectTableSkeleton />);
      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(5);
    });

    it('rows prop으로 행 수를 커스텀할 수 있다', () => {
      const { container } = render(<ConsultantProjectTableSkeleton rows={2} />);
      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(2);
    });
  });

  // --------------------------------------------------------------------------
  // AuditLogTableSkeleton
  // --------------------------------------------------------------------------

  describe('AuditLogTableSkeleton', () => {
    it('렌더링된다', () => {
      const { container } = render(<AuditLogTableSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('기본 rows=10만큼 행이 렌더링된다', () => {
      const { container } = render(<AuditLogTableSkeleton />);
      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(10);
    });

    it('rows prop을 지정할 수 있다', () => {
      const { container } = render(<AuditLogTableSkeleton rows={4} />);
      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(4);
    });
  });

  // --------------------------------------------------------------------------
  // UserTableSkeleton
  // --------------------------------------------------------------------------

  describe('UserTableSkeleton', () => {
    it('렌더링된다', () => {
      const { container } = render(<UserTableSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('animate-shimmer 클래스를 포함한 요소가 존재한다', () => {
      const { container } = render(<UserTableSkeleton />);
      expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
    });

    it('기본 rows=5만큼 행이 렌더링된다', () => {
      const { container } = render(<UserTableSkeleton />);
      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(5);
    });
  });

  // --------------------------------------------------------------------------
  // QuotaTableSkeleton
  // --------------------------------------------------------------------------

  describe('QuotaTableSkeleton', () => {
    it('렌더링된다', () => {
      const { container } = render(<QuotaTableSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('기본 rows=5만큼 행이 렌더링된다', () => {
      const { container } = render(<QuotaTableSkeleton />);
      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(5);
    });
  });

  // --------------------------------------------------------------------------
  // TemplateTableSkeleton
  // --------------------------------------------------------------------------

  describe('TemplateTableSkeleton', () => {
    it('렌더링된다', () => {
      const { container } = render(<TemplateTableSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('기본 rows=5만큼 행이 렌더링된다', () => {
      const { container } = render(<TemplateTableSkeleton />);
      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(5);
    });

    it('7개 컬럼 헤더가 렌더링된다 (버전, 이름, 문항수, 사용현황, 상태, 생성일, 빈칸)', () => {
      const { container } = render(<TemplateTableSkeleton />);
      const headers = container.querySelectorAll('th');
      // 데스크톱 테이블 기준 7개
      expect(headers.length).toBeGreaterThanOrEqual(7);
    });
  });

  // --------------------------------------------------------------------------
  // TemplateFormSkeleton
  // --------------------------------------------------------------------------

  describe('TemplateFormSkeleton', () => {
    it('렌더링된다', () => {
      const { container } = render(<TemplateFormSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('animate-shimmer 클래스를 포함한 요소가 존재한다', () => {
      const { container } = render(<TemplateFormSkeleton />);
      expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
    });

    it('questionCount prop으로 질문 수를 조절할 수 있다 (기본 1개)', () => {
      const { container } = render(<TemplateFormSkeleton questionCount={1} />);
      // QuestionItemSkeleton은 border border-gray-200 rounded-lg p-4 클래스를 가짐
      const questionItems = container.querySelectorAll('.border.border-gray-200.rounded-lg.p-4');
      expect(questionItems.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------------------------
  // TemplatePreviewSkeleton
  // --------------------------------------------------------------------------

  describe('TemplatePreviewSkeleton', () => {
    it('렌더링된다', () => {
      const { container } = render(<TemplatePreviewSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('animate-shimmer 클래스를 포함한 요소가 존재한다', () => {
      const { container } = render(<TemplatePreviewSkeleton />);
      expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // CardSkeleton
  // --------------------------------------------------------------------------

  describe('CardSkeleton', () => {
    it('렌더링된다', () => {
      const { container } = render(<CardSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('animate-shimmer 클래스를 포함한 요소가 존재한다', () => {
      const { container } = render(<CardSkeleton />);
      expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // DetailPageSkeleton
  // --------------------------------------------------------------------------

  describe('DetailPageSkeleton', () => {
    it('렌더링된다', () => {
      const { container } = render(<DetailPageSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('animate-shimmer 클래스를 포함한 요소가 존재한다', () => {
      const { container } = render(<DetailPageSkeleton />);
      expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // StatsCardSkeleton
  // --------------------------------------------------------------------------

  describe('StatsCardSkeleton', () => {
    it('렌더링된다', () => {
      const { container } = render(<StatsCardSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('animate-shimmer 클래스를 포함한 요소가 2개 이상 존재한다', () => {
      const { container } = render(<StatsCardSkeleton />);
      expect(container.querySelectorAll('.animate-shimmer').length).toBeGreaterThanOrEqual(2);
    });
  });

  // --------------------------------------------------------------------------
  // PaginationSkeleton
  // --------------------------------------------------------------------------

  describe('PaginationSkeleton', () => {
    it('렌더링된다', () => {
      const { container } = render(<PaginationSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('animate-shimmer 클래스를 포함한 요소가 존재한다', () => {
      const { container } = render(<PaginationSkeleton />);
      expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // RoadmapPageSkeleton / OpsRoadmapPageSkeleton
  // --------------------------------------------------------------------------

  describe('RoadmapPageSkeleton', () => {
    it('렌더링된다', () => {
      const { container } = render(<RoadmapPageSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('animate-shimmer 클래스를 포함한 요소가 존재한다', () => {
      const { container } = render(<RoadmapPageSkeleton />);
      expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
    });
  });

  describe('OpsRoadmapPageSkeleton', () => {
    it('렌더링된다', () => {
      const { container } = render(<OpsRoadmapPageSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('animate-shimmer 클래스를 포함한 요소가 존재한다', () => {
      const { container } = render(<OpsRoadmapPageSkeleton />);
      expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // InterviewFormSkeleton
  // --------------------------------------------------------------------------

  describe('InterviewFormSkeleton', () => {
    it('렌더링된다', () => {
      const { container } = render(<InterviewFormSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('animate-shimmer 클래스를 포함한 요소가 존재한다', () => {
      const { container } = render(<InterviewFormSkeleton />);
      expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
    });

    it('스테퍼 영역 6개 원형 요소가 렌더링된다', () => {
      const { container } = render(<InterviewFormSkeleton />);
      // 스테퍼의 각 단계: h-8 w-8 rounded-full animate-shimmer
      const stepCircles = container.querySelectorAll('.h-8.w-8.rounded-full.animate-shimmer');
      expect(stepCircles.length).toBeGreaterThanOrEqual(6);
    });
  });

  // --------------------------------------------------------------------------
  // ProfileFormSkeleton
  // --------------------------------------------------------------------------

  describe('ProfileFormSkeleton', () => {
    it('렌더링된다', () => {
      const { container } = render(<ProfileFormSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('animate-shimmer 클래스를 포함한 요소가 존재한다', () => {
      const { container } = render(<ProfileFormSkeleton />);
      expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
    });

    it('다수의 배지 스켈레톤이 렌더링된다', () => {
      const { container } = render(<ProfileFormSkeleton />);
      // BadgeSelectorSkeleton이 여러 개 포함되므로 animate-shimmer 요소가 많아야 함
      const shimmerEls = container.querySelectorAll('.animate-shimmer');
      expect(shimmerEls.length).toBeGreaterThan(20);
    });
  });
});
