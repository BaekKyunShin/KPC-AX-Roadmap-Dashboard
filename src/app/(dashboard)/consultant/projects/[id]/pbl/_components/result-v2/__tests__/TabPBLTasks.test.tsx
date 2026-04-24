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
      participants: '김PM, 박차장',
    },
    {
      round: 2,
      date: '2026.04.17',
      content: '현장 워크숍',
      method: '대면+실습',
      participants: '생산팀 전체',
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
    details: [
      { title: '카메라 기반 이상 감지', description: '실시간 탐지 모델' },
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
