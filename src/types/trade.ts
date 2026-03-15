/** data.go.kr 아파트 매매 실거래가 원본 응답 아이템 */
export interface ApartmentTradeRaw {
  /** 거래금액 (만원, 콤마 포함 문자열) */
  dealAmount: string;
  /** 건축년도 */
  buildYear: string;
  /** 계약년도 */
  dealYear: string;
  /** 계약월 */
  dealMonth: string;
  /** 계약일 */
  dealDay: string;
  /** 전용면적 (m²) */
  excluUseAr: string;
  /** 층 */
  floor: string;
  /** 법정동 */
  umdNm: string;
  /** 아파트명 */
  aptNm: string;
  /** 지번 */
  jibun: string;
  /** 지역코드 (법정동코드 앞 5자리) */
  sggCd: string;
  /** 도로명 */
  roadNm?: string;
  /** 해제여부 */
  cdealType?: string;
  /** 등기일자 */
  rgstDate?: string;
}

/** 정규화된 아파트 매매 거래 데이터 */
export interface ApartmentTrade {
  /** 아파트명 */
  aptName: string;
  /** 거래금액 (만원) */
  dealAmount: number;
  /** 전용면적 (m²) */
  area: number;
  /** 층 */
  floor: number;
  /** 건축년도 */
  buildYear: number;
  /** 계약일 (YYYY-MM-DD) */
  dealDate: string;
  /** 계약년월 (YYYY-MM) */
  dealYearMonth: string;
  /** 법정동 */
  dong: string;
  /** 지번 */
  jibun: string;
  /** 도로명 */
  roadName?: string;
  /** 해제 여부 */
  isCanceled: boolean;
}

/** 단지별 집계 데이터 */
export interface ComplexTradeGroup {
  /** 단지명 */
  aptName: string;
  /** 법정동 */
  dong: string;
  /** 법정동코드 5자리 */
  lawdCd: string;
  /** 최근 거래가 (만원) */
  latestPrice: number;
  /** 최근 거래일 */
  latestDate: string;
  /** 거래 건수 */
  tradeCount: number;
  /** 전용면적 목록 */
  areas: number[];
  /** 건축년도 */
  buildYear: number;
  /** 총 세대수 (complexes 테이블 데이터 있을 때만) */
  totalUnit: number | null;
  /** 도로명주소 (매칭된 단지 정보 있을 때) */
  roadAddr: string | null;
  /** 위도 (캐시된 좌표) */
  lat: number | null;
  /** 경도 (캐시된 좌표) */
  lng: number | null;
  /** 최근 3개월 평균가 (만원) */
  recentAvg: number | null;
  /** 1년 전 3개월 평균가 (만원) */
  yearAgoAvg: number | null;
  /** 1년 가격변동률 (%, 양수=상승) */
  priceChangeRate: number | null;
  /** 난방방식 */
  heatType: string | null;
  /** 복도유형 */
  hallType: string | null;
  /** 지하철 노선 */
  subwayLine: string | null;
  /** 지하철 도보시간 (분) */
  subwayTime: number | null;
  /** 전체 거래 내역 */
  trades: ApartmentTrade[];
}
