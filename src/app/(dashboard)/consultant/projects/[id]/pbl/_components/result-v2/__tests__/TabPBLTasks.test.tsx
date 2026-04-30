import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { TabPBLTasks } from '../TabPBLTasks';
import type { ResultPBLInterviewSnapshot } from '../types';

const interview: Partial<ResultPBLInterviewSnapshot> = {
  // R8 PBL-자체-03 — 평면 4행 배열 (차수×4 역할). 1차·2차 = 8행.
  activities: [
    { round: 1, role: 'PM', personName: '김PM', date: '2026.04.10', content: '경영진 인터뷰', method: '대면' },
    { round: 1, role: 'EXTERNAL_EXPERT', personName: '', date: '', content: '', method: '' },
    { round: 1, role: 'INTERNAL_EXPERT', personName: '박차장', date: '2026.04.10', content: '내부 현황 공유', method: '대면' },
    { round: 1, role: 'JURISDICTION_MANAGER', personName: '', date: '', content: '', method: '' },
    { round: 2, role: 'PM', personName: '김PM', date: '2026.04.17', content: '현장 워크숍', method: '대면+실습' },
    { round: 2, role: 'EXTERNAL_EXPERT', personName: '박전문가', date: '2026.04.17', content: '데이터 분석 멘토링', method: '대면+실습' },
    { round: 2, role: 'INTERNAL_EXPERT', personName: '생산팀 전체', date: '2026.04.17', content: '현장 사례 공유', method: '대면+실습' },
    { round: 2, role: 'JURISDICTION_MANAGER', personName: '이주치', date: '2026.04.17', content: 'HRD 점검', method: '서면 검토' },
  ],
  problemDefinitionSheet: {
    background: '야간 교대시 샘플 누락 발생',
    core: '검사 누락',
    scope: '품질 검사 라인',
    constraints: '예산·일정 한계',
  },
  priority: {
    items: [{ problem: '검사 누락', score: 5, rank: 1 }],
    method: 'AHP 기반 협의',
  },
  target: {
    name: '품질 검사 AI 보조',
    code: '1503020107',
    scope: '품질관리팀 10명',
    necessity: '검사 누락 즉시 탐지 필요',
    necessity_score: 5,
    details: [
      {
        title: '카메라 기반 이상 감지',
        as_is: '검사자별 육안 검사 (편차 발생)',
        to_be: '실시간 탐지 모델로 자동 알림',
        required_knowledge: '결함 유형 카탈로그 + 검사 기준',
        required_skill: 'CV 모델 운영 + 라벨링 도구',
      },
    ],
  },
  currentAiLevel: { level: 'BASIC', note: '도입 전 단계' },
  expectedAiLevel: { level: 'USER', note: '부서 단위 활용 단계 기대' },
};

describe('TabPBLTasks (Ⅲ. AI기반 훈련과제 도출)', () => {
  it('8개 하위 섹션 렌더 — Ⅲ-1 / Ⅲ-2-가 / Ⅲ-2-나 / Ⅲ-3-가 / Ⅲ-3-나 / Ⅲ-3-다 / Ⅲ-4-가 / Ⅲ-4-나', () => {
    render(
      <TabPBLTasks
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/Ⅲ-1\. 훈련과제 도출 수행활동/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Ⅲ-2-가\. 문제 정의서/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅲ-2-나\. 문제 우선순위 결정/)).toBeInTheDocument();
    expect(
      screen.getByText(/Ⅲ-3-가\. 훈련대상 업무 선정/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Ⅲ-3-나\. AI기반 문제해결 필요성/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Ⅲ-3-다\. 훈련대상 업무 세부내용/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Ⅲ-4-가\. 현재 AI 역량 수준/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅲ-4-나\. 예상 AI 역량 수준/)).toBeInTheDocument();
  });

  it('Ⅲ-1 수행활동 2차수 × 4 역할 = 8 행 표시', () => {
    render(
      <TabPBLTasks
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    // 차수 라벨 (1차·2차 × 4 행 = 8 셀)
    expect(screen.getAllByText('1차').length).toBe(4);
    expect(screen.getAllByText('2차').length).toBe(4);
    // 수행 내용
    expect(screen.getByText('경영진 인터뷰')).toBeInTheDocument();
    expect(screen.getByText('현장 워크숍')).toBeInTheDocument();
  });

  it('Ⅲ-1 수행활동 평면 4행 배열 — 4 역할 라벨이 차수마다 표시된다 (R8 PBL-자체-03)', () => {
    render(
      <TabPBLTasks
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    // R8 PBL-자체-03 — 평면 4행 배열. 차수당 4 역할이 별도 행으로 노출됨.
    // 1차 PM 성명 = "김PM" (1·2차 모두 PM 김PM 이라 2개 매치)
    expect(screen.getAllByText('김PM').length).toBeGreaterThanOrEqual(2);
    // 1차 INTERNAL_EXPERT 성명 = "박차장"
    expect(screen.getByText('박차장')).toBeInTheDocument();
    // 2차 EXTERNAL_EXPERT 성명 = "박전문가"
    expect(screen.getByText('박전문가')).toBeInTheDocument();
    // 2차 JURISDICTION_MANAGER 성명 = "이주치"
    expect(screen.getByText('이주치')).toBeInTheDocument();
    // 4 역할 라벨도 노출
    expect(screen.getAllByText('PM').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('외부전문가').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('기업내부전문가').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('능력개발전담주치의').length).toBeGreaterThanOrEqual(2);
  });

  it('Ⅲ-1 수행활동 — 빈 row(성명 없음) 는 "-" 로 fallback', () => {
    const emptyInterview = {
      ...interview,
      activities: [
        { round: 1, role: 'PM' as const, personName: '', date: '', content: '', method: '' },
        { round: 1, role: 'EXTERNAL_EXPERT' as const, personName: '', date: '', content: '', method: '' },
        { round: 1, role: 'INTERNAL_EXPERT' as const, personName: '', date: '', content: '', method: '' },
        { round: 1, role: 'JURISDICTION_MANAGER' as const, personName: '', date: '', content: '', method: '' },
      ],
    };
    render(
      <TabPBLTasks
        version={null}
        interview={emptyInterview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    // 빈 → "-" fallback
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('AiLevel4Check 현재/예상 2 인스턴스가 각각 readOnly 로 렌더', () => {
    render(
      <TabPBLTasks
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    // 2 radio 그룹 (현재/예상)
    const groups = screen.getAllByRole('group', {
      name: /AI 역량 수준/,
    });
    expect(groups.length).toBe(2);
    // radio 입력들은 전부 disabled 여야 한다.
    const radios = screen.getAllByRole('radio');
    expect(radios.length).toBeGreaterThan(0);
    radios.forEach((r) => {
      expect(r).toBeDisabled();
    });
  });

  it('priority.method 박스 값 표시', () => {
    render(
      <TabPBLTasks
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText('AHP 기반 협의')).toBeInTheDocument();
  });

  it('target.details 행 — 제목·설명 노출', () => {
    render(
      <TabPBLTasks
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText(/카메라 기반 이상 감지/)).toBeInTheDocument();
    expect(screen.getByText(/실시간 탐지 모델/)).toBeInTheDocument();
  });

  it('빈 인터뷰 snapshot 이어도 placeholder 표출하며 crash 안 함', () => {
    render(
      <TabPBLTasks version={null} interview={{}} readOnly onEdit={vi.fn()} />,
    );
    expect(screen.getByText(/등록된 수행활동이 없습니다/)).toBeInTheDocument();
    // R8 PBL-자체-04 — problemDefinitionSheet 는 양식상 단일 세트 (행 추가/삭제 불가)
    // 라 빈 상태에서도 4 라벨 (배경/핵심/범위/제약) 이 항상 노출됨.
    expect(screen.getByText('문제 배경')).toBeInTheDocument();
    expect(screen.getByText('핵심 문제')).toBeInTheDocument();
    expect(screen.getByText('문제 범위')).toBeInTheDocument();
    expect(screen.getByText('제약 조건')).toBeInTheDocument();
  });

  // R8 PBL-자체-04 — 4 정형 항목 결과 페이지 표출
  it('Ⅲ-2-가 문제 정의서 — 4 정형 라벨 + 입력값이 표 형태로 노출된다', () => {
    render(
      <TabPBLTasks
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText('문제 배경')).toBeInTheDocument();
    expect(screen.getByText('핵심 문제')).toBeInTheDocument();
    expect(screen.getByText('문제 범위')).toBeInTheDocument();
    expect(screen.getByText('제약 조건')).toBeInTheDocument();
    expect(screen.getByText(/야간 교대시 샘플 누락 발생/)).toBeInTheDocument();
    // "검사 누락" 은 problemDefinitionSheet.core + priority.items 둘 다 있어 multiple
    expect(screen.getAllByText(/검사 누락/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/품질 검사 라인/)).toBeInTheDocument();
  });
});
