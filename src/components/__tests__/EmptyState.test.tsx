// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { EmptyState } from '@/components/ui/EmptyState';

describe('EmptyState 컴포넌트', () => {
  it('기본 메시지가 렌더링된다', () => {
    render(<EmptyState />);
    expect(screen.getByText('검색 결과가 없습니다.')).toBeInTheDocument();
  });

  it('커스텀 메시지가 렌더링된다', () => {
    render(<EmptyState message="조건에 맞는 단지가 없습니다." />);
    expect(screen.getByText('조건에 맞는 단지가 없습니다.')).toBeInTheDocument();
  });

  it('기본 suggestion 텍스트가 렌더링된다', () => {
    render(<EmptyState />);
    expect(screen.getByText('필터 조건을 변경하거나 다른 지역을 선택해 보세요.')).toBeInTheDocument();
  });

  it('커스텀 suggestion 텍스트가 렌더링된다', () => {
    render(<EmptyState suggestion="다른 검색어를 입력해 보세요." />);
    expect(screen.getByText('다른 검색어를 입력해 보세요.')).toBeInTheDocument();
  });

  it('SearchX 아이콘 요소가 존재한다 (aria-hidden svg)', () => {
    const { container } = render(<EmptyState />);
    const svg = container.querySelector('svg[aria-hidden="true"]');
    expect(svg).toBeInTheDocument();
  });
});
