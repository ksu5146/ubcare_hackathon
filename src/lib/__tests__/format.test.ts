import { describe, it, expect } from 'vitest';
import { formatPrice, formatPriceShort, formatArea, sqmToPyeong, pyeongToSqm } from '../format';

describe('formatPrice', () => {
  it('0 이하는 "0"을 반환한다', () => {
    expect(formatPrice(0)).toBe('0');
    expect(formatPrice(-100)).toBe('0');
  });

  it('1억 미만은 "X만" 형식으로 반환한다', () => {
    expect(formatPrice(5000)).toBe('5,000만');
    expect(formatPrice(9999)).toBe('9,999만');
    expect(formatPrice(1)).toBe('1만');
  });

  it('정확히 1억은 "1억" 형식으로 반환한다', () => {
    expect(formatPrice(10000)).toBe('1억');
  });

  it('1억 이상 + 나머지 있을 때 "X억 Y만" 형식으로 반환한다', () => {
    expect(formatPrice(52000)).toBe('5억 2,000만');
    expect(formatPrice(10001)).toBe('1억 1만');
    expect(formatPrice(35500)).toBe('3억 5,500만');
  });

  it('10억 이상도 올바르게 처리한다', () => {
    expect(formatPrice(100000)).toBe('10억');
    expect(formatPrice(123456)).toBe('12억 3,456만');
  });
});

describe('formatPriceShort', () => {
  it('0 이하는 "0"을 반환한다', () => {
    expect(formatPriceShort(0)).toBe('0');
  });

  it('1억 미만은 "X만" 형식으로 반환한다', () => {
    expect(formatPriceShort(5000)).toBe('5,000만');
  });

  it('1억 이상은 "X.X억" 축약 형식으로 반환한다', () => {
    expect(formatPriceShort(62000)).toBe('6.2억');
    expect(formatPriceShort(10000)).toBe('1억');
    expect(formatPriceShort(15500)).toBe('1.6억');
  });
});

describe('formatArea', () => {
  it('기본 단위(sqm)로 m² 형식을 반환한다', () => {
    expect(formatArea(84.99)).toBe('84.99m²');
    expect(formatArea(59.0)).toBe('59m²');
  });

  it('pyeong 단위로 평 형식을 반환한다', () => {
    // 84.99 / 3.3058 ≈ 25.7평
    const result = formatArea(84.99, 'pyeong');
    expect(result).toMatch(/평$/);
  });
});

describe('sqmToPyeong', () => {
  it('제곱미터를 평으로 변환한다 (소수점 1자리)', () => {
    // 33.058 / 3.3058 = 10평
    expect(sqmToPyeong(33.058)).toBe(10);
    expect(sqmToPyeong(84.99)).toBeCloseTo(25.7, 0);
  });
});

describe('pyeongToSqm', () => {
  it('평을 제곱미터로 변환한다 (소수점 2자리)', () => {
    // 10평 × 3.3058 = 33.06
    expect(pyeongToSqm(10)).toBe(33.06);
  });

  it('sqmToPyeong과 역변환이 근사값으로 일치한다', () => {
    const original = 84.99;
    const pyeong = sqmToPyeong(original);
    const backToSqm = pyeongToSqm(pyeong);
    expect(backToSqm).toBeCloseTo(original, 0);
  });
});
