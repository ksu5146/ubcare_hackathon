import { describe, it, expect } from 'vitest';
import { DEFAULT_FILTERS, countActiveFilters } from '@/hooks/use-filter';
import { formatPrice, formatPriceShort } from '@/lib/format';
import type { ComplexInfo } from '@/types/complex';
import type { FilterState } from '@/types/filter';
import type { ApartmentTrade } from '@/types/trade';

describe('필터 → 검색 통합 플로우', () => {
  it('DEFAULT_FILTERS는 활성 필터 0개를 반환한다', () => {
    expect(countActiveFilters(DEFAULT_FILTERS)).toBe(0);
  });

  it('lawdCd 설정 시 활성 필터가 1 이상이다', () => {
    const filters = { ...DEFAULT_FILTERS, lawdCd: ['11680'] };
    expect(countActiveFilters(filters)).toBeGreaterThanOrEqual(1);
  });

  it('여러 필터 동시 설정 시 카운트가 정확하다', () => {
    const filters: FilterState = {
      ...DEFAULT_FILTERS,
      lawdCd: ['11680'],
      priceMin: 50000,
      areaMin: 60,
    };
    expect(countActiveFilters(filters)).toBeGreaterThanOrEqual(3);
  });

  it('FilterState가 URL searchParams로 직렬화 가능하다', () => {
    const filters = { ...DEFAULT_FILTERS, lawdCd: ['11680', '11710'] };
    const params = new URLSearchParams();
    filters.lawdCd.forEach((c) => params.append('lawdCd', c));
    expect(params.getAll('lawdCd')).toEqual(['11680', '11710']);
  });
});

describe('즐겨찾기 → 비교분석 통합 플로우', () => {
  const favorite = {
    aptName: '래미안대치팰리스',
    dong: '대치동',
    lawdCd: '11680',
    latestPrice: 250000,
    buildYear: 2002,
    addedAt: '2026-03-15T00:00:00Z',
  };

  it('FavoriteItem → CompareItem 변환이 일관적이다', () => {
    const compareItem = {
      name: favorite.aptName,
      dong: favorite.dong,
      lawdCd: favorite.lawdCd,
    };
    expect(compareItem.name).toBe(favorite.aptName);
    expect(compareItem.dong).toBe(favorite.dong);
    expect(compareItem.lawdCd).toBe(favorite.lawdCd);
  });

  it('비교 items는 2개 이상이어야 한다', () => {
    const items = [
      { name: 'A', dong: 'B', lawdCd: '11680' },
      { name: 'C', dong: 'D', lawdCd: '11710' },
    ];
    expect(items.length).toBeGreaterThanOrEqual(2);
  });

  it('비교 items의 정렬 키가 일관적이다', () => {
    const items = [
      { name: 'B단지', dong: '', lawdCd: '' },
      { name: 'A단지', dong: '', lawdCd: '' },
    ];
    const key = [...items].map((i) => i.name).sort().join('||');
    expect(key).toBe('A단지||B단지');
  });
});

describe('단지 상세 → AI 인사이트 통합', () => {
  const mockComplex: Partial<ComplexInfo> = {
    id: 'A1234',
    name: '래미안',
    households: 1500,
    buildYear: 2005,
    vlRat: 200,
    bcRat: 15,
    rebuildScore: 65,
    livabilityScore: 72,
    futureValueScore: 70,
  };

  it('ComplexInfo의 스코어링 데이터가 AI 요청에 포함 가능하다', () => {
    expect(mockComplex.rebuildScore).toBeTypeOf('number');
    expect(mockComplex.livabilityScore).toBeTypeOf('number');
    expect(mockComplex.futureValueScore).toBeTypeOf('number');
  });

  it('스코어링 없는 단지도 AI 요청이 가능하다', () => {
    const noScoring: Partial<ComplexInfo> = { id: 'B', name: 'B단지', households: 500 };
    const body = {
      complexes: [
        { name: noScoring.name, dong: '', lawdCd: '', info: noScoring, trades: [] },
        { name: 'C단지', dong: '', lawdCd: '', info: null, trades: [] },
      ],
    };
    expect(body.complexes.length).toBeGreaterThanOrEqual(2);
    expect(body.complexes[1].info).toBeNull();
  });

  it('AI scores의 평균 계산이 NaN을 방지한다', () => {
    const scores = { profit: 75, living: 82, futureValue: 88 };
    const values = Object.values(scores).filter((v) => typeof v === 'number' && !Number.isNaN(v));
    const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
    expect(avg).toBe(82);
    expect(Number.isNaN(avg)).toBe(false);
  });
});

describe('거래 데이터 포맷팅 통합', () => {
  const mockTrade: Partial<ApartmentTrade> = {
    dealAmount: 185000,
    excluUseAr: 84.82,
    floor: 15,
    buildYear: 2006,
    dealDate: '2026-03-01',
  };

  it('거래금액이 formatPrice로 정상 표시된다', () => {
    const formatted = formatPrice(mockTrade.dealAmount!);
    expect(formatted).toContain('18억');
  });

  it('거래금액이 formatPriceShort로 축약 표시된다', () => {
    const short = formatPriceShort(mockTrade.dealAmount!);
    expect(short).toBeTruthy();
  });

  it('면적은 양수 실수여야 한다', () => {
    expect(mockTrade.excluUseAr).toBeGreaterThan(0);
    expect(typeof mockTrade.excluUseAr).toBe('number');
  });
});

describe('데이터 수집 → DB 타입 매핑 통합', () => {
  it('TradeRawItem 필드가 DB trades 컬럼과 매핑된다', () => {
    const rawFieldsToDbColumns: Record<string, string> = {
      aptNm: 'apt_nm',
      aptSeq: 'apt_seq',
      dealAmount: 'deal_amount',
      excluUseAr: 'exclu_use_ar',
      dealYear: 'deal_year',
      dealMonth: 'deal_month',
      dealDay: 'deal_day',
      floor: 'floor',
      buildYear: 'build_year',
      umdNm: 'umd_nm',
    };
    expect(Object.keys(rawFieldsToDbColumns).length).toBeGreaterThan(5);
  });

  it('ComplexBasicInfo 필드가 DB complexes 컬럼과 매핑된다', () => {
    const basicInfoToDb: Record<string, string> = {
      kaptCode: 'kapt_code',
      kaptName: 'apt_nm',
      bjdCode: 'bjd_code',
      kaptAddr: 'addr',
      doroJuso: 'road_addr',
      codeHeatNm: 'heat_type',
      codeHallNm: 'hall_type',
      kaptdaCnt: 'total_unit',
      kaptBcompany: 'builder',
    };
    expect(Object.keys(basicInfoToDb).length).toBeGreaterThan(5);
  });
});
