import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { TabPBLOverview } from '../TabPBLOverview';
import type { ResultPBLInterviewSnapshot } from '../types';

const interview: Partial<ResultPBLInterviewSnapshot> = {
  overview: {
    companyName: '테스트기업',
    courseName: 'AI 실무 과정',
    ncsCode: '200107 인공지능',
    trainingHours: 40,
    trainingTarget: '사무직 20명',
    trainingForm: '집체 + 실습',
    trainingPeriod: '2026.05.01 ~ 2026.05.31',
    businessIssues: '제조 공정 AI 전환 필요',
  },
};

describe('TabPBLOverview (Ⅰ. 훈련과정 개요)', () => {
  it('Ⅰ 훈련과정 개요 섹션 렌더 — 주요 필드 값 노출', () => {
    render(
      <TabPBLOverview
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText(/Ⅰ\. 훈련과정 개요/)).toBeInTheDocument();
    expect(screen.getByText(/테스트기업/)).toBeInTheDocument();
    expect(screen.getByText(/AI 실무 과정/)).toBeInTheDocument();
    expect(screen.getByText(/200107 인공지능/)).toBeInTheDocument();
    expect(screen.getByText(/사무직 20명/)).toBeInTheDocument();
    expect(screen.getByText(/제조 공정 AI 전환 필요/)).toBeInTheDocument();
  });

  it('readOnly=true 에서 InlineEditField 가 role=button 없음 — 편집 금지', () => {
    render(
      <TabPBLOverview
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    const companyName = screen.getByText(/테스트기업/);
    expect(companyName.closest('[role="button"]')).toBeNull();
  });

  it('DRAFT (readOnly=false) 에서 편집 가능한 role=button 노출', () => {
    render(
      <TabPBLOverview
        version={null}
        interview={interview}
        readOnly={false}
        onEdit={vi.fn()}
      />,
    );
    // 편집 가능 필드가 최소 하나 이상 존재
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('제외 라벨 ("표지" / "결과보고서" / "수행일지" / "고정 참고자료") 를 렌더하지 않음', () => {
    const { container } = render(
      <TabPBLOverview
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    const text = container.textContent ?? '';
    expect(text).not.toContain('표지');
    expect(text).not.toContain('결과보고서');
    expect(text).not.toContain('수행일지');
    expect(text).not.toContain('고정 참고자료');
    expect(text).not.toContain('결과물 표지');
  });

  it('빈 인터뷰 snapshot 이어도 placeholder 를 표출하며 crash 하지 않는다', () => {
    render(
      <TabPBLOverview
        version={null}
        interview={{}}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText(/Ⅰ\. 훈련과정 개요/)).toBeInTheDocument();
    expect(
      screen.getByText(/기업명이 입력되지 않았습니다/),
    ).toBeInTheDocument();
  });

  // R3 PBL-자체-01 임시 처리 — 결과 페이지 description 에 신청서 자동표출 안내 노출
  // (사업장관리번호·업종·업종코드·주소·훈련실시주소·관할 지부·담당자 정보 데이터 바인딩은 R7+ 별도 PR 위임)
  it('Ⅰ. 훈련과정 개요 description 에 신청서 자동표출 안내가 노출된다 (PBL-자체-01)', () => {
    render(
      <TabPBLOverview
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/신청서 자동표출.*HWPX 다운로드 시 자동/),
    ).toBeInTheDocument();
  });
});
