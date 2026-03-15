// ─── 수집 대상 지역 ───

export interface CollectorConfig {
  /** 수집 대상 법정동코드 5자리 목록 */
  lawdCodes: string[];
  /** 수집 기간 (개월) */
  months: number;
  /** 배치당 동시 요청 수 */
  concurrency: number;
  /** 요청 간 딜레이 (ms) — API 부하 방지 */
  delayMs: number;
}

export type CollectorType = 'trade' | 'complex' | 'seoul_apt' | 'building_ledger' | 'land_use';
export type CollectionStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface CollectionState {
  id: number;
  collectorType: CollectorType;
  lawdCd: string;
  dealYm: string | null;
  status: CollectionStatus;
  recordCount: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CollectionProgress {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  pending: number;
  percentage: number;
}

export interface CollectionResult {
  lawdCd: string;
  dealYm?: string;
  recordCount: number;
  isNew: number;
  error?: string;
}

// ─── 실거래가 API Raw 응답 (32개 필드) ───

export interface TradeRawItem {
  aptDong: number | string;
  aptNm: string;
  aptSeq: string;
  bonbun: string;
  bubun: string;
  buildYear: number;
  buyerGbn: string;
  cdealDay: string;
  cdealType: string;
  dealAmount: string;
  dealDay: number;
  dealMonth: number;
  dealYear: number;
  dealingGbn: string;
  estateAgentSggNm: string;
  excluUseAr: number;
  floor: number;
  jibun: number | string;
  landCd: number;
  landLeaseholdGbn: string;
  rgstDate: string;
  roadNm: string;
  roadNmBonbun: string;
  roadNmBubun: string;
  roadNmCd: number;
  roadNmSeq: string;
  roadNmSggCd: number;
  roadNmbCd: number;
  sggCd: number;
  slerGbn: string;
  umdCd: number;
  umdNm: string;
}

// ─── 단지 목록 V3 응답 ───

export interface ComplexListItem {
  kaptCode: string;
  kaptName: string;
  bjdCode: string;
  as1: string;       // 시도
  as2: string;       // 시군구
  as3: string;       // 읍면동
  as4: string | null;
}

// ─── 단지 기본정보 V4 응답 ───

export interface ComplexBasicInfo {
  kaptCode: string;
  kaptName: string;
  kaptAddr: string;
  doroJuso: string;
  bjdCode: string;
  codeSaleNm: string;
  codeHeatNm: string;
  codeHallNm: string;
  codeAptNm: string;
  codeMgrNm: string;
  kaptTarea: number;
  kaptDongCnt: string;
  kaptdaCnt: number;
  hoCnt: number;
  kaptBcompany: string;
  kaptAcompany: string;
  kaptTel: string;
  kaptUrl: string;
  kaptUsedate: string;
  kaptFax: string;
  kaptMarea: number;
  kaptMparea60: number;
  kaptMparea85: number;
  kaptMparea135: number;
  kaptMparea136: number;
  privArea: string;
  kaptTopFloor: number;
  kaptBaseFloor: number;
  kaptdEcntp: number;
  zipcode: string;
  ktownFlrNo: number;
}

// ─── 단지 상세정보 V4 응답 ───

export interface ComplexDetailInfo {
  kaptCode: string;
  kaptName: string;
  codeStr: string;        // 건물구조
  kaptdPcnt: string;      // 지상주차
  kaptdPcntu: string;     // 지하주차
  kaptdEcnt: number;      // 승강기수
  kaptdCccnt: string;     // CCTV수
  subwayLine: string | null;
  subwayStation: string | null;
  kaptdWtimesub: string | null;
  welfareFacility: string | null;
  educationFacility: string | null;
  convenientFacility: string | null;
}

// ─── 서울시 공동주택 정보 API (OpenAptInfo) 응답 ───

export interface SeoulAptInfoRaw {
  SN: number;
  APT_CD: string;
  APT_NM: string;
  CMPX_CLSF: string;
  APT_STDG_ADDR: string;
  APT_RDN_ADDR: string;
  CTPV_ADDR: string;
  SGG_ADDR: string;
  EMD_ADDR: string;
  DADDR: string;
  RDN_ADDR: string;
  ROAD_DADDR: string;
  TELNO: string;
  FXNO: string;
  APT_CMPX: string;
  APT_ATCH_FILE: string;
  HH_TYPE: string;
  MNG_MTHD: string;
  ROAD_TYPE: string;
  MN_MTHD: string;
  WHOL_DONG_CNT: number;
  TNOHSH: number;
  BLDR: string;
  DVLR: string;
  USE_APRV_YMD: string;
  GFA: number;
  RSDT_XUAR: number;
  MNCO_LEVY_AREA: number;
  XUAR_HH_STTS60: string;
  XUAR_HH_STTS85: string;
  XUAR_HH_STTS135: string;
  XUAR_HH_STTS136: string;
  HMPG: string;
  REG_YMD: string;
  MDFCN_YMD: string;
  EPIS_MNG_NO: string;
  EPS_MNG_FORM: string;
  HH_ELCT_CTRT_MTHD: string;
  CLNG_MNG_FORM: string;
  BDAR: number;
  PRK_CNTOM: number;
  SE_CD: string;
  CMPX_APRV_DAY: string;
  USE_YN: string;
  MNCO_ULD_YN: string;
  XCRD: string;
  YCRD: string;
  CMPX_APLD_DAY: string;
}

// ─── 건축물대장 총괄표제부 API 응답 ───

export interface BuildingLedgerRaw {
  sigunguCd: string;
  bjdongCd: string;
  platGbCd: string;
  bun: string;
  ji: string;
  bldNm: string;
  platPlc: string;
  newPlatPlc: string;
  mainPurpsCd: string;
  mainPurpsCdNm: string;
  etcPurps: string;
  platArea: number;
  archArea: number;
  bcRat: number;
  totArea: number;
  vlRatEstmTotArea: number;
  vlRat: number;
  hhldCnt: number;
  fmlyCnt: number;
  mainBldCnt: number;
  totPkngCnt: number;
  pmsDay: string;
  stcnsDay: string;
  useAprDay: string;
  engrGrade: string;
  engrRat: number;
  gnBldGrade: string;
  itgBldGrade: string;
  crtnDay: string;
}

// ─── 토지이용규제 API 응답 ───

export interface LandUseRegulationRaw {
  pnu: string;
  ldCode: string;
  ldCodeNm: string;
  lndcgrCodeNm: string;
  lndpclAr: number;
  prposArea1Nm: string;
  prposArea2Nm: string;
  prposDistrict1Nm: string;
  prposDistrict2Nm: string;
  prposZone1Nm: string;
  prposZone2Nm: string;
  cnflcAt: string;
}

// ─── 수도권 법정동코드 ───

/** 서울 25개 구 */
export const SEOUL_LAWD_CODES = [
  '11110', '11140', '11170', '11200', '11215', // 종로, 중구, 용산, 성동, 광진
  '11230', '11260', '11290', '11305', '11320', // 동대문, 중랑, 성북, 강북, 도봉
  '11350', '11380', '11410', '11440', '11470', // 노원, 은평, 서대문, 마포, 양천
  '11500', '11530', '11545', '11560', '11590', // 강서, 구로, 금천, 영등포, 동작
  '11620', '11650', '11680', '11710', '11740', // 관악, 서초, 강남, 송파, 강동
];

/** 경기 주요 시/구 */
export const GYEONGGI_LAWD_CODES = [
  '41111', '41113', '41115', '41117', // 수원 장안/권선/팔달/영통
  '41131', '41133', '41135',          // 성남 수정/중원/분당
  '41150',                             // 의정부
  '41170',                             // 안양 만안
  '41171',                             // 안양 동안
  '41190',                             // 부천
  '41210',                             // 광명
  '41220',                             // 평택
  '41250',                             // 동두천
  '41271', '41273',                    // 안산 상록/단원
  '41281', '41285', '41287',           // 고양 덕양/일산동/일산서
  '41290',                             // 과천
  '41310',                             // 구리
  '41360',                             // 남양주
  '41370',                             // 오산
  '41390',                             // 시흥
  '41410',                             // 군포
  '41430',                             // 의왕
  '41450',                             // 하남
  '41461', '41463', '41465',           // 용인 처인/기흥/수지
  '41480',                             // 파주
  '41500',                             // 이천
  '41550',                             // 김포
  '41570',                             // 화성
  '41590',                             // 광주
];

/** 인천 주요 구 */
export const INCHEON_LAWD_CODES = [
  '28110', '28140', '28177', '28185', // 중구, 동구, 미추홀, 연수
  '28200', '28237', '28245', '28260', // 남동, 부평, 계양, 서구
  '28710',                             // 강화
];

/** 전체 수집 대상 */
export const ALL_TARGET_LAWD_CODES = [
  ...SEOUL_LAWD_CODES,
  ...GYEONGGI_LAWD_CODES,
  ...INCHEON_LAWD_CODES,
];
