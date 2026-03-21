import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GuideCautions } from './GuideCautions';

describe('GuideCautions', () => {
  describe('빈 배열', () => {
    it('cautions가 빈 배열이면 아무것도 렌더링하지 않는다', () => {
      const { container } = render(<GuideCautions cautions={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('목록 렌더링', () => {
    it('주의사항 항목들을 모두 렌더링한다', () => {
      render(
        <GuideCautions
          cautions={['개인정보 보호에 유의할 것', '녹음 전 동의 구하기', '민감한 질문 자제']}
        />,
      );

      expect(screen.getByText('개인정보 보호에 유의할 것')).toBeInTheDocument();
      expect(screen.getByText('녹음 전 동의 구하기')).toBeInTheDocument();
      expect(screen.getByText('민감한 질문 자제')).toBeInTheDocument();
    });

    it('주의사항 항목 개수만큼 렌더링된다', () => {
      const { container } = render(
        <GuideCautions cautions={['주의사항 1', '주의사항 2']} />,
      );
      // 각 caution을 감싸는 div의 개수 확인
      const items = container.querySelectorAll('p.text-sm.text-gray-700');
      expect(items).toHaveLength(2);
    });

    it('단일 항목도 정상적으로 렌더링된다', () => {
      render(<GuideCautions cautions={['단일 주의사항']} />);
      expect(screen.getByText('단일 주의사항')).toBeInTheDocument();
    });
  });
});
