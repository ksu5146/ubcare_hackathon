import type { ApartmentTrade, ComplexTradeGroup } from '@/types/trade';
import type { FilterState } from '@/types/filter';

/**
 * 실거래가 데이터를 필터 조건으로 필터링
 */
export function filterTrades(
  trades: ApartmentTrade[],
  filters: Pick<FilterState, 'priceMin' | 'priceMax' | 'areaMin' | 'areaMax'>,
): ApartmentTrade[] {
  return trades.filter((t) => {
    if (t.dealAmount < filters.priceMin || t.dealAmount > filters.priceMax) return false;
    if (t.area < filters.areaMin || t.area > filters.areaMax) return false;
    return true;
  });
}

/**
 * 거래 데이터를 단지명 기준으로 그룹핑
 */
export function groupByComplex(trades: ApartmentTrade[]): ComplexTradeGroup[] {
  const map = new Map<string, ApartmentTrade[]>();

  for (const trade of trades) {
    const key = `${trade.aptName}::${trade.dong}`;
    const list = map.get(key) ?? [];
    list.push(trade);
    map.set(key, list);
  }

  const groups: ComplexTradeGroup[] = [];

  for (const [, groupTrades] of map) {
    const sorted = [...groupTrades].sort(
      (a, b) => b.dealDate.localeCompare(a.dealDate),
    );
    const latest = sorted[0];
    const areas = [...new Set(groupTrades.map((t) => t.area))].sort((a, b) => a - b);

    groups.push({
      aptName: latest.aptName,
      dong: latest.dong,
      lawdCd: '',
      latestPrice: latest.dealAmount,
      latestDate: latest.dealDate,
      tradeCount: groupTrades.length,
      areas,
      buildYear: latest.buildYear,
      totalUnit: null,
      roadAddr: null,
      lat: null,
      lng: null,
      recentAvg: null,
      heatType: null,
      hallType: null,
      subwayLine: null,
      subwayTime: null,
      yearAgoAvg: null,
      priceChangeRate: null,
      trades: sorted,
    });
  }

  return groups.sort((a, b) => b.latestPrice - a.latestPrice);
}

/**
 * 최근 N개월 범위의 YYYYMM 문자열 목록 생성
 */
export function getRecentMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    months.push(`${y}${m}`);
  }

  return months;
}
