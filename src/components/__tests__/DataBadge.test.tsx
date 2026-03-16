// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { DataBadge } from '@/components/ui/DataBadge';

describe('DataBadge 컴포넌트', () => {
  it('"YYYY-MM" 형식을 "YYYY.MM"으로 변환하여 표시한다', () => {
    render(<DataBadge yearMonth="2024-03" />);
    expect(screen.getByText(/데이터 기준: 2024\.03/)).toBeInTheDocument();
  });

  it('"YYYY.MM" 형식은 그대로 표시한다', () => {
    render(<DataBadge yearMonth="2024.03" />);
    expect(screen.getByText(/데이터 기준: 2024\.03/)).toBeInTheDocument();
  });

  it('녹색 점 인디케이터 요소가 존재한다', () => {
    const { container } = render(<DataBadge yearMonth="2024-01" />);
    const dot = container.querySelector('.bg-green-400');
    expect(dot).toBeInTheDocument();
  });

  it('다른 yearMonth 값도 올바르게 렌더링된다', () => {
    render(<DataBadge yearMonth="2025-12" />);
    expect(screen.getByText(/데이터 기준: 2025\.12/)).toBeInTheDocument();
  });
});
