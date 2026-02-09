import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CompanyInfoCard } from './CompanyInfoCard';

const requiredProps = {
  companyName: '테스트기업',
  industry: '건설/부동산',
  companySizeLabel: '중소기업',
  contactName: '홍길동',
  contactEmail: 'hong@test.com',
};

describe('CompanyInfoCard', () => {
  it('필수 정보를 모두 렌더링한다', () => {
    render(<CompanyInfoCard {...requiredProps} />);

    expect(screen.getByText('테스트기업')).toBeInTheDocument();
    expect(screen.getByText('건설/부동산')).toBeInTheDocument();
    expect(screen.getByText('중소기업')).toBeInTheDocument();
    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('hong@test.com')).toBeInTheDocument();
  });

  it('카드 제목 "기업 정보"가 표시된다', () => {
    render(<CompanyInfoCard {...requiredProps} />);
    expect(screen.getByText('기업 정보')).toBeInTheDocument();
  });

  it('기업 정보와 담당자 정보 사이에 구분선이 존재한다', () => {
    const { container } = render(<CompanyInfoCard {...requiredProps} />);
    expect(container.querySelector('hr')).toBeInTheDocument();
  });

  it('전화번호가 있으면 연락처와 함께 표시한다', () => {
    render(
      <CompanyInfoCard {...requiredProps} contactPhone="010-1234-5678" />
    );
    expect(screen.getByText('010-1234-5678')).toBeInTheDocument();
  });

  it('전화번호가 없으면 이메일만 표시한다', () => {
    render(<CompanyInfoCard {...requiredProps} />);
    expect(screen.getByText('hong@test.com')).toBeInTheDocument();
    expect(screen.queryByText('010-1234-5678')).not.toBeInTheDocument();
  });

  it('주소가 있으면 표시한다', () => {
    render(
      <CompanyInfoCard {...requiredProps} companyAddress="서울시 강남구" />
    );
    expect(screen.getByText('서울시 강남구')).toBeInTheDocument();
  });

  it('주소가 없으면 주소 영역이 렌더링되지 않는다', () => {
    render(<CompanyInfoCard {...requiredProps} />);
    expect(screen.queryByText('주소')).not.toBeInTheDocument();
  });

  it('고객 요청사항이 있으면 별도 영역에 표시한다', () => {
    render(
      <CompanyInfoCard
        {...requiredProps}
        customerComment="AI 도입 시급합니다"
      />
    );
    expect(screen.getByText('고객 요청사항')).toBeInTheDocument();
    expect(screen.getByText('AI 도입 시급합니다')).toBeInTheDocument();
  });

  it('고객 요청사항이 없으면 해당 영역이 렌더링되지 않는다', () => {
    render(<CompanyInfoCard {...requiredProps} />);
    expect(screen.queryByText('고객 요청사항')).not.toBeInTheDocument();
  });
});
