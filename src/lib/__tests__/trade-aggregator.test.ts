import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { aggregateMonthly } from '../trade-aggregator';
import type { ApartmentTrade } from '@/types/trade';

function makeTrade(overrides: Partial<ApartmentTrade>): ApartmentTrade {
  return {
    aptName: '테스트아파트',
    dealAmount: 50000,
    area: 84.99,
    floor: 5,
    buildYear: 2010,
    dealDate: '2024-01-15',
    dealYearMonth: '2024-01',
    dong: '역삼동',
    jibun: '123',
    isCanceled: false,
    ...overrides,
  };
}

describe('aggregateMonthly', () => {
  it('빈 배열은 빈 배열을 반환한다', () => {
    expect(aggregateMonthly([])).toEqual([]);
  });

  it('단일 거래를 올바르게 집계한다', () => {
    const trades = [makeTrade({ dealAmount: 50000, dealYearMonth: '2024-01' })];
    const result = aggregateMonthly(trades);

    expect(result).toHaveLength(1);
    expect(result[0].yearMonth).toBe('2024-01');
    expect(result[0].avgPrice).toBe(50000);
    expect(result[0].maxPrice).toBe(50000);
    expect(result[0].minPrice).toBe(50000);
    expect(result[0].count).toBe(1);
  });

  it('같은 월의 여러 거래를 올바르게 집계한다', () => {
    const trades = [
      makeTrade({ dealAmount: 40000, dealYearMonth: '2024-03' }),
      makeTrade({ dealAmount: 60000, dealYearMonth: '2024-03' }),
      makeTrade({ dealAmount: 50000, dealYearMonth: '2024-03' }),
    ];
    const result = aggregateMonthly(trades);

    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(3);
    expect(result[0].avgPrice).toBe(50000); // (40000+60000+50000)/3
    expect(result[0].maxPrice).toBe(60000);
    expect(result[0].minPrice).toBe(40000);
  });

  it('여러 월 데이터를 월별로 분리하여 집계한다', () => {
    const trades = [
      makeTrade({ dealAmount: 50000, dealYearMonth: '2024-01' }),
      makeTrade({ dealAmount: 55000, dealYearMonth: '2024-02' }),
      makeTrade({ dealAmount: 52000, dealYearMonth: '2024-01' }),
    ];
    const result = aggregateMonthly(trades);

    expect(result).toHaveLength(2);
    const jan = result.find((r) => r.yearMonth === '2024-01')!;
    const feb = result.find((r) => r.yearMonth === '2024-02')!;

    expect(jan.count).toBe(2);
    expect(jan.avgPrice).toBe(51000); // (50000+52000)/2
    expect(feb.count).toBe(1);
    expect(feb.avgPrice).toBe(55000);
  });

  it('결과를 yearMonth 오름차순으로 정렬한다', () => {
    const trades = [
      makeTrade({ dealYearMonth: '2024-03' }),
      makeTrade({ dealYearMonth: '2024-01' }),
      makeTrade({ dealYearMonth: '2024-02' }),
    ];
    const result = aggregateMonthly(trades);

    expect(result.map((r) => r.yearMonth)).toEqual(['2024-01', '2024-02', '2024-03']);
  });

  it('평균가를 반올림(정수)으로 계산한다', () => {
    const trades = [
      makeTrade({ dealAmount: 10000, dealYearMonth: '2024-01' }),
      makeTrade({ dealAmount: 10001, dealYearMonth: '2024-01' }),
      makeTrade({ dealAmount: 10001, dealYearMonth: '2024-01' }),
    ];
    const result = aggregateMonthly(trades);
    // (10000 + 10001 + 10001) / 3 = 10000.666... → 반올림 10001
    expect(result[0].avgPrice).toBe(10001);
  });
});

describe('fetchTradeHistory', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('aptName과 dong으로 필터링된 거래만 반환한다', async () => {
    const mockData = [
      makeTrade({ aptName: '테스트아파트', dong: '역삼동', dealDate: '2024-01-10', dealYearMonth: '2024-01' }),
      makeTrade({ aptName: '다른아파트', dong: '역삼동', dealDate: '2024-01-15', dealYearMonth: '2024-01' }),
      makeTrade({ aptName: '테스트아파트', dong: '삼성동', dealDate: '2024-01-20', dealYearMonth: '2024-01' }),
    ];

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, data: mockData }),
    }));

    const { fetchTradeHistory } = await import('../trade-aggregator');
    const result = await fetchTradeHistory('테스트아파트', '역삼동', '11680', 1);

    expect(result.every((t) => t.aptName === '테스트아파트' && t.dong === '역삼동')).toBe(true);
  });

  it('fetch 실패 시 빈 배열을 반환한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    const { fetchTradeHistory } = await import('../trade-aggregator');
    const result = await fetchTradeHistory('테스트아파트', '역삼동', '11680', 1);

    expect(result).toEqual([]);
  });
});
