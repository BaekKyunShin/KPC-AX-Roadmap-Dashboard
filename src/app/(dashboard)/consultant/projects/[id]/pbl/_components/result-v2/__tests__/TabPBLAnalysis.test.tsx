import { describe, it, expect, vi } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';

import { TabPBLAnalysis } from '../TabPBLAnalysis';
import type { ResultPBLInterviewSnapshot } from '../types';

const interview: Partial<ResultPBLInterviewSnapshot> = {
  analysis: {
    companyIssues: '제조 공정 효율화 필요',
    organization: {
      orgTree: [
        { id: 'n1', name: '경영지원본부', children: [] },
        {
          id: 'n2',
          name: '생산본부',
          children: [{ id: 'n2-1', name: '품질관리팀', children: [] }],
        },
      ],
      mainWork: [
        { dept: '품질관리팀', role: '검사', description: '제품 출하 전 샘플 검사' },
      ],
    },
    trainingEnv: {
      properTrainingHours: '회차당 4시간 × 10주',
      internalPlace: '사내 교육장 (PC 20대)',
      externalPlace: '',
      internalInstructors: [
        {
          position: '품질 파트장',
          name: '김품질',
          career: '12년',
          personalTraits: '데이터 친화',
        },
      ],
      externalInstructors: [],
      aiInfrastructure: 'PC 20대 · AI 도구 접근 가능',
    },
    hrdReportPdf: {
      fileName: 'hrd_consulting.pdf',
      url: 'https://example.com/hrd_consulting.pdf',
      size: 512000,
    },
    courseNecessity: '기존 과정으로는 AI 역량 확보가 어려움',
  },
};

describe('TabPBLAnalysis (Ⅱ. 훈련 요구 분석)', () => {
  it('4개 하위 섹션 렌더 — Ⅱ-1-가 / Ⅱ-2 / Ⅱ-3-가 / Ⅱ-3-나 (Phase E: Ⅱ-1-나 조직 섹션 제거)', () => {
    render(
      <TabPBLAnalysis
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText(/Ⅱ-1-가\. 기업 경영 이슈/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅱ-2\. 기업 훈련환경 분석/)).toBeInTheDocument();
    expect(
      screen.getByText(/Ⅱ-3-가\. HRD이음 컨설팅 결과 보고서/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Ⅱ-3-나\. AI훈련과정 개발 필요성/),
    ).toBeInTheDocument();
    // Ⅱ-1-나 조직 섹션은 더 이상 렌더되지 않음 (로드맵과 동일 패턴)
    expect(screen.queryByText(/Ⅱ-1-나\. 조직 및 주요 업무/)).toBeNull();
  });

  it('HRD이음 PDF 링크 + iframe 미리보기 렌더', () => {
    const { container } = render(
      <TabPBLAnalysis
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText('hrd_consulting.pdf')).toBeInTheDocument();
    // iframe 요소 존재
    const iframes = container.querySelectorAll('iframe');
    expect(iframes.length).toBeGreaterThan(0);
  });

  it('DRAFT 상태에서 companyIssues 편집 → onEdit({ companyIssues }) 호출', async () => {
    const onEdit = vi.fn().mockResolvedValue(undefined);
    render(
      <TabPBLAnalysis
        version={null}
        interview={interview}
        readOnly={false}
        onEdit={onEdit}
      />,
    );
    const issueView = screen.getByText(/제조 공정 효율화 필요/);
    const trigger = issueView.closest('[role="button"]');
    expect(trigger).not.toBeNull();
    await act(async () => {
      fireEvent.click(trigger as HTMLElement);
    });
    const textareas = screen.getAllByRole('textbox');
    expect(textareas.length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.change(textareas[0], { target: { value: '수정된 이슈' } });
      fireEvent.keyDown(textareas[0], { key: 'Enter', ctrlKey: true });
    });
    await waitFor(() =>
      expect(onEdit).toHaveBeenCalledWith({ companyIssues: '수정된 이슈' }),
    );
  });

  it('제외 라벨 ("결과보고서" / "수행일지") 을 렌더하지 않음', () => {
    const { container } = render(
      <TabPBLAnalysis
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    const text = container.textContent ?? '';
    expect(text).not.toContain('결과보고서');
    expect(text).not.toContain('수행일지');
  });
});
