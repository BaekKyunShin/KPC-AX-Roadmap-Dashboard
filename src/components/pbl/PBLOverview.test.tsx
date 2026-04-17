import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PBLOverview } from './PBLOverview';

describe('PBLOverview', () => {
  it('기업명·과정명·훈련시간을 표시한다', () => {
    render(
      <PBLOverview
        value={{
          companyName: '테스트기업',
          courseName: 'AI 품질관리 과정',
          trainingHours: 40,
          traineeCount: 10,
          trainingJob: '품질관리자',
          aiLevel: 'AI활용형',
          trainingGoals: ['기술문제 해결', '불량률 감소'],
        }}
      />,
    );

    expect(screen.getByText('테스트기업')).toBeInTheDocument();
    expect(screen.getByText('AI 품질관리 과정')).toBeInTheDocument();
    expect(screen.getByText('40시간')).toBeInTheDocument();
    expect(screen.getByText('10명')).toBeInTheDocument();
    expect(screen.getByText('품질관리자')).toBeInTheDocument();
  });

  it('체크된 훈련 목표만 ☑ 아이콘 사용', () => {
    render(
      <PBLOverview
        value={{
          companyName: 'x',
          courseName: 'x',
          trainingHours: 0,
          traineeCount: 0,
          trainingJob: '',
          aiLevel: 'AI기초형',
          trainingGoals: ['공정 최적화'],
        }}
      />,
    );
    expect(screen.getByText(/☑ 공정 최적화/)).toBeInTheDocument();
    expect(screen.getByText(/☐ 기술문제 해결/)).toBeInTheDocument();
  });
});
