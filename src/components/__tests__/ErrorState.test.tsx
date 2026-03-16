// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { ErrorState } from '@/components/ui/ErrorState';

describe('ErrorState 컴포넌트', () => {
  it('기본 에러 메시지가 렌더링된다', () => {
    render(<ErrorState />);
    expect(screen.getByText('데이터를 불러오는 중 오류가 발생했습니다.')).toBeInTheDocument();
  });

  it('커스텀 에러 메시지가 렌더링된다', () => {
    render(<ErrorState message="네트워크 오류가 발생했습니다." />);
    expect(screen.getByText('네트워크 오류가 발생했습니다.')).toBeInTheDocument();
  });

  it('onRetry 없으면 재시도 버튼이 렌더링되지 않는다', () => {
    render(<ErrorState />);
    expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument();
  });

  it('onRetry 있으면 재시도 버튼이 렌더링된다', () => {
    const handleRetry = vi.fn();
    render(<ErrorState onRetry={handleRetry} />);
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
  });

  it('재시도 버튼 클릭 시 onRetry 콜백이 호출된다', () => {
    const handleRetry = vi.fn();
    render(<ErrorState onRetry={handleRetry} />);
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
