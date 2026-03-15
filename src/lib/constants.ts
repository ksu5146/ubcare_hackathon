// ─── 외부 API 기본 URL ───
export const DATA_GO_KR_BASE_URL = 'https://apis.data.go.kr/1613000';
export const KAKAO_LOCAL_API_URL = 'https://dapi.kakao.com/v2/local';
export const ODSAY_API_URL = 'https://api.odsay.com/v1/api';

// ─── data.go.kr API 경로 ───
export const API_PATHS = {
  /** 아파트 매매 실거래 상세 자료 (15126469) */
  APARTMENT_TRADE: '/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev',
  /** 아파트 전월세 실거래 자료 (15126474) */
  APARTMENT_RENT: '/RTMSDataSvcAptRent/getRTMSDataSvcAptRent',
  /** 공동주택 단지 목록 V3 — 전체 (15057332) */
  COMPLEX_LIST_ALL: '/AptListService3/getTotalAptList3',
  /** 공동주택 단지 목록 V3 — 법정동 기반 (15057332) */
  COMPLEX_LIST: '/AptListService3/getLegaldongAptList3',
  /** 공동주택 기본 정보 V4 (15058453) */
  COMPLEX_DETAIL: '/AptBasisInfoServiceV4/getAphusBassInfoV4',
  /** 공동주택 상세 정보 V4 (15058453) */
  COMPLEX_DETAIL_EXT: '/AptBasisInfoServiceV4/getAphusDtlInfoV4',
  /** 건축물대장 총괄표제부 — 건축HUB (15134735) */
  BUILDING_LEDGER_RECAP: '/BldRgstHubService/getBrRecapTitleInfo',
  /** 토지이용규제정보서비스 (15058410) */
  LAND_USE_REGULATION: '/nsdi/LurisWmsService/wfs/getLurisDataInfo',
} as const;

// ─── 건축물대장 / 토지이용규제 API 기본 URL ───
/** 건축HUB는 기관코드 1613000 사용 */
export const BUILDING_HUB_BASE_URL = 'http://apis.data.go.kr/1613000';
/** 토지이용규제는 기관코드 1611000 사용 */
export const LAND_USE_BASE_URL = 'http://apis.data.go.kr/1611000';

// ─── 단지 식별정보 API (odcloud) ───
export const ODCLOUD_APT_ID_URL = 'https://api.odcloud.kr/api/AptIdInfoSvc/v1/getAptInfo';

// ─── 캐시 TTL (밀리초) ───
export const CACHE_TTL = {
  /** 실거래가: 24시간 */
  TRADE: 24 * 60 * 60 * 1000,
  /** 단지 정보: 7일 */
  COMPLEX: 7 * 24 * 60 * 60 * 1000,
  /** 학교/인구: 30일 */
  STATIC: 30 * 24 * 60 * 60 * 1000,
} as const;

// ─── API 요청 설정 ───
export const API_CONFIG = {
  /** 타임아웃 (밀리초) */
  TIMEOUT: 3000,
  /** 재시도 횟수 */
  MAX_RETRIES: 1,
} as const;

// ─── 단지 평가 점수 설정 ───
export const SCORING = {
  /** 재건축 점수 가중치 */
  REBUILD: {
    AGE_WEIGHT: 0.45,           // 건물 연식
    VL_GAP_WEIGHT: 0.40,        // 용적률 여유분 (현재 vs 법정상한)
    CONDITION_WEIGHT: 0.15,     // 건물 상태 (에너지등급 등)
    /** 재건축 요건: 준공 후 30년 */
    MIN_AGE_YEARS: 30,
    /** 점수 시작 연식 (20년 이상부터 점수 부여) */
    SCORE_START_AGE: 20,
    /** 최대 점수 연식 */
    SCORE_MAX_AGE: 45,
  },
  /** 쾌적성 점수 가중치 */
  LIVABILITY: {
    PARKING_WEIGHT: 0.30,       // 주차비율
    DENSITY_WEIGHT: 0.25,       // 건폐율 (낮을수록 쾌적)
    VL_RAT_WEIGHT: 0.20,       // 용적률 (낮을수록 쾌적)
    AGE_WEIGHT: 0.15,          // 건물 신축도
    FACILITY_WEIGHT: 0.10,     // 부대시설 (엘리베이터, CCTV 등)
    /** 우수 주차비율 기준 (세대당 1.5대) */
    GOOD_PARKING_RATIO: 1.5,
    /** 건폐율 기준 (15% 이하 최적) */
    OPTIMAL_BC_RAT: 15,
    /** 용적률 기준 (200% 이하 쾌적) */
    OPTIMAL_VL_RAT: 200,
  },
  /** 용도지역별 법정 용적률 상한 (%) — 용도지역 데이터 없을 때 기본값 사용 */
  LEGAL_MAX_VL_RAT: {
    DEFAULT: 250,                // 기본값 (제3종일반주거 기준)
    '제1종전용주거지역': 100,
    '제2종전용주거지역': 150,
    '제1종일반주거지역': 200,
    '제2종일반주거지역': 250,
    '제3종일반주거지역': 300,
    '준주거지역': 500,
    '중심상업지역': 1500,
    '일반상업지역': 1300,
    '근린상업지역': 900,
    '준공업지역': 400,
  } as Record<string, number>,
} as const;

// ─── 필터 기본값 ───
export const FILTER_DEFAULTS = {
  PRICE_MIN: 0,
  PRICE_MAX: 300000, // 30억 (만원 단위)
  PRICE_STEP: 1000,  // 1천만원 단위
  AREA_MIN: 10,
  AREA_MAX: 200,
  SQM_PER_PYEONG: 3.3058,
  BUILD_YEAR_MIN: 1970,
  BUILD_YEAR_MAX: 2026,
  HOUSEHOLDS_MIN: 0,
  HOUSEHOLDS_MAX: 5000,
  FLOOR_MIN: 1,
  FLOOR_MAX: 70,
  MAX_REGION_SELECT: 3, // 최대 지역 선택 수
} as const;
