import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { TabPBLTasks } from '../TabPBLTasks';
import type { ResultPBLInterviewSnapshot } from '../types';
import type { RoadmapInterviewStrict } from '@/lib/schemas/interview-roadmap';

const interview: Partial<ResultPBLInterviewSnapshot> = {
  problemDefinitionSheet: {
    background: '야간 교대시 샘플 누락 발생',
    core: '검사 누락',
    scope: '품질 검사 라인',
    constraints: '예산·일정 한계',
  },
  target: {
    // Ⅲ-3-가 — 로드맵 과업 순서와 1:1 (2개 로드맵 과업 ↔ 2개 selection)
    taskSelections: [
      { ai_necessity: 'AI 자동 판정 필요도 높음', training_selected: true },
      { ai_necessity: '데이터 축적 부족', training_selected: false },
    ],
    necessity: '검사 누락 즉시 탐지 필요',
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
};

// 선행 로드맵 과업 분석표 (Ⅲ-3-가 4열 자동 연동) — taskSelections 와 순서 1:1
const linkedRoadmap: Partial<RoadmapInterviewStrict> = {
  taskAnalysis: [
    {
      domain: '품질관리',
      task: '외관 검사',
      asIs: '검사자 육안 검사',
      improvement: 'AI 비전 검사 도입 가능',
    },
    {
      domain: '생산관리',
      task: '설비 점검',
      asIs: '수기 점검표 작성',
      improvement: '센서 데이터 기반 이상 감지',
    },
  ],
};

describe('TabPBLTasks (Ⅲ. AI기반 훈련과제 도출)', () => {
  it('4개 하위 섹션 렌더 — Ⅲ-2-가 / Ⅲ-3-가 / Ⅲ-3-나 / Ⅲ-3-다', () => {
    render(
      <TabPBLTasks
        version={null}
        interview={interview}
        linkedRoadmap={linkedRoadmap}
        readOnly
        onEdit={vi.fn()}
      />
    );
    expect(screen.getByText(/Ⅲ-2-가\. 문제 정의서/)).toBeInTheDocument();
    // 정본 정합: 문구 "훈련대상 업무 선정"(구 "과업 선정"), 번호 Ⅲ-3-가 유지
    expect(screen.getByText(/Ⅲ-3-가\. 훈련대상 업무 선정/)).toBeInTheDocument();
    // 정본 정합: "AI기반 문제해결의 필요성"(구 "문제해결 필요성")
    expect(screen.getByText(/Ⅲ-3-나\. AI기반 문제해결의 필요성/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅲ-3-다\. 훈련대상 업무 세부내용/)).toBeInTheDocument();
  });

  it('제거된 섹션(Ⅲ-1 수행활동 / Ⅲ-2-나 우선순위 / Ⅲ-4 AI역량)은 더 이상 렌더되지 않는다', () => {
    const { container } = render(
      <TabPBLTasks
        version={null}
        interview={interview}
        linkedRoadmap={linkedRoadmap}
        readOnly
        onEdit={vi.fn()}
      />
    );
    const text = container.textContent ?? '';
    expect(text).not.toContain('훈련과제 도출 수행활동');
    expect(text).not.toContain('문제 우선순위');
    expect(text).not.toContain('AI 역량 수준');
    // AiLevel4Check radio 위젯 완전 제거
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByRole('group', { name: /AI 역량 수준/ })).toBeNull();
  });

  it('Ⅲ-2-가 문제 정의서 — 4 정형 라벨 + 입력값이 표 형태로 노출된다', () => {
    render(
      <TabPBLTasks
        version={null}
        interview={interview}
        linkedRoadmap={linkedRoadmap}
        readOnly
        onEdit={vi.fn()}
      />
    );
    expect(screen.getByText('문제 배경')).toBeInTheDocument();
    expect(screen.getByText('핵심 문제')).toBeInTheDocument();
    expect(screen.getByText('문제 범위')).toBeInTheDocument();
    expect(screen.getByText('제약 조건')).toBeInTheDocument();
    expect(screen.getByText(/야간 교대시 샘플 누락 발생/)).toBeInTheDocument();
    expect(screen.getByText(/품질 검사 라인/)).toBeInTheDocument();
  });

  it('Ⅲ-3-가 — 로드맵 과업 4열 + taskSelections 2열(AI 필요도·훈련 선정)을 zip 하여 표출', () => {
    render(
      <TabPBLTasks
        version={null}
        interview={interview}
        linkedRoadmap={linkedRoadmap}
        readOnly
        onEdit={vi.fn()}
      />
    );
    // 정본 정합 컬럼 헤더: "현행 방식"(구 "현행 방식 (As-Is)"), "AI도입·활용 필요도"(구 공백 포함)
    expect(screen.getByText('현행 방식')).toBeInTheDocument();
    expect(screen.getByText('AI도입·활용 필요도')).toBeInTheDocument();
    // 로드맵 과업 4열 (직무·과업·현행·개선점)
    expect(screen.getByText('품질관리')).toBeInTheDocument();
    expect(screen.getByText('외관 검사')).toBeInTheDocument();
    expect(screen.getByText(/검사자 육안 검사/)).toBeInTheDocument();
    expect(screen.getByText(/AI 비전 검사 도입 가능/)).toBeInTheDocument();
    expect(screen.getByText('설비 점검')).toBeInTheDocument();
    // PBL 2열 — AI 도입·활용 필요도 (taskSelections[i].ai_necessity)
    expect(screen.getByText(/AI 자동 판정 필요도 높음/)).toBeInTheDocument();
    expect(screen.getByText(/데이터 축적 부족/)).toBeInTheDocument();
    // 훈련 선정 badge (training_selected → 선정 / 미선정)
    expect(screen.getByText('선정')).toBeInTheDocument();
    expect(screen.getByText('미선정')).toBeInTheDocument();
  });

  it('Ⅲ-3-가 — 선행 로드맵 미연계(linkedRoadmap 없음) 시 안내 문구 표출', () => {
    render(<TabPBLTasks version={null} interview={interview} readOnly onEdit={vi.fn()} />);
    expect(screen.getByText(/선행 로드맵 과업이 연결되지 않았습니다/)).toBeInTheDocument();
  });

  it('Ⅲ-3-나 선정 사유(necessity) 값 표시', () => {
    render(
      <TabPBLTasks
        version={null}
        interview={interview}
        linkedRoadmap={linkedRoadmap}
        readOnly
        onEdit={vi.fn()}
      />
    );
    expect(screen.getByText(/검사 누락 즉시 탐지 필요/)).toBeInTheDocument();
  });

  it('Ⅲ-3-다 target.details 행 — 제목·설명 노출', () => {
    render(
      <TabPBLTasks
        version={null}
        interview={interview}
        linkedRoadmap={linkedRoadmap}
        readOnly
        onEdit={vi.fn()}
      />
    );
    expect(screen.getByText(/카메라 기반 이상 감지/)).toBeInTheDocument();
    expect(screen.getByText(/실시간 탐지 모델/)).toBeInTheDocument();
  });

  it('빈 인터뷰 snapshot 이어도 placeholder 표출하며 crash 안 함', () => {
    render(<TabPBLTasks version={null} interview={{}} readOnly onEdit={vi.fn()} />);
    // 문제 정의서 4 라벨은 빈 상태에서도 항상 노출
    expect(screen.getByText('문제 배경')).toBeInTheDocument();
    expect(screen.getByText('핵심 문제')).toBeInTheDocument();
    expect(screen.getByText('문제 범위')).toBeInTheDocument();
    expect(screen.getByText('제약 조건')).toBeInTheDocument();
    // 로드맵 미연계 → Ⅲ-3-가 안내
    expect(screen.getByText(/선행 로드맵 과업이 연결되지 않았습니다/)).toBeInTheDocument();
    // details 빈 → 안내
    expect(screen.getByText(/등록된 세부내용이 없습니다/)).toBeInTheDocument();
  });

  it('readOnly=false 일 때 편집 가능한 InlineEditField(button) 가 노출된다', () => {
    const onEdit = vi.fn().mockResolvedValue(undefined);
    render(
      <TabPBLTasks
        version={null}
        interview={interview}
        linkedRoadmap={linkedRoadmap}
        readOnly={false}
        onEdit={onEdit}
      />
    );
    // 문제 정의서 / 필요성 / 세부내용 의 InlineEditField 편집 영역(button) 노출
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
    expect(screen.getByText(/Ⅲ-2-가/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅲ-3-나/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅲ-3-다/)).toBeInTheDocument();
  });
});
