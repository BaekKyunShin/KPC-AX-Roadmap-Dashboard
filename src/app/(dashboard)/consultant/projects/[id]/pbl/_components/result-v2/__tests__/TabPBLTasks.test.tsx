import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { TabPBLTasks } from '../TabPBLTasks';
import type { ResultPBLInterviewSnapshot } from '../types';

const interview: Partial<ResultPBLInterviewSnapshot> = {
  activities: [
    {
      round: 1,
      date: '2026.04.10',
      content: '경영진 인터뷰',
      method: '대면',
      participants: {
        pm: '김PM',
        external_expert: '',
        internal_expert: '박차장',
        jurisdiction_manager: '',
      },
    },
    {
      round: 2,
      date: '2026.04.17',
      content: '현장 워크숍',
      method: '대면+실습',
      participants: {
        pm: '김PM',
        external_expert: '박전문가',
        internal_expert: '생산팀 전체',
        jurisdiction_manager: '이주치',
      },
    },
  ],
  problems: [
    {
      title: '검사 누락',
      description: '야간 교대시 샘플 누락 발생',
      impact: '불량률 증가',
    },
  ],
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
    expect(screen.getByText(/Ⅲ-2-가\. 문제 도출/)).toBeInTheDocument();
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

  it('Ⅲ-1 수행활동 2차수 행 표시', () => {
    render(
      <TabPBLTasks
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText('1차')).toBeInTheDocument();
    expect(screen.getByText('2차')).toBeInTheDocument();
    expect(screen.getByText('경영진 인터뷰')).toBeInTheDocument();
    expect(screen.getByText('현장 워크숍')).toBeInTheDocument();
  });

  it('Ⅲ-1 수행활동 participants 4 person dict 가 "PM 김PM · 내부 박차장" 형식으로 렌더된다 (PR #5 Phase F-4)', () => {
    render(
      <TabPBLTasks
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    // 1차수: pm + internal_expert 만 채워짐 → "PM 김PM · 내부 박차장" (1·2차수 모두 PM 김PM 이라 multiple)
    expect(screen.getAllByText(/PM 김PM/).length).toBeGreaterThanOrEqual(2);
    // 1차수 specific — "내부 박차장" 은 1차수만 (2차수는 "내부 생산팀 전체")
    expect(screen.getByText(/내부 박차장/)).toBeInTheDocument();
    // 2차수: 4 person 모두 채워짐 — 외부·주치의는 2차수 only
    expect(screen.getByText(/외부 박전문가/)).toBeInTheDocument();
    expect(screen.getByText(/주치의 이주치/)).toBeInTheDocument();
  });

  it('Ⅲ-1 수행활동 participants 가 string 인 legacy 데이터도 fallback 으로 렌더된다', () => {
    const legacyInterview = {
      ...interview,
      activities: [
        {
          round: 1,
          date: '2026.03.01',
          content: 'legacy 인터뷰',
          method: '대면',
          // 기존 V2 string 형 데이터 (preprocess 마이그레이션 전)
          participants: 'PM 홍길동, 외부 김전문' as unknown as {
            pm: string;
            external_expert: string;
            internal_expert: string;
            jurisdiction_manager: string;
          },
        },
      ],
    };
    render(
      <TabPBLTasks
        version={null}
        interview={legacyInterview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    // string fallback 로직: 그대로 출력
    expect(screen.getByText('PM 홍길동, 외부 김전문')).toBeInTheDocument();
  });

  it('Ⅲ-1 수행활동 participants 가 모두 빈 dict 일 때 "-" 로 fallback', () => {
    const emptyInterview = {
      ...interview,
      activities: [
        {
          round: 1,
          date: '2026.03.01',
          content: '데이터 없음 케이스',
          method: '대면',
          participants: {
            pm: '',
            external_expert: '',
            internal_expert: '',
            jurisdiction_manager: '',
          },
        },
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
    // 빈 dict → "-" fallback
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
    expect(screen.getByText(/등록된 문제가 없습니다/)).toBeInTheDocument();
  });
});
