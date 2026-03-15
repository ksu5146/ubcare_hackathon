import type { ApartmentTrade } from '@/types/trade';
import type { ApiResponse } from '@/types/api';

/** 월별 집계 데이터 */
export interface MonthlyAggregate {
  /** 년월 (YYYY-MM) */
  yearMonth: string;
  /** 평균 거래가 (만원) */
  avgPrice: number;
  /** 최고 거래가 (만원) */
  maxPrice: number;
  /** 최저 거래가 (만원) */
  minPrice: number;
  /** 거래 건수 */
  count: number;
}

/**
 * 특정 단지의 과거 거래 이력을 조회
 * @param aptName 아파트명
 * @param dong 법정동
 * @param lawdCd 법정동코드 (5자리)
 * @param years 조회 기간 (년)
 */
export async function fetchTradeHistory(
  aptName: string,
  dong: string,
  lawdCd: string,
  years: number = 5,
): Promise<ApartmentTrade[]> {
  const totalMonths = years * 12;
  const months: string[] = [];
  const now = new Date();

  for (let i = 0; i < totalMonths; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    months.push(`${yyyy}${mm}`);
  }

  const requests = months.map(
    (month) =>
      fetch(`/api/trade/apartment?lawdCd=${lawdCd}&dealYmd=${month}`)
        .then((res) => res.json() as Promise<ApiResponse<ApartmentTrade[]>>)
        .then((data) => (data.success && data.data ? data.data : []))
        .catch(() => [] as ApartmentTrade[]),
  );

  const allTrades: ApartmentTrade[] = [];

  // 동시 요청 수 제한 (한 번에 6개씩)
  const batchSize = 6;
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch);
    for (const trades of batchResults) {
      allTrades.push(...trades);
    }
  }

  // aptName, dong 정확히 일치하는 거래만 필터
  const filtered = allTrades.filter(
    (t) => t.aptName === aptName && t.dong === dong,
  );

  // dealDate 오름차순 정렬
  filtered.sort((a, b) => a.dealDate.localeCompare(b.dealDate));

  return filtered;
}

/**
 * 거래 데이터를 월별로 집계
 * @param trades 거래 목록
 * @returns 월별 집계 배열 (yearMonth 오름차순)
 */
export function aggregateMonthly(trades: ApartmentTrade[]): MonthlyAggregate[] {
  const map = new Map<
    string,
    { total: number; max: number; min: number; count: number }
  >();

  for (const t of trades) {
    const ym = t.dealYearMonth;
    const entry = map.get(ym);
    if (entry) {
      entry.total += t.dealAmount;
      entry.max = Math.max(entry.max, t.dealAmount);
      entry.min = Math.min(entry.min, t.dealAmount);
      entry.count += 1;
    } else {
      map.set(ym, {
        total: t.dealAmount,
        max: t.dealAmount,
        min: t.dealAmount,
        count: 1,
      });
    }
  }

  const result: MonthlyAggregate[] = [];

  for (const [yearMonth, entry] of map) {
    result.push({
      yearMonth,
      avgPrice: Math.round(entry.total / entry.count),
      maxPrice: entry.max,
      minPrice: entry.min,
      count: entry.count,
    });
  }

  result.sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

  return result;
}
