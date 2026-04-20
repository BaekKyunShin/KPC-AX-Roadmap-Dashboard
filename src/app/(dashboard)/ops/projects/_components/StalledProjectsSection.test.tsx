import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@/test/helpers/mock-next-link';
import StalledProjectsSection from './StalledProjectsSection';
import type { StalledProject } from '../actions';

// ============================================================================
// 테스트 데이터
// ============================================================================

const mockProjects: StalledProject[] = [
  {
    id: 'p1',
    company_name: '정체기업A',
    contact_email: 'a@test.com',
    status: 'ASSIGNED',
    days_stalled: 35,
    assigned_consultant: { id: 'c1', name: '김컨설턴트' },
    severity: 'high',
  },
  {
    id: 'p2',
    company_name: '정체기업B',
    contact_email: 'b@test.com',
    status: 'INTERVIEWED',
    days_stalled: 22,
    assigned_consultant: { id: 'c2', name: '이컨설턴트' },
    severity: 'medium',
  },
];

const unassignedProject: StalledProject[] = [
  {
    id: 'p3',
    company_name: '미배정기업',
    contact_email: 'c@test.com',
    status: 'DIAGNOSED',
    days_stalled: 25,
    assigned_consultant: null,
    severity: 'medium',
  },
];

// ============================================================================
// 테스트
// ============================================================================

describe('StalledProjectsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. 기본 렌더링
  // --------------------------------------------------------------------------
  describe('기본 렌더링', () => {
    it('카드 타이틀 "정체 프로젝트"를 표시한다', () => {
      render(<StalledProjectsSection projects={mockProjects} />);
      expect(screen.getByText('정체 프로젝트')).toBeInTheDocument();
    });

    it('설명 텍스트에 일수 기준이 포함된다', () => {
      render(<StalledProjectsSection projects={mockProjects} />);
      // PROJECT_STALL_THRESHOLDS.DASHBOARD_MIN = 20
      expect(screen.getByText(/20일 이상/)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 2. 프로젝트 수 배지
  // --------------------------------------------------------------------------
  describe('프로젝트 수 배지', () => {
    it('프로젝트가 있을 때 건 수 배지를 표시한다', () => {
      render(<StalledProjectsSection projects={mockProjects} />);
      expect(screen.getByText('2건')).toBeInTheDocument();
    });

    it('프로젝트가 없을 때 배지를 표시하지 않는다', () => {
      render(<StalledProjectsSection projects={[]} />);
      expect(screen.queryByText(/건/)).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 3. 빈 상태
  // --------------------------------------------------------------------------
  describe('빈 상태', () => {
    it('프로젝트가 없으면 정체 없음 메시지를 표시한다', () => {
      render(<StalledProjectsSection projects={[]} />);
      expect(screen.getByText(/정체된 프로젝트가 없습니다/)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 4. 프로젝트 카드 내용
  // --------------------------------------------------------------------------
  describe('프로젝트 카드 내용', () => {
    it('기업명을 표시한다', () => {
      render(<StalledProjectsSection projects={mockProjects} />);
      expect(screen.getByText('정체기업A')).toBeInTheDocument();
      expect(screen.getByText('정체기업B')).toBeInTheDocument();
    });

    it('경과 일수를 표시한다', () => {
      render(<StalledProjectsSection projects={mockProjects} />);
      expect(screen.getByText('35일 경과')).toBeInTheDocument();
      expect(screen.getByText('22일 경과')).toBeInTheDocument();
    });

    it('담당 컨설턴트 이름을 표시한다', () => {
      render(<StalledProjectsSection projects={mockProjects} />);
      expect(screen.getByText('김컨설턴트')).toBeInTheDocument();
      expect(screen.getByText('이컨설턴트')).toBeInTheDocument();
    });

    it('미배정 프로젝트는 "미배정"을 표시한다', () => {
      render(<StalledProjectsSection projects={unassignedProject} />);
      expect(screen.getByText('미배정')).toBeInTheDocument();
    });

    it('상태 배지를 표시한다 (ASSIGNED → 컨설턴트 배정 완료)', () => {
      render(<StalledProjectsSection projects={mockProjects} />);
      expect(screen.getByText('컨설턴트 배정 완료')).toBeInTheDocument();
    });

    it('상세보기 링크가 해당 프로젝트 경로로 연결된다', () => {
      render(<StalledProjectsSection projects={mockProjects} />);
      const links = screen.getAllByText('상세보기');
      expect(links[0].closest('a')).toHaveAttribute('href', '/ops/projects/p1');
      expect(links[1].closest('a')).toHaveAttribute('href', '/ops/projects/p2');
    });
  });

  // --------------------------------------------------------------------------
  // 5. 심각도 스타일
  // --------------------------------------------------------------------------
  describe('심각도 스타일', () => {
    it('SEVERE(30일 이상) 프로젝트는 경과일을 빨간색으로 표시한다', () => {
      render(<StalledProjectsSection projects={mockProjects} />);
      // p1: days_stalled=35 >= 30 → text-red-600
      const severeEl = screen.getByText('35일 경과');
      expect(severeEl.className).toMatch(/text-red-600/);
    });

    it('WARNING(20~29일) 프로젝트는 경과일을 주황색으로 표시한다', () => {
      render(<StalledProjectsSection projects={mockProjects} />);
      // p2: days_stalled=22, 20 <= 22 < 30 → text-amber-600
      const warningEl = screen.getByText('22일 경과');
      expect(warningEl.className).toMatch(/text-amber-600/);
    });
  });

  // --------------------------------------------------------------------------
  // 6. 상태별 메시지
  // --------------------------------------------------------------------------
  describe('상태별 메시지', () => {
    it('ASSIGNED 상태는 "컨설턴트 배정 후" 메시지를 표시한다', () => {
      render(<StalledProjectsSection projects={[mockProjects[0]]} />);
      expect(screen.getByText('컨설턴트 배정 후')).toBeInTheDocument();
    });

    it('INTERVIEWED 상태는 "현장 인터뷰 후" 메시지를 표시한다', () => {
      render(<StalledProjectsSection projects={[mockProjects[1]]} />);
      expect(screen.getByText('현장 인터뷰 후')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 7. 알 수 없는 상태 — 폴백 분기 커버
  // --------------------------------------------------------------------------
  describe('알 수 없는 상태 폴백', () => {
    const unknownProject: StalledProject[] = [
      {
        id: 'p-unknown',
        company_name: '알수없는기업',
        contact_email: 'x@test.com',
        status: 'UNKNOWN_STATUS' as StalledProject['status'],
        days_stalled: 10,
        assigned_consultant: null,
        severity: 'medium',
      },
    ];

    it('STALLED_STATUS_MESSAGES에 없는 상태는 "상태 변경 후" 폴백 메시지를 표시한다', () => {
      // Line 25: STALLED_STATUS_MESSAGES[projectStatus] ?? '상태 변경 후' → 우측 피연산자 커버
      render(<StalledProjectsSection projects={unknownProject} />);
      expect(screen.getByText('상태 변경 후')).toBeInTheDocument();
    });

    it('PROJECT_STATUS_CONFIG에 없는 상태는 원본 status 값을 배지로 표시한다', () => {
      // Lines 54, 56: statusConfig?.color || 'bg-gray-100', statusConfig?.label || project.status 커버
      render(<StalledProjectsSection projects={unknownProject} />);
      expect(screen.getByText('UNKNOWN_STATUS')).toBeInTheDocument();
    });
  });
});
