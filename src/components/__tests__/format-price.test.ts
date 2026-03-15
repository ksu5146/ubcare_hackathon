import { describe, it, expect } from 'vitest';
import { formatPrice, formatPriceShort } from '@/lib/format';

describe('formatPrice UI 렌더링 시나리오', () => {
  describe('1억 미만', () => {
    it('0은 "0" 반환', () => {
      expect(formatPrice(0)).toBe('0');
    });

    it('음수는 "0" 반환', () => {
      expect(formatPrice(-1000)).toBe('0');
    });

    it('5000만원 → "5,000만"', () => {
      expect(formatPrice(5000)).toBe('5,000만');
    });

    it('1000만원 → "1,000만"', () => {
      expect(formatPrice(1000)).toBe('1,000만');
    });

    it('9999만원 → "9,999만"', () => {
      expect(formatPrice(9999)).toBe('9,999만');
    });
  });

  describe('1억 정확히', () => {
    it('1억 → "1억"', () => {
      expect(formatPrice(10000)).toBe('1억');
    });

    it('2억 → "2억"', () => {
      expect(formatPrice(20000)).toBe('2억');
    });

    it('5억 → "5억"', () => {
      expect(formatPrice(50000)).toBe('5억');
    });
  });

  describe('억 + 만 조합', () => {
    it('5억 2000만 → "5억 2,000만"', () => {
      expect(formatPrice(52000)).toBe('5억 2,000만');
    });

    it('1억 500만 → "1억 500만"', () => {
      expect(formatPrice(10500)).toBe('1억 500만');
    });

    it('3억 3000만 → "3억 3,000만"', () => {
      expect(formatPrice(33000)).toBe('3억 3,000만');
    });
  });

  describe('10억 이상', () => {
    it('10억 → "10억"', () => {
      expect(formatPrice(100000)).toBe('10억');
    });

    it('15억 3000만 → "15억 3,000만"', () => {
      expect(formatPrice(153000)).toBe('15억 3,000만');
    });

    it('30억 → "30억"', () => {
      expect(formatPrice(300000)).toBe('30억');
    });

    it('100억 → "100억"', () => {
      expect(formatPrice(1000000)).toBe('100억');
    });
  });
});

describe('formatPriceShort 축약 표시', () => {
  it('0은 "0" 반환', () => {
    expect(formatPriceShort(0)).toBe('0');
  });

  it('음수는 "0" 반환', () => {
    expect(formatPriceShort(-5000)).toBe('0');
  });

  it('5000만원 → "5,000만"', () => {
    expect(formatPriceShort(5000)).toBe('5,000만');
  });

  it('1억 → "1억"', () => {
    expect(formatPriceShort(10000)).toBe('1억');
  });

  it('6억 2000만 → "6.2억"', () => {
    expect(formatPriceShort(62000)).toBe('6.2억');
  });

  it('10억 → "10억"', () => {
    expect(formatPriceShort(100000)).toBe('10억');
  });

  it('15억 5000만 → "15.5억"', () => {
    expect(formatPriceShort(155000)).toBe('15.5억');
  });

  it('소수점 반올림: 1억 1500만 → "1.2억"', () => {
    expect(formatPriceShort(11500)).toBe('1.2억');
  });
});
