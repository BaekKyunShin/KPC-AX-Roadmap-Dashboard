import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormTable } from './FormTable';

describe('FormTable', () => {
  it('headerRows 가 없으면 thead 가 렌더되지 않는다', () => {
    const { container } = render(
      <FormTable
        bodyRows={[{ cells: [{ content: '셀1' }, { content: '셀2' }] }]}
      />,
    );
    expect(container.querySelector('thead')).toBeNull();
    expect(container.querySelector('tbody')).not.toBeNull();
  });

  it('bodyRows 셀을 렌더하고 header=true 면 th 로 렌더한다', () => {
    const { container } = render(
      <FormTable
        bodyRows={[
          {
            cells: [
              { content: '헤더셀', header: true },
              { content: '데이터셀' },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByText('헤더셀')).toBeInTheDocument();
    expect(screen.getByText('데이터셀')).toBeInTheDocument();
    const tbody = container.querySelector('tbody');
    expect(tbody?.querySelector('th')?.textContent).toBe('헤더셀');
    expect(tbody?.querySelector('td')?.textContent).toBe('데이터셀');
  });

  it('rowSpan / colSpan 속성이 적용된다', () => {
    const { container } = render(
      <FormTable
        bodyRows={[
          {
            cells: [
              { content: '병합', rowSpan: 2, colSpan: 3 },
              { content: '일반' },
            ],
          },
        ]}
      />,
    );
    const mergedCell = container.querySelector('td[rowspan="2"][colspan="3"]');
    expect(mergedCell).not.toBeNull();
    expect(mergedCell?.textContent).toBe('병합');
  });

  it('align prop 에 따라 정렬 클래스가 적용된다', () => {
    const { container } = render(
      <FormTable
        bodyRows={[
          {
            cells: [
              { content: '왼쪽', align: 'left' },
              { content: '가운데', align: 'center' },
              { content: '오른쪽', align: 'right' },
            ],
          },
        ]}
      />,
    );
    const cells = container.querySelectorAll('tbody td');
    expect(cells[0].className).toContain('text-left');
    expect(cells[1].className).toContain('text-center');
    expect(cells[2].className).toContain('text-right');
  });

  it('caption 이 sr-only 로 렌더된다', () => {
    const { container } = render(
      <FormTable
        caption="양식 표 A"
        bodyRows={[{ cells: [{ content: '셀' }] }]}
      />,
    );
    const caption = container.querySelector('caption');
    expect(caption?.textContent).toBe('양식 표 A');
    expect(caption?.className).toContain('sr-only');
  });
});
