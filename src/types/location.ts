// ─── Kakao Local Search ───

/** 클라이언트에 반환하는 장소 검색 결과 */
export interface LocationSearchResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

/** Kakao REST API /v2/local/search/keyword.json 응답의 개별 문서 */
export interface KakaoKeywordDocument {
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string; // longitude
  y: string; // latitude
  category_group_code: string;
  category_group_name: string;
  phone: string;
  place_url: string;
  id: string;
}

/** Kakao REST API /v2/local/search/keyword.json 전체 응답 */
export interface KakaoKeywordResponse {
  meta: {
    total_count: number;
    pageable_count: number;
    is_end: boolean;
    same_name: {
      region: string[];
      keyword: string;
      selected_region: string;
    };
  };
  documents: KakaoKeywordDocument[];
}

// ─── ODsay Transit ───

/** 클라이언트에 반환하는 대중교통 경로 결과 */
export interface TransitResult {
  totalTime: number;    // 분
  transferCount: number;
  fare: number;         // 원
  summary: string;
}

/** ODsay searchPubTransPathT 응답의 개별 경로 */
export interface OdsayPath {
  pathType: number; // 1: 지하철, 2: 버스, 3: 혼합
  info: {
    totalTime: number;
    payment: number;
    busTransitCount: number;
    subwayTransitCount: number;
    firstStartStation: string;
    lastEndStation: string;
    busStationCount: number;
    subwayStationCount: number;
    totalStationCount: number;
    totalDistance: number;
    totalWalk: number;
  };
  subPath: OdsaySubPath[];
}

export interface OdsaySubPath {
  trafficType: number; // 1: 지하철, 2: 버스, 3: 도보
  sectionTime: number;
  stationCount?: number;
  lane?: {
    name: string;
    busNo?: string;
    subwayCode?: number;
  }[];
  startName?: string;
  endName?: string;
  distance: number;
}

/** ODsay searchPubTransPathT 전체 응답 */
export interface OdsayResponse {
  result?: {
    searchType: number;
    outTrafficCheck: number;
    busCount: number;
    subwayCount: number;
    subwayBusCount: number;
    pointDistance: number;
    startRadius: number;
    endRadius: number;
    path: OdsayPath[];
  };
  /** ODsay 에러 응답 */
  error?: {
    code: number;
    message: string;
  };
}
