/** 공통 API 응답 래퍼 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  cached?: boolean;
}

/** data.go.kr 공통 응답 구조 */
export interface DataGoKrResponse<T> {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      items: {
        item: T | T[];
      };
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
}
