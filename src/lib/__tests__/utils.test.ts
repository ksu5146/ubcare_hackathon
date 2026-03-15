import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn (className 합성)', () => {
  it('단일 클래스 문자열을 그대로 반환한다', () => {
    expect(cn('text-red-500')).toBe('text-red-500');
  });

  it('여러 클래스를 공백으로 합성한다', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('falsy 값(undefined, null, false)은 무시한다', () => {
    expect(cn('text-sm', undefined, null, false, 'font-bold')).toBe('text-sm font-bold');
  });

  it('조건부 클래스 객체를 처리한다', () => {
    expect(cn({ 'bg-blue-500': true, 'bg-red-500': false })).toBe('bg-blue-500');
  });

  it('Tailwind 충돌 클래스를 마지막 것으로 병합한다', () => {
    // tailwind-merge: p-4 이후 p-2가 오면 p-2가 우선
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('배열 입력을 처리한다', () => {
    expect(cn(['px-2', 'py-1'])).toBe('px-2 py-1');
  });

  it('인수가 없으면 빈 문자열을 반환한다', () => {
    expect(cn()).toBe('');
  });
});
