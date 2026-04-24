import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExampleAccordion } from '../ExampleAccordion';

describe('ExampleAccordion', () => {
  it('example prop 이 있으면 예시 trigger 를 표시한다', () => {
    render(<ExampleAccordion example={<p>예시 본문</p>} />);
    expect(screen.getByText('(예시) 양식 원문')).toBeInTheDocument();
  });

  it('guide prop 이 있으면 작성 안내 trigger 를 표시한다', () => {
    render(<ExampleAccordion guide={<p>안내 본문</p>} />);
    expect(screen.getByText('작성 안내')).toBeInTheDocument();
  });

  it('example/guide 둘 다 없으면 trigger 가 렌더되지 않는다', () => {
    render(<ExampleAccordion />);
    expect(screen.queryByText('(예시) 양식 원문')).not.toBeInTheDocument();
    expect(screen.queryByText('작성 안내')).not.toBeInTheDocument();
  });

  it('defaultExpanded=true 이면 내용이 보인다', () => {
    render(
      <ExampleAccordion
        example={<p>예시 본문</p>}
        guide={<p>안내 본문</p>}
        defaultExpanded
      />,
    );
    // Radix Accordion 은 펼침 상태에서 내용을 data-state="open" 으로 렌더
    expect(screen.getByText('예시 본문')).toBeVisible();
    expect(screen.getByText('안내 본문')).toBeVisible();
  });
});
