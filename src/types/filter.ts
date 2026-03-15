/** 검색 필터 상태 */
export interface FilterState {
  // ─── 기본 필터 ───

  /** 법정동코드 5자리 (최대 3개) */
  lawdCd: string[];
  /** 매매가 최소 (만원) */
  priceMin: number;
  /** 매매가 최대 (만원) */
  priceMax: number;
  /** 전용면적 최소 (m²) */
  areaMin: number;
  /** 전용면적 최대 (m²) */
  areaMax: number;
  /** 층수 최소 */
  floorMin: number | null;
  /** 층수 최대 */
  floorMax: number | null;
  /** 거래유형: 직거래 포함 여부 (기본 false = 직거래 제외) */
  includeDirectDeal: boolean;
  /** 최소 세대수 */
  householdsMin: number | null;
  /** 최대 세대수 */
  householdsMax: number | null;
  /** 건축년도 시작 */
  buildYearMin: number | null;
  /** 건축년도 최대 */
  buildYearMax: number | null;

  // ─── 고급 필터 ───

  /** 세대당 주차대수 최소 */
  parkingRatioMin: number | null;
  /** 지하주차장 여부 */
  hasUndergroundParking: boolean | null;
  /** 지하철 도보시간 최대 (분) */
  subwayTimeMax: number | null;
  /** 난방방식 */
  heatType: HeatType | null;
  /** 복도유형 */
  hallType: HallType | null;
  /** 시공사 (LIKE 검색) */
  builder: string | null;
  /** 분양형태 */
  saleType: SaleType | null;
  /** 승강기 유무 */
  hasElevator: boolean | null;
  /** 추정 방수 (면적 기반) */
  roomEstimate: number | null;
  /** 용적률 최대 (%) — 낮을수록 재건축 사업성 높음 */
  vlRatMax: number | null;
}

/** 난방방식 */
export type HeatType = '개별난방' | '중앙난방' | '지역난방';
/** 복도유형 */
export type HallType = '계단식' | '복도식' | '혼합식';
/** 분양형태 */
export type SaleType = '분양' | '임대';

/** 면적 단위 */
export type AreaUnit = 'sqm' | 'pyeong';

/** 층수 프리셋 */
export const FLOOR_PRESETS: { label: string; min: number; max: number | null }[] = [
  { label: '저층 제외 (4층+)', min: 4, max: null },
  { label: '저층 (1~5층)', min: 1, max: 5 },
  { label: '중층 (6~10층)', min: 6, max: 10 },
  { label: '중고층 (11~20층)', min: 11, max: 20 },
  { label: '고층 (21~30층)', min: 21, max: 30 },
  { label: '초고층 (31층+)', min: 31, max: null },
];

/** 가격 프리셋 */
export const PRICE_PRESETS: { label: string; value: [number, number] }[] = [
  { label: '3억 이하', value: [0, 30000] },
  { label: '3~5억', value: [30000, 50000] },
  { label: '5~10억', value: [50000, 100000] },
  { label: '10~15억', value: [100000, 150000] },
  { label: '15~20억', value: [150000, 200000] },
  { label: '20억 이상', value: [200000, 300000] },
];

/** 면적 프리셋 */
export const AREA_PRESETS: { label: string; value: [number, number] }[] = [
  { label: '소형 (~60m²)', value: [10, 60] },
  { label: '국민평형 (60~85m²)', value: [60, 85] },
  { label: '중형 (85~115m²)', value: [85, 115] },
  { label: '대형 (115m²+)', value: [115, 200] },
];

/** 세대수 프리셋 */
export const HOUSEHOLD_PRESETS: { label: string; min: number; max: number | null }[] = [
  { label: '300세대 미만', min: 0, max: 300 },
  { label: '300~500', min: 300, max: 500 },
  { label: '500~1000', min: 500, max: 1000 },
  { label: '1000세대+', min: 1000, max: null },
];
