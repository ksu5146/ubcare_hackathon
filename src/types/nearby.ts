/** 정비사업(재개발/재건축) 항목 */
export interface RedevelopmentItem {
  name: string;
  type: '재개발' | '재건축';
  stage: string;
  distance: number;
  households?: number;
  lat: number;
  lng: number;
}

/** 학교 항목 */
export interface SchoolItem {
  name: string;
  level: '초' | '중' | '고';
  address: string;
  lat: number;
  lng: number;
  type: '국립' | '공립' | '사립';
  distance?: number;
}
