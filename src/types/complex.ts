/** data.go.kr 공동주택 단지 목록 원본 응답 아이템 */
export interface ComplexListRaw {
  /** 단지코드 */
  kaptCode: string;
  /** 단지명 */
  kaptName: string;
  /** 법정동 주소 */
  as1: string;
  /** 도로명 주소 */
  as2?: string;
  /** 법정동코드 */
  bjdCode?: string;
}

/** data.go.kr 공동주택 기본정보 원본 응답 아이템 */
export interface ComplexDetailRaw {
  /** 단지코드 */
  kaptCode: string;
  /** 단지명 */
  kaptName: string;
  /** 법정동 주소 */
  kaptAddr: string;
  /** 도로명 주소 */
  doroJuso?: string;
  /** 세대수 */
  kaptTarea?: string;
  /** 동수 */
  kaptDongCnt?: string;
  /** 세대수 */
  kaptdaCnt?: string;
  /** 최고층수 */
  kaptTopFloor?: string;
  /** 최저층수 */
  kaptBotFloor?: string;
  /** 사용승인일 */
  kaptUsedate?: string;
  /** 난방방식 */
  kaptHeat?: string;
  /** 총주차대수 */
  kaptParkAll?: string;
  /** 건설사 */
  kaptBcompany?: string;
}

/** 정규화된 단지 정보 */
export interface ComplexInfo {
  /** 단지코드 */
  id: string;
  /** 단지명 */
  name: string;
  /** 법정동 주소 */
  address: string;
  /** 도로명 주소 */
  roadAddress?: string;
  /** 세대수 */
  households?: number;
  /** 동수 */
  buildingCount?: number;
  /** 최고층수 */
  topFloor?: number;
  /** 사용승인일 */
  approvalDate?: string;
  /** 건축년도 */
  buildYear?: number;
  /** 난방방식 */
  heatingType?: string;
  /** 총주차대수 */
  parkingTotal?: number;
  /** 지상주차대수 */
  parkingGround?: number;
  /** 지하주차대수 */
  parkingUnderground?: number;
  /** 건설사 */
  constructor?: string;
  /** 아파트 유형 (아파트/주상복합/연립주택/도시형생활주택 등) */
  aptType?: string;
  /** 관리방식 (위탁관리/자치관리 등) */
  managementType?: string;
  /** 복도유형 (계단식/복도식/혼합식) */
  hallType?: string;
  /** 승강기 수 */
  elevatorCount?: number;
  /** CCTV 수 */
  cctvCount?: number;
  /** 인근 지하철 노선 */
  subwayLine?: string;
  /** 지하철 도보시간 (원본 문자열: "5분이내", "5~10분이내" 등) */
  subwayTime?: string;
  /** 교육시설 (원본 문자열) */
  educationFacility?: string;
  /** 편의시설 (원본 문자열) */
  convenientFacility?: string;
  /** 복리시설 (원본 문자열) */
  welfareFacility?: string;
  /** 용적률 (%) */
  vlRat?: number;
  /** 건폐율 (%) */
  bcRat?: number;
  /** 에너지등급 */
  engrGrade?: string;
  /** 건물연식 (년) */
  buildingAge?: number;
  /** 세대당 주차비율 */
  parkingRatio?: number;
  /** 재건축가능성 점수 (0~100) */
  rebuildScore?: number;
  /** 재건축요건충족 (30년+) */
  rebuildEligible?: boolean;
  /** 주거쾌적성 점수 (0~100) */
  livabilityScore?: number;
  /** 미래가치 점수 (0~100) */
  futureValueScore?: number;
  /** 위도 */
  lat?: number;
  /** 경도 */
  lng?: number;
}

/** 단지 목록 아이템 */
export interface ComplexListItem {
  id: string;
  name: string;
  address: string;
  roadAddress?: string;
}
