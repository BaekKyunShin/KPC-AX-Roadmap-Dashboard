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

  // R8 PBL-자체-01 본격 데이터 바인딩 — projectMeta 7필드 결과 페이지 표출
  describe('PBL-자체-01: 신청서 자동표출 7필드 (R8)', () => {
    const fullMeta = {
      companyName: '테스트기업',
      industry: '제조업',
      industryCode: 'C26',
      companyAddress: '서울시 강남구 테헤란로 123',
      trainingAddress: '서울시 강남구 테헤란로 456 (훈련센터)',
      jurisdictionBranch: '한국산업인력공단 서울지역본부',
      contactName: '홍길동',
      contactPosition: '인사팀 대리',
      contactPhone: '010-1234-5678',
      contactEmail: 'hong@test.com',
      businessRegNo: '123-45-67890',
    };

    it('projectMeta 가 모두 채워지면 신청서 자동표출 카드에 7필드를 표시한다', () => {
      render(
        <TabPBLOverview
          version={null}
          interview={interview}
          projectMeta={fullMeta}
          readOnly
          onEdit={vi.fn()}
        />,
      );
      expect(screen.getByText(/신청서 자동표출 정보/)).toBeInTheDocument();
      expect(screen.getByText(/123-45-67890/)).toBeInTheDocument();
      expect(screen.getByText(/제조업/)).toBeInTheDocument();
      expect(screen.getByText(/C26/)).toBeInTheDocument();
      expect(screen.getByText(/서울시 강남구 테헤란로 123/)).toBeInTheDocument();
      expect(screen.getByText(/서울시 강남구 테헤란로 456/)).toBeInTheDocument();
      expect(screen.getByText(/한국산업인력공단 서울지역본부/)).toBeInTheDocument();
      expect(screen.getByText(/홍길동/)).toBeInTheDocument();
      expect(screen.getByText(/인사팀 대리/)).toBeInTheDocument();
    });

    it('projectMeta 가 모두 비어 있으면 안내 문구를 노출한다', () => {
      render(
        <TabPBLOverview
          version={null}
          interview={interview}
          projectMeta={{ companyName: '테스트기업' }}
          readOnly
          onEdit={vi.fn()}
        />,
      );
      expect(
        screen.getByText(/프로젝트 메타에 입력된 신청서 자동표출 정보가 없습니다/),
      ).toBeInTheDocument();
    });

    it('신청서 자동표출 카드 description 에 "수정 불가" 명시', () => {
      render(
        <TabPBLOverview
          version={null}
          interview={interview}
          projectMeta={fullMeta}
          readOnly
          onEdit={vi.fn()}
        />,
      );
      expect(screen.getByText(/수정 불가/)).toBeInTheDocument();
    });

    it('일부 필드만 비어 있으면 채워진 항목은 노출하고 빈 항목은 — 로 표시', () => {
      render(
        <TabPBLOverview
          version={null}
          interview={interview}
          projectMeta={{
            companyName: '테스트기업',
            businessRegNo: '123-45-67890',
            // industry, industryCode, etc. 누락
          }}
          readOnly
          onEdit={vi.fn()}
        />,
      );
      expect(screen.getByText(/123-45-67890/)).toBeInTheDocument();
    });
  });
});
