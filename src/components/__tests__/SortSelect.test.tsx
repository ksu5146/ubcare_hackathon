import { describe, it, expect } from 'vitest';
import { sortComplexes } from '@/components/filter/SortSelect';
import type { ComplexTradeGroup } from '@/types/trade';

function makeComplex(overrides: Partial<ComplexTradeGroup>): ComplexTradeGroup {
  return {
    aptName: '테스트단지',
    dong: '테스트동',
    lawdCd: '11110',
    latestPrice: 50000,
    latestDate: '2024-01-01',
    tradeCount: 5,
    areas: [84],
    buildYear: 2010,
    totalUnit: null,
    roadAddr: null,
    lat: null,
    lng: null,
    recentAvg: null,
    yearAgoAvg: null,
    priceChangeRate: null,
    heatType: null,
    hallType: null,
    subwayLine: null,
    subwayTime: null,
    trades: [],
    ...overrides,
  };
}

describe('sortComplexes 함수', () => {
  const complexes: ComplexTradeGroup[] = [
    makeComplex({ aptName: 'A단지', latestPrice: 30000, latestDate: '2024-01-15', tradeCount: 10, buildYear: 2015, totalUnit: 500 }),
    makeComplex({ aptName: 'B단지', latestPrice: 80000, latestDate: '2024-03-20', tradeCount: 3, buildYear: 2020, totalUnit: 200 }),
    makeComplex({ aptName: 'C단지', latestPrice: 55000, latestDate: '2023-12-01', tradeCount: 7, buildYear: 2005, totalUnit: 800 }),
  ];

  it('latest: 최근거래순으로 정렬된다', () => {
    const result = sortComplexes(complexes, 'latest');
    expect(result[0].aptName).toBe('B단지');
    expect(result[1].aptName).toBe('A단지');
    expect(result[2].aptName).toBe('C단지');
  });

  it('priceHigh: 가격 높은 순으로 정렬된다', () => {
    const result = sortComplexes(complexes, 'priceHigh');
    expect(result[0].aptName).toBe('B단지');
    expect(result[1].aptName).toBe('C단지');
    expect(result[2].aptName).toBe('A단지');
  });

  it('priceLow: 가격 낮은 순으로 정렬된다', () => {
    const result = sortComplexes(complexes, 'priceLow');
    expect(result[0].aptName).toBe('A단지');
    expect(result[1].aptName).toBe('C단지');
    expect(result[2].aptName).toBe('B단지');
  });

  it('tradeCount: 거래 건수 많은 순으로 정렬된다', () => {
    const result = sortComplexes(complexes, 'tradeCount');
    expect(result[0].aptName).toBe('A단지');
    expect(result[1].aptName).toBe('C단지');
    expect(result[2].aptName).toBe('B단지');
  });

  it('households: 세대수 많은 순으로 정렬된다', () => {
    const result = sortComplexes(complexes, 'households');
    expect(result[0].aptName).toBe('C단지');
    expect(result[1].aptName).toBe('A단지');
    expect(result[2].aptName).toBe('B단지');
  });

  it('newest: 신축 순(건축년도 높은 순)으로 정렬된다', () => {
    const result = sortComplexes(complexes, 'newest');
    expect(result[0].aptName).toBe('B단지');
    expect(result[1].aptName).toBe('A단지');
    expect(result[2].aptName).toBe('C단지');
  });

  it('priceUp: priceChangeRate 높은 순으로 정렬된다', () => {
    const withRates = [
      makeComplex({ aptName: 'X단지', priceChangeRate: 5.2 }),
      makeComplex({ aptName: 'Y단지', priceChangeRate: -1.0 }),
      makeComplex({ aptName: 'Z단지', priceChangeRate: 12.5 }),
    ];
    const result = sortComplexes(withRates, 'priceUp');
    expect(result[0].aptName).toBe('Z단지');
    expect(result[1].aptName).toBe('X단지');
    expect(result[2].aptName).toBe('Y단지');
  });

  it('priceDown: priceChangeRate 낮은 순(하락률 높은 순)으로 정렬된다', () => {
    const withRates = [
      makeComplex({ aptName: 'X단지', priceChangeRate: 5.2 }),
      makeComplex({ aptName: 'Y단지', priceChangeRate: -1.0 }),
      makeComplex({ aptName: 'Z단지', priceChangeRate: -8.3 }),
    ];
    const result = sortComplexes(withRates, 'priceDown');
    expect(result[0].aptName).toBe('Z단지');
    expect(result[1].aptName).toBe('Y단지');
    expect(result[2].aptName).toBe('X단지');
  });

  it('원본 배열을 변경하지 않는다 (불변성)', () => {
    const original = [...complexes];
    sortComplexes(complexes, 'priceHigh');
    expect(complexes[0].aptName).toBe(original[0].aptName);
  });

  it('priceChangeRate가 null인 경우 priceUp 정렬에서 유효값이 앞에 온다', () => {
    const withNulls = [
      makeComplex({ aptName: 'NullA', priceChangeRate: null }),
      makeComplex({ aptName: 'HasRate', priceChangeRate: 3.0 }),
      makeComplex({ aptName: 'NullB', priceChangeRate: null }),
    ];
    const result = sortComplexes(withNulls, 'priceUp');
    expect(result[0].aptName).toBe('HasRate');
  });
});
