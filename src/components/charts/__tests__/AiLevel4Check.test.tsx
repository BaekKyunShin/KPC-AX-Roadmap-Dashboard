import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { AiLevel4Check } from '../AiLevel4Check';

describe('AiLevel4Check', () => {
  it('4개 등급 옵션을 모두 라벨과 함께 렌더한다', () => {
    render(
      <AiLevel4Check
        value={{ level: 'BASIC', note: '' }}
        onChange={vi.fn()}
        ariaLabel="현재 AI역량 수준"
      />,
    );
    expect(screen.getByText('AI기초형')).toBeInTheDocument();
    expect(screen.getByText('AI탐구형')).toBeInTheDocument();
    expect(screen.getByText('AI활용형')).toBeInTheDocument();
    expect(screen.getByText('AI선도형')).toBeInTheDocument();
  });

  it('현재 선택된 등급은 checked 상태이다', () => {
    render(
      <AiLevel4Check
        value={{ level: 'USER', note: '' }}
        onChange={vi.fn()}
        ariaLabel="AI역량 수준"
      />,
    );
    const userRadio = screen.getByRole('radio', { name: /AI활용형/ });
    expect(userRadio).toBeChecked();
    const basicRadio = screen.getByRole('radio', { name: /AI기초형/ });
    expect(basicRadio).not.toBeChecked();
  });

  it('다른 등급 선택 시 onChange 에 새 level 이 전달된다 (note 유지)', () => {
    const onChange = vi.fn();
    render(
      <AiLevel4Check
        value={{ level: 'BASIC', note: '기존 노트' }}
        onChange={onChange}
        ariaLabel="AI역량 수준"
      />,
    );
    fireEvent.click(screen.getByRole('radio', { name: /AI선도형/ }));
    expect(onChange).toHaveBeenCalledWith({
      level: 'LEADER',
      note: '기존 노트',
    });
  });

  it('note 영역에 입력 시 onChange 에 반영된다 (level 유지)', () => {
    const onChange = vi.fn();
    render(
      <AiLevel4Check
        value={{ level: 'EXPLORER', note: '' }}
        onChange={onChange}
        ariaLabel="AI역량 수준"
      />,
    );
    const noteInput = screen.getByLabelText('AI역량 수준 비고');
    fireEvent.change(noteInput, { target: { value: '파일럿 진행 중' } });
    expect(onChange).toHaveBeenCalledWith({
      level: 'EXPLORER',
      note: '파일럿 진행 중',
    });
  });

  it('readOnly=true 이면 모든 radio 와 textarea 가 disabled 이다', () => {
    render(
      <AiLevel4Check
        value={{ level: 'BASIC', note: '' }}
        onChange={vi.fn()}
        ariaLabel="AI역량 수준"
        readOnly
      />,
    );
    for (const level of ['AI기초형', 'AI탐구형', 'AI활용형', 'AI선도형']) {
      expect(screen.getByRole('radio', { name: new RegExp(level) })).toBeDisabled();
    }
    expect(screen.getByLabelText('AI역량 수준 비고')).toBeDisabled();
  });

  it('기본 등급 설명 (description) 을 노출한다', () => {
    render(
      <AiLevel4Check
        value={{ level: 'BASIC', note: '' }}
        onChange={vi.fn()}
        ariaLabel="AI역량 수준"
      />,
    );
    // 양식 4등급 설명 핵심 키워드 검증
    expect(screen.getByText(/AI 및 디지털 기술 도입에 대한 인식은 있으나/)).toBeInTheDocument();
    expect(screen.getByText(/일부 구성원이 AI 도구를 시범적으로 사용/)).toBeInTheDocument();
    expect(screen.getByText(/부서 단위로 AI 도구·자동화를 활용/)).toBeInTheDocument();
    expect(screen.getByText(/전사적으로 AI를 도입해 자체 모델/)).toBeInTheDocument();
  });
});
