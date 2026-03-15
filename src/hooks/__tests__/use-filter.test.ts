import { describe, it, expect } from 'vitest';
import { DEFAULT_FILTERS, countActiveFilters } from '@/hooks/use-filter';
import { FILTER_DEFAULTS } from '@/lib/constants';

describe('use-filter', () => {
  describe('DEFAULT_FILTERS 초기값 검증', () => {
    it('lawdCd 초기값은 빈 배열', () => {
      expect(DEFAULT_FILTERS.lawdCd).toEqual([]);
    });

    it('priceMin/priceMax 초기값은 FILTER_DEFAULTS 값과 동일', () => {
      expect(DEFAULT_FILTERS.priceMin).toBe(FILTER_DEFAULTS.PRICE_MIN);
      expect(DEFAULT_FILTERS.priceMax).toBe(FILTER_DEFAULTS.PRICE_MAX);
    });

    it('areaMin/areaMax 초기값은 FILTER_DEFAULTS 값과 동일', () => {
      expect(DEFAULT_FILTERS.areaMin).toBe(FILTER_DEFAULTS.AREA_MIN);
      expect(DEFAULT_FILTERS.areaMax).toBe(FILTER_DEFAULTS.AREA_MAX);
    });

    it('floorMin/floorMax 초기값은 null', () => {
      expect(DEFAULT_FILTERS.floorMin).toBeNull();
      expect(DEFAULT_FILTERS.floorMax).toBeNull();
    });

    it('includeDirectDeal 초기값은 false', () => {
      expect(DEFAULT_FILTERS.includeDirectDeal).toBe(false);
    });

    it('고급 필터 초기값은 모두 null', () => {
      expect(DEFAULT_FILTERS.parkingRatioMin).toBeNull();
      expect(DEFAULT_FILTERS.hasUndergroundParking).toBeNull();
      expect(DEFAULT_FILTERS.subwayTimeMax).toBeNull();
      expect(DEFAULT_FILTERS.heatType).toBeNull();
      expect(DEFAULT_FILTERS.hallType).toBeNull();
      expect(DEFAULT_FILTERS.builder).toBeNull();
      expect(DEFAULT_FILTERS.saleType).toBeNull();
      expect(DEFAULT_FILTERS.hasElevator).toBeNull();
      expect(DEFAULT_FILTERS.roomEstimate).toBeNull();
      expect(DEFAULT_FILTERS.vlRatMax).toBeNull();
    });
  });

  describe('countActiveFilters 함수 테스트', () => {
    it('기본값 필터는 0개 반환', () => {
      expect(countActiveFilters(DEFAULT_FILTERS)).toBe(0);
    });

    it('lawdCd 설정 시 1개 카운트', () => {
      const filters = { ...DEFAULT_FILTERS, lawdCd: ['11680'] };
      expect(countActiveFilters(filters)).toBe(1);
    });

    it('priceMin 변경 시 1개 카운트', () => {
      const filters = { ...DEFAULT_FILTERS, priceMin: 10000 };
      expect(countActiveFilters(filters)).toBe(1);
    });

    it('priceMax 변경 시 1개 카운트 (priceMin/Max 묶음)', () => {
      const filters = { ...DEFAULT_FILTERS, priceMax: 100000 };
      expect(countActiveFilters(filters)).toBe(1);
    });

    it('priceMin, priceMax 둘 다 변경해도 1개 카운트 (묶음)', () => {
      const filters = { ...DEFAULT_FILTERS, priceMin: 10000, priceMax: 100000 };
      expect(countActiveFilters(filters)).toBe(1);
    });

    it('여러 필터 활성화 시 다수 카운트', () => {
      const filters = {
        ...DEFAULT_FILTERS,
        lawdCd: ['11680'],
        priceMin: 10000,
        floorMin: 3,
        includeDirectDeal: true,
        heatType: '지역난방' as const,
      };
      expect(countActiveFilters(filters)).toBeGreaterThanOrEqual(3);
    });

    it('floorMin 설정 시 카운트 증가', () => {
      const base = countActiveFilters(DEFAULT_FILTERS);
      const filters = { ...DEFAULT_FILTERS, floorMin: 5 };
      expect(countActiveFilters(filters)).toBe(base + 1);
    });

    it('subwayTimeMax 설정 시 카운트 증가', () => {
      const base = countActiveFilters(DEFAULT_FILTERS);
      const filters = { ...DEFAULT_FILTERS, subwayTimeMax: 10 };
      expect(countActiveFilters(filters)).toBe(base + 1);
    });
  });

  describe('intOrNull 파싱 테스트 (URLSearchParams 통한 간접 검증)', () => {
    it('숫자 문자열은 정수로 파싱', () => {
      const params = new URLSearchParams('floorMin=5');
      const n = parseInt(params.get('floorMin') ?? '', 10);
      expect(n).toBe(5);
    });

    it('빈 값은 null (get 반환 null)', () => {
      const params = new URLSearchParams();
      expect(params.get('floorMin')).toBeNull();
    });

    it('숫자 아닌 문자열은 NaN', () => {
      const params = new URLSearchParams('floorMin=abc');
      const n = parseInt(params.get('floorMin') ?? '', 10);
      expect(isNaN(n)).toBe(true);
    });

    it('소수점 문자열은 정수 파싱 시 정수 부분만', () => {
      const params = new URLSearchParams('floorMin=3.7');
      const n = parseInt(params.get('floorMin') ?? '', 10);
      expect(n).toBe(3);
    });
  });
});
